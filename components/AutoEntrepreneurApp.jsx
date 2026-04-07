'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'

// ─── Taux URSSAF officiels 2025/2026 (source : autoentrepreneur.urssaf.fr) ───
const TAUX = {
  ventes:          0.123,  // Vente de marchandises (BIC) — 12,3%
  services_bic:    0.212,  // Services commerciaux/artisanaux (BIC) — 21,2%
  services_bnc:    0.212,  // Services (BNC) — 21,2%
  liberal_ssi:     0.256,  // Libéral non réglementé régime général (SSI) — 25,6% depuis 2026
  liberal_cipav:   0.232,  // Libéral réglementé CIPAV (architecte, consultant…) — 23,2%
  lmtc:            0.060,  // Location meublée tourisme classée — 6%
}
// ACRE : exonération 50% jusqu'au 30/06/2026, puis 25% à partir du 01/07/2026
const TAUX_ACRE = {
  ventes:          0.0615,
  services_bic:    0.106,
  services_bnc:    0.106,
  liberal_ssi:     0.128,
  liberal_cipav:   0.116,
  lmtc:            0.030,
}
// Seuils 2026 (mis à jour)
const SEUILS = {
  tva_services:      36800,   // Franchise TVA services
  tva_ventes:        91900,   // Franchise TVA ventes
  plafond_services:  83600,   // Plafond micro services 2026
  plafond_ventes:   203100,   // Plafond micro ventes 2026
  plafond_lmtc:      15000,   // Location meublée tourisme non classé 2026
}
const SECTEURS = [
  { value:'ventes',        label:'🛍 Vente de marchandises — e-commerce, boutique, revendeur…', taux:'12,3%' },
  { value:'services_bic',  label:'🔧 Services commerciaux/artisanaux (BIC) — artisan, réparateur, restaurateur…', taux:'21,2%' },
  { value:'services_bnc',  label:'💼 Services (BNC) — freelance, formateur, rédacteur, photographe…', taux:'21,2%' },
  { value:'liberal_ssi',   label:'🎓 Profession libérale non réglementée (SSI) — coach, consultant, développeur…', taux:'25,6%' },
  { value:'liberal_cipav', label:'🏛 Profession libérale réglementée (CIPAV) — architecte, expert-comptable, géomètre…', taux:'23,2%' },
  { value:"lmtc",          label:"🏠 Location meublée tourisme classée (LMTC) — chambre d'hôtes, gîte classé…", taux:"6%" },
]
const MOIS_NOMS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const DEFAULT_FORM = {
  prenom:'', nom:'', activite:'', secteur:'services_bnc',
  date_creation:'', regime_declaration:'trimestriel',
  acre:false, acre_fin:'',
  objectif_ca:'', objectif_ca_mensuel:'',
  versement_liberatoire:false, taux_impot_perso:14,
  tva_active:false, regime_tva:'reel_normal',
  compte_bancaire_dedie:false, iban:'',
  regularite_revenus:'irreguliers', objectif_ae:'complement_revenu',
  statut_complementaire:'aucun', niveau:'debutant',
  prix_moyen_prestation:'', clients_par_mois:''
}

function getNow() {
  const d = new Date()
  return { year:d.getFullYear(), month:d.getMonth()+1, day:d.getDate() }
}
function formatMois(str) {
  const [y,m] = str.split('-')
  return MOIS_NOMS[+m-1]+' '+y
}
function getDateLimite(periode, type) {
  if (type==='mensuel') {
    const [y,m] = periode.split('-').map(Number)
    const nm = m===12?1:m+1, ny = m===12?y+1:y
    return `31/${String(nm).padStart(2,'0')}/${ny}`
  } else {
    const [y,t] = periode.split('-')
    const dates = { T1:`30/04/${y}`, T2:`31/07/${y}`, T3:`31/10/${y}`, T4:`31/01/${+y+1}` }
    return dates[t]||'—'
  }
}
function genererCalendrier(profil) {
  if (!profil) return []
  const { year, month } = getNow()
  const events = []
  const regime = profil.regime_declaration||'trimestriel'
  if (regime==='mensuel') {
    for (let i=-2;i<=4;i++) {
      let m=month+i, y=year
      if (m<=0){m+=12;y--} if (m>12){m-=12;y++}
      const periode=`${y}-${String(m).padStart(2,'0')}`
      events.push({ id:periode, periode, type:'mensuel', label:`Déclaration URSSAF — ${formatMois(periode)}`, date_limite:getDateLimite(periode,'mensuel'), past:y<year||(y===year&&m<month), current:y===year&&m===month })
    }
  } else {
    for (let i=-1;i<=2;i++) {
      let t=Math.ceil(month/3)+i, y=year
      while(t<=0){t+=4;y--} while(t>4){t-=4;y++}
      const periode=`${y}-T${t}`
      const trimNoms={T1:'1er trimestre (jan-mar)',T2:'2e trimestre (avr-jun)',T3:'3e trimestre (jul-sep)',T4:'4e trimestre (oct-déc)'}
      events.push({ id:periode, periode, type:'trimestriel', label:`Déclaration URSSAF — ${trimNoms['T'+t]} ${y}`, date_limite:getDateLimite(periode,'trimestriel'), past:y<year||(y===year&&t<Math.ceil(month/3)), current:y===year&&t===Math.ceil(month/3) })
    }
  }
  events.push({ id:`CFE-${year}`, periode:`${year}-12`, type:'cfe', label:`CFE — Cotisation Foncière des Entreprises ${year}`, date_limite:`15/12/${year}`, past:false, current:false, special:true })
  events.push({ id:`IR-${year}`, periode:`${year}-05`, type:'ir', label:`Déclaration Impôt sur le Revenu ${year}`, date_limite:`31/05/${year+1}`, past:false, current:false, special:true })
  return events.sort((a,b)=>a.id.localeCompare(b.id))
}

export default function AutoEntrepreneurApp({ user, onLogout }) {
  const supabase = createClient()
  const [view, setView]         = useState('dashboard')
  const [profil, setProfil]     = useState(null)
  const [revenus, setRevenus]   = useState([])
  const [declarations, setDecl] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [oForm, setOForm]       = useState(DEFAULT_FORM)
  const [calcCA, setCalcCA]         = useState('')
  const [calcResult, setCalcResult] = useState(null)
  const [question, setQuestion]     = useState('')
  const [reponse, setReponse]       = useState('')
  const [asking, setAsking]         = useState(false)
  const [histoQ, setHistoQ]         = useState([])
  const [revMoisNum, setRevMoisNum] = useState(String(new Date().getMonth()+1).padStart(2,'0'))
  const [revAnnee, setRevAnnee]     = useState(String(new Date().getFullYear()))
  const [revMontant, setRevMontant] = useState('')
  const [savingRev, setSavingRev]   = useState(false)
  const [histoAnnee, setHistoAnnee] = useState(String(new Date().getFullYear()))

  // Calendrier mobile
  const [calMoisActif, setCalMoisActif] = useState(new Date().getMonth())
  const [calTouchStart, setCalTouchStart] = useState(null)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 700)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', check)
    check()
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Background wave on scroll ──────────────────────────────────────────────
  const bgRef = useRef(null)
  useEffect(() => {
    const onScroll = () => {
      if (!bgRef.current) return
      const s = window.scrollY
      // Intensité augmente légèrement au scroll → le fond "gagne" en profondeur
      const intensity = Math.min(1 + s * 0.0004, 1.35)
      const cx = 38 + s * 0.004
      const cy = 42 - s * 0.006
      const alpha1 = Math.min(0.38 * intensity, 0.55)
      const alpha2 = Math.min(0.22 * intensity, 0.35)
      const alpha3 = Math.min(0.18 * intensity, 0.28)
      bgRef.current.style.backgroundImage = [
        // Grande nappe principale — s'intensifie doucement au scroll
        `radial-gradient(ellipse 140% 120% at ${cx}% ${cy}%, rgba(70,8,120,${alpha1.toFixed(2)}) 0%, rgba(35,3,70,${alpha2.toFixed(2)}) 45%, transparent 72%)`,
        // Bord sombre qui s'épaissit → effet d'atténuation
        `radial-gradient(ellipse 90% 70% at ${98 - s*0.003}% ${90 + s*0.002}%, rgba(28,0,55,${alpha3.toFixed(2)}) 0%, transparent 62%)`,
      ].join(',')
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Simulateur
  const [simMode, setSimMode]         = useState('mensuel') // mensuel | annuel
  const [simCA, setSimCA]             = useState('')
  const [simMoisActifs, setSimMoisActifs] = useState(12)
  const [simVariation, setSimVariation]   = useState('stable') // stable | croissance | saisonnalite
  const [simResult, setSimResult]     = useState(null)

  // Rendez-vous personnels
  const [rdvList, setRdvList]         = useState([])
  const [showRdvModal, setShowRdvModal] = useState(false)
  const [rdvJour, setRdvJour]         = useState(null)   // { moisIdx, jour, moisNom }
  const [rdvForm, setRdvForm]         = useState({ titre:'', heure:'09:00', type:'rdv', notes:'' })
  const [rdvEditing, setRdvEditing]   = useState(null)

  // Devis
  const [devis, setDevis]           = useState([])
  const [showDevisForm, setShowDevisForm] = useState(false)
  const [devisPreview, setDevisPreview]   = useState(null) // devis en aperçu
  const [devisFiltre, setDevisFiltre]     = useState('tous')
  const [devisClient, setDevisClient] = useState({ nom:'', adresse:'', email:'', type:'entreprise' })
  const [devisLignes, setDevisLignes] = useState([
    { id:1, designation:'', detail:'', quantite:1, unite:'heure', prix:0 },
    { id:2, designation:'', detail:'', quantite:1, unite:'heure', prix:0 },
  ])
  const [devisLigneId, setDevisLigneId] = useState(2)
  const [devisTva, setDevisTva]     = useState(0)
  const [devisValidite, setDevisValidite] = useState('30')
  const [devisConditions, setDevisConditions] = useState('Paiement à 30 jours à réception de facture')
  const [devisNotes, setDevisNotes] = useState('')
  const [savingDevis, setSavingDevis] = useState(false)
  const [devisCounter, setDevisCounter] = useState(1)

  useEffect(() => { if (user) loadAll() }, [user])

  const loadAll = async () => {
    setLoading(true)
    const { data:p } = await supabase.from('ae_profiles').select('*').eq('user_id',user.id).single()
    if (p) {
      setProfil(p)
      setOForm({
        prenom: p.prenom||'', nom: p.nom||'', activite: p.activite||'',
        secteur: p.secteur||'services_bnc', date_creation: p.date_creation||'',
        regime_declaration: p.regime_declaration||'trimestriel',
        acre: p.acre||false, acre_fin: p.acre_fin||'',
        objectif_ca: p.objectif_ca||'', objectif_ca_mensuel: p.objectif_ca_mensuel||'',
        versement_liberatoire: p.versement_liberatoire||false,
        taux_impot_perso: p.taux_impot_perso||14,
        tva_active: p.tva_active||false, regime_tva: p.regime_tva||'reel_normal',
        compte_bancaire_dedie: p.compte_bancaire_dedie||false, iban: p.iban||'',
        regularite_revenus: p.regularite_revenus||'irreguliers',
        objectif_ae: p.objectif_ae||'complement_revenu',
        statut_complementaire: p.statut_complementaire||'aucun',
        niveau: p.niveau||'debutant',
        prix_moyen_prestation: p.prix_moyen_prestation||'',
        clients_par_mois: p.clients_par_mois||''
      })
    } else setShowOnboarding(true)
    const { data:r } = await supabase.from('ae_revenus').select('*').eq('user_id',user.id).order('mois',{ascending:false})
    if (r) setRevenus(r)
    const { data:d } = await supabase.from('ae_declarations').select('*').eq('user_id',user.id).order('created_at',{ascending:false})
    if (d) setDecl(d)
    const { data:q } = await supabase.from('ae_questions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20)
    if (q) setHistoQ(q)
    const { data:dv } = await supabase.from('ae_devis').select('*').eq('user_id',user.id).order('created_at',{ascending:false})
    if (dv) { setDevis(dv); if(dv.length>0) setDevisCounter(dv.length+1) }
    const { data:rdv } = await supabase.from('ae_rdv').select('*').eq('user_id',user.id).order('date',{ascending:true})
    if (rdv) setRdvList(rdv)
    setLoading(false)
  }

  const saveProfil = async () => {
    if (!oForm.prenom||!oForm.secteur||!oForm.date_creation) { alert('Remplis les champs obligatoires (*)'); return }
    const data = {
      ...oForm, user_id:user.id,
      objectif_ca: parseFloat(oForm.objectif_ca)||0,
      objectif_ca_mensuel: parseFloat(oForm.objectif_ca_mensuel)||0,
      taux_impot_perso: parseFloat(oForm.taux_impot_perso)||14,
      prix_moyen_prestation: parseFloat(oForm.prix_moyen_prestation)||0,
      clients_par_mois: parseFloat(oForm.clients_par_mois)||0,
    }
    await supabase.from('ae_profiles').upsert(data,{onConflict:'user_id'})
    setProfil(data); setShowOnboarding(false)
  }

  const saveRevenu = async () => {
    if (!revMontant) { alert('Remplis le montant'); return }
    const moisKey = revAnnee + '-' + revMoisNum
    setSavingRev(true)
    // Vérifier si ce mois existe déjà
    const { data: existing } = await supabase.from('ae_revenus').select('id').eq('user_id',user.id).eq('mois',moisKey).single()
    let error
    if (existing) {
      const res = await supabase.from('ae_revenus').update({ montant: parseFloat(revMontant)||0 }).eq('id',existing.id)
      error = res.error
    } else {
      const res = await supabase.from('ae_revenus').insert({ user_id:user.id, mois:moisKey, montant:parseFloat(revMontant)||0 })
      error = res.error
    }
    if (error) { alert('Erreur : '+error.message); setSavingRev(false); return }
    const newEntry = { user_id:user.id, mois:moisKey, montant:parseFloat(revMontant)||0 }
    setRevenus(prev=>[newEntry,...prev.filter(r=>r.mois!==moisKey)].sort((a,b)=>b.mois.localeCompare(a.mois)))
    setRevMontant(''); setSavingRev(false)
  }

  const marquerDeclaration = async (periode, type, statut) => {
    const data = { user_id:user.id, periode, type_periode:type, statut, date_limite:getDateLimite(periode,type), date_declaration:statut==='faite'?new Date().toLocaleDateString('fr-FR'):null, ca_declare:0 }
    const existing = declarations.find(d=>d.periode===periode)
    if (existing) {
      await supabase.from('ae_declarations').update({statut,date_declaration:data.date_declaration}).eq('id',existing.id)
      setDecl(prev=>prev.map(d=>d.periode===periode?{...d,statut}:d))
    } else {
      const { data:inserted } = await supabase.from('ae_declarations').insert(data).select().single()
      if (inserted) setDecl(prev=>[inserted,...prev])
    }
  }

  const poserQuestion = async () => {
    if (!question.trim()) return
    setAsking(true); setReponse('')
    try {
      const res = await fetch('/api/assistant',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({question,profil}) })
      const data = await res.json()
      if (data.reponse) {
        setReponse(data.reponse)
        const row = { user_id:user.id, question, reponse:data.reponse }
        const { data:saved } = await supabase.from('ae_questions').insert(row).select().single()
        if (saved) setHistoQ(prev=>[saved,...prev.slice(0,19)])
      }
    } catch(e) { setReponse('Erreur : '+e.message) }
    setAsking(false)
  }

  // ─── Devis functions ──────────────────────
  const devisHT = devisLignes.reduce((s,l)=>s+(l.quantite*l.prix),0)
  const devisTVA_montant = devisHT * (devisTva/100)
  const devisTTC = devisHT + devisTVA_montant

  const addLigne = () => {
    const id = devisLigneId + 1
    setDevisLigneId(id)
    setDevisLignes(prev=>[...prev, { id, designation:'', detail:'', quantite:1, unite:'heure', prix:0 }])
  }

  const updateLigne = (id, field, val) => {
    setDevisLignes(prev=>prev.map(l=>l.id===id?{...l,[field]:field==='quantite'||field==='prix'?parseFloat(val)||0:val}:l))
  }

  const removeLigne = (id) => {
    setDevisLignes(prev=>prev.filter(l=>l.id!==id))
  }

  const genNumeroDevis = () => {
    const d = new Date()
    const yr = d.getFullYear()
    const mn = String(d.getMonth()+1).padStart(2,'0')
    return `DEV-${yr}${mn}-${String(devisCounter).padStart(3,'0')}`
  }

  const saveDevis = async (statut='en_attente') => {
    if (!devisClient.nom) { alert('Le nom du client est obligatoire'); return }
    if (devisLignes.filter(l=>l.designation).length===0) { alert('Ajoute au moins une prestation'); return }
    setSavingDevis(true)
    const numero = genNumeroDevis()
    const dateEmission = new Date().toLocaleDateString('fr-FR')
    const dateValidite = new Date(Date.now() + parseInt(devisValidite)*24*60*60*1000).toLocaleDateString('fr-FR')
    const payload = {
      user_id: user.id,
      numero, statut,
      date_emission: dateEmission,
      date_validite: dateValidite,
      client_nom: devisClient.nom,
      client_adresse: devisClient.adresse,
      client_email: devisClient.email,
      client_type: devisClient.type,
      lignes: JSON.stringify(devisLignes.filter(l=>l.designation)),
      tva_taux: devisTva,
      total_ht: devisHT,
      total_ttc: devisTTC,
      conditions: devisConditions,
      notes: devisNotes,
      validite_jours: devisValidite,
    }
    const { data:saved, error } = await supabase.from('ae_devis').insert(payload).select().single()
    if (error) { alert('Erreur : '+error.message); setSavingDevis(false); return }
    setDevis(prev=>[saved,...prev])
    setDevisCounter(c=>c+1)
    setSavingDevis(false)
    setShowDevisForm(false)
    // Reset form
    setDevisClient({ nom:'', adresse:'', email:'', type:'entreprise' })
    setDevisLignes([{id:1,designation:'',detail:'',quantite:1,unite:'heure',prix:0},{id:2,designation:'',detail:'',quantite:1,unite:'heure',prix:0}])
    setDevisLigneId(2)
    setDevisNotes('')
    // Ouvrir aperçu
    if (saved) { setDevisPreview(saved); imprimerDevis(saved, profil) }
  }

  const updateStatutDevis = async (id, statut) => {
    await supabase.from('ae_devis').update({statut}).eq('id',id)
    setDevis(prev=>prev.map(d=>d.id===id?{...d,statut}:d))
  }

  const supprimerDevis = async (id) => {
    if (!confirm('Supprimer ce devis ?')) return
    await supabase.from('ae_devis').delete().eq('id',id)
    setDevis(prev=>prev.filter(d=>d.id!==id))
  }

  // ─── RDV functions ─────────────────────────
  const saveRdv = async () => {
    if (!rdvForm.titre.trim() || !rdvJour) return
    const date = `${year}-${String(rdvJour.moisIdx+1).padStart(2,'0')}-${String(rdvJour.jour).padStart(2,'0')}`
    const payload = { user_id:user.id, date, titre:rdvForm.titre, heure:rdvForm.heure, type:rdvForm.type, notes:rdvForm.notes }
    if (rdvEditing) {
      const { data } = await supabase.from('ae_rdv').update(payload).eq('id',rdvEditing).select().single()
      if (data) setRdvList(prev=>prev.map(r=>r.id===rdvEditing?data:r))
    } else {
      const { data } = await supabase.from('ae_rdv').insert(payload).select().single()
      if (data) setRdvList(prev=>[...prev,data].sort((a,b)=>a.date.localeCompare(b.date)))
    }
    setShowRdvModal(false)
    setRdvForm({ titre:'', heure:'09:00', type:'rdv', notes:'' })
    setRdvEditing(null)
  }

  const deleteRdv = async (id) => {
    await supabase.from('ae_rdv').delete().eq('id',id)
    setRdvList(prev=>prev.filter(r=>r.id!==id))
  }

  const openRdvModal = (moisIdx, jour, moisNom) => {
    setRdvJour({ moisIdx, jour, moisNom })
    setRdvForm({ titre:'', heure:'09:00', type:'rdv', notes:'' })
    setRdvEditing(null)
    setShowRdvModal(true)
  }

  const RDV_TYPES = {
    rdv:      { label:'Rendez-vous',   color:'#dbb4ff', bg:'rgba(0,120,220,0.18)', emoji:'📅' },
    client:   { label:'Client',         color:'#c081ff', bg:'rgba(0,200,160,0.12)', emoji:'🤝' },
    admin:    { label:'Administratif',  color:'#f382ff', bg:'rgba(255,160,60,0.12)', emoji:'📋' },
    perso:    { label:'Personnel',      color:'#f382ff', bg:'rgba(157,78,221,0.18)', emoji:'👤' },
    rappel:   { label:'Rappel',         color:'#ff6e84', bg:'rgba(255,100,100,0.12)', emoji:'⏰' },
  }

  const imprimerDevis = (d, em) => {
    const lignes = typeof d.lignes === 'string' ? JSON.parse(d.lignes||'[]') : (d.lignes||[])
    const ht = lignes.reduce((s,l)=>s+(l.quantite*l.prix),0)
    const tva = ht*(d.tva_taux/100)
    const ttc = ht+tva
    const fmt = v => (+v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})
    const rows = lignes.map(l=>`
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #F6F0E4;vertical-align:top">
          <strong style="color:#1C1710">${l.designation}</strong>
          ${l.detail?`<br><span style="font-size:11px;color:#6B5E45">${l.detail}</span>`:''}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #F6F0E4;text-align:center">${l.quantite} ${l.unite}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #F6F0E4;text-align:right">${fmt(l.prix)} €</td>
        <td style="padding:10px 8px;border-bottom:1px solid #F6F0E4;text-align:right;font-weight:600">${fmt(l.quantite*l.prix)} €</td>
      </tr>`).join('')
    const tvaNote = d.tva_taux===0 ? '<p style="margin-top:12px;font-size:10px;color:#A89878">TVA non applicable en vertu de l&#39;article 293B du CGI.</p>' : ''
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Devis ${d.numero}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;color:#1C1710;background:#fff;padding:40px 50px;max-width:800px;margin:0 auto}
      .stripe{height:6px;background:linear-gradient(90deg,#B5792A,#D4A456);margin-bottom:36px;border-radius:2px}
      h1{font-family:'Playfair Display',serif;font-size:38px;font-weight:600;margin-bottom:8px}
      .badge{display:inline-block;background:#FAF3E0;color:#B5792A;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;margin-bottom:24px}
      .head{display:flex;justify-content:space-between;margin-bottom:28px}
      .ref{text-align:right;font-size:12px;color:#A89878;line-height:2}
      .ref strong{font-family:'Playfair Display',serif;font-size:17px;color:#1C1710;display:block}
      .sep{height:1px;background:#E2D8C4;margin:20px 0}
      .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
      .plbl{font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#A89878;margin-bottom:6px}
      .pname{font-family:'Playfair Display',serif;font-size:17px;margin-bottom:4px}
      .psub{font-size:12px;color:#6B5E45;line-height:1.6}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      thead tr{border-bottom:2px solid #1C1710}
      th{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6B5E45;padding:0 8px 10px;text-align:left}
      th:not(:first-child){text-align:right} th:nth-child(2){text-align:center}
      .totals{display:flex;flex-direction:column;align-items:flex-end;gap:8px;margin-bottom:24px}
      .trow{display:flex;gap:60px;font-size:13px;color:#6B5E45}
      .tgrand{display:flex;gap:60px;align-items:center;background:#FAF3E0;border-radius:12px;padding:12px 20px;margin-top:4px}
      .tgrand span:first-child{font-size:13px;color:#6B5E45}
      .tgrand span:last-child{font-family:'Playfair Display',serif;font-size:22px;color:#1C1710}
      .footer-box{background:#F6F0E4;border-radius:10px;padding:14px 18px;margin-top:20px}
      .footer-box p{font-size:11px;color:#6B5E45;line-height:1.8;margin-bottom:4px}
      .footer-box strong{color:#1C1710}
      .legal{margin-top:24px;font-size:10px;color:#A89878;text-align:center;line-height:1.7;border-top:1px solid #E2D8C4;padding-top:16px}
      @media print{.no-print{display:none!important}body{padding:0}@page{margin:12mm 10mm}}
    </style></head><body>
    <div class="no-print" style="background:#1C1710;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;margin:-40px -50px 30px;position:sticky;top:0;z-index:10">
      <span style="color:#E8D5A8;font-family:'Playfair Display',serif;font-size:16px">Serelyo — Aperçu du devis</span>
      <button onclick="window.print()" style="background:#B5792A;color:#fff;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-family:Outfit,sans-serif;font-size:13px;font-weight:600">🖨 Imprimer / Sauvegarder PDF</button>
    </div>
    <div class="stripe"></div>
    <div class="head">
      <div><h1>Devis</h1><div class="badge">En attente de validation</div></div>
      <div class="ref">
        <strong>${d.numero}</strong>
        Emis le ${d.date_emission}<br>
        Valable jusqu'au <strong style="color:#1C1710">${d.date_validite}</strong>
      </div>
    </div>
    <div class="sep"></div>
    <div class="parties">
      <div>
        <div class="plbl">Emetteur</div>
        <div class="pname">${em?.nom||'—'}</div>
        <div class="psub">${[em?.activite,em?.adresse,em?.email,em?.tel].filter(Boolean).join('<br>')}</div>
        ${em?.siret?`<div class="psub" style="margin-top:6px">SIRET : ${em.siret}</div>`:''}
      </div>
      <div>
        <div class="plbl">Client</div>
        <div class="pname">${d.client_nom}</div>
        <div class="psub">
          ${d.client_type==='entreprise'?'Entreprise':'Particulier'}
          ${d.client_adresse?'<br>'+d.client_adresse:''}
          ${d.client_email?'<br>'+d.client_email:''}
        </div>
      </div>
    </div>
    <table>
      <thead><tr><th>Designation</th><th style="text-align:center">Qte</th><th style="text-align:right">Prix unitaire HT</th><th style="text-align:right">Total HT</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="trow"><span>Total HT</span><span>${fmt(ht)} €</span></div>
      <div class="trow"><span>TVA ${d.tva_taux > 0 ? d.tva_taux+'%' : '(non applicable)'}</span><span>${fmt(tva)} €</span></div>
      <div class="tgrand"><span>${d.tva_taux>0?'Total TTC':'Total net HT'}</span><span>${fmt(ttc)} €</span></div>
    </div>
    <div class="footer-box">
      ${d.conditions?`<p><strong>Conditions :</strong> ${d.conditions}</p>`:''}
      <p><strong>Validite :</strong> Ce devis est valable ${d.validite_jours} jours a compter de sa date d&#39;emission.</p>
      ${d.notes?`<p><strong>Notes :</strong> ${d.notes}</p>`:''}
      <p style="margin-top:8px;font-size:10px;color:#A89878">Bon pour accord — Date et signature du client :</p>
      <div style="border:1px solid #E2D8C4;border-radius:8px;height:50px;margin-top:6px"></div>
    </div>
    ${tvaNote}
    <div class="legal">
      ${em?.nom||''} ${em?.forme_juridique?'— '+em.forme_juridique:''} ${em?.siret?'— SIRET : '+em.siret:''}<br>
      Document genere par Serelyo — serelyo.fr
    </div>
    </body></html>`
    const w = window.open('','_blank','width=900,height=700,scrollbars=yes')
    if (w) { w.document.write(html); w.document.close() }
  }

  const tauxImpot = profil ? (parseFloat(profil.taux_impot_perso)||14) / 100 : 0.14

  const calculer = () => {
    const ca = parseFloat(calcCA)||0
    if (!ca||!profil) return
    const taux = profil.acre ? TAUX_ACRE[profil.secteur] : TAUX[profil.secteur]
    const cotisations = ca*taux
    const impots_estimes = ca*tauxImpot
    const seuil_tva = profil.secteur==='ventes'?SEUILS.tva_ventes:SEUILS.tva_services
    const plafond = profil.secteur==='ventes'?SEUILS.plafond_ventes:profil.secteur==='lmtc'?SEUILS.plafond_lmtc:SEUILS.plafond_services
    const caAnnuel = revenus.slice(0,12).reduce((s,r)=>s+r.montant,0)+ca
    setCalcResult({ ca, cotisations, impots_estimes, taux, tauxImpot, a_mettre_de_cote:cotisations+impots_estimes, net_estime:ca-cotisations-impots_estimes, seuil_tva, plafond, caAnnuel, alerte_tva:caAnnuel>seuil_tva*0.85, alerte_plafond:caAnnuel>plafond*0.85 })
  }

  const { year, month } = getNow()
  const caAnnuel      = revenus.filter(r=>r.mois.startsWith(String(year))).reduce((s,r)=>s+r.montant,0)
  const caMois        = revenus.find(r=>r.mois===`${year}-${String(month).padStart(2,'0')}`)?.montant||0
  const taux          = profil?(profil.acre?TAUX_ACRE[profil.secteur]:TAUX[profil.secteur]):0
  const cotisAnnuel   = caAnnuel*taux
  const seuil_tva     = profil?.secteur==='ventes'?SEUILS.tva_ventes:SEUILS.tva_services
  const plafond       = profil?.secteur==='ventes'?SEUILS.plafond_ventes:profil?.secteur==='lmtc'?SEUILS.plafond_lmtc:SEUILS.plafond_services
  const pctTVA        = Math.min((caAnnuel/seuil_tva)*100,100)
  const pctPlafond    = Math.min((caAnnuel/plafond)*100,100)
  const calendrier    = profil?genererCalendrier(profil):[]
  const prochaineDecl = calendrier.find(e=>!e.past&&!e.special)

  const F = (v) => v ? `${oForm[v]}` : ''
  const set = (k) => (e) => setOForm(p=>({...p,[k]:e.target.value}))
  const setBool = (k) => (e) => setOForm(p=>({...p,[k]:e.target.value==='oui'}))

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>
      <div style={{width:28,height:28,border:'2.5px solid rgba(255,255,255,0.1)',borderTopColor:'#f382ff',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style>{CSS}</style>

      {/* FIXED NEBULA BACKGROUND — positions animated via scroll */}
      <div ref={bgRef} style={{
        position:'fixed',inset:0,zIndex:0,pointerEvents:'none',
        backgroundColor:'#04000C',
        backgroundImage:[
          'radial-gradient(ellipse 140% 120% at 38% 42%, rgba(70,8,120,0.38) 0%, rgba(35,3,70,0.22) 45%, transparent 72%)',
          'radial-gradient(ellipse 90% 70% at 98% 90%, rgba(28,0,55,0.18) 0%, transparent 62%)',
        ].join(','),
      }}/>

      {/* APP BAR */}
      <div className="app-bar">
        <div className="logo">Serely<span>o</span></div>
        <div className="bar-right">
          <span className="user-tag">{profil?`${profil.prenom} ${profil.nom}`:user.email}</span>
          <button className="btn-profile" onClick={()=>setShowOnboarding(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            Mon profil
          </button>
          <button className="btn-logout" onClick={onLogout}>Déconnexion</button>
        </div>
      </div>

      {/* NAV */}
      <div className="nav-tabs">
        {[
          ['dashboard','🏠','Accueil'],
          ['calendrier','📅','Calendrier'],
          ['revenus','💶','Revenus'],
          ['simulateur','🧮','Calculs'],
          ['devis','📄','Devis'],
          ['assistant','💬','Assistant'],
          ['ressources','📚','Ressources'],
        ].map(([v,emoji,label])=>(
          <button key={v} className={`nav-tab ${view===v?'active':''}`} onClick={()=>setView(v)}>
            <span style={{display:'block',fontSize:18,lineHeight:1,marginBottom:2}}>{emoji}</span>
            <span style={{fontSize:10,display:'block'}}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── MODAL PROFIL ── */}
      {showOnboarding && (
        <div className="overlay show" onClick={e=>{if(profil&&e.target.className.includes('overlay'))setShowOnboarding(false)}}>
          <div className="modal" style={{maxWidth:620}}>
            <div className="modal-title">{profil?'Mon profil':'Bienvenue ! Configurons ton profil 👋'}</div>
            <p className="modal-sub">Plus ton profil est complet, plus les calculs, alertes et réponses IA seront utiles.</p>

            <div className="prof-section-title">Informations de base</div>
            <div className="form-grid">
              <div className="field"><label>Prénom *</label><input value={oForm.prenom} onChange={set('prenom')} placeholder="Jean"/></div>
              <div className="field"><label>Nom *</label><input value={oForm.nom} onChange={set('nom')} placeholder="Dupont"/></div>
              <div className="field full"><label>Activité *</label><input value={oForm.activite} onChange={set('activite')} placeholder="Plombier, graphiste freelance, coach…"/></div>
              <div className="field full">
                <label>Secteur d'activité * <span style={{fontWeight:400,color:'rgba(255,255,255,0.38)'}}>(détermine ton taux URSSAF)</span></label>
                <select value={oForm.secteur} onChange={set('secteur')}>
                  {SECTEURS.map(s=><option key={s.value} value={s.value}>{s.label} → {s.taux}</option>)}
                </select>
                <div style={{marginTop:6,fontSize:12,color:'#f382ff',background:'rgba(255,255,255,0.06)',borderRadius:8,padding:'6px 10px'}}>
                  ⚠️ Ton taux URSSAF : <strong>{TAUX[oForm.secteur]*100}%</strong>
                  {oForm.acre && <span> → avec ACRE : <strong>{TAUX_ACRE[oForm.secteur]*100}%</strong></span>}
                </div>
              </div>
              <div className="field"><label>Date de création *</label><input type="date" value={oForm.date_creation} onChange={set('date_creation')}/></div>
              <div className="field">
                <label>Régime déclaration URSSAF</label>
                <select value={oForm.regime_declaration} onChange={set('regime_declaration')}>
                  <option value="mensuel">Mensuel</option>
                  <option value="trimestriel">Trimestriel (défaut)</option>
                </select>
              </div>
              <div className="field"><label>Objectif CA annuel (€)</label><input type="number" value={oForm.objectif_ca} onChange={set('objectif_ca')} placeholder="24000"/></div>
              <div className="field"><label>Objectif CA mensuel (€)</label><input type="number" value={oForm.objectif_ca_mensuel} onChange={set('objectif_ca_mensuel')} placeholder="2000"/></div>
              <div className="field">
                <label>ACRE ? <span style={{fontWeight:400,color:'rgba(255,255,255,0.38)'}}>(exonération 1ère année)</span></label>
                <select value={oForm.acre?'oui':'non'} onChange={setBool('acre')}>
                  <option value="non">Non</option>
                  <option value="oui">Oui — 50% du taux (jusqu'au 30/06/2026)</option>
                </select>
              </div>
              {oForm.acre&&<div className="field"><label>Date de fin ACRE</label><input type="date" value={oForm.acre_fin} onChange={set('acre_fin')}/></div>}
            </div>

            <div className="prof-section-title">Fiscalité & TVA</div>
            <div className="form-grid">
              <div className="field">
                <label>Versement libératoire</label>
                <select value={oForm.versement_liberatoire?'oui':'non'} onChange={setBool('versement_liberatoire')}>
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
                </select>
              </div>
              <div className="field"><label>Taux d'impôt perso (%)</label><input type="number" value={oForm.taux_impot_perso} onChange={set('taux_impot_perso')} placeholder="14"/></div>
              <div className="field">
                <label>TVA active ?</label>
                <select value={oForm.tva_active?'oui':'non'} onChange={setBool('tva_active')}>
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
                </select>
              </div>
              <div className="field">
                <label>Régime TVA</label>
                <select value={oForm.regime_tva} onChange={set('regime_tva')}>
                  <option value="reel_normal">Réel normal</option>
                  <option value="reel_simplifie">Réel simplifié</option>
                  <option value="franchise">Franchise en base</option>
                </select>
              </div>
            </div>

            <div className="prof-section-title">Banque & Organisation</div>
            <div className="form-grid">
              <div className="field">
                <label>Compte bancaire dédié ?</label>
                <select value={oForm.compte_bancaire_dedie?'oui':'non'} onChange={setBool('compte_bancaire_dedie')}>
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
                </select>
              </div>
              <div className="field"><label>IBAN</label><input value={oForm.iban} onChange={set('iban')} placeholder="FR76 1234…"/></div>
            </div>

            <div className="prof-section-title">Objectifs & Activité</div>
            <div className="form-grid">
              <div className="field">
                <label>Revenus</label>
                <select value={oForm.regularite_revenus} onChange={set('regularite_revenus')}>
                  <option value="reguliers">Réguliers</option>
                  <option value="irreguliers">Irréguliers</option>
                </select>
              </div>
              <div className="field">
                <label>Objectif</label>
                <select value={oForm.objectif_ae} onChange={set('objectif_ae')}>
                  <option value="complement_revenu">Complément de revenu</option>
                  <option value="revenu_principal">Revenu principal</option>
                  <option value="tester_activite">Tester une activité</option>
                </select>
              </div>
              <div className="field">
                <label>Statut complémentaire</label>
                <select value={oForm.statut_complementaire} onChange={set('statut_complementaire')}>
                  <option value="aucun">Aucun</option>
                  <option value="salarie">Salarié</option>
                  <option value="etudiant">Étudiant</option>
                  <option value="retraite">Retraité</option>
                  <option value="chomeur">Demandeur d'emploi</option>
                </select>
              </div>
              <div className="field">
                <label>Niveau</label>
                <select value={oForm.niveau} onChange={set('niveau')}>
                  <option value="debutant">Débutant</option>
                  <option value="intermediaire">Intermédiaire</option>
                  <option value="avance">Avancé</option>
                </select>
              </div>
              <div className="field"><label>Prix moyen prestation (€)</label><input type="number" value={oForm.prix_moyen_prestation} onChange={set('prix_moyen_prestation')} placeholder="2000"/></div>
              <div className="field"><label>Clients / mois</label><input type="number" value={oForm.clients_par_mois} onChange={set('clients_par_mois')} placeholder="5"/></div>
            </div>

            <div className="modal-actions">
              {profil&&<button className="btn btn-ghost" onClick={()=>setShowOnboarding(false)}>Annuler</button>}
              <button className="btn btn-dark" onClick={saveProfil}>Enregistrer →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {view==='dashboard' && (
        <div className="main">

          {/* ── HERO ── */}
          {profil ? (
            <div style={{background:'rgba(20,5,40,0.30)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',border:'1px solid rgba(255,255,255,0.18)',borderRadius:20,padding:'1.25rem',marginBottom:'1.5rem',position:'relative',overflow:'hidden'}}>
              {/* Décoration fond */}
              <div style={{position:'absolute',top:-40,right:-40,width:200,height:200,borderRadius:'50%',background:'rgba(243,130,255,0.08)',pointerEvents:'none'}}/>
              <div style={{position:'absolute',bottom:-60,right:80,width:140,height:140,borderRadius:'50%',background:'rgba(0,200,200,.04)',pointerEvents:'none'}}/>
              <div style={{position:'relative',zIndex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'1rem'}}>
                  <div>
                    <p style={{fontSize:12,color:'rgba(255,255,255,0.45)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:6}}>Bonjour</p>
                    <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:28,fontWeight:600,color:'#ffffff',marginBottom:4}}>{profil.prenom} {profil.nom}</h1>
                    <p style={{fontSize:13,color:'rgba(255,255,255,.45)'}}>{profil.activite}</p>
                  </div>
                  {prochaineDecl && (
                    <div style={{background:'rgba(20,5,40,0.30)',border:'1px solid rgba(255,255,255,0.18)',borderRadius:16,padding:'14px 18px',textAlign:'right'}}>
                      <div style={{fontSize:10,fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',color:'rgba(255,255,255,.4)',marginBottom:5}}>⏰ Prochaine déclaration</div>
                      <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:16,color:'#f382ff'}}>{prochaineDecl.label.replace('Déclaration URSSAF — ','')}</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,.35)',marginTop:3}}>avant le {prochaineDecl.date_limite}</div>
                      <button onClick={()=>setView('calendrier')} style={{marginTop:8,fontSize:11,background:'rgba(243,130,255,0.9)',border:'none',color:'#07080F',padding:'4px 12px',borderRadius:20,cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:600}}>Voir le calendrier →</button>
                    </div>
                  )}
                </div>

                {/* Métriques dans le hero */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginTop:'1.25rem'}}>
                  {[
                    { label:'CA ce mois', val:`${caMois.toLocaleString('fr-FR')} €`, sub:`Net ~${Math.round(caMois*(1-taux-tauxImpot)).toLocaleString('fr-FR')} €`, color:'#f382ff', onClick:()=>setView('revenus') },
                    { label:`CA ${year}`, val:`${caAnnuel.toLocaleString('fr-FR')} €`, sub:`URSSAF : ${Math.round(cotisAnnuel).toLocaleString('fr-FR')} €`, color:'#f382ff', onClick:()=>setView('revenus') },
                    { label:'Taux URSSAF', val:`${profil?(taux*100).toFixed(1):'—'} %`, sub:profil?.acre?'✓ ACRE actif':'Taux standard', color:'#f382ff', onClick:()=>setShowOnboarding(true) },
                    { label:'À mettre de côté', val:`${Math.round(caMois*(taux+tauxImpot)).toLocaleString('fr-FR')} €`, sub:`ce mois (${Math.round((taux+tauxImpot)*100)}% du CA)`, color:'#c081ff', onClick:()=>setView('simulateur') },
                  ].map(({label,val,sub,color,onClick})=>(
                    <div key={label} onClick={onClick} style={{background:'rgba(20,5,40,0.22)',border:'1px solid rgba(255,255,255,0.12)',backdropFilter:'blur(20px)',borderRadius:14,padding:'1rem',cursor:'pointer',transition:'all .15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(243,130,255,0.1)'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)'}}
                    >
                      <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,.35)',marginBottom:8}}>{label}</div>
                      <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color,marginBottom:4}}>{val}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{background:'rgba(255,255,255,0.04)',border:'2px dashed rgba(255,255,255,0.15)',backdropFilter:'blur(16px)',borderRadius:20,padding:'2rem',textAlign:'center',marginBottom:'1.5rem',cursor:'pointer'}} onClick={()=>setShowOnboarding(true)}>
              <div style={{fontSize:32,marginBottom:8}}>👋</div>
              <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,marginBottom:8,color:'#ffffff'}}>Bienvenue sur Serelyo !</h2>
              <p style={{fontSize:14,color:'rgba(255,255,255,0.55)',marginBottom:'1rem'}}>Configure ton profil pour personnaliser ton tableau de bord</p>
              <button className="btn btn-dark">Configurer mon profil →</button>
            </div>
          )}

          {/* ── LIGNE 2 : Seuils + Devis récents ── */}
          <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>

            {/* Seuils */}
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                <div className="card-title" style={{marginBottom:0}}>Seuils {year}</div>
                <button className="link-btn" onClick={()=>setView('simulateur')}>Simuler →</button>
              </div>
              {[
                { label:'TVA', val:seuil_tva, pct:pctTVA },
                { label:'Plafond micro', val:plafond, pct:pctPlafond }
              ].map(({label,val,pct})=>(
                <div key={label} style={{marginBottom:'1rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:12,fontWeight:500,color:'#ffffff'}}>{label}</span>
                    <span style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{Math.round(pct)}% atteint</span>
                  </div>
                  <div style={{height:8,background:'rgba(255,255,255,0.05)',borderRadius:20,overflow:'hidden'}}>
                    <div style={{height:'100%',width:pct+'%',background:pct>85?'#ff6e84':pct>60?'#f382ff':'#c081ff',borderRadius:20,transition:'width .5s'}}/>
                  </div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:4}}>
                    {caAnnuel.toLocaleString('fr-FR')} € / {val.toLocaleString('fr-FR')} €
                    {pct>85 && <span style={{color:'#ff6e84',marginLeft:6}}>⚠️ Consulte un comptable</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Devis récents */}
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                <div className="card-title" style={{marginBottom:0}}>Devis récents</div>
                <button className="link-btn" onClick={()=>setView('devis')}>Tous voir →</button>
              </div>
              {devis.length===0 ? (
                <div style={{textAlign:'center',padding:'1.5rem 0',color:'rgba(255,255,255,0.38)'}}>
                  <div style={{fontSize:28,marginBottom:8}}>📄</div>
                  <div style={{fontSize:13}}>Aucun devis</div>
                  <button className="link-btn" style={{marginTop:8}} onClick={()=>setView('devis')}>Créer un devis →</button>
                </div>
              ) : (
                <>
                  {devis.slice(0,3).map(d=>{
                    const sc = {en_attente:{bg:'rgba(255,160,60,0.12)',c:'#B5792A'},accepte:{bg:'rgba(0,200,160,0.12)',c:'#2D7A4F'},refuse:{bg:'rgba(255,100,100,0.12)',c:'#8B1A1A'},expire:{bg:'rgba(255,255,255,0.06)',c:'rgba(255,255,255,0.5)'}}
                    const s = sc[d.statut]||sc.en_attente
                    return (
                      <div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.07)',cursor:'pointer'}} onClick={()=>setView('devis')}>
                        <div>
                          <div style={{fontSize:13,fontWeight:500,color:'#ffffff'}}>{d.client_nom}</div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{d.numero} · {d.date_emission}</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,color:'#ffffff'}}>{(d.total_ttc||d.total_ht||0).toLocaleString('fr-FR',{maximumFractionDigits:0})} €</span>
                          <span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:20,background:s.bg,color:s.c}}>
                            {d.statut==='accepte'?'✓':d.statut==='refuse'?'✗':d.statut==='expire'?'exp.':'att.'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>

          {/* ── LIGNE 3 : Revenus récents + Assistant ── */}
          <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>

            {/* Revenus des derniers mois */}
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                <div className="card-title" style={{marginBottom:0}}>Revenus récents</div>
                <button className="link-btn" onClick={()=>setView('revenus')}>Saisir →</button>
              </div>
              {revenus.slice(0,4).length===0 ? (
                <div style={{textAlign:'center',padding:'1.5rem 0',color:'rgba(255,255,255,0.38)'}}>
                  <div style={{fontSize:28,marginBottom:8}}>💶</div>
                  <div style={{fontSize:13}}>Aucun revenu saisi</div>
                  <button className="link-btn" style={{marginTop:8}} onClick={()=>setView('revenus')}>Saisir mes revenus →</button>
                </div>
              ) : (
                revenus.slice(0,4).map(r=>{
                  const net = r.montant*(1-taux-tauxImpot)
                  return (
                    <div key={r.mois} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:'#ffffff'}}>{r.mois&&r.mois.match(/^\d{4}-\d{2}$/)?formatMois(r.mois):r.mois||'—'}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>Net ~{Math.round(net).toLocaleString('fr-FR')} €</div>
                      </div>
                      <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,color:'#ffffff'}}>{r.montant.toLocaleString('fr-FR')} €</span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Assistant rapide */}
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                <div className="card-title" style={{marginBottom:0}}>Assistant IA</div>
                <button className="link-btn" onClick={()=>setView('assistant')}>Ouvrir →</button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {["Quand dois-je déclarer mon CA ?","Combien mettre de côté ce mois ?","Comment fonctionne l'ACRE ?","Qu'est-ce que la CFE ?"].map(q=>(
                  <div key={q} onClick={()=>{setQuestion(q);setView('assistant')}}
                    style={{padding:'10px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,0.15)',fontSize:13,color:'rgba(255,255,255,.6)',cursor:'pointer',transition:'all .15s',background:'rgba(0,200,200,.05)'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,200,200,.4)';e.currentTarget.style.color='#f382ff'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,200,200,.15)';e.currentTarget.style.color='rgba(255,255,255,.6)'}}
                  >
                    💬 {q}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── LIGNE 4 : Prochaines échéances ── */}
          {profil && (
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                <div className="card-title" style={{marginBottom:0}}>Prochaines échéances</div>
                <button className="link-btn" onClick={()=>setView('calendrier')}>Calendrier complet →</button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {calendrier.filter(e=>!e.past).slice(0,3).map(ev=>{
                  const decl = declarations.find(d=>d.periode===ev.id)
                  const fait = decl?.statut==='faite'
                  return (
                    <div key={ev.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:12,background:ev.current?'rgba(0,200,200,.08)':'rgba(255,255,255,.03)',border:`1px solid ${ev.current?'rgba(0,200,200,.25)':'rgba(255,255,255,.06)'}`}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:fait?'#00C8A0':ev.current?'#f382ff':'rgba(255,255,255,.15)',flexShrink:0}}/>
                        <div>
                          <div style={{fontSize:13,fontWeight:500,color:'#ffffff'}}>{ev.label}</div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>Avant le {ev.date_limite}</div>
                        </div>
                      </div>
                      {fait
                        ? <span style={{fontSize:11,fontWeight:600,color:'#c081ff',background:'rgba(192,129,255,0.1)',padding:'3px 10px',borderRadius:20,border:'1px solid rgba(192,129,255,0.25)'}}>✓ Faite</span>
                        : <button className="btn btn-sm btn-amber" onClick={()=>marquerDeclaration(ev.id,ev.type,'faite')}>Marquer faite</button>
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CALENDRIER ── */}
      {view==='calendrier' && (() => {
        const calYear = year
        const MOIS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
        const MOIS_COURT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
        const JOURS_LONG = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
        const JOURS = ['L','M','M','J','V','S','D']

        const moisIdx = calMoisActif
        const nomMois = MOIS_FULL[moisIdx]

        const allerMoisPrev = () => setCalMoisActif(m => m === 0 ? 11 : m - 1)
        const allerMoisNext = () => setCalMoisActif(m => m === 11 ? 0 : m + 1)

        // Construire les événements par date limite
        const eventsParMois = {}
        calendrier.forEach(ev => {
          if (!ev.date_limite) return
          const parts = ev.date_limite.split('/')
          if (parts.length !== 3) return
          const mi = parseInt(parts[1]) - 1
          const evYear = parseInt(parts[2])
          if (evYear !== calYear && evYear !== calYear+1) return
          const key = evYear === calYear ? String(mi) : 'next'
          if (!eventsParMois[key]) eventsParMois[key] = []
          const decl = declarations.find(d=>d.periode===ev.id)
          const statut = decl?.statut || (ev.past ? 'a_verifier' : 'a_faire')
          eventsParMois[key].push({ ...ev, statut, jour: parseInt(parts[0]) })
        })

        const revParMois = {}
        revenus.filter(r=>r.mois&&r.mois.startsWith(String(calYear))).forEach(r => {
          const m = parseInt(r.mois.split('-')[1]) - 1
          revParMois[m] = r.montant
        })

        // Données du mois actif
        const estCourant = moisIdx === month-1
        const evs = eventsParMois[String(moisIdx)] || []
        const rev = revParMois[moisIdx]
        const premierJour = new Date(calYear, moisIdx, 1).getDay()
        const premierLundi = premierJour === 0 ? 6 : premierJour - 1
        const nbJours = new Date(calYear, moisIdx+1, 0).getDate()
        const jours = Array(premierLundi).fill(null).concat(Array.from({length:nbJours},(_,i)=>i+1))
        while (jours.length % 7 !== 0) jours.push(null)
        const joursEvenements = {}
        evs.forEach(ev => { if (ev.jour) joursEvenements[ev.jour] = ev })

        return (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Calendrier {calYear}</h2>
            <p className="page-sub">Échéances et événements</p>
          </div>

          {!profil ? (
            <div className="empty-state"><h3>Configure ton profil d'abord</h3><button className="btn btn-dark" onClick={()=>setShowOnboarding(true)}>Configurer →</button></div>
          ) : isMobile ? (
            <>
              {/* ── VUE MOBILE : 1 mois + swipe ── */}
              {/* Navigation mois */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
                <button onClick={allerMoisPrev} style={{width:44,height:44,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.18)',background:'rgba(255,255,255,0.05)',color:'#f382ff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:'#ffffff',fontWeight:600}}>{nomMois}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,.35)',marginTop:2}}>{calYear}{estCourant?' · Mois en cours':''}</div>
                </div>
                <button onClick={allerMoisNext} style={{width:44,height:44,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.18)',background:'rgba(255,255,255,0.05)',color:'#f382ff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
              </div>

              {/* Sélecteur rapide mois */}
              <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:'1rem',scrollbarWidth:'none'}}>
                {MOIS_COURT.map((m,i)=>(
                  <button key={i} onClick={()=>setCalMoisActif(i)} style={{
                    flexShrink:0,padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:500,
                    cursor:'pointer',fontFamily:'Inter,sans-serif',border:'1.5px solid',transition:'all .15s',
                    background:calMoisActif===i?'rgba(243,130,255,0.85)':'transparent',
                    color:calMoisActif===i?'#07080F':'rgba(255,255,255,0.4)',
                    borderColor:calMoisActif===i?'#f382ff':'rgba(255,255,255,0.12)',
                    position:'relative'
                  }}>
                    {m}
                    {(eventsParMois[String(i)]||[]).length > 0 && calMoisActif!==i && (
                      <span style={{position:'absolute',top:2,right:2,width:6,height:6,borderRadius:'50%',background:'#f382ff'}}/>
                    )}
                  </button>
                ))}
              </div>

              {/* Calendrier du mois — avec swipe */}
              <div className="card" style={{marginBottom:'1rem',userSelect:'none'}}
                onTouchStart={e=>setCalTouchStart(e.touches[0].clientX)}
                onTouchEnd={e=>{
                  if (calTouchStart===null) return
                  const diff = calTouchStart - e.changedTouches[0].clientX
                  if (Math.abs(diff) > 50) diff > 0 ? allerMoisNext() : allerMoisPrev()
                  setCalTouchStart(null)
                }}
              >
                {/* En-tête jours */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:8}}>
                  {JOURS.map((j,i)=>(
                    <div key={i} style={{textAlign:'center',fontSize:11,color:i>=5?'rgba(0,200,200,.5)':'rgba(255,255,255,.3)',fontWeight:600,padding:'4px 0'}}>{j}</div>
                  ))}
                </div>

                {/* Jours */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                  {jours.map((jour,i)=>{
                    const ev = jour ? joursEvenements[jour] : null
                    const estAujourdhui = estCourant && jour === getNow().day
                    const dateStr = jour ? `${year}-${String(moisIdx+1).padStart(2,'0')}-${String(jour).padStart(2,'0')}` : null
                    const rdvsJour = dateStr ? rdvList.filter(r=>r.date===dateStr) : []
                    const hasRdv = rdvsJour.length > 0
                    const estWeekend = jour ? ((premierLundi + i) % 7) >= 5 : false

                    return (
                      <div key={i}
                        onClick={()=>jour && openRdvModal(moisIdx, jour, nomMois)}
                        style={{
                          textAlign:'center',
                          fontSize:13,
                          padding:'8px 2px',
                          borderRadius:8,
                          fontWeight: ev || estAujourdhui || hasRdv ? 700 : 400,
                          background: estAujourdhui ? '#f382ff' : hasRdv ? RDV_TYPES[rdvsJour[0].type]?.bg||'rgba(0,100,200,.2)' : ev ? (ev.statut==='faite'?'rgba(0,200,160,.15)':ev.statut==='a_verifier'?'rgba(255,100,100,.15)':'rgba(255,160,60,.15)') : 'transparent',
                          color: estAujourdhui ? '#0B1929' : hasRdv ? RDV_TYPES[rdvsJour[0].type]?.color||'#7DC8FF' : ev ? (ev.statut==='faite'?'#00C8A0':ev.statut==='a_verifier'?'#FF8A8A':'#f382ff') : estWeekend&&jour ? 'rgba(0,200,200,.5)' : jour ? 'rgba(255,255,255,.7)' : 'transparent',
                          cursor: jour ? 'pointer' : 'default',
                          border: ev ? `1px solid ${ev.statut==='faite'?'rgba(0,200,160,.3)':ev.statut==='a_verifier'?'rgba(255,100,100,.3)':'rgba(255,160,60,.3)'}` : 'none',
                          position:'relative',
                          minHeight:36,
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                        }}>
                        {jour||''}
                        {hasRdv && <span style={{position:'absolute',top:1,right:2,width:5,height:5,borderRadius:'50%',background:'#f382ff'}}/>}
                      </div>
                    )
                  })}
                </div>

                {/* Légende */}
                <div style={{display:'flex',gap:12,marginTop:12,flexWrap:'wrap'}}>
                  {[['rgba(0,200,160,.3)','#00C8A0','✓ Faite'],['rgba(255,160,60,.3)','#f382ff','À faire'],['rgba(255,100,100,.3)','#FF8A8A','En retard'],['rgba(0,200,200,.5)','#f382ff',"Aujourd'hui"]].map(([bg,color,label])=>(
                    <div key={label} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'rgba(255,255,255,.4)'}}>
                      <div style={{width:10,height:10,borderRadius:3,background:bg,border:`1px solid ${color}`}}/>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Événements du mois */}
              {(evs.length > 0 || rdvList.filter(r=>r.date&&r.date.startsWith(`${calYear}-${String(moisIdx+1).padStart(2,'0')}`)).length > 0) && (
                <div className="card" style={{marginBottom:'1rem'}}>
                  <div className="card-title" style={{marginBottom:'0.875rem'}}>Événements de {nomMois}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {evs.map(ev=>{
                      const decl = declarations.find(d=>d.periode===ev.id)
                      const statut = decl?.statut||(ev.past?'a_verifier':'a_faire')
                      return (
                        <div key={ev.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',borderRadius:12,background:statut==='faite'?'rgba(0,200,160,.08)':ev.past?'rgba(255,100,100,.08)':'rgba(255,160,60,.08)',border:`1px solid ${statut==='faite'?'rgba(0,200,160,.2)':ev.past?'rgba(255,100,100,.2)':'rgba(255,160,60,.2)'}`}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:500,color:'#ffffff'}}>{ev.special?(ev.type==='cfe'?'💶 CFE':'📋 Impôt sur le revenu'):'📅 URSSAF'}</div>
                            <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:2}}>Avant le {ev.date_limite}</div>
                          </div>
                          {statut==='faite'
                            ? <span style={{fontSize:11,fontWeight:600,color:'#c081ff',background:'rgba(192,129,255,0.1)',padding:'4px 10px',borderRadius:20}}>✓ Faite</span>
                            : <button onClick={()=>marquerDeclaration(ev.id,ev.type,'faite')} style={{fontSize:11,background:'rgba(243,130,255,0.9)',border:'none',color:'#07080F',padding:'6px 12px',borderRadius:20,cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:600}}>Marquer faite</button>
                          }
                        </div>
                      )
                    })}
                    {rdvList.filter(r=>r.date&&r.date.startsWith(`${calYear}-${String(moisIdx+1).padStart(2,'0')}`)).map(r=>{
                      const t = RDV_TYPES[r.type]||RDV_TYPES.rdv
                      return (
                        <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',borderRadius:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.15)'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:16}}>{t.emoji}</span>
                            <div>
                              <div style={{fontSize:13,fontWeight:500,color:'#ffffff'}}>{r.titre}</div>
                              <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:2}}>
                                {parseInt(r.date.split('-')[2])}/{moisIdx+1} à {r.heure}
                              </div>
                            </div>
                          </div>
                          <button onClick={()=>deleteRdv(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,100,100,.6)',fontSize:18,padding:'4px'}}>×</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* CA du mois */}
              {rev && (
                <div className="card" style={{marginBottom:'1rem',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.15)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,.4)',marginBottom:4}}>CA {nomMois}</div>
                      <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:24,color:'#f382ff'}}>{rev.toLocaleString('fr-FR')} €</div>
                    </div>
                    <button onClick={()=>setView('revenus')} style={{fontSize:12,background:'rgba(243,130,255,0.1)',border:'1px solid rgba(255,255,255,0.18)',color:'#f382ff',padding:'8px 14px',borderRadius:20,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Voir revenus →</button>
                  </div>
                </div>
              )}

              <div className="info-box" style={{marginTop:'1rem'}}>
                <div className="info-title">📌 Comment déclarer</div>
                <div className="info-text">
                  Va sur <a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noopener noreferrer">autoentrepreneur.urssaf.fr</a> · SIRET · "Déclarer et payer" · Saisis ton CA · Valide
                </div>
              </div>

            </>
          ) : (
            <>
              {/* ── VUE DESKTOP : grille 12 mois ── */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:'1.5rem'}}>
                {MOIS_FULL.map((nomM, mi) => {
                  const estCourantM = mi === month-1
                  const estPasseM = mi < month-1
                  const evsM = eventsParMois[String(mi)] || []
                  const revM = revParMois[mi]
                  const premierJourM = new Date(calYear, mi, 1).getDay()
                  const premierLundiM = premierJourM === 0 ? 6 : premierJourM - 1
                  const nbJoursM = new Date(calYear, mi+1, 0).getDate()
                  const joursM = Array(premierLundiM).fill(null).concat(Array.from({length:nbJoursM},(_,i)=>i+1))
                  while (joursM.length % 7 !== 0) joursM.push(null)
                  const joursEvenementsM = {}
                  evsM.forEach(ev => { if (ev.jour) joursEvenementsM[ev.jour] = ev })
                  return (
                    <div key={mi} style={{
                      background:'rgba(20,5,40,0.30)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:`2px solid ${estCourantM?'rgba(0,200,200,0.5)':'rgba(255,255,255,0.08)'}`,
                      borderRadius:16, padding:'1rem',
                      opacity: estPasseM && !revM && evsM.length===0 ? 0.5 : 1,
                      boxShadow: estCourantM ? '0 4px 20px rgba(0,200,200,.1)' : 'none'
                    }}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                        <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,fontWeight:600,color:estCourantM?'#f382ff':'#E8F4F8'}}>
                          {nomM}
                          {estCourantM && <span style={{fontSize:9,background:'rgba(0,200,200,.2)',color:'#f382ff',padding:'2px 7px',borderRadius:20,marginLeft:6,fontFamily:'Inter,sans-serif',border:'1px solid rgba(243,130,255,0.4)'}}>En cours</span>}
                        </div>
                        {revM && <span style={{fontSize:10,fontWeight:600,color:'#f382ff',background:'rgba(243,130,255,0.1)',padding:'2px 7px',borderRadius:20}}>{revM.toLocaleString('fr-FR')} €</span>}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1,marginBottom:6}}>
                        {JOURS_LONG.map(j=>(<div key={j} style={{textAlign:'center',fontSize:8,color:'rgba(255,255,255,.25)',fontWeight:600,padding:'2px 0'}}>{j}</div>))}
                        {joursM.map((jour,i)=>{
                          const ev = jour ? joursEvenementsM[jour] : null
                          const estAujourdhui = estCourantM && jour === getNow().day
                          const dateStr = jour ? `${year}-${String(mi+1).padStart(2,'0')}-${String(jour).padStart(2,'0')}` : null
                          const rdvsJour = dateStr ? rdvList.filter(r=>r.date===dateStr) : []
                          const hasRdv = rdvsJour.length > 0
                          return (
                            <div key={i} onClick={()=>jour && openRdvModal(mi, jour, nomM)}
                              title={jour?(hasRdv?rdvsJour.map(r=>r.titre).join(', '):'Ajouter'):''}
                              style={{
                                textAlign:'center', fontSize:10, padding:'3px 1px', borderRadius:4,
                                fontWeight: ev||estAujourdhui||hasRdv ? 700 : 400,
                                background: estAujourdhui?'#f382ff':hasRdv?'rgba(0,200,200,.15)':ev?(ev.statut==='faite'?'rgba(0,200,160,.15)':ev.statut==='a_verifier'?'rgba(255,100,100,.15)':'rgba(255,160,60,.15)'):'transparent',
                                color: estAujourdhui?'#07080F':hasRdv?'#f382ff':ev?(ev.statut==='faite'?'#00C8A0':ev.statut==='a_verifier'?'#FF8A8A':'#f382ff'):jour?'rgba(255,255,255,.6)':'transparent',
                                cursor: jour?'pointer':'default',
                              }}>
                              {jour||''}
                            </div>
                          )
                        })}
                      </div>
                      {evsM.length > 0 && (
                        <div style={{display:'flex',flexDirection:'column',gap:3}}>
                          {evsM.map(ev=>(
                            <div key={ev.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 8px',borderRadius:8,fontSize:11,background:ev.statut==='faite'?'rgba(0,200,160,.1)':ev.past?'rgba(255,100,100,.1)':'rgba(255,160,60,.08)',border:`1px solid ${ev.statut==='faite'?'rgba(0,200,160,.2)':ev.past?'rgba(255,100,100,.2)':'rgba(255,160,60,.2)'}`}}>
                              <span style={{color:'#ffffff',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:110}}>
                                {ev.special?(ev.type==='cfe'?'💶 CFE':'📋 IR'):'📅 URSSAF'}
                              </span>
                              {ev.statut==='faite'
                                ? <span style={{color:'#c081ff',fontWeight:700,flexShrink:0}}>✓</span>
                                : <button onClick={()=>marquerDeclaration(ev.id,ev.type,'faite')} style={{fontSize:9,background:'#f382ff',border:'none',color:'#07080F',padding:'2px 7px',borderRadius:20,cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:700,flexShrink:0}}>Faire</button>
                              }
                            </div>
                          ))}
                        </div>
                      )}
                      {(() => {
                        const rdvsMois = rdvList.filter(r=>r.date&&parseInt(r.date.split('-')[0])===year&&parseInt(r.date.split('-')[1])-1===mi)
                        if (!rdvsMois.length) return null
                        return (
                          <div style={{marginTop:4,display:'flex',flexDirection:'column',gap:2}}>
                            {rdvsMois.map(r=>{
                              const t = RDV_TYPES[r.type]||RDV_TYPES.rdv
                              return (
                                <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 6px',borderRadius:6,background:'rgba(243,130,255,0.08)',fontSize:10}}>
                                  <span style={{color:'#f382ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:100}}>{t.emoji} {r.titre}</span>
                                  <button onClick={e=>{e.stopPropagation();deleteRdv(r.id)}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,100,100,.6)',fontSize:11,padding:0}}>×</button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>

              {/* Récap desktop */}
              <div className="card" style={{marginBottom:'1rem'}}>
                <div className="card-title">Récapitulatif des échéances</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {calendrier.map(ev=>{
                    const decl = declarations.find(d=>d.periode===ev.id)
                    const statut = decl?.statut||(ev.past?'a_verifier':'a_faire')
                    return (
                      <div key={ev.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:12,background:statut==='faite'?'rgba(0,200,160,.06)':ev.current?'rgba(255,160,60,.06)':'rgba(255,255,255,.03)',border:`1px solid ${statut==='faite'?'rgba(0,200,160,.15)':ev.current?'rgba(255,160,60,.2)':'rgba(255,255,255,.06)'}`,flexWrap:'wrap',gap:8}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:statut==='faite'?'#00C8A0':ev.past?'#FF8A8A':ev.current?'#f382ff':'rgba(255,255,255,.2)',flexShrink:0}}/>
                          <div>
                            <div style={{fontSize:13,fontWeight:500,color:'#ffffff'}}>{ev.label}</div>
                            <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>Avant le {ev.date_limite}</div>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          {ev.current && <span style={{fontSize:10,background:'rgba(243,130,255,0.1)',color:'#f382ff',padding:'2px 8px',borderRadius:20,fontWeight:600,border:'1px solid rgba(255,160,60,.2)'}}>En cours</span>}
                          {statut==='faite'
                            ? <span style={{fontSize:12,fontWeight:600,color:'#c081ff',background:'rgba(192,129,255,0.1)',padding:'4px 12px',borderRadius:20}}>✓ Faite</span>
                            : <button className="btn btn-sm btn-amber" onClick={()=>marquerDeclaration(ev.id,ev.type,'faite')}>Marquer faite</button>
                          }
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="info-box">
                <div className="info-title">📌 Comment déclarer</div>
                <div className="info-text">Va sur <a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noopener noreferrer">autoentrepreneur.urssaf.fr</a> · SIRET · "Déclarer et payer" · Saisis ton CA · Valide</div>
              </div>
            </>
          )}

              {/* Modal ajout RDV */}
              {showRdvModal && rdvJour && (
                <div className="overlay show" onClick={e=>{if(e.target.className.includes('overlay'))setShowRdvModal(false)}}>
                  <div className="modal" style={{maxWidth:440}}>
                    <div className="modal-title">
                      {rdvEditing ? 'Modifier' : 'Nouvel événement'}
                    </div>
                    <p className="modal-sub">
                      {rdvJour.moisNom} {rdvJour.jour}, {year}
                    </p>
                    <div className="form-grid">
                      <div className="field full">
                        <label>Titre *</label>
                        <input value={rdvForm.titre} onChange={e=>setRdvForm(p=>({...p,titre:e.target.value}))} placeholder="Ex: Appel client, Réunion, Déclaration…" autoFocus/>
                      </div>
                      <div className="field">
                        <label>Heure</label>
                        <input type="time" value={rdvForm.heure} onChange={e=>setRdvForm(p=>({...p,heure:e.target.value}))}/>
                      </div>
                      <div className="field">
                        <label>Type</label>
                        <select value={rdvForm.type} onChange={e=>setRdvForm(p=>({...p,type:e.target.value}))}>
                          {Object.entries(RDV_TYPES).map(([val,{label,emoji}])=>(
                            <option key={val} value={val}>{emoji} {label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field full">
                        <label>Notes</label>
                        <input value={rdvForm.notes} onChange={e=>setRdvForm(p=>({...p,notes:e.target.value}))} placeholder="Informations complémentaires…"/>
                      </div>
                    </div>

                    {/* RDV existants ce jour */}
                    {(() => {
                      const dateStr = `${year}-${String(rdvJour.moisIdx+1).padStart(2,'0')}-${String(rdvJour.jour).padStart(2,'0')}`
                      const rdvsJour = rdvList.filter(r=>r.date===dateStr)
                      if (rdvsJour.length===0) return null
                      return (
                        <div style={{marginBottom:'1rem'}}>
                          <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',letterSpacing:'.5px',textTransform:'uppercase',marginBottom:8}}>Événements ce jour</div>
                          {rdvsJour.map(r=>{
                            const t = RDV_TYPES[r.type]||RDV_TYPES.rdv
                            return (
                              <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',borderRadius:10,background:t.bg,marginBottom:6}}>
                                <span style={{fontSize:13,color:t.color,fontWeight:500}}>{t.emoji} {r.heure} — {r.titre}</span>
                                <button onClick={()=>deleteRdv(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ff6e84',fontSize:18,lineHeight:1}}>×</button>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}

                    <div className="modal-actions">
                      <button className="btn btn-ghost" onClick={()=>setShowRdvModal(false)}>Annuler</button>
                      <button className="btn btn-dark" onClick={saveRdv} disabled={!rdvForm.titre.trim()}>
                        {rdvEditing ? 'Modifier' : 'Ajouter →'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
        </div>
        )
      })()}

      {/* ── REVENUS ── */}
      {view==='revenus' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Mes revenus</h2>
            <p className="page-sub">Saisir ton chiffre d'affaires mois par mois</p>
          </div>

          {/* Formulaire saisie */}
          <div className="card" style={{marginBottom:'1.5rem'}}>
            <div className="card-title">Saisir un mois</div>
            <div style={{display:'flex',flexDirection:'column',gap:10,flexWrap:'wrap'}}>
              <div>
                <span className="mini-label">Mois</span>
                <select className="mini-input" value={revMoisNum} onChange={e=>setRevMoisNum(e.target.value)}>
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m,i)=>(
                    <option key={m} value={m}>{['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][i]}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="mini-label">Année</span>
                <select className="mini-input" value={revAnnee} onChange={e=>setRevAnnee(e.target.value)}>
                  {[year-2, year-1, year, year+1].map(y=>(
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="mini-label">CA encaissé (€ HT)</span>
                <input className="mini-input" type="number" value={revMontant}
                  onChange={e=>setRevMontant(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&saveRevenu()}
                  placeholder="3 500"/>
              </div>
              <button className="btn btn-dark" onClick={saveRevenu} disabled={savingRev} style={{whiteSpace:'nowrap',width:'100%',padding:'14px'}}>
                {savingRev?'Sauvegarde…':'Enregistrer →'}
              </button>
            </div>
            <div style={{marginTop:10,fontSize:12,color:'rgba(255,255,255,0.38)'}}>
              Tu saisis pour : <strong style={{color:'#ffffff'}}>{['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][parseInt(revMoisNum)-1]} {revAnnee}</strong>
            </div>
          </div>

          {/* Historique */}
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:8}}>
              <div className="card-title" style={{marginBottom:0}}>Historique</div>
              <select className="mini-input" style={{width:'auto'}} value={histoAnnee} onChange={e=>setHistoAnnee(e.target.value)}>
                {[year-2, year-1, year, year+1].map(y=>(
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            {revenus.filter(r=>r.mois.startsWith(histoAnnee)).length===0
              ? <p style={{fontSize:13,color:'rgba(255,255,255,0.38)',padding:'1rem 0'}}>Aucun revenu saisi pour {histoAnnee}.</p>
              : (
                <>
                  <table className="rev-table">
                    <thead>
                      <tr>
                        <th>Mois</th>
                        <th>CA</th>
                        <th>URSSAF ({(taux*100).toFixed(1)}%)</th>
                        <th>Impôts ({profil?.taux_impot_perso||14}%)</th>
                        <th>Net estimé</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenus.filter(r=>r.mois.startsWith(histoAnnee)).map(r=>{
                        const cotis=r.montant*taux, impots=r.montant*tauxImpot, net=r.montant-cotis-impots
                        return (
                          <tr key={r.mois}>
                            <td>{formatMois(r.mois)}</td>
                            <td><strong>{r.montant.toLocaleString('fr-FR')} €</strong></td>
                            <td style={{color:'#ff6e84'}}>{cotis.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                            <td style={{color:'#dbb4ff'}}>{impots.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                            <td style={{color:'#c081ff',fontWeight:600}}>{net.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                            <td>
                              <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.38)',fontSize:16}} onClick={async()=>{
                                if(!confirm('Supprimer ce mois ?')) return
                                const {data:ex} = await supabase.from('ae_revenus').select('id').eq('user_id',user.id).eq('mois',r.mois).single()
                                if(ex) await supabase.from('ae_revenus').delete().eq('id',ex.id)
                                setRevenus(prev=>prev.filter(x=>x.mois!==r.mois))
                              }}>🗑</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    </table>
                  {/* Total récap */}
                  {(() => {
                    const totalCA = revenus.filter(r=>r.mois.startsWith(histoAnnee)).reduce((s,r)=>s+r.montant,0)
                    const totalCotis = totalCA*taux
                    const totalImpots = totalCA*tauxImpot
                    const totalNet = totalCA*(1-taux-tauxImpot)
                    return (
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:'1.25rem'}}>
                        <div style={{background:'rgba(255,255,255,0.1)',borderRadius:14,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,.5)',marginBottom:6}}>CA Total {histoAnnee}</div>
                          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:'#fff'}}>{totalCA.toLocaleString('fr-FR')} €</div>
                        </div>
                        <div style={{background:'rgba(255,110,132,0.1)',border:'1px solid rgba(255,110,132,0.25)',borderRadius:14,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',marginBottom:6}}>URSSAF ({(taux*100).toFixed(1)}%)</div>
                          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:'#ff6e84'}}>{totalCotis.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                        </div>
                        <div style={{background:'rgba(243,130,255,0.1)',border:'1px solid rgba(255,160,60,0.25)',borderRadius:14,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',marginBottom:6}}>Impôts ({profil?.taux_impot_perso||14}%)</div>
                          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:'#dbb4ff'}}>{totalImpots.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                        </div>
                        <div style={{background:'rgba(192,129,255,0.12)',border:'1px solid rgba(192,129,255,0.3)',borderRadius:14,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',marginBottom:6}}>Net estimé</div>
                          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:'#c081ff'}}>{totalNet.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )
            }
          </div>
        </div>
      )}

      {/* ── CALCULATEUR ── */}
      {view==='calculateur' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Calculateur</h2>
            <p className="page-sub">Combien dois-je payer et mettre de côté ?</p>
          </div>
          {!profil ? (
            <div className="empty-state"><h3>Configure ton profil d'abord</h3><button className="btn btn-dark" onClick={()=>setShowOnboarding(true)}>Configurer →</button></div>
          ) : (
            <>
              {/* Infos secteur */}
              <div className="card" style={{marginBottom:'1rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
                <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                  <div>
                    <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',display:'block',marginBottom:4}}>Ton secteur</span>
                    <span style={{fontSize:14,color:'#ffffff',fontWeight:500}}>{SECTEURS.find(s=>s.value===profil.secteur)?.label||profil.secteur}</span>
                  </div>
                  <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                    <div style={{textAlign:'center'}}>
                      <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',display:'block',marginBottom:4}}>Taux URSSAF</span>
                      <span style={{fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#f382ff'}}>{(TAUX[profil.secteur]*100).toFixed(1)}%</span>
                    </div>
                    {profil.acre && (
                      <div style={{textAlign:'center'}}>
                        <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',display:'block',marginBottom:4}}>Avec ACRE</span>
                        <span style={{fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#c081ff'}}>{(TAUX_ACRE[profil.secteur]*100).toFixed(1)}%</span>
                      </div>
                    )}
                    <div style={{textAlign:'center'}}>
                      <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',display:'block',marginBottom:4}}>Taux impôt perso</span>
                      <span style={{fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#dbb4ff'}}>{profil.taux_impot_perso||14}%</span>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',display:'block',marginBottom:4}}>Total à prévoir</span>
                      <span style={{fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#ffffff'}}>~{((TAUX[profil.secteur]+(parseFloat(profil.taux_impot_perso)||14)/100)*100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{marginBottom:'1.5rem'}}>
                <div className="card-title">Simuler un encaissement</div>
                <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
                  <div>
                    <span className="mini-label">Montant encaissé (€ HT)</span>
                    <input className="mini-input" type="number" value={calcCA} onChange={e=>setCalcCA(e.target.value)} onKeyDown={e=>e.key==='Enter'&&calculer()} placeholder="2 500" style={{width:200,fontSize:18,padding:'12px 14px'}}/>
                  </div>
                  <button className="btn btn-dark" style={{padding:'12px 24px'}} onClick={calculer}>Calculer →</button>
                </div>
                <div style={{marginTop:10,fontSize:12,color:'rgba(255,255,255,0.38)'}}>
                  Les calculs utilisent ton secteur et taux personnalisés du profil. <button className="link-btn" onClick={()=>setShowOnboarding(true)}>Modifier mon profil →</button>
                </div>
              </div>

              {calcResult && (
                <div className="calc-result">
                  <div className="calc-grid">
                    <div className="calc-card main-card"><div className="calc-label">CA encaissé</div><div className="calc-big">{calcResult.ca.toLocaleString('fr-FR')} €</div></div>
                    <div className="calc-card red-card">
                      <div className="calc-label">URSSAF ({(calcResult.taux*100).toFixed(1)}%{profil.acre?' — ACRE':' — taux normal'})</div>
                      <div className="calc-big">{calcResult.cotisations.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                      <div className="calc-sub">À déclarer sur autoentrepreneur.urssaf.fr</div>
                    </div>
                    <div className="calc-card orange-card">
                      <div className="calc-label">Impôts ({profil.taux_impot_perso||14}% — taux perso)</div>
                      <div className="calc-big">{calcResult.impots_estimes.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                      <div className="calc-sub">Estimation — varie selon ta situation fiscale</div>
                    </div>
                    <div className="calc-card amber-card">
                      <div className="calc-label">Total à mettre de côté</div>
                      <div className="calc-big">{calcResult.a_mettre_de_cote.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                      <div className="calc-sub">{((calcResult.taux+calcResult.tauxImpot)*100).toFixed(0)}% du CA</div>
                    </div>
                    <div className="calc-card green-card">
                      <div className="calc-label">Net estimé (ce qui reste)</div>
                      <div className="calc-big">{calcResult.net_estime.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                      <div className="calc-sub">Après URSSAF et impôts estimés</div>
                    </div>
                  </div>
                  {(calcResult.alerte_tva||calcResult.alerte_plafond)&&(
                    <div style={{marginTop:'1rem'}}>
                      {calcResult.alerte_tva&&<div className="seuil-alert">⚠️ Attention : avec ce CA annuel estimé ({calcResult.caAnnuel.toLocaleString('fr-FR')} €), tu approches du seuil de TVA ({calcResult.seuil_tva.toLocaleString('fr-FR')} €). Renseigne-toi sur tes obligations TVA.</div>}
                      {calcResult.alerte_plafond&&<div className="seuil-alert" style={{marginTop:8}}>⚠️ Tu approches du plafond micro-entreprise ({calcResult.plafond.toLocaleString('fr-FR')} €). Au-delà tu bascules au régime réel — consulte un comptable.</div>}
                    </div>
                  )}
                  <div className="info-box" style={{marginTop:'1rem'}}>
                    <div className="info-text">💡 <strong>Conseil :</strong> Dès que tu encaisses un paiement client, mets <strong>{((calcResult.taux+calcResult.tauxImpot)*100).toFixed(0)}%</strong> de côté immédiatement sur un compte séparé. Tu ne seras jamais pris au dépourvu.</div>
                  </div>
                  <div style={{marginTop:8,fontSize:11,color:'rgba(255,255,255,.35)',lineHeight:1.6}}>
                    ⚠️ <strong>Avertissement :</strong> Ces calculs sont des estimations basées sur les taux officiels URSSAF 2025/2026. Le taux d'imposition réel dépend de ta situation fiscale globale. Ces informations ne constituent pas un conseil comptable ou fiscal. En cas de doute, consulte un expert-comptable.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ASSISTANT IA ── */}
      {view==='assistant' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Assistant IA</h2>
            <p className="page-sub">Pose tes questions en français simple — comme à un ami comptable</p>
          </div>
          <div className="card" style={{marginBottom:'1.5rem'}}>
            <span className="chips-hint">Questions fréquentes ↓</span>
            <div className="chips">
              {["Quand dois-je déclarer mon CA à l'URSSAF ?","Comment calculer mes cotisations ?","Qu'est-ce que le seuil de TVA ?","C'est quoi la CFE et quand la payer ?","J'ai oublié de déclarer, que faire ?","Puis-je me verser un salaire ?"].map(q=>(
                <span key={q} className="chip" onClick={()=>setQuestion(q)}>{q}</span>
              ))}
            </div>
            <div className="input-wrap" style={{marginTop:'1rem'}}>
              <textarea value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))poserQuestion()}} placeholder="Ex : J'ai encaissé 4 200€ ce mois, combien je vais payer à l'URSSAF ?" style={{minHeight:80}}/>
              <button className="btn-gen" onClick={poserQuestion} disabled={asking||!question.trim()}>{asking?'Réflexion…':'Envoyer →'}</button>
            </div>
            <div className="hint-text">⌘ + Entrée pour envoyer</div>
          </div>
          {(reponse||asking)&&(
            <div className="card" style={{marginBottom:'1.5rem'}}>
              <div className="reponse-header">
                <div className="reponse-avatar">IA</div>
                <span style={{fontSize:13,color:'rgba(255,255,255,0.55)',fontWeight:500}}>Assistant Serelyo</span>
              </div>
              {asking
                ? <div style={{display:'flex',alignItems:'center',gap:10,padding:'1rem 0',color:'rgba(255,255,255,0.38)'}}><div className="ring"/>Je réfléchis à ta question…</div>
                : <div className="reponse-text">{reponse.split('\n').map((line,i)=><p key={i} style={{marginBottom:line?'0.75rem':0}}>{line}</p>)}</div>
              }
            </div>
          )}
          {histoQ.length>0&&(
            <div>
              <div className="card-title" style={{marginBottom:12}}>Questions précédentes</div>
              {histoQ.slice(0,10).map(q=>(
                <div key={q.id} className="question-preview" onClick={()=>{setQuestion(q.question);setReponse(q.reponse)}}>
                  <div className="question-text">💬 {q.question}</div>
                  <div className="question-date">{new Date(q.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SIMULATEUR ── */}
      {view==='simulateur' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Calculs & Simulation</h2>
            <p className="page-sub">Calcul rapide ou simulation annuelle complète</p>
          </div>

          {!profil ? (
            <div className="empty-state"><h3>Configure ton profil d'abord</h3><button className="btn btn-dark" onClick={()=>setShowOnboarding(true)}>Configurer →</button></div>
          ) : (
            <>
              {/* Sélecteur de mode — 2 grandes cartes */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:'1.5rem'}}>
                <div
                  onClick={()=>setSimMode('rapide')}
                  style={{
                    background: simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel' ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid rgba(255,255,255,0.08)',
                    borderRadius:20, padding:'1.75rem', cursor:'pointer', transition:'all .2s',
                    boxShadow: simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{fontSize:36,marginBottom:12}}>⚡</div>
                  <div style={{
                    fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:20,fontWeight:600,marginBottom:8,
                    color: simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel' ? '#F0F4FF' : 'rgba(255,255,255,0.65)'
                  }}>Calcul rapide</div>
                  <div style={{
                    fontSize:13,lineHeight:1.6,
                    color: simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)'
                  }}>Tu as encaissé un paiement ?<br/>Calcule instantanément ce que tu dois mettre de côté.</div>
                  {(simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel') && (
                    <div style={{marginTop:14,display:'inline-block',background:'rgba(243,130,255,0.15)',color:'#f382ff',border:'1px solid rgba(243,130,255,0.4)',fontSize:11,fontWeight:600,padding:'4px 12px',borderRadius:20}}>Mode actif</div>
                  )}
                </div>
                <div
                  onClick={()=>setSimMode('mensuel')}
                  style={{
                    background: simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel' ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid rgba(255,255,255,0.08)',
                    borderRadius:20, padding:'1.75rem', cursor:'pointer', transition:'all .2s',
                    boxShadow: simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{fontSize:36,marginBottom:12}}>📊</div>
                  <div style={{
                    fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:20,fontWeight:600,marginBottom:8,
                    color: simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel' ? '#F0F4FF' : 'rgba(255,255,255,0.65)'
                  }}>Simulation annuelle</div>
                  <div style={{
                    fontSize:13,lineHeight:1.6,
                    color: simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)'
                  }}>Visualise toute ton année :<br/>revenus, charges et net mois par mois avec graphique.</div>
                  {(simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel') && (
                    <div style={{marginTop:14,display:'inline-block',background:'rgba(243,130,255,0.15)',color:'#f382ff',border:'1px solid rgba(243,130,255,0.4)',fontSize:11,fontWeight:600,padding:'4px 12px',borderRadius:20}}>Mode actif</div>
                  )}
                </div>
                <div
                  onClick={()=>setSimMode('inverse')}
                  style={{
                    background: simMode==='inverse' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: simMode==='inverse' ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid rgba(255,255,255,0.08)',
                    borderRadius:20, padding:'1.75rem', cursor:'pointer', transition:'all .2s',
                    boxShadow: simMode==='inverse' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{fontSize:36,marginBottom:12}}>🎯</div>
                  <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:20,fontWeight:600,marginBottom:8,color:simMode==='inverse'?'#fff':'#1C1710'}}>Calculateur inversé</div>
                  <div style={{fontSize:13,lineHeight:1.6,color:simMode==='inverse'?'rgba(255,255,255,.65)':'#6B5E45'}}>Tu veux X€ nets par mois ?<br/>Calcule exactement combien tu dois facturer.</div>
                  {simMode==='inverse' && (
                    <div style={{marginTop:14,display:'inline-block',background:'rgba(243,130,255,0.15)',color:'#f382ff',border:'1px solid rgba(243,130,255,0.4)',fontSize:11,fontWeight:600,padding:'4px 12px',borderRadius:20}}>Mode actif</div>
                  )}
                </div>
                <div
                  onClick={()=>setSimMode('reel')}
                  style={{
                    background: simMode==='reel' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: simMode==='reel' ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid rgba(255,255,255,0.08)',
                    borderRadius:20, padding:'1.75rem', cursor:'pointer', transition:'all .2s',
                    boxShadow: simMode==='reel' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{fontSize:36,marginBottom:12}}>⚖️</div>
                  <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:20,fontWeight:600,marginBottom:8,color:simMode==='reel'?'#fff':'#1C1710'}}>Micro vs Réel</div>
                  <div style={{fontSize:13,lineHeight:1.6,color:simMode==='reel'?'rgba(255,255,255,.65)':'#6B5E45'}}>Tu approches du plafond ?<br/>Compare concrètement micro-entreprise et régime réel.</div>
                  {simMode==='reel' && (
                    <div style={{marginTop:14,display:'inline-block',background:'rgba(243,130,255,0.15)',color:'#f382ff',border:'1px solid rgba(243,130,255,0.4)',fontSize:11,fontWeight:600,padding:'4px 12px',borderRadius:20}}>Mode actif</div>
                  )}
                </div>
              </div>

              {/* ── MODE CALCUL RAPIDE ── */}
              {simMode==='rapide' && (() => {
                return (
                  <>
                    {/* Infos secteur */}
                    <div className="card" style={{marginBottom:'1rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                        <div>
                          <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',display:'block',marginBottom:4}}>Ton secteur</span>
                          <span style={{fontSize:14,color:'#ffffff',fontWeight:500}}>{SECTEURS.find(s=>s.value===profil.secteur)?.label||profil.secteur}</span>
                        </div>
                        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                          <div style={{textAlign:'center'}}>
                            <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',display:'block',marginBottom:4}}>Taux URSSAF</span>
                            <span style={{fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#f382ff'}}>{(TAUX[profil.secteur]*100).toFixed(1)}%</span>
                          </div>
                          {profil.acre && (
                            <div style={{textAlign:'center'}}>
                              <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',display:'block',marginBottom:4}}>Avec ACRE</span>
                              <span style={{fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#c081ff'}}>{(TAUX_ACRE[profil.secteur]*100).toFixed(1)}%</span>
                            </div>
                          )}
                          <div style={{textAlign:'center'}}>
                            <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',display:'block',marginBottom:4}}>Taux impôt</span>
                            <span style={{fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#dbb4ff'}}>{profil.taux_impot_perso||14}%</span>
                          </div>
                          <div style={{textAlign:'center'}}>
                            <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',display:'block',marginBottom:4}}>Total à prévoir</span>
                            <span style={{fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#ffffff'}}>~{((TAUX[profil.secteur]+(parseFloat(profil.taux_impot_perso)||14)/100)*100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card" style={{marginBottom:'1.5rem'}}>
                      <div className="card-title">Simuler un encaissement</div>
                      <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
                        <div>
                          <span className="mini-label">Montant encaissé (€ HT)</span>
                          <input className="mini-input" type="number" value={calcCA}
                            onChange={e=>setCalcCA(e.target.value)}
                            onKeyDown={e=>e.key==='Enter'&&calculer()}
                            placeholder="2 500" style={{width:200,fontSize:18,padding:'12px 14px'}}/>
                        </div>
                        <button className="btn btn-dark" style={{padding:'12px 24px'}} onClick={calculer}>Calculer →</button>
                      </div>
                      <div style={{marginTop:10,fontSize:12,color:'rgba(255,255,255,0.38)'}}>
                        Les calculs utilisent ton secteur et taux du profil. <button className="link-btn" onClick={()=>setShowOnboarding(true)}>Modifier →</button>
                      </div>
                    </div>
                    {calcResult && (
                      <div className="calc-result">
                        <div className="calc-grid">
                          <div className="calc-card main-card"><div className="calc-label">CA encaissé</div><div className="calc-big">{calcResult.ca.toLocaleString('fr-FR')} €</div></div>
                          <div className="calc-card red-card">
                            <div className="calc-label">URSSAF ({(calcResult.taux*100).toFixed(1)}%{profil.acre?' — ACRE':''})</div>
                            <div className="calc-big">{calcResult.cotisations.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                            <div className="calc-sub">À déclarer sur autoentrepreneur.urssaf.fr</div>
                          </div>
                          <div className="calc-card orange-card">
                            <div className="calc-label">Impôts ({profil.taux_impot_perso||14}% — taux perso)</div>
                            <div className="calc-big">{calcResult.impots_estimes.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                            <div className="calc-sub">Estimation selon ton taux personnalisé</div>
                          </div>
                          <div className="calc-card amber-card">
                            <div className="calc-label">Total à mettre de côté</div>
                            <div className="calc-big">{calcResult.a_mettre_de_cote.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                            <div className="calc-sub">{((calcResult.taux+calcResult.tauxImpot)*100).toFixed(0)}% du CA</div>
                          </div>
                          <div className="calc-card green-card">
                            <div className="calc-label">Net estimé (ce qui reste)</div>
                            <div className="calc-big">{calcResult.net_estime.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                            <div className="calc-sub">Après URSSAF et impôts</div>
                          </div>
                        </div>
                        {(calcResult.alerte_tva||calcResult.alerte_plafond)&&(
                          <div style={{marginTop:'1rem'}}>
                            {calcResult.alerte_tva&&<div className="seuil-alert">⚠️ Tu approches du seuil de TVA ({calcResult.seuil_tva.toLocaleString('fr-FR')} €).</div>}
                            {calcResult.alerte_plafond&&<div className="seuil-alert" style={{marginTop:8}}>⚠️ Tu approches du plafond micro-entreprise ({calcResult.plafond.toLocaleString('fr-FR')} €).</div>}
                          </div>
                        )}
                        <div className="info-box" style={{marginTop:'1rem'}}>
                          <div className="info-text">💡 <strong>Conseil :</strong> Dès que tu encaisses, mets <strong>{((calcResult.taux+calcResult.tauxImpot)*100).toFixed(0)}%</strong> de côté sur un compte séparé.</div>
                        </div>
                        <div style={{marginTop:8,fontSize:11,color:'rgba(255,255,255,.35)'}}>⚠️ Estimation basée sur les taux officiels URSSAF. Consulte un comptable pour une simulation précise.</div>
                        <div style={{marginTop:12,textAlign:'center'}}>
                          <button className="btn btn-ghost" onClick={()=>setSimMode('mensuel')}>📊 Voir la simulation annuelle →</button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* ── MODE SIMULATION ANNUELLE ── */}
              {(simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel') && (
              <>
              {/* Formulaire */}
              <div className="card" style={{marginBottom:'1.5rem'}}>
                <div className="card-title">Paramètres de simulation</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12}}>
                  <div>
                    <span className="mini-label">Mode de saisie</span>
                    <select className="mini-input" value={simMode} onChange={e=>setSimMode(e.target.value)}>
                      <option value="mensuel">CA mensuel moyen</option>
                      <option value="annuel">CA annuel total</option>
                    </select>
                  </div>
                  <div>
                    <span className="mini-label">{simMode==='mensuel'?'CA mensuel moyen (€)':'CA annuel total (€)'}</span>
                    <input className="mini-input" type="number" value={simCA}
                      onChange={e=>setSimCA(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&document.getElementById('btn-simuler').click()}
                      placeholder={simMode==='mensuel'?'3 000':'36 000'}/>
                  </div>
                  <div>
                    <span className="mini-label">Mois d'activité</span>
                    <select className="mini-input" value={simMoisActifs} onChange={e=>setSimMoisActifs(+e.target.value)}>
                      {[6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m} mois</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="mini-label">Profil de revenus</span>
                    <select className="mini-input" value={simVariation} onChange={e=>setSimVariation(e.target.value)}>
                      <option value="stable">Stable (même montant chaque mois)</option>
                      <option value="croissance">En croissance (+10% par trimestre)</option>
                      <option value="saisonnalite">Saisonnalité (été fort, hiver faible)</option>
                    </select>
                  </div>
                  <div style={{display:'flex',alignItems:'flex-end'}}>
                    <button id="btn-simuler" className="btn btn-dark" style={{width:'100%',padding:'10px'}} onClick={()=>{
                      const ca = parseFloat(simCA)||0
                      if (!ca) return
                      const tauxU = profil.acre ? TAUX_ACRE[profil.secteur] : TAUX[profil.secteur]
                      const tauxI = (parseFloat(profil.taux_impot_perso)||14)/100
                      const caM = simMode==='mensuel' ? ca : ca/simMoisActifs
                      // Générer les 12 mois
                      const moisData = MOIS_NOMS.map((nom,i)=>{
                        if (i >= simMoisActifs) return { nom, ca:0, urssaf:0, impots:0, net:0, actif:false }
                        let facteur = 1
                        if (simVariation==='croissance') facteur = 1 + Math.floor(i/3)*0.10
                        if (simVariation==='saisonnalite') {
                          const saisonniers = [0.7,0.7,0.9,1.0,1.1,1.4,1.5,1.4,1.1,0.9,0.7,0.6]
                          facteur = saisonniers[i]
                        }
                        const mCA = caM * facteur
                        const mUrssaf = mCA * tauxU
                        const mImpots = mCA * tauxI
                        const mNet = mCA - mUrssaf - mImpots
                        return { nom, ca:mCA, urssaf:mUrssaf, impots:mImpots, net:mNet, actif:true }
                      })
                      const totCA = moisData.reduce((s,m)=>s+m.ca,0)
                      const totUrssaf = moisData.reduce((s,m)=>s+m.urssaf,0)
                      const totImpots = moisData.reduce((s,m)=>s+m.impots,0)
                      const totNet = moisData.reduce((s,m)=>s+m.net,0)
                      const seuil_tva = profil.secteur==='ventes'?SEUILS.tva_ventes:SEUILS.tva_services
                      const plafond = profil.secteur==='ventes'?SEUILS.plafond_ventes:SEUILS.plafond_services
                      setSimResult({ moisData, totCA, totUrssaf, totImpots, totNet, tauxU, tauxI, seuil_tva, plafond })
                    }}>Simuler →</button>
                  </div>
                </div>
              </div>

              {simResult && (() => {
                const { moisData, totCA, totUrssaf, totImpots, totNet, tauxU, tauxI, seuil_tva, plafond } = simResult
                const maxVal = Math.max(...moisData.map(m=>m.ca))
                const chartH = 180
                const chartW = 800
                const barW = 44
                const gap = 20
                const totalW = moisData.length * (barW + gap)
                const pct = (v) => v > 0 ? Math.max((v/maxVal)*chartH, 3) : 0

                // Courbe nette (points)
                const netPoints = moisData.map((m,i) => {
                  const x = i*(barW+gap) + barW/2
                  const y = chartH - pct(m.net)
                  return `${x},${y}`
                }).join(' ')

                return (
                  <>
                    {/* Récap cartes */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:'1.25rem'}}>
                      <div style={{background:'rgba(255,255,255,0.1)',borderRadius:16,padding:'1.1rem',textAlign:'center'}}>
                        <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,.5)',marginBottom:6}}>CA Total</div>
                        <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:'#fff'}}>{totCA.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                      </div>
                      <div style={{background:'rgba(255,110,132,0.1)',border:'1px solid rgba(255,110,132,0.25)',borderRadius:16,padding:'1.1rem',textAlign:'center'}}>
                        <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',marginBottom:6}}>URSSAF ({(tauxU*100).toFixed(1)}%)</div>
                        <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:'#ff6e84'}}>{totUrssaf.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                      </div>
                      <div style={{background:'rgba(243,130,255,0.1)',border:'1px solid rgba(255,160,60,0.25)',borderRadius:16,padding:'1.1rem',textAlign:'center'}}>
                        <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',marginBottom:6}}>Impôts (~{Math.round(tauxI*100)}%)</div>
                        <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:'#dbb4ff'}}>{totImpots.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                      </div>
                      <div style={{background:'rgba(192,129,255,0.12)',border:'1px solid rgba(192,129,255,0.3)',borderRadius:16,padding:'1.1rem',textAlign:'center'}}>
                        <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',marginBottom:6}}>Net estimé</div>
                        <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:'#c081ff'}}>{totNet.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                        <div style={{fontSize:11,color:'#c081ff',opacity:.7}}>{Math.round(totNet/12).toLocaleString('fr-FR')} €/mois</div>
                      </div>
                    </div>

                    {/* Graphique barres empilées */}
                    <div className="card" style={{marginBottom:'1.5rem'}}>
                      <div className="card-title">Répartition mensuelle — barres empilées</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.38)',marginBottom:14}}>Chaque barre = ton CA total, découpé en 3 couches</div>

                      {/* Légende */}
                      <div style={{display:'flex',gap:20,marginBottom:16,flexWrap:'wrap'}}>
                        {[['#2D7A4F','Net (ce qui reste)'],['#FFA94D','Impôts'],['#FF6B6B','URSSAF']].map(([color,label])=>(
                          <div key={label} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'rgba(255,255,255,0.55)'}}>
                            <div style={{width:14,height:14,borderRadius:3,background:color}}/>
                            {label}
                          </div>
                        ))}
                      </div>

                      <div style={{overflowX:'auto'}}>
                        <svg width={Math.max(moisData.length*(barW+gap)+60,600)} height={chartH+80} style={{display:'block'}}>
                          {/* Lignes de grille horizontales */}
                          {[0.25,0.5,0.75,1].map(p=>(
                            <g key={p}>
                              <line x1="40" y1={chartH-p*chartH} x2={moisData.length*(barW+gap)+50} y2={chartH-p*chartH} stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="4,3"/>
                              <text x="0" y={chartH-p*chartH+4} fontSize="9" fill="rgba(255,255,255,0.28)">{Math.round(maxVal*p/1000)}k€</text>
                            </g>
                          ))}

                          {/* Barres empilées URSSAF + Impôts + Net */}
                          {moisData.map((m,i)=>{
                            const x = i*(barW+gap)+50
                            const hTotal = pct(m.ca)
                            const hU = m.ca>0 ? (m.urssaf/m.ca)*hTotal : 0
                            const hI = m.ca>0 ? (m.impots/m.ca)*hTotal : 0
                            const hN = hTotal - hU - hI

                            if (!m.actif) return (
                              <g key={i}>
                                <rect x={x} y={chartH-8} width={barW} height={8} fill="rgba(255,255,255,0.04)" rx="3"/>
                                <text x={x+barW/2} y={chartH+18} textAnchor="middle" fontSize="10" fill="#D0C8B8">{m.nom}</text>
                              </g>
                            )
                            return (
                              <g key={i}>
                                <title>{m.nom} — CA : {Math.round(m.ca).toLocaleString('fr-FR')}€ | Net : {Math.round(m.net).toLocaleString('fr-FR')}€ | URSSAF : {Math.round(m.urssaf).toLocaleString('fr-FR')}€ | Impôts : {Math.round(m.impots).toLocaleString('fr-FR')}€</title>
                                {/* NET — couche du haut (vert) */}
                                <rect x={x} y={chartH-hTotal} width={barW} height={hN} fill="#c081ff" rx="4"/>
                                <rect x={x} y={chartH-hTotal+4} width={barW} height={Math.max(hN-4,0)} fill="#c081ff"/>
                                {/* IMPOTS — couche du milieu (orange) */}
                                <rect x={x} y={chartH-hU-hI} width={barW} height={hI} fill="#f382ff"/>
                                {/* URSSAF — couche du bas (rouge) */}
                                <rect x={x} y={chartH-hU} width={barW} height={hU} fill="#ff6e84"/>
                                <rect x={x} y={chartH-hU} width={barW} height={Math.max(hU-4,0)} fill="#ff6e84"/>
                                <rect x={x} y={chartH-4} width={barW} height={4} fill="#ff6e84" rx="0"/>
                                <rect x={x} y={chartH-hU} width={barW} height={4} fill="#ff6e84" rx="2"/>
                                {/* Valeur nette au dessus */}
                                {hTotal > 30 && <text x={x+barW/2} y={chartH-hTotal-5} textAnchor="middle" fontSize="9" fill="#c081ff" fontWeight="600">{Math.round(m.net/1000*10)/10}k</text>}
                                {/* Mois en dessous */}
                                <text x={x+barW/2} y={chartH+18} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.4)">{m.nom}</text>
                                {/* CA total en petit */}
                                <text x={x+barW/2} y={chartH+30} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.28)">{Math.round(m.ca/1000*10)/10}k</text>
                              </g>
                            )
                          })}
                        </svg>
                      </div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:8,textAlign:'center'}}>
                        Chiffres en milliers d'euros · Survole une barre pour voir le détail
                      </div>
                    </div>

                    {/* Tableau détaillé */}
                    <div className="card" style={{marginBottom:'1.5rem'}}>
                      <div className="card-title">Détail mois par mois</div>
                      <div style={{overflowX:'auto'}}>
                        <table className="rev-table">
                          <thead>
                            <tr>
                              <th>Mois</th>
                              <th>CA</th>
                              <th>URSSAF ({(tauxU*100).toFixed(1)}%)</th>
                              <th>Impôts ({Math.round(tauxI*100)}%)</th>
                              <th>À mettre de côté</th>
                              <th>Net estimé</th>
                            </tr>
                          </thead>
                          <tbody>
                            {moisData.filter(m=>m.actif).map((m,i)=>(
                              <tr key={i}>
                                <td>{m.nom}</td>
                                <td><strong>{Math.round(m.ca).toLocaleString('fr-FR')} €</strong></td>
                                <td style={{color:'#ff6e84'}}>{Math.round(m.urssaf).toLocaleString('fr-FR')} €</td>
                                <td style={{color:'#dbb4ff'}}>{Math.round(m.impots).toLocaleString('fr-FR')} €</td>
                                <td style={{color:'#f382ff',fontWeight:500}}>{Math.round(m.urssaf+m.impots).toLocaleString('fr-FR')} €</td>
                                <td style={{color:'#c081ff',fontWeight:600}}>{Math.round(m.net).toLocaleString('fr-FR')} €</td>
                              </tr>
                            ))}
                          </tbody>
                          </table>
                          {/* Total récap cards */}
                          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:'1.25rem'}}>
                            {[
                              {label:'CA Total',val:Math.round(totCA),color:'#ffffff',bg:'rgba(255,255,255,0.1)',textColor:'#fff',subColor:'rgba(255,255,255,.5)'},
                              {label:'URSSAF total',val:Math.round(totUrssaf),color:'#ff6e84',bg:'rgba(255,100,100,0.12)',subColor:'rgba(255,255,255,0.4)'},
                              {label:'Impôts total',val:Math.round(totImpots),color:'#dbb4ff',bg:'rgba(255,160,60,0.12)',subColor:'rgba(255,255,255,0.4)'},
                              {label:'Net estimé total',val:Math.round(totNet),color:'#c081ff',bg:'rgba(0,200,160,0.12)',subColor:'rgba(255,255,255,0.4)'},
                            ].map(({label,val,color,bg,textColor,subColor})=>(
                              <div key={label} style={{background:bg,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'1rem',textAlign:'center'}}>
                                <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:subColor||'#A89878',marginBottom:6}}>{label}</div>
                                <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:20,color:textColor||color,fontWeight:600}}>{val.toLocaleString('fr-FR')} €</div>
                                <div style={{fontSize:11,color:subColor||'#A89878',marginTop:4}}>{Math.round(val/simMoisActifs).toLocaleString('fr-FR')} €/mois</div>
                              </div>
                            ))}
                          </div>
                      </div>
                    </div>

                    {/* Alertes seuils */}
                    <div className="card" style={{marginBottom:'1.5rem'}}>
                      <div className="card-title">Progression vers les seuils légaux</div>
                      <div style={{display:'flex',flexDirection:'column',gap:20}}>
                        {[
                          {
                            label:'Seuil de TVA',
                            val: seuil_tva,
                            pct: Math.min((totCA/seuil_tva)*100,100),
                            icon:'💳',
                            consequence: "Au-delà, tu dois collecter et reverser la TVA à l'État. Tes prix augmentent de 20% ou ta marge diminue.",
                            conseil: "Prévois-le en avance pour éviter une mauvaise surprise."
                          },
                          {
                            label:'Plafond micro-entreprise',
                            val: plafond,
                            pct: Math.min((totCA/plafond)*100,100),
                            icon:'🏢',
                            consequence: "Au-delà 2 années consécutives, tu bascules au régime réel — comptabilité obligatoire, charges calculées différemment.",
                            conseil: "Commence à te rapprocher d'un comptable si tu approches de ce seuil."
                          }
                        ].map(({label,val,pct,icon,consequence,conseil})=>{
                          const reste = val - totCA
                          const couleur = pct > 90 ? '#ff6e84' : pct > 70 ? '#f382ff' : '#c081ff'
                          const bgCouleur = pct > 90 ? 'rgba(255,110,132,0.12)' : pct > 70 ? 'rgba(243,130,255,0.08)' : 'rgba(192,129,255,0.1)'
                          const status = pct > 90 ? 'DÉPASSEMENT IMMINENT' : pct > 70 ? 'ATTENTION' : 'OK'
                          return (
                            <div key={label}>
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
                                <div style={{display:'flex',alignItems:'center',gap:10}}>
                                  <span style={{fontSize:20}}>{icon}</span>
                                  <div>
                                    <div style={{fontSize:14,fontWeight:600,color:'#ffffff'}}>{label}</div>
                                    <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>Seuil légal : {val.toLocaleString('fr-FR')} €/an</div>
                                  </div>
                                </div>
                                <div style={{display:'flex',alignItems:'center',gap:12}}>
                                  <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,color:'#ffffff'}}>{Math.round(totCA).toLocaleString('fr-FR')} € / {val.toLocaleString('fr-FR')} €</span>
                                  <span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:bgCouleur,color:couleur,letterSpacing:'.5px'}}>{status}</span>
                                </div>
                              </div>
                              {/* Barre de progression */}
                              <div style={{height:12,background:'rgba(255,255,255,0.05)',borderRadius:20,overflow:'hidden',marginBottom:10}}>
                                <div style={{height:'100%',width:pct+'%',background:couleur,borderRadius:20,transition:'width .5s ease'}}/>
                              </div>
                              {/* Info contextuelle */}
                              <div style={{background:bgCouleur,borderRadius:10,padding:'10px 14px',fontSize:12,color:'#ffffff',lineHeight:1.6}}>
                                {pct > 90
                                  ? <><strong>⚠️ Alerte :</strong> {consequence} <strong>{conseil}</strong></>
                                  : pct > 70
                                  ? <><strong>📌 À surveiller :</strong> Il te reste <strong style={{color:couleur}}>{reste > 0 ? reste.toLocaleString('fr-FR',{maximumFractionDigits:0}) : 0} €</strong> avant ce seuil. {conseil}</>
                                  : <><strong>✅ Tout va bien :</strong> Il te reste <strong style={{color:'#c081ff'}}>{reste > 0 ? reste.toLocaleString('fr-FR',{maximumFractionDigits:0}) : 0} €</strong> de marge avant ce seuil.</>
                                }
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div style={{fontSize:11,color:'rgba(255,255,255,.35)',lineHeight:1.7,padding:'12px 16px',background:'rgba(255,255,255,0.05)',borderRadius:12}}>
                      ⚠️ <strong style={{color:'#ffffff'}}>Simulation indicative</strong> — Les montants sont calculés sur la base des taux officiels URSSAF {new Date().getFullYear()} pour ton secteur ({(tauxU*100).toFixed(1)}%). Le taux d'imposition réel dépend de ta situation fiscale globale. Ces chiffres ne constituent pas un conseil comptable.
                    </div>
                  </>
                )
              })()}
              </>
              )}

              {/* ── MODE CALCULATEUR INVERSÉ ── */}
              {simMode==='inverse' && (
                <div className="card">
                  <div className="card-title">🎯 Combien dois-je facturer ?</div>
                  <p style={{fontSize:13,color:'rgba(255,255,255,0.55)',marginBottom:'1.5rem',lineHeight:1.7}}>
                    Renseigne le revenu net que tu veux toucher chaque mois. Serelyo calcule le CA à facturer en tenant compte de l'URSSAF, des impôts, de tes jours travaillés et de tes congés.
                  </p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:'1.5rem'}}>
                    <div>
                      <span className="mini-label">Revenu net souhaité (€/mois)</span>
                      <input className="mini-input" type="number" value={invNet}
                        onChange={e=>setInvNet(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&document.getElementById('btn-inv').click()}
                        placeholder="3 000" style={{fontSize:18,padding:'12px 14px'}}/>
                    </div>
                    <div>
                      <span className="mini-label">Jours travaillés / mois</span>
                      <select className="mini-input" value={invJours} onChange={e=>setInvJours(+e.target.value)}>
                        {[15,16,17,18,19,20,21,22,23,24,25].map(j=><option key={j} value={j}>{j} jours</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="mini-label">Semaines de congés / an</span>
                      <select className="mini-input" value={invConges} onChange={e=>setInvConges(+e.target.value)}>
                        {[0,1,2,3,4,5,6,7,8].map(c=><option key={c} value={c}>{c} semaine{c>1?'s':''}</option>)}
                      </select>
                    </div>
                  </div>
                  <button id="btn-inv" className="btn btn-dark" style={{padding:'12px 28px'}} onClick={()=>{
                    const netMensuel = parseFloat(invNet)||0
                    if (!netMensuel||!profil) return
                    const tauxU = profil.acre ? TAUX_ACRE[profil.secteur] : TAUX[profil.secteur]
                    const tauxI = (parseFloat(profil.taux_impot_perso)||14)/100
                    const tauxTotal = tauxU + tauxI
                    // CA mensuel brut nécessaire
                    const caParMoisActif = netMensuel / (1 - tauxTotal)
                    // Mois actifs sur l'année
                    const moisActifs = 12 - (invConges / 4.33)
                    const caAnnuel = caParMoisActif * moisActifs
                    const caParMoisCalendaire = caAnnuel / 12
                    // Taux journalier moyen (TJM)
                    const moisActifMoyJours = invJours * (moisActifs/12)
                    const tjm = caParMoisActif / invJours
                    // Taux horaire (7h/jour)
                    const tauxHoraire = tjm / 7
                    setInvResult({
                      netMensuel, tauxTotal, tauxU, tauxI,
                      caParMoisActif, caAnnuel, caParMoisCalendaire,
                      tjm, tauxHoraire, moisActifs: Math.round(moisActifs*10)/10,
                      urssafMensuel: caParMoisActif*tauxU,
                      impotsMensuel: caParMoisActif*tauxI,
                      caMettre: caParMoisActif*tauxTotal,
                    })
                  }}>Calculer →</button>

                  {invResult && (
                    <div style={{marginTop:'2rem'}}>
                      {/* Résultat principal */}
                      <div style={{background:'rgba(255,255,255,0.1)',borderRadius:20,padding:'1.75rem',marginBottom:'1.25rem',textAlign:'center',position:'relative',overflow:'hidden'}}>
                        <div style={{position:'absolute',top:-30,right:-30,width:150,height:150,borderRadius:'50%',background:'rgba(181,121,42,.12)'}}/>
                        <div style={{fontSize:12,fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',color:'rgba(255,255,255,.4)',marginBottom:8}}>Pour toucher {invResult.netMensuel.toLocaleString('fr-FR')} € nets/mois</div>
                        <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:48,color:'rgba(255,255,255,0.85)',marginBottom:6}}>{Math.ceil(invResult.caParMoisActif).toLocaleString('fr-FR')} €</div>
                        <div style={{fontSize:14,color:'rgba(255,255,255,.5)'}}>à facturer chaque mois actif</div>
                      </div>

                      {/* Grille détails */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:10,marginBottom:'1rem'}}>
                        <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',marginBottom:6}}>TJM conseillé</div>
                          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:24,color:'#f382ff'}}>{Math.ceil(invResult.tjm).toLocaleString('fr-FR')} €</div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:4}}>par jour ({invJours}j/mois)</div>
                        </div>
                        <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',marginBottom:6}}>Taux horaire</div>
                          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:24,color:'#f382ff'}}>{Math.ceil(invResult.tauxHoraire).toLocaleString('fr-FR')} €</div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:4}}>par heure (7h/jour)</div>
                        </div>
                        <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',marginBottom:6}}>CA annuel</div>
                          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:24,color:'#f382ff'}}>{Math.ceil(invResult.caAnnuel).toLocaleString('fr-FR')} €</div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:4}}>{invResult.moisActifs} mois actifs</div>
                        </div>
                      </div>

                      {/* Décomposition mensuelle */}
                      <div className="card" style={{marginBottom:'1rem'}}>
                        <div className="card-title" style={{marginBottom:'1rem'}}>Décomposition d'un mois actif</div>
                        {[
                          {label:'CA facturé',val:Math.ceil(invResult.caParMoisActif),color:'#ffffff',bg:'rgba(255,255,255,0.1)',text:'#fff'},
                          {label:`URSSAF (${(invResult.tauxU*100).toFixed(1)}%)`,val:Math.round(invResult.urssafMensuel),color:'#ff6e84',bg:'rgba(255,100,100,0.12)',text:'#8B1A1A'},
                          {label:`Impôts (~${Math.round(invResult.tauxI*100)}%)`,val:Math.round(invResult.impotsMensuel),color:'#dbb4ff',bg:'rgba(255,160,60,0.12)',text:'#7A3A0A'},
                          {label:'Net perçu',val:Math.round(invResult.netMensuel),color:'#c081ff',bg:'rgba(0,200,160,0.12)',text:'#2D7A4F'},
                        ].map(({label,val,bg,text})=>(
                          <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:12,background:bg,marginBottom:8}}>
                            <span style={{fontSize:13,color:bg==='#1C1710'?'rgba(255,255,255,.6)':text,fontWeight:500}}>{label}</span>
                            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:18,color:bg==='#1C1710'?'#E8D5A8':text,fontWeight:600}}>{val.toLocaleString('fr-FR')} €</span>
                          </div>
                        ))}
                      </div>

                      {/* Vérification seuils */}
                      {invResult.caAnnuel > (profil.secteur==='ventes'?SEUILS.tva_ventes:SEUILS.tva_services)*0.85 && (
                        <div className="seuil-alert">⚠️ Attention : pour atteindre cet objectif, ton CA annuel ({Math.ceil(invResult.caAnnuel).toLocaleString('fr-FR')} €) approche ou dépasse le seuil de TVA ({(profil.secteur==='ventes'?SEUILS.tva_ventes:SEUILS.tva_services).toLocaleString('fr-FR')} €). Pense à anticiper.</div>
                      )}

                      <div style={{marginTop:12,fontSize:11,color:'rgba(255,255,255,.35)',background:'rgba(255,255,255,0.05)',borderRadius:12,padding:'12px 16px',lineHeight:1.7}}>
                        ⚠️ <strong style={{color:'#ffffff'}}>Estimation indicative</strong> — Basée sur ton secteur ({(invResult.tauxU*100).toFixed(1)}% URSSAF) et ton taux d'imposition personnalisé ({Math.round(invResult.tauxI*100)}%). Consulte un expert-comptable pour affiner.
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* ── MODE MICRO VS RÉEL ── */}
              {simMode==='reel' && (() => {
                const plafond = profil.secteur==='ventes' ? SEUILS.plafond_ventes : SEUILS.plafond_services
                const seuil_tva = profil.secteur==='ventes' ? SEUILS.tva_ventes : SEUILS.tva_services
                const tauxU = profil.acre ? TAUX_ACRE[profil.secteur] : TAUX[profil.secteur]
                const tauxI = (parseFloat(profil.taux_impot_perso)||14)/100

                const calcReel = () => {
                  const ca = parseFloat(reelCA)||0
                  const charges = parseFloat(reelCharges)||0
                  if (!ca) return

                  // ── MICRO ──
                  const micro_cotis = ca * tauxU
                  const micro_impots = ca * tauxI
                  const micro_net = ca - micro_cotis - micro_impots

                  // ── RÉEL ──
                  // Au réel : cotisations sur le bénéfice (~45% du bénéfice)
                  // Bénéfice = CA - charges
                  const benefice = Math.max(ca - charges, 0)
                  // Cotisations TNS au réel ≈ 45% du bénéfice (simplifié)
                  const reel_cotis = benefice * 0.45
                  // Bénéfice imposable = bénéfice - cotisations
                  const benefice_imposable = Math.max(benefice - reel_cotis, 0)
                  const reel_impots = benefice_imposable * tauxI
                  const reel_net = benefice - reel_cotis - reel_impots

                  setReelResult({ ca, charges, benefice, micro_cotis, micro_impots, micro_net, reel_cotis, reel_impots, reel_net, tauxU, tauxI })
                }

                return (
                  <>
                    {/* Alerte seuil */}
                    <div style={{background:caAnnuel > plafond*0.85 ? 'rgba(255,100,100,0.1)' : 'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,padding:'14px 18px',marginBottom:'1.5rem',display:'flex',gap:14,alignItems:'flex-start'}}>
                      <span style={{fontSize:24,flexShrink:0}}>{caAnnuel > plafond*0.85 ? '⚠️' : 'ℹ️'}</span>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:'#ffffff',marginBottom:4}}>
                          {caAnnuel > plafond*0.85 ? 'Tu approches du plafond micro-entreprise !' : 'Simule le passage au régime réel'}
                        </div>
                        <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1.7}}>
                          Ton CA actuel : <strong>{caAnnuel.toLocaleString('fr-FR')} €</strong> / Plafond : <strong>{plafond.toLocaleString('fr-FR')} €</strong> ({Math.round((caAnnuel/plafond)*100)}% atteint)
                          <br/>Si tu dépasses ce plafond 2 années consécutives, tu bascules automatiquement au régime réel.
                        </div>
                      </div>
                    </div>

                    {/* Formulaire */}
                    <div className="card" style={{marginBottom:'1.5rem'}}>
                      <div className="card-title">Paramètres de comparaison</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:'1rem'}}>
                        <div>
                          <span className="mini-label">CA annuel (€)</span>
                          <input className="mini-input" type="number" value={reelCA}
                            onChange={e=>setReelCA(e.target.value)}
                            placeholder={caAnnuel > 0 ? String(Math.round(caAnnuel)) : '80 000'}
                            style={{fontSize:16,padding:'11px 14px'}}/>
                          <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:4}}>Ton CA actuel cette année : {caAnnuel.toLocaleString('fr-FR')} €</div>
                        </div>
                        <div>
                          <span className="mini-label">Charges professionnelles (€/an)</span>
                          <input className="mini-input" type="number" value={reelCharges}
                            onChange={e=>setReelCharges(e.target.value)}
                            placeholder="15 000"
                            style={{fontSize:16,padding:'11px 14px'}}/>
                          <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:4}}>Loyer, matériel, logiciels, déplacements…</div>
                        </div>
                      </div>
                      <button className="btn btn-dark" style={{padding:'12px 28px'}} onClick={calcReel}>
                        Comparer →
                      </button>
                    </div>

                    {reelResult && (
                      <>
                        {/* Comparaison principale */}
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:'1.5rem'}}>
                          {/* MICRO */}
                          <div style={{background:'rgba(255,255,255,0.06)',border:'2px solid #E8D5A8',borderRadius:20,padding:'1.5rem'}}>
                            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'1rem'}}>
                              <div style={{background:'rgba(243,130,255,0.15)',color:'#fff',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20}}>Régime actuel</div>
                              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:18,color:'#ffffff'}}>Micro-entreprise</div>
                            </div>
                            <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginBottom:'1rem',lineHeight:1.6}}>
                              Cotisations calculées sur le <strong>CA brut</strong> ({(reelResult.tauxU*100).toFixed(1)}%), pas sur le bénéfice.
                            </div>
                            {[
                              {label:'CA encaissé',val:reelResult.ca,color:'#ffffff'},
                              {label:`Cotisations URSSAF (${(reelResult.tauxU*100).toFixed(1)}% du CA)`,val:reelResult.micro_cotis,color:'#ff6e84',neg:true},
                              {label:`Impôts (~${Math.round(reelResult.tauxI*100)}% du CA)`,val:reelResult.micro_impots,color:'#dbb4ff',neg:true},
                            ].map(({label,val,color,neg})=>(
                              <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F0E8D5',fontSize:13}}>
                                <span style={{color:'rgba(255,255,255,0.55)'}}>{label}</span>
                                <span style={{color,fontWeight:600}}>{neg?'−':''}{Math.round(val).toLocaleString('fr-FR')} €</span>
                              </div>
                            ))}
                            <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0',marginTop:4}}>
                              <span style={{fontSize:14,fontWeight:600,color:'#ffffff'}}>Net estimé</span>
                              <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:reelResult.micro_net>0?'#2D7A4F':'#8B1A1A'}}>{Math.round(reelResult.micro_net).toLocaleString('fr-FR')} €</span>
                            </div>
                            <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:4}}>
                              Taux global réel : {Math.round(((reelResult.micro_cotis+reelResult.micro_impots)/reelResult.ca)*100)}% du CA
                            </div>
                          </div>

                          {/* RÉEL */}
                          <div style={{background:'rgba(106,13,173,0.2)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',border:'1px solid rgba(192,129,255,0.25)',borderRadius:20,padding:'1.5rem'}}>
                            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'1rem'}}>
                              <div style={{background:'rgba(106,13,173,0.2)',color:'#fff',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20}}>Régime réel</div>
                              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:18,color:'#ffffff'}}>EI au réel simplifié</div>
                            </div>
                            <div style={{fontSize:12,color:'#dbb4ff',marginBottom:'1rem',lineHeight:1.6}}>
                              Cotisations calculées sur le <strong>bénéfice net</strong> (CA − charges). Tu déduis tes dépenses pro.
                            </div>
                            {[
                              {label:'CA encaissé',val:reelResult.ca,color:'#ffffff'},
                              {label:'Charges déductibles',val:reelResult.charges,color:'#c081ff',neg:true},
                              {label:'Bénéfice net',val:reelResult.benefice,color:'#dbb4ff',bold:true},
                              {label:'Cotisations TNS (~45% bénéfice)',val:reelResult.reel_cotis,color:'#ff6e84',neg:true},
                              {label:`Impôts (~${Math.round(reelResult.tauxI*100)}% bénéfice imposable)`,val:reelResult.reel_impots,color:'#dbb4ff',neg:true},
                            ].map(({label,val,color,neg,bold})=>(
                              <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #D4E8FF',fontSize:13}}>
                                <span style={{color:'rgba(255,255,255,0.55)',fontWeight:bold?600:400}}>{label}</span>
                                <span style={{color,fontWeight:bold?700:600}}>{neg?'−':''}{Math.round(val).toLocaleString('fr-FR')} €</span>
                              </div>
                            ))}
                            <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0',marginTop:4}}>
                              <span style={{fontSize:14,fontWeight:600,color:'#ffffff'}}>Net estimé</span>
                              <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:reelResult.reel_net>0?'#2D7A4F':'#8B1A1A'}}>{Math.round(reelResult.reel_net).toLocaleString('fr-FR')} €</span>
                            </div>
                          </div>
                        </div>

                        {/* Verdict */}
                        {(() => {
                          const diff = reelResult.reel_net - reelResult.micro_net
                          const mieux = diff > 0 ? 'réel' : 'micro'
                          return (
                            <div style={{background:'rgba(255,255,255,0.1)',borderRadius:20,padding:'1.5rem',marginBottom:'1.5rem',textAlign:'center',position:'relative',overflow:'hidden'}}>
                              <div style={{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:'50%',background:'rgba(181,121,42,.12)'}}/>
                              <div style={{position:'relative',zIndex:1}}>
                                <div style={{fontSize:13,color:'rgba(255,255,255,.5)',marginBottom:8}}>Verdict pour ton cas</div>
                                {Math.abs(diff) < 500 ? (
                                  <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:20,color:'rgba(255,255,255,0.85)',marginBottom:8}}>Les deux régimes sont équivalents</div>
                                ) : (
                                  <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,color:'rgba(255,255,255,0.85)',marginBottom:8}}>
                                    Le régime {mieux==='reel'?'réel':'micro'} te rapporte <span style={{color:'#f382ff'}}>{Math.abs(Math.round(diff)).toLocaleString('fr-FR')} € de plus</span> par an
                                  </div>
                                )}
                                <div style={{fontSize:12,color:'rgba(255,255,255,.4)',lineHeight:1.7,maxWidth:600,margin:'0 auto'}}>
                                  {mieux==='reel'
                                    ? 'Le régime réel est plus avantageux si tu as des charges importantes à déduire. Mais attention : il implique une comptabilité obligatoire et des obligations administratives plus lourdes.'
                                    : 'Le régime micro reste plus avantageux dans ton cas grâce à sa simplicité. Pas de comptabilité complexe, pas de charges à justifier.'}
                                </div>
                              </div>
                            </div>
                          )
                        })()}

                        {/* Ce qui change concrètement */}
                        <div className="card" style={{marginBottom:'1.5rem'}}>
                          <div className="card-title">Ce qui change concrètement si tu passes au réel</div>
                          <div style={{display:'flex',flexDirection:'column',gap:10}}>
                            {[
                              {emoji:'📊',titre:'Comptabilité obligatoire',micro:'Aucune — tu déclares juste ton CA',reel:'Livre de comptes, bilan annuel, bilan comptable — souvent avec un comptable (~1 000-2 000€/an)'},
                              {emoji:'💰',titre:'Calcul des cotisations',micro:`${(reelResult.tauxU*100).toFixed(1)}% de ton CA brut, même si tu as des charges`,reel:'~45% de ton bénéfice (CA − charges). Beaucoup plus avantageux si tu as des dépenses pro.'},
                              {emoji:'🧾',titre:'Déduction des charges',micro:'Impossible — abattement forfaitaire seulement',reel:'Toutes les dépenses pro déductibles : loyer, matériel, logiciels, véhicule, formation…'},
                              {emoji:'📋',titre:'TVA',micro:'Franchise si sous les seuils (36 800€ services)',reel:'TVA obligatoire — tu la collectes et la reverses. Tu récupères aussi la TVA sur tes achats.'},
                              {emoji:'⚙️',titre:'Complexité administrative',micro:'Simple — une déclaration mensuelle ou trimestrielle',reel:'Plus complexe — liasse fiscale, déclarations TVA, DSN si salarié'},
                              {emoji:'📈',titre:'Optimisation fiscale',micro:'Limitée — taux fixe sur le CA',reel:'Beaucoup plus de leviers : amortissements, provisions, optimisation de la rémunération'},
                            ].map(({emoji,titre,micro,reel})=>(
                              <div key={titre} style={{border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,overflow:'hidden'}}>
                                <div style={{background:'rgba(255,255,255,0.05)',padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
                                  <span style={{fontSize:18}}>{emoji}</span>
                                  <span style={{fontSize:13,fontWeight:600,color:'#ffffff'}}>{titre}</span>
                                </div>
                                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
                                  <div style={{padding:'10px 14px',borderRight:'1px solid #E2D8C4',background:'rgba(255,255,255,0.05)'}}>
                                    <div style={{fontSize:10,fontWeight:600,color:'#f382ff',letterSpacing:'1px',textTransform:'uppercase',marginBottom:4}}>Micro-entreprise</div>
                                    <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',lineHeight:1.6}}>{micro}</div>
                                  </div>
                                  <div style={{padding:'10px 14px',background:'rgba(0,120,200,0.1)'}}>
                                    <div style={{fontSize:10,fontWeight:600,color:'#dbb4ff',letterSpacing:'1px',textTransform:'uppercase',marginBottom:4}}>Régime réel</div>
                                    <div style={{fontSize:12,color:'#dbb4ff',lineHeight:1.6}}>{reel}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{fontSize:11,color:'rgba(255,255,255,.35)',background:'rgba(255,255,255,0.05)',borderRadius:12,padding:'12px 16px',lineHeight:1.7}}>
                          ⚠️ <strong style={{color:'#ffffff'}}>Simulation indicative</strong> — Le taux TNS de 45% est une approximation. Le régime réel est complexe et dépend fortement de ta situation personnelle. Consulte un expert-comptable avant de prendre cette décision.
                        </div>
                      </>
                    )}
                  </>
                )
              })()}
            </>
          )}
        </div>
      )}

      {/* ── DEVIS ── */}
      {view==='devis' && (
        <div className="main">
          <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
            <div>
              <h2 className="page-title">Mes devis</h2>
              <p className="page-sub">Crée et gère tes devis professionnels</p>
            </div>
            <button className="btn btn-dark" onClick={()=>setShowDevisForm(true)}>+ Nouveau devis</button>
          </div>

          {/* Avertissement légal */}
          <div style={{background:'rgba(106,13,173,0.2)',border:'1px solid rgba(192,129,255,0.3)',borderRadius:14,padding:'12px 16px',marginBottom:'1.5rem',fontSize:12,color:'#dbb4ff',lineHeight:1.7}}>
            ℹ️ <strong>Note légale :</strong> Pour les artisans du bâtiment, réparateurs auto et coiffeurs, le devis est obligatoire au-delà de 150€ et doit contenir des mentions spécifiques. Serelyo génère des devis conformes aux recommandations pour tous les secteurs. En cas de doute, consultez un professionnel juridique.
          </div>

          {/* Stats rapides */}
          {devis.length > 0 && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:'1.25rem'}}>
              {[
                ['Total devis',devis.length,'rgba(255,255,255,0.8)','rgba(255,255,255,0.07)'],
                ['En attente',devis.filter(d=>d.statut==='en_attente').length,'#FFA94D','rgba(255,160,60,0.1)'],
                ['Acceptés',devis.filter(d=>d.statut==='accepte').length,'#00D4A0','rgba(0,200,160,0.1)'],
                ['Refusés',devis.filter(d=>d.statut==='refuse').length,'#FF8A8A','rgba(255,100,100,0.1)'],
              ].map(([label,val,color,bg])=>(
                <div key={label} style={{background:bg,border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:'1rem',textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',marginBottom:6}}>{label}</div>
                  <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:26,color}}>{val}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filtres */}
          {devis.length > 0 && (
            <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap'}}>
              {[['tous','Tous',devis.length],['en_attente','En attente',devis.filter(d=>d.statut==='en_attente').length],['accepte','Acceptés',devis.filter(d=>d.statut==='accepte').length],['refuse','Refusés',devis.filter(d=>d.statut==='refuse').length],['expire','Expirés',devis.filter(d=>d.statut==='expire').length]].map(([val,label,count])=>(
                <button key={val} onClick={()=>setDevisFiltre(val)} style={{
                  padding:'6px 14px',borderRadius:30,fontSize:12,fontWeight:500,cursor:'pointer',
                  fontFamily:'Inter,sans-serif',border:'1.5px solid',transition:'all .15s',
                  background:devisFiltre===val?'#1C1710':'transparent',
                  color:devisFiltre===val?'#fff':'#6B5E45',
                  borderColor:devisFiltre===val?'#1C1710':'#E2D8C4'
                }}>
                  {label} <span style={{opacity:.6}}>({count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Liste devis */}
          {devis.length === 0 ? (
            <div className="empty-state">
              <h3>Aucun devis pour l'instant</h3>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.38)',marginBottom:'1.5rem'}}>Crée ton premier devis en quelques clics</p>
              <button className="btn btn-dark" onClick={()=>setShowDevisForm(true)}>+ Créer un devis</button>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {devis.filter(d=>devisFiltre==='tous'||d.statut===devisFiltre).length===0 ? (
                <div style={{textAlign:'center',padding:'2rem',color:'rgba(255,255,255,0.38)',fontSize:13}}>Aucun devis dans cette catégorie</div>
              ) : (
                devis.filter(d=>devisFiltre==='tous'||d.statut===devisFiltre).map(d=>{
                  const statutLabel = {en_attente:'En attente',accepte:'Accepté',refuse:'Refusé',expire:'Expiré'}
                  const statutColor = {en_attente:{bg:'rgba(255,160,60,0.12)',color:'#f382ff'},accepte:{bg:'rgba(0,200,160,0.12)',color:'#c081ff'},refuse:{bg:'rgba(255,100,100,0.12)',color:'#ff6e84'},expire:{bg:'#F5F5F5',color:'#666'}}
                  const sc = statutColor[d.statut]||statutColor.en_attente
                  return (
                    <div key={d.id} className="card" style={{padding:'1rem 1.25rem',cursor:'pointer',transition:'all .15s'}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='#E8D5A8'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='#E2D8C4'}
                    >
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                        <div style={{display:'flex',gap:14,alignItems:'center'}} onClick={()=>imprimerDevis(d,profil)}>
                          <div style={{width:44,height:44,background:'rgba(255,255,255,0.06)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📄</div>
                          <div>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                              <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,fontWeight:600,color:'#ffffff'}}>{d.numero}</span>
                              <span style={{fontSize:10,fontWeight:600,padding:'3px 9px',borderRadius:20,background:sc.bg,color:sc.color}}>{statutLabel[d.statut]||'En attente'}</span>
                            </div>
                            <div style={{fontSize:14,color:'#ffffff',fontWeight:500}}>{d.client_nom}</div>
                            <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:2}}>
                              Émis le {d.date_emission} · valable jusqu'au {d.date_validite}
                            </div>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:18,color:'#ffffff',textAlign:'right'}}>
                            {(d.total_ttc||d.total_ht||0).toLocaleString('fr-FR',{minimumFractionDigits:2})} €
                            <div style={{fontSize:10,color:'rgba(255,255,255,0.38)',fontFamily:'Inter,sans-serif'}}>{d.tva_taux>0?'TTC':'HT'}</div>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',gap:5}} onClick={e=>e.stopPropagation()}>
                            <select
                              style={{fontSize:11,padding:'5px 8px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.55)',fontFamily:'Inter,sans-serif',cursor:'pointer'}}
                              value={d.statut}
                              onChange={e=>updateStatutDevis(d.id,e.target.value)}
                            >
                              <option value="en_attente">En attente</option>
                              <option value="accepte">Accepté ✓</option>
                              <option value="refuse">Refusé ✗</option>
                              <option value="expire">Expiré</option>
                            </select>
                            <div style={{display:'flex',gap:5}}>
                              <button onClick={()=>imprimerDevis(d,profil)} style={{flex:1,padding:'5px 8px',fontSize:11,borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.55)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>👁 Voir</button>
                              <button onClick={()=>supprimerDevis(d.id)} style={{padding:'5px 8px',fontSize:11,borderRadius:8,border:'1px solid rgba(255,100,100,0.25)',background:'rgba(255,100,100,0.1)',color:'#ff6e84',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>🗑</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Modal formulaire devis */}
          {showDevisForm && (
            <div className="overlay show" onClick={e=>{if(e.target.className.includes('overlay'))setShowDevisForm(false)}}>
              <div className="modal" style={{maxWidth:700,maxHeight:'90vh',overflowY:'auto'}}>
                <div className="modal-title">Nouveau devis</div>
                <p className="modal-sub">Remplis les informations ci-dessous pour générer ton devis.</p>

                {/* Client */}
                <div className="prof-section-title">Client</div>
                <div className="form-grid">
                  <div className="field full"><label>Nom du client *</label><input value={devisClient.nom} onChange={e=>setDevisClient(p=>({...p,nom:e.target.value}))} placeholder="Entreprise Martin SARL ou M. Dupont"/></div>
                  <div className="field full"><label>Adresse</label><input value={devisClient.adresse} onChange={e=>setDevisClient(p=>({...p,adresse:e.target.value}))} placeholder="12 rue de la Paix, 75001 Paris"/></div>
                  <div className="field"><label>Email</label><input type="email" value={devisClient.email} onChange={e=>setDevisClient(p=>({...p,email:e.target.value}))} placeholder="contact@client.fr"/></div>
                  <div className="field">
                    <label>Type de client</label>
                    <select value={devisClient.type} onChange={e=>setDevisClient(p=>({...p,type:e.target.value}))}>
                      <option value="entreprise">Entreprise / Professionnel</option>
                      <option value="particulier">Particulier</option>
                    </select>
                  </div>
                </div>

                {/* Prestations */}
                <div className="prof-section-title">Prestations</div>
                <table style={{width:'100%',borderCollapse:'collapse',marginBottom:12}}>
                  <thead>
                    <tr>
                      <th style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',padding:'0 4px 8px',textAlign:'left',width:'35%'}}>Désignation *</th>
                      <th style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',padding:'0 4px 8px',textAlign:'left',width:'20%'}}>Détail</th>
                      <th style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',padding:'0 4px 8px',textAlign:'center',width:'10%'}}>Qté</th>
                      <th style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',padding:'0 4px 8px',textAlign:'center',width:'12%'}}>Unité</th>
                      <th style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',padding:'0 4px 8px',textAlign:'right',width:'15%'}}>Prix HT</th>
                      <th style={{width:'8%'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {devisLignes.map(l=>(
                      <tr key={l.id} style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                        <td style={{padding:'4px'}}><input style={{width:'100%',padding:'7px 8px',borderRadius:8,border:'1.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',fontFamily:'Inter,sans-serif',color:'#ffffff',fontSize:12}} value={l.designation} onChange={e=>updateLigne(l.id,'designation',e.target.value)} placeholder="Ex: Développement web"/></td>
                        <td style={{padding:'4px'}}><input style={{width:'100%',padding:'7px 8px',borderRadius:8,border:'1.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',fontFamily:'Inter,sans-serif',color:'#ffffff',fontSize:12}} value={l.detail} onChange={e=>updateLigne(l.id,'detail',e.target.value)} placeholder="Détail optionnel"/></td>
                        <td style={{padding:'4px'}}><input type="number" style={{width:'100%',padding:'7px 8px',borderRadius:8,border:'1.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',fontFamily:'Inter,sans-serif',color:'#ffffff',fontSize:12,textAlign:'center'}} value={l.quantite} onChange={e=>updateLigne(l.id,'quantite',e.target.value)}/></td>
                        <td style={{padding:'4px'}}>
                          <select style={{width:'100%',padding:'7px 6px',borderRadius:8,border:'1.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',fontFamily:'Inter,sans-serif',color:'#ffffff',fontSize:12}} value={l.unite} onChange={e=>updateLigne(l.id,'unite',e.target.value)}>
                            <option value="heure">heure</option>
                            <option value="jour">jour</option>
                            <option value="forfait">forfait</option>
                            <option value="unité">unité</option>
                            <option value="mois">mois</option>
                            <option value="m²">m²</option>
                            <option value="km">km</option>
                          </select>
                        </td>
                        <td style={{padding:'4px'}}><input type="number" style={{width:'100%',padding:'7px 8px',borderRadius:8,border:'1.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',fontFamily:'Inter,sans-serif',color:'#ffffff',fontSize:12,textAlign:'right'}} value={l.prix} onChange={e=>updateLigne(l.id,'prix',e.target.value)} placeholder="0"/></td>
                        <td style={{padding:'4px',textAlign:'center'}}><button onClick={()=>removeLigne(l.id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.38)',fontSize:16,padding:'4px'}}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={addLigne} style={{display:'flex',alignItems:'center',gap:8,background:'transparent',border:'1.5px dashed #E2D8C4',borderRadius:10,padding:'8px 16px',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:12,color:'rgba(255,255,255,0.55)',width:'100%',marginBottom:'1rem'}}>+ Ajouter une ligne</button>

                {/* Totaux preview */}
                <div style={{background:'rgba(255,255,255,0.06)',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',display:'flex',justifyContent:'flex-end',gap:24}}>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.55)'}}>Total HT : <strong style={{color:'#ffffff'}}>{devisHT.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</strong></span>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.55)'}}>TVA ({devisTva}%) : <strong style={{color:'#ffffff'}}>{devisTVA_montant.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</strong></span>
                  <span style={{fontSize:13,fontWeight:700,color:'#ffffff'}}>Total : {devisTTC.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</span>
                </div>

                {/* Conditions */}
                <div className="prof-section-title">Conditions</div>
                <div className="form-grid">
                  <div className="field">
                    <label>TVA applicable</label>
                    <select value={devisTva} onChange={e=>setDevisTva(+e.target.value)}>
                      <option value={0}>Non applicable (art. 293B CGI)</option>
                      <option value={20}>20% (taux normal)</option>
                      <option value={10}>10% (taux intermédiaire)</option>
                      <option value={5.5}>5,5% (taux réduit)</option>
                      <option value={2.1}>2,1% (taux super réduit)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Validité du devis</label>
                    <select value={devisValidite} onChange={e=>setDevisValidite(e.target.value)}>
                      <option value="15">15 jours</option>
                      <option value="30">30 jours</option>
                      <option value="60">60 jours</option>
                      <option value="90">90 jours</option>
                    </select>
                  </div>
                  <div className="field full"><label>Conditions de paiement</label><input value={devisConditions} onChange={e=>setDevisConditions(e.target.value)} placeholder="Paiement à 30 jours à réception de facture"/></div>
                  <div className="field full"><label>Notes / remarques</label><input value={devisNotes} onChange={e=>setDevisNotes(e.target.value)} placeholder="Toute information complémentaire utile au client…"/></div>
                </div>

                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={()=>setShowDevisForm(false)}>Annuler</button>
                  <button className="btn btn-dark" onClick={()=>saveDevis('en_attente')} disabled={savingDevis}>
                    {savingDevis?'Génération…':'Générer & télécharger →'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESSOURCES ── */}
      {view==='ressources' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Ressources officielles</h2>
            <p className="page-sub">Tous les liens utiles pour gérer ton auto-entreprise — directs, officiels, gratuits</p>
          </div>
          <div className="res-section">
            <div className="res-section-title"><span className="res-icon" style={{background:'rgba(255,255,255,0.06)',color:'#f382ff'}}>📋</span>Déclarations & paiements</div>
            <div className="res-grid">
              <a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-urssaf">URSSAF</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Déclarer & payer mes cotisations</div>
                <div className="res-card-desc">Le site officiel pour déclarer ton CA et payer tes cotisations chaque mois ou trimestre.</div>
                <div className="res-card-url">autoentrepreneur.urssaf.fr</div>
              </a>
              <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-impots">Impôts</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Déclaration de revenus (IR)</div>
                <div className="res-card-desc">Pour déclarer tes revenus chaque année (avant fin mai). Versement libératoire et TVA aussi.</div>
                <div className="res-card-url">impots.gouv.fr</div>
              </a>
              <a href="https://www.urssaf.fr/portail/home/espaces-dedies/auto-entrepreneur.html" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-urssaf">URSSAF</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Payer la CFE</div>
                <div className="res-card-desc">La Cotisation Foncière des Entreprises est due chaque année en décembre.</div>
                <div className="res-card-url">urssaf.fr</div>
              </a>
            </div>
          </div>
          <div className="res-section">
            <div className="res-section-title"><span className="res-icon" style={{background:'rgba(192,129,255,0.12)',color:'#c081ff'}}>🏢</span>Gérer mon auto-entreprise</div>
            <div className="res-grid">
              <a href="https://formalites.entreprises.gouv.fr" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-gouv">Officiel</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Modifier ou fermer mon auto-entreprise</div>
                <div className="res-card-desc">Changer d'adresse, modifier ton activité, déclarer une cessation d'activité.</div>
                <div className="res-card-url">formalites.entreprises.gouv.fr</div>
              </a>
              <a href="https://www.infogreffe.fr" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-gouv">Officiel</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Obtenir mon Kbis / extrait RCS</div>
                <div className="res-card-desc">Télécharge ton extrait Kbis ou vérifie les informations d'une autre entreprise.</div>
                <div className="res-card-url">infogreffe.fr</div>
              </a>
              <a href="https://www.service-public.fr" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-gouv">Officiel</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Mon espace personnel État</div>
                <div className="res-card-desc">Espace centralisé pour accéder à tous les services publics en ligne.</div>
                <div className="res-card-url">service-public.fr</div>
              </a>
            </div>
          </div>
          <div className="res-section">
            <div className="res-section-title"><span className="res-icon" style={{background:'rgba(106,13,173,0.2)',color:'#dbb4ff'}}>💰</span>Aides & financement</div>
            <div className="res-grid">
              <a href="https://entreprendre.service-public.gouv.fr/vosdroits/F36613" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-aide">Aide</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Cumul chômage & auto-entreprise (ARE)</div>
                <div className="res-card-desc">Tu peux cumuler allocations chômage et revenus d'auto-entrepreneur sous conditions.</div>
                <div className="res-card-url">service-public.gouv.fr</div>
              </a>
              <a href="https://www.bpifrance.fr/nos-solutions/financement" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-aide">Financement</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Aides et prêts BPI France</div>
                <div className="res-card-desc">Prêts, garanties et subventions pour développer ton activité.</div>
                <div className="res-card-url">bpifrance.fr</div>
              </a>
              <a href="https://www.aides-entreprises.fr" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-aide">Aide</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Toutes les aides disponibles</div>
                <div className="res-card-desc">Moteur de recherche pour trouver toutes les aides locales, régionales et nationales.</div>
                <div className="res-card-url">aides-entreprises.fr</div>
              </a>
            </div>
          </div>
          <div className="res-section">
            <div className="res-section-title"><span className="res-icon" style={{background:'rgba(243,130,255,0.1)',color:'#dbb4ff'}}>🏥</span>Protection sociale & retraite</div>
            <div className="res-grid">
              <a href="https://www.ameli.fr" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-social">Santé</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Assurance maladie (Ameli)</div>
                <div className="res-card-desc">Gère ta couverture maladie, tes remboursements et ton attestation de droits.</div>
                <div className="res-card-url">ameli.fr</div>
              </a>
              <a href="https://www.lassuranceretraite.fr" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-social">Retraite</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Mes droits à la retraite</div>
                <div className="res-card-desc">Vérifie tes trimestres validés et simule ta future retraite.</div>
                <div className="res-card-url">lassuranceretraite.fr</div>
              </a>
              <a href="https://www.net-entreprises.fr" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-social">Social</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Portail déclarations sociales</div>
                <div className="res-card-desc">Pour les auto-entrepreneurs qui ont des salariés : DSN et obligations employeur.</div>
                <div className="res-card-url">net-entreprises.fr</div>
              </a>
            </div>
          </div>
          <div className="res-section">
            <div className="res-section-title"><span className="res-icon" style={{background:'rgba(243,130,255,0.08)',color:'#f382ff'}}>📖</span>Se former & s'informer</div>
            <div className="res-grid">
              <a href="https://www.service-public.fr/professionnels-entreprises/vosdroits/F23282" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-gouv">Officiel</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Guide officiel auto-entrepreneur</div>
                <div className="res-card-desc">Le guide complet du gouvernement : droits, obligations, seuils, démarches.</div>
                <div className="res-card-url">service-public.fr</div>
              </a>
              <a href="https://www.service-public.fr/professionnels-entreprises/vosdroits/F23961" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-gouv">Officiel</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Vos droits en tant qu'auto-entrepreneur</div>
                <div className="res-card-desc">Fiche complète sur les obligations, cotisations, TVA et le régime micro-entreprise.</div>
                <div className="res-card-url">service-public.fr</div>
              </a>
              <a href="https://www.moncompteformation.gouv.fr" target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-top"><span className="res-tag res-tag-aide">Formation</span><span className="res-arrow">→</span></div>
                <div className="res-card-title">Mon Compte Formation (CPF)</div>
                <div className="res-card-desc">Utilise ton CPF pour te former. Tu cotises et tu as des droits à la formation.</div>
                <div className="res-card-url">moncompteformation.gouv.fr</div>
              </a>
            </div>
          </div>
          <div className="res-disclaimer">
            <strong>ℹ️ Information importante</strong><br/>
            Ces liens pointent vers des sites officiels du gouvernement français. Les informations présentées dans Serelyo sont basées sur la législation en vigueur en 2025 et peuvent évoluer. En cas de doute, consulte toujours les sites officiels ou un expert-comptable.
          </div>
        </div>
      )}
      {/* FOOTER LÉGAL */}
      <div className="app-footer">
        © 2026 Serelyo &nbsp;·&nbsp;
        <a href="/cgu">CGU</a>
        <a href="/confidentialite">Confidentialité</a>
        <a href="/mentions-legales">Mentions légales</a>
        <a href="mailto:contact@serelyo.fr">Contact</a>
      </div>
    </>
  )
}

const CSS = `
/* ── IMPORT FONTS ── */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');

/* ── RESET & BASE ── */
*{-webkit-tap-highlight-color:transparent;box-sizing:border-box;margin:0;padding:0}
html{
  background:#04000C;
  min-height:100vh
}
body{background:transparent;color:#ffffff;font-family:'Inter',sans-serif;overflow-x:hidden}

/* ── APP BAR ── */
.app-bar{
  background:rgba(10,2,25,0.55);
  backdrop-filter:blur(40px);
  -webkit-backdrop-filter:blur(40px);
  height:56px;padding:0 1.25rem;
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:200;
  border-bottom:1px solid rgba(255,255,255,0.10)
}
.logo{font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:800;color:#fff;letter-spacing:.12em;text-transform:uppercase;flex-shrink:0}
.logo span{color:#f382ff}
.bar-right{display:flex;align-items:center;gap:10px}
.user-tag{font-size:11px;color:rgba(255,255,255,0.35);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btn-profile{
  display:flex;align-items:center;gap:6px;
  background:rgba(243,130,255,0.12);
  border:1px solid rgba(243,130,255,0.3);
  border-radius:9999px;padding:6px 14px;cursor:pointer;
  color:#f382ff;font-size:12px;font-family:'Inter',sans-serif;font-weight:600;white-space:nowrap
}
.btn-logout{font-size:12px;color:rgba(255,255,255,0.3);background:none;border:none;cursor:pointer;font-family:'Inter',sans-serif;padding:6px;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center}

/* ── NAV BOTTOM ── */
.nav-tabs{
  background:rgba(10,2,25,0.60);
  backdrop-filter:blur(40px);
  -webkit-backdrop-filter:blur(40px);
  border-top:1px solid rgba(255,255,255,0.10);
  display:flex;padding:0;position:fixed;bottom:0;left:0;right:0;z-index:300;height:64px;
  padding-bottom:env(safe-area-inset-bottom);
  box-shadow:0 -10px 40px rgba(106,13,173,0.12)
}
.nav-tab{
  flex:1;padding:6px 4px 4px;cursor:pointer;
  font-family:'Inter',sans-serif;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
  color:rgba(255,255,255,0.35);border:none;background:none;
  transition:all 0.2s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:44px
}
.nav-tab.active{color:#f382ff;background:rgba(243,130,255,0.08);border-radius:12px;margin:4px 4px}

/* ── MAIN ── */
.main{max-width:900px;margin:0 auto;padding:1rem 0.875rem 5.5rem;position:relative;z-index:1}
@media(min-width:600px){.main{padding:1.5rem 1.5rem 6rem}}

/* ── CARDS (Signature Glass Component) ── */
.card{
  background:rgba(20,5,40,0.30)!important;
  backdrop-filter:blur(28px)!important;
  -webkit-backdrop-filter:blur(28px)!important;
  border:1px solid rgba(255,255,255,0.18)!important;
  border-radius:16px;padding:1rem;
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.08)!important
}
@media(min-width:600px){.card{border-radius:20px;padding:1.5rem}}
.card-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;margin-bottom:1rem;color:#ffffff;letter-spacing:-.01em}

/* ── PAGE HEADER ── */
.page-header{margin-bottom:1.25rem}
.page-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;color:#ffffff;margin-bottom:4px;letter-spacing:-.02em}
@media(min-width:600px){.page-title{font-size:28px}}
.page-sub{font-size:13px;color:rgba(255,255,255,0.55);font-family:'Inter',sans-serif}

/* ── METRICS ── */
.metrics-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:1.25rem}
.metric-card{
  background:rgba(20,5,40,0.28);
  border:1px solid rgba(255,255,255,0.16);
  border-radius:14px;padding:1rem;
  backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)
}
.metric-label{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:8px;font-family:'Inter',sans-serif}
.metric-value{font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;color:#f382ff;margin-bottom:4px}
.metric-sub{font-size:11px;color:rgba(255,255,255,0.35)}

/* ── PROGRESS ── */
.progress-bar{height:6px;background:rgba(255,255,255,0.08);border-radius:9999px;overflow:hidden}
.progress-fill{height:100%;border-radius:9999px;transition:width .5s ease}
.seuil-alert{font-size:12px;color:#ff6e84;background:rgba(255,110,132,0.1);border:1px solid rgba(255,110,132,0.25);border-radius:10px;padding:8px 12px;margin-top:8px}

/* ── SEUIL ── */
.seuil-item{}.seuil-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.seuil-label{font-size:13px;color:rgba(255,255,255,0.8);font-weight:600}
.seuil-val{font-size:12px;color:rgba(255,255,255,0.35)}

/* ── CAL ── */
.cal-list{display:flex;flex-direction:column;gap:10px}
.cal-card{background:rgba(20,5,40,0.30);border:1px solid rgba(255,255,255,0.16);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-radius:14px;padding:.875rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
.cal-current{border-color:rgba(243,130,255,0.5)!important;background:rgba(243,130,255,0.08)!important}
.cal-special{border-style:dashed}
.cal-past{opacity:.45}
.cal-left{display:flex;align-items:center;gap:12px}
.cal-right{flex-shrink:0}
.cal-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dot-done{background:#c081ff}
.dot-late{background:#ff6e84}
.dot-pending{background:rgba(255,255,255,0.2)}
.cal-label{font-size:13px;font-weight:600;color:#ffffff;margin-bottom:3px;font-family:'Inter',sans-serif}
.cal-date{font-size:11px;color:rgba(255,255,255,0.4)}
.badge-current{display:inline-block;font-size:10px;font-weight:700;background:rgba(243,130,255,0.15);color:#f382ff;padding:3px 9px;border-radius:9999px;margin-top:5px;border:1px solid rgba(243,130,255,0.3)}
.badge-done{font-size:12px;font-weight:700;color:#c081ff;background:rgba(192,129,255,0.1);padding:6px 14px;border-radius:9999px;border:1px solid rgba(192,129,255,0.25)}

/* ── INFO BOX ── */
.info-box{background:rgba(20,5,40,0.28);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:1rem 1.1rem;backdrop-filter:blur(24px)}
.info-title{font-size:13px;font-weight:700;color:#dbb4ff;margin-bottom:8px;font-family:'Inter',sans-serif}
.info-text{font-size:13px;color:rgba(255,255,255,0.6);line-height:1.8}
.info-text a{color:#f382ff}

/* ── INPUTS ── */
.mini-label{font-size:10px;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,0.45);display:block;margin-bottom:6px;text-transform:uppercase;font-family:'Inter',sans-serif}
.mini-input{
  padding:12px 14px;border-radius:12px;
  border:1px solid rgba(255,255,255,0.2)!important;
  background:rgba(255,255,255,0.05)!important;
  color:#ffffff;font-family:'Inter',sans-serif;font-size:16px;width:100%;-webkit-appearance:none;
  transition:border-color .2s
}
.mini-input:focus{outline:none;border-color:rgba(243,130,255,0.6)!important;background:rgba(255,255,255,0.08)!important}
.mini-input option{background:#0a0a0a;color:#ffffff}

/* ── TABLE ── */
.rev-table{width:100%;border-collapse:collapse;font-size:13px}
.rev-table thead th{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.35);padding:0 0 10px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.1)}
.rev-table thead th:not(:first-child){text-align:right}
.rev-table tbody tr{border-bottom:1px solid rgba(255,255,255,0.06)}
.rev-table tbody td{padding:11px 0;color:#ffffff;vertical-align:top}
.rev-table tbody td:not(:first-child){text-align:right}
.rev-total{border-top:1.5px solid rgba(243,130,255,0.4)!important;font-weight:700}

/* ── CALCUL ── */
.calc-result{}
.calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1rem}
.calc-card{border-radius:14px;padding:1rem;border:1px solid transparent;backdrop-filter:blur(20px)}
.main-card{background:linear-gradient(135deg,rgba(243,130,255,0.85),rgba(192,129,255,0.85));color:#07080F;border-color:rgba(243,130,255,0.4)!important}
.main-card .calc-label{color:rgba(7,8,15,0.65)}
.main-card .calc-big{color:#07080F}
.red-card{background:rgba(255,110,132,0.1);border-color:rgba(255,110,132,0.25)!important}
.red-card .calc-big{color:#ff6e84}
.orange-card{background:rgba(243,130,255,0.1);border-color:rgba(243,130,255,0.2)!important}
.orange-card .calc-big{color:#f382ff}
.amber-card{background:rgba(192,129,255,0.1);border-color:rgba(192,129,255,0.2)!important}
.amber-card .calc-big{color:#c081ff}
.green-card{background:rgba(192,129,255,0.12);border-color:rgba(192,129,255,0.25)!important}
.green-card .calc-big{color:#dbb4ff}
.calc-label{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;color:rgba(255,255,255,0.45);font-family:'Inter',sans-serif}
.calc-big{font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;margin-bottom:4px}
.calc-sub{font-size:11px;color:rgba(255,255,255,0.35);line-height:1.5}

/* ── CHIPS ── */
.chips-hint{font-size:11px;color:rgba(255,255,255,0.35);font-weight:600;margin-bottom:10px;display:block;font-family:'Inter',sans-serif;letter-spacing:.04em;text-transform:uppercase}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.chip{
  font-size:12px;padding:8px 14px;border-radius:9999px;
  border:1px solid rgba(255,255,255,0.15);
  background:rgba(20,5,40,0.25);
  color:rgba(255,255,255,0.65);cursor:pointer;transition:all .18s;
  min-height:36px;display:inline-flex;align-items:center;
  backdrop-filter:blur(16px);font-family:'Inter',sans-serif
}
.chip:hover,.chip:active{background:rgba(243,130,255,0.12);border-color:rgba(243,130,255,0.4);color:#f382ff}

/* ── TEXTAREA ── */
.input-wrap{position:relative}
textarea{
  width:100%;resize:none;font-family:'Inter',sans-serif;font-size:15px;font-weight:400;
  padding:13px 15px 52px;border-radius:14px;
  border:1px solid rgba(255,255,255,0.2);
  background:rgba(255,255,255,0.05);
  color:#ffffff;line-height:1.65;min-height:100px;-webkit-appearance:none;
  backdrop-filter:blur(10px)
}
textarea:focus{outline:none;border-color:rgba(243,130,255,0.5);background:rgba(255,255,255,0.07)}
textarea::placeholder{color:rgba(255,255,255,0.25)}
.btn-gen{
  position:absolute;bottom:11px;right:11px;padding:9px 20px;border-radius:10px;border:none;
  background:linear-gradient(135deg,#f382ff,#c081ff);
  color:#07080F;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif
}
.btn-gen:disabled{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.3);cursor:not-allowed}
.hint-text{font-size:11px;color:rgba(255,255,255,0.3);margin-top:9px;font-family:'Inter',sans-serif}

/* ── ASSISTANT ── */
.reponse-header{display:flex;align-items:center;gap:10px;margin-bottom:1rem}
.reponse-avatar{
  width:32px;height:32px;border-radius:50%;
  background:linear-gradient(135deg,#f382ff,#c081ff);
  color:#07080F;display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:800;font-family:'Plus Jakarta Sans',sans-serif;flex-shrink:0
}
.reponse-text{font-size:14px;color:rgba(255,255,255,0.8);line-height:1.7}
.reponse-text p{margin-bottom:.75rem}
.ring{width:20px;height:20px;flex-shrink:0;border:2px solid rgba(243,130,255,0.2);border-top-color:#f382ff;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.question-preview{
  background:rgba(20,5,40,0.28);border:1px solid rgba(255,255,255,0.14);
  border-radius:12px;padding:.875rem 1rem;margin-bottom:8px;
  cursor:pointer;transition:all .15s;backdrop-filter:blur(20px)
}
.question-preview:active{border-color:rgba(243,130,255,0.35);background:rgba(243,130,255,0.06)}
.question-text{font-size:13px;color:#ffffff;margin-bottom:4px}
.question-date{font-size:11px;color:rgba(255,255,255,0.3)}

/* ── BUTTONS ── */
.link-btn{background:none;border:none;color:#f382ff;font-size:13px;cursor:pointer;font-family:'Inter',sans-serif;padding:0;font-weight:600}
.empty-state{text-align:center;padding:3rem 1.5rem}
.empty-state h3{font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:700;color:rgba(255,255,255,0.4);margin-bottom:1rem}
.btn{padding:12px 20px;font-size:14px;font-weight:700;border-radius:12px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s;min-height:44px;letter-spacing:.01em}
.btn-ghost{
  background:rgba(20,5,40,0.25);
  border:1px solid rgba(255,255,255,0.2);
  color:rgba(255,255,255,0.7);
  backdrop-filter:blur(10px)
}
.btn-ghost:active{background:rgba(255,255,255,0.1)}
.btn-dark{
  background:linear-gradient(135deg,#f382ff,#c081ff);
  border:none;color:#07080F;font-weight:800;
  box-shadow:0 4px 24px rgba(243,130,255,0.3)
}
.btn-dark:active{opacity:.85}
.btn-amber{background:rgba(243,130,255,0.1);border:1px solid rgba(243,130,255,0.25);color:#f382ff;font-weight:700}
.btn-amber:active{background:rgba(243,130,255,0.2)}
.btn-sm{padding:7px 14px;font-size:12px;min-height:36px}

/* ── MODAL ── */
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:400;align-items:flex-start;justify-content:center;padding:.5rem;overflow-y:auto;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.overlay.show{display:flex}
@media(min-width:480px){.overlay{align-items:center;padding:1rem}}
.modal{
  background:rgba(10,2,25,0.70)!important;
  border:1px solid rgba(255,255,255,0.20)!important;
  backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);
  border-radius:20px;padding:1.25rem;width:100%;max-width:620px;
  box-shadow:0 24px 60px rgba(0,0,0,0.8);
  animation:pop .3s cubic-bezier(.16,1,.3,1);margin:auto
}
@media(min-width:480px){.modal{padding:2rem}}
@keyframes pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
.modal-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;margin-bottom:6px;color:#ffffff;letter-spacing:-.02em}
.modal-sub{font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:1.25rem;line-height:1.5;font-family:'Inter',sans-serif}
.prof-section-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f382ff;margin:1.25rem 0 .75rem;padding-bottom:6px;border-bottom:1px solid rgba(243,130,255,0.2)}
.form-grid{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:.5rem}
@media(min-width:480px){.form-grid{grid-template-columns:1fr 1fr}}
.form-grid .full{grid-column:1/-1}
.field label{font-size:10px;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,0.45);display:block;margin-bottom:6px;text-transform:uppercase;font-family:'Inter',sans-serif}
.field input,.field select{
  width:100%;padding:12px 14px;border-radius:12px;
  border:1px solid rgba(255,255,255,0.2);
  background:rgba(255,255,255,0.05);
  color:#ffffff;font-family:'Inter',sans-serif;font-size:16px;-webkit-appearance:none;
  backdrop-filter:blur(10px);transition:border-color .2s
}
.field input:focus,.field select:focus{outline:none;border-color:rgba(243,130,255,0.5);background:rgba(255,255,255,0.08)}
.field input::placeholder{color:rgba(255,255,255,0.25)}
.field select option{background:#0a0a0a;color:#ffffff}
.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:1.5rem}

/* ── RESSOURCES ── */
.res-section{margin-bottom:2rem}
.res-section-title{display:flex;align-items:center;gap:12px;font-family:'Plus Jakarta Sans',sans-serif;font-size:17px;font-weight:700;color:#ffffff;margin-bottom:1rem;letter-spacing:-.01em}
.res-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12)}
.res-grid{display:grid;grid-template-columns:1fr;gap:10px}
@media(min-width:500px){.res-grid{grid-template-columns:1fr 1fr}}
@media(min-width:800px){.res-grid{grid-template-columns:repeat(3,1fr)}}
.res-card{
  display:block;background:rgba(20,5,40,0.28);border:1px solid rgba(255,255,255,0.15);
  backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border-radius:14px;padding:1rem;text-decoration:none;color:inherit;transition:all .18s
}
.res-card:hover{border-color:rgba(243,130,255,0.35);background:rgba(243,130,255,0.05)}
.res-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.res-tag{font-size:10px;font-weight:700;padding:3px 10px;border-radius:9999px;letter-spacing:.04em;font-family:'Inter',sans-serif}
.res-tag-urssaf{background:rgba(243,130,255,0.12);color:#f382ff;border:1px solid rgba(243,130,255,0.2)}
.res-tag-impots{background:rgba(219,180,255,0.12);color:#dbb4ff;border:1px solid rgba(219,180,255,0.2)}
.res-tag-gouv{background:rgba(192,129,255,0.12);color:#c081ff;border:1px solid rgba(192,129,255,0.2)}
.res-tag-aide{background:rgba(243,130,255,0.12);color:#f382ff;border:1px solid rgba(243,130,255,0.2)}
.res-tag-social{background:rgba(219,180,255,0.12);color:#dbb4ff;border:1px solid rgba(219,180,255,0.2)}
.res-arrow{font-size:16px;color:rgba(255,255,255,0.2);transition:all .18s}
.res-card-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;color:#ffffff;margin-bottom:8px;line-height:1.3}
.res-card-desc{font-size:12px;color:rgba(255,255,255,0.45);line-height:1.65;margin-bottom:10px;font-family:'Inter',sans-serif}
.res-card-url{font-size:11px;color:rgba(255,255,255,0.22);font-family:monospace}
.res-disclaimer{background:rgba(20,5,40,0.28);border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(20px);border-radius:14px;padding:1rem;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.7;margin-top:1rem}
.res-disclaimer strong{color:#ffffff}

/* ── FOOTER ── */
.app-footer{text-align:center;padding:20px 20px 24px;font-size:11px;color:rgba(255,255,255,0.2);border-top:1px solid rgba(255,255,255,0.06);margin-top:2rem;position:relative;z-index:1;font-family:'Inter',sans-serif}
.app-footer a{color:rgba(255,255,255,0.2);text-decoration:none;margin:0 8px}

/* ── WELCOME ── */
.welcome-bar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem}
.welcome-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-.02em}
.welcome-sub{font-size:14px;color:rgba(255,255,255,0.4);margin-top:4px}
.next-decl{background:rgba(243,130,255,0.08);border:1px solid rgba(243,130,255,0.2);backdrop-filter:blur(20px);border-radius:14px;padding:14px 18px;text-align:right}
.next-decl-label{font-size:10px;color:rgba(255,255,255,0.35);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;font-family:'Inter',sans-serif;font-weight:700}
.next-decl-date{font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;color:#f382ff}
`
