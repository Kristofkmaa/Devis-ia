'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const PLANS = [
  {
    id: 'mensuel',
    name: 'Mensuel',
    price: 35,
    period: '/ mois',
    priceYear: null,
    badge: null,
    desc: 'Accès complet, sans engagement',
    features: [
      'Tableau de bord complet',
      'Calculs URSSAF automatiques',
      'Calendrier des déclarations',
      'Devis & factures illimités',
      'Simulateur annuel complet',
      'Assistant IA illimité',
      'Suivi de l\'équipe',
      'Ressources officielles',
    ],
    color: '#f382ff',
    gradient: 'linear-gradient(135deg,rgba(243,130,255,0.15),rgba(192,129,255,0.08))',
    border: 'rgba(243,130,255,0.3)',
  },
  {
    id: 'annuel',
    name: 'Annuel',
    price: 360,
    period: '/ an',
    priceYear: 30,
    badge: '2 mois offerts',
    desc: 'La meilleure option — économisez 60€',
    features: [
      'Tout du plan Mensuel',
      '2 mois offerts (30€/mois)',
      'Support prioritaire',
      'Nouvelles fonctionnalités en avant-première',
    ],
    color: '#c081ff',
    gradient: 'linear-gradient(135deg,rgba(192,129,255,0.2),rgba(243,130,255,0.1))',
    border: 'rgba(192,129,255,0.45)',
    featured: true,
  },
  {
    id: 'hotline',
    name: 'Premium',
    price: 100,
    period: '/ mois',
    priceYear: null,
    badge: 'Hotline incluse',
    desc: 'Pour les entrepreneurs qui veulent un accompagnement',
    features: [
      'Tout du plan Mensuel',
      'Hotline téléphonique en journée',
      'Réponse garantie sous 2h',
      'Conseils personnalisés',
      'Accompagnement dédié',
    ],
    color: '#dbb4ff',
    gradient: 'linear-gradient(135deg,rgba(219,180,255,0.12),rgba(192,129,255,0.08))',
    border: 'rgba(219,180,255,0.3)',
  },
]

function PremiumInner() {
  const [loading, setLoading]   = useState(null)
  const [error, setError]       = useState('')
  const [user, setUser]         = useState(null)
  const [cancelled, setCancelled] = useState(false)
  const bgRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('cancelled')) setCancelled(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (!bgRef.current) return
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100
      bgRef.current.style.backgroundImage = [
        `radial-gradient(ellipse 140% 120% at ${35+(x-50)*0.05}% ${40+(y-50)*0.05}%, rgba(70,8,120,0.42) 0%, rgba(35,3,70,0.25) 45%, transparent 72%)`,
        `radial-gradient(ellipse 90% 70% at ${98-x*0.02}% ${90+y*0.01}%, rgba(28,0,55,0.2) 0%, transparent 62%)`,
      ].join(',')
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleSubscribe = async (planId) => {
    if (!user) { router.push('/login'); return }
    setLoading(planId); setError('')
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setLoading(null)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #04000C; min-height: 100vh; }
        .plan-card { transition: transform .2s, border-color .2s; }
        .plan-card:hover { transform: translateY(-4px); }
        .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 1,'wght' 400; font-style: normal; line-height: 1; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
      `}</style>

      {/* Background */}
      <div ref={bgRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',backgroundColor:'#04000C',backgroundImage:'radial-gradient(ellipse 140% 120% at 38% 42%, rgba(70,8,120,0.42) 0%, rgba(35,3,70,0.25) 45%, transparent 72%)'}}/>

      <div style={{position:'relative',zIndex:1,minHeight:'100vh',fontFamily:"'Inter',sans-serif"}}>

        {/* Nav */}
        <nav style={{padding:'0 5%',height:64,display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(4,0,12,0.7)',backdropFilter:'blur(40px)',position:'sticky',top:0,zIndex:100}}>
          <a href="/" style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',color:'#fff',textDecoration:'none'}}>
            Serely<span style={{color:'#f382ff'}}>o</span>
          </a>
          <a href="/dashboard" style={{fontSize:13,color:'rgba(255,255,255,0.4)',textDecoration:'none',fontWeight:500}}>← Retour</a>
        </nav>

        <div style={{maxWidth:1400,margin:'0 auto',padding:'80px 4% 100px'}}>

          {/* Header */}
          <div className="fade-up" style={{textAlign:'center',marginBottom:64}}>
            <div style={{display:'inline-block',fontSize:10,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#f382ff',background:'rgba(243,130,255,0.1)',border:'1px solid rgba(243,130,255,0.2)',padding:'5px 14px',borderRadius:9999,marginBottom:20}}>
              Abonnement Serelyo
            </div>
            <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'clamp(36px,5vw,64px)',fontWeight:800,letterSpacing:'-.03em',color:'#fff',marginBottom:16,lineHeight:1.1}}>
              Pilote ton activité<br/>
              <span style={{color:'#f382ff'}}>sereinement.</span>
            </h1>
            <p style={{fontSize:17,color:'rgba(255,255,255,0.45)',maxWidth:480,margin:'0 auto',lineHeight:1.7,fontWeight:300}}>
              Choisis la formule qui correspond à ton rythme. Résiliable à tout moment.
            </p>
          </div>

          {cancelled && (
            <div style={{background:'rgba(255,110,132,0.08)',border:'1px solid rgba(255,110,132,0.2)',borderRadius:14,padding:'12px 20px',marginBottom:32,fontSize:13,color:'#ff6e84',textAlign:'center'}}>
              Paiement annulé — tu peux choisir un plan quand tu veux.
            </div>
          )}
          {error && (
            <div style={{background:'rgba(255,110,132,0.08)',border:'1px solid rgba(255,110,132,0.2)',borderRadius:14,padding:'12px 20px',marginBottom:32,fontSize:13,color:'#ff6e84',textAlign:'center'}}>
              {error}
            </div>
          )}

          {/* Plans grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24,alignItems:'stretch'}}>
            {PLANS.map((plan, i) => (
              <div
                key={plan.id}
                className="plan-card fade-up"
                style={{
                  background: plan.gradient,
                  backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',
                  border:`1px solid ${plan.border}`,
                  borderRadius:28,padding:'2.5rem',
                  position:'relative',overflow:'hidden',
                  animationDelay:`${i*0.08}s`,
                  display:'flex',flexDirection:'column',
                  boxShadow: plan.featured ? `0 0 80px ${plan.color}28, 0 24px 60px rgba(0,0,0,0.3)` : '0 8px 32px rgba(0,0,0,0.2)',
                }}
              >
                {/* Featured glow */}
                {plan.featured && (
                  <div style={{position:'absolute',top:-1,left:'50%',transform:'translateX(-50%)',background:`linear-gradient(135deg,${plan.color},#f382ff)`,color:'#07080F',fontSize:10,fontWeight:800,padding:'4px 16px',borderRadius:'0 0 10px 10px',letterSpacing:'.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>
                    {plan.badge}
                  </div>
                )}

                {/* Badge (non featured) */}
                {plan.badge && !plan.featured && (
                  <div style={{display:'inline-block',fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:9999,background:`rgba(255,255,255,0.08)`,color:'rgba(255,255,255,0.6)',marginBottom:12,letterSpacing:'.04em'}}>
                    {plan.badge}
                  </div>
                )}

                <div style={{marginTop: plan.featured ? '1.25rem' : 0}}>
                  <div style={{fontSize:12,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.45)',marginBottom:10}}>{plan.name}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:8}}>
                    <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:56,fontWeight:800,color:'#fff',letterSpacing:'-.03em'}}>{plan.price}€</span>
                    <span style={{fontSize:14,color:'rgba(255,255,255,0.4)',fontWeight:400}}>{plan.period}</span>
                  </div>
                  {plan.priceYear && (
                    <div style={{fontSize:13,color:plan.color,fontWeight:600,marginBottom:4}}>soit {plan.priceYear}€/mois</div>
                  )}
                  <div style={{fontSize:14,color:'rgba(255,255,255,0.5)',marginBottom:32,lineHeight:1.6}}>{plan.desc}</div>

                  <button
                    onClick={()=>handleSubscribe(plan.id)}
                    disabled={!!loading}
                    style={{
                      width:'100%',padding:'15px',borderRadius:14,border:'none',
                      background: loading===plan.id ? 'rgba(255,255,255,0.1)' : plan.featured ? `linear-gradient(135deg,${plan.color},#f382ff)` : `rgba(255,255,255,0.1)`,
                      color: plan.featured ? '#07080F' : '#fff',
                      fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:800,
                      cursor:loading?'not-allowed':'pointer',
                      transition:'all .2s',
                      border: plan.featured ? 'none' : `1px solid ${plan.border}`,
                      marginBottom:24,
                      boxShadow: plan.featured && !loading ? `0 4px 24px ${plan.color}44` : 'none',
                    }}
                  >
                    {loading===plan.id ? 'Redirection…' : `Choisir ${plan.name} →`}
                  </button>

                  <div style={{display:'flex',flexDirection:'column',gap:12,flex:1}}>
                    {plan.features.map(f=>(
                      <div key={f} style={{display:'flex',alignItems:'flex-start',gap:10}}>
                        <span className="material-symbols-outlined" style={{fontSize:18,color:plan.color,flexShrink:0,marginTop:1}}>check_circle</span>
                        <span style={{fontSize:14,color:'rgba(255,255,255,0.7)',lineHeight:1.5}}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reassurance */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginTop:56}}>
            {[
              ['lock','Paiement sécurisé','Stripe — standard bancaire international'],
              ['cancel','Résiliable à tout moment','Sans engagement, sans frais'],
              ['receipt_long','Facture automatique','Reçue par email à chaque paiement'],
              ['support_agent','Support réactif','contact@serelyo.fr'],
            ].map(([icon,title,desc])=>(
              <div key={title} style={{display:'flex',gap:12,padding:'14px 16px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14}}>
                <span className="material-symbols-outlined" style={{fontSize:20,color:'rgba(243,130,255,0.7)',flexShrink:0}}>{icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.75)',marginBottom:3}}>{title}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default function Premium() {
  return (
    <Suspense fallback={null}>
      <PremiumInner />
    </Suspense>
  )
}
