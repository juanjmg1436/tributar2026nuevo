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

    try {
      // Importaciones dinámicas para evitar SSR
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const el = ref.current

      const canvas = await html2canvas(el, {
        scale: 3,                  // Alta resolución (3× para PDF nítido)
        useCORS: true,
        backgroundColor: null,
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      })

      const imgData = canvas.toDataURL('image/png')

      // A4 horizontal en mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()

      // Calcula escala para que el certificado entre centrado con margen
      const margin = 12
      const availW = pageW - margin * 2
      const availH = pageH - margin * 2
      const ratio = Math.min(availW / canvas.width, availH / canvas.height)
      const imgW = canvas.width * ratio
      const imgH = canvas.height * ratio
      const x = (pageW - imgW) / 2
      const y = (pageH - imgH) / 2

      pdf.addImage(imgData, 'PNG', x, y, imgW, imgH)
      pdf.save(`${fileName}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
    } finally {
      setGenerating(false)
    }
  }, [])

  return { exportar, generating }
}
