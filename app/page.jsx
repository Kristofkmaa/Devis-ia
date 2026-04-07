'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'

export default function HomePage() {
  const bgRef = useRef(null)

  useEffect(() => {
    // Redirect if logged in
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/dashboard'
    })

    // Scroll-driven background wave
    const onScroll = () => {
      if (!bgRef.current) return
      const s = window.scrollY
      const intensity = Math.min(1 + s * 0.0003, 1.3)
      const cx = 38 + s * 0.004
      const cy = 42 - s * 0.006
      const a1 = Math.min(0.38 * intensity, 0.52).toFixed(2)
      const a2 = Math.min(0.22 * intensity, 0.32).toFixed(2)
      const a3 = Math.min(0.18 * intensity, 0.26).toFixed(2)
      bgRef.current.style.backgroundImage = [
        `radial-gradient(ellipse 140% 120% at ${cx}% ${cy}%, rgba(70,8,120,${a1}) 0%, rgba(35,3,70,${a2}) 45%, transparent 72%)`,
        `radial-gradient(ellipse 90% 70% at ${98 - s*0.003}% ${90 + s*0.002}%, rgba(28,0,55,${a3}) 0%, transparent 62%)`,
      ].join(',')
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

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

    // Scroll reveal
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

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; background: #04000C; }
        body { font-family: 'Inter', sans-serif; color: #ffffff; overflow-x: hidden; background: transparent; }

        /* ── NAV ── */
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 0 5%; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(4,0,12,0.70);
          backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .nav-logo {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 16px; font-weight: 800;
          letter-spacing: .14em; text-transform: uppercase; color: #fff;
        }
        .nav-logo span { color: #f382ff; }
        .nav-links { display: flex; align-items: center; gap: 28px; }
        .nav-links a {
          font-size: 13px; color: rgba(255,255,255,0.45);
          text-decoration: none; font-weight: 500; transition: color .2s;
          font-family: 'Inter', sans-serif;
        }
        .nav-links a:hover { color: #fff; }
        .nav-cta {
          background: linear-gradient(135deg,#f382ff,#c081ff) !important;
          color: #07080F !important;
          padding: 9px 22px; border-radius: 9999px;
          font-weight: 700 !important; font-size: 13px !important;
          transition: all .2s !important; box-shadow: 0 4px 20px rgba(243,130,255,0.3);
        }
        .nav-cta:hover { opacity: .88; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(243,130,255,0.45) !important; }

        /* ── HERO ── */
        .hero {
          min-height: 100vh; position: relative;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 120px 5% 80px;
          overflow: hidden;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(243,130,255,0.10);
          border: 1px solid rgba(243,130,255,0.25);
          color: rgba(219,180,255,0.9); font-size: 11px; font-weight: 700;
          padding: 6px 18px; border-radius: 9999px;
          letter-spacing: .1em; text-transform: uppercase;
          margin-bottom: 28px; font-family: 'Inter', sans-serif;
          animation: fadeUp .6s ease both;
        }
        .hero-badge::before { content: '✦'; color: #f382ff; }
        .hero-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(42px, 7vw, 80px);
          font-weight: 800; line-height: 1.05; letter-spacing: -.03em;
          color: #fff; margin-bottom: 24px;
          animation: fadeUp .6s .1s ease both;
        }
        .hero-title em { font-style: italic; color: #f382ff; font-weight: 800; }
        .hero-sub {
          font-size: clamp(16px, 2vw, 19px);
          color: rgba(255,255,255,0.45);
          max-width: 540px; line-height: 1.75;
          margin-bottom: 44px; font-weight: 300;
          animation: fadeUp .6s .2s ease both;
        }
        .hero-actions {
          display: flex; gap: 14px; flex-wrap: wrap; justify-content: center;
          animation: fadeUp .6s .3s ease both;
        }
        .btn-primary {
          background: linear-gradient(135deg,#f382ff,#c081ff); color: #07080F;
          padding: 16px 36px; border-radius: 9999px;
          font-size: 15px; font-weight: 800; font-family: 'Inter', sans-serif;
          text-decoration: none; transition: all .25s;
          box-shadow: 0 8px 32px rgba(243,130,255,0.35);
        }
        .btn-primary:hover { opacity:.88; transform: translateY(-2px); box-shadow: 0 14px 40px rgba(243,130,255,0.45); }
        .btn-secondary {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(12px);
          color: rgba(255,255,255,0.7);
          padding: 16px 36px; border-radius: 9999px;
          font-size: 15px; font-weight: 600; font-family: 'Inter', sans-serif;
          text-decoration: none; transition: all .25s;
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.09); color: #fff; }
        .hero-note {
          margin-top: 20px; font-size: 12px;
          color: rgba(255,255,255,0.22); font-family: 'Inter', sans-serif;
          animation: fadeUp .6s .4s ease both;
        }
        .hero-stats {
          display: flex; gap: 0; margin-top: 72px;
          width: 100%; max-width: 680px;
          background: rgba(20,5,40,0.30);
          backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px; overflow: hidden;
          animation: fadeUp .6s .5s ease both;
        }
        .hero-stat {
          flex: 1; padding: 24px 16px; text-align: center;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .hero-stat:last-child { border-right: none; }
        .hero-stat-val {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 26px; font-weight: 800; color: #f382ff; margin-bottom: 6px;
        }
        .hero-stat-label { font-size: 11px; color: rgba(255,255,255,0.32); font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* ── SECTIONS ── */
        section { padding: 100px 5%; position: relative; }
        .section-tag {
          font-size: 10px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: #f382ff;
          margin-bottom: 14px; display: block; font-family: 'Inter', sans-serif;
        }
        .section-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(30px, 4vw, 48px); font-weight: 800;
          line-height: 1.1; letter-spacing: -.02em;
          color: #ffffff; margin-bottom: 18px;
        }
        .section-title em { font-style: italic; color: #f382ff; }
        .section-sub {
          font-size: 16px; color: rgba(255,255,255,0.45);
          line-height: 1.75; max-width: 520px; font-weight: 300;
          font-family: 'Inter', sans-serif;
        }

        /* ── GLASS CARD BASE ── */
        .glass {
          background: rgba(20,5,40,0.30);
          backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
        }

        /* ── PROBLÈME ── */
        .problem { background: transparent; }
        .problem-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 60px; align-items: center; max-width: 1100px; margin: 0 auto;
        }
        .problem-list { display: flex; flex-direction: column; gap: 12px; margin-top: 36px; }
        .problem-item {
          display: flex; gap: 14px; align-items: flex-start;
          padding: 18px 20px; border-radius: 14px;
          background: rgba(20,5,40,0.30);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
          transition: transform .2s, border-color .2s;
        }
        .problem-item:hover { transform: translateX(4px); border-color: rgba(243,130,255,0.25); }
        .problem-icon { font-size: 20px; flex-shrink: 0; }
        .problem-text strong { display: block; font-size: 14px; color: #fff; margin-bottom: 3px; font-weight: 600; }
        .problem-text span { font-size: 12px; color: rgba(255,255,255,0.38); }
        .problem-visual {
          background: rgba(20,5,40,0.40);
          backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 24px; padding: 32px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
        }
        .pv-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 6px; }
        .pv-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 4px; }
        .pv-sub { font-size: 12px; color: rgba(255,255,255,0.38); margin-bottom: 20px; }
        .pv-bar { height: 6px; background: rgba(255,255,255,0.07); border-radius: 20px; overflow: hidden; margin-bottom: 6px; }
        .pv-bar-fill { height: 100%; border-radius: 20px; }
        .pv-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 16px; }
        .pv-key { color: rgba(255,255,255,0.4); }
        .pv-num { color: #dbb4ff; font-weight: 600; }

        /* ── FONCTIONNALITÉS ── */
        .features { background: transparent; }
        .features-header { text-align: center; margin-bottom: 64px; }
        .features-header .section-sub { margin: 0 auto; }
        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 16px; max-width: 1100px; margin: 0 auto;
        }
        .feature-card {
          background: rgba(20,5,40,0.30);
          backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px; padding: 28px;
          transition: all .25s; position: relative; overflow: hidden;
        }
        .feature-card::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #f382ff, #c081ff);
          transform: scaleX(0); transform-origin: left; transition: transform .3s;
        }
        .feature-card:hover { border-color: rgba(243,130,255,0.25); transform: translateY(-4px); }
        .feature-card:hover::before { transform: scaleX(1); }
        .feature-emoji { font-size: 28px; margin-bottom: 16px; display: block; }
        .feature-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 17px; font-weight: 700; margin-bottom: 10px; color: #fff; }
        .feature-desc { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.7; }
        .feature-card.featured {
          background: rgba(243,130,255,0.10);
          border-color: rgba(243,130,255,0.25);
        }
        .feature-card.featured::before { transform: scaleX(1); }
        .feature-card.featured .feature-title { color: #fff; }
        .feature-card.featured .feature-desc { color: rgba(255,255,255,0.55); }

        /* ── TAUX ── */
        .taux-section { background: transparent; }
        .taux-header { text-align: center; margin-bottom: 56px; }
        .taux-header .section-sub { margin: 0 auto; }
        .taux-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 14px; max-width: 1000px; margin: 0 auto 48px;
        }
        .taux-card {
          background: rgba(20,5,40,0.30);
          backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px; padding: 22px 20px;
          display: flex; flex-direction: column; gap: 10px;
          transition: all .2s;
        }
        .taux-card:hover { border-color: rgba(243,130,255,0.3); transform: translateY(-2px); }
        .taux-secteur { font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 500; }
        .taux-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; font-weight: 800; color: #f382ff; }
        .taux-acre { font-size: 11px; color: #c081ff; font-weight: 700; background: rgba(192,129,255,0.12); padding: 3px 10px; border-radius: 9999px; display: inline-block; border: 1px solid rgba(192,129,255,0.2); }
        .taux-note {
          text-align: center; font-size: 12px; color: rgba(255,255,255,0.35);
          max-width: 600px; margin: 0 auto;
          background: rgba(20,5,40,0.30); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 14px 20px; line-height: 1.7;
        }
        .taux-note strong { color: rgba(255,255,255,0.6); }

        /* ── COMMENT ÇA MARCHE ── */
        .how { background: transparent; }
        .how-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .how-steps { display: flex; flex-direction: column; }
        .how-step {
          display: flex; gap: 20px; padding: 24px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: all .2s;
        }
        .how-step:last-child { border-bottom: none; }
        .how-step:hover { transform: translateX(4px); }
        .step-num {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg,#f382ff,#c081ff);
          color: #07080F; font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .step-content strong { display: block; font-size: 15px; color: #fff; margin-bottom: 5px; font-weight: 600; }
        .step-content span { font-size: 13px; color: rgba(255,255,255,0.38); line-height: 1.6; }
        .dashboard-preview {
          background: rgba(20,5,40,0.40);
          backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 24px; padding: 24px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07);
        }
        .dp-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
        .dp-dot { width: 10px; height: 10px; border-radius: 50%; }
        .dp-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: rgba(255,255,255,0.3); margin-left: auto; font-weight: 600; letter-spacing: .06em; }
        .dp-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        .dp-metric {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 14px;
        }
        .dp-metric-label { font-size: 9px; color: rgba(255,255,255,0.3); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 6px; }
        .dp-metric-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; }
        .dp-bar-section { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 14px; }
        .dp-bar-label { font-size: 10px; color: rgba(255,255,255,0.3); margin-bottom: 10px; font-weight: 600; letter-spacing: .06em; }
        .dp-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .dp-bar-track { flex: 1; height: 5px; background: rgba(255,255,255,0.06); border-radius: 20px; overflow: hidden; }
        .dp-bar-fill-el { height: 100%; border-radius: 20px; }
        .dp-bar-pct { font-size: 10px; color: rgba(255,255,255,0.3); width: 28px; text-align: right; }

        /* ── TARIFS ── */
        .pricing { background: transparent; }
        .pricing-header { text-align: center; margin-bottom: 56px; }
        .pricing-header .section-sub { margin: 0 auto; }
        .pricing-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; max-width: 900px; margin: 0 auto; }
        .pricing-card {
          background: rgba(20,5,40,0.30);
          backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 24px; padding: 32px;
          display: flex; flex-direction: column; transition: all .25s;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .pricing-card:hover { transform: translateY(-4px); border-color: rgba(243,130,255,0.2); }
        .pricing-card.featured-plan {
          background: rgba(243,130,255,0.10);
          border-color: rgba(243,130,255,0.35);
          position: relative; transform: scale(1.04);
          box-shadow: 0 0 40px rgba(243,130,255,0.12), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .pricing-card.featured-plan:hover { transform: scale(1.04) translateY(-4px); }
        .plan-badge {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg,#f382ff,#c081ff); color: #07080F;
          font-size: 11px; font-weight: 800; letter-spacing: .04em;
          padding: 4px 16px; border-radius: 9999px; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .plan-name { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 12px; font-family: 'Inter', sans-serif; }
        .plan-price { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 42px; font-weight: 800; color: #fff; margin-bottom: 4px; }
        .plan-price span { font-size: 16px; font-family: 'Inter', sans-serif; font-weight: 400; color: rgba(255,255,255,0.4); }
        .plan-desc { font-size: 13px; color: rgba(255,255,255,0.38); margin-bottom: 28px; line-height: 1.5; }
        .plan-features { flex: 1; display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .plan-feature { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.55); }
        .plan-feature::before { content: '✓'; color: #c081ff; font-weight: 700; flex-shrink: 0; }
        .featured-plan .plan-feature::before { color: #f382ff; }
        .plan-cta {
          display: block; text-align: center; padding: 13px;
          border-radius: 12px; font-size: 14px; font-weight: 700;
          text-decoration: none; transition: all .2s; font-family: 'Inter', sans-serif;
          background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.15);
        }
        .plan-cta:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .featured-plan .plan-cta {
          background: linear-gradient(135deg,#f382ff,#c081ff);
          color: #07080F; border-color: transparent;
          box-shadow: 0 4px 20px rgba(243,130,255,0.35);
        }
        .featured-plan .plan-cta:hover { opacity: .88; box-shadow: 0 8px 28px rgba(243,130,255,0.45); }

        /* ── FAQ ── */
        .faq { background: transparent; }
        .faq-inner { max-width: 700px; margin: 0 auto; }
        .faq-header { text-align: center; margin-bottom: 48px; }
        .faq-item { border-bottom: 1px solid rgba(255,255,255,0.07); }
        .faq-q {
          width: 100%; text-align: left; padding: 20px 0;
          font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.8);
          background: none; border: none; cursor: pointer;
          display: flex; justify-content: space-between; align-items: center;
          font-family: 'Inter', sans-serif; transition: color .2s;
        }
        .faq-q:hover { color: #f382ff; }
        .faq-arrow { transition: transform .3s; font-size: 18px; color: #f382ff; }
        .faq-item.open .faq-arrow { transform: rotate(45deg); }
        .faq-a {
          max-height: 0; overflow: hidden;
          font-size: 14px; color: rgba(255,255,255,0.45);
          line-height: 1.8; transition: max-height .3s ease, padding .3s;
          font-family: 'Inter', sans-serif;
        }
        .faq-item.open .faq-a { max-height: 200px; padding-bottom: 18px; }

        /* ── CTA FINAL ── */
        .cta-final {
          background: rgba(20,5,40,0.40);
          backdrop-filter: blur(28px);
          border-top: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          text-align: center; padding: 120px 5%;
        }
        .cta-final h2 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(36px, 5vw, 58px); font-weight: 800;
          letter-spacing: -.03em;
          color: #fff; margin-bottom: 20px;
        }
        .cta-final h2 em { font-style: italic; color: #f382ff; }
        .cta-final p { font-size: 17px; color: rgba(255,255,255,0.4); margin-bottom: 40px; font-weight: 300; }

        /* ── FOOTER ── */
        footer {
          background: rgba(4,0,12,0.85);
          backdrop-filter: blur(40px);
          padding: 48px 5% 32px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .footer-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; flex-wrap: wrap; gap: 32px; }
        .footer-logo { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #fff; margin-bottom: 10px; }
        .footer-logo span { color: #f382ff; }
        .footer-tagline { font-size: 13px; color: rgba(255,255,255,0.25); max-width: 220px; line-height: 1.6; }
        .footer-links { display: flex; gap: 48px; flex-wrap: wrap; }
        .footer-col h4 { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,0.25); margin-bottom: 16px; }
        .footer-col a { display: block; font-size: 13px; color: rgba(255,255,255,0.38); text-decoration: none; margin-bottom: 10px; transition: color .2s; }
        .footer-col a:hover { color: rgba(255,255,255,0.75); }
        .footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: rgba(255,255,255,0.18); flex-wrap: wrap; gap: 12px; }
        .footer-legal a { color: rgba(255,255,255,0.18); text-decoration: none; margin-left: 20px; transition: color .2s; }
        .footer-legal a:hover { color: rgba(255,255,255,0.4); }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .problem-grid, .how-inner, .pricing-grid, .features-grid, .taux-grid { grid-template-columns: 1fr; }
          .hero-stats { flex-direction: column; }
          .pricing-card.featured-plan { transform: none; }
          .nav-links { display: none; }
          .footer-links { gap: 32px; }
        }
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

      <div style={{position:'relative', zIndex:1}}>

      {/* NAV */}
      <nav>
        <div className="nav-logo">Serely<span>o</span></div>
        <div className="nav-links">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#taux">Taux URSSAF</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#faq">FAQ</a>
          <a href="/login">Connexion</a>
          <a href="/signup" className="nav-cta">Essayer gratuitement</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">Copilote pour auto-entrepreneurs</div>
        <h1 className="hero-title">L'administratif,<br/><em>enfin simple.</em></h1>
        <p className="hero-sub">Calculs URSSAF, devis, calendrier des déclarations, simulation annuelle — tout en un seul endroit, pensé pour les auto-entrepreneurs français.</p>
        <div className="hero-actions">
          <a href="/signup" className="btn-primary">Commencer gratuitement →</a>
          <a href="#fonctionnalites" className="btn-secondary">Voir comment ça marche</a>
        </div>
        <p className="hero-note">Sans carte bancaire · Gratuit pour commencer · Données sécurisées</p>
        <div className="hero-stats">
          {[["6","Secteurs activité"],["2026","Taux mis à jour"],["100%","Sources officielles"],["0€","Pour commencer"]].map(([val,label])=>(
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
                ["😰","Tu oublies les dates de déclaration","Et tu te retrouves avec des pénalités de retard inutiles"],
                ["🤯","Tu ne sais pas combien mettre de côté","URSSAF, impôts, CFE — le calcul est flou et stressant"],
                ["📄","Tes devis sont faits sur Word ou Excel","Pas de numérotation, pas de suivi, pas d'historique"],
                ["📊","Tu pilotes à l'aveugle","Sans visualisation claire de ta situation financière"],
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
              <div className="pv-bar"><div className="pv-bar-fill" style={{width:'62%',background:'linear-gradient(90deg,#f382ff,#c081ff)'}}></div></div>
              <div className="pv-row" style={{marginTop:6}}><span className="pv-key">Seuil TVA</span><span className="pv-num" style={{color:'#c081ff'}}>62% atteint</span></div>
              <div style={{height:1,background:'rgba(255,255,255,.06)',margin:'20px 0'}}></div>
              <div className="pv-label">Prochaine déclaration</div>
              <div style={{background:'rgba(243,130,255,0.10)',border:'1px solid rgba(243,130,255,0.25)',borderRadius:12,padding:'12px 14px',marginTop:8}}>
                <div style={{fontSize:13,color:'#dbb4ff',fontWeight:600}}>URSSAF — T2 2026</div>
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
            {emoji:"🧮",title:"Calculs URSSAF automatiques",desc:"Tu saisis ton CA, Serelyo calcule exactement ce que tu dois, ce que tu devras payer en impôts, et ce qu'il te reste vraiment.",featured:true},
            {emoji:"📅",title:"Calendrier des échéances",desc:"Toutes tes déclarations URSSAF, CFE et IR au même endroit. Avec un vrai calendrier visuel et tes rendez-vous personnels."},
            {emoji:"📊",title:"Simulation annuelle",desc:"Visualise toute ton année en un graphique. Stable, en croissance ou saisonnière — vois exactement ce que tu vas gagner."},
            {emoji:"📄",title:"Générateur de devis",desc:"Crée des devis professionnels en 2 minutes. Numérotation automatique, PDF imprimable, suivi des statuts."},
            {emoji:"💶",title:"Suivi des revenus",desc:"Saisis ton CA mois par mois et visualise ton historique avec le détail URSSAF, impôts et net pour chaque mois."},
            {emoji:"💬",title:"Assistant IA personnalisé",desc:"Pose tes questions en français simple. L'assistant connaît ton secteur et ta situation — ses réponses sont adaptées."},
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
            ["🔧","Services artisanaux (BIC)","21,2%","ACRE : 10,6%"],
            ["💼","Services freelance (BNC)","21,2%","ACRE : 10,6%"],
            ["🎓","Libéral non réglementé (SSI)","25,6%","ACRE : 12,8%"],
            ["🏛","Libéral réglementé (CIPAV)","23,2%","ACRE : 11,6%"],
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
                ["1","Crée ton compte gratuitement","Inscription en 30 secondes, sans carte bancaire."],
                ["2","Configure ton profil","Secteur, date de création, ACRE, taux — Serelyo adapte tous les calculs."],
                ["3","Saisis ton CA chaque mois","En 10 secondes. Serelyo calcule automatiquement tout le reste."],
                ["4","Pilote ton activité sereinement","Tableau de bord, devis, calendrier — tout est à ta portée."],
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
              {[["CA ce mois","4 200 €","#f382ff"],["Net estimé","2 646 €","#c081ff"],["URSSAF","890 €","#ff6e84"],["À mettre de côté","1 554 €","#dbb4ff"]].map(([label,val,color])=>(
                <div key={label} className="dp-metric">
                  <div className="dp-metric-label">{label}</div>
                  <div className="dp-metric-val" style={{color}}>{val}</div>
                </div>
              ))}
            </div>
            <div className="dp-bar-section">
              <div className="dp-bar-label">Progression vers les seuils</div>
              {[['Seuil TVA','45%','#f382ff'],['Plafond','22%','#c081ff']].map(([label,pct,color])=>(
                <div key={label} className="dp-bar-row">
                  <span style={{fontSize:10,color:'rgba(255,255,255,.35)',width:70}}>{label}</span>
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
            ["Serelyo remplace-t-il un comptable ?", "Non — Serelyo est un outil de suivi et de simulation, pas un outil comptable certifié. Pour des situations complexes, un expert-comptable reste indispensable. Serelyo te permet de mieux comprendre ta situation pour dialoguer plus efficacement avec lui."],
            ["Les taux sont-ils vraiment à jour ?", "Oui. Tous les taux URSSAF sont issus des sources officielles et mis à jour dès qu'une évolution est publiée. Les taux 2026 incluent la hausse pour les libéraux SSI et le changement ACRE de juillet 2026."],
            ["Mes données sont-elles sécurisées ?", "Oui. Serelyo utilise Supabase avec authentification robuste et des politiques de sécurité strictes. Tes données ne sont jamais partagées avec des tiers."],
            ["Puis-je utiliser Serelyo sur mobile ?", "Oui, le site est responsive et fonctionne très bien sur smartphone. Tu peux aussi l'ajouter à ton écran d'accueil pour une expérience proche d'une app native."],
            ["Comment fonctionne l'essai gratuit Pro ?", "Les 30 premiers jours du plan Pro sont offerts, sans carte bancaire requise. À l'issue, tu choisis de continuer ou de rester sur le plan Gratuit — sans engagement."],
          ].map(([q,a])=>(
            <div key={q} className="faq-item">
              <button className="faq-q">{q}<span className="faq-arrow">+</span></button>
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

      </div>{/* /zIndex wrapper */}
    </>
  )
}
