import Link from 'next/link'

export interface PendienteItem {
  kind: 'sesion_sin_registro' | 'cuestionario_pendiente' | 'paciente_abierto'
    | 'alumno_sin_plan' | 'evaluacion_incompleta' | 'pase_sin_informe'
  patientId: string
  patientName: string
  dias: number | null
}

const KIND_LABELS: Record<PendienteItem['kind'], { singular: string; plural: string }> = {
  sesion_sin_registro:    { singular: 'sesión sin registro completo',        plural: 'sesiones sin registro completo' },
  cuestionario_pendiente: { singular: 'paciente nuevo sin cuestionario',     plural: 'pacientes nuevos sin cuestionario' },
  paciente_abierto:       { singular: 'paciente abierto hace tiempo',        plural: 'pacientes abiertos hace tiempo' },
  alumno_sin_plan:        { singular: 'alumno sin plan cargado',             plural: 'alumnos sin plan cargado' },
  evaluacion_incompleta:  { singular: 'evaluación de ingreso incompleta',    plural: 'evaluaciones de ingreso incompletas' },
  pase_sin_informe:       { singular: 'pase sin informe',                   plural: 'pases sin informe' },
}

// Deliberadamente SIN "descartar": son huecos de cumplimiento, no
// recordatorios para planificar — si se pudieran posponer, el profesional
// podría esconderlos sin corregirlos, que es justo lo que esto quiere evitar.
// Desaparecen solos cuando se corrige el dato real (próxima carga de página).
export default function PendientesCumplimientoBanner({ items }: { items: PendienteItem[] }) {
  if (items.length === 0) return null

  const groups = new Map<PendienteItem['kind'], PendienteItem[]>()
  for (const item of items) {
    const arr = groups.get(item.kind) ?? []
    arr.push(item)
    groups.set(item.kind, arr)
  }

  return (
    <div className="bg-amber-50 border-[0.5px] border-amber-300 rounded-xl p-5 mb-8">
      <p className="text-[14px] font-medium text-amber-900 mb-3">
        Tus pendientes de estándares de calidad
      </p>
      <div className="space-y-3">
        {Array.from(groups.entries()).map(([kind, group]) => {
          const label = group.length === 1 ? KIND_LABELS[kind].singular : KIND_LABELS[kind].plural
          return (
            <div key={kind}>
              <p className="text-[12px] text-amber-700 mb-1.5">{group.length} {label}</p>
              <div className="flex flex-wrap gap-2">
                {group.map((item, i) => (
                  <Link
                    key={`${item.patientId}-${i}`}
                    href={`/dashboard/pacientes/${item.patientId}?from=dashboard`}
                    className="flex items-center gap-1.5 bg-amber-100 border-[0.5px] border-amber-300 rounded-lg px-3 py-1.5 text-[13px] font-medium text-amber-900 no-underline hover:underline"
                  >
                    {item.patientName}
                    {item.dias != null && <span className="text-amber-600 font-normal">hace {item.dias} día{item.dias === 1 ? '' : 's'}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
