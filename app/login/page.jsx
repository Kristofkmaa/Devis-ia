'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [focused, setFocused]   = useState('')
  const bgRef = useRef(null)
  const router = useRouter()

  // Subtle background drift on mouse move
  useEffect(() => {
    const onMove = (e) => {
      if (!bgRef.current) return
      const x = (e.clientX / window.innerWidth)  * 100
      const y = (e.clientY / window.innerHeight) * 100
      const cx = 35 + (x - 50) * 0.06
      const cy = 40 + (y - 50) * 0.06
      bgRef.current.style.backgroundImage = [
        `radial-gradient(ellipse 140% 120% at ${cx}% ${cy}%, rgba(70,8,120,0.38) 0%, rgba(35,3,70,0.22) 45%, transparent 72%)`,
        `radial-gradient(ellipse 90% 70% at ${98 - x*0.02}% ${90 + y*0.01}%, rgba(28,0,55,0.18) 0%, transparent 62%)`,
      ].join(',')
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #04000C; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff;
          -webkit-box-shadow: 0 0 0 1000px rgba(20,5,40,0.6) inset;
          transition: background-color 5000s ease-in-out 0s;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
        .login-btn:hover { opacity: .88; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(243,130,255,0.45); }
        .login-btn:active { transform: translateY(0); }
        .login-input:focus { border-color: rgba(243,130,255,0.55) !important; background: rgba(20,5,40,0.60) !important; }
      `}</style>

      {/* Fixed background */}
      <div ref={bgRef} style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        backgroundColor:'#04000C',
        backgroundImage:[
          'radial-gradient(ellipse 140% 120% at 38% 42%, rgba(70,8,120,0.38) 0%, rgba(35,3,70,0.22) 45%, transparent 72%)',
          'radial-gradient(ellipse 90% 70% at 98% 90%, rgba(28,0,55,0.18) 0%, transparent 62%)',
        ].join(','),
      }}/>

      {/* Page */}
      <div style={{
        position:'relative', zIndex:1,
        minHeight:'100vh', display:'flex',
        alignItems:'center', justifyContent:'center',
        padding:'1.5rem', fontFamily:"'Inter',sans-serif",
      }}>
        <div className="login-card" style={{
          width:'100%', maxWidth:420,
          background:'rgba(20,5,40,0.30)',
          backdropFilter:'blur(28px)',
          WebkitBackdropFilter:'blur(28px)',
          border:'1px solid rgba(255,255,255,0.18)',
          borderRadius:24,
          padding:'2.5rem',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>

          {/* Logo */}
          <div style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            fontSize:15, fontWeight:800,
            letterSpacing:'.14em', textTransform:'uppercase',
            color:'#ffffff', marginBottom:'2rem',
          }}>
            Serely<span style={{color:'#f382ff'}}>o</span>
          </div>

          {/* Header */}
          <h1 style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            fontSize:28, fontWeight:800,
            letterSpacing:'-.02em', color:'#ffffff',
            marginBottom:8,
          }}>Bon retour 👋</h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.45)', marginBottom:'2rem' }}>
            Connecte-toi à ton espace Serelyo
          </p>

          {/* Error */}
          {error && (
            <div style={{
              background:'rgba(255,110,132,0.1)',
              border:'1px solid rgba(255,110,132,0.25)',
              borderRadius:12, padding:'10px 14px',
              fontSize:13, color:'#ff6e84',
              marginBottom:'1.25rem',
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom:'1rem' }}>
              <label style={{
                fontSize:10, fontWeight:700,
                letterSpacing:'.08em', textTransform:'uppercase',
                color:'rgba(255,255,255,0.4)',
                display:'block', marginBottom:8,
              }}>Adresse email</label>
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                required
                style={{
                  width:'100%', padding:'12px 14px',
                  borderRadius:12,
                  border: focused==='email'
                    ? '1px solid rgba(243,130,255,0.55)'
                    : '1px solid rgba(255,255,255,0.18)',
                  background:'rgba(20,5,40,0.45)',
                  backdropFilter:'blur(10px)',
                  color:'#ffffff',
                  fontFamily:"'Inter',sans-serif",
                  fontSize:15, outline:'none',
                  transition:'border-color .2s, background .2s',
                }}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:'1.75rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <label style={{
                  fontSize:10, fontWeight:700,
                  letterSpacing:'.08em', textTransform:'uppercase',
                  color:'rgba(255,255,255,0.4)',
                }}>Mot de passe</label>
                <Link href="/forgot-password" style={{
                  fontSize:11, color:'#f382ff',
                  textDecoration:'none', fontWeight:600,
                }}>Oublié ?</Link>
              </div>
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width:'100%', padding:'12px 14px',
                  borderRadius:12,
                  border: focused==='password'
                    ? '1px solid rgba(243,130,255,0.55)'
                    : '1px solid rgba(255,255,255,0.18)',
                  background:'rgba(20,5,40,0.45)',
                  backdropFilter:'blur(10px)',
                  color:'#ffffff',
                  fontFamily:"'Inter',sans-serif",
                  fontSize:15, outline:'none',
                  transition:'border-color .2s, background .2s',
                }}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
              style={{
                width:'100%', padding:'13px',
                borderRadius:12, border:'none',
                background: loading
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg,#f382ff,#c081ff)',
                color: loading ? 'rgba(255,255,255,0.4)' : '#07080F',
                fontFamily:"'Inter',sans-serif",
                fontSize:14, fontWeight:800,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition:'all .2s',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(243,130,255,0.3)',
                letterSpacing:'.01em',
              }}
            >
              {loading ? 'Connexion…' : 'Se connecter →'}
            </button>
          </form>

          {/* Footer */}
          <p style={{
            textAlign:'center', marginTop:'1.75rem',
            fontSize:13, color:'rgba(255,255,255,0.35)',
          }}>
            Pas encore de compte ?{' '}
            <Link href="/signup" style={{
              color:'#f382ff', fontWeight:700,
              textDecoration:'none',
            }}>
              Créer un compte
            </Link>
          </p>

          {/* Legal links */}
          <div style={{
            display:'flex', justifyContent:'center', gap:16,
            marginTop:'1.5rem',
          }}>
            {[['CGU','/cgu'],['Confidentialité','/confidentialite'],['Mentions légales','/mentions-legales']].map(([label,href])=>(
              <Link key={href} href={href} style={{
                fontSize:10, color:'rgba(255,255,255,0.2)',
                textDecoration:'none', fontWeight:500,
              }}>{label}</Link>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
