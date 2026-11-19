export type PlanType = 'monthly' | 'annual' | 'pro_monthly' | 'pro_annual'

// Pro vale ~3x el plan Individual correspondiente (mensual y anual) — ver
// auditoría de planes del 19/11/2026. Antes el multiplicador anual (8.3x)
// no tenía relación con el mensual (1x); ahora es consistente. Precio
// terminado en 900 (estilo Apple) en vez del redondo 3x exacto.
export const PLAN_CONFIG: Record<PlanType, { reason: string; frequency: number; amount: number }> = {
  monthly:     { reason: 'Suscripción Mensual Reason',     frequency: 1,  amount: 18000   },
  annual:      { reason: 'Suscripción Anual Reason',       frequency: 12, amount: 150000  },
  pro_monthly: { reason: 'Suscripción Pro Mensual Reason', frequency: 1,  amount: 53900   },
  pro_annual:  { reason: 'Suscripción Pro Anual Reason',   frequency: 12, amount: 449900  },
}
