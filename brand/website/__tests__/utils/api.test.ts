import { 
  api, 
  authApi, 
  cmsApi, 
  leadApi, 
  assessmentApi, 
  caseStudyApi, 
  blogApi, 
  contactApi, 
  analyticsApi, 
  newsletterApi, 
  proposalApi, 
  clientApi, 
  ApiError 
} from '../../utils/api'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock environment variable
const originalEnv = process.env

describe('API Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
    // Set test environment variable
    process.env.NEXT_PUBLIC_API_URL = 'https://api.test.com/v1'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('ApiError', () => {
    it('creates error with correct properties', () => {
      const error = new ApiError('Test error', 400, { field: 'email' })
      
      expect(error.name).toBe('ApiError')
      expect(error.message).toBe('Test error')
      expect(error.status).toBe(400)
      expect(error.data).toEqual({ field: 'email' })
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('Base API Request Function', () => {
    it('makes GET request with correct URL and headers', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, name: 'Test' },
        message: 'Success'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue(mockResponse),
      })

      const result = await api.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )

      expect(result).toEqual(mockResponse)
    })

    it('includes query parameters in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true, data: null }),
      })

      await api.get('/test', { page: 1, limit: 10, active: true })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/test?page=1&limit=10&active=true',
        expect.any(Object)
      )
    })

    it('includes authorization header when token exists', async () => {
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      }
      localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true, data: null }),
      })

      await api.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token',
          }),
        })
      )
    })

    it('handles corrupted auth tokens gracefully', async () => {
      localStorageMock.setItem('auth_tokens', 'invalid-json')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true, data: null }),
      })

      await api.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      )
    })

    it('sends POST request with JSON body', async () => {
      const requestData = { name: 'Test', email: 'test@example.com' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true, data: requestData }),
      })

      await api.post('/test', requestData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('handles PUT requests correctly', async () => {
      const updateData = { id: 1, name: 'Updated' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true, data: updateData }),
      })

      await api.put('/test/1', updateData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      )
    })

    it('handles PATCH requests correctly', async () => {
      const patchData = { name: 'Patched' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true, data: patchData }),
      })

      await api.patch('/test/1', patchData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/test/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData),
        })
      )
    })

    it('handles DELETE requests correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true, data: null }),
      })

      await api.delete('/test/1')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('throws ApiError for HTTP error responses', async () => {
      const errorResponse = {
        message: 'Validation failed',
        errors: { email: 'Invalid email' }
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue(errorResponse),
      })

      await expect(api.get('/test')).rejects.toThrow(ApiError)
      await expect(api.get('/test')).rejects.toThrow('Validation failed')
      
      try {
        await api.get('/test')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(400)
        expect((error as ApiError).data).toEqual(errorResponse)
      }
    })

    it('throws ApiError for non-JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('text/html'),
        },
      })

      await expect(api.get('/test')).rejects.toThrow(ApiError)
      await expect(api.get('/test')).rejects.toThrow('Unexpected response type: text/html')
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(api.get('/test')).rejects.toThrow(ApiError)
      await expect(api.get('/test')).rejects.toThrow('Network error')
      
      try {
        await api.get('/test')
      } catch (error) {
        expect((error as ApiError).status).toBe(0)
      }
    })

    it('handles unknown errors', async () => {
      mockFetch.mockRejectedValueOnce('String error')

      await expect(api.get('/test')).rejects.toThrow(ApiError)
      await expect(api.get('/test')).rejects.toThrow('Network error')
    })

    it('uses default error message for HTTP errors without message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({}),
      })

      await expect(api.get('/test')).rejects.toThrow('HTTP 500')
    })
  })

  describe('API Modules', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true, data: null }),
      })
    })

    describe('authApi', () => {
      it('login calls correct endpoint', async () => {
        const credentials = { email: 'test@example.com', password: 'password' }
        await authApi.login(credentials)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/auth/login',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(credentials),
          })
        )
      })

      it('register calls correct endpoint', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'password',
          firstName: 'John',
          lastName: 'Doe',
        }
        await authApi.register(userData)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/auth/register',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(userData),
          })
        )
      })

      it('refresh calls correct endpoint', async () => {
        await authApi.refresh('refresh-token')
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/auth/refresh',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ refreshToken: 'refresh-token' }),
          })
        )
      })

      it('forgotPassword calls correct endpoint', async () => {
        await authApi.forgotPassword('test@example.com')
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/auth/forgot-password',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com' }),
          })
        )
      })
    })

    describe('cmsApi', () => {
      it('getPages calls correct endpoint with params', async () => {
        await cmsApi.getPages({ published: true })
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/cms/pages?published=true',
          expect.objectContaining({ method: 'GET' })
        )
      })

      it('getPage calls correct endpoint', async () => {
        await cmsApi.getPage('home')
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/cms/pages/home',
          expect.objectContaining({ method: 'GET' })
        )
      })
    })

    describe('leadApi', () => {
      it('createLead calls correct endpoint', async () => {
        const leadData = {
          email: 'lead@example.com',
          firstName: 'Jane',
          company: 'Test Co',
          source: 'website',
        }
        await leadApi.createLead(leadData)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/leads',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(leadData),
          })
        )
      })

      it('getLeads calls correct endpoint with pagination', async () => {
        await leadApi.getLeads({ page: 1, limit: 20, status: 'new' })
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/leads?page=1&limit=20&status=new',
          expect.objectContaining({ method: 'GET' })
        )
      })
    })

    describe('assessmentApi', () => {
      it('submitAssessment calls correct endpoint', async () => {
        const submissionData = {
          answers: [
            { questionId: '1', value: 'answer1' },
            { questionId: '2', value: 'answer2' },
          ],
          email: 'test@example.com',
        }
        await assessmentApi.submitAssessment('assessment-id', submissionData)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/assessments/assessment-id/submit',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(submissionData),
          })
        )
      })
    })

    describe('caseStudyApi', () => {
      it('getCaseStudies calls correct endpoint with filters', async () => {
        await caseStudyApi.getCaseStudies({
          page: 1,
          industry: 'tech',
          featured: true,
        })
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/case-studies?page=1&industry=tech&featured=true',
          expect.objectContaining({ method: 'GET' })
        )
      })
    })

    describe('blogApi', () => {
      it('getPosts calls correct endpoint with filters', async () => {
        await blogApi.getPosts({
          category: 'technology',
          tag: 'ai',
          published: true,
        })
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/blog/posts?category=technology&tag=ai&published=true',
          expect.objectContaining({ method: 'GET' })
        )
      })
    })

    describe('contactApi', () => {
      it('submitForm calls correct endpoint', async () => {
        const formData = { name: 'John', email: 'john@example.com', message: 'Hello' }
        await contactApi.submitForm('contact-form', formData)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/contact/forms/contact-form/submit',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(formData),
          })
        )
      })
    })

    describe('analyticsApi', () => {
      it('trackEvent calls correct endpoint', async () => {
        const eventData = {
          name: 'button_click',
          properties: { button_id: 'cta-1', page: 'home' },
        }
        await analyticsApi.trackEvent(eventData)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/analytics/events',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(eventData),
          })
        )
      })

      it('getDashboard calls correct endpoint with date range', async () => {
        await analyticsApi.getDashboard({
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        })
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/analytics/dashboard?dateFrom=2024-01-01&dateTo=2024-01-31',
          expect.objectContaining({ method: 'GET' })
        )
      })
    })

    describe('newsletterApi', () => {
      it('subscribe calls correct endpoint', async () => {
        const subscriptionData = {
          email: 'subscriber@example.com',
          preferences: {
            frequency: 'monthly' as const,
            topics: ['tech', 'ai'],
            format: 'html' as const,
          },
        }
        await newsletterApi.subscribe(subscriptionData)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/newsletter/subscribe',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(subscriptionData),
          })
        )
      })

      it('updatePreferences calls correct endpoint', async () => {
        const preferences = {
          frequency: 'weekly' as const,
          topics: ['updates'],
          format: 'text' as const,
        }
        await newsletterApi.updatePreferences('user@example.com', preferences)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/newsletter/preferences',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({
              email: 'user@example.com',
              preferences,
            }),
          })
        )
      })
    })

    describe('proposalApi', () => {
      it('sendProposal calls correct endpoint', async () => {
        await proposalApi.sendProposal('proposal-id')
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/proposals/proposal-id/send',
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    describe('clientApi', () => {
      it('getDocuments calls correct endpoint with project filter', async () => {
        await clientApi.getDocuments('project-id')
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/client/documents?projectId=project-id',
          expect.objectContaining({ method: 'GET' })
        )
      })

      it('getDocuments calls correct endpoint without project filter', async () => {
        await clientApi.getDocuments()
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/client/documents',
          expect.objectContaining({ method: 'GET' })
        )
      })
    })
  })

  describe('Environment Configuration', () => {
    it('uses default API URL when env var not set', async () => {
      // Temporarily remove the env var
      delete process.env.NEXT_PUBLIC_API_URL
      
      // Re-import the module to get the default URL
      jest.resetModules()
      const { api: testApi } = require('../../utils/api')
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ success: true, data: null }),
      })

      await testApi.get('/test')
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/test',
        expect.any(Object)
      )

      // Restore env var
      process.env.NEXT_PUBLIC_API_URL = 'https://api.test.com/v1'
    })
  })
})