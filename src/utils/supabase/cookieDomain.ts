// Dominio de las cookies de autenticación.
//
// En producción devolvemos `.reason.com.ar` para que la sesión y —sobre todo— el
// code_verifier de OAuth (PKCE) se compartan entre el apex (reason.com.ar) y www.
// Sin esto, si el login con Google se inicia en un dominio y el callback cae en el
// otro (el apex redirige a www), el verifier queda en el dominio de origen, el
// callback no lo encuentra y el ingreso falla.
//
// En cualquier otro host (preview *.vercel.app, localhost) devolvemos undefined:
// la cookie queda host-only, como hasta ahora, así esos entornos no se rompen.
export function authCookieDomain(host: string | null | undefined): string | undefined {
  if (!host) return undefined
  const hostname = host.split(':')[0].toLowerCase()
  return hostname === 'reason.com.ar' || hostname.endsWith('.reason.com.ar')
    ? '.reason.com.ar'
    : undefined
}
