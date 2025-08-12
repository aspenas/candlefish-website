import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Custom render function that includes common providers
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock data factories
export const mockUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
})

export const mockContactForm = (overrides = {}) => ({
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Test Company',
  message: 'Test message',
  ...overrides
})

export const mockNewsletterSubscription = (overrides = {}) => ({
  email: 'user@example.com',
  preferences: {
    weekly: true,
    announcements: true
  },
  ...overrides
})

export const mockCaseStudy = (overrides = {}) => ({
  id: '1',
  title: 'AI Implementation Success',
  company: 'TechCorp',
  industry: 'Technology',
  challenge: 'Automate processes',
  solution: 'Custom AI solution',
  results: ['50% efficiency gain', '30% cost reduction'],
  imageUrl: '/images/case-study-1.jpg',
  ...overrides
})

export const mockTestimonial = (overrides = {}) => ({
  id: '1',
  name: 'Jane Smith',
  title: 'CTO',
  company: 'Innovation Inc',
  content: 'Candlefish AI transformed our business operations.',
  rating: 5,
  imageUrl: '/images/testimonial-1.jpg',
  ...overrides
})

export const mockDemoRequest = (overrides = {}) => ({
  name: 'Demo User',
  email: 'demo@example.com',
  company: 'Demo Corp',
  useCase: 'Process automation',
  timeline: 'Within 3 months',
  ...overrides
})

// Mock API responses
export const mockApiResponse = <T>(data: T) => ({
  success: true,
  data,
  message: 'Success'
})

export const mockApiError = (message = 'An error occurred') => ({
  success: false,
  data: null,
  message,
  error: {
    code: 'INTERNAL_ERROR',
    details: message
  }
})

// Wait for animations/transitions
export const waitForAnimation = () => new Promise(resolve => setTimeout(resolve, 300))

// Mock fetch responses
export const setupFetchMock = (response: any, ok = true) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      status: ok ? 200 : 400,
      statusText: ok ? 'OK' : 'Bad Request'
    })
  ) as any
}
