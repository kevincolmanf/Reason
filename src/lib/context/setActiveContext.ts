import { cookies } from 'next/headers'
import { COOKIE_NAME, COOKIE_MAX_AGE } from './types'
import type { ActiveContext } from './types'

// Solo llamar desde Server Actions o Route Handlers — no desde server components
export function setActiveContext(ctx: ActiveContext): void {
  cookies().set(COOKIE_NAME, JSON.stringify(ctx), {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false, // legible desde cliente para el switch button
  })
}

export function clearActiveContext(): void {
  cookies().delete(COOKIE_NAME)
}
