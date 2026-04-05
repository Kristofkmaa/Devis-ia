'use client'
import { useState, useEffect } from 'react'
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

  // Simulateur
  const [simMode, setSimMode]         = useState('mensuel') // mensuel | annuel
  const [simCA, setSimCA]             = useState('')
  const [simMoisActifs, setSimMoisActifs] = useState(12)
  const [simVariation, setSimVariation]   = useState('stable') // stable | croissance | saisonnalite
  const [simResult, setSimResult]     = useState(null)

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
      body{font-family:'Outfit',sans-serif;color:#1C1710;background:#fff;padding:40px 50px;max-width:800px;margin:0 auto}
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
      <div style={{width:28,height:28,border:'2.5px solid #E2D8C4',borderTopColor:'#B5792A',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style>{CSS}</style>

      {/* APP BAR */}
      <div className="app-bar">
        <div className="logo">Serelyo</div>
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
        {[['dashboard','🏠 Tableau de bord'],['calendrier','📅 Calendrier'],['revenus','💶 Mes revenus'],['simulateur','🧮 Calculs & Simulation'],['devis','📄 Devis'],['assistant','💬 Assistant IA'],['ressources','📚 Ressources']].map(([v,l])=>(
          <button key={v} className={`nav-tab ${view===v?'active':''}`} onClick={()=>setView(v)}>{l}</button>
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
                <label>Secteur d'activité * <span style={{fontWeight:400,color:'#A89878'}}>(détermine ton taux URSSAF)</span></label>
                <select value={oForm.secteur} onChange={set('secteur')}>
                  {SECTEURS.map(s=><option key={s.value} value={s.value}>{s.label} → {s.taux}</option>)}
                </select>
                <div style={{marginTop:6,fontSize:12,color:'#B5792A',background:'#FAF3E0',borderRadius:8,padding:'6px 10px'}}>
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
                <label>ACRE ? <span style={{fontWeight:400,color:'#A89878'}}>(exonération 1ère année)</span></label>
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
          {profil && (
            <div className="welcome-bar">
              <div>
                <h1 className="welcome-title">Bonjour {profil.prenom} 👋</h1>
                <p className="welcome-sub">{profil.activite}</p>
              </div>
              {prochaineDecl && (
                <div className="next-decl">
                  <span className="next-decl-label">Prochaine déclaration</span>
                  <span className="next-decl-date">avant le {prochaineDecl.date_limite}</span>
                </div>
              )}
            </div>
          )}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">CA ce mois</div>
              <div className="metric-value">{caMois.toLocaleString('fr-FR')} €</div>
              <div className="metric-sub">Cotisations : ~{(caMois*taux).toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">CA {year}</div>
              <div className="metric-value">{caAnnuel.toLocaleString('fr-FR')} €</div>
              <div className="metric-sub">Cotisations : ~{cotisAnnuel.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Taux URSSAF</div>
              <div className="metric-value" style={{color:'#B5792A'}}>{profil?(taux*100).toFixed(1):'—'} %</div>
              <div className="metric-sub">{profil?.acre?'✓ ACRE actif (→ 25% juil. 2026)':'Taux normal'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">À mettre de côté</div>
              <div className="metric-value" style={{color:'#2D7A4F'}}>{(caMois*(taux+tauxImpot)).toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
              <div className="metric-sub">URSSAF + impôts ({profil?.taux_impot_perso||14}%)</div>
            </div>
          </div>
          <div className="card" style={{marginBottom:'1.5rem'}}>
            <div className="card-title">Progression vers les seuils {year}</div>
            <div className="seuil-item">
              <div className="seuil-top"><span className="seuil-label">Seuil TVA</span><span className="seuil-val">{caAnnuel.toLocaleString('fr-FR')} € / {seuil_tva.toLocaleString('fr-FR')} €</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{width:pctTVA+'%',background:pctTVA>85?'#C0392B':pctTVA>60?'#B5792A':'#2D7A4F'}}/></div>
              {pctTVA>85&&<div className="seuil-alert">⚠️ Attention — tu approches du seuil de TVA. Consulte un comptable.</div>}
            </div>
            <div className="seuil-item" style={{marginTop:'1rem'}}>
              <div className="seuil-top"><span className="seuil-label">Plafond micro-entreprise</span><span className="seuil-val">{caAnnuel.toLocaleString('fr-FR')} € / {plafond.toLocaleString('fr-FR')} €</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{width:pctPlafond+'%',background:pctPlafond>85?'#C0392B':pctPlafond>60?'#B5792A':'#2D7A4F'}}/></div>
              {pctPlafond>85&&<div className="seuil-alert">⚠️ Tu approches du plafond ! Au-delà tu bascules en régime réel.</div>}
            </div>
          </div>
          {histoQ.length>0&&(
            <div className="card">
              <div className="card-title">Dernières questions à l'assistant</div>
              {histoQ.slice(0,3).map(q=>(
                <div key={q.id} className="question-preview" onClick={()=>{setQuestion(q.question);setReponse(q.reponse);setView('assistant')}}>
                  <div className="question-text">💬 {q.question}</div>
                  <div className="question-date">{new Date(q.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              ))}
              <button className="link-btn" onClick={()=>setView('assistant')}>Poser une nouvelle question →</button>
            </div>
          )}
        </div>
      )}

      {/* ── CALENDRIER ── */}
      {view==='calendrier' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Calendrier administratif</h2>
            <p className="page-sub">Toutes tes échéances au même endroit</p>
          </div>
          {!profil ? (
            <div className="empty-state"><h3>Configure ton profil d'abord</h3><button className="btn btn-dark" onClick={()=>setShowOnboarding(true)}>Configurer →</button></div>
          ) : (
            <div className="cal-list">
              {calendrier.map(ev=>{
                const decl = declarations.find(d=>d.periode===ev.id)
                const statut = decl?.statut||(ev.past?'a_verifier':'a_faire')
                return (
                  <div key={ev.id} className={`cal-card ${ev.current?'cal-current':''} ${ev.special?'cal-special':''} ${ev.past&&statut!=='faite'?'cal-past':''}`}>
                    <div className="cal-left">
                      <div className={`cal-dot ${statut==='faite'?'dot-done':ev.past?'dot-late':'dot-pending'}`}/>
                      <div>
                        <div className="cal-label">{ev.label}</div>
                        <div className="cal-date">Avant le {ev.date_limite}</div>
                        {ev.current&&<span className="badge-current">Période en cours</span>}
                      </div>
                    </div>
                    <div className="cal-right">
                      {statut==='faite'
                        ? <span className="badge-done">✓ Faite</span>
                        : <button className="btn btn-sm btn-amber" onClick={()=>marquerDeclaration(ev.id,ev.type,'faite')}>Marquer comme faite</button>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="info-box" style={{marginTop:'1.5rem'}}>
            <div className="info-title">📌 Comment déclarer sur autoentrepreneur.urssaf.fr</div>
            <div className="info-text">
              1. Va sur <a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noopener noreferrer" style={{color:'#1A4A8A',fontWeight:600}}>autoentrepreneur.urssaf.fr</a><br/>
              2. Connecte-toi avec ton numéro SIRET<br/>
              3. Clique sur "Déclarer et payer"<br/>
              4. Saisis ton CA de la période<br/>
              5. Valide — le montant à payer est calculé automatiquement
            </div>
          </div>
        </div>
      )}

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
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
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
              <button className="btn btn-dark" onClick={saveRevenu} disabled={savingRev} style={{whiteSpace:'nowrap'}}>
                {savingRev?'Sauvegarde…':'Enregistrer →'}
              </button>
            </div>
            <div style={{marginTop:10,fontSize:12,color:'#A89878'}}>
              Tu saisis pour : <strong style={{color:'#1C1710'}}>{['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][parseInt(revMoisNum)-1]} {revAnnee}</strong>
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
              ? <p style={{fontSize:13,color:'#A89878',padding:'1rem 0'}}>Aucun revenu saisi pour {histoAnnee}.</p>
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
                            <td style={{color:'#8B1A1A'}}>{cotis.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                            <td style={{color:'#7A3A0A'}}>{impots.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                            <td style={{color:'#2D7A4F',fontWeight:600}}>{net.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                            <td>
                              <button style={{background:'none',border:'none',cursor:'pointer',color:'#A89878',fontSize:16}} onClick={async()=>{
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
                        <div style={{background:'#1C1710',borderRadius:14,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,.5)',marginBottom:6}}>CA Total {histoAnnee}</div>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:'#fff'}}>{totalCA.toLocaleString('fr-FR')} €</div>
                        </div>
                        <div style={{background:'#FFF3F3',border:'1px solid #FFCACA',borderRadius:14,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',marginBottom:6}}>URSSAF ({(taux*100).toFixed(1)}%)</div>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:'#8B1A1A'}}>{totalCotis.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                        </div>
                        <div style={{background:'#FFF4E6',border:'1px solid #FFD5A0',borderRadius:14,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',marginBottom:6}}>Impôts ({profil?.taux_impot_perso||14}%)</div>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:'#7A3A0A'}}>{totalImpots.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                        </div>
                        <div style={{background:'#EDFAF3',border:'1px solid #9CDBB8',borderRadius:14,padding:'1rem',textAlign:'center'}}>
                          <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',marginBottom:6}}>Net estimé</div>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:'#2D7A4F'}}>{totalNet.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
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
              <div className="card" style={{marginBottom:'1rem',background:'#FAF3E0',border:'1px solid #E8D5A8'}}>
                <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                  <div>
                    <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',display:'block',marginBottom:4}}>Ton secteur</span>
                    <span style={{fontSize:14,color:'#1C1710',fontWeight:500}}>{SECTEURS.find(s=>s.value===profil.secteur)?.label||profil.secteur}</span>
                  </div>
                  <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                    <div style={{textAlign:'center'}}>
                      <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',display:'block',marginBottom:4}}>Taux URSSAF</span>
                      <span style={{fontSize:20,fontFamily:"'Playfair Display',serif",color:'#B5792A'}}>{(TAUX[profil.secteur]*100).toFixed(1)}%</span>
                    </div>
                    {profil.acre && (
                      <div style={{textAlign:'center'}}>
                        <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',display:'block',marginBottom:4}}>Avec ACRE</span>
                        <span style={{fontSize:20,fontFamily:"'Playfair Display',serif",color:'#2D7A4F'}}>{(TAUX_ACRE[profil.secteur]*100).toFixed(1)}%</span>
                      </div>
                    )}
                    <div style={{textAlign:'center'}}>
                      <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',display:'block',marginBottom:4}}>Taux impôt perso</span>
                      <span style={{fontSize:20,fontFamily:"'Playfair Display',serif",color:'#7A3A0A'}}>{profil.taux_impot_perso||14}%</span>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',display:'block',marginBottom:4}}>Total à prévoir</span>
                      <span style={{fontSize:20,fontFamily:"'Playfair Display',serif",color:'#1C1710'}}>~{((TAUX[profil.secteur]+(parseFloat(profil.taux_impot_perso)||14)/100)*100).toFixed(0)}%</span>
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
                <div style={{marginTop:10,fontSize:12,color:'#A89878'}}>
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
                  <div style={{marginTop:8,fontSize:11,color:'#A89878',lineHeight:1.6}}>
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
                <span style={{fontSize:13,color:'#6B5E45',fontWeight:500}}>Assistant Serelyo</span>
              </div>
              {asking
                ? <div style={{display:'flex',alignItems:'center',gap:10,padding:'1rem 0',color:'#A89878'}}><div className="ring"/>Je réfléchis à ta question…</div>
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
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:'2rem'}}>
                <div
                  onClick={()=>setSimMode('rapide')}
                  style={{
                    background: simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel' ? '#1C1710' : '#FFFDF8',
                    border: simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel' ? '2px solid #1C1710' : '2px solid #E2D8C4',
                    borderRadius:20, padding:'1.75rem', cursor:'pointer', transition:'all .2s',
                    boxShadow: simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel' ? '0 8px 32px rgba(28,23,16,.2)' : '0 2px 12px rgba(28,23,16,.05)'
                  }}
                >
                  <div style={{fontSize:36,marginBottom:12}}>⚡</div>
                  <div style={{
                    fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,marginBottom:8,
                    color: simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel' ? '#fff' : '#1C1710'
                  }}>Calcul rapide</div>
                  <div style={{
                    fontSize:13,lineHeight:1.6,
                    color: simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel' ? 'rgba(255,255,255,.65)' : '#6B5E45'
                  }}>Tu as encaissé un paiement ?<br/>Calcule instantanément ce que tu dois mettre de côté.</div>
                  {(simMode==='rapide'||simMode!=='mensuel'&&simMode!=='annuel'&&simMode!=='mensuel_annuel') && (
                    <div style={{marginTop:14,display:'inline-block',background:'#B5792A',color:'#fff',fontSize:11,fontWeight:600,padding:'4px 12px',borderRadius:20}}>Mode actif</div>
                  )}
                </div>
                <div
                  onClick={()=>setSimMode('mensuel')}
                  style={{
                    background: simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel' ? '#1C1710' : '#FFFDF8',
                    border: simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel' ? '2px solid #1C1710' : '2px solid #E2D8C4',
                    borderRadius:20, padding:'1.75rem', cursor:'pointer', transition:'all .2s',
                    boxShadow: simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel' ? '0 8px 32px rgba(28,23,16,.2)' : '0 2px 12px rgba(28,23,16,.05)'
                  }}
                >
                  <div style={{fontSize:36,marginBottom:12}}>📊</div>
                  <div style={{
                    fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,marginBottom:8,
                    color: simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel' ? '#fff' : '#1C1710'
                  }}>Simulation annuelle</div>
                  <div style={{
                    fontSize:13,lineHeight:1.6,
                    color: simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel' ? 'rgba(255,255,255,.65)' : '#6B5E45'
                  }}>Visualise toute ton année :<br/>revenus, charges et net mois par mois avec graphique.</div>
                  {(simMode==='mensuel'||simMode==='annuel'||simMode==='mensuel_annuel') && (
                    <div style={{marginTop:14,display:'inline-block',background:'#B5792A',color:'#fff',fontSize:11,fontWeight:600,padding:'4px 12px',borderRadius:20}}>Mode actif</div>
                  )}
                </div>
              </div>

              {/* ── MODE CALCUL RAPIDE ── */}
              {simMode==='rapide' && (() => {
                return (
                  <>
                    {/* Infos secteur */}
                    <div className="card" style={{marginBottom:'1rem',background:'#FAF3E0',border:'1px solid #E8D5A8'}}>
                      <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                        <div>
                          <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',display:'block',marginBottom:4}}>Ton secteur</span>
                          <span style={{fontSize:14,color:'#1C1710',fontWeight:500}}>{SECTEURS.find(s=>s.value===profil.secteur)?.label||profil.secteur}</span>
                        </div>
                        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                          <div style={{textAlign:'center'}}>
                            <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',display:'block',marginBottom:4}}>Taux URSSAF</span>
                            <span style={{fontSize:20,fontFamily:"'Playfair Display',serif",color:'#B5792A'}}>{(TAUX[profil.secteur]*100).toFixed(1)}%</span>
                          </div>
                          {profil.acre && (
                            <div style={{textAlign:'center'}}>
                              <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',display:'block',marginBottom:4}}>Avec ACRE</span>
                              <span style={{fontSize:20,fontFamily:"'Playfair Display',serif",color:'#2D7A4F'}}>{(TAUX_ACRE[profil.secteur]*100).toFixed(1)}%</span>
                            </div>
                          )}
                          <div style={{textAlign:'center'}}>
                            <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',display:'block',marginBottom:4}}>Taux impôt</span>
                            <span style={{fontSize:20,fontFamily:"'Playfair Display',serif",color:'#7A3A0A'}}>{profil.taux_impot_perso||14}%</span>
                          </div>
                          <div style={{textAlign:'center'}}>
                            <span style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',display:'block',marginBottom:4}}>Total à prévoir</span>
                            <span style={{fontSize:20,fontFamily:"'Playfair Display',serif",color:'#1C1710'}}>~{((TAUX[profil.secteur]+(parseFloat(profil.taux_impot_perso)||14)/100)*100).toFixed(0)}%</span>
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
                      <div style={{marginTop:10,fontSize:12,color:'#A89878'}}>
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
                        <div style={{marginTop:8,fontSize:11,color:'#A89878'}}>⚠️ Estimation basée sur les taux officiels URSSAF. Consulte un comptable pour une simulation précise.</div>
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
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,flexWrap:'wrap'}}>
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
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:'1.5rem'}}>
                      <div style={{background:'#1C1710',borderRadius:16,padding:'1.1rem',textAlign:'center'}}>
                        <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(255,255,255,.5)',marginBottom:6}}>CA Total</div>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:'#fff'}}>{totCA.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                      </div>
                      <div style={{background:'#FFF3F3',border:'1px solid #FFCACA',borderRadius:16,padding:'1.1rem',textAlign:'center'}}>
                        <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',marginBottom:6}}>URSSAF ({(tauxU*100).toFixed(1)}%)</div>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:'#8B1A1A'}}>{totUrssaf.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                      </div>
                      <div style={{background:'#FFF4E6',border:'1px solid #FFD5A0',borderRadius:16,padding:'1.1rem',textAlign:'center'}}>
                        <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',marginBottom:6}}>Impôts (~{Math.round(tauxI*100)}%)</div>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:'#7A3A0A'}}>{totImpots.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                      </div>
                      <div style={{background:'#EDFAF3',border:'1px solid #9CDBB8',borderRadius:16,padding:'1.1rem',textAlign:'center'}}>
                        <div style={{fontSize:10,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',marginBottom:6}}>Net estimé</div>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:'#2D7A4F'}}>{totNet.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div>
                        <div style={{fontSize:11,color:'#2D7A4F',opacity:.7}}>{Math.round(totNet/12).toLocaleString('fr-FR')} €/mois</div>
                      </div>
                    </div>

                    {/* Graphique barres empilées */}
                    <div className="card" style={{marginBottom:'1.5rem'}}>
                      <div className="card-title">Répartition mensuelle — barres empilées</div>
                      <div style={{fontSize:12,color:'#A89878',marginBottom:14}}>Chaque barre = ton CA total, découpé en 3 couches</div>

                      {/* Légende */}
                      <div style={{display:'flex',gap:20,marginBottom:16,flexWrap:'wrap'}}>
                        {[['#2D7A4F','Net (ce qui reste)'],['#FFA94D','Impôts'],['#FF6B6B','URSSAF']].map(([color,label])=>(
                          <div key={label} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#6B5E45'}}>
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
                              <line x1="40" y1={chartH-p*chartH} x2={moisData.length*(barW+gap)+50} y2={chartH-p*chartH} stroke="#F0EBE0" strokeWidth="1" strokeDasharray="4,3"/>
                              <text x="0" y={chartH-p*chartH+4} fontSize="9" fill="#A89878">{Math.round(maxVal*p/1000)}k€</text>
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
                                <rect x={x} y={chartH-8} width={barW} height={8} fill="#F0EBE0" rx="3"/>
                                <text x={x+barW/2} y={chartH+18} textAnchor="middle" fontSize="10" fill="#D0C8B8">{m.nom}</text>
                              </g>
                            )
                            return (
                              <g key={i}>
                                <title>{m.nom} — CA : {Math.round(m.ca).toLocaleString('fr-FR')}€ | Net : {Math.round(m.net).toLocaleString('fr-FR')}€ | URSSAF : {Math.round(m.urssaf).toLocaleString('fr-FR')}€ | Impôts : {Math.round(m.impots).toLocaleString('fr-FR')}€</title>
                                {/* NET — couche du haut (vert) */}
                                <rect x={x} y={chartH-hTotal} width={barW} height={hN} fill="#2D7A4F" rx="4"/>
                                <rect x={x} y={chartH-hTotal+4} width={barW} height={Math.max(hN-4,0)} fill="#2D7A4F"/>
                                {/* IMPOTS — couche du milieu (orange) */}
                                <rect x={x} y={chartH-hU-hI} width={barW} height={hI} fill="#FFA94D"/>
                                {/* URSSAF — couche du bas (rouge) */}
                                <rect x={x} y={chartH-hU} width={barW} height={hU} fill="#FF6B6B"/>
                                <rect x={x} y={chartH-hU} width={barW} height={Math.max(hU-4,0)} fill="#FF6B6B"/>
                                <rect x={x} y={chartH-4} width={barW} height={4} fill="#FF6B6B" rx="0"/>
                                <rect x={x} y={chartH-hU} width={barW} height={4} fill="#FF6B6B" rx="2"/>
                                {/* Valeur nette au dessus */}
                                {hTotal > 30 && <text x={x+barW/2} y={chartH-hTotal-5} textAnchor="middle" fontSize="9" fill="#2D7A4F" fontWeight="600">{Math.round(m.net/1000*10)/10}k</text>}
                                {/* Mois en dessous */}
                                <text x={x+barW/2} y={chartH+18} textAnchor="middle" fontSize="10" fill="#6B5E45">{m.nom}</text>
                                {/* CA total en petit */}
                                <text x={x+barW/2} y={chartH+30} textAnchor="middle" fontSize="9" fill="#A89878">{Math.round(m.ca/1000*10)/10}k</text>
                              </g>
                            )
                          })}
                        </svg>
                      </div>
                      <div style={{fontSize:11,color:'#A89878',marginTop:8,textAlign:'center'}}>
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
                                <td style={{color:'#8B1A1A'}}>{Math.round(m.urssaf).toLocaleString('fr-FR')} €</td>
                                <td style={{color:'#7A3A0A'}}>{Math.round(m.impots).toLocaleString('fr-FR')} €</td>
                                <td style={{color:'#B5792A',fontWeight:500}}>{Math.round(m.urssaf+m.impots).toLocaleString('fr-FR')} €</td>
                                <td style={{color:'#2D7A4F',fontWeight:600}}>{Math.round(m.net).toLocaleString('fr-FR')} €</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="rev-total">
                              <td>TOTAL</td>
                              <td>{Math.round(totCA).toLocaleString('fr-FR')} €</td>
                              <td style={{color:'#8B1A1A'}}>{Math.round(totUrssaf).toLocaleString('fr-FR')} €</td>
                              <td style={{color:'#7A3A0A'}}>{Math.round(totImpots).toLocaleString('fr-FR')} €</td>
                              <td style={{color:'#B5792A'}}>{Math.round(totUrssaf+totImpots).toLocaleString('fr-FR')} €</td>
                              <td style={{color:'#2D7A4F'}}>{Math.round(totNet).toLocaleString('fr-FR')} €</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Alertes seuils */}
                    <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:'1.5rem'}}>
                      {[
                        { label:'Seuil TVA', val:seuil_tva, pct:Math.min((totCA/seuil_tva)*100,100), color:'#B5792A' },
                        { label:'Plafond micro-entreprise', val:plafond, pct:Math.min((totCA/plafond)*100,100), color:'#2D7A4F' }
                      ].map(({label,val,pct,color})=>(
                        <div key={label} className="card" style={{padding:'1rem 1.25rem'}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                            <span style={{fontSize:13,fontWeight:500,color:'#1C1710'}}>{label}</span>
                            <span style={{fontSize:12,color:'#A89878'}}>{Math.round(totCA).toLocaleString('fr-FR')} € / {val.toLocaleString('fr-FR')} €</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{width:pct+'%',background:pct>85?'#C0392B':pct>60?color:'#2D7A4F'}}/>
                          </div>
                          {pct>85&&<div className="seuil-alert" style={{marginTop:8}}>⚠️ À ce rythme tu dépasses le {label.toLowerCase()} — consulte un comptable.</div>}
                          {pct<=85&&<div style={{fontSize:11,color:'#A89878',marginTop:6}}>Il te reste {(val-totCA).toLocaleString('fr-FR',{maximumFractionDigits:0})} € avant d'atteindre ce seuil</div>}
                        </div>
                      ))}
                    </div>

                    <div style={{fontSize:11,color:'#A89878',lineHeight:1.7,padding:'12px 16px',background:'#F6F0E4',borderRadius:12}}>
                      ⚠️ <strong style={{color:'#1C1710'}}>Simulation indicative</strong> — Les montants sont calculés sur la base des taux officiels URSSAF {new Date().getFullYear()} pour ton secteur ({(tauxU*100).toFixed(1)}%). Le taux d'imposition réel dépend de ta situation fiscale globale. Ces chiffres ne constituent pas un conseil comptable.
                    </div>
                  </>
                )
              })()}
              </>
              )}
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
          <div style={{background:'#EEF4FF',border:'1px solid #C3D8F8',borderRadius:14,padding:'12px 16px',marginBottom:'1.5rem',fontSize:12,color:'#1A4A8A',lineHeight:1.7}}>
            ℹ️ <strong>Note légale :</strong> Pour les artisans du bâtiment, réparateurs auto et coiffeurs, le devis est obligatoire au-delà de 150€ et doit contenir des mentions spécifiques. Serelyo génère des devis conformes aux recommandations pour tous les secteurs. En cas de doute, consultez un professionnel juridique.
          </div>

          {/* Stats rapides */}
          {devis.length > 0 && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:'1.5rem'}}>
              {[
                ['Total devis',devis.length,'#1C1710','#FFFDF8'],
                ['En attente',devis.filter(d=>d.statut==='en_attente').length,'#B5792A','#FAF3E0'],
                ['Acceptés',devis.filter(d=>d.statut==='accepte').length,'#2D7A4F','#EDFAF3'],
                ['Refusés',devis.filter(d=>d.statut==='refuse').length,'#8B1A1A','#FFF3F3'],
              ].map(([label,val,color,bg])=>(
                <div key={label} style={{background:bg,border:`1px solid ${color}22`,borderRadius:16,padding:'1rem',textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',color:'#A89878',marginBottom:6}}>{label}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color}}>{val}</div>
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
                  fontFamily:'Outfit,sans-serif',border:'1.5px solid',transition:'all .15s',
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
              <p style={{fontSize:13,color:'#A89878',marginBottom:'1.5rem'}}>Crée ton premier devis en quelques clics</p>
              <button className="btn btn-dark" onClick={()=>setShowDevisForm(true)}>+ Créer un devis</button>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {devis.filter(d=>devisFiltre==='tous'||d.statut===devisFiltre).length===0 ? (
                <div style={{textAlign:'center',padding:'2rem',color:'#A89878',fontSize:13}}>Aucun devis dans cette catégorie</div>
              ) : (
                devis.filter(d=>devisFiltre==='tous'||d.statut===devisFiltre).map(d=>{
                  const statutLabel = {en_attente:'En attente',accepte:'Accepté',refuse:'Refusé',expire:'Expiré'}
                  const statutColor = {en_attente:{bg:'#FAF3E0',color:'#B5792A'},accepte:{bg:'#EDFAF3',color:'#2D7A4F'},refuse:{bg:'#FFF3F3',color:'#8B1A1A'},expire:{bg:'#F5F5F5',color:'#666'}}
                  const sc = statutColor[d.statut]||statutColor.en_attente
                  return (
                    <div key={d.id} className="card" style={{padding:'1rem 1.25rem',cursor:'pointer',transition:'all .15s'}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='#E8D5A8'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='#E2D8C4'}
                    >
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                        <div style={{display:'flex',gap:14,alignItems:'center'}} onClick={()=>imprimerDevis(d,profil)}>
                          <div style={{width:44,height:44,background:'#FAF3E0',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📄</div>
                          <div>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                              <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600,color:'#1C1710'}}>{d.numero}</span>
                              <span style={{fontSize:10,fontWeight:600,padding:'3px 9px',borderRadius:20,background:sc.bg,color:sc.color}}>{statutLabel[d.statut]||'En attente'}</span>
                            </div>
                            <div style={{fontSize:14,color:'#1C1710',fontWeight:500}}>{d.client_nom}</div>
                            <div style={{fontSize:11,color:'#A89878',marginTop:2}}>
                              Émis le {d.date_emission} · valable jusqu'au {d.date_validite}
                            </div>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:'#1C1710',textAlign:'right'}}>
                            {(d.total_ttc||d.total_ht||0).toLocaleString('fr-FR',{minimumFractionDigits:2})} €
                            <div style={{fontSize:10,color:'#A89878',fontFamily:'Outfit,sans-serif'}}>{d.tva_taux>0?'TTC':'HT'}</div>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',gap:5}} onClick={e=>e.stopPropagation()}>
                            <select
                              style={{fontSize:11,padding:'5px 8px',borderRadius:8,border:'1px solid #E2D8C4',background:'#FBF8F1',color:'#6B5E45',fontFamily:'Outfit,sans-serif',cursor:'pointer'}}
                              value={d.statut}
                              onChange={e=>updateStatutDevis(d.id,e.target.value)}
                            >
                              <option value="en_attente">En attente</option>
                              <option value="accepte">Accepté ✓</option>
                              <option value="refuse">Refusé ✗</option>
                              <option value="expire">Expiré</option>
                            </select>
                            <div style={{display:'flex',gap:5}}>
                              <button onClick={()=>imprimerDevis(d,profil)} style={{flex:1,padding:'5px 8px',fontSize:11,borderRadius:8,border:'1px solid #E2D8C4',background:'#FBF8F1',color:'#6B5E45',cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>👁 Voir</button>
                              <button onClick={()=>supprimerDevis(d.id)} style={{padding:'5px 8px',fontSize:11,borderRadius:8,border:'1px solid #FFCACA',background:'#FFF3F3',color:'#8B1A1A',cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>🗑</button>
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
                      <th style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'#A89878',padding:'0 4px 8px',textAlign:'left',width:'35%'}}>Désignation *</th>
                      <th style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'#A89878',padding:'0 4px 8px',textAlign:'left',width:'20%'}}>Détail</th>
                      <th style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'#A89878',padding:'0 4px 8px',textAlign:'center',width:'10%'}}>Qté</th>
                      <th style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'#A89878',padding:'0 4px 8px',textAlign:'center',width:'12%'}}>Unité</th>
                      <th style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'#A89878',padding:'0 4px 8px',textAlign:'right',width:'15%'}}>Prix HT</th>
                      <th style={{width:'8%'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {devisLignes.map(l=>(
                      <tr key={l.id} style={{borderBottom:'1px solid #FAF3E0'}}>
                        <td style={{padding:'4px'}}><input style={{width:'100%',padding:'7px 8px',borderRadius:8,border:'1.5px solid #E2D8C4',background:'#FBF8F1',fontFamily:'Outfit,sans-serif',fontSize:12}} value={l.designation} onChange={e=>updateLigne(l.id,'designation',e.target.value)} placeholder="Ex: Développement web"/></td>
                        <td style={{padding:'4px'}}><input style={{width:'100%',padding:'7px 8px',borderRadius:8,border:'1.5px solid #E2D8C4',background:'#FBF8F1',fontFamily:'Outfit,sans-serif',fontSize:12}} value={l.detail} onChange={e=>updateLigne(l.id,'detail',e.target.value)} placeholder="Détail optionnel"/></td>
                        <td style={{padding:'4px'}}><input type="number" style={{width:'100%',padding:'7px 8px',borderRadius:8,border:'1.5px solid #E2D8C4',background:'#FBF8F1',fontFamily:'Outfit,sans-serif',fontSize:12,textAlign:'center'}} value={l.quantite} onChange={e=>updateLigne(l.id,'quantite',e.target.value)}/></td>
                        <td style={{padding:'4px'}}>
                          <select style={{width:'100%',padding:'7px 6px',borderRadius:8,border:'1.5px solid #E2D8C4',background:'#FBF8F1',fontFamily:'Outfit,sans-serif',fontSize:12}} value={l.unite} onChange={e=>updateLigne(l.id,'unite',e.target.value)}>
                            <option value="heure">heure</option>
                            <option value="jour">jour</option>
                            <option value="forfait">forfait</option>
                            <option value="unité">unité</option>
                            <option value="mois">mois</option>
                            <option value="m²">m²</option>
                            <option value="km">km</option>
                          </select>
                        </td>
                        <td style={{padding:'4px'}}><input type="number" style={{width:'100%',padding:'7px 8px',borderRadius:8,border:'1.5px solid #E2D8C4',background:'#FBF8F1',fontFamily:'Outfit,sans-serif',fontSize:12,textAlign:'right'}} value={l.prix} onChange={e=>updateLigne(l.id,'prix',e.target.value)} placeholder="0"/></td>
                        <td style={{padding:'4px',textAlign:'center'}}><button onClick={()=>removeLigne(l.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#A89878',fontSize:16,padding:'4px'}}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={addLigne} style={{display:'flex',alignItems:'center',gap:8,background:'transparent',border:'1.5px dashed #E2D8C4',borderRadius:10,padding:'8px 16px',cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:12,color:'#6B5E45',width:'100%',marginBottom:'1rem'}}>+ Ajouter une ligne</button>

                {/* Totaux preview */}
                <div style={{background:'#FAF3E0',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',display:'flex',justifyContent:'flex-end',gap:24}}>
                  <span style={{fontSize:13,color:'#6B5E45'}}>Total HT : <strong style={{color:'#1C1710'}}>{devisHT.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</strong></span>
                  <span style={{fontSize:13,color:'#6B5E45'}}>TVA ({devisTva}%) : <strong style={{color:'#1C1710'}}>{devisTVA_montant.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</strong></span>
                  <span style={{fontSize:13,fontWeight:700,color:'#1C1710'}}>Total : {devisTTC.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</span>
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
            <div className="res-section-title"><span className="res-icon" style={{background:'#FAF3E0',color:'#B5792A'}}>📋</span>Déclarations & paiements</div>
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
            <div className="res-section-title"><span className="res-icon" style={{background:'#EDFAF3',color:'#2D7A4F'}}>🏢</span>Gérer mon auto-entreprise</div>
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
            <div className="res-section-title"><span className="res-icon" style={{background:'#EEF4FF',color:'#1A4A8A'}}>💰</span>Aides & financement</div>
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
            <div className="res-section-title"><span className="res-icon" style={{background:'#FFF4E6',color:'#7A3A0A'}}>🏥</span>Protection sociale & retraite</div>
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
            <div className="res-section-title"><span className="res-icon" style={{background:'#F5F0FF',color:'#6B2D7A'}}>📖</span>Se former & s'informer</div>
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
    </>
  )
}

const CSS = `
.app-bar{background:#1C1710;height:58px;padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200}
.logo{font-family:'Playfair Display',serif;font-size:21px;color:#fff}
.bar-right{display:flex;align-items:center;gap:10px}
.user-tag{font-size:12px;color:rgba(255,255,255,0.5)}
.btn-profile{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:6px 14px;cursor:pointer;color:#fff;font-size:12px;font-family:'Outfit',sans-serif;font-weight:500}
.btn-profile:hover{background:rgba(255,255,255,0.15)}
.btn-logout{font-size:12px;color:rgba(255,255,255,0.4);background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif}
.btn-logout:hover{color:rgba(255,255,255,0.7)}
.nav-tabs{background:#1C1710;border-top:1px solid rgba(255,255,255,0.1);display:flex;padding:0 1rem;gap:2px;flex-wrap:wrap}
.nav-tab{padding:10px 16px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;color:rgba(255,255,255,0.5);border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;transition:all 0.15s;white-space:nowrap}
.nav-tab.active{color:#fff;border-bottom-color:#E8D5A8}
.nav-tab:hover{color:rgba(255,255,255,0.8)}
.main{max-width:900px;margin:0 auto;padding:2rem 1.5rem 5rem}
.welcome-bar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.75rem;flex-wrap:wrap;gap:1rem}
.welcome-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:600;color:#1C1710}
.welcome-sub{font-size:14px;color:#6B5E45;margin-top:4px}
.next-decl{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:14px;padding:14px 18px;text-align:right}
.next-decl-label{font-size:11px;color:#A89878;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.next-decl-date{font-family:'Playfair Display',serif;font-size:16px;color:#B5792A}
.metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:1.5rem}
@media(max-width:700px){.metrics-grid{grid-template-columns:repeat(2,1fr)}}
.metric-card{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:16px;padding:1.1rem 1.25rem}
.metric-label{font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:#A89878;margin-bottom:8px}
.metric-value{font-family:'Playfair Display',serif;font-size:24px;color:#1C1710;margin-bottom:4px}
.metric-sub{font-size:11px;color:#A89878}
.card{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:20px;padding:1.5rem;box-shadow:0 2px 16px rgba(28,23,16,.06)}
.card-title{font-family:'Playfair Display',serif;font-size:17px;margin-bottom:1rem;color:#1C1710}
.seuil-item{} .seuil-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.seuil-label{font-size:13px;color:#6B5E45;font-weight:500} .seuil-val{font-size:12px;color:#A89878}
.progress-bar{height:10px;background:#F6F0E4;border-radius:20px;overflow:hidden}
.progress-fill{height:100%;border-radius:20px;transition:width .5s ease}
.seuil-alert{font-size:12px;color:#8B1A1A;background:#FFF3F3;border:1px solid #FFCACA;border-radius:8px;padding:8px 12px;margin-top:8px}
.page-header{margin-bottom:1.75rem}
.page-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:600;color:#1C1710;margin-bottom:4px}
.page-sub{font-size:14px;color:#6B5E45}
.cal-list{display:flex;flex-direction:column;gap:10px}
.cal-card{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:16px;padding:1.1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.cal-current{border-color:#B5792A;background:#FAF3E0} .cal-special{border-style:dashed} .cal-past{opacity:.65}
.cal-left{display:flex;align-items:center;gap:14px} .cal-right{flex-shrink:0}
.cal-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.dot-done{background:#2D7A4F} .dot-late{background:#C0392B} .dot-pending{background:#E2D8C4}
.cal-label{font-size:14px;font-weight:500;color:#1C1710;margin-bottom:3px} .cal-date{font-size:12px;color:#A89878}
.badge-current{display:inline-block;font-size:10px;font-weight:600;background:#B5792A;color:#fff;padding:3px 9px;border-radius:20px;margin-top:5px}
.badge-done{font-size:12px;font-weight:600;color:#2D7A4F;background:#EDFAF3;padding:6px 14px;border-radius:20px}
.info-box{background:#EEF4FF;border:1px solid #C3D8F8;border-radius:14px;padding:1.1rem 1.25rem}
.info-title{font-size:13px;font-weight:600;color:#1A4A8A;margin-bottom:8px} .info-text{font-size:13px;color:#1A4A8A;line-height:1.8}
.mini-label{font-size:11px;font-weight:600;letter-spacing:.5px;color:#6B5E45;display:block;margin-bottom:5px;text-transform:uppercase}
.mini-input{padding:9px 12px;border-radius:10px;border:1.5px solid #E2D8C4;background:#FBF8F1;color:#1C1710;font-family:'Outfit',sans-serif;font-size:13px;width:100%}
.mini-input:focus{outline:none;border-color:#B5792A;background:#fff}
.rev-table{width:100%;border-collapse:collapse;font-size:13px}
.rev-table thead th{font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:#A89878;padding:0 0 10px;text-align:left;border-bottom:1px solid #E2D8C4}
.rev-table thead th:not(:first-child){text-align:right}
.rev-table tbody tr{border-bottom:1px solid #FAF3E0}
.rev-table tbody td{padding:11px 0;color:#1C1710;vertical-align:top}
.rev-table tbody td:not(:first-child){text-align:right}
.rev-total{border-top:1.5px solid #1C1710!important;font-weight:600}
.calc-result{} .calc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:1rem}
@media(max-width:700px){.calc-grid{grid-template-columns:1fr 1fr}}
.calc-card{border-radius:16px;padding:1.1rem 1.25rem;border:1px solid transparent}
.main-card{background:#1C1710;color:#fff;border-color:#1C1710} .main-card .calc-label{color:rgba(255,255,255,.6)} .main-card .calc-big{color:#fff}
.red-card{background:#FFF3F3;border-color:#FFCACA} .red-card .calc-big{color:#8B1A1A}
.orange-card{background:#FFF4E6;border-color:#FFD5A0} .orange-card .calc-big{color:#7A3A0A}
.amber-card{background:#FAF3E0;border-color:#E8D5A8} .amber-card .calc-big{color:#B5792A}
.green-card{background:#EDFAF3;border-color:#9CDBB8} .green-card .calc-big{color:#2D7A4F}
.calc-label{font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;color:#6B5E45}
.calc-big{font-family:'Playfair Display',serif;font-size:26px;font-weight:600;margin-bottom:4px}
.calc-sub{font-size:11px;color:#A89878;line-height:1.5}
.chips-hint{font-size:11px;color:#A89878;font-weight:500;margin-bottom:10px;display:block}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.chip{font-size:12px;padding:5px 14px;border-radius:30px;border:1px solid #E2D8C4;background:#FBF8F1;color:#6B5E45;cursor:pointer;transition:all .16s}
.chip:hover{background:#FAF3E0;border-color:#E8D5A8;color:#B5792A}
.input-wrap{position:relative}
textarea{width:100%;resize:none;font-family:'Outfit',sans-serif;font-size:14px;font-weight:300;padding:13px 15px 52px;border-radius:13px;border:1.5px solid #E2D8C4;background:#FBF8F1;color:#1C1710;line-height:1.65;min-height:95px}
textarea:focus{outline:none;border-color:#B5792A;background:#fff} textarea::placeholder{color:#A89878}
.btn-gen{position:absolute;bottom:11px;right:11px;padding:9px 20px;border-radius:10px;border:none;background:#1C1710;color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif}
.btn-gen:hover{background:#B5792A} .btn-gen:disabled{background:#ccc;cursor:not-allowed}
.hint-text{font-size:11px;color:#A89878;margin-top:9px}
.reponse-header{display:flex;align-items:center;gap:10px;margin-bottom:1rem}
.reponse-avatar{width:32px;height:32px;border-radius:50%;background:#1C1710;color:#E8D5A8;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'Playfair Display',serif}
.reponse-text{font-size:14px;color:#1C1710;line-height:1.7} .reponse-text p{margin-bottom:.75rem} .reponse-text p:last-child{margin-bottom:0}
.ring{width:20px;height:20px;flex-shrink:0;border:2px solid #E2D8C4;border-top-color:#B5792A;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.question-preview{background:#FBF8F1;border:1px solid #E2D8C4;border-radius:12px;padding:.9rem 1rem;margin-bottom:8px;cursor:pointer;transition:all .15s}
.question-preview:hover{border-color:#E8D5A8;background:#FAF3E0}
.question-text{font-size:13px;color:#1C1710;margin-bottom:4px} .question-date{font-size:11px;color:#A89878}
.link-btn{background:none;border:none;color:#B5792A;font-size:13px;cursor:pointer;font-family:'Outfit',sans-serif;margin-top:8px;padding:0}
.link-btn:hover{text-decoration:underline}
.empty-state{text-align:center;padding:4rem 2rem} .empty-state h3{font-family:'Playfair Display',serif;font-size:20px;color:#6B5E45;margin-bottom:1rem}
.overlay{display:none;position:fixed;inset:0;background:rgba(28,23,16,.6);z-index:300;align-items:center;justify-content:center;padding:1rem;overflow-y:auto}
.overlay.show{display:flex}
.modal{background:#FFFDF8;border-radius:20px;padding:2rem;width:100%;max-width:620px;box-shadow:0 20px 60px rgba(28,23,16,.25);animation:pop .3s cubic-bezier(.16,1,.3,1);margin:auto}
@keyframes pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
.modal-title{font-family:'Playfair Display',serif;font-size:22px;margin-bottom:6px;color:#1C1710}
.modal-sub{font-size:13px;color:#6B5E45;margin-bottom:1.25rem;line-height:1.5}
.prof-section-title{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#B5792A;margin:1.25rem 0 .75rem;padding-bottom:6px;border-bottom:1px solid #FAF3E0}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:.5rem} .form-grid .full{grid-column:1/-1}
.field label{font-size:11px;font-weight:600;letter-spacing:.6px;color:#6B5E45;display:block;margin-bottom:5px;text-transform:uppercase}
.field input,.field select{width:100%;padding:10px 13px;border-radius:10px;border:1.5px solid #E2D8C4;background:#FBF8F1;color:#1C1710;font-family:'Outfit',sans-serif;font-size:13px}
.field input:focus,.field select:focus{outline:none;border-color:#B5792A;background:#fff} .field input::placeholder{color:#A89878}
.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:1.5rem}
.btn{padding:10px 20px;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .17s}
.btn-ghost{background:transparent;border:1px solid #E2D8C4;color:#6B5E45} .btn-ghost:hover{background:#F6F0E4}
.btn-dark{background:#1C1710;border:none;color:#fff} .btn-dark:hover{background:#B5792A}
.btn-amber{background:#FAF3E0;border:1px solid #E8D5A8;color:#B5792A} .btn-amber:hover{background:#B5792A;color:#fff}
.btn-sm{padding:7px 14px;font-size:12px}
.res-section{margin-bottom:2rem}
.res-section-title{display:flex;align-items:center;gap:12px;font-family:'Playfair Display',serif;font-size:18px;color:#1C1710;margin-bottom:1rem;font-weight:600}
.res-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.res-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:700px){.res-grid{grid-template-columns:1fr}}
.res-card{display:block;background:#FFFDF8;border:1px solid #E2D8C4;border-radius:16px;padding:1.1rem 1.25rem;text-decoration:none;color:inherit;transition:all .18s}
.res-card:hover{border-color:#B5792A;box-shadow:0 4px 20px rgba(181,121,42,.12);transform:translateY(-2px)}
.res-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.res-tag{font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;letter-spacing:.3px}
.res-tag-urssaf{background:#FAF3E0;color:#B5792A} .res-tag-impots{background:#EEF4FF;color:#1A4A8A}
.res-tag-gouv{background:#EDFAF3;color:#2D7A4F} .res-tag-aide{background:#F5F0FF;color:#6B2D7A} .res-tag-social{background:#FFF4E6;color:#7A3A0A}
.res-arrow{font-size:16px;color:#E2D8C4;transition:all .18s} .res-card:hover .res-arrow{color:#B5792A}
.res-card-title{font-family:'Playfair Display',serif;font-size:15px;color:#1C1710;margin-bottom:8px;line-height:1.3}
.res-card-desc{font-size:12px;color:#6B5E45;line-height:1.65;margin-bottom:10px}
.res-card-url{font-size:11px;color:#A89878;font-family:monospace} .res-card:hover .res-card-url{color:#B5792A}
.res-disclaimer{background:#F6F0E4;border:1px solid #E2D8C4;border-radius:14px;padding:1rem 1.25rem;font-size:12px;color:#6B5E45;line-height:1.7;margin-top:1rem}
.res-disclaimer strong{color:#1C1710}
`
