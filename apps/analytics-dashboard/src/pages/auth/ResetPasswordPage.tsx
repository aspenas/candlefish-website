import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '../../components/LoadingScreen'

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { resetPassword, isLoading } = useAuth()
  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return

    try {
      await resetPassword(token, data.password)
      navigate('/dashboards')
    } catch (error) {
      // Error handled in AuthContext
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Invalid reset link</h1>
        <p className="text-muted-foreground">This password reset link is invalid or has expired.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            New password
          </label>
          <input
            {...register('password')}
            type="password"
            className="block w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting || isLoading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
            Confirm password
          </label>
          <input
            {...register('confirmPassword')}
            type="password"
            className="block w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting || isLoading}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
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
              Updating...
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </div>
  )
}
