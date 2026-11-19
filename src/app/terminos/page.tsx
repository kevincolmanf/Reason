import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y condiciones — Reason',
  description: 'Condiciones de uso de Reason para profesionales de la salud.',
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans">
      <main className="flex-grow w-full max-w-[800px] mx-auto px-8 py-24">
        {/* BORRADOR — no está linkeado desde ningún lado del sitio todavía a
            propósito. Razón social, jurisdicción, reembolsos y fecha ya están
            completos (19/11, con los datos que dio Kevin). Falta solo que un
            abogado revise "Limitación de responsabilidad" antes de conectarlo
            al link "Términos" del footer de la landing, que hoy apunta a "#".
            No borrar este aviso hasta esa revisión. */}
        <div className="bg-accent/10 border-[0.5px] border-accent/40 rounded-xl px-5 py-4 mb-12 text-[13px] text-text-secondary">
          <strong className="text-text-primary font-medium">Borrador interno —</strong> todavía no fue revisado por un abogado ni está publicado. No compartir como versión final.
        </div>

        <h1 className="text-[32px] md:text-[40px] font-medium tracking-[-0.02em] leading-[1.2] mb-4">
          Términos y condiciones de uso.
        </h1>
        <p className="text-[20px] text-text-secondary leading-[1.5] mb-16">
          Las condiciones bajo las que ponemos Reason a tu disposición. Para cómo tratamos los datos de tus pacientes específicamente, ver{' '}
          <Link href="/sobre-tus-datos" className="text-accent no-underline hover:opacity-80">
            Sobre tus datos
          </Link>
          .
        </p>

        <div className="text-[16px] leading-[1.7] text-text-secondary space-y-6">
          <p>
            Última actualización: 19 de noviembre de 2026. Al crear una cuenta o usar Reason aceptás estos términos. Si no estás de acuerdo, no uses la plataforma.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Qué es Reason</h3>
          <p>
            Reason es un software de gestión clínica para kinesiólogos y profesionales de la salud: ficha digital, planes de ejercicio, monitoreo de carga, protocolos de retorno al deporte, agenda y herramientas de equipo. Es una herramienta de apoyo al trabajo profesional — no reemplaza tu criterio clínico ni constituye asesoramiento médico por sí misma.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Quién puede usarlo</h3>
          <ul className="list-none pl-0 space-y-3 mb-6">
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Reason está pensado para profesionales matriculados en kinesiología, fisioterapia y disciplinas afines. Al registrarte, declarás que ejercés la profesión de forma habilitada.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Tenés que ser mayor de edad para crear una cuenta.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">La cuenta es personal e intransferible. Si trabajás en equipo, cada profesional accede con su propio usuario — no se comparten credenciales.</li>
          </ul>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Tu cuenta y tu responsabilidad</h3>
          <ul className="list-none pl-0 space-y-3 mb-6">
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Sos responsable de mantener segura tu contraseña y de toda la actividad que ocurra desde tu cuenta.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Sos responsable de la exactitud de la información que cargás, de tener base legal para cargarla (incluido el consentimiento de tus pacientes cuando corresponda) y de cumplir la normativa de tu profesión y de protección de datos (Leyes 25.326 y 26.529). El detalle de este punto está en{' '}
              <Link href="/sobre-tus-datos" className="text-accent no-underline hover:opacity-80">Sobre tus datos</Link>.
            </li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">No uses Reason para cargar información de personas sin la base legal correspondiente, ni para fines ajenos a tu práctica clínica.</li>
          </ul>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Uso aceptable</h3>
          <p className="mb-3">No está permitido:</p>
          <ul className="list-none pl-0 space-y-3 mb-6">
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Intentar vulnerar la seguridad de la plataforma o acceder a datos que no te pertenecen.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Usar Reason para fines ilegales, fraudulentos o que violen derechos de terceros.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Revender, sublicenciar o dar acceso a Reason a terceros no autorizados.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Sobrecargar deliberadamente la infraestructura (scraping masivo, automatización fuera de lo previsto, etc.).</li>
          </ul>
          <p>Podemos suspender o cancelar cuentas que incumplan esto, avisando cuando sea razonablemente posible.</p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Planes, precios y facturación</h3>
          <ul className="list-none pl-0 space-y-3 mb-6">
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Los planes y precios vigentes están en <Link href="/paywall" className="text-accent no-underline hover:opacity-80">reason.com.ar/paywall</Link>. Podemos modificar precios a futuro; los cambios no aplican retroactivamente a un período ya pagado y se avisan con anticipación razonable.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Los pagos se procesan a través de Mercado Pago. Reason no almacena los datos de tu tarjeta.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Las suscripciones se renuevan automáticamente salvo que canceles. Podés cancelar en cualquier momento desde tu cuenta — sin permanencia.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">No ofrecemos reembolsos. Podés cancelar en cualquier momento para evitar el próximo cobro, pero los pagos ya realizados no se reembolsan.</li>
          </ul>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Datos de tus pacientes</h3>
          <p>
            Cómo tratamos la información clínica que cargás, quién es responsable de qué, y tus obligaciones como profesional están detallados en{' '}
            <Link href="/sobre-tus-datos" className="text-accent no-underline hover:opacity-80">Sobre tus datos</Link>, que forma parte de estos términos.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Propiedad intelectual</h3>
          <ul className="list-none pl-0 space-y-3 mb-6">
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Reason (el software, la marca, la biblioteca de ejercicios en video y el contenido clínico de referencia) es propiedad de Kevin Colman (CUIT 20-38177041-0). Te damos una licencia de uso personal, no exclusiva e intransferible mientras tengas una cuenta activa.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">La información que vos cargás sobre tus pacientes (fichas, planes, notas) es tuya. No la usamos para ningún fin propio fuera de prestarte el servicio.</li>
          </ul>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Disponibilidad del servicio</h3>
          <p>
            Hacemos un esfuerzo razonable para mantener Reason disponible, pero no garantizamos un funcionamiento ininterrumpido o libre de errores. Puede haber ventanas de mantenimiento o interrupciones no planificadas. Te recomendamos exportar a PDF la información crítica como respaldo propio.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Limitación de responsabilidad</h3>
          <p>
            Reason es una herramienta de apoyo a tu trabajo profesional. Las decisiones clínicas, diagnósticas y de tratamiento son siempre tuyas, bajo tu criterio y tu responsabilidad profesional — Reason no responde por esas decisiones. [Esta sección conviene que la termine de redactar un abogado: alcance de la limitación de responsabilidad, topes, exclusiones.]
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Cancelación</h3>
          <ul className="list-none pl-0 space-y-3 mb-6">
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Podés cancelar tu cuenta cuando quieras desde la plataforma.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Podemos suspender o cerrar una cuenta por incumplimiento de estos términos, avisando cuando sea razonablemente posible.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Al cancelar, tus datos siguen bajo tu control según lo descripto en <Link href="/sobre-tus-datos" className="text-accent no-underline hover:opacity-80">Sobre tus datos</Link> — podés exportarlos o pedir que se borren de forma permanente.</li>
          </ul>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Cambios a estos términos</h3>
          <p>
            Podemos actualizar estos términos a futuro. Si el cambio es significativo, te lo vamos a avisar antes de que entre en vigencia.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Ley aplicable</h3>
          <p>
            Estos términos se rigen por las leyes de la República Argentina. Ante cualquier conflicto derivado de estos términos o del uso de Reason, las partes se someten a la jurisdicción de los tribunales ordinarios de la ciudad de La Plata, provincia de Buenos Aires, con renuncia expresa a cualquier otro fuero o jurisdicción que pudiera corresponder.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Contacto</h3>
          <p>
            Dudas sobre estos términos:{' '}
            <a href="mailto:reasoncontacto@gmail.com" className="text-accent no-underline hover:opacity-80">reasoncontacto@gmail.com</a>.
          </p>
        </div>
      </main>

      <footer className="py-12 border-t-[0.5px] border-border mt-auto">
        <div className="w-full max-w-[800px] mx-auto px-8">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-[18px] font-medium tracking-[-0.01em] no-underline text-text-primary">
              reason<span className="text-accent">.</span>
            </Link>
            <div className="flex gap-6">
              <Link href="/sobre-tus-datos" className="text-text-secondary text-[13px] hover:text-text-primary transition-colors no-underline">
                Privacidad
              </Link>
              <Link href="/account" className="text-text-secondary text-[13px] hover:text-text-primary transition-colors no-underline">
                Mi cuenta
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
