import React from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { Spinner } from '../../components/LoadingScreen'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useI18n()
  const { forgotPassword, isLoading } = useAuth()
  const [isSubmitted, setIsSubmitted] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword(data.email)
      setIsSubmitted(true)
    } catch (error) {
      // Error handled in AuthContext
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
        <p className="text-muted-foreground">
          We've sent password reset instructions to your email address.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center text-primary hover:text-primary/80 underline"
        >
          ← Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Forgot password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email address
          </label>
          <input
            {...register('email')}
            type="email"
            className="block w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter your email"
            disabled={isSubmitting || isLoading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting || isLoading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <div className="text-center">
        <Link
          to="/login"
          className="text-sm text-primary hover:text-primary/80 underline"
        >
          ← Back to login
        </Link>
      </div>
    </div>
  )
}
