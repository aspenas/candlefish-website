import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { Spinner } from '../../components/LoadingScreen'

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const { t } = useI18n()
  const { login, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/dashboards'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password, data.rememberMe)
      navigate(redirectTo, { replace: true })
    } catch (error: any) {
      // Error handling is done in AuthContext
      console.error('Login error:', error)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('auth.signIn', 'Sign in to your account')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('auth.noAccount', "Don't have an account?")}{' '}
          <Link
            to="/register"
            className="font-medium text-primary hover:text-primary/80 underline underline-offset-4"
          >
            {t('auth.signUp', 'Sign up')}
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Email field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground mb-2"
          >
            {t('auth.email', 'Email address')}
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            required
            className="block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            placeholder={t('auth.emailPlaceholder', 'Enter your email')}
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

        {/* Password field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground mb-2"
          >
            {t('auth.password', 'Password')}
          </label>
          <div className="relative">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="block w-full px-3 py-2 pr-12 border border-input rounded-md shadow-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
              disabled={isSubmitting}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
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
          {errors.password && (
            <p id="password-error" className="mt-1 text-sm text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me and forgot password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              {...register('rememberMe')}
              id="rememberMe"
              type="checkbox"
              className="h-4 w-4 text-primary border-input rounded focus:ring-2 focus:ring-primary bg-background"
              disabled={isSubmitting}
            />
            <label
              htmlFor="rememberMe"
              className="ml-2 block text-sm text-foreground"
            >
              {t('auth.rememberMe', 'Remember me')}
            </label>
          </div>

          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary hover:text-primary/80 underline underline-offset-4"
          >
            {t('auth.forgotPassword', 'Forgot your password?')}
          </Link>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || isLoading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              {t('auth.signingIn', 'Signing in...')}
            </>
          ) : (
            t('auth.signIn', 'Sign in')
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

      {/* Demo credentials for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-muted/50 rounded-md border">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Demo Credentials (Development Only)
          </h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Admin: admin@example.com / password</div>
            <div>User: user@example.com / password</div>
          </div>
        </div>
      )}
    </div>
  )
}
