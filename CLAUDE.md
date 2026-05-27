# Instrucciones para Claude Code

## Flujo de trabajo

### Cambios que van directo a `main`
Después de completar, hacer commit y push a `main` sin pedir confirmación. Vercel deploya automáticamente.

- Correcciones de UI (estilos, textos, layouts)
- Bugfixes menores sin impacto en datos
- Cambios de configuración de bajo riesgo

### Cambios que van a una rama
Crear una rama, hacer commit/push, y **esperar confirmación de Kevin** antes de mergear a `main`. Vercel genera una URL de preview automáticamente para probar.

Usar rama obligatoriamente en:
- Cambios en base de datos (migraciones, esquemas, RLS)
- Cambios en autenticación o middleware
- Cambios en pagos o webhooks (Mercado Pago)
- Features nuevas significativas (formularios, flujos, módulos)
- Cualquier cambio que afecte datos de pacientes

Nombre de ramas: `feature/descripcion-corta` o `fix/descripcion-corta`

### Siempre
- Mensajes de commit descriptivos en español
- Agregar `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` al final de cada commit
- No crear PRs salvo que Kevin lo pida explícitamente

## Contexto del proyecto

Reason es una plataforma clínica para kinesiólogos construida con Next.js App Router, Supabase y Tailwind CSS.
Stack: TypeScript, Next.js 14, Supabase (auth + DB + realtime), Tailwind, Vercel.
