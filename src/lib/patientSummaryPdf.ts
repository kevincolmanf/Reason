export interface PatientSummaryPdfInput {
  name: string
  dni: string | null
  age: number | null
  birth_date: string | null
  phone: string | null
  email: string | null
  obra_social: string | null
  occupation: string | null
  ficha?: {
    fecha: string | null
    diagnostico?: string
    motivoConsulta?: string
    historiaEnfermedad?: string
    antecedentes?: string
  } | null
}

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// PDF liviano con los datos de identificación y el resumen clínico del
// paciente — pensado para que el profesional se lo lleve antes de borrar a
// un paciente (la ficha, el historial y los hitos se eliminan para siempre
// en ese momento). No reemplaza el export completo de la ficha.
export async function downloadPatientSummaryPdf(input: PatientSummaryPdfInput): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const margin = 14
  const maxWidth = 182
  const pageHeight = 292
  let y = 14

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text(input.name, margin, y)
  y += 7
  doc.setDrawColor(190); doc.line(margin, y, margin + maxWidth, y); y += 6

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  const datos = [
    input.dni && `DNI: ${input.dni}`,
    input.age != null && `Edad: ${input.age}`,
    input.birth_date && `Nacimiento: ${new Date(input.birth_date + 'T12:00:00').toLocaleDateString('es-AR')}`,
    input.phone && `Teléfono: ${input.phone}`,
    input.email && `Email: ${input.email}`,
    input.obra_social && `Obra social: ${input.obra_social}`,
    input.occupation && `Ocupación: ${input.occupation}`,
  ].filter((v): v is string => !!v)
  datos.forEach(line => { doc.text(line, margin, y); y += 5 })
  y += 4

  const LH = 4.2
  const section = (title: string, content?: string) => {
    if (!content || !content.trim()) return
    if (y > pageHeight - 10) { doc.addPage(); y = 14 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5)
    doc.text(title, margin, y); y += LH + 0.8
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.splitTextToSize(content, maxWidth).forEach((line: string) => {
      if (y > pageHeight - 6) { doc.addPage(); y = 14 }
      doc.text(line, margin, y); y += LH
    })
    y += 3
  }

  if (input.ficha) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    if (y > pageHeight - 10) { doc.addPage(); y = 14 }
    doc.text(`Ficha kinésica${input.ficha.fecha ? ` — ${input.ficha.fecha}` : ''}`, margin, y)
    y += 7
    section('Diagnóstico', input.ficha.diagnostico)
    section('Motivo de consulta', input.ficha.motivoConsulta)
    section('Historia de la enfermedad actual', input.ficha.historiaEnfermedad)
    section('Antecedentes', input.ficha.antecedentes)
  } else {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9)
    doc.text('Este paciente no tenía ficha kinésica cargada.', margin, y)
  }

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(150)
  doc.text(`Generado desde Reason el ${new Date().toLocaleDateString('es-AR')}`, margin, pageHeight)

  doc.save(`reason-${slug(input.name)}.pdf`)
}
