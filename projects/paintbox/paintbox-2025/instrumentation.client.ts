import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0, replaysSessionSampleRate: 0.1, replaysOnErrorSampleRate: 1.0 });
}
