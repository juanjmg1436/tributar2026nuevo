/**
 * El alta del perfil de contribuyente estuvo bloqueada para todos los alumnos
 * porque validateCUIT usaba replace(/D/g) en vez de replace(/\D/g): sin la
 * barra invertida borraba la letra "D" y no los guiones, así que un CUIT
 * formateado nunca llegaba a 11 dígitos. Este test cubre ese caso.
 */
import { describe, it, expect } from 'vitest'
import { validateCUIT, formatCUIT } from '@/lib/utils'

describe('validateCUIT', () => {
  it('acepta un CUIT con guiones, que es como lo arma el propio campo', () => {
    expect(validateCUIT('30-48414585-3').valid).toBe(true)
  })

  it('acepta sin guiones y con espacios', () => {
    expect(validateCUIT('30484145853').valid).toBe(true)
    expect(validateCUIT('30 48414585 3').valid).toBe(true)
  })

  it('rechaza el dígito verificador incorrecto e informa cuál corresponde', () => {
    const r = validateCUIT('30-48414585-9')
    expect(r.valid).toBe(false)
    expect(r.expected).toBe(3)
  })

  it('rechaza incompletos sin sugerir dígito', () => {
    expect(validateCUIT('30-4841458')).toEqual({ valid: false })
    expect(validateCUIT('')).toEqual({ valid: false })
  })

  it('formatCUIT produce lo que validateCUIT acepta', () => {
    const formateado = formatCUIT('30484145853')
    expect(formateado).toBe('30-48414585-3')
    expect(validateCUIT(formateado).valid).toBe(true)
  })
})
