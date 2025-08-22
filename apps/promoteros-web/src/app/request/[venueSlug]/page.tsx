'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const requestSchema = z.object({
  requesterName: z.string().min(1, 'Name is required'),
  requesterEmail: z.string().email('Valid email is required'),
  requesterPhone: z.string().optional(),
  requesterCompany: z.string().optional(),
  artistName: z.string().min(1, 'Artist name is required'),
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  dateStart: z.string().min(1, 'Start date is required'),
  dateEnd: z.string().min(1, 'End date is required'),
  expectedAttendance: z.string().transform(val => val ? parseInt(val) : undefined),
  budgetMin: z.string().transform(val => val ? parseInt(val) : undefined),
  budgetMax: z.string().transform(val => val ? parseInt(val) : undefined),
  splitNotes: z.string().optional(),
  techNeeds: z.string().optional(),
  website: z.string().optional(), // Honeypot field
});

type RequestForm = z.infer<typeof requestSchema>;

export default function EventRequestPage({ params }: { params: { venueSlug: string } }) {
  const [submitted, setSubmitted] = useState(false);
  const submitRequest = trpc.eventRequest.submitRequest.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
  });

  const onSubmit = async (data: RequestForm) => {
    try {
      await submitRequest.mutateAsync({
        ...data,
        venueSlug: params.venueSlug,
        expectedAttendance: data.expectedAttendance || undefined,
        budgetMin: data.budgetMin || undefined,
        budgetMax: data.budgetMax || undefined,
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-12">
        <div className="container max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="pt-12 pb-8">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Request Submitted Successfully!</h1>
                <p className="text-muted-foreground">
                  Thank you for your event request. You will receive a confirmation email shortly.
                  Our team will review your request and get back to you within 48 hours.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-12">
      <div className="container max-w-3xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Submit Event Request</CardTitle>
            <CardDescription>
              Please fill out this form to request an event booking. We'll review your submission and get back to you within 48 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Honeypot field - hidden from users */}
              <input
                type="text"
                {...register('website')}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="requesterName">Your Name *</Label>
                  <Input
                    id="requesterName"
                    {...register('requesterName')}
                    className={errors.requesterName ? 'border-destructive' : ''}
                  />
                  {errors.requesterName && (
                    <p className="text-sm text-destructive mt-1">{errors.requesterName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="requesterEmail">Email Address *</Label>
                  <Input
                    id="requesterEmail"
                    type="email"
                    {...register('requesterEmail')}
                    className={errors.requesterEmail ? 'border-destructive' : ''}
                  />
                  {errors.requesterEmail && (
                    <p className="text-sm text-destructive mt-1">{errors.requesterEmail.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="requesterPhone">Phone Number</Label>
                  <Input
                    id="requesterPhone"
                    type="tel"
                    {...register('requesterPhone')}
                  />
                </div>

                <div>
                  <Label htmlFor="requesterCompany">Company/Agency</Label>
                  <Input
                    id="requesterCompany"
                    {...register('requesterCompany')}
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Event Details</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="artistName">Artist/Act Name *</Label>
                    <Input
                      id="artistName"
                      {...register('artistName')}
                      className={errors.artistName ? 'border-destructive' : ''}
                    />
                    {errors.artistName && (
                      <p className="text-sm text-destructive mt-1">{errors.artistName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      {...register('title')}
                      placeholder="e.g., Summer Tour 2025, Album Release Show"
                      className={errors.title ? 'border-destructive' : ''}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Event Description</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      rows={3}
                      placeholder="Tell us about the event, genre, special requirements..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateStart">Preferred Date *</Label>
                      <Input
                        id="dateStart"
                        type="date"
                        {...register('dateStart')}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className={errors.dateStart ? 'border-destructive' : ''}
                      />
                      {errors.dateStart && (
                        <p className="text-sm text-destructive mt-1">{errors.dateStart.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="dateEnd">Alternative Date</Label>
                      <Input
                        id="dateEnd"
                        type="date"
                        {...register('dateEnd')}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className={errors.dateEnd ? 'border-destructive' : ''}
                      />
                      {errors.dateEnd && (
                        <p className="text-sm text-destructive mt-1">{errors.dateEnd.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expectedAttendance">Expected Attendance</Label>
                    <Input
                      id="expectedAttendance"
                      type="number"
                      {...register('expectedAttendance')}
                      placeholder="Estimated number of attendees"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Financial Details</h3>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="budgetMin">Minimum Budget ($)</Label>
                      <Input
                        id="budgetMin"
                        type="number"
                        {...register('budgetMin')}
                        placeholder="Minimum guarantee or budget"
                      />
                    </div>

                    <div>
                      <Label htmlFor="budgetMax">Maximum Budget ($)</Label>
                      <Input
                        id="budgetMax"
                        type="number"
                        {...register('budgetMax')}
                        placeholder="Maximum budget available"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="splitNotes">Revenue Split / Deal Terms</Label>
                    <Textarea
                      id="splitNotes"
                      {...register('splitNotes')}
                      rows={2}
                      placeholder="e.g., 80/20 after expenses, flat guarantee, etc."
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Technical Requirements</h3>

                <div>
                  <Label htmlFor="techNeeds">Technical Needs</Label>
                  <Textarea
                    id="techNeeds"
                    {...register('techNeeds')}
                    rows={3}
                    placeholder="Sound, lighting, backline requirements, etc."
                  />
                </div>
              </div>

              {submitRequest.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    There was an error submitting your request. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end pt-6">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || submitRequest.isPending}
                >
                  {isSubmitting || submitRequest.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
