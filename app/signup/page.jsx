'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'

export default function Signup() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  const handleSignup = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    })
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  if (success) return (
    <div style={styles.page}>
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: '1rem' }}>✉️</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 10 }}>Vérifiez votre email</h2>
        <p style={{ fontSize: 14, color: '#6B5E45', lineHeight: 1.6 }}>
          Un lien de confirmation a été envoyé à <strong>{email}</strong>.<br />
          Cliquez dessus pour activer votre compte.
        </p>
        <Link href="/login" style={{ display: 'block', marginTop: '1.5rem', color: '#B5792A', fontWeight: 500, fontSize: 14 }}>
          Retour à la connexion →
        </Link>
      </div>
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>Devis<em style={{ color: '#E8D5A8', fontStyle: 'normal' }}>IA</em></div>
        <h1 style={styles.title}>Créer un compte</h1>
        <p style={styles.sub}>Gratuit pour démarrer, sans carte bancaire</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSignup}>
          <div style={styles.field}>
            <label style={styles.label}>Votre nom</label>
            <input style={styles.input} type="text" value={name}
              onChange={e => setName(e.target.value)} placeholder="Sophie Martin" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.fr" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <input style={styles.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="6 caractères minimum" required />
          </div>
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Création…' : 'Créer mon espace →'}
          </button>
        </form>

        <p style={styles.footer}>
          Déjà un compte ?{' '}
          <Link href="/login" style={{ color: '#B5792A', fontWeight: 500 }}>Se connecter</Link>
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
