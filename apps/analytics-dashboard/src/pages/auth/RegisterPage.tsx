import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { Spinner } from '../../components/LoadingScreen'

// Validation schema
const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  organizationName: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

export const RegisterPage: React.FC = () => {
  const { t } = useI18n()
  const { register: registerUser, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      organizationName: '',
      acceptTerms: false,
    },
  })

  const password = watch('password')

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++

    return {
      score: strength,
      label: strength === 0 ? '' :
             strength < 3 ? 'Weak' :
             strength < 5 ? 'Medium' : 'Strong',
      color: strength < 3 ? 'text-red-500' :
             strength < 5 ? 'text-yellow-500' : 'text-green-500'
    }
  }

  const passwordStrength = getPasswordStrength(password)

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(
        data.email,
        data.password,
        data.firstName,
        data.lastName,
        data.organizationName || undefined
      )
      navigate('/dashboards', { replace: true })
    } catch (error: any) {
      // Error handling is done in AuthContext
      console.error('Registration error:', error)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('auth.createAccount', 'Create your account')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('auth.haveAccount', 'Already have an account?')}{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:text-primary/80 underline underline-offset-4"
          >
            {t('auth.signIn', 'Sign in')}
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Name fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-foreground mb-2"
            >
              {t('auth.firstName', 'First name')} *
            </label>
            <input
              {...register('firstName')}
              id="firstName"
              type="text"
              autoComplete="given-name"
              required
              className="block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              placeholder={t('auth.firstNamePlaceholder', 'John')}
              disabled={isSubmitting}
              aria-invalid={errors.firstName ? 'true' : 'false'}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            />
            {errors.firstName && (
              <p id="firstName-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-foreground mb-2"
            >
              {t('auth.lastName', 'Last name')} *
            </label>
            <input
              {...register('lastName')}
              id="lastName"
              type="text"
              autoComplete="family-name"
              required
              className="block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              placeholder={t('auth.lastNamePlaceholder', 'Doe')}
              disabled={isSubmitting}
              aria-invalid={errors.lastName ? 'true' : 'false'}
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            />
            {errors.lastName && (
              <p id="lastName-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        {/* Email field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground mb-2"
          >
            {t('auth.email', 'Email address')} *
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            required
            className="block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            placeholder={t('auth.emailPlaceholder', 'john@example.com')}
            disabled={isSubmitting}
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Organization name field */}
        <div>
          <label
            htmlFor="organizationName"
            className="block text-sm font-medium text-foreground mb-2"
          >
            {t('auth.organizationName', 'Organization name')} ({t('common.optional', 'Optional')})
          </label>
          <input
            {...register('organizationName')}
            id="organizationName"
            type="text"
            autoComplete="organization"
            className="block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            placeholder={t('auth.organizationPlaceholder', 'Acme Corp')}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t('auth.organizationHelp', 'Leave blank to join an existing organization later')}
          </p>
        </div>

        {/* Password field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground mb-2"
          >
            {t('auth.password', 'Password')} *
          </label>
          <div className="relative">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              className="block w-full px-3 py-2 pr-12 border border-input rounded-md shadow-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              placeholder={t('auth.passwordPlaceholder', 'Create a strong password')}
              disabled={isSubmitting}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error password-help' : 'password-help'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Password strength indicator */}
          {password && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Password strength:</span>
                <span className={passwordStrength.color}>{passwordStrength.label}</span>
              </div>
              <div className="mt-1 w-full bg-muted h-1 rounded-full">
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${
                    passwordStrength.score < 3 ? 'bg-red-500' :
                    passwordStrength.score < 5 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                />
              </div>
            </div>
          )}

          {errors.password && (
            <p id="password-error" className="mt-1 text-sm text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
          <p id="password-help" className="mt-1 text-xs text-muted-foreground">
            Must be 8+ characters with uppercase, lowercase, number, and special character
          </p>
        </div>

        {/* Confirm password field */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-foreground mb-2"
          >
            {t('auth.confirmPassword', 'Confirm password')} *
          </label>
          <div className="relative">
            <input
              {...register('confirmPassword')}
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              className="block w-full px-3 py-2 pr-12 border border-input rounded-md shadow-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              placeholder={t('auth.confirmPasswordPlaceholder', 'Confirm your password')}
              disabled={isSubmitting}
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="mt-1 text-sm text-destructive" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms and conditions */}
        <div className="flex items-start">
          <input
            {...register('acceptTerms')}
            id="acceptTerms"
            type="checkbox"
            className="mt-1 h-4 w-4 text-primary border-input rounded focus:ring-2 focus:ring-primary bg-background"
            disabled={isSubmitting}
            aria-invalid={errors.acceptTerms ? 'true' : 'false'}
            aria-describedby={errors.acceptTerms ? 'terms-error' : undefined}
          />
          <label htmlFor="acceptTerms" className="ml-2 text-sm text-foreground">
            {t('auth.acceptTerms', 'I agree to the')}{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:text-primary/80 underline underline-offset-4"
            >
              {t('legal.terms', 'Terms of Service')}
            </a>{' '}
            {t('common.and', 'and')}{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:text-primary/80 underline underline-offset-4"
            >
              {t('legal.privacy', 'Privacy Policy')}
            </a>
          </label>
        </div>
        {errors.acceptTerms && (
          <p id="terms-error" className="text-sm text-destructive" role="alert">
            {errors.acceptTerms.message}
          </p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || isLoading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              {t('auth.creatingAccount', 'Creating account...')}
            </>
          ) : (
            t('auth.createAccount', 'Create account')
          )}
        </button>

        {/* Error display */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-3" role="alert">
            <div className="text-sm text-destructive font-medium">
              {error}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
