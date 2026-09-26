import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://0d6c4b99f103f92c46a2fb9a8f1378f1@o4512149484601344.ingest.us.sentry.io/4512149626552320',
  tracesSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV,
})
