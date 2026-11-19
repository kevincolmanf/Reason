export type PlanType = 'monthly' | 'annual' | 'pro_monthly' | 'pro_annual'

export const PLAN_CONFIG: Record<PlanType, { reason: string; frequency: number; amount: number }> = {
  monthly:     { reason: 'Suscripción Mensual Reason',     frequency: 1,  amount: 18000    },
  annual:      { reason: 'Suscripción Anual Reason',       frequency: 12, amount: 150000   },
  pro_monthly: { reason: 'Suscripción Pro Mensual Reason', frequency: 1,  amount: 150000   },
  pro_annual:  { reason: 'Suscripción Pro Anual Reason',   frequency: 12, amount: 1350000  },
}
