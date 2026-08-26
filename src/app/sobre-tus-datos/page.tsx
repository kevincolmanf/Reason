import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sobre tus datos — Reason',
  description: 'Cómo Reason resguarda la información clínica de tus pacientes y quién es responsable de qué.',
};

export default function SobreTusDatosPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans">
      <main className="flex-grow w-full max-w-[800px] mx-auto px-8 py-24">
        <h1 className="text-[32px] md:text-[40px] font-medium tracking-[-0.02em] leading-[1.2] mb-4">
          Tus datos de pacientes, seguros y bajo tu control.
        </h1>
        <p className="text-[20px] text-text-secondary leading-[1.5] mb-16">
          Cómo Reason resguarda la información clínica que cargás, y quién es responsable de qué.
        </p>

        <div className="text-[16px] leading-[1.7] text-text-secondary space-y-6">
          <p>
            Los datos de tus pacientes no son cualquier dato: son sensibles, son privados, y manejarlos con seriedad requiere infraestructura y responsabilidad. Reason está construido para que puedas trabajar el historial completo de cada paciente —ficha, planes, monitoreo de carga y evaluaciones— en un solo lugar, con esa información resguardada de forma segura.
          </p>
          <p>
            Para que eso funcione, Reason almacena la información que cargás. Lo importante es cómo la protegemos y quién responde por qué. Acá te lo explicamos sin letra chica.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Quién es responsable de qué</h3>
          <p>
            La normativa argentina de protección de datos (Ley 25.326) distingue dos roles, y en Reason están claramente separados:
          </p>
          <div className="space-y-8 my-8">
            <div>
              <p>
                <strong className="text-text-primary font-medium">Vos, el profesional, sos el responsable de los datos.</strong> Sos quien decide qué información cargar, con qué finalidad clínica y con el consentimiento de tu paciente. La relación clínica, el deber de secreto profesional y el vínculo con el paciente son tuyos. Reason no interviene en esa relación.
              </p>
            </div>
            <div className="border-t-[0.5px] border-border pt-8">
              <p>
                <strong className="text-text-primary font-medium">Reason es el encargado del tratamiento.</strong> Somos el proveedor de infraestructura que almacena y procesa esos datos <em>por tu cuenta y para prestarte el servicio</em>. No usamos la información de tus pacientes para ningún fin propio ajeno a hacer funcionar Reason para vos.
              </p>
            </div>
          </div>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Cómo protegemos tus datos</h3>
          <ul className="list-none pl-0 space-y-3 mb-12">
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">La información se transmite y se almacena de forma <strong className="text-text-primary font-medium">encriptada</strong>, en tránsito y en reposo.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">El acceso está <strong className="text-text-primary font-medium">aislado por profesional y por equipo</strong>: solo vos —y, en el modo equipo, los profesionales que vos habilitás— pueden ver a tus pacientes.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Cuando borrás un paciente o un registro, se elimina de forma permanente de nuestros sistemas.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Podés exportar la información clínica a PDF y revocar en cualquier momento el acceso del portal del paciente.</li>
          </ul>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Qué no hacemos con tus datos</h3>
          <ul className="list-none pl-0 space-y-3 mb-12">
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">No los vendemos ni los cedemos a terceros con fines comerciales.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">No los usamos para publicidad.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">No los usamos para ningún fin ajeno a prestarte el servicio de Reason.</li>
          </ul>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Tus obligaciones como profesional</h3>
          <p>
            Como responsable de los datos, al usar Reason asumís que:
          </p>
          <ul className="list-none pl-0 space-y-3 my-6 mb-12">
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Cargás información únicamente cuando tenés una base legal para hacerlo, incluido el consentimiento de tu paciente cuando corresponda.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Tratás esos datos conforme a las leyes 26.529 (derechos del paciente) y 25.326 (protección de datos personales) y a tu deber de secreto profesional.</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Sos responsable de la exactitud de lo que cargás y del vínculo clínico con tu paciente.</li>
          </ul>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Los derechos de tus pacientes</h3>
          <p className="mb-12">
            Tus pacientes tienen derecho a acceder, rectificar y solicitar la supresión de sus datos. Como responsable, esos pedidos los canalizás vos, y Reason te da las herramientas para atenderlos: exportar, corregir y borrar de forma permanente la información de cualquier paciente.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Una nota sobre el futuro.</h3>
          <p className="mb-12">
            Trabajamos de forma permanente para mejorar la seguridad y el resguardo de la información. Cualquier cambio relevante en cómo tratamos los datos va a ser comunicado de forma transparente.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Tu responsabilidad como profesional.</h3>
          <p>
            La información clínica que cargás en Reason la generás vos como profesional matriculado. Su uso, la relación con tu paciente y el cumplimiento de la normativa vigente quedan bajo tu responsabilidad profesional. Reason te provee la plataforma y el resguardo técnico; la decisión clínica y el vínculo con el paciente son tuyos.
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
              <Link href="/" className="text-text-secondary text-[13px] hover:text-text-primary transition-colors no-underline">
                Landing
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
