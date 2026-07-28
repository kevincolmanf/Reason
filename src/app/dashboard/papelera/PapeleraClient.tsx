'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'
import { restoreRecord, purgeExpiredDeletedRecords, SOFT_DELETE_LABELS, type SoftDeletableTable } from '@/lib/softDelete'

interface DeletedRow {
  id: string
  table_name: string
  record_id: string
  patient_id: string | null
  patient_name: string | null
  label: string | null
  deleted_at: string
}

const RETENTION_DAYS = 30

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PapeleraClient() {
  const supabase = useRef(createClient())
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const [rows, setRows] = useState<DeletedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // Purga lo que ya superó los 30 días, luego lista lo vigente.
    await purgeExpiredDeletedRecords(supabase.current, RETENTION_DAYS)
    const { data } = await supabase.current
      .from('deleted_records')
      .select('id, table_name, record_id, patient_id, patient_name, label, deleted_at')
      .order('deleted_at', { ascending: false })
    let list = (data ?? []) as DeletedRow[]
    // Completar nombres de paciente que no se guardaron denormalizados.
    const missing = Array.from(new Set(list.filter(r => !r.patient_name && r.patient_id).map(r => r.patient_id as string)))
    if (missing.length) {
      const { data: pats } = await supabase.current.from('patients').select('id, name').in('id', missing)
      const nameById = new Map((pats ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))
      list = list.map(r => (r.patient_name || !r.patient_id) ? r : { ...r, patient_name: nameById.get(r.patient_id) ?? null })
    }
    setRows(list)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const daysLeft = (iso: string) => {
    const ms = new Date(iso).getTime() + RETENTION_DAYS * 86400000 - Date.now()
    return Math.max(0, Math.ceil(ms / 86400000))
  }

  const rowLabel = (r: DeletedRow) =>
    r.label || SOFT_DELETE_LABELS[r.table_name as SoftDeletableTable] || r.table_name

  const handleRestore = async (r: DeletedRow) => {
    setBusyId(r.id)
    const { error } = await restoreRecord(supabase.current, r.id)
    setBusyId(null)
    if (error) { notify('No se pudo restaurar: ' + error, 'error'); return }
    setRows(prev => prev.filter(x => x.id !== r.id))
    notify('Registro restaurado')
  }

  const handlePurge = async (r: DeletedRow) => {
    if (!(await confirm({
      title: 'Eliminar definitivamente',
      message: 'Esto borra el registro para siempre. No se va a poder recuperar.',
      danger: true,
      confirmLabel: 'Eliminar definitivamente',
    }))) return
    setBusyId(r.id)
    const { error } = await supabase.current.from('deleted_records').delete().eq('id', r.id)
    setBusyId(null)
    if (error) { notify('No se pudo eliminar: ' + error, 'error'); return }
    setRows(prev => prev.filter(x => x.id !== r.id))
    notify('Eliminado definitivamente')
  }

  return (
    <div>
      {confirmDialog}
      {toast}

      {loading ? (
        <p className="text-[14px] text-text-secondary">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="bg-bg-primary border-[0.5px] border-border rounded-xl px-6 py-10 text-center">
          <p className="text-[15px] font-medium mb-1">La papelera está vacía</p>
          <p className="text-[13px] text-text-secondary">Los registros borrados aparecen acá y se pueden restaurar durante 30 días.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(r => {
            const left = daysLeft(r.deleted_at)
            return (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-bg-primary border-[0.5px] border-border rounded-xl px-5 py-4">
                <div className="min-w-0">
                  <div className="text-[14px] font-medium">{rowLabel(r)}</div>
                  <div className="text-[12px] text-text-secondary mt-0.5">
                    {r.patient_name ? <>Paciente: {r.patient_name} · </> : null}
                    Borrado el {fmtDate(r.deleted_at)}
                    <span className="text-text-tertiary"> · {left} día{left !== 1 ? 's' : ''} para eliminarse</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(r)}
                    disabled={busyId === r.id}
                    className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {busyId === r.id ? '…' : 'Restaurar'}
                  </button>
                  <button
                    onClick={() => handlePurge(r)}
                    disabled={busyId === r.id}
                    className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-3 py-2 rounded-lg text-[13px] hover:text-warning hover:border-warning disabled:opacity-40 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
