'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import AutoEntrepreneurApp from '../../components/AutoEntrepreneurApp'

const ACTIVE_PLANS = ['mensuel', 'annuel', 'hotline']

export default function DashboardPage() {
  const [state, setState] = useState('loading') // loading | ok | noplan | nologin
  const [user, setUser]   = useState(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Check success redirect from Stripe
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) {
      window.history.replaceState({}, '', '/dashboard')
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setState('nologin'); return }
      setUser(session.user)

      // Check subscription
      const { data: profil } = await supabase
        .from('ae_profiles')
        .select('plan, plan_expires_at')
        .eq('user_id', session.user.id)
        .single()

      const plan = profil?.plan
      const expires = profil?.plan_expires_at

      // Check if plan is active
      const isActive = ACTIVE_PLANS.includes(plan) &&
        (!expires || new Date(expires) > new Date())

      if (isActive) setState('ok')
      else setState('noplan')
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === 'loading') return (
    <div style={{
      minHeight:'100vh',background:'#04000C',
      display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,
    }}>
      <div style={{width:36,height:36,border:'3px solid rgba(243,130,255,0.15)',borderTopColor:'#f382ff',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <div style={{fontSize:13,color:'rgba(255,255,255,0.3)',fontFamily:'Inter,sans-serif'}}>Chargement…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (state === 'nologin') {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  // ── No active plan ────────────────────────────────────────────────────────
  if (state === 'noplan') return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #04000C; }
        .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 1,'wght' 400; font-style: normal; line-height: 1; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
      `}</style>

      {/* Background */}
      <div style={{position:'fixed',inset:0,zIndex:0,backgroundColor:'#04000C',backgroundImage:'radial-gradient(ellipse 140% 120% at 38% 42%, rgba(70,8,120,0.42) 0%, rgba(35,3,70,0.25) 45%, transparent 72%), radial-gradient(ellipse 90% 70% at 98% 90%, rgba(28,0,55,0.2) 0%, transparent 62%)'}}/>

      <div style={{position:'relative',zIndex:1,minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'1.5rem',fontFamily:"'Inter',sans-serif",textAlign:'center'}}>

        <div className="fade-up" style={{maxWidth:480,width:'100%'}}>
          {/* Logo */}
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'2.5rem'}}>
            Serely<span style={{color:'#f382ff'}}>o</span>
          </div>

          {/* Icon */}
          <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,rgba(243,130,255,0.2),rgba(192,129,255,0.15))',border:'1px solid rgba(243,130,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.75rem'}}>
            <span className="material-symbols-outlined" style={{fontSize:32,color:'#f382ff'}}>lock</span>
          </div>

          <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:28,fontWeight:800,letterSpacing:'-.02em',color:'#fff',marginBottom:12}}>
            Abonnement requis
          </h1>
          <p style={{fontSize:15,color:'rgba(255,255,255,0.45)',lineHeight:1.75,marginBottom:'2rem'}}>
            Serelyo est un service payant.<br/>
            Choisis ton abonnement pour accéder à ton espace.
          </p>

          {/* Feature preview */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:'2rem',textAlign:'left'}}>
            {[
              ['calculate','Calculs URSSAF'],
              ['calendar_month','Calendrier déclarations'],
              ['description','Devis & factures'],
              ['auto_awesome','Assistant IA'],
              ['group','Gestion équipe'],
              ['payments','Suivi revenus'],
            ].map(([icon,label])=>(
              <div key={label} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12}}>
                <span className="material-symbols-outlined" style={{fontSize:16,color:'#f382ff'}}>{icon}</span>
                <span style={{fontSize:12,color:'rgba(255,255,255,0.6)',fontWeight:500}}>{label}</span>
              </div>
            ))}
          </div>

          <a href="/premium" style={{display:'block',padding:'14px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#f382ff,#c081ff)',color:'#07080F',fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:800,textDecoration:'none',boxShadow:'0 4px 28px rgba(243,130,255,0.35)',marginBottom:12,letterSpacing:'.01em'}}>
            Voir les abonnements →
          </a>

          <button onClick={handleLogout} style={{background:'none',border:'none',color:'rgba(255,255,255,0.25)',fontSize:12,cursor:'pointer',fontFamily:"'Inter',sans-serif"}}>
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  )

  // ── Active plan — render app ──────────────────────────────────────────────
  return <AutoEntrepreneurApp user={user} onLogout={handleLogout} />
}
