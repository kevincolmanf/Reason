import { createClient } from './server'

export async function getUser() {
  const supabase = createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function getUserDetails(userId: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user details:', error)
    return null
  }
}
