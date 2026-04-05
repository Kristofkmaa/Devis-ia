'use client'
import { useEffect } from 'react'

export default function HomePage() {

  useEffect(() => {
    // FAQ accordion
    const toggleFaq = (btn) => {
      const item = btn.parentElement
      const isOpen = item.classList.contains('open')
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'))
      if (!isOpen) item.classList.add('open')
    }
    document.querySelectorAll('.faq-q').forEach(btn => {
      btn.addEventListener('click', () => toggleFaq(btn))
    })

    // Animation scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1'
          entry.target.style.transform = 'translateY(0)'
        }
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.feature-card, .taux-card, .pricing-card, .problem-item, .how-step').forEach(el => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(20px)'
      el.style.transition = 'opacity .5s ease, transform .5s ease'
      observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --noir: #1C1710;
    --or: #B5792A;
    --or-clair: #E8D5A8;
    --creme: #FFFDF8;
    --beige: #F6F0E4;
    --beige-mid: #E2D8C4;
    --text-soft: #6B5E45;
    --text-muted: #A89878;
    --vert: #2D7A4F;
    --rouge: #8B1A1A;
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'Outfit', sans-serif;
    background: var(--creme);
    color: var(--noir);
    overflow-x: hidden;
  }

  /* ── NAV ── */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 18px 5%;
    display: flex; align-items: center; justify-content: space-between;
    background: rgba(28,23,16,.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .nav-logo {
    font-family: 'Playfair Display', serif;
    font-size: 22px; color: #fff; letter-spacing: .5px;
  }
  .nav-logo span { color: var(--or); }
  .nav-links { display: flex; align-items: center; gap: 32px; }
  .nav-links a {
    font-size: 13px; color: rgba(255,255,255,.55);
    text-decoration: none; font-weight: 500;
    transition: color .2s;
  }
  .nav-links a:hover { color: #fff; }
  .nav-cta {
    background: var(--or); color: #fff !important;
    padding: 9px 22px; border-radius: 30px;
    font-weight: 600 !important; font-size: 13px !important;
    transition: all .2s !important;
  }
  .nav-cta:hover { background: #D4942E !important; transform: translateY(-1px); }

  /* ── HERO ── */
  .hero {
    min-height: 100vh;
    background: var(--noir);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    padding: 120px 5% 80px;
    position: relative; overflow: hidden;
  }
  .hero-orb {
    position: absolute; border-radius: 50%;
    pointer-events: none;
    animation: pulse 6s ease-in-out infinite;
  }
  .hero-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(181,121,42,.18) 0%, transparent 70%); top: -100px; right: -100px; }
  .hero-orb-2 { width: 350px; height: 350px; background: radial-gradient(circle, rgba(181,121,42,.1) 0%, transparent 70%); bottom: 0; left: -80px; animation-delay: 3s; }
  @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: .7; } }

  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(181,121,42,.15);
    border: 1px solid rgba(181,121,42,.3);
    color: var(--or-clair); font-size: 12px; font-weight: 600;
    padding: 6px 16px; border-radius: 30px;
    letter-spacing: .5px; text-transform: uppercase;
    margin-bottom: 28px;
    animation: fadeUp .6s ease both;
  }
  .hero-badge::before { content: '✦'; color: var(--or); }

  .hero-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(42px, 7vw, 80px);
    font-weight: 700; line-height: 1.1;
    color: #fff; margin-bottom: 24px;
    animation: fadeUp .6s .1s ease both;
  }
  .hero-title em { font-style: italic; color: var(--or); }

  .hero-sub {
    font-size: clamp(16px, 2vw, 20px);
    color: rgba(255,255,255,.5);
    max-width: 560px; line-height: 1.7;
    margin-bottom: 44px; font-weight: 300;
    animation: fadeUp .6s .2s ease both;
  }

  .hero-actions {
    display: flex; gap: 14px; flex-wrap: wrap; justify-content: center;
    animation: fadeUp .6s .3s ease both;
  }
  .btn-primary {
    background: var(--or); color: #fff;
    padding: 16px 36px; border-radius: 50px;
    font-size: 15px; font-weight: 600;
    text-decoration: none; transition: all .25s;
    box-shadow: 0 8px 32px rgba(181,121,42,.35);
  }
  .btn-primary:hover { background: #D4942E; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(181,121,42,.45); }
  .btn-secondary {
    background: rgba(255,255,255,.07);
    border: 1px solid rgba(255,255,255,.15);
    color: rgba(255,255,255,.7);
    padding: 16px 36px; border-radius: 50px;
    font-size: 15px; font-weight: 500;
    text-decoration: none; transition: all .25s;
  }
  .btn-secondary:hover { background: rgba(255,255,255,.12); color: #fff; }

  .hero-note {
    margin-top: 20px; font-size: 12px;
    color: rgba(255,255,255,.25);
    animation: fadeUp .6s .4s ease both;
  }

  /* Stats hero */
  .hero-stats {
    display: flex; gap: 0;
    margin-top: 72px; width: 100%; max-width: 700px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 20px; overflow: hidden;
    background: rgba(255,255,255,.03);
    animation: fadeUp .6s .5s ease both;
  }
  .hero-stat {
    flex: 1; padding: 24px 20px; text-align: center;
    border-right: 1px solid rgba(255,255,255,.08);
  }
  .hero-stat:last-child { border-right: none; }
  .hero-stat-val {
    font-family: 'Playfair Display', serif;
    font-size: 28px; color: var(--or-clair); margin-bottom: 6px;
  }
  .hero-stat-label { font-size: 11px; color: rgba(255,255,255,.35); font-weight: 500; letter-spacing: .5px; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  /* ── SECTION COMMUNE ── */
  section { padding: 100px 5%; }
  .section-tag {
    font-size: 11px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--or);
    margin-bottom: 14px; display: block;
  }
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(32px, 4vw, 50px);
    line-height: 1.15; color: var(--noir);
    margin-bottom: 18px;
  }
  .section-title em { font-style: italic; color: var(--or); }
  .section-sub {
    font-size: 17px; color: var(--text-soft);
    line-height: 1.7; max-width: 520px; font-weight: 300;
  }

  /* ── PROBLÈME ── */
  .problem { background: var(--beige); }
  .problem-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 60px; align-items: center; max-width: 1100px; margin: 0 auto;
  }
  .problem-list { display: flex; flex-direction: column; gap: 16px; margin-top: 36px; }
  .problem-item {
    display: flex; gap: 14px; align-items: flex-start;
    padding: 18px 20px; border-radius: 14px;
    background: #fff; border: 1px solid var(--beige-mid);
    transition: transform .2s;
  }
  .problem-item:hover { transform: translateX(4px); }
  .problem-icon { font-size: 22px; flex-shrink: 0; }
  .problem-text strong { display: block; font-size: 14px; color: var(--noir); margin-bottom: 3px; }
  .problem-text span { font-size: 12px; color: var(--text-muted); }

  /* Image problème simulée */
  .problem-visual {
    background: var(--noir); border-radius: 24px;
    padding: 32px; position: relative; overflow: hidden;
  }
  .problem-visual::before {
    content: ''; position: absolute;
    top: -40px; right: -40px; width: 200px; height: 200px;
    border-radius: 50%; background: rgba(181,121,42,.12);
  }
  .pv-label { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,.3); margin-bottom: 6px; }
  .pv-val { font-family: 'Playfair Display', serif; font-size: 28px; color: #fff; margin-bottom: 4px; }
  .pv-sub { font-size: 12px; color: rgba(255,255,255,.4); margin-bottom: 20px; }
  .pv-bar { height: 8px; background: rgba(255,255,255,.08); border-radius: 20px; overflow: hidden; margin-bottom: 6px; }
  .pv-bar-fill { height: 100%; border-radius: 20px; }
  .pv-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 16px; }
  .pv-key { color: rgba(255,255,255,.45); }
  .pv-num { color: var(--or-clair); font-weight: 600; }

  /* ── FONCTIONNALITÉS ── */
  .features { background: var(--creme); }
  .features-header { text-align: center; margin-bottom: 64px; }
  .features-header .section-sub { margin: 0 auto; }
  .features-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 20px; max-width: 1100px; margin: 0 auto;
  }
  .feature-card {
    background: #fff; border: 1px solid var(--beige-mid);
    border-radius: 20px; padding: 28px;
    transition: all .25s; position: relative; overflow: hidden;
  }
  .feature-card::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--or), #D4A456);
    transform: scaleX(0); transform-origin: left;
    transition: transform .3s;
  }
  .feature-card:hover { border-color: var(--or-clair); transform: translateY(-4px); box-shadow: 0 12px 40px rgba(28,23,16,.08); }
  .feature-card:hover::before { transform: scaleX(1); }
  .feature-emoji { font-size: 32px; margin-bottom: 16px; display: block; }
  .feature-title { font-family: 'Playfair Display', serif; font-size: 19px; margin-bottom: 10px; color: var(--noir); }
  .feature-desc { font-size: 13px; color: var(--text-soft); line-height: 1.7; }
  .feature-card.featured {
    background: var(--noir); border-color: var(--noir);
    grid-column: span 1;
  }
  .feature-card.featured .feature-title { color: #fff; }
  .feature-card.featured .feature-desc { color: rgba(255,255,255,.5); }
  .feature-card.featured::before { display: none; }

  /* ── TAUX ── */
  .taux-section { background: var(--beige); }
  .taux-header { text-align: center; margin-bottom: 56px; }
  .taux-header .section-sub { margin: 0 auto; }
  .taux-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 16px; max-width: 1000px; margin: 0 auto 48px;
  }
  .taux-card {
    background: #fff; border: 1px solid var(--beige-mid);
    border-radius: 16px; padding: 22px 20px;
    display: flex; flex-direction: column; gap: 8px;
    transition: all .2s;
  }
  .taux-card:hover { border-color: var(--or); transform: translateY(-2px); }
  .taux-secteur { font-size: 13px; color: var(--text-soft); font-weight: 500; }
  .taux-val { font-family: 'Playfair Display', serif; font-size: 32px; color: var(--or); }
  .taux-acre { font-size: 11px; color: var(--vert); font-weight: 600; background: #EDFAF3; padding: 3px 10px; border-radius: 20px; display: inline-block; }
  .taux-note {
    text-align: center; font-size: 12px; color: var(--text-muted);
    max-width: 600px; margin: 0 auto;
    background: rgba(255,255,255,.7); border: 1px solid var(--beige-mid);
    border-radius: 12px; padding: 14px 20px;
  }

  /* ── COMMENT ÇA MARCHE ── */
  .how { background: var(--creme); }
  .how-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
  .how-steps { display: flex; flex-direction: column; gap: 0; }
  .how-step {
    display: flex; gap: 20px; padding: 24px 0;
    border-bottom: 1px solid var(--beige);
    transition: all .2s;
  }
  .how-step:last-child { border-bottom: none; }
  .how-step:hover { transform: translateX(4px); }
  .step-num {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--or); color: #fff;
    font-family: 'Playfair Display', serif;
    font-size: 16px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .step-content strong { display: block; font-size: 15px; color: var(--noir); margin-bottom: 5px; }
  .step-content span { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

  /* Dashboard preview */
  .dashboard-preview {
    background: var(--noir); border-radius: 24px;
    padding: 24px; box-shadow: 0 24px 80px rgba(28,23,16,.25);
    position: relative;
  }
  .dp-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
  .dp-dot { width: 10px; height: 10px; border-radius: 50%; }
  .dp-title { font-family: 'Playfair Display', serif; font-size: 13px; color: rgba(255,255,255,.4); margin-left: auto; }
  .dp-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .dp-metric {
    background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.07);
    border-radius: 12px; padding: 14px;
  }
  .dp-metric-label { font-size: 9px; color: rgba(255,255,255,.35); font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
  .dp-metric-val { font-family: 'Playfair Display', serif; font-size: 20px; }
  .dp-bar-section { background: rgba(255,255,255,.04); border-radius: 12px; padding: 14px; }
  .dp-bar-label { font-size: 10px; color: rgba(255,255,255,.35); margin-bottom: 10px; }
  .dp-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .dp-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,.06); border-radius: 20px; overflow: hidden; }
  .dp-bar-fill-el { height: 100%; border-radius: 20px; }
  .dp-bar-pct { font-size: 10px; color: rgba(255,255,255,.35); width: 28px; text-align: right; }

  /* ── TARIFS ── */
  .pricing { background: var(--beige); }
  .pricing-header { text-align: center; margin-bottom: 56px; }
  .pricing-header .section-sub { margin: 0 auto; }
  .pricing-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; max-width: 900px; margin: 0 auto; }
  .pricing-card {
    background: #fff; border: 1px solid var(--beige-mid);
    border-radius: 24px; padding: 32px;
    display: flex; flex-direction: column;
    transition: all .25s;
  }
  .pricing-card:hover { transform: translateY(-4px); box-shadow: 0 16px 50px rgba(28,23,16,.1); }
  .pricing-card.featured-plan {
    background: var(--noir); border-color: var(--noir);
    position: relative; transform: scale(1.04);
  }
  .pricing-card.featured-plan:hover { transform: scale(1.04) translateY(-4px); }
  .plan-badge {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    background: var(--or); color: #fff;
    font-size: 11px; font-weight: 700; letter-spacing: .5px;
    padding: 4px 16px; border-radius: 20px; white-space: nowrap;
  }
  .plan-name { font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; }
  .featured-plan .plan-name { color: rgba(255,255,255,.4); }
  .plan-price { font-family: 'Playfair Display', serif; font-size: 42px; color: var(--noir); margin-bottom: 4px; }
  .featured-plan .plan-price { color: #fff; }
  .plan-price span { font-size: 16px; font-family: 'Outfit', sans-serif; font-weight: 400; }
  .plan-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 28px; line-height: 1.5; }
  .featured-plan .plan-desc { color: rgba(255,255,255,.4); }
  .plan-features { flex: 1; display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
  .plan-feature { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: var(--text-soft); }
  .featured-plan .plan-feature { color: rgba(255,255,255,.65); }
  .plan-feature::before { content: '✓'; color: var(--vert); font-weight: 700; flex-shrink: 0; }
  .featured-plan .plan-feature::before { color: var(--or); }
  .plan-cta {
    display: block; text-align: center; padding: 13px;
    border-radius: 12px; font-size: 14px; font-weight: 600;
    text-decoration: none; transition: all .2s;
    background: var(--beige); color: var(--noir); border: 1.5px solid var(--beige-mid);
  }
  .plan-cta:hover { background: var(--beige-mid); }
  .featured-plan .plan-cta { background: var(--or); color: #fff; border-color: var(--or); }
  .featured-plan .plan-cta:hover { background: #D4942E; }

  /* ── FAQ ── */
  .faq { background: var(--creme); }
  .faq-inner { max-width: 700px; margin: 0 auto; }
  .faq-header { text-align: center; margin-bottom: 48px; }
  .faq-item { border-bottom: 1px solid var(--beige); }
  .faq-q {
    width: 100%; text-align: left; padding: 20px 0;
    font-size: 15px; font-weight: 500; color: var(--noir);
    background: none; border: none; cursor: pointer;
    display: flex; justify-content: space-between; align-items: center;
    font-family: 'Outfit', sans-serif;
    transition: color .2s;
  }
  .faq-q:hover { color: var(--or); }
  .faq-arrow { transition: transform .3s; font-size: 18px; color: var(--or); }
  .faq-item.open .faq-arrow { transform: rotate(45deg); }
  .faq-a {
    max-height: 0; overflow: hidden;
    font-size: 14px; color: var(--text-soft);
    line-height: 1.8; transition: max-height .3s ease, padding .3s;
  }
  .faq-item.open .faq-a { max-height: 200px; padding-bottom: 18px; }

  /* ── CTA FINAL ── */
  .cta-final {
    background: var(--noir); text-align: center;
    padding: 120px 5%;
    position: relative; overflow: hidden;
  }
  .cta-final::before {
    content: ''; position: absolute;
    width: 600px; height: 600px; border-radius: 50%;
    background: radial-gradient(circle, rgba(181,121,42,.15) 0%, transparent 70%);
    top: 50%; left: 50%; transform: translate(-50%,-50%);
    pointer-events: none;
  }
  .cta-final h2 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(36px, 5vw, 60px);
    color: #fff; margin-bottom: 20px; position: relative;
  }
  .cta-final h2 em { font-style: italic; color: var(--or); }
  .cta-final p { font-size: 17px; color: rgba(255,255,255,.45); margin-bottom: 40px; font-weight: 300; position: relative; }

  /* ── FOOTER ── */
  footer {
    background: #0F0D09; padding: 48px 5% 32px;
    border-top: 1px solid rgba(255,255,255,.05);
  }
  .footer-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; flex-wrap: wrap; gap: 32px; }
  .footer-logo { font-family: 'Playfair Display', serif; font-size: 24px; color: #fff; margin-bottom: 10px; }
  .footer-logo span { color: var(--or); }
  .footer-tagline { font-size: 13px; color: rgba(255,255,255,.3); max-width: 220px; line-height: 1.6; }
  .footer-links { display: flex; gap: 48px; flex-wrap: wrap; }
  .footer-col h4 { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,.3); margin-bottom: 16px; }
  .footer-col a { display: block; font-size: 13px; color: rgba(255,255,255,.45); text-decoration: none; margin-bottom: 10px; transition: color .2s; }
  .footer-col a:hover { color: rgba(255,255,255,.8); }
  .footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; border-top: 1px solid rgba(255,255,255,.05); font-size: 12px; color: rgba(255,255,255,.2); flex-wrap: wrap; gap: 12px; }
  .footer-legal a { color: rgba(255,255,255,.2); text-decoration: none; margin-left: 20px; }
  .footer-legal a:hover { color: rgba(255,255,255,.4); }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .problem-grid, .how-inner, .pricing-grid, .features-grid, .taux-grid { grid-template-columns: 1fr; }
    .hero-stats { flex-direction: column; }
    .pricing-card.featured-plan { transform: none; }
    .nav-links { display: none; }
    .footer-links { gap: 32px; }
  }
      `}</style>

      {/* NAV */}
      <nav>
        <div className="nav-logo">Serely<span>o</span></div>
        <div className="nav-links">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#taux">Taux URSSAF</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#faq">FAQ</a>
          <a href="/login" style={{color:'rgba(255,255,255,.55)'}}>Connexion</a>
          <a href="/signup" className="nav-cta">Essayer gratuitement</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-orb hero-orb-1"></div>
        <div className="hero-orb hero-orb-2"></div>
        <div className="hero-badge">Copilote pour auto-entrepreneurs</div>
        <h1 className="hero-title">L'administratif,<br/><em>enfin simple.</em></h1>
        <p className="hero-sub">Calculs URSSAF, devis, calendrier des déclarations, simulation annuelle — tout en un seul endroit, pensé pour les auto-entrepreneurs français.</p>
        <div className="hero-actions">
          <a href="/signup" className="btn-primary">Commencer gratuitement →</a>
          <a href="#fonctionnalites" className="btn-secondary">Voir comment ça marche</a>
        </div>
        <p className="hero-note">Sans carte bancaire · Gratuit pour commencer · Données sécurisées</p>
        <div className="hero-stats">
          {[["6","Secteurs activite"],["2026","Taux mis a jour"],["100%","Sources officielles"],["0€","Pour commencer"]].map(([val,label])=>(
            <div key={label} className="hero-stat">
              <div className="hero-stat-val">{val}</div>
              <div className="hero-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLÈME */}
      <section className="problem" id="probleme">
        <div className="problem-grid">
          <div>
            <span className="section-tag">Le problème</span>
            <h2 className="section-title">L'administratif te prend <em>trop de temps.</em></h2>
            <p className="section-sub">Entre les déclarations URSSAF, les devis, les seuils de TVA et les impôts — gérer son auto-entreprise est devenu un métier à part entière.</p>
            <div className="problem-list">
              {[
                ["😰",'Tu oublies les dates de déclaration','Et tu te retrouves avec des pénalités de retard inutiles'],
                ["🤯",'Tu ne sais pas combien mettre de côté','URSSAF, impôts, CFE — le calcul est flou et stressant'],
                ["📄","Tes devis sont faits sur Word ou Excel","Pas de numerotation, pas de suivi, pas d'historique"],
                ["📊",'Tu pilotes à l'aveugle','Sans visualisation claire de ta situation financière'],
              ].map(([icon,title,desc])=>(
                <div key={title} className="problem-item">
                  <span className="problem-icon">{icon}</span>
                  <div className="problem-text">
                    <strong>{title}</strong>
                    <span>{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="problem-visual">
            <div style={{position:'relative',zIndex:1}}>
              <div className="pv-label">Tableau de bord</div>
              <div className="pv-val">3 500 €</div>
              <div className="pv-sub">CA encaissé ce mois</div>
              <div className="pv-row"><span className="pv-key">À mettre de côté</span><span className="pv-num">1 225 €</span></div>
              <div className="pv-bar"><div className="pv-bar-fill" style={{width:'62%',background:'#B5792A'}}></div></div>
              <div className="pv-row" style={{marginTop:6}}><span className="pv-key">Seuil TVA</span><span className="pv-num" style={{color:'#9CDBB8'}}>62% atteint</span></div>
              <div style={{height:1,background:'rgba(255,255,255,.06)',margin:'20px 0'}}></div>
              <div className="pv-label">Prochaine déclaration</div>
              <div style={{background:'rgba(181,121,42,.15)',border:'1px solid rgba(181,121,42,.3)',borderRadius:10,padding:'12px 14px',marginTop:8}}>
                <div style={{fontSize:13,color:'#E8D5A8',fontWeight:500}}>URSSAF — T2 2026</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:3}}>Avant le 31/07/2026</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section className="features" id="fonctionnalites">
        <div className="features-header">
          <span className="section-tag">Ce que Serelyo fait pour toi</span>
          <h2 className="section-title">Tout ce dont tu as besoin,<br/><em>rien de superflu.</em></h2>
          <p className="section-sub">Conçu spécifiquement pour les auto-entrepreneurs français. Pas un outil générique.</p>
        </div>
        <div className="features-grid">
          {[
            {emoji:'🧮',title:'Calculs URSSAF automatiques',desc:'Tu saisis ton CA, Serelyo calcule exactement ce que tu dois, ce que tu devras payer en impôts, et ce qu'il te reste vraiment.',featured:true},
            {emoji:'📅',title:'Calendrier des échéances',desc:'Toutes tes déclarations URSSAF, CFE et IR au même endroit. Avec un vrai calendrier visuel et tes rendez-vous personnels.'},
            {emoji:'📊',title:'Simulation annuelle',desc:'Visualise toute ton année en un graphique. Stable, en croissance ou saisonnière — vois exactement ce que tu vas gagner.'},
            {emoji:'📄',title:'Générateur de devis',desc:'Crée des devis professionnels en 2 minutes. Numérotation automatique, PDF imprimable, suivi des statuts.'},
            {emoji:'💶',title:'Suivi des revenus',desc:'Saisis ton CA mois par mois et visualise ton historique avec le détail URSSAF, impôts et net pour chaque mois.'},
            {emoji:'💬',title:'Assistant IA personnalisé',desc:'Pose tes questions en français simple. L'assistant connaît ton secteur et ta situation — ses réponses sont adaptées.'},
          ].map(({emoji,title,desc,featured})=>(
            <div key={title} className={`feature-card${featured?' featured':''}`}>
              <span className="feature-emoji">{emoji}</span>
              <div className="feature-title">{title}</div>
              <div className="feature-desc">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TAUX */}
      <section className="taux-section" id="taux">
        <div className="taux-header">
          <span className="section-tag">Taux officiels 2025/2026</span>
          <h2 className="section-title">Les bons taux,<br/><em>toujours à jour.</em></h2>
          <p className="section-sub">Serelyo intègre les taux officiels URSSAF selon ton secteur et l'ACRE.</p>
        </div>
        <div className="taux-grid">
          {[
            ["🛍","Vente de marchandises (BIC)","12,3%","ACRE : 6,15%"],
            ["🔧","Services artisanaux (BIC)",'21,2%','ACRE : 10,6%'],
            ["💼","Services freelance (BNC)",'21,2%','ACRE : 10,6%'],
            ["🎓","Libéral non réglementé (SSI)",'25,6%','ACRE : 12,8%'],
            ["🏛","Libéral réglementé (CIPAV)",'23,2%','ACRE : 11,6%'],
            ["🏠","Location meublée classée","6%","ACRE : 3%"],
          ].map(([icon,label,taux,acre])=>(
            <div key={label} className="taux-card">
              <div className="taux-secteur">{icon} {label}</div>
              <div className="taux-val">{taux}</div>
              <div className="taux-acre">{acre}</div>
            </div>
          ))}
        </div>
        <div className="taux-note">
          ⚠️ À partir du 1er juillet 2026, l'exonération ACRE passe de 50% à 25%. Serelyo te prévient automatiquement.<br/>
          Sources : <strong>autoentrepreneur.urssaf.fr</strong> · <strong>service-public.fr</strong> · <strong>economie.gouv.fr</strong>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="how" id="comment">
        <div className="how-inner">
          <div>
            <span className="section-tag">Comment ça marche</span>
            <h2 className="section-title">Opérationnel en<br/><em>5 minutes.</em></h2>
            <div className="how-steps">
              {[
                ["1",'Crée ton compte gratuitement','Inscription en 30 secondes, sans carte bancaire.'],
                ["2",'Configure ton profil','Secteur, date de création, ACRE, taux — Serelyo adapte tous les calculs.'],
                ["3",'Saisis ton CA chaque mois','En 10 secondes. Serelyo calcule automatiquement tout le reste.'],
                ["4",'Pilote ton activité sereinement','Tableau de bord, devis, calendrier — tout est à ta portée.'],
              ].map(([num,title,desc])=>(
                <div key={num} className="how-step">
                  <div className="step-num">{num}</div>
                  <div className="step-content">
                    <strong>{title}</strong>
                    <span>{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="dashboard-preview">
            <div className="dp-bar">
              <div className="dp-dot" style={{background:'#FF5F57'}}></div>
              <div className="dp-dot" style={{background:'#FEBC2E'}}></div>
              <div className="dp-dot" style={{background:'#28C840'}}></div>
              <div className="dp-title">Serelyo — Tableau de bord</div>
            </div>
            <div className="dp-metrics">
              {[['CA ce mois','4 200 €','#E8D5A8'],['Net estimé','2 646 €','#9CDBB8'],['URSSAF','890 €','#FF8888'],['À mettre de côté','1 554 €','#FFA94D']].map(([label,val,color])=>(
                <div key={label} className="dp-metric">
                  <div className="dp-metric-label">{label}</div>
                  <div className="dp-metric-val" style={{color}}>{val}</div>
                </div>
              ))}
            </div>
            <div className="dp-bar-section">
              <div className="dp-bar-label">Progression vers les seuils</div>
              {[['Seuil TVA','45%','#B5792A'],['Plafond','22%','#2D7A4F']].map(([label,pct,color])=>(
                <div key={label} className="dp-bar-row">
                  <span style={{fontSize:10,color:'rgba(255,255,255,.4)',width:70}}>{label}</span>
                  <div className="dp-bar-track"><div className="dp-bar-fill-el" style={{width:pct,background:color}}></div></div>
                  <span className="dp-bar-pct">{pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TARIFS */}
      <section className="pricing" id="tarifs">
        <div className="pricing-header">
          <span className="section-tag">Tarifs</span>
          <h2 className="section-title">Simple et <em>transparent.</em></h2>
          <p className="section-sub">Commence gratuitement. Passe à la version Pro quand tu en as besoin.</p>
        </div>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="plan-name">Gratuit</div>
            <div className="plan-price">0€ <span>/ mois</span></div>
            <div className="plan-desc">Pour découvrir Serelyo sans engagement</div>
            <div className="plan-features">
              {['Tableau de bord','Calculs URSSAF','Calendrier des échéances','3 devis par mois','Suivi des revenus'].map(f=><div key={f} className="plan-feature">{f}</div>)}
            </div>
            <a href="/signup" className="plan-cta">Commencer gratuitement</a>
          </div>
          <div className="pricing-card featured-plan">
            <div className="plan-badge">⭐ Le plus populaire</div>
            <div className="plan-name">Pro</div>
            <div className="plan-price">9€ <span>/ mois</span></div>
            <div className="plan-desc">Tout ce qu'il faut pour gérer son activité sereinement</div>
            <div className="plan-features">
              {['Tout du plan Gratuit','Devis illimités + PDF','Simulateur annuel complet','Assistant IA illimité','Rappels email avant déclarations','Export CSV pour comptable'].map(f=><div key={f} className="plan-feature">{f}</div>)}
            </div>
            <a href="/signup" className="plan-cta">Essayer 30 jours gratuits</a>
          </div>
          <div className="pricing-card">
            <div className="plan-name">Annuel</div>
            <div className="plan-price">79€ <span>/ an</span></div>
            <div className="plan-desc">Tout le plan Pro avec 2 mois offerts</div>
            <div className="plan-features">
              {['Tout du plan Pro','2 mois offerts','Support prioritaire','Nouvelles fonctionnalités en avant-première'].map(f=><div key={f} className="plan-feature">{f}</div>)}
            </div>
            <a href="/signup" className="plan-cta">Choisir l'annuel</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="faq-inner">
          <div className="faq-header">
            <span className="section-tag">Questions fréquentes</span>
            <h2 className="section-title">Tu as des <em>questions ?</em></h2>
          </div>
          {[
            ["Serelyo remplace-t-il un comptable ?", 'Non — Serelyo est un outil de suivi et de simulation, pas un outil comptable certifié. Pour des situations complexes, un expert-comptable reste indispensable. Serelyo te permet de mieux comprendre ta situation pour dialoguer plus efficacement avec lui.'],
            ["Les taux sont-ils vraiment à jour ?", 'Oui. Tous les taux URSSAF sont issus des sources officielles et mis à jour dès qu'une évolution est publiée. Les taux 2026 incluent la hausse pour les libéraux SSI et le changement ACRE de juillet 2026.'],
            ["Mes données sont-elles sécurisées ?", 'Oui. Serelyo utilise Supabase avec authentification robuste et des politiques de sécurité strictes. Tes données ne sont jamais partagées avec des tiers.'],
            ["Puis-je utiliser Serelyo sur mobile ?", "Oui, le site est responsive et fonctionne très bien sur smartphone. Tu peux aussi l'ajouter à ton écran d'accueil pour une expérience proche d'une app native."],
            ["Comment fonctionne l"essai gratuit Pro ?', 'Les 30 premiers jours du plan Pro sont offerts, sans carte bancaire requise. À l'issue, tu choisis de continuer ou de rester sur le plan Gratuit — sans engagement.'],
          ].map(([q,a])=>(
            <div key={q} className="faq-item">
              <button className="faq-q">
                {q}
                <span className="faq-arrow">+</span>
              </button>
              <div className="faq-a">{a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-final">
        <h2>Prêt à simplifier<br/><em>ton administratif ?</em></h2>
        <p>Rejoins les auto-entrepreneurs qui pilotent leur activité sereinement.</p>
        <a href="/signup" className="btn-primary" style={{fontSize:16,padding:'18px 44px'}}>Commencer gratuitement →</a>
        <p style={{marginTop:16,fontSize:12,color:'rgba(255,255,255,.2)'}}>Sans carte bancaire · Annulation à tout moment</p>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-top">
          <div>
            <div className="footer-logo">Serely<span>o</span></div>
            <div className="footer-tagline">Ton copilote administratif pour auto-entrepreneurs français.</div>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Produit</h4>
              <a href="#fonctionnalites">Fonctionnalités</a>
              <a href="#taux">Taux URSSAF 2026</a>
              <a href="#tarifs">Tarifs</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer-col">
              <h4>Ressources</h4>
              <a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noopener noreferrer">URSSAF officiel</a>
              <a href="https://www.service-public.fr" target="_blank" rel="noopener noreferrer">Service-Public.fr</a>
              <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer">Impots.gouv.fr</a>
            </div>
            <div className="footer-col">
              <h4>Légal</h4>
              <a href="/cgu">Conditions d'utilisation</a>
              <a href="/confidentialite">Politique de confidentialité</a>
              <a href="/mentions-legales">Mentions légales</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Serelyo. Tous droits réservés.</span>
          <div className="footer-legal">
            <a href="/cgu">CGU</a>
            <a href="/confidentialite">Confidentialité</a>
          </div>
        </div>
      </footer>
    </>
  )
}
