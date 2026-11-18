import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { user_id: string; role: 'grader' | 'admin'; display_name: string | null; created_at: string; updated_at: string }
        Insert: { user_id: string; role?: 'grader' | 'admin'; display_name?: string | null }
        Update: { role?: 'grader' | 'admin'; display_name?: string | null; updated_at?: string }
        Relationships: []
      }
      grading_records: {
        Row: {
          id: string; user_id: string; source: 'kiosk' | 'mobile'; station_id: string | null; session_id: string
          grader_name: string; sample_type: 'sashibo_core' | 'tail_cut'; fish_id: string; weight_kg: number | null
          grade: 'A' | 'B' | 'C' | 'Invalid'; confidence: number | null; result_status: string
          original_grade: 'A' | 'B' | 'C' | null; override_grade: 'A' | 'B' | 'C' | null; override_reason: string | null
          capture_id: string | null; inference_id: string | null; raw_confidence: number | null; scores: Record<string, number> | null
          image_type: 'sashibocore' | 'tailcut' | null; model_source: 'raspberry-pi' | 'demo' | null
          override_actor: string | null; override_at: string | null
          currency_code: string | null; grade_unit_rate_per_kg: number | null; total_fish_price: number | null
          image_path: string | null; gradcam_path: string | null; captured_at: string; created_at: string; updated_at: string
        }
        Insert: {
          id: string; user_id: string; source: 'kiosk' | 'mobile'; station_id?: string | null; session_id: string
          grader_name: string; sample_type: 'sashibo_core' | 'tail_cut'; fish_id: string; weight_kg?: number | null
          grade: 'A' | 'B' | 'C' | 'Invalid'; confidence?: number | null; result_status: string
          original_grade?: 'A' | 'B' | 'C' | null; override_grade?: 'A' | 'B' | 'C' | null; override_reason?: string | null
          capture_id?: string | null; inference_id?: string | null; raw_confidence?: number | null; scores?: Record<string, number> | null
          image_type?: 'sashibocore' | 'tailcut' | null; model_source?: 'raspberry-pi' | 'demo' | null
          override_actor?: string | null; override_at?: string | null
          currency_code?: string | null; grade_unit_rate_per_kg?: number | null; total_fish_price?: number | null
          image_path?: string | null; gradcam_path?: string | null; captured_at: string; updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['grading_records']['Insert']>
        Relationships: []
      }
      price_schedules: {
        Row: { user_id: string; station_id: string; grade: 'A' | 'B' | 'C'; currency_code: string; price_per_kg: number; updated_at: string }
        Insert: { user_id: string; station_id: string; grade: 'A' | 'B' | 'C'; currency_code?: string; price_per_kg: number; updated_at?: string }
        Update: Partial<Database['public']['Tables']['price_schedules']['Insert']>
        Relationships: []
      }
      station_graders: {
        Row: { id: string; user_id: string; station_id: string; grader_name: string; active: boolean; last_seen_at: string; created_at: string }
        Insert: { id: string; user_id: string; station_id: string; grader_name: string; active?: boolean; last_seen_at?: string }
        Update: Partial<Database['public']['Tables']['station_graders']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: { client_source: 'kiosk' | 'mobile'; tuna_grade: 'A' | 'B' | 'C' | 'Invalid'; sample_type: 'sashibo_core' | 'tail_cut'; app_role: 'grader' | 'admin' }
    CompositeTypes: Record<string, never>
  }
}

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
let client: SupabaseClient<Database> | null = null

export const isSupabaseConfigured = () => Boolean(url && anonKey)

export const CLOUD_CONNECTION_EVENT = 'tunaeye-cloud-connection'
export class CloudUnavailableError extends Error {
  constructor() {
    super(typeof navigator !== 'undefined' && !navigator.onLine
      ? 'Offline — no network connection. Captured images and records are saved on this device and will sync when internet is available.'
      : 'Cloud server could not be reached. If connected to the Tuna RPi Wi-Fi hotspot without internet, your captured images and records are saved on this device and will sync when internet is available. Otherwise check that the Supabase project is active.')
    this.name = 'CloudUnavailableError'
  }
}

export function isCloudNetworkError(error: unknown) {
  return error instanceof CloudUnavailableError || (error instanceof Error && error.name === 'AuthRetryableFetchError') || /failed to fetch|fetch failed|networkerror|network request failed|load failed|err_name_not_resolved|name_not_resolved|dns/i.test(error && typeof error === 'object' && 'message' in error ? String(error.message) : '')
}

export function reportCloudConnection(available: boolean) {
  window.dispatchEvent(new CustomEvent(CLOUD_CONNECTION_EVENT, { detail: available }))
}

let connectionCheck: Promise<boolean> | null = null
export function checkCloudConnection(): Promise<boolean> {
  connectionCheck ??= (async () => {
    let available = false
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const response = await fetch(`${url!.replace(/\/$/, '')}/auth/v1/health`, { headers: { apikey: anonKey! }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
        // Cloud responses keep authentication failures separate from lost connectivity.
        available = navigator.onLine && !response.redirected && response.status >= 200
      } catch { /* Network failure leaves saved records available locally. */ }
    }
    reportCloudConnection(available)
    return available
  })().finally(() => { connectionCheck = null })
  return connectionCheck
}

export async function requireCloudConnection() {
  if (!await checkCloudConnection()) throw new CloudUnavailableError()
}

export function getSupabase(): SupabaseClient<Database> {
  if (!url || !anonKey) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  client ??= createClient<Database>(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  return client
}

export async function ensureSupabaseUser() {
  const supabase = getSupabase()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (isCloudNetworkError(sessionError)) { reportCloudConnection(false); throw new CloudUnavailableError() }
  if (sessionError) throw sessionError
  if (session?.user) return session.user
  const { data, error } = await supabase.auth.signInAnonymously()
  if (isCloudNetworkError(error)) { reportCloudConnection(false); throw new CloudUnavailableError() }
  if (error || !data.user) throw error ?? new Error('Supabase authentication failed.')
  return data.user
}

export async function hasAdminProfile() {
  if (!isSupabaseConfigured()) return false
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return false
  const { data, error } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).maybeSingle()
  if (error) throw error
  return data?.role === 'admin'
}

export async function sendAdminMagicLink(email: string) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured in this deployment.')
  const normalizedEmail = email.trim()
  if (!normalizedEmail) throw new Error('Enter the administrator email address.')
  const { error } = await getSupabase().auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: `${window.location.origin}/admin` },
  })
  if (error) throw error
}
