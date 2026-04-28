import { getUser } from '@/utils/supabase/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-bg-secondary p-8">
      <div className="max-w-[1080px] mx-auto bg-bg-primary p-8 rounded-xl border-[0.5px] border-border">
        <h1 className="text-[24px] font-medium tracking-[-0.01em] mb-4">
          Bienvenido al Dashboard
        </h1>
        <p className="text-text-secondary">
          Estás logueado con el email: {user.email}
        </p>
      </div>
    </div>
  )
}
