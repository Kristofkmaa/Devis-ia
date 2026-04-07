'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'

export default function Signup() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [focused, setFocused]   = useState('')
  const bgRef = useRef(null)
  const router = useRouter()

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

  const passwordStrength = (p) => {
    if (!p) return null
    if (p.length < 6) return { level: 0, label: 'Trop court', color: '#ff6e84' }
    if (p.length < 8) return { level: 1, label: 'Faible', color: '#f382ff' }
    if (!/[0-9]/.test(p) || !/[A-Z]/.test(p)) return { level: 2, label: 'Moyen', color: '#dbb4ff' }
    return { level: 3, label: 'Fort', color: '#c081ff' }
  }
  const strength = passwordStrength(password)

  const handleSignup = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 6)  { setError('Le mot de passe doit faire au moins 6 caractères'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      }
    })
    if (error) setError(error.message)
    else setDone(true)
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
        @keyframes checkPop {
          0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
          70%  { transform: scale(1.15) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .signup-card { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
        .signup-btn:hover { opacity: .88; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(243,130,255,0.45); }
        .signup-btn:active { transform: translateY(0); }
        .signup-input:focus { border-color: rgba(243,130,255,0.55) !important; background: rgba(20,5,40,0.60) !important; }
        .check-icon { animation: checkPop .5s cubic-bezier(.16,1,.3,1) both; }
      `}</style>

      <div ref={bgRef} style={{
        position:'fixed',inset:0,zIndex:0,pointerEvents:'none',
        backgroundColor:'#04000C',
        backgroundImage:[
          'radial-gradient(ellipse 140% 120% at 38% 42%, rgba(70,8,120,0.38) 0%, rgba(35,3,70,0.22) 45%, transparent 72%)',
          'radial-gradient(ellipse 90% 70% at 98% 90%, rgba(28,0,55,0.18) 0%, transparent 62%)',
        ].join(','),
      }}/>

      <div style={{
        position:'relative',zIndex:1,
        minHeight:'100vh',display:'flex',
        alignItems:'center',justifyContent:'center',
        padding:'1.5rem',fontFamily:"'Inter',sans-serif",
      }}>
        <div className="signup-card" style={{
          width:'100%',maxWidth:420,
          background:'rgba(20,5,40,0.30)',
          backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',
          border:'1px solid rgba(255,255,255,0.18)',
          borderRadius:24,padding:'2.5rem',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>

          {/* Logo */}
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',color:'#ffffff',marginBottom:'2rem'}}>
            Serely<span style={{color:'#f382ff'}}>o</span>
          </div>

          {done ? (
            /* ── Email envoyé ── */
            <div style={{textAlign:'center',padding:'1rem 0'}}>
              <div className="check-icon" style={{
                width:64,height:64,borderRadius:'50%',
                background:'linear-gradient(135deg,rgba(243,130,255,0.2),rgba(192,129,255,0.2))',
                border:'1px solid rgba(243,130,255,0.3)',
                display:'flex',alignItems:'center',justifyContent:'center',
                margin:'0 auto 1.5rem',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f382ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:24,fontWeight:800,color:'#fff',marginBottom:10,letterSpacing:'-.02em'}}>
                Vérifie tes emails !
              </h1>
              <p style={{fontSize:14,color:'rgba(255,255,255,0.5)',lineHeight:1.7,marginBottom:'1.75rem'}}>
                On a envoyé un lien de confirmation à <strong style={{color:'#dbb4ff'}}>{email}</strong>.<br/>
                Clique dessus pour activer ton compte.
              </p>
              <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'12px 16px',fontSize:12,color:'rgba(255,255,255,0.35)',lineHeight:1.7}}>
                Pas reçu ? Vérifie tes spams ou{' '}
                <button onClick={handleSignup} style={{background:'none',border:'none',color:'#f382ff',cursor:'pointer',fontSize:12,fontFamily:'Inter,sans-serif',fontWeight:600}}>
                  renvoyer l'email
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:26,fontWeight:800,letterSpacing:'-.02em',color:'#fff',marginBottom:8}}>
                Créer un compte
              </h1>
              <p style={{fontSize:14,color:'rgba(255,255,255,0.42)',marginBottom:'2rem'}}>
                Gratuit · Sans carte bancaire · 30 secondes
              </p>

              {error && (
                <div style={{background:'rgba(255,110,132,0.1)',border:'1px solid rgba(255,110,132,0.25)',borderRadius:12,padding:'10px 14px',fontSize:13,color:'#ff6e84',marginBottom:'1.25rem'}}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup}>
                {/* Email */}
                <div style={{marginBottom:'1rem'}}>
                  <label style={{fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(255,255,255,0.4)',display:'block',marginBottom:8}}>
                    Adresse email
                  </label>
                  <input
                    className="signup-input"
                    type="email" value={email}
                    onChange={e=>setEmail(e.target.value)}
                    placeholder="vous@exemple.fr" required
                    style={{width:'100%',padding:'12px 14px',borderRadius:12,border:focused==='email'?'1px solid rgba(243,130,255,0.55)':'1px solid rgba(255,255,255,0.18)',background:'rgba(20,5,40,0.45)',backdropFilter:'blur(10px)',color:'#ffffff',fontFamily:"'Inter',sans-serif",fontSize:15,outline:'none',transition:'border-color .2s, background .2s'}}
                    onFocus={()=>setFocused('email')} onBlur={()=>setFocused('')}
                  />
                </div>

                {/* Password */}
                <div style={{marginBottom:'0.75rem'}}>
                  <label style={{fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(255,255,255,0.4)',display:'block',marginBottom:8}}>
                    Mot de passe
                  </label>
                  <input
                    className="signup-input"
                    type="password" value={password}
                    onChange={e=>setPassword(e.target.value)}
                    placeholder="8 caractères minimum" required
                    style={{width:'100%',padding:'12px 14px',borderRadius:12,border:focused==='password'?'1px solid rgba(243,130,255,0.55)':'1px solid rgba(255,255,255,0.18)',background:'rgba(20,5,40,0.45)',backdropFilter:'blur(10px)',color:'#ffffff',fontFamily:"'Inter',sans-serif",fontSize:15,outline:'none',transition:'border-color .2s, background .2s'}}
                    onFocus={()=>setFocused('password')} onBlur={()=>setFocused('')}
                  />
                </div>

                {/* Password strength */}
                {password && strength && (
                  <div style={{marginBottom:'1rem'}}>
                    <div style={{display:'flex',gap:4,marginBottom:5}}>
                      {[0,1,2,3].map(i=>(
                        <div key={i} style={{flex:1,height:3,borderRadius:9999,background:i<=strength.level?strength.color:'rgba(255,255,255,0.1)',transition:'background .3s'}}/>
                      ))}
                    </div>
                    <span style={{fontSize:11,color:strength.color,fontWeight:600}}>{strength.label}</span>
                  </div>
                )}

                {/* Confirm */}
                <div style={{marginBottom:'1.75rem'}}>
                  <label style={{fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(255,255,255,0.4)',display:'block',marginBottom:8}}>
                    Confirmer le mot de passe
                  </label>
                  <input
                    className="signup-input"
                    type="password" value={confirm}
                    onChange={e=>setConfirm(e.target.value)}
                    placeholder="••••••••" required
                    style={{width:'100%',padding:'12px 14px',borderRadius:12,border:focused==='confirm'?'1px solid rgba(243,130,255,0.55)':confirm&&confirm!==password?'1px solid rgba(255,110,132,0.5)':'1px solid rgba(255,255,255,0.18)',background:'rgba(20,5,40,0.45)',backdropFilter:'blur(10px)',color:'#ffffff',fontFamily:"'Inter',sans-serif",fontSize:15,outline:'none',transition:'border-color .2s, background .2s'}}
                    onFocus={()=>setFocused('confirm')} onBlur={()=>setFocused('')}
                  />
                  {confirm && confirm !== password && (
                    <div style={{fontSize:11,color:'#ff6e84',marginTop:5,fontWeight:500}}>Les mots de passe ne correspondent pas</div>
                  )}
                </div>

                <button
                  type="submit"
                  className="signup-btn"
                  disabled={loading}
                  style={{width:'100%',padding:'13px',borderRadius:12,border:'none',background:loading?'rgba(255,255,255,0.1)':'linear-gradient(135deg,#f382ff,#c081ff)',color:loading?'rgba(255,255,255,0.4)':'#07080F',fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:800,cursor:loading?'not-allowed':'pointer',transition:'all .2s',boxShadow:loading?'none':'0 4px 24px rgba(243,130,255,0.3)',letterSpacing:'.01em'}}
                >
                  {loading ? 'Création du compte…' : 'Créer mon compte →'}
                </button>
              </form>

              <p style={{textAlign:'center',marginTop:'1.75rem',fontSize:13,color:'rgba(255,255,255,0.35)'}}>
                Déjà un compte ?{' '}
                <Link href="/login" style={{color:'#f382ff',fontWeight:700,textDecoration:'none'}}>
                  Se connecter
                </Link>
              </p>

              <p style={{textAlign:'center',marginTop:'1rem',fontSize:11,color:'rgba(255,255,255,0.2)',lineHeight:1.6}}>
                En créant un compte, tu acceptes nos{' '}
                <Link href="/cgu" style={{color:'rgba(243,130,255,0.5)',textDecoration:'none'}}>CGU</Link>
                {' '}et notre{' '}
                <Link href="/confidentialite" style={{color:'rgba(243,130,255,0.5)',textDecoration:'none'}}>politique de confidentialité</Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
