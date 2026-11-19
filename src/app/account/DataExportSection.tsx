'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const csv = '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const MECANISMO_LABELS: Record<string, string> = { traumatico: 'Traumático', sobreuso: 'Por sobreuso', degenerativo: 'Degenerativo' }
const LATERALIDAD_LABELS: Record<string, string> = { derecha: 'Derecha', izquierda: 'Izquierda', bilateral: 'Bilateral', no_aplica: 'No aplica' }
const DURACION_LABELS: Record<string, string> = { agudo: 'Agudo (< 6 sem.)', subagudo: 'Subagudo (6-12 sem.)', cronico: 'Crónico (> 3 meses)' }

function boolLabel(v: boolean | null): string {
  return v === null ? '' : (v ? 'Sí' : 'No')
}

// Export de portabilidad: a diferencia del CSV de Estadísticas (de-identificado,
// pensado para investigación), este lleva nombre y DNI — es "llevate tus datos
// si cancelás o cambiás de herramienta", no un dataset para publicar.
export default function DataExportSection({ orgId, userId }: { orgId: string | null; userId: string }) {
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [loadingFichas, setLoadingFichas] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportPatients = async () => {
    setError(null)
    setLoadingPatients(true)
    try {
      const supabase = createClient()
      const query = orgId
        ? supabase.from('patients')
            .select('id, name, dni, age, birth_date, phone, email, obra_social, affiliate_number, occupation, source, created_at')
            .eq('org_id', orgId).order('created_at', { ascending: true })
        : supabase.from('patients')
            .select('id, name, dni, age, birth_date, phone, email, obra_social, affiliate_number, occupation, source, created_at')
            .eq('user_id', userId).is('org_id', null).order('created_at', { ascending: true })
      const { data, error: err } = await query
      if (err) throw err

      const headers = ['id', 'nombre', 'dni', 'edad', 'fecha_nacimiento', 'telefono', 'email', 'obra_social', 'n_afiliado', 'ocupacion', 'via_de_llegada', 'fecha_alta']
      const rows = (data ?? []).map(p => [
        p.id, p.name, p.dni ?? '', p.age ?? '', p.birth_date ?? '', p.phone ?? '', p.email ?? '',
        p.obra_social ?? '', p.affiliate_number ?? '', p.occupation ?? '', p.source ?? '', p.created_at,
      ])
      downloadCsv(`reason-pacientes-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows])
    } catch {
      setError('No se pudo exportar los pacientes. Probá de nuevo.')
    } finally {
      setLoadingPatients(false)
    }
  }

  const exportFichas = async () => {
    setError(null)
    setLoadingFichas(true)
    try {
      const supabase = createClient()

      type FichaRow = {
        id: string; fecha: string | null; diagnosis_id: string | null
        mecanismo_lesion: string | null; lateralidad: string | null
        dolor_eva_inicial: number | null; duracion_sintomas: string | null; episodio_recurrente: boolean | null
        ficha_data: Record<string, unknown> | null
        patients: { name: string; dni: string | null } | { name: string; dni: string | null }[] | null
      }

      // Igual que en Estadísticas/Pacientes: se filtra por org_id/user_id vía el
      // join con patients, nunca pasando una lista de ids por la URL.
      const fichasQuery = orgId
        ? supabase.from('patient_fichas')
            .select('id, fecha, diagnosis_id, mecanismo_lesion, lateralidad, dolor_eva_inicial, duracion_sintomas, episodio_recurrente, ficha_data, patients!inner(name, dni, org_id)')
            .eq('patients.org_id', orgId)
        : supabase.from('patient_fichas')
            .select('id, fecha, diagnosis_id, mecanismo_lesion, lateralidad, dolor_eva_inicial, duracion_sintomas, episodio_recurrente, ficha_data, patients!inner(name, dni, org_id, user_id)')
            .eq('patients.user_id', userId).is('patients.org_id', null)

      const [{ data: fichas, error: fErr }, { data: diagGlobal }, { data: diagCustom }] = await Promise.all([
        fichasQuery,
        supabase.from('diagnosis_catalog').select('id, nombre, codigo_cie10'),
        orgId
          ? supabase.from('diagnosis_catalog_custom').select('id, nombre, codigo_cie10').eq('org_id', orgId)
          : supabase.from('diagnosis_catalog_custom').select('id, nombre, codigo_cie10').eq('user_id', userId),
      ])
      if (fErr) throw fErr

      const diagnosisById = new Map([...(diagGlobal ?? []), ...(diagCustom ?? [])].map(d => [d.id, d]))

      const headers = [
        'id_ficha', 'paciente', 'dni', 'fecha', 'diagnostico', 'codigo_cie10',
        'mecanismo_lesion', 'lateralidad', 'duracion_sintomas', 'episodio_recurrente', 'eva_dolor_inicial',
        'motivo_consulta', 'historia_enfermedad_actual', 'antecedentes', 'plan_tratamiento',
      ]
      const rows = ((fichas ?? []) as unknown as FichaRow[]).map(f => {
        const patient = Array.isArray(f.patients) ? f.patients[0] : f.patients
        const diag = f.diagnosis_id ? diagnosisById.get(f.diagnosis_id) : undefined
        const fd = (f.ficha_data ?? {}) as Record<string, unknown>
        return [
          f.id,
          patient?.name ?? '',
          patient?.dni ?? '',
          f.fecha ?? '',
          diag?.nombre ?? '',
          diag?.codigo_cie10 ?? '',
          f.mecanismo_lesion ? (MECANISMO_LABELS[f.mecanismo_lesion] ?? f.mecanismo_lesion) : '',
          f.lateralidad ? (LATERALIDAD_LABELS[f.lateralidad] ?? f.lateralidad) : '',
          f.duracion_sintomas ? (DURACION_LABELS[f.duracion_sintomas] ?? f.duracion_sintomas) : '',
          boolLabel(f.episodio_recurrente),
          f.dolor_eva_inicial ?? '',
          (fd.motivoConsulta as string | undefined) ?? '',
          (fd.historiaEnfermedad as string | undefined) ?? '',
          (fd.antecedentes as string | undefined) ?? '',
          (fd.planTratamiento as string | undefined) ?? '',
        ]
      })
      downloadCsv(`reason-fichas-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows])
    } catch {
      setError('No se pudo exportar las fichas. Probá de nuevo.')
    } finally {
      setLoadingFichas(false)
    }
  }

  return (
    <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-8 mb-8">
      <h2 className="text-[16px] font-medium mb-1">Exportar mis datos</h2>
      <p className="text-[13px] text-text-secondary mb-5">
        Llevate tu información cuando quieras — con nombre y DNI incluidos, lista para abrir en Excel. Útil como respaldo propio, o si en algún momento cancelás.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={exportPatients}
          disabled={loadingPatients}
          className="bg-bg-primary border-[0.5px] border-border-strong text-text-primary px-4 py-2.5 rounded-lg text-[13px] font-medium hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
        >
          {loadingPatients ? 'Exportando…' : 'Pacientes (CSV)'}
        </button>
        <button
          onClick={exportFichas}
          disabled={loadingFichas}
          className="bg-bg-primary border-[0.5px] border-border-strong text-text-primary px-4 py-2.5 rounded-lg text-[13px] font-medium hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
        >
          {loadingFichas ? 'Exportando…' : 'Fichas clínicas (CSV)'}
        </button>
      </div>
      {error && <p className="text-[12px] text-warning mt-3">{error}</p>}
    </div>
  )
}
