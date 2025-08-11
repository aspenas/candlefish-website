import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Mail, User, Building, Clock, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Name is required'),
  company: z.string().min(1, 'Company is required'),
  accessDuration: z.number().min(1).max(365).default(7),
  permissions: z.array(z.string()).default(['READ']),
  allowedSecrets: z.array(z.string()).default([]),
  reason: z.string().min(1, 'Reason is required'),
  notifyEmail: z.boolean().default(true),
});

type InviteForm = z.infer<typeof inviteSchema>;

interface InviteContractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (data: InviteForm) => Promise<void>;
  loading?: boolean;
}

export function InviteContractorDialog({
  open,
  onOpenChange,
  onInvite,
  loading = false,
}: InviteContractorDialogProps) {
  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      accessDuration: 7,
      permissions: ['READ'],
      allowedSecrets: [],
      notifyEmail: true,
    },
  });

  const onSubmit = async (data: InviteForm) => {
    await onInvite(data);
    form.reset();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invite Contractor</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contractor@company.com"
                  className="pl-10"
                  {...form.register('email')}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="pl-10"
                  {...form.register('name')}
                />
              </div>
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-medium">Company</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="company"
                  placeholder="Acme Corp"
                  className="pl-10"
                  {...form.register('company')}
                />
              </div>
              {form.formState.errors.company && (
                <p className="text-sm text-red-500">{form.formState.errors.company.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium">Access Reason</label>
              <Input
                id="reason"
                placeholder="Project consultation, code review..."
                {...form.register('reason')}
              />
              {form.formState.errors.reason && (
                <p className="text-sm text-red-500">{form.formState.errors.reason.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="accessDuration" className="text-sm font-medium">Access Duration (days)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="accessDuration"
                  type="number"
                  min="1"
                  max="365"
                  className="pl-10"
                  {...form.register('accessDuration', { valueAsNumber: true })}
                />
              </div>
              {form.formState.errors.accessDuration && (
                <p className="text-sm text-red-500">{form.formState.errors.accessDuration.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifyEmail"
                {...form.register('notifyEmail')}
              />
              <label htmlFor="notifyEmail" className="text-sm">
                Send invitation email
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Send Invitation'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
