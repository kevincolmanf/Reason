'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { downloadPatientSummaryPdf } from '@/lib/patientSummaryPdf'

interface PatientForDelete {
  id: string
  name: string
  dni: string | null
  age: number | null
  birth_date: string | null
  phone: string | null
  email: string | null
  obra_social: string | null
  occupation: string | null
}

interface FichaRow {
  fecha: string | null
  ficha_data: { diagnostico?: string; motivoConsulta?: string; historiaEnfermedad?: string; antecedentes?: string } | null
}

export default function DeletePatientModal({
  patient, deleting, onConfirm, onCancel,
}: {
  patient: PatientForDelete
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const supabase = createClient()
      const { data: ficha } = await supabase
        .from('patient_fichas')
        .select('fecha, ficha_data')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle<FichaRow>()

      await downloadPatientSummaryPdf({
        name: patient.name,
        dni: patient.dni,
        age: patient.age,
        birth_date: patient.birth_date,
        phone: patient.phone,
        email: patient.email,
        obra_social: patient.obra_social,
        occupation: patient.occupation,
        ficha: ficha ? {
          fecha: ficha.fecha,
          diagnostico: ficha.ficha_data?.diagnostico,
          motivoConsulta: ficha.ficha_data?.motivoConsulta,
          historiaEnfermedad: ficha.ficha_data?.historiaEnfermedad,
          antecedentes: ficha.ficha_data?.antecedentes,
        } : null,
      })
      setDownloaded(true)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-8 max-w-[440px] w-full shadow-xl">
        <h3 className="text-[18px] font-medium mb-2">Eliminar paciente</h3>
        <p className="text-[14px] text-text-secondary mb-1">Estás por eliminar a <strong className="text-text-primary">{patient.name}</strong>.</p>
        <p className="text-[13px] text-warning mb-5">
          Esta acción es permanente e irreversible: se borran para siempre la ficha, el historial, los hitos y las evaluaciones de este paciente. Los planes de ejercicio asociados no se borran — quedan sin paciente asignado.
        </p>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 bg-bg-primary border-[0.5px] border-border rounded-lg px-4 py-2.5 text-[13px] font-medium text-text-primary hover:border-accent/50 transition-colors disabled:opacity-50 mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          {downloading ? 'Generando PDF…' : downloaded ? '✓ Descargado — descargar de nuevo' : 'Descargar informe (PDF) antes de eliminar'}
        </button>

        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={deleting} className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-[13px] font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            {deleting ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
          <button onClick={onCancel} disabled={deleting} className="text-text-secondary px-4 py-2.5 text-[13px] hover:text-text-primary">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
