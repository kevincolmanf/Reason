import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContentCard from '@/components/ContentCard'
import Header from '@/components/Header'

function CategoryCard({ title, slug, desc }: { title: string, slug: string, desc: string }) {
  return (
    <Link href={`/library?category=${slug}`} className="block no-underline">
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8 hover:bg-[#F0F0F0] transition-colors h-full flex flex-col justify-center text-center">
        <h3 className="text-[18px] font-medium mb-2">{title}</h3>
        <p className="text-[13px] text-text-secondary">{desc}</p>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: latestContents }, { data: recentPatients }] = await Promise.all([
    supabase
      .from('content')
      .select('id, title, subtitle, slug, category, tiempo_lectura_min, body_que_saber')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('patients')
      .select('id, name, age, occupation')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* HEADER */}
      <Header />

      {/* MAIN CONTENT */}
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">
            Hola, {user.user_metadata?.full_name || 'Suscriptor'}
          </h1>
          <p className="text-text-secondary text-[16px]">
            ¿Con qué paciente trabajás hoy?
          </p>
        </div>

        {/* MIS PACIENTES */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-[20px] font-medium">Mis pacientes</h2>
            <Link href="/dashboard/pacientes" className="text-[13px] text-accent hover:underline">
              Ver todos →
            </Link>
          </div>

          {recentPatients && recentPatients.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href="/dashboard/pacientes?new=1" className="block no-underline">
                <div className="bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl px-4 py-5 hover:border-accent hover:bg-bg-primary transition-colors h-full flex flex-col items-center justify-center gap-1.5 text-center min-h-[88px]">
                  <span className="text-[22px] leading-none text-text-secondary">+</span>
                  <span className="text-[12px] text-text-secondary">Nuevo paciente</span>
                </div>
              </Link>
              {recentPatients.map(p => (
                <Link key={p.id} href={`/dashboard/pacientes/${p.id}`} className="block no-underline">
                  <div className="bg-bg-primary border-[0.5px] border-border rounded-xl px-4 py-5 hover:bg-bg-secondary transition-colors h-full">
                    <div className="text-[15px] font-medium mb-1 truncate">{p.name}</div>
                    <div className="text-[12px] text-text-secondary truncate">
                      {[p.age ? `${p.age} años` : null, p.occupation].filter(Boolean).join(' · ') || 'Sin datos'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-bg-secondary rounded-xl p-12 text-center border-[0.5px] border-dashed border-border">
              <p className="text-[16px] font-medium mb-2">Todavía no tenés pacientes</p>
              <p className="text-[13px] text-text-secondary mb-5">Creá tu primer paciente para empezar a trabajar clínicamente con Reason.</p>
              <Link href="/dashboard/pacientes?new=1" className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 inline-block no-underline">
                + Crear primer paciente
              </Link>
            </div>
          )}
        </section>

        {/* ÚLTIMOS CONTENIDOS */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-[20px] font-medium">Últimos contenidos</h2>
            <Link href="/library" className="text-[13px] text-accent hover:underline">
              Ver todos →
            </Link>
          </div>

          {latestContents && latestContents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestContents.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="bg-bg-secondary rounded-xl p-12 text-center border-[0.5px] border-border">
              <p className="text-text-secondary">Todavía no hay contenidos publicados.</p>
            </div>
          )}
        </section>

        {/* POR CATEGORÍA */}
        <section className="mb-16">
          <h2 className="text-[20px] font-medium mb-6">Explorar por categoría</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <CategoryCard
              title="Resúmenes Comentados"
              slug="resumen_comentado"
              desc="La literatura actual destilada"
            />
            <CategoryCard
              title="Aplicaciones Clínicas"
              slug="aplicacion_clinica"
              desc="De la teoría a la práctica"
            />
            <CategoryCard
              title="Protocolos"
              slug="protocolo"
              desc="Pasos claros para actuar"
            />
            <CategoryCard
              title="Casos Reales"
              slug="caso_real"
              desc="Experiencia de consultorio"
            />
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-8 border-t-[0.5px] border-border mt-auto">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center text-[12px] text-text-tertiary">
          <span>© {new Date().getFullYear()} Reason. Todos los derechos reservados.</span>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-text-primary transition-colors">Términos</Link>
            <Link href="#" className="hover:text-text-primary transition-colors">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
