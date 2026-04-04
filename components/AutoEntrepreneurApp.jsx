'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'

const TAUX = { services_bnc:0.212, services_bic:0.212, liberal:0.212, ventes:0.123 }
const TAUX_ACRE = { services_bnc:0.106, services_bic:0.106, liberal:0.106, ventes:0.0615 }
const SEUILS = { tva_services:36800, tva_ventes:91900, plafond_services:77700, plafond_ventes:188700 }
const SECTEURS = [
  { value:'services_bnc', label:'Prestation de services (BNC) — consultant, freelance, coach…' },
  { value:'services_bic', label:'Prestation de services (BIC) — artisan, réparation…' },
  { value:'liberal',      label:'Profession libérale réglementée — médecin, avocat, kiné…' },
  { value:'ventes',       label:'Vente de marchandises — e-commerce, produits…' },
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
  const [revMois, setRevMois]       = useState('')
  const [revMontant, setRevMontant] = useState('')
  const [savingRev, setSavingRev]   = useState(false)

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
  if (!revMois || !revMontant) { alert('Remplis le mois et le montant'); return }
  setSavingRev(true)
  const montant = parseFloat(revMontant) || 0

  // Vérifier si ce mois existe déjà
  const { data: existing } = await supabase
    .from('ae_revenus')
    .select('id')
    .eq('user_id', user.id)
    .eq('mois', revMois)
    .single()

  let error
  if (existing) {
    const res = await supabase.from('ae_revenus').update({ montant }).eq('id', existing.id)
    error = res.error
  } else {
    const res = await supabase.from('ae_revenus').insert({ user_id: user.id, mois: revMois, montant })
    error = res.error
  }

  if (error) { alert('Erreur : ' + error.message); setSavingRev(false); return }
  setRevenus(prev => [{ user_id: user.id, mois: revMois, montant }, ...prev.filter(r => r.mois !== revMois)].sort((a, b) => b.mois.localeCompare(a.mois)))
  setRevMois(''); setRevMontant(''); setSavingRev(false)
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

  const tauxImpot = profil ? (parseFloat(profil.taux_impot_perso)||14) / 100 : 0.14

  const calculer = () => {
    const ca = parseFloat(calcCA)||0
    if (!ca||!profil) return
    const taux = profil.acre ? TAUX_ACRE[profil.secteur] : TAUX[profil.secteur]
    const cotisations = ca*taux
    const impots_estimes = ca*tauxImpot
    const seuil_tva = profil.secteur==='ventes'?SEUILS.tva_ventes:SEUILS.tva_services
    const plafond = profil.secteur==='ventes'?SEUILS.plafond_ventes:SEUILS.plafond_services
    const caAnnuel = revenus.slice(0,12).reduce((s,r)=>s+r.montant,0)+ca
    setCalcResult({ ca, cotisations, impots_estimes, taux, tauxImpot, a_mettre_de_cote:cotisations+impots_estimes, net_estime:ca-cotisations-impots_estimes, seuil_tva, plafond, caAnnuel, alerte_tva:caAnnuel>seuil_tva*0.85, alerte_plafond:caAnnuel>plafond*0.85 })
  }

  const { year, month } = getNow()
  const caAnnuel      = revenus.filter(r=>r.mois.startsWith(String(year))).reduce((s,r)=>s+r.montant,0)
  const caMois        = revenus.find(r=>r.mois===`${year}-${String(month).padStart(2,'0')}`)?.montant||0
  const taux          = profil?(profil.acre?TAUX_ACRE[profil.secteur]:TAUX[profil.secteur]):0
  const cotisAnnuel   = caAnnuel*taux
  const seuil_tva     = profil?.secteur==='ventes'?SEUILS.tva_ventes:SEUILS.tva_services
  const plafond       = profil?.secteur==='ventes'?SEUILS.plafond_ventes:SEUILS.plafond_services
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
        {[['dashboard','🏠 Tableau de bord'],['calendrier','📅 Calendrier'],['revenus','💶 Mes revenus'],['calculateur','🧮 Calculateur'],['assistant','💬 Assistant IA'],['ressources','📚 Ressources']].map(([v,l])=>(
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
                <label>Secteur d'activité *</label>
                <select value={oForm.secteur} onChange={set('secteur')}>
                  {SECTEURS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
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
                <label>ACRE ?</label>
                <select value={oForm.acre?'oui':'non'} onChange={setBool('acre')}>
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
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
              <div className="metric-sub">{profil?.acre?'✓ ACRE actif':'Taux normal'}</div>
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
          <div className="card" style={{marginBottom:'1.5rem'}}>
            <div className="card-title">Ajouter / modifier un mois</div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
              <div><span className="mini-label">Mois</span><input className="mini-input" type="month" value={revMois} onChange={e=>setRevMois(e.target.value)}/></div>
              <div><span className="mini-label">CA encaissé (€ HT)</span><input className="mini-input" type="number" value={revMontant} onChange={e=>setRevMontant(e.target.value)} placeholder="3 500" style={{width:160}}/></div>
              <button className="btn btn-dark" onClick={saveRevenu} disabled={savingRev}>{savingRev?'Sauvegarde…':'Enregistrer →'}</button>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Historique {year}</div>
            {revenus.filter(r=>r.mois.startsWith(String(year))).length===0
              ? <p style={{fontSize:13,color:'#A89878',padding:'1rem 0'}}>Aucun revenu saisi pour {year}.</p>
              : (
                <table className="rev-table">
                  <thead><tr><th>Mois</th><th>CA</th><th>URSSAF ({(taux*100).toFixed(1)}%)</th><th>Impôts (~{profil?.taux_impot_perso||14}%)</th><th>Net estimé</th></tr></thead>
                  <tbody>
                    {revenus.filter(r=>r.mois.startsWith(String(year))).map(r=>{
                      const cotis=r.montant*taux, impots=r.montant*tauxImpot, net=r.montant-cotis-impots
                      return (
                        <tr key={r.mois}>
                          <td>{formatMois(r.mois)}</td>
                          <td><strong>{r.montant.toLocaleString('fr-FR')} €</strong></td>
                          <td style={{color:'#8B1A1A'}}>{cotis.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                          <td style={{color:'#7A3A0A'}}>{impots.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                          <td style={{color:'#2D7A4F',fontWeight:600}}>{net.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                        </tr>
                      )
                    })}
                    <tr className="rev-total">
                      <td>Total {year}</td>
                      <td>{caAnnuel.toLocaleString('fr-FR')} €</td>
                      <td style={{color:'#8B1A1A'}}>{(caAnnuel*taux).toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                      <td style={{color:'#7A3A0A'}}>{(caAnnuel*tauxImpot).toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                      <td style={{color:'#2D7A4F'}}>{(caAnnuel*(1-taux-tauxImpot)).toLocaleString('fr-FR',{maximumFractionDigits:0})} €</td>
                    </tr>
                  </tbody>
                </table>
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
              <div className="card" style={{marginBottom:'1.5rem'}}>
                <div className="card-title">Simuler un encaissement</div>
                <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
                  <div>
                    <span className="mini-label">Montant encaissé (€ HT)</span>
                    <input className="mini-input" type="number" value={calcCA} onChange={e=>setCalcCA(e.target.value)} onKeyDown={e=>e.key==='Enter'&&calculer()} placeholder="2 500" style={{width:200,fontSize:18,padding:'12px 14px'}}/>
                  </div>
                  <button className="btn btn-dark" style={{padding:'12px 24px'}} onClick={calculer}>Calculer →</button>
                </div>
              </div>
              {calcResult && (
                <div className="calc-result">
                  <div className="calc-grid">
                    <div className="calc-card main-card"><div className="calc-label">CA encaissé</div><div className="calc-big">{calcResult.ca.toLocaleString('fr-FR')} €</div></div>
                    <div className="calc-card red-card"><div className="calc-label">URSSAF à payer ({(calcResult.taux*100).toFixed(1)}%)</div><div className="calc-big">{calcResult.cotisations.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div><div className="calc-sub">À déclarer sur autoentrepreneur.urssaf.fr</div></div>
                    <div className="calc-card orange-card"><div className="calc-label">Impôts estimés ({profil.taux_impot_perso||14}%)</div><div className="calc-big">{calcResult.impots_estimes.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div><div className="calc-sub">Basé sur ton taux perso dans le profil</div></div>
                    <div className="calc-card amber-card"><div className="calc-label">Total à mettre de côté</div><div className="calc-big">{calcResult.a_mettre_de_cote.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div><div className="calc-sub">{((calcResult.taux+calcResult.tauxImpot)*100).toFixed(0)}% du CA</div></div>
                    <div className="calc-card green-card"><div className="calc-label">Net estimé (ce qui reste)</div><div className="calc-big">{calcResult.net_estime.toLocaleString('fr-FR',{maximumFractionDigits:0})} €</div><div className="calc-sub">Après URSSAF et impôts</div></div>
                  </div>
                  {(calcResult.alerte_tva||calcResult.alerte_plafond)&&(
                    <div style={{marginTop:'1rem'}}>
                      {calcResult.alerte_tva&&<div className="seuil-alert">⚠️ Attention : avec ce CA annuel estimé ({calcResult.caAnnuel.toLocaleString('fr-FR')} €), tu approches du seuil de TVA ({calcResult.seuil_tva.toLocaleString('fr-FR')} €).</div>}
                      {calcResult.alerte_plafond&&<div className="seuil-alert" style={{marginTop:8}}>⚠️ Tu approches du plafond micro-entreprise ({calcResult.plafond.toLocaleString('fr-FR')} €). Consulte un comptable.</div>}
                    </div>
                  )}
                  <div className="info-box" style={{marginTop:'1rem'}}>
                    <div className="info-text">💡 <strong>Conseil :</strong> Dès que tu reçois un virement client, mets <strong>{((calcResult.taux+calcResult.tauxImpot)*100).toFixed(0)}%</strong> de côté immédiatement sur un compte séparé. Tu ne seras jamais pris au dépourvu.</div>
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
