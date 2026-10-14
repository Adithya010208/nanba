import { createClient } from '@supabase/supabase-js'
import type {Database} from '../types/database'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && key ? createClient<Database>(url, key) : null
export function client() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase }
export function check(error: { message: string } | null) { if (error) throw new Error(error.message) }
