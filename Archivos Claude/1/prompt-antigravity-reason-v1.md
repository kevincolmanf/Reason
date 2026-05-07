# PROMPT MAESTRO PARA ANTIGRAVITY — REASON v1

> Guía operativa para construir Reason con Antigravity (o cualquier asistente de codificación similar como Lovable, Cursor con Claude, v0). No es un solo prompt: es una secuencia ordenada de instrucciones por sprint.
>
> **Cómo usar este documento:** abrilo junto a Antigravity. Para cada sprint, seguí los pasos en orden. Copiá los prompts indicados literal cuando aparezcan en formato de bloque. Después de cada sprint, validá antes de avanzar al siguiente.
>
> **Documentos de referencia que necesitás tener a mano cuando construyas:**
> - `prompt-maestro-reason-v2-1.md` (para producir contenido)
> - `sistema-visual-reason-v1-1.md` (sistema visual)
> - `copy-landing-reason-v1.md` (copy de la landing)
> - `arquitectura-tecnica-reason-v1.md` (arquitectura técnica)
> - `landing-reason-v1.html` (maqueta como referencia visual)

---

## ANTES DE EMPEZAR

### Cuentas que necesitás tener creadas

Antes de la primera sesión con Antigravity, asegurate de tener:

1. **Cuenta de Antigravity activa** (que ya tenés)
2. **Cuenta de Supabase** — entrá a [supabase.com](https://supabase.com) y creá cuenta gratuita. Creá un nuevo proyecto llamado "reason". Anotá: Project URL y Anon Key (los vas a necesitar).
3. **Cuenta de Vercel** — entrá a [vercel.com](https://vercel.com), creá cuenta gratuita. Vas a conectarla con Antigravity más adelante.
4. **Cuenta de Mercado Pago Developers** — entrá a [mercadopago.com.ar/developers](https://mercadopago.com.ar/developers). Creá una aplicación de prueba. Anotá: Public Key y Access Token.
5. **Cuenta de Resend** — entrá a [resend.com](https://resend.com), creá cuenta gratuita. Es para emails. Por ahora solo creala, los emails los configuramos en Sprint 4.

Tener todo esto listo te ahorra fricción cuando estés construyendo.

### Cómo iniciar cada sesión con Antigravity

**Regla fundamental**: empezá cada sesión nueva con Antigravity pegándole **todo el contexto del proyecto**. Antigravity no recuerda sesiones anteriores con perfección. El contexto es tu seguro contra desviaciones.

Al inicio de cada sesión, pegá este texto:

```
Estoy construyendo REASON, una plataforma web de suscripción para kinesiólogos
y estudiantes avanzados de kinesiología, con foco en patología musculoesquelética.

Filosofía del producto: criterio sobre contenido, decisión sobre información.
Idioma: castellano rioplatense (vos, no tú).

Stack confirmado:
- Next.js 14 con App Router
- Supabase (base de datos, auth, storage)
- Mercado Pago (pagos recurrentes vía preapproval)
- Vercel (deploy)
- Resend (emails transaccionales)

Sistema visual: Geist Sans + Geist Mono como tipografía. Acento terracota
#C25A2C. Paleta blanco/negro/grises minimalista. Inspiración Apple/Notion/Linear.

Te voy a pasar tres documentos completos como contexto. Después te voy a
pedir tareas específicas, una por vez. No avances a la siguiente tarea hasta
que yo confirme. No agregues funcionalidades que no te pedí.
```

Después pegá, en mensajes separados:
1. El contenido completo de `arquitectura-tecnica-reason-v1.md`
2. El contenido completo de `sistema-visual-reason-v1-1.md`
3. El contenido completo de `copy-landing-reason-v1.md`

Esperá que Antigravity confirme que recibió cada uno antes de mandar el siguiente.

---

## SPRINT 1 — FUNDACIONES (semana 1)

**Objetivo del sprint**: tener Next.js corriendo en Vercel, Supabase conectado, landing pública renderizada con copy aprobado, páginas de auth funcionando (sin paywall todavía).

### Tarea 1.1 — Setup inicial del proyecto

Después del contexto, pegá este prompt:

```
Vamos a empezar.

Tarea 1: creá un nuevo proyecto Next.js 14 con App Router, TypeScript y Tailwind CSS.
Configurá lo siguiente:
- Tipografía: Geist Sans y Geist Mono desde Google Fonts, cargadas globalmente
- Variables CSS para los colores del sistema visual (las que están en el documento)
- Layout root con la tipografía aplicada por defecto

No hagas nada más. Cuando esté listo, decime y validamos antes de avanzar.
```

**Qué validar antes de avanzar:**
- El proyecto debe compilar sin errores
- La tipografía debe verse Geist (no Times New Roman ni Arial)
- Las variables de color deben estar declaradas

### Tarea 1.2 — Conexión con Supabase

```
Tarea 2: integrá Supabase al proyecto. Voy a darte mis credenciales.

[acá pegás tu Project URL y Anon Key de Supabase]

Configurá:
- Cliente de Supabase para uso en server components
- Cliente de Supabase para uso en client components
- Variables de entorno apropiadas
- Helper para obtener el usuario actual

Después, creá las tablas de la base de datos según el documento de arquitectura
técnica. Específicamente: users (extendida), subscriptions, content,
caso_real_extension. Incluí también las políticas RLS básicas que dejé
indicadas en la sección 6 del documento de arquitectura.

No hagas nada más. Cuando esté listo, decime.
```

**Qué validar antes de avanzar:**
- En el dashboard de Supabase, las 4 tablas deben existir con los campos correctos
- Las políticas RLS deben estar activas en cada tabla
- Probá manualmente: insertar un registro de prueba en `content` y verificar que se guarda

### Tarea 1.3 — Landing pública

```
Tarea 3: implementá la landing pública en la ruta `/`.

Usá EXACTAMENTE el copy y la estructura del archivo landing-reason-v1.html
que te pasé. La maqueta tiene todo el diseño. Tu trabajo es replicarlo en
React/Next.js, no inventar.

Importante:
- El árbol de decisión SVG debe estar embebido tal cual está en la maqueta
- Los CTAs todavía no llevan a ningún lado funcional. Por ahora, "Suscribirse"
  redirige a /signup, "Ver cómo funciona" hace scroll a la sección 3.
- Hacé la página responsive: en mobile las secciones de 2 y 3 columnas se
  apilan en una columna.

No hagas más nada. Cuando esté listo, decime.
```

**Qué validar antes de avanzar:**
- La landing se ve idéntica a la maqueta en desktop
- En mobile, no se rompe (puede no estar perfecta, pero no debe romperse)
- Los CTAs hacen lo indicado
- La fuente Geist se ve aplicada

### Tarea 1.4 — Páginas de autenticación

```
Tarea 4: creá las páginas de autenticación: /signup, /login, /forgot-password.

Diseño: respetá el sistema visual de Reason. Formularios minimalistas, fondo
blanco, máximo de simplicidad. Inputs con borde 0.5px, padding generoso, sin
sombras, radio 8px. Botón primario terracota.

Funcionalidad:
- /signup: email + password + nombre. Crea usuario en Supabase Auth.
  Después de crear, redirige a /dashboard.
- /login: email + password. Después de login exitoso, redirige a /dashboard.
- /forgot-password: email. Envía email de recuperación vía Supabase Auth.

Implementá también:
- Middleware de Next.js que redirige a /login si una ruta protegida es
  accedida sin sesión
- Las rutas protegidas por ahora son: /dashboard, /library, /content/*, /account

No implementes el paywall todavía. Por ahora cualquier usuario logueado
accede a /dashboard. El paywall lo implementamos después.
```

**Qué validar antes de avanzar:**
- Podés crear cuenta nueva
- Podés iniciar sesión con esa cuenta
- Si entrás a /dashboard sin sesión, te redirige a /login
- En el panel de Supabase Auth, los usuarios aparecen creados

### Cierre del Sprint 1

Antes de avanzar al Sprint 2:
- [ ] Landing pública funciona y se ve bien
- [ ] Auth funciona: signup, login, forgot password
- [ ] Base de datos tiene las tablas creadas con RLS
- [ ] Deploy en Vercel exitoso
- [ ] El proyecto está en un repositorio Git (Antigravity te lo ayuda a hacer)

---

## SPRINT 2 — CMS Y CONTENIDOS (semana 2)

**Objetivo**: tener un CMS funcional donde Kevin puede cargar contenidos, y la vista individual de cada contenido renderizándose.

### Tarea 2.1 — Marcarse como admin

Antes de construir el CMS, vos necesitás ser admin. Pegale a Antigravity:

```
Tarea 5: configurá mi usuario actual como admin.

En la tabla users, mi usuario (el que registré con email [TU EMAIL])
debe tener role = 'admin'. Hacelo manualmente desde el panel de Supabase
o creá un script de migración. Como prefieras.

Después implementá un middleware que verifique que solo usuarios con role admin
acceden a las rutas /admin/*.
```

### Tarea 2.2 — Panel de admin y formulario de creación

```
Tarea 6: implementá las páginas de admin.

/admin debe ser un dashboard con:
- Lista de contenidos publicados (link a /admin/content)
- Botón "Nuevo contenido" (link a /admin/content/new)

/admin/content debe ser una tabla con todos los contenidos:
- Filtros: publicados / borradores / por categoría
- Buscador por título
- Acciones por fila: Editar, Despublicar, Duplicar, Eliminar

/admin/content/new debe ser el formulario de creación, siguiendo EXACTAMENTE
la estructura descrita en la sección 7 del documento de arquitectura técnica.
Crítico:
- Los contadores de palabras por bloque deben funcionar en tiempo real
- No debe permitir publicar si algún bloque excede el límite
- El selector "texto o visualización" en Aplicación práctica debe cambiar
  el campo según la elección
- Para visualizaciones, el campo es un textarea grande donde pego SVG crudo

/admin/content/[id]/edit es lo mismo que new pero pre-cargado con los datos.

Diseño: usá el sistema visual de Reason. El admin no es flashy: es funcional,
limpio, eficiente. Tipografía Geist, paleta del sistema, sin decoración extra.
```

**Qué validar antes de avanzar:**
- Podés crear un contenido completo de cada categoría
- Los contadores de palabras funcionan
- Podés guardar como borrador
- Podés publicar (solo si está completo)

### Tarea 2.3 — Vista individual de contenido

```
Tarea 7: implementá la página /content/[slug].

Debe renderizar el contenido completo según su categoría:
- Si la categoría no es caso real: estructura de 6 bloques estándar
- Si es caso real: estructura de 4 bloques narrativos

El layout debe ser idéntico al que se ve en la sección 4 de la landing
(maqueta landing-reason-v1.html). Misma tipografía, mismos espaciados,
misma jerarquía. La diferencia es que en una página individual no hay
las otras secciones de la landing alrededor.

Diferenciación sutil entre categorías (decisión 2 del documento de arquitectura):
- Cada contenido lleva un chip pequeño arriba con el nombre de la categoría
- Cada categoría tiene un color sutilmente distinto en el chip:
  - Resumen comentado: gris neutro
  - Aplicación clínica: gris ligeramente más oscuro
  - Protocolo: borde terracota fino en el chip
  - Caso real: borde terracota fino + ícono pequeño

Por ahora, esta página es accesible solo si tenés rol subscriber o admin.
Si sos free o no estás logueado, redirigís a /paywall (que todavía no existe,
hacé un placeholder simple por ahora).

Excepción: el contenido con slug "dolor-lumbar-inespecifico" es accesible
para cualquiera (es el preview público).
```

**Qué validar antes de avanzar:**
- El contenido cargado en el CMS se ve bien renderizado en /content/[slug]
- La diferenciación por categoría se ve sutil pero clara
- El chip de categoría aparece arriba
- Los suscriptores acceden, los free son redirigidos al paywall placeholder

### Cierre del Sprint 2

- [ ] Podés cargar contenido vos mismo desde /admin
- [ ] El contenido cargado se ve bien renderizado
- [ ] Cargaste 5-10 contenidos de prueba (los que ya producís con el prompt v2.1)
- [ ] La diferenciación entre categorías funciona

---

## SPRINT 3 — MEMBER ZONE (semana 3)

**Objetivo**: dashboard del suscriptor + biblioteca completa con filtros y buscador.

### Tarea 3.1 — Dashboard

```
Tarea 8: implementá /dashboard.

Es la home del suscriptor. Estructura:
- Header con logo Reason, link a biblioteca, link a cuenta, botón logout
- Sección "Últimos contenidos" con los 6 más recientes (cards horizontales)
- Sección "Por categoría" con 4 cards grandes (una por categoría) que llevan
  a la biblioteca filtrada
- Footer minimalista

Cada card de contenido muestra: chip de categoría, título, subtítulo,
tiempo de lectura, primera línea del bloque "Qué tenés que saber".

Diseño: respeta el sistema visual de Reason. Desktop primero, después
responsive a mobile.
```

### Tarea 3.2 — Biblioteca

```
Tarea 9: implementá /library.

Es la biblioteca completa con todos los contenidos publicados.

Estructura:
- Sidebar izquierda con filtros: Categoría, Región anatómica, Tema clínico, Nivel
- Buscador por título arriba
- Grid de cards de contenido en el área principal
- Paginación o scroll infinito (lo que recomendés)

Los filtros se aplican vía URL params (?category=protocolo, ?region=lumbar, etc.)
para que sean compartibles.

El buscador filtra por coincidencia parcial en el título.

Cada card es la misma que en el dashboard.
```

### Tarea 3.3 — Página de cuenta

```
Tarea 10: implementá /account y /account/subscription.

/account muestra: nombre, email, fecha de registro, link a editar perfil,
link a /account/subscription, botón logout.

/account/subscription muestra:
- Estado de la suscripción (active / pending / cancelled / expired)
- Plan (mensual o anual)
- Próxima fecha de cobro (si está activa)
- Fecha de cancelación (si está cancelada)
- Botón "Cancelar suscripción" (si está activa)
- Botón "Renovar suscripción" (si está expirada)

Por ahora, los botones no llevan a nada. La integración con Mercado Pago
es del Sprint 4.
```

### Cierre del Sprint 3

- [ ] Dashboard renderiza últimos contenidos
- [ ] Biblioteca con filtros funciona
- [ ] Buscador por título funciona
- [ ] Páginas de cuenta y suscripción se ven bien
- [ ] La RLS está garantizando que un free no ve contenido completo

---

## SPRINT 4 — PAGOS (semana 4) — EL MÁS DELICADO

**Objetivo**: integración completa con Mercado Pago para que los pagos funcionen.

### Tarea 4.1 — Configuración de Mercado Pago

```
Tarea 11: configurá la integración con Mercado Pago.

Voy a darte mis credenciales de TEST (no producción todavía):
- Public Key: [TU PUBLIC KEY DE TEST]
- Access Token: [TU ACCESS TOKEN DE TEST]

Configurá:
- SDK de Mercado Pago en el proyecto
- Variables de entorno para las credenciales
- Crear los dos planes en Mercado Pago vía API:
  * Plan Mensual: ARS 18.000, frecuencia mensual
  * Plan Anual: ARS 150.000, frecuencia anual
- Guardar los IDs de los planes en variables de entorno

Importante: estos son planes en MODO TEST. Los planes reales los creamos
al final, cuando hayamos validado todo con tarjetas de prueba.
```

### Tarea 4.2 — Flujo de suscripción

```
Tarea 12: implementá el flujo de suscripción.

Cuando el usuario clickea "Suscribirse" en cualquier CTA:
1. Si no está logueado, redirigir a /signup con returnUrl
2. Si está logueado, ir a /checkout?plan=monthly o ?plan=annual
3. /checkout muestra resumen del plan y botón "Pagar con Mercado Pago"
4. Al clickear, llamar a la API de Mercado Pago para crear preapproval
5. Mercado Pago devuelve URL de pago
6. Redirigir al usuario a esa URL

Después del pago en Mercado Pago, el usuario es redirigido a
/account/subscription?status=success

Pero el cambio de role NO se hace acá. Se hace cuando recibimos el webhook.
```

### Tarea 4.3 — Webhooks (LO MÁS CRÍTICO)

```
Tarea 13: implementá el endpoint de webhooks /api/webhooks/mercadopago.

Este endpoint recibe notificaciones de Mercado Pago para eventos de
suscripción. Documentación oficial:
https://www.mercadopago.com.ar/developers/es/docs/notifications/webhooks

Eventos que tenemos que manejar:
- subscription_authorized: nueva suscripción autorizada → role = subscriber, crear entrada en subscriptions
- subscription_payment: pago exitoso → actualizar expires_at
- subscription_payment_failed: pago fallido → marcar como pending
- subscription_cancelled: cancelación → marcar como cancelled, mantener acceso hasta expires_at

Cada webhook DEBE:
1. Verificar firma de Mercado Pago para autenticidad
2. Buscar el usuario asociado por mp_customer_id
3. Actualizar la entrada en subscriptions correspondiente
4. Actualizar users.role según corresponda
5. Loggear el evento en una tabla webhook_logs (creala) para debugging

Implementá también un job programado que cada 24 horas verifica si hay
suscripciones con expires_at vencido y las marca como expired,
actualizando role a free.
```

### Tarea 4.4 — Cancelación de suscripción

```
Tarea 14: implementá la cancelación.

En /account/subscription, el botón "Cancelar suscripción" debe:
1. Mostrar modal de confirmación: "Vas a cancelar. Mantenés acceso hasta [expires_at]"
2. Si confirma, llamar a la API de Mercado Pago para cancelar el preapproval
3. Esperar que el webhook nos confirme la cancelación
4. Mostrar confirmación al usuario

Importante: NO cortar el acceso inmediatamente. El usuario sigue accediendo
hasta expires_at. La función automática que vence suscripciones se encarga
de quitar el role cuando llega la fecha.
```

### Tarea 4.5 — Testing exhaustivo

```
Tarea 15: testing con tarjetas de prueba de Mercado Pago.

Mercado Pago tiene tarjetas de prueba que simulan distintos escenarios.
Documentación: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/test/cards

Tarjetas que tenemos que probar:
- Pago aprobado: APRO
- Pago rechazado: OTHE
- Pago pendiente: CONT

Escenarios a validar:
1. ✅ Suscripción exitosa: rol cambia a subscriber, accede al catálogo
2. ✅ Suscripción rechazada: rol queda free, no accede
3. ✅ Cancelación voluntaria: rol mantiene acceso hasta expires_at
4. ✅ Falta de pago en renovación: queda en pending, después expira
5. ✅ Re-suscripción después de cancelación: vuelve a ser subscriber

No avances al Sprint 5 hasta que LOS 5 ESCENARIOS estén validados.
```

### Cierre del Sprint 4

- [ ] Pagos en modo test funcionan
- [ ] Los 5 escenarios de testing pasan
- [ ] Webhooks correctamente implementados
- [ ] Cancelación respeta expires_at
- [ ] Logs de webhooks visibles para debugging futuro

---

## SPRINT 5 — POLISH Y SOFT LAUNCH (semana 5-6)

**Objetivo**: pulir todo, cargar los 20 contenidos, testear con beta cerrada, lanzar.

### Tarea 5.1 — Polish

```
Tarea 16: refinamiento general.

Pasá por toda la aplicación y mejorá:
- Estados vacíos (cuando no hay contenidos, sin resultados de búsqueda, etc.)
- Estados de carga (skeletons, spinners donde corresponda)
- Mensajes de error claros y empáticos
- Microinteracciones en botones (hover, active, focus)
- Transiciones suaves entre páginas
- Imágenes con lazy loading
- Meta tags para SEO básico

Para mensajes y errores, escribí en mi voz: vos rioplatense, claro,
sin jerga técnica.
```

### Tarea 5.2 — Cambio a producción de Mercado Pago

```
Tarea 17: migrar Mercado Pago a producción.

1. Crear los planes definitivos en Mercado Pago (no de test)
2. Cambiar las credenciales en variables de entorno por las de producción
3. Verificar que todo sigue funcionando
4. Hacer un pago real con tarjeta propia (de Kevin) para validar end-to-end

Después podés cancelar tu propia suscripción y verificar que el flujo
funcione completo.
```

### Tarea 5.3 — Carga de contenidos finales

Esto NO se hace con Antigravity. Lo hacés vos directamente desde /admin.
Cargá los 20 contenidos completos producidos con el prompt v2.1.

### Tarea 5.4 — Beta cerrada

Antes del lanzamiento público, invitá 5-10 colegas o estudiantes a probar.
Dales acceso gratis con un cupón especial o registrándolos manualmente como
subscriber en la base de datos.

Pediles feedback específico:
- ¿Pudiste registrarte sin problemas?
- ¿La landing te convence de pagar?
- ¿Los contenidos se leen bien en celular?
- ¿Encontrás lo que buscás en la biblioteca?
- ¿Algo te parece confuso?

Recogé feedback durante una semana antes de lanzar público.

### Tarea 5.5 — Lanzamiento

Cuando hayas resuelto el feedback de la beta:
- Anunciá en tus redes (Build, Instagram personal, libro)
- Mensajeá personalmente a los lectores del libro
- Avisá a los estudiantes que pasan por Build cada mañana
- Considerá un descuento de "early bird" para los primeros 50 suscriptores

---

## REGLAS DE ORO PARA TRABAJAR CON ANTIGRAVITY

1. **Una tarea por vez.** No le pidas a Antigravity "construime el dashboard y la biblioteca". Pedile primero el dashboard, validá, después la biblioteca. Esto te ahorra horas de debugging.

2. **Validá visualmente cada tarea.** Antes de pasar a la siguiente, abrí el navegador y verificá que lo que pediste se ve bien. Si Antigravity dice "está listo" pero no probaste, no está listo.

3. **Si algo no anda, no busques a culpables: pasale el error a Antigravity.** Errores son normales. Copiá el mensaje de error completo, pegáselo, y pedile que lo arregle. Funciona el 80% de las veces.

4. **Si Antigravity se desvía de tu pedido, paralo.** Si le pediste "implementá X" y empezó a hacer X+Y+Z, decile "esperá, solo X. Quitá Y y Z". No lo dejes correr.

5. **Cuidado con dependencias innecesarias.** Si Antigravity quiere instalar 15 librerías para una tarea simple, preguntale por qué. A veces Next.js + Tailwind + Supabase nativo alcanza para todo.

6. **Backup constante.** Después de cada sprint exitoso, asegurate de hacer commit a Git. Si algo se rompe en el siguiente sprint, podés volver atrás.

7. **No cambies el stack a mitad de camino.** Si en Sprint 3 te dan ganas de cambiar de Supabase a Firebase, frenate. Terminá el MVP con el stack acordado. Cambiar a mitad es la forma más segura de no terminar nunca.

---

## CUÁNDO VOLVER A CONSULTARME

Volvé a esta conversación o abrí una nueva conmigo cuando:

- **Algo te tranque más de 2 horas en Antigravity**: traeme el error o la confusión, lo resolvemos juntos.
- **Termines un sprint y quieras revisión**: pegame screenshots o el deploy URL y te doy lectura crítica.
- **Aparezca una decisión de producto que no estaba en el plan**: cualquier "esto no lo había pensado pero ahora veo que importa" es para venir acá.
- **Estés listo para Fase 2** (IA conversacional, pipeline de PDFs, comunidad): cuando tengas suscriptores reales, replanteamos.

---

## RECORDATORIOS FINALES

- El stack es Next.js + Supabase + Mercado Pago + Vercel + Resend. No cambies nada salvo que tengas razón muy fuerte.
- El sistema visual está cerrado en v1.1. No improvises tipografía ni colores.
- El copy de la landing está aprobado. Si Antigravity quiere "mejorar el copy", decíle que no.
- La estructura editorial de los contenidos es fija. No la "flexibilices" durante la construcción.

**Reason ya está diseñada. Lo que viene es ejecución.**
