import { supabase } from './supabase'

export async function testSupabase() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')

  if (error) {
    console.error('Supabase connection failed:', error)
    return
  }

  console.log('Supabase connected successfully!')
  console.log('Jobs:', data)
}