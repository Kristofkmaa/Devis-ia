'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../lib/supabase'

// ─── Constantes ───────────────────────────────────
const fmt = v => (+v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const CAT_COLORS = ['#B5792A','#2D7A4F','#1A4A8A','#8B1A1A','#6B2D7A','#2D5A7A','#7A5A2D','#2D7A5A']
const STATUS_LABELS = { en_attente:'En attente', accepte:'Accepté', refuse:'Refusé', paye:'Payé', retard:'En retard', annule:'Annulé' }
const STATUS_CLASSES = { en_attente:'s-attente', accepte:'s-accepte', refuse:'s-refuse', paye:'s-paye', retard:'s-retard', annule:'s-annule' }
const STATUS_OPTIONS_DEVIS = ['en_attente','accepte','refuse','paye','retard','annule']
const STATUS_OPTIONS_FAC   = ['en_attente','accepte','paye','retard','annule']
const DEFAULT_CATS = ['Graphisme','Développement web','Conseil','Travaux','Formation','Vêtements','Autre']
const EXAMPLES = [
  "Création site vitrine WordPress 5 pages pour TechParis SARL. 4 jours à 500 €/jour, livraison 3 semaines.",
  "2 jours audit organisationnel pour Monsieur Dubois à 800 €/jour + demi-journée restitution à 400 €.",
  "Remplacement chauffe-eau 200 L pour Madame Leclerc. Fourniture 380 € + 4 h à 65 €/h.",
  "Identité visuelle pour l'agence Bloom : logo 3 déclinaisons, charte graphique, 2 templates. Forfait 1 800 €.",
  "Formation gestion du temps pour LogiGroup, 12 collaborateurs, 2 jours à 1 200 €/jour.",
]

function nextNum(prefix) {
  const key = 'counter_' + prefix
  let n = parseInt(localStorage.getItem(key) || '0') + 1
  localStorage.setItem(key, n)
  return prefix + '-' + String(n).padStart(4, '0')
}

// ─── Composant principal ──────────────────────────
export default function DevisApp({ user, onLogout }) {
  const supabase = createClient()

  // Navigation
  const [view, setView]         = useState('create') // 'create' | 'history'

  // Données
  const [history, setHistory]   = useState([])
  const [trash, setTrash]       = useState([])
  const [profil, setProfil]     = useState(null)
  const [categories, setCats]   = useState(DEFAULT_CATS)

  // UI Create
  const [appMode, setAppMode]   = useState('ia')
  const [docType, setDocType]   = useState('devis')
  const [prompt, setPrompt]     = useState('')
  const [generating, setGen]    = useState(false)
  const [genError, setGenErr]   = useState('')
  const [saved, setSaved]       = useState(null)

  // UI Manuel
  const [lines, setLines]       = useState([{id:1,ref:'',desig:'',detail:'',qty:1,prix:0},{id:2,ref:'',desig:'',detail:'',qty:1,prix:0},{id:3,ref:'',desig:'',detail:'',qty:1,prix:0}])
  const [lineId, setLineId]     = useState(3)
  const [mClient, setMClient]   = useState({nom:'',adresse:'',type:'entreprise',ref:''})
  const [mTva, setMTva]         = useState(20)

  // UI History
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')

  // Modals
  const [showProfile, setShowProf] = useState(false)
  const [showDelete, setShowDel]   = useState(false)
  const [pendingDel, setPendDel]   = useState(null)
  const [tvaActif, setTvaActif]    = useState(false)
  const [newCat, setNewCat]        = useState('')

  // Profil form
  const [pForm, setPForm] = useState({
    nom:'', metier:'', adresse:'', siret:'', email:'', tel:'', iban:'', bic:'',
    tva_num:'', forme_juridique:'', capital:'', rcs:'', ape:'',
    conditions_paiement:'Paiement à 30 jours', modes_paiement:'', cgv:'', taux_defaut:'', logo:''
  })

  // ─── Chargement données Supabase ──────────────
  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user])

  const loadAll = async () => {
    // Profil
    const { data: p } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    if (p) {
      setProfil(p)
      setPForm(f => ({ ...f, ...p }))
      setTvaActif(!!p.tva_actif)
      if (p.categories) setCats(p.categories)
    }
    // Documents
    const { data: docs } = await supabase.from('documents').select('*').eq('user_id', user.id).eq('trashed', false).order('created_at', { ascending: false })
    if (docs) setHistory(docs)
    // Corbeille
    const { data: bin } = await supabase.from('documents').select('*').eq('user_id', user.id).eq('trashed', true).order('created_at', { ascending: false })
    if (bin) setTrash(bin)
  }

  // ─── Profil ───────────────────────────────────
  const saveProfile = async () => {
    if (!pForm.nom || !pForm.siret) { alert('Nom et SIRET obligatoires'); return }
    const data = { ...pForm, user_id: user.id, tva_actif: tvaActif, categories }
    const { error } = await supabase.from('profiles').upsert(data, { onConflict: 'user_id' })
    if (!error) { setProfil(data); setShowProf(false) }
  }

  // ─── Catégories ───────────────────────────────
  const addCat = async (name) => {
    if (!name || categories.includes(name)) return
    const newCats = [...categories, name]
    setCats(newCats)
    await supabase.from('profiles').upsert({ user_id: user.id, categories: newCats }, { onConflict: 'user_id' })
  }
  const deleteCat = async (cat) => {
    const newCats = categories.filter(c => c !== cat)
    setCats(newCats)
    if (filter === 'k:' + cat) setFilter('all')
    await supabase.from('profiles').upsert({ user_id: user.id, categories: newCats }, { onConflict: 'user_id' })
  }

  // ─── Génération IA ────────────────────────────
  const generateIA = async () => {
    if (!prompt.trim()) return
    setGen(true); setGenErr(''); setSaved(null)
    const now = new Date(), d1 = now.toLocaleDateString('fr-FR')
    const due = new Date(now); due.setDate(due.getDate() + 30)
    const num = nextNum(docType === 'facture' ? 'FAC' : 'DEV')
    try {
      const res  = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const entry = { doc: data.doc, num, d1, d2: due.toLocaleDateString('fr-FR'), isFac: docType === 'facture' }
      setSaved(entry)
      await saveDoc(entry)
    } catch(e) { setGenErr('Erreur : ' + e.message) }
    setGen(false)
  }

  // ─── Génération Manuel ────────────────────────
  const generateManuel = async () => {
    if (!mClient.nom.trim()) { alert('Nom du client requis'); return }
    if (lines.filter(l => l.desig).length === 0) { alert('Ajoutez au moins une ligne'); return }
    const now = new Date(), d1 = now.toLocaleDateString('fr-FR')
    const due = new Date(now); due.setDate(due.getDate() + 30)
    const num = nextNum(docType === 'facture' ? 'FAC' : 'DEV')
    const doc = {
      client: { nom: mClient.nom, adresse: mClient.adresse, type: mClient.type },
      lignes: lines.filter(l => l.desig).map(l => ({ ref: l.ref, designation: l.desig, detail: l.detail, quantite: l.qty, unite: 'unité', prix_unitaire: l.prix })),
      tva_taux: mTva, conditions: 'Paiement à 30 jours', validite: '30 jours',
      ref_commande: mClient.ref, date_prestation: ''
    }
    const entry = { doc, num, d1, d2: due.toLocaleDateString('fr-FR'), isFac: docType === 'facture' }
    setSaved(entry)
    await saveDoc(entry)
  }

  // ─── Sauvegarde Supabase ──────────────────────
  const saveDoc = async (entry) => {
    const { doc, num, d1, isFac } = entry
    const ht  = doc.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
    const tvaR = (profil && !profil.tva_actif) ? 0 : (doc.tva_taux || 20)
    const row  = {
      id: num, user_id: user.id, type: isFac ? 'facture' : 'devis',
      date: d1, client_nom: doc.client.nom, client_type: doc.client.type,
      total_ht: ht, total_ttc: ht * (1 + tvaR / 100),
      status: 'en_attente', category: '', trashed: false,
      payload: entry
    }
    const { data } = await supabase.from('documents').upsert(row, { onConflict: 'id' }).select()
    if (data) setHistory(prev => [row, ...prev.filter(h => h.id !== num)])
  }

  const updateStatus = async (id, status) => {
    await supabase.from('documents').update({ status }).eq('id', id).eq('user_id', user.id)
    setHistory(prev => prev.map(h => h.id === id ? { ...h, status } : h))
  }

  const updateCat = async (id, category) => {
    await supabase.from('documents').update({ category }).eq('id', id).eq('user_id', user.id)
    setHistory(prev => prev.map(h => h.id === id ? { ...h, category } : h))
  }

  const moveToTrash = async () => {
    if (!pendingDel) return
    const doc = history.find(h => h.id === pendingDel)
    if (doc) {
      await supabase.from('documents').update({ trashed: true, deleted_at: new Date().toLocaleDateString('fr-FR') }).eq('id', pendingDel).eq('user_id', user.id)
      setHistory(prev => prev.filter(h => h.id !== pendingDel))
      setTrash(prev => [{ ...doc, trashed: true, deleted_at: new Date().toLocaleDateString('fr-FR') }, ...prev])
    }
    setPendDel(null); setShowDel(false)
  }

  const restoreDoc = async (id) => {
    await supabase.from('documents').update({ trashed: false, deleted_at: null }).eq('id', id).eq('user_id', user.id)
    const doc = trash.find(h => h.id === id)
    if (doc) { setHistory(prev => [{ ...doc, trashed: false }, ...prev]); setTrash(prev => prev.filter(h => h.id !== id)) }
  }

  const permanentDelete = async (id) => {
    await supabase.from('documents').delete().eq('id', id).eq('user_id', user.id)
    setTrash(prev => prev.filter(h => h.id !== id))
  }

  const emptyTrash = async () => {
    await supabase.from('documents').delete().eq('user_id', user.id).eq('trashed', true)
    setTrash([])
  }

  // ─── Calculs ──────────────────────────────────
  const calcTotals = (doc) => {
    const em  = profil || {}
    const ht  = doc.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
    const tvaR = (profil && !profil.tva_actif) ? 0 : (doc.tva_taux || 20)
    const tva = ht * tvaR / 100
    return { em, ht, tvaR, tva, ttc: ht + tva }
  }

  const manualHT = lines.reduce((s, l) => s + l.qty * l.prix, 0)

  // ─── Filtrage ─────────────────────────────────
  const getFiltered = () => {
    if (filter === 'trash') return trash
    return history.filter(h => {
      if (filter === 'devis' && h.type !== 'devis') return false
      if (filter === 'facture' && h.type !== 'facture') return false
      if (filter.startsWith('s:') && h.status !== filter.slice(2)) return false
      if (filter.startsWith('k:') && h.category !== filter.slice(2)) return false
      if (filter.startsWith('c:') && h.client_nom !== filter.slice(2)) return false
      if (search && !h.client_nom?.toLowerCase().includes(search.toLowerCase()) && !h.id?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }

  // ─── Impression ───────────────────────────────
  const doPrint = (entry) => {
    if (!entry) return
    const { doc, num, d1, d2, isFac } = entry
    const { em, ht, tvaR, tva, ttc }  = calcTotals(doc)
    const logoTag = em.logo ? `<img src="${em.logo}" style="max-height:70px;max-width:200px;object-fit:contain;display:block;margin-bottom:12px">` : ''
    const rows = doc.lignes.map(l => `<tr>
      <td>${l.ref ? `<span style="font-size:10px;color:#A89878;font-family:monospace;display:block">${l.ref}</span>` : ''}<strong>${l.designation}</strong>${l.detail ? `<br><span style="font-size:11px;color:#6B5E45">${l.detail}</span>` : ''}</td>
      <td style="text-align:right">${l.quantite} ${l.unite}</td>
      <td style="text-align:right">${fmt(l.prix_unitaire)} €</td>
      <td style="text-align:right">${fmt(l.quantite * l.prix_unitaire)} €</td>
    </tr>`).join('')
    const legalHtml = isFac ? `<div style="margin-top:20px;padding:12px 14px;background:#F6F0E4;border-radius:8px;font-size:10.5px;color:#6B5E45;line-height:2">
      ${em.forme_juridique ? `<strong style="color:#1C1710">${em.forme_juridique}</strong>${em.capital ? ' au capital de ' + em.capital + ' €' : ''}<br>` : ''}
      <strong style="color:#1C1710">SIRET :</strong> ${em.siret || ''}${em.ape ? ' &nbsp;|&nbsp; <strong style="color:#1C1710">APE :</strong> ' + em.ape : ''}${em.rcs ? ' &nbsp;|&nbsp; <strong style="color:#1C1710">RCS :</strong> ' + em.rcs : ''}
      ${(profil && !profil.tva_actif) ? '<br><strong style="color:#1C1710">TVA :</strong> Non applicable – art. 293 B du CGI' : `<br><strong style="color:#1C1710">N° TVA :</strong> ${em.tva_num || ''}`}
      ${em.iban ? `<br><strong style="color:#1C1710">IBAN :</strong> ${em.iban}${em.bic ? ' &nbsp;|&nbsp; <strong style="color:#1C1710">BIC :</strong> ' + em.bic : ''}` : ''}
      <br><strong style="color:#1C1710">Conditions :</strong> ${em.conditions_paiement || 'Paiement à 30 jours'}
      <br><strong style="color:#1C1710">Pénalités :</strong> En cas de retard, pénalité de 3× le taux légal + indemnité forfaitaire de 40 €. Pas d'escompte pour règlement anticipé.
      ${em.cgv ? `<br><strong style="color:#1C1710">CGV :</strong> ${em.cgv}` : ''}
    </div>` : ''
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>${isFac ? 'Facture' : 'Devis'} ${num}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet">
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Outfit',sans-serif;color:#1C1710;background:#fff;padding:36px 44px;max-width:800px;margin:0 auto}
    .stripe{height:5px;background:#B5792A;margin-bottom:32px;border-radius:2px}.head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
    h1{font-family:'Playfair Display',serif;font-size:34px;font-weight:600;letter-spacing:-0.5px;line-height:1}
    .pill{display:inline-flex;align-items:center;gap:5px;margin-top:8px;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;background:${isFac ? '#EDFAF3' : '#FAF3E0'};color:${isFac ? '#2D7A4F' : '#B5792A'}}
    .ref{text-align:right;font-size:12px;color:#A89878;line-height:2.1}.ref-num{font-family:'Playfair Display',serif;font-size:17px;color:#1C1710;display:block;margin-bottom:4px}
    .sep{height:1px;background:#E2D8C4;margin-bottom:22px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:26px}
    .plbl{font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#A89878;margin-bottom:5px}
    .pname{font-family:'Playfair Display',serif;font-size:16px}.psub{font-size:11px;color:#6B5E45;margin-top:3px;line-height:1.6}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}thead tr{border-bottom:1.5px solid #1C1710}
    th{font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6B5E45;padding:0 0 8px;text-align:left}th:not(:first-child){text-align:right}
    tbody tr{border-bottom:1px solid #FAF3E0}tbody tr:last-child{border-bottom:1.5px solid #1C1710}td{font-size:12px;padding:9px 0;color:#1C1710;vertical-align:top}
    .tots{display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-bottom:16px}.tr{display:flex;gap:56px;font-size:12px;color:#6B5E45}
    .grand{background:#FAF3E0;border-radius:10px;padding:11px 18px;display:flex;gap:56px;align-items:center;margin-top:4px}
    .grand span:first-child{font-size:12px;color:#6B5E45}.grand span:last-child{font-family:'Playfair Display',serif;font-size:20px}
    @media print{body{padding:0}@page{margin:12mm 10mm}}</style></head><body>
    <div class="stripe"></div>
    <div class="head"><div>${logoTag}<h1>${isFac ? 'Facture' : 'Devis'}</h1><div class="pill">${isFac ? 'À régler' : 'En attente de validation'}</div></div>
    <div class="ref"><span class="ref-num">${num}</span>Émis le ${d1}<br>${isFac ? 'Échéance' : "Valable jusqu'au"} <strong style="color:#1C1710">${d2}</strong></div></div>
    <div class="sep"></div>
    <div class="parties">
      <div><div class="plbl">Émetteur</div><div class="pname">${em.nom || '—'}</div><div class="psub">${[em.metier, em.adresse, em.email, em.tel].filter(Boolean).join('<br>')}</div></div>
      <div><div class="plbl">Client</div><div class="pname">${doc.client.nom}</div><div class="psub">${doc.client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}${doc.client.adresse ? '<br>' + doc.client.adresse : ''}</div></div>
    </div>
    <table><thead><tr><th style="width:44%">Désignation</th><th style="text-align:right">Qté</th><th style="text-align:right">P.U. HT</th><th style="text-align:right">Total HT</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tots"><div class="tr"><span>Total HT</span><span>${fmt(ht)} €</span></div><div class="tr"><span>TVA ${tvaR > 0 ? tvaR + ' %' : '(non applicable)'}</span><span>${fmt(tva)} €</span></div>
    <div class="grand"><span>${tvaR > 0 ? 'Total TTC' : 'Total net'}</span><span>${fmt(ttc)} €</span></div></div>
    ${legalHtml}
    <script>const n='${isFac ? 'Facture' : 'Devis'} ${doc.client.nom} ${num}';document.title=n;window.onload=function(){setTimeout(window.print,500)}<\/script>
    </body></html>`
    const slug = doc.client.nom.replace(/[^\w\sÀ-ÿ]/g, '').trim().replace(/\s+/g, '-').substring(0, 30)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${isFac ? 'Facture' : 'Devis'}-${slug}-${num}.html`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const filtered = getFiltered()
  const clients  = [...new Set(history.map(h => h.client_nom).filter(Boolean))]

  // ─── RENDER ───────────────────────────────────
  return (
    <>
      <style>{CSS}</style>

      {/* APP BAR */}
      <div className="app-bar">
        <div className="logo">Devis<em>IA</em></div>
        <div className="bar-right">
          <span className="user-tag">{user.email}</span>
          <button className="btn-profile" onClick={() => setShowProf(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            Mon profil
          </button>
          <button className="btn-logout" onClick={onLogout}>Déconnexion</button>
        </div>
      </div>

      {/* NAV TABS */}
      <div className="nav-tabs">
        <button className={`nav-tab ${view === 'create' ? 'active' : ''}`} onClick={() => setView('create')}>✦ Nouveau document</button>
        <button className={`nav-tab ${view === 'history' ? 'active' : ''}`} onClick={() => { setView('history') }}>📁 Historique</button>
      </div>

      {/* ── VIEW CREATE ── */}
      {view === 'create' && (
        <div className="main">
          {!profil && <div className="alert" onClick={() => setShowProf(true)}>⚠️ Complétez votre profil pour générer des documents valides → Cliquez ici</div>}

          <div className="card">
            <div className="mode-bar">
              <button className={`mode-btn ${appMode === 'ia' ? 'active' : ''}`} onClick={() => setAppMode('ia')}>✨ Mode IA — décrire en texte</button>
              <button className={`mode-btn ${appMode === 'manuel' ? 'active' : ''}`} onClick={() => setAppMode('manuel')}>📋 Mode Manuel — saisir les lignes</button>
            </div>
            <div className="type-switch">
              <button className={`type-btn ${docType === 'devis' ? 'active' : ''}`} onClick={() => setDocType('devis')}>📄 Devis</button>
              <button className={`type-btn ${docType === 'facture' ? 'active' : ''}`} onClick={() => setDocType('facture')}>🧾 Facture</button>
            </div>

            {/* Mode IA */}
            {appMode === 'ia' && (
              <div>
                <div className="chips-hint">Exemples rapides ↓</div>
                <div className="chips">
                  {['Site web','Conseil','Plomberie','Graphisme','Vêtements'].map((l, i) => (
                    <span key={l} className="chip" onClick={() => setPrompt(EXAMPLES[i])}>{l}</span>
                  ))}
                </div>
                <div className="input-wrap">
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generateIA() }}
                    placeholder="Ex : Pour Madame Martin — création logo + charte graphique, 3 jours à 450 €/jour…" />
                  <button className="btn-gen" onClick={generateIA} disabled={generating}>
                    {generating ? 'Génération…' : 'Générer →'}
                  </button>
                </div>
                <div className="hint-text">⌘ + Entrée pour générer rapidement</div>
              </div>
            )}

            {/* Mode Manuel */}
            {appMode === 'manuel' && (
              <div>
                <div className="manual-client">
                  <div className="full"><span className="mini-label">Nom du client *</span><input className="mini-input" value={mClient.nom} onChange={e => setMClient(p => ({...p,nom:e.target.value}))} placeholder="Société RMN-GP ou Madame Dupont" /></div>
                  <div><span className="mini-label">Adresse client</span><input className="mini-input" value={mClient.adresse} onChange={e => setMClient(p => ({...p,adresse:e.target.value}))} placeholder="254 rue de Bercy, Paris" /></div>
                  <div><span className="mini-label">Type</span><select className="mini-input" value={mClient.type} onChange={e => setMClient(p => ({...p,type:e.target.value}))}><option value="entreprise">Entreprise</option><option value="particulier">Particulier</option></select></div>
                  <div className="full"><span className="mini-label">Référence commande</span><input className="mini-input" value={mClient.ref} onChange={e => setMClient(p => ({...p,ref:e.target.value}))} placeholder="Ex : CDA260103146" /></div>
                </div>
                <table className="lines-table">
                  <thead><tr><th style={{width:'14%'}}>Réf.</th><th style={{width:'30%'}}>Désignation *</th><th style={{width:'16%'}}>Taille/Détail</th><th style={{width:'9%'}}>Qté</th><th style={{width:'12%'}}>Prix HT</th><th style={{width:'13%'}}>Total HT</th><th style={{width:'6%'}}></th></tr></thead>
                  <tbody>
                    {lines.map(l => (
                      <tr key={l.id}>
                        <td><input className="line-input" value={l.ref} onChange={e => setLines(prev => prev.map(x => x.id===l.id?{...x,ref:e.target.value}:x))} placeholder="REF" /></td>
                        <td><input className="line-input" value={l.desig} onChange={e => setLines(prev => prev.map(x => x.id===l.id?{...x,desig:e.target.value}:x))} placeholder="Désignation" /></td>
                        <td><input className="line-input" value={l.detail} onChange={e => setLines(prev => prev.map(x => x.id===l.id?{...x,detail:e.target.value}:x))} placeholder="S / Noir" /></td>
                        <td><input className="line-input num" type="number" value={l.qty} onChange={e => setLines(prev => prev.map(x => x.id===l.id?{...x,qty:+e.target.value||0}:x))} /></td>
                        <td><input className="line-input num" type="number" value={l.prix} onChange={e => setLines(prev => prev.map(x => x.id===l.id?{...x,prix:+e.target.value||0}:x))} /></td>
                        <td className="line-total">{fmt(l.qty*l.prix)} €</td>
                        <td><button className="btn-del" onClick={() => setLines(prev => prev.filter(x => x.id !== l.id))}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="add-line-btn" onClick={() => { const id = lineId+1; setLineId(id); setLines(prev => [...prev, {id,ref:'',desig:'',detail:'',qty:1,prix:0}]) }}>+ Ajouter une ligne</button>
                <div className="manual-bottom">
                  <div className="manual-total-preview">Total HT : <strong>{fmt(manualHT)} €</strong> | TTC : <strong>{fmt(manualHT*(1+mTva/100))} €</strong></div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <select className="mini-input" style={{width:'auto'}} value={mTva} onChange={e => setMTva(+e.target.value)}>
                      <option value={20}>TVA 20%</option><option value={10}>TVA 10%</option><option value={5.5}>TVA 5,5%</option><option value={0}>Sans TVA</option>
                    </select>
                    <button className="btn btn-dark" onClick={generateManuel}>Générer →</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {generating && <div className="state-load"><div className="ring"></div><span>Génération en cours…</span></div>}
          {genError  && <div className="state-err">{genError}</div>}

          {saved && (
            <DocPreview
              entry={saved} profil={profil} calcTotals={calcTotals} fmt={fmt}
              onPrint={() => doPrint(saved)}
              onConvert={() => {
                const num = nextNum('FAC')
                const ns  = { ...saved, num, isFac: true }
                setSaved(ns); saveDoc(ns)
              }}
              onNew={() => { setSaved(null); setPrompt('') }}
              onHistory={() => setView('history')}
            />
          )}
        </div>
      )}

      {/* ── VIEW HISTORY ── */}
      {view === 'history' && (
        <div className="main">
          <div className="hist-layout">
            {/* Sidebar */}
            <div className="hist-sidebar">
              <div className="sidebar-section">
                <div className="sidebar-title">Affichage</div>
                {[['all','Tous les documents',history.length],['devis','Devis',history.filter(h=>h.type==='devis').length],['facture','Factures',history.filter(h=>h.type==='facture').length]].map(([f,label,cnt]) => (
                  <div key={f} className={`sidebar-item ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
                    <span>{label}</span><span className="sidebar-count">{cnt}</span>
                  </div>
                ))}
              </div>
              <div className="sidebar-section">
                <div className="sidebar-title">Statut</div>
                {[['en_attente','En attente','#B5792A'],['accepte','Acceptés','#2D7A4F'],['paye','Payés','#1B5E20'],['retard','En retard','#C0392B']].map(([s,label,color]) => (
                  <div key={s} className={`sidebar-item ${filter==='s:'+s?'active':''}`} onClick={() => setFilter('s:'+s)}>
                    <span style={{display:'flex',alignItems:'center',gap:7}}><span style={{width:8,height:8,borderRadius:'50%',background:color,display:'inline-block',flexShrink:0}}></span>{label}</span>
                    <span className="sidebar-count">{history.filter(h=>h.status===s).length}</span>
                  </div>
                ))}
              </div>
              {clients.length > 0 && (
                <div className="sidebar-section">
                  <div className="sidebar-title">Clients</div>
                  {clients.map(c => (
                    <div key={c} className={`sidebar-item ${filter==='c:'+c?'active':''}`} onClick={() => setFilter('c:'+c)}>
                      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{c}</span>
                      <span className="sidebar-count">{history.filter(h=>h.client_nom===c).length}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="sidebar-section">
                <div className="sidebar-title">Catégories</div>
                {categories.map((cat, i) => (
                  <div key={cat} className={`cat-item ${filter==='k:'+cat?'active':''}`} onClick={() => setFilter('k:'+cat)}>
                    <span style={{display:'flex',alignItems:'center',gap:7,flex:1,minWidth:0}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:CAT_COLORS[i%CAT_COLORS.length],flexShrink:0}}></span>
                      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cat}</span>
                    </span>
                    <span style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
                      <span className="sidebar-count">{history.filter(h=>h.category===cat).length}</span>
                      <button className="cat-del-btn" onClick={e => { e.stopPropagation(); deleteCat(cat) }}>×</button>
                    </span>
                  </div>
                ))}
                <div className="add-cat-row">
                  <input className="add-cat-input" value={newCat} onChange={e => setNewCat(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter'){addCat(newCat);setNewCat('')} }}
                    placeholder="Nouvelle catégorie…" />
                  <button className="add-cat-btn" onClick={() => { addCat(newCat); setNewCat('') }}>+</button>
                </div>
              </div>
              <div className="sidebar-section" style={{borderBottom:'none'}}>
                <div className={`sidebar-item ${filter==='trash'?'active':''}`} style={{color:'#8B1A1A'}} onClick={() => setFilter('trash')}>
                  <span>🗑 Corbeille</span>
                  <span className="sidebar-count" style={{background:'#FFF3F3',color:'#8B1A1A'}}>{trash.length}</span>
                </div>
              </div>
            </div>

            {/* Liste */}
            <div className="hist-main">
              <div className="hist-top">
                <div className="hist-count">{filter==='trash' ? `${trash.length} document(s) dans la corbeille` : `${filtered.length} document(s)`}</div>
                <input className="hist-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher…" />
              </div>

              {filter === 'trash' ? (
                <>
                  {trash.length > 0 && <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                    <button className="btn btn-xs" style={{background:'#FFF3F3',border:'1px solid #FFCACA',color:'#8B1A1A'}} onClick={emptyTrash}>Vider la corbeille</button>
                  </div>}
                  {trash.length === 0 ? <EmptyState title="Corbeille vide" sub="Les documents supprimés apparaîtront ici" /> :
                    trash.map(h => <TrashCard key={h.id} h={h} onRestore={() => restoreDoc(h.id)} onDelete={() => permanentDelete(h.id)} fmt={fmt} />)}
                </>
              ) : filtered.length === 0 ? (
                <EmptyState title="Aucun document" sub="Créez votre premier devis depuis l'onglet Nouveau document" />
              ) : (
                filtered.map(h => (
                  <DocCard key={h.id} h={h}
                    statusOptions={h.type==='facture'?STATUS_OPTIONS_FAC:STATUS_OPTIONS_DEVIS}
                    statusLabels={STATUS_LABELS} statusClasses={STATUS_CLASSES}
                    categories={categories}
                    onOpen={() => { if(h.payload){setSaved(h.payload);setView('create')} }}
                    onStatus={s => updateStatus(h.id, s)}
                    onCat={c => updateCat(h.id, c)}
                    onPrint={() => h.payload && doPrint(h.payload)}
                    onDelete={() => { setPendDel(h.id); setShowDel(true) }}
                    fmt={fmt}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PROFIL ── */}
      {showProfile && (
        <div className="overlay show" onClick={e => e.target.className.includes('overlay') && setShowProf(false)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-title">Mon profil professionnel</div>
            <p className="modal-sub">Ces informations apparaissent sur tous vos documents.</p>
            <div className="form-grid">
              {/* Logo */}
              <div className="field full">
                <label>Logo</label>
                <div style={{border:'2px dashed #E2D8C4',borderRadius:12,padding:14,textAlign:'center',cursor:'pointer',background:'#FBF8F1'}} onClick={() => document.getElementById('logoInp').click()}>
                  {pForm.logo ? <img src={pForm.logo} style={{maxHeight:60,maxWidth:180,objectFit:'contain'}} alt="Logo" /> : <span style={{fontSize:13,color:'#A89878'}}>Cliquez pour uploader votre logo</span>}
                </div>
                <input id="logoInp" type="file" accept="image/*" style={{display:'none'}} onChange={e => {
                  const f = e.target.files[0]; if(!f) return
                  const r = new FileReader(); r.onload = ev => setPForm(p => ({...p,logo:ev.target.result})); r.readAsDataURL(f)
                }} />
              </div>
              {[['nom','Raison sociale / Nom *','Sophie Martin','text'],['metier','Activité / Métier *','Graphiste freelance','text'],['adresse','Adresse complète *','12 rue des Artisans, 75011 Paris','text'],['siret','SIRET *','123 456 789 00010','text'],['email','Email','contact@vous.fr','email'],['tel','Téléphone','06 12 34 56 78','text'],['iban','IBAN','FR76 1234...','text'],['bic','BIC','SOGEFRPP','text']].map(([k,lbl,ph,type]) => (
                <div key={k} className={`field ${['adresse','nom','metier'].includes(k)?'full':''}`}>
                  <label>{lbl}</label>
                  <input type={type} value={pForm[k]||''} onChange={e => setPForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} />
                </div>
              ))}
              <div className="field full" style={{borderTop:'1px solid #E2D8C4',paddingTop:14}}>
                <label style={{fontSize:12,fontWeight:600,color:'#1C1710'}}>⚖️ Mentions légales</label>
              </div>
              <div className="field full">
                <label>Forme juridique</label>
                <select value={pForm.forme_juridique||''} onChange={e => setPForm(p=>({...p,forme_juridique:e.target.value}))}>
                  <option value="">— Sélectionner —</option>
                  {['Auto-entrepreneur','EI','EURL','SARL','SAS','SASU','SA','SCI','Association'].map(f=><option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              {[['capital','Capital social (€)','10 000'],['rcs','N° RCS + ville','Paris B 123 456 789'],['ape','Code APE / NAF','6201Z'],['tva_num','N° TVA intracommunautaire','FR 12 345678901']].map(([k,lbl,ph]) => (
                <div key={k} className="field"><label>{lbl}</label><input value={pForm[k]||''} onChange={e=>setPForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} /></div>
              ))}
              <div className="field full" style={{borderTop:'1px solid #E2D8C4',paddingTop:14}}>
                <label style={{fontSize:12,fontWeight:600,color:'#1C1710'}}>💳 Paiement</label>
              </div>
              <div className="field">
                <label>Délai de paiement par défaut</label>
                <select value={pForm.conditions_paiement||'Paiement à 30 jours'} onChange={e=>setPForm(p=>({...p,conditions_paiement:e.target.value}))}>
                  {['Paiement à réception','Paiement à 15 jours','Paiement à 30 jours','Paiement à 45 jours','Paiement à 60 jours'].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>Modes de paiement</label><input value={pForm.modes_paiement||''} onChange={e=>setPForm(p=>({...p,modes_paiement:e.target.value}))} placeholder="Virement, chèque…" /></div>
              <div className="field full"><label>CGV (courtes)</label><input value={pForm.cgv||''} onChange={e=>setPForm(p=>({...p,cgv:e.target.value}))} placeholder="Tout devis accepté vaut bon de commande…" /></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowProf(false)}>Annuler</button>
              <button className="btn btn-dark" onClick={saveProfile}>Enregistrer →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SUPPRESSION ── */}
      {showDelete && (
        <div className="overlay show" onClick={e => e.target.className.includes('overlay') && setShowDel(false)}>
          <div className="modal" style={{maxWidth:400,textAlign:'center'}}>
            <div style={{width:64,height:64,background:'#FFF3F3',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1rem'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </div>
            <div className="modal-title" style={{fontSize:18}}>Supprimer ce document ?</div>
            <p style={{fontSize:13,color:'#6B5E45',margin:'10px 0 1.75rem',lineHeight:1.6}}>Cette action est <strong>irréversible</strong>.<br/>Le document sera déplacé dans la corbeille.</p>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button className="btn btn-ghost" onClick={() => setShowDel(false)}>Annuler</button>
              <button className="btn" style={{background:'#8B1A1A',border:'none',color:'#fff'}} onClick={moveToTrash}>Oui, supprimer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Sous-composants ──────────────────────────────
function DocPreview({ entry, profil, calcTotals, fmt, onPrint, onConvert, onNew, onHistory }) {
  const { doc, num, d1, d2, isFac } = entry
  const { em, ht, tvaR, tva, ttc } = calcTotals(doc)
  const rows = doc.lignes.map((l, i) => (
    <tr key={i}>
      <td><div style={{fontWeight:500}}>{l.designation}</div>{l.detail&&<div style={{fontSize:11,color:'#A89878'}}>{l.detail}</div>}</td>
      <td>{l.quantite} {l.unite}</td>
      <td>{fmt(l.prix_unitaire)} €</td>
      <td>{fmt(l.quantite*l.prix_unitaire)} €</td>
    </tr>
  ))
  return (
    <div className="doc-outer" style={{display:'block'}}>
      <div className="document">
        <div className="doc-stripe" />
        <div className="doc-body">
          <div className="doc-head">
            <div className="doc-head-left">
              {em.logo && <img src={em.logo} className="doc-logo" alt="Logo" />}
              <div>
                <div className="doc-type">{isFac ? 'Facture' : 'Devis'}</div>
                <div className={`doc-pill ${isFac?'pill-facture':'pill-devis'}`}><span className="pill-dot"/>{isFac?'À régler':'En attente'}</div>
              </div>
            </div>
            <div className="doc-ref">
              <div className="doc-num">{num}</div>
              <div className="doc-dates">Émis le {d1}<br/>{isFac?'Échéance':"Valable jusqu'au"} <strong>{d2}</strong></div>
            </div>
          </div>
          <div className="sep"/>
          <div className="parties">
            <div><div className="p-label">Émetteur</div><div className="p-name">{em.nom||'— Profil non configuré —'}</div><div className="p-sub">{[em.metier,em.adresse,em.email,em.tel].filter(Boolean).join(' · ')}</div></div>
            <div><div className="p-label">Client</div><div className="p-name">{doc.client.nom}</div><div className="p-sub">{doc.client.type==='entreprise'?'Entreprise':'Particulier'}{doc.client.adresse&&<><br/>{doc.client.adresse}</>}</div></div>
          </div>
          <table className="doc-table">
            <thead><tr><th style={{width:'44%'}}>Désignation</th><th>Qté</th><th>P.U. HT</th><th>Total HT</th></tr></thead>
            <tbody>{rows}</tbody>
          </table>
          <div className="totals">
            <div className="t-row"><span className="t-lbl">Total HT</span><span>{fmt(ht)} €</span></div>
            <div className="t-row"><span className="t-lbl">TVA {tvaR>0?tvaR+' %':'(non applicable)'}</span><span>{fmt(tva)} €</span></div>
            <div className="t-grand"><span className="t-lbl">{tvaR>0?'Total TTC':'Total net'}</span><span className="t-val">{fmt(ttc)} €</span></div>
          </div>
          {isFac && em.siret && (
            <div className="legal-box">
              {em.forme_juridique && <p><strong>Forme juridique :</strong> {em.forme_juridique}{em.capital&&` — Capital : ${em.capital} €`}</p>}
              <p><strong>SIRET :</strong> {em.siret}{em.ape&&` | APE : ${em.ape}`}{em.rcs&&` | RCS : ${em.rcs}`}</p>
              {em.iban && <p><strong>IBAN :</strong> {em.iban}{em.bic&&` | BIC : ${em.bic}`}</p>}
              <p><strong>Conditions :</strong> {em.conditions_paiement||'Paiement à 30 jours'}</p>
              <p><strong>Pénalités de retard :</strong> En cas de retard, pénalité de 3× le taux légal + indemnité forfaitaire de 40 €.</p>
            </div>
          )}
          <div className="doc-foot">
            <div className="foot-brand">DevisIA</div>
            <div className="actions">
              {!isFac && <button className="btn btn-amber btn-sm" onClick={onConvert}>Convertir en facture</button>}
              <button className="btn btn-ghost btn-sm" onClick={onPrint}>🖨 Imprimer / PDF</button>
              <button className="btn btn-ghost btn-sm" onClick={onHistory}>📁 Historique</button>
              <button className="btn btn-dark btn-sm" onClick={onNew}>Nouveau</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DocCard({ h, statusOptions, statusLabels, statusClasses, categories, onOpen, onStatus, onCat, onPrint, onDelete, fmt }) {
  return (
    <div className="doc-card" onClick={onOpen}>
      <div className={`doc-card-icon ${h.type==='facture'?'icon-facture':'icon-devis'}`}>{h.type==='facture'?'🧾':'📄'}</div>
      <div className="doc-card-info">
        <div className="doc-card-top">
          <span className="doc-card-num">{h.id}</span>
          <span className="doc-card-client">{h.client_nom}</span>
          <span className={`status-badge ${statusClasses[h.status]||'s-attente'}`}>{statusLabels[h.status]||'En attente'}</span>
          {h.category && <span className="cat-badge">{h.category}</span>}
        </div>
        <div className="doc-card-meta">
          <span>📅 {h.date}</span>
          <span>💶 {fmt(h.total_ht)} € HT</span>
        </div>
      </div>
      <div className="doc-card-right">
        <span className="doc-card-amount">{fmt(h.total_ttc)} €</span>
        <div className="doc-card-actions" onClick={e => e.stopPropagation()}>
          <select className="status-select" value={h.status} onChange={e => onStatus(e.target.value)}>
            {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </select>
          <select className="cat-select" value={h.category||''} onChange={e => onCat(e.target.value)}>
            <option value="">— Catégorie —</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-ghost btn-xs" onClick={onPrint}>🖨</button>
          <button className="btn btn-xs" style={{background:'#FFF3F3',border:'1px solid #FFCACA',color:'#8B1A1A',display:'flex',alignItems:'center',gap:4}} onClick={e=>{e.stopPropagation();onDelete()}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

function TrashCard({ h, onRestore, onDelete, fmt }) {
  return (
    <div className="doc-card" style={{opacity:0.7,borderStyle:'dashed'}}>
      <div className={`doc-card-icon ${h.type==='facture'?'icon-facture':'icon-devis'}`}>{h.type==='facture'?'🧾':'📄'}</div>
      <div className="doc-card-info">
        <div className="doc-card-top">
          <span className="doc-card-num">{h.id}</span>
          <span className="doc-card-client">{h.client_nom}</span>
          <span className="status-badge s-annule">Supprimé le {h.deleted_at||'—'}</span>
        </div>
        <div className="doc-card-meta"><span>📅 Créé le {h.date}</span><span>💶 {fmt(h.total_ttc)} € TTC</span></div>
      </div>
      <div className="doc-card-right">
        <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
          <button className="btn btn-xs" style={{background:'#EDFAF3',border:'1px solid #9CDBB8',color:'#2D7A4F',display:'flex',alignItems:'center',gap:5}} onClick={onRestore}>↩ Restaurer</button>
          <button className="btn btn-xs" style={{background:'#8B1A1A',border:'none',color:'#fff'}} onClick={onDelete}>Supprimer définitivement</button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ title, sub }) {
  return (
    <div style={{textAlign:'center',padding:'4rem 2rem',color:'#A89878'}}>
      <div style={{fontSize:40,marginBottom:'1rem',opacity:0.3}}>📄</div>
      <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:'#6B5E45',marginBottom:8}}>{title}</h3>
      <p style={{fontSize:13}}>{sub}</p>
    </div>
  )
}

// ─── CSS ──────────────────────────────────────────
const CSS = `
.app-bar{background:#1C1710;height:58px;padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200}
.logo{font-family:'Playfair Display',serif;font-size:21px;color:#fff}.logo em{color:#E8D5A8;font-style:normal}
.bar-right{display:flex;align-items:center;gap:10px}
.user-tag{font-size:12px;color:rgba(255,255,255,0.5)}
.btn-profile{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:6px 14px;cursor:pointer;color:#fff;font-size:12px;font-family:'Outfit',sans-serif;font-weight:500}
.btn-profile:hover{background:rgba(255,255,255,0.15)}
.btn-logout{font-size:12px;color:rgba(255,255,255,0.4);background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif}
.btn-logout:hover{color:rgba(255,255,255,0.7)}
.nav-tabs{background:#1C1710;border-top:1px solid rgba(255,255,255,0.1);display:flex;padding:0 1.5rem;gap:4px}
.nav-tab{padding:10px 20px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;color:rgba(255,255,255,0.5);border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;transition:all 0.15s}
.nav-tab.active{color:#fff;border-bottom-color:#E8D5A8}
.nav-tab:hover{color:rgba(255,255,255,0.8)}
.main{max-width:960px;margin:0 auto;padding:2rem 1.5rem 5rem}
.alert{background:#FAF3E0;border:1px solid #E8D5A8;border-radius:12px;font-size:13px;padding:13px 17px;margin-bottom:1.5rem;cursor:pointer;color:#B5792A}
.card{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:20px;padding:1.75rem;box-shadow:0 2px 24px rgba(28,23,16,0.07);margin-bottom:2rem}
.mode-bar{display:flex;margin-bottom:1.5rem;border:1.5px solid #E2D8C4;border-radius:12px;overflow:hidden;background:#FBF8F1}
.mode-btn{flex:1;padding:10px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;border:none;background:transparent;color:#6B5E45;transition:all 0.15s}
.mode-btn.active{background:#1C1710;color:#fff}
.type-switch{display:flex;gap:8px;margin-bottom:16px}
.type-btn{padding:7px 18px;border-radius:30px;font-size:12px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;border:1.5px solid #E2D8C4;background:transparent;color:#6B5E45;transition:all 0.15s}
.type-btn.active{background:#1C1710;border-color:#1C1710;color:#fff}
.chips-hint{font-size:11px;color:#A89878;font-weight:500;margin-bottom:10px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
.chip{font-size:12px;padding:5px 14px;border-radius:30px;border:1px solid #E2D8C4;background:#FBF8F1;color:#6B5E45;cursor:pointer;transition:all 0.16s}
.chip:hover{background:#FAF3E0;border-color:#E8D5A8;color:#B5792A}
.input-wrap{position:relative}
textarea{width:100%;resize:none;font-family:'Outfit',sans-serif;font-size:14px;font-weight:300;padding:13px 15px 52px;border-radius:13px;border:1.5px solid #E2D8C4;background:#FBF8F1;color:#1C1710;line-height:1.65;min-height:95px}
textarea:focus{outline:none;border-color:#B5792A;background:#fff}
textarea::placeholder{color:#A89878}
.btn-gen{position:absolute;bottom:11px;right:11px;padding:9px 20px;border-radius:10px;border:none;background:#1C1710;color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif}
.btn-gen:hover{background:#B5792A}.btn-gen:disabled{background:#ccc;cursor:not-allowed}
.hint-text{font-size:11px;color:#A89878;margin-top:9px}
.manual-client{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:1.5rem}
.manual-client .full{grid-column:1/-1}
.mini-label{font-size:11px;font-weight:600;letter-spacing:.5px;color:#6B5E45;display:block;margin-bottom:5px}
.mini-input{width:100%;padding:9px 12px;border-radius:10px;border:1.5px solid #E2D8C4;background:#FBF8F1;color:#1C1710;font-family:'Outfit',sans-serif;font-size:13px}
.mini-input:focus{outline:none;border-color:#B5792A;background:#fff}
.lines-table{width:100%;border-collapse:collapse;margin-bottom:12px}
.lines-table thead th{font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:#A89878;padding:0 6px 8px;text-align:left;border-bottom:1px solid #E2D8C4}
.lines-table tbody tr{border-bottom:1px solid #FAF3E0}
.lines-table tbody td{padding:5px 4px;vertical-align:middle}
.line-input{width:100%;padding:7px 9px;border-radius:8px;border:1.5px solid transparent;background:transparent;color:#1C1710;font-family:'Outfit',sans-serif;font-size:12px}
.line-input:focus{outline:none;border-color:#B5792A;background:#fff}
.line-input:hover{background:#FBF8F1}
.line-input.num{text-align:right}
.line-total{font-size:12px;text-align:right;color:#6B5E45;padding:0 8px}
.btn-del{background:transparent;border:none;color:#A89878;cursor:pointer;font-size:15px;padding:4px 8px;border-radius:6px}
.btn-del:hover{background:#FFF3F3;color:#8B1A1A}
.add-line-btn{display:flex;align-items:center;gap:8px;background:transparent;border:1.5px dashed #E2D8C4;border-radius:10px;padding:9px 16px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;color:#6B5E45;width:100%;margin-bottom:1.25rem}
.add-line-btn:hover{border-color:#B5792A;color:#B5792A;background:#FAF3E0}
.manual-bottom{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.manual-total-preview{font-size:13px;color:#6B5E45}
.manual-total-preview strong{color:#1C1710;font-size:15px;font-family:'Playfair Display',serif}
.state-load{display:flex;align-items:center;gap:13px;padding:1.75rem 0;color:#6B5E45;font-size:14px}
.ring{width:22px;height:22px;flex-shrink:0;border:2.5px solid #E2D8C4;border-top-color:#B5792A;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.state-err{padding:13px 17px;background:#FFF3F3;border:1px solid #FFCACA;border-radius:12px;font-size:13px;color:#8B1A1A;margin-bottom:1rem}
.doc-outer{animation:rise .45s cubic-bezier(.16,1,.3,1)}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.document{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:20px;box-shadow:0 6px 48px rgba(28,23,16,.11);overflow:hidden}
.doc-stripe{height:6px;background:linear-gradient(90deg,#B5792A,#D4A456)}
.doc-body{padding:2.75rem}
.doc-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2.25rem}
.doc-head-left{display:flex;flex-direction:column;gap:12px}
.doc-logo{max-height:70px;max-width:200px;object-fit:contain}
.doc-type{font-family:'Playfair Display',serif;font-size:40px;font-weight:600;color:#1C1710;letter-spacing:-.5px;line-height:1}
.doc-pill{display:inline-flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;font-weight:600;padding:5px 13px;border-radius:30px}
.pill-devis{background:#FAF3E0;color:#B5792A}.pill-facture{background:#EDFAF3;color:#2D7A4F}
.pill-dot{width:5px;height:5px;border-radius:50%;background:currentColor}
.doc-ref{text-align:right}.doc-num{font-family:'Playfair Display',serif;font-size:19px;color:#1C1710}
.doc-dates{font-size:12px;color:#A89878;line-height:2.1;margin-top:7px}
.sep{height:1px;background:#E2D8C4;margin-bottom:2rem}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:2.5rem}
.p-label{font-size:9px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#A89878;margin-bottom:8px}
.p-name{font-family:'Playfair Display',serif;font-size:18px;color:#1C1710}
.p-sub{font-size:12px;color:#6B5E45;margin-top:4px;line-height:1.6}
.doc-table{width:100%;border-collapse:collapse;margin-bottom:1.75rem}
.doc-table thead tr{border-bottom:1.5px solid #1C1710}
.doc-table th{font-size:9px;font-weight:600;letter-spacing:1.3px;text-transform:uppercase;color:#6B5E45;padding:0 0 11px;text-align:left}
.doc-table th:not(:first-child){text-align:right}
.doc-table tbody tr{border-bottom:1px solid #FAF3E0}
.doc-table tbody tr:last-child{border-bottom:1.5px solid #1C1710}
.doc-table td{font-size:13px;padding:12px 0;color:#1C1710;vertical-align:top}
.doc-table td:not(:first-child){text-align:right}
.totals{display:flex;flex-direction:column;align-items:flex-end;gap:9px;margin-bottom:2rem}
.t-row{display:flex;gap:4rem;font-size:13px}.t-lbl{color:#6B5E45}
.t-grand{gap:4rem;display:flex;align-items:center;background:#FAF3E0;border-radius:13px;padding:14px 22px;margin-top:4px}
.t-grand .t-lbl{font-size:13px;color:#6B5E45}.t-grand .t-val{font-family:'Playfair Display',serif;font-size:22px;color:#1C1710}
.legal-box{background:#F6F0E4;border-radius:10px;padding:14px 16px;margin-bottom:1.75rem}
.legal-box p{font-size:11px;color:#6B5E45;line-height:1.7;margin-bottom:6px}
.legal-box p:last-child{margin-bottom:0}.legal-box strong{color:#1C1710;font-weight:500}
.doc-foot{display:flex;justify-content:space-between;align-items:center;padding-top:1.5rem;border-top:1px solid #E2D8C4;flex-wrap:wrap;gap:10px}
.foot-brand{font-family:'Playfair Display',serif;font-size:13px;color:#A89878}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.btn{padding:10px 20px;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .17s}
.btn-ghost{background:transparent;border:1px solid #E2D8C4;color:#6B5E45}.btn-ghost:hover{background:#F6F0E4}
.btn-dark{background:#1C1710;border:none;color:#fff}.btn-dark:hover{background:#B5792A}
.btn-amber{background:#FAF3E0;border:1px solid #E8D5A8;color:#B5792A}.btn-amber:hover{background:#B5792A;color:#fff;border-color:#B5792A}
.btn-sm{padding:7px 14px;font-size:12px}.btn-xs{padding:5px 10px;font-size:11px;border-radius:8px}
.hist-layout{display:grid;grid-template-columns:230px 1fr;gap:1.5rem;align-items:start}
.hist-sidebar{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:20px;overflow:hidden;position:sticky;top:90px}
.sidebar-section{padding:.85rem 1rem;border-bottom:1px solid #E2D8C4}
.sidebar-section:last-child{border-bottom:none}
.sidebar-title{font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#A89878;margin-bottom:8px}
.sidebar-item{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:9px;cursor:pointer;font-size:13px;color:#6B5E45;transition:all .13s;margin-bottom:1px}
.sidebar-item:hover{background:#FBF8F1;color:#1C1710}
.sidebar-item.active{background:#FAF3E0;color:#B5792A;font-weight:500}
.sidebar-item.active .sidebar-count{background:#E8D5A8;color:#B5792A}
.sidebar-count{font-size:11px;background:#F6F0E4;padding:2px 7px;border-radius:20px;color:#A89878;min-width:22px;text-align:center}
.cat-item{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:9px;cursor:pointer;font-size:13px;color:#6B5E45;transition:all .13s;margin-bottom:1px}
.cat-item:hover{background:#FBF8F1;color:#1C1710}
.cat-item.active{background:#FAF3E0;color:#B5792A;font-weight:500}
.cat-del-btn{width:18px;height:18px;border-radius:4px;border:none;background:transparent;color:#A89878;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;opacity:0;padding:0}
.cat-item:hover .cat-del-btn{opacity:1}
.cat-del-btn:hover{background:#FFF3F3;color:#8B1A1A}
.add-cat-row{display:flex;gap:6px;margin-top:8px}
.add-cat-input{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid #E2D8C4;background:#FBF8F1;font-family:'Outfit',sans-serif;font-size:12px;color:#1C1710}
.add-cat-input:focus{outline:none;border-color:#B5792A;background:#fff}
.add-cat-btn{width:32px;height:32px;border-radius:9px;border:1.5px solid #E2D8C4;background:#FBF8F1;color:#6B5E45;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:300}
.add-cat-btn:hover{background:#B5792A;border-color:#B5792A;color:#fff}
.hist-main{}
.hist-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;gap:12px;flex-wrap:wrap}
.hist-count{font-size:13px;color:#6B5E45}
.hist-search{padding:9px 14px;border-radius:10px;border:1.5px solid #E2D8C4;background:#FFFDF8;font-family:'Outfit',sans-serif;font-size:13px;color:#1C1710;width:220px}
.hist-search:focus{outline:none;border-color:#B5792A}
.doc-card{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:16px;padding:1.1rem 1.25rem;margin-bottom:10px;display:flex;align-items:center;gap:1rem;cursor:pointer;transition:all .15s}
.doc-card:hover{border-color:#E8D5A8;box-shadow:0 2px 16px rgba(181,121,42,.1)}
.doc-card-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.icon-devis{background:#FAF3E0}.icon-facture{background:#EDFAF3}
.doc-card-info{flex:1;min-width:0}
.doc-card-top{display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap}
.doc-card-num{font-family:'Playfair Display',serif;font-size:15px;color:#1C1710;font-weight:600}
.doc-card-client{font-size:13px;color:#6B5E45}
.doc-card-meta{font-size:11px;color:#A89878;display:flex;gap:12px;flex-wrap:wrap}
.doc-card-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
.doc-card-amount{font-family:'Playfair Display',serif;font-size:16px;color:#1C1710}
.doc-card-actions{display:flex;gap:6px;opacity:0;transition:opacity .15s}
.doc-card:hover .doc-card-actions{opacity:1}
.status-badge{font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap}
.s-attente{background:#FAF3E0;color:#B5792A}.s-accepte{background:#EDFAF3;color:#2D7A4F}
.s-refuse{background:#FFF3F3;color:#8B1A1A}.s-paye{background:#E8F5E9;color:#1B5E20}
.s-retard{background:#FFF4E6;color:#7A3A0A}.s-annule{background:#F5F5F5;color:#666}
.cat-badge{font-size:10px;font-weight:500;padding:3px 9px;border-radius:20px;background:#F6F0E4;color:#6B5E45;border:1px solid #E2D8C4}
.status-select,.cat-select{font-size:11px;padding:4px 8px;border-radius:8px;border:1px solid #E2D8C4;background:#FBF8F1;color:#6B5E45;font-family:'Outfit',sans-serif;cursor:pointer}
.status-select:focus,.cat-select:focus{outline:none;border-color:#B5792A}
.overlay{display:none;position:fixed;inset:0;background:rgba(28,23,16,.6);z-index:300;align-items:center;justify-content:center;padding:1rem;overflow-y:auto}
.overlay.show{display:flex}
.modal{background:#FFFDF8;border-radius:20px;padding:2rem;width:100%;max-width:560px;box-shadow:0 20px 60px rgba(28,23,16,.25);animation:pop .3s cubic-bezier(.16,1,.3,1);margin:auto}
@keyframes pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
.modal-title{font-family:'Playfair Display',serif;font-size:22px;margin-bottom:6px}
.modal-sub{font-size:13px;color:#6B5E45;margin-bottom:1.75rem;line-height:1.5}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:1.5rem}
.form-grid .full{grid-column:1/-1}
.field label{font-size:11px;font-weight:600;letter-spacing:.6px;color:#6B5E45;display:block;margin-bottom:5px;text-transform:uppercase}
.field input,.field select{width:100%;padding:10px 13px;border-radius:10px;border:1.5px solid #E2D8C4;background:#FBF8F1;color:#1C1710;font-family:'Outfit',sans-serif;font-size:13px}
.field input:focus,.field select:focus{outline:none;border-color:#B5792A;background:#fff}
.field input::placeholder{color:#A89878}
.modal-actions{display:flex;justify-content:flex-end;gap:8px}
@media(max-width:680px){.hist-layout{grid-template-columns:1fr}.hist-sidebar{position:static}}
`
