import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sobre tus datos — Reason',
  description: 'Por qué Reason no almacena datos de tus pacientes.',
};

export default function SobreTusDatosPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans">
      <main className="flex-grow w-full max-w-[800px] mx-auto px-8 py-24">
        <h1 className="text-[32px] md:text-[40px] font-medium tracking-[-0.02em] leading-[1.2] mb-4">
          Reason no es tu historia clínica. Y eso es a propósito.
        </h1>
        <p className="text-[20px] text-text-secondary leading-[1.5] mb-16">
          Por qué decidimos no almacenar datos de tus pacientes, y qué significa eso para tu práctica.
        </p>

        <div className="text-[16px] leading-[1.7] text-text-secondary space-y-6">
          <p>
            Vos sabés mejor que nadie que los datos de tus pacientes no son cualquier dato. Son sensibles, son privados, y manejarlos requiere infraestructura, responsabilidad legal y compromiso permanente. Hay productos que se dedican exclusivamente a eso, y lo hacen bien.
          </p>
          <p>
            Reason es otra cosa. Es donde venís a pensar mejor un caso. Las herramientas que te ofrecemos te dan resultados clínicos profesionales que podés aplicar a tu práctica. Pero los datos del paciente, en sí mismos, no entran a Reason.
          </p>
          
          <p className="font-medium text-text-primary mt-12 mb-4">
            ¿Por qué?
          </p>
          
          <p className="font-medium text-text-primary mb-8">
            Tres razones.
          </p>

          <div className="space-y-8 mb-16">
            <div>
              <p>
                <strong className="text-text-primary font-medium">Primero</strong>, las leyes argentinas 26.529 (derechos del paciente) y 25.326 (protección de datos personales) imponen requisitos exigentes a cualquier sistema que almacene datos médicos identificables. Cumplirlos no es opcional, y cumplirlos a medias es peor que no cumplirlos. Encriptación, auditoría, backups, trazabilidad, política de retención, derecho de acceso y rectificación del paciente. Todo eso lo hace bien una historia clínica electrónica dedicada. Hacerlo a medias en un producto que tiene otra misión termina exponiendo a todos: al kinesiólogo, al paciente y al producto mismo.
              </p>
            </div>
            
            <div className="border-t-[0.5px] border-border pt-8">
              <p>
                <strong className="text-text-primary font-medium">Segundo</strong>, queremos que Reason haga muy bien una sola cosa: ayudarte a pensar mejor. No queremos diluir esa misión gestionando pacientes, agendas, recordatorios, facturación. Para eso hay herramientas mejores que nosotros. Iclinic, Doctoralia, fisicoach, una buena planilla, hasta papel. Lo que vos elijas. Reason no compite con eso; lo respeta.
              </p>
            </div>

            <div className="border-t-[0.5px] border-border pt-8">
              <p>
                <strong className="text-text-primary font-medium">Tercero</strong>, esta separación protege a tus pacientes y a vos. Lo que pase con los datos médicos de tus pacientes pasa en tu sistema, bajo tu responsabilidad y tu encriptación. Reason no es un eslabón más que pueda fallar.
              </p>
            </div>
          </div>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">¿Qué sí hacemos?</h3>
          <p>
            Cuando aplicás una herramienta de Reason, te entregamos el resultado en formato profesional listo para que vos lo lleves a tu sistema. Un PDF, un texto copiable, un link compartible. La calidad del razonamiento es nuestra; la gestión del paciente, tuya.
          </p>
          <p className="mt-6 mb-4">
            Cuando descargás un resultado de Reason:
          </p>
          <ul className="list-none pl-0 space-y-3 mb-12">
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">El PDF lleva la fecha y los datos clínicos del resultado, pero sin nombre ni identificación del paciente</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Vos sumás esos datos manualmente al sistema donde sí gestionás a tus pacientes</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Reason no guarda copia del resultado en sus servidores</li>
            <li className="relative pl-6 before:content-['·'] before:absolute before:left-0 before:text-text-secondary">Tampoco recordamos qué paciente lo aplicó, porque no lo sabemos</li>
          </ul>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">¿Qué no podés hacer en Reason?</h3>
          <p>
            No podés tener un listado de tus pacientes. No podés ver evolución longitudinal de un paciente específico dentro de Reason. No podés cargar la historia clínica completa.
          </p>
          <p className="mt-6 mb-12">
            Eso es por diseño. Si lo necesitás, lo hacés en tu HCE habitual. Reason te da el insumo profesional; vos lo organizás en tu sistema.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Una nota sobre el futuro.</h3>
          <p className="mb-12">
            Si en algún momento Reason expande funcionalidades que requieran almacenar datos del paciente, lo vamos a hacer cumpliendo todos los requisitos legales y técnicos correspondientes. Y va a ser una decisión transparente, comunicada y opcional. Hoy, a propósito, no lo hacemos.
          </p>

          <h3 className="text-[20px] font-medium text-text-primary tracking-[-0.01em] mt-16 mb-4">Tu responsabilidad como profesional.</h3>
          <p>
            Cada vez que descargás o exportás un resultado de Reason, ese resultado contiene información clínica que vos generaste como profesional. Su almacenamiento, asociación a tu historia clínica del paciente, retención y eventual eliminación quedan bajo tu responsabilidad profesional, conforme la normativa argentina vigente.
          </p>
          <p className="mt-6">
            Reason te entrega la herramienta y el resultado. La gestión de los datos es tuya, como profesional matriculado.
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
