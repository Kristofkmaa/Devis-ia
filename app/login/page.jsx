'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>Devis<em style={{ color: '#E8D5A8', fontStyle: 'normal' }}>IA</em></div>
        <h1 style={styles.title}>Connexion</h1>
        <p style={styles.sub}>Bon retour 👋</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.fr" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <input style={styles.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter →'}
          </button>
        </form>

        <p style={styles.footer}>
          Pas encore de compte ?{' '}
          <Link href="/signup" style={{ color: '#B5792A', fontWeight: 500 }}>Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#F6F0E4' },
  card: { background: '#FFFDF8', borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 420, border: '1px solid #E2D8C4', boxShadow: '0 4px 32px rgba(28,23,16,0.08)' },
  logo: { fontFamily: "'Playfair Display', serif", fontSize: 24, background: '#1C1710', color: '#fff', display: 'inline-block', padding: '6px 16px', borderRadius: 10, marginBottom: '1.5rem' },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, marginBottom: 6 },
  sub: { fontSize: 14, color: '#6B5E45', marginBottom: '1.75rem' },
  error: { background: '#FFF3F3', border: '1px solid #FFCACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#8B1A1A', marginBottom: '1rem' },
  field: { marginBottom: '1rem' },
  label: { fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: '#6B5E45', display: 'block', marginBottom: 5, textTransform: 'uppercase' },
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E2D8C4', background: '#FBF8F1', fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#1C1710', outline: 'none' },
  btn: { width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#1C1710', color: '#fff', fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' },
  footer: { textAlign: 'center', marginTop: '1.5rem', fontSize: 13, color: '#6B5E45' },
}
