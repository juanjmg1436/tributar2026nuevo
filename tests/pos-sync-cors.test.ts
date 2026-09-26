/**
 * La vinculación del punto de venta desde PyMEZ falló durante días con
 * "Failed to fetch": el endpoint respondía 200 correcto pero sin el header
 * Access-Control-Allow-Origin, así que el navegador descartaba la respuesta.
 * Con curl no se veía, porque curl ignora CORS. Este test sí lo ve.
 */
import { describe, it, expect } from 'vitest'
import { OPTIONS, GET } from '@/app/api/pos-sync/route'

describe('CORS en /api/pos-sync', () => {
  it('el preflight OPTIONS devuelve los headers de CORS', async () => {
    const res = await OPTIONS()
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET')
  })

  it('una respuesta de error también lleva CORS, o el navegador no puede leerla', async () => {
    const req = new Request('https://tributar.test/api/pos-sync?action=validate')
    const res = await GET(req as never)
    expect(res.status).toBe(400)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })
})
