// Simple email utility - for now just logs
// In production, integrate with AWS SES or similar
export async function sendEmail(options: {
  to: string;
  subject: string;
  template: string;
  payload: any;
}) {
  console.log(`📧 Email would be sent:
    To: ${options.to}
    Subject: ${options.subject}
    Template: ${options.template}
    Payload:`, options.payload);

  return { success: true };
}
