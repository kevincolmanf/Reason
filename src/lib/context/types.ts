export const COOKIE_NAME = 'reason_ctx'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 días

export type ContextType = 'personal' | 'org'

export type ActiveContext = {
  type: ContextType
  orgId: string | null
}
