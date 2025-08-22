// Test the validation logic separately from Next.js request handling
describe('Consideration Form Validation', () => {
  // Email validation regex from the API
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Validation logic extracted from API
  function validateFields(data: any) {
    const {
      yearsInOperation,
      operationalChallenge,
      manualHours,
      investmentRange,
      name,
      role,
      email,
      company
    } = data

    // Check required fields
    if (!yearsInOperation || !operationalChallenge || !manualHours || !investmentRange ||
        !name || !role || !email || !company) {
      return { valid: false, error: 'All fields are required' }
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email address' }
    }

    // Validate numeric fields
    const years = parseInt(yearsInOperation)
    const hours = parseInt(manualHours)

    if (isNaN(years) || years < 1) {
      return { valid: false, error: 'Years in operation must be a valid number' }
    }

    if (isNaN(hours) || hours < 1) {
      return { valid: false, error: 'Manual hours must be a valid number' }
    }

    return { valid: true }
  }

  it('should accept valid consideration data', () => {
    const validData = {
      yearsInOperation: '5',
      operationalChallenge: 'Manual inventory tracking taking 20+ hours per week',
      manualHours: '25',
      investmentRange: '200-300',
      name: 'John Doe',
      role: 'Operations Manager',
      email: 'john@example.com',
      company: 'Test Company'
    }

    const result = validateFields(validData)
    expect(result.valid).toBe(true)
  })

  it('should reject incomplete data', () => {
    const incompleteData = {
      name: 'John Doe',
      email: 'john@example.com',
      // Missing required fields
    }

    const result = validateFields(incompleteData)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('All fields are required')
  })

  it('should reject invalid email', () => {
    const invalidEmailData = {
      yearsInOperation: '5',
      operationalChallenge: 'Test challenge',
      manualHours: '25',
      investmentRange: '200-300',
      name: 'John Doe',
      role: 'Operations Manager',
      email: 'invalid-email',
      company: 'Test Company'
    }

    const result = validateFields(invalidEmailData)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid email address')
  })

  it('should validate numeric fields', () => {
    const invalidNumericData = {
      yearsInOperation: 'not-a-number',
      operationalChallenge: 'Test challenge',
      manualHours: 'not-a-number',
      investmentRange: '200-300',
      name: 'John Doe',
      role: 'Operations Manager',
      email: 'john@example.com',
      company: 'Test Company'
    }

    const result = validateFields(invalidNumericData)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Years in operation must be a valid number')
  })

  it('should validate positive numbers only', () => {
    const negativeData = {
      yearsInOperation: '-1',
      operationalChallenge: 'Test challenge',
      manualHours: '25',
      investmentRange: '200-300',
      name: 'John Doe',
      role: 'Operations Manager',
      email: 'john@example.com',
      company: 'Test Company'
    }

    const result = validateFields(negativeData)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Years in operation must be a valid number')
  })
})
