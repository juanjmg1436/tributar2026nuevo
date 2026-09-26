import * as Sentry from '@sentry/nextjs'

// Next 14 no soporta onRequestError (requiere Next 15), así que acá sólo se
// registran las configuraciones de servidor y edge.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge')   await import('./sentry.edge.config')
}

export const onRequestError = Sentry.captureRequestError
