# Instrucciones para Claude Code

## Flujo de trabajo

Después de cada tarea completada, **siempre** hacer commit y push a GitHub (`main`) sin pedir confirmación. Vercel deployea automáticamente desde main.

- Usar mensajes de commit descriptivos en español
- Agregar `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` al final de cada commit
- No crear PRs salvo que Kevin lo pida explícitamente

## Contexto del proyecto

Reason es una plataforma clínica para kinesiólogos construida con Next.js App Router, Supabase y Tailwind CSS.
Stack: TypeScript, Next.js 14, Supabase (auth + DB + realtime), Tailwind, Vercel.
