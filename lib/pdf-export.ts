/**
 * Utilidad de exportación PDF — TRIBUT.AR
 * Usa html2canvas + jsPDF para capturar el HTML exactamente
 * como se ve en pantalla (incluyendo el sello de agua) y generar un PDF A4.
 */

export async function exportElementToPDF(
  elementId: string,
  filename: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  try {
    onStart?.()

    // Importaciones dinámicas para evitar SSR
    const [html2canvasModule, jsPDFModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const html2canvas = html2canvasModule.default
    const { jsPDF } = jsPDFModule

    const element = document.getElementById(elementId)
    if (!element) {
      console.error(`[pdf-export] Elemento #${elementId} no encontrado`)
      return
    }

    // Capturar el elemento como canvas en alta resolución
    const canvas = await html2canvas(element, {
      scale: 2,                   // 2x para mayor nitidez
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      // Asegurar que el sello de agua y colores de fondo se capturen
      allowTaint: true,
      foreignObjectRendering: false,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.92)

    // Crear PDF A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()   // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm
    const imgAspect = canvas.height / canvas.width
    const imgHeight = pdfWidth * imgAspect

    if (imgHeight <= pdfHeight) {
      // Cabe en una sola página
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight)
    } else {
      // Contenido más largo que A4: paginar
      let yOffset = 0
      while (yOffset < imgHeight) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, -yOffset, pdfWidth, imgHeight)
        yOffset += pdfHeight
      }
    }

    pdf.save(`${filename}.pdf`)
  } catch (err) {
    console.error('[pdf-export] Error al generar PDF:', err)
    // Fallback a window.print()
    window.print()
  } finally {
    onEnd?.()
  }
}
