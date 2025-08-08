import React, { useState, useRef, FormEvent } from 'react';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Secure contact form schema with comprehensive validation
const ContactFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
    .transform(val => DOMPurify.sanitize(val.trim())),

  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email address too long')
    .toLowerCase()
    .transform(val => DOMPurify.sanitize(val.trim())),

  company: z.string()
    .max(100, 'Company name too long')
    .optional()
    .transform(val => val ? DOMPurify.sanitize(val.trim()) : val),

  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must not exceed 5000 characters')
    .transform(val => DOMPurify.sanitize(val.trim(), {
      ALLOWED_TAGS: [], // Strip all HTML
      ALLOWED_ATTR: []
    })),

  // Honeypot field for bot detection
  website: z.string().max(0, 'Invalid submission detected')
});

type ContactFormData = z.infer<typeof ContactFormSchema>;

interface SecureContactFormProps {
  onSubmit?: (data: ContactFormData) => Promise<void>;
  recaptchaSiteKey?: string;
}

// Rate limiting tracker
const submissionTracker = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_SUBMISSIONS = 5;

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const submissions = submissionTracker.get(identifier) || [];

  // Remove old submissions outside the window
  const recentSubmissions = submissions.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentSubmissions.length >= MAX_SUBMISSIONS) {
    return false;
  }

  recentSubmissions.push(now);
  submissionTracker.set(identifier, recentSubmissions);
  return true;
};

export const SecureContactForm: React.FC<SecureContactFormProps> = ({
  onSubmit,
  recaptchaSiteKey
}) => {
  const [formData, setFormData] = useState<Partial<ContactFormData>>({
    name: '',
    email: '',
    company: '',
    message: '',
    website: '' // Honeypot
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const recaptchaRef = useRef<any>(null);

  // Generate a unique identifier for rate limiting (in production, use IP address)
  const getSubmissionIdentifier = (): string => {
    // In a real app, this would be the user's IP address from the server
    return `user_${formData.email || 'anonymous'}`;
  };

  const validateField = (name: keyof ContactFormData, value: any): string | null => {
    try {
      const fieldSchema = ContactFormSchema.shape[name];
      fieldSchema.parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || 'Invalid input';
      }
      return 'Validation error';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Don't show honeypot field changes
    if (name === 'website') {
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Validate on blur
    if (e.type === 'blur' && value) {
      const error = validateField(name as keyof ContactFormData, value);
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Reset states
    setSubmitError(null);
    setErrors({});

    // Check rate limiting
    const identifier = getSubmissionIdentifier();
    if (!checkRateLimit(identifier)) {
      setSubmitError('Too many submissions. Please try again later.');
      return;
    }

    try {
      // Validate all fields
      const validatedData = ContactFormSchema.parse(formData);

      // Check honeypot
      if (validatedData.website) {
        // Silently fail for bots
        setSubmitSuccess(true);
        return;
      }

      setIsSubmitting(true);

      // Execute reCAPTCHA if configured
      if (recaptchaSiteKey && window.grecaptcha) {
        try {
          const token = await window.grecaptcha.execute(recaptchaSiteKey, {
            action: 'contact_form'
          });

          // Add token to submission
          await onSubmit?.({ ...validatedData, recaptchaToken: token } as any);
        } catch (recaptchaError) {
          throw new Error('reCAPTCHA verification failed');
        }
      } else {
        // Submit without reCAPTCHA
        await onSubmit?.(validatedData);
      }

      // Success
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        company: '',
        message: '',
        website: ''
      });

      // Reset form
      formRef.current?.reset();

    } catch (error) {
      if (error instanceof z.ZodError) {
        // Set field-specific errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        // General submission error
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'An error occurred. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add reCAPTCHA script if needed
  React.useEffect(() => {
    if (recaptchaSiteKey && !window.grecaptcha) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [recaptchaSiteKey]);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="secure-contact-form"
      noValidate
      aria-label="Contact form"
    >
      {submitSuccess && (
        <div className="alert alert-success" role="alert">
          <h3>Thank you for your message!</h3>
          <p>We'll get back to you within 24 hours.</p>
        </div>
      )}

      {submitError && (
        <div className="alert alert-error" role="alert">
          <p>{submitError}</p>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="contact-name">
          Name <span aria-label="required">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          value={formData.name || ''}
          onChange={handleChange}
          onBlur={handleChange}
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          disabled={isSubmitting}
          autoComplete="name"
          maxLength={100}
        />
        {errors.name && (
          <span id="name-error" className="error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="contact-email">
          Email <span aria-label="required">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={handleChange}
          onBlur={handleChange}
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          disabled={isSubmitting}
          autoComplete="email"
          maxLength={255}
        />
        {errors.email && (
          <span id="email-error" className="error" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
          type="text"
          value={formData.company || ''}
          onChange={handleChange}
          onBlur={handleChange}
          aria-invalid={!!errors.company}
          aria-describedby={errors.company ? 'company-error' : undefined}
          disabled={isSubmitting}
          autoComplete="organization"
          maxLength={100}
        />
        {errors.company && (
          <span id="company-error" className="error" role="alert">
            {errors.company}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="contact-message">
          Message <span aria-label="required">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          value={formData.message || ''}
          onChange={handleChange}
          onBlur={handleChange}
          required
          aria-required="true"
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
          disabled={isSubmitting}
          rows={5}
          maxLength={5000}
        />
        {errors.message && (
          <span id="message-error" className="error" role="alert">
            {errors.message}
          </span>
        )}
        <span className="character-count" aria-live="polite">
          {formData.message?.length || 0} / 5000
        </span>
      </div>

      {/* Honeypot field - hidden from users */}
      <div className="visually-hidden" aria-hidden="true">
        <label htmlFor="contact-website">
          Website (Do not fill this field)
        </label>
        <input
          id="contact-website"
          name="website"
          type="text"
          value={formData.website || ''}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || submitSuccess}
        className="btn btn-primary"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>

      <p className="privacy-notice">
        By submitting this form, you agree to our{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>.
      </p>
    </form>
  );
};

// CSS styles for security features
const styles = `
  /* Hide honeypot field */
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Secure form styling */
  .secure-contact-form {
    max-width: 600px;
    margin: 0 auto;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .error {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }

  input[aria-invalid="true"],
  textarea[aria-invalid="true"] {
    border-color: #dc3545;
  }

  .alert {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 0.25rem;
  }

  .alert-success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .alert-error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .character-count {
    font-size: 0.875rem;
    color: #6c757d;
    text-align: right;
    display: block;
    margin-top: 0.25rem;
  }

  .privacy-notice {
    font-size: 0.875rem;
    color: #6c757d;
    margin-top: 1rem;
  }
`;

export default SecureContactForm;
