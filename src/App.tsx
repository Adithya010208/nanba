import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { LoginPage } from './pages/LoginPage'
import { Workspace } from './pages/Workspace'
import { Brand } from './components/Brand'
import { supabase } from './lib/supabase'
import type { Preferences } from './types/chat'

export interface Profile { id: string; username: string; display_name: string; avatar_path: string | null; status_text: string; last_seen: string | null; preferences?: Preferences }

export function App() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'design'
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    const client = supabase
    let alive = true
    let generation = 0
    async function restore(next: Session | null) {
      const current = ++generation
      if (!next) { if (alive) { setSession(null); setProfile(null); setLoading(false) }; return }
      const { data, error } = await client.from('profiles').select('id,username,display_name,avatar_path,status_text,last_seen,preferences').eq('id', next.user.id).maybeSingle()
      if (!alive || current !== generation) return
      if (error || !data) {
        setSession(null); setProfile(null); setNotice(error ? 'This space has not been provisioned yet. The owner needs to finish the private account setup.' : 'This account is not approved for Nanba Chat.'); setLoading(false)
        await client.auth.signOut({ scope: 'local' })
        return
      }
      setSession(next); setProfile(data as Profile); setLoading(false)
    }
    void client.auth.getSession().then(({ data, error }) => { if (error && alive) { setNotice('We couldn’t restore your session. Please sign in again.'); setLoading(false) } else { void restore(data.session) } })
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => { window.setTimeout(() => { void restore(next) }, 0) })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])
  async function login(username: string, password: string) {
    if (!supabase) throw new Error('The owner needs to configure this private space before you can sign in.')
    const normalized = username.trim().toLowerCase()
    if (!/^[a-z0-9_.-]{2,50}$/.test(normalized)) throw new Error('Use 2–50 letters, numbers, dots, underscores or hyphens.')
    const { error } = await supabase.auth.signInWithPassword({ email: `${normalized}@nanba.internal`, password })
    if (error) throw new Error(error.message.includes('fetch') ? 'Unable to reach your space. Check your connection and try again.' : 'That username or password doesn’t match. Please try again.')
    navigate('/chat')
  }
  if (loading && !preview) return <main className="initializing"><Brand /><span className="loading-bar" /><p>Opening your space…</p></main>
  const approved = Boolean(session && profile)
  return <Routes><Route path="/login" element={approved ? <Navigate to="/chat" replace /> : <LoginPage onLogin={login} notice={notice} />} /><Route path="/chat" element={approved || preview ? <Workspace profile={profile} preview={preview} onLogout={async () => { if (supabase) { const { error } = await supabase.auth.signOut(); if (error) throw error }; navigate('/login') }} /> : <Navigate to="/login" replace />} /><Route path="*" element={<Navigate to={approved || preview ? '/chat' : '/login'} replace />} /></Routes>
}
