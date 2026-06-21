'use client'

import { useState, useCallback } from 'react'

export function useCertificadoPDF() {
  const [generating, setGenerating] = useState(false)

  const exportar = useCallback(async (
    ref: React.RefObject<HTMLDivElement>,
    fileName: string
  ) => {
    if (!ref.current) return
    setGenerating(true)

    let clone: HTMLDivElement | null = null

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const el = ref.current

      // ── Clon fuera de pantalla sin ninguna transformación CSS ──────────────
      // Esto elimina cualquier escala/translate del modal que pueda deformar
      // el renderizado de html2canvas.
      clone = el.cloneNode(true) as HTMLDivElement
      Object.assign(clone.style, {
        position:   'fixed',
        top:        '-99999px',
        left:       '-99999px',
        transform:  'none',
        width:      `${el.scrollWidth}px`,
        margin:     '0',
        padding:    '0',
        zIndex:     '-1',
      })
      document.body.appendChild(clone)

      // Breve pausa para que el browser termine de pintar el clon
      await new Promise(r => setTimeout(r, 80))

      const canvas = await html2canvas(clone, {
        scale: 2,                          // 2× → buena calidad sin exceder RAM
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width:  clone.offsetWidth,
        height: clone.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth:  clone.offsetWidth,
        windowHeight: clone.offsetHeight,
      })

      // Limpia el clon inmediatamente después de capturar
      document.body.removeChild(clone)
      clone = null

      const imgData = canvas.toDataURL('image/png', 1.0)

      // A4 apaisado (297 × 210 mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 10

      const ratio = Math.min(
        (pageW - margin * 2) / canvas.width,
        (pageH - margin * 2) / canvas.height
      )
      const imgW = canvas.width  * ratio
      const imgH = canvas.height * ratio
      const x = (pageW - imgW) / 2
      const y = (pageH - imgH) / 2

      pdf.addImage(imgData, 'PNG', x, y, imgW, imgH)
      pdf.save(`${fileName}.pdf`)

    } catch (err) {
      console.error('Error generando PDF:', err)
    } finally {
      // Garantiza que el clon se elimine aunque haya un error
      if (clone && document.body.contains(clone)) {
        document.body.removeChild(clone)
      }
      setGenerating(false)
    }
  }, [])

  return { exportar, generating }
}
