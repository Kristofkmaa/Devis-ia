'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../lib/supabase'

const TAUX = {
  services_bnc: 0.212,
  services_bic: 0.212,
  liberal: 0.212,
  ventes: 0.123,
}

const TAUX_ACRE = {
  services_bnc: 0.106,
  services_bic: 0.106,
  liberal: 0.106,
  ventes: 0.0615,
}

/**
 * Valeurs par défaut dans l'app.
 * Si tu veux des calculs plus personnalisés, utilise taux_impot_personnalise dans le profil.
 */
const TAUX_VL = {
  services_bnc: 0.022,
  services_bic: 0.017,
  liberal: 0.022,
  ventes: 0.01,
}

const SEUILS = {
  tva_services: 36800,
  tva_ventes: 91900,
  plafond_services: 77700,
  plafond_ventes: 188700,
}

const SECTEURS = [
  { value: 'services_bnc', label: 'Prestation de services (BNC) — consultant, freelance, coach…' },
  { value: 'services_bic', label: 'Prestation de services (BIC) — artisan, réparation…' },
  { value: 'liberal', label: 'Profession libérale réglementée — médecin, avocat, kiné…' },
  { value: 'ventes', label: 'Vente de marchandises — e-commerce, produits…' },
]

const MOIS_NOMS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function getNow() {
  const d = new Date()
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  }
}

function formatMois(str) {
  const [y, m] = str.split('-')
  return `${MOIS_NOMS[+m - 1]} ${y}`
}

function getDateLimite(periode, type) {
  if (type === 'mensuel') {
    const [y, m] = periode.split('-').map(Number)
    const nm = m === 12 ? 1 : m + 1
    const ny = m === 12 ? y + 1 : y
    return `31/${String(nm).padStart(2, '0')}/${ny}`
  } else {
    const [y, t] = periode.split('-')
    const dates = {
      T1: `30/04/${y}`,
      T2: `31/07/${y}`,
      T3: `31/10/${y}`,
      T4: `31/01/${+y + 1}`,
    }
    return dates[t] || '—'
  }
}

function genererCalendrier(profil) {
  if (!profil) return []

  const { year, month } = getNow()
  const events = []
  const regime = profil.regime_declaration || 'trimestriel'

  if (regime === 'mensuel') {
    for (let i = -2; i <= 4; i++) {
      let m = month + i
      let y = year

      if (m <= 0) {
        m += 12
        y--
      }
      if (m > 12) {
        m -= 12
        y++
      }

      const periode = `${y}-${String(m).padStart(2, '0')}`

      events.push({
        id: periode,
        periode,
        type: 'mensuel',
        label: `Déclaration URSSAF — ${formatMois(periode)}`,
        date_limite: getDateLimite(periode, 'mensuel'),
        past: y < year || (y === year && m < month),
        current: y === year && m === month,
      })
    }
  } else {
    for (let i = -1; i <= 2; i++) {
      let t = Math.ceil(month / 3) + i
      let y = year

      while (t <= 0) {
        t += 4
        y--
      }
      while (t > 4) {
        t -= 4
        y++
      }

      const periode = `${y}-T${t}`
      const trimNoms = {
        T1: '1er trimestre (jan-mar)',
        T2: '2e trimestre (avr-jun)',
        T3: '3e trimestre (jul-sep)',
        T4: '4e trimestre (oct-déc)',
      }

      events.push({
        id: periode,
        periode,
        type: 'trimestriel',
        label: `Déclaration URSSAF — ${trimNoms['T' + t]} ${y}`,
        date_limite: getDateLimite(periode, 'trimestriel'),
        past: y < year || (y === year && t < Math.ceil(month / 3)),
        current: y === year && t === Math.ceil(month / 3),
      })
    }
  }

  events.push({
    id: `CFE-${year}`,
    periode: `${year}-12`,
    type: 'cfe',
    label: `CFE — Cotisation Foncière des Entreprises ${year}`,
    date_limite: `15/12/${year}`,
    past: false,
    current: false,
    special: true,
  })

  events.push({
    id: `IR-${year}`,
    periode: `${year}-05`,
    type: 'ir',
    label: `Déclaration Impôt sur le Revenu ${year}`,
    date_limite: `31/05/${year + 1}`,
    past: false,
    current: false,
    special: true,
  })

  return events.sort((a, b) => a.id.localeCompare(b.id))
}

const defaultForm = {
  prenom: '',
  nom: '',
  activite: '',
  secteur: 'services_bnc',
  date_creation: '',
  regime_declaration: 'trimestriel',
  acre: false,
  acre_fin: '',
  objectif_ca: '',

  versement_liberatoire: false,
  taux_impot_personnalise: '',

  tva_actif: false,
  numero_tva: '',
  regime_tva: 'franchise_base',

  iban: '',
  compte_dedie: false,

  revenu_type: 'irrégulier',
  objectif_mensuel: '',
  objectif_type: 'complément_revenu',

  statut_complementaire: 'aucun',
  niveau_experience: 'debutant',

  prix_moyen_prestation: '',
  clients_mois: '',
}

export default function AutoEntrepreneurApp({ user, onLogout }) {
  const supabase = createClient()

  const [view, setView] = useState('dashboard')
  const [profil, setProfil] = useState(null)
  const [revenus, setRevenus] = useState([])
  const [declarations, setDecl] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [oForm, setOForm] = useState(defaultForm)

  const [calcCA, setCalcCA] = useState('')
  const [calcResult, setCalcResult] = useState(null)

  const [question, setQuestion] = useState('')
  const [reponse, setReponse] = useState('')
  const [asking, setAsking] = useState(false)
  const [histoQ, setHistoQ] = useState([])

  const [revMois, setRevMois] = useState('')
  const [revMontant, setRevMontant] = useState('')
  const [savingRev, setSavingRev] = useState(false)

  const hydrateFormFromProfile = (p) => ({
    prenom: p?.prenom || '',
    nom: p?.nom || '',
    activite: p?.activite || '',
    secteur: p?.secteur || 'services_bnc',
    date_creation: p?.date_creation || '',
    regime_declaration: p?.regime_declaration || 'trimestriel',
    acre: Boolean(p?.acre),
    acre_fin: p?.acre_fin || '',
    objectif_ca: p?.objectif_ca ?? '',

    versement_liberatoire: Boolean(p?.versement_liberatoire),
    taux_impot_personnalise: p?.taux_impot_personnalise ?? '',

    tva_actif: Boolean(p?.tva_actif),
    numero_tva: p?.numero_tva || '',
    regime_tva: p?.regime_tva || 'franchise_base',

    iban: p?.iban || '',
    compte_dedie: Boolean(p?.compte_dedie),

    revenu_type: p?.revenu_type || 'irrégulier',
    objectif_mensuel: p?.objectif_mensuel ?? '',
    objectif_type: p?.objectif_type || 'complément_revenu',

    statut_complementaire: p?.statut_complementaire || 'aucun',
    niveau_experience: p?.niveau_experience || 'debutant',

    prix_moyen_prestation: p?.prix_moyen_prestation ?? '',
    clients_mois: p?.clients_mois ?? '',
  })

  const loadAll = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)

    try {
      const [profileRes, revenusRes, declarationsRes, questionsRes] = await Promise.all([
        supabase.from('ae_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('ae_revenus').select('*').eq('user_id', user.id).order('mois', { ascending: false }),
        supabase.from('ae_declarations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('ae_questions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])

      if (profileRes.error) console.error('Erreur chargement profil:', profileRes.error)
      if (revenusRes.error) console.error('Erreur chargement revenus:', revenusRes.error)
      if (declarationsRes.error) console.error('Erreur chargement déclarations:', declarationsRes.error)
      if (questionsRes.error) console.error('Erreur chargement questions:', questionsRes.error)

      const p = profileRes.data

      if (p) {
        setProfil(p)
        setOForm(hydrateFormFromProfile(p))
        setShowOnboarding(false)
      } else {
        setProfil(null)
        setOForm(defaultForm)
        setShowOnboarding(true)
      }

      setRevenus(revenusRes.data || [])
      setDecl(declarationsRes.data || [])
      setHistoQ(questionsRes.data || [])
    } catch (err) {
      console.error('Erreur générale loadAll:', err)
      alert(`Erreur lors du chargement: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    if (user?.id) loadAll()
  }, [user?.id, loadAll])

  const saveProfil = async () => {
    if (!user?.id) {
      alert('Utilisateur non connecté')
      return
    }

    if (!oForm.prenom || !oForm.nom || !oForm.activite || !oForm.secteur || !oForm.date_creation) {
      alert('Remplis tous les champs obligatoires')
      return
    }

    setSavingProfile(true)

    try {
      const payload = {
        user_id: user.id,
        prenom: oForm.prenom.trim(),
        nom: oForm.nom.trim(),
        activite: oForm.activite.trim(),
        secteur: oForm.secteur,
        date_creation: oForm.date_creation,
        regime_declaration: oForm.regime_declaration,
        acre: Boolean(oForm.acre),
        acre_fin: oForm.acre ? (oForm.acre_fin || null) : null,
        objectif_ca: parseFloat(oForm.objectif_ca) || 0,

        versement_liberatoire: Boolean(oForm.versement_liberatoire),
        taux_impot_personnalise:
          oForm.taux_impot_personnalise === ''
            ? null
            : parseFloat(oForm.taux_impot_personnalise),

        tva_actif: Boolean(oForm.tva_actif),
        numero_tva: oForm.tva_actif ? (oForm.numero_tva || null) : null,
        regime_tva: oForm.regime_tva,

        iban: oForm.iban || null,
        compte_dedie: Boolean(oForm.compte_dedie),

        revenu_type: oForm.revenu_type,
        objectif_mensuel: parseFloat(oForm.objectif_mensuel) || 0,
        objectif_type: oForm.objectif_type,

        statut_complementaire: oForm.statut_complementaire,
        niveau_experience: oForm.niveau_experience,

        prix_moyen_prestation: parseFloat(oForm.prix_moyen_prestation) || 0,
        clients_mois: parseInt(oForm.clients_mois || '0', 10) || 0,
      }

      const { data: saved, error } = await supabase
        .from('ae_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) {
        console.error('Erreur saveProfil:', error)
        alert(`Erreur sauvegarde profil : ${error.message}`)
        return
      }

      setProfil(saved)
      setOForm(hydrateFormFromProfile(saved))
      setShowOnboarding(false)
    } catch (err) {
      console.error('Erreur saveProfil catch:', err)
      alert(`Erreur sauvegarde profil : ${err.message}`)
    } finally {
      setSavingProfile(false)
    }
  }

  const saveRevenu = async () => {
    if (!user?.id) {
      alert('Utilisateur non connecté')
      return
    }

    if (!revMois || !revMontant) {
      alert('Renseigne le mois et le montant')
      return
    }

    setSavingRev(true)

    try {
      const payload = {
        user_id: user.id,
        mois: revMois,
        montant: parseFloat(revMontant) || 0,
      }

      const { data: saved, error } = await supabase
        .from('ae_revenus')
        .upsert(payload, { onConflict: 'user_id,mois' })
        .select()
        .single()

      if (error) {
        console.error('Erreur saveRevenu:', error)
        alert(`Erreur sauvegarde revenu : ${error.message}`)
        return
      }

      setRevenus((prev) =>
        [saved, ...prev.filter((r) => !(r.user_id === saved.user_id && r.mois === saved.mois))]
          .sort((a, b) => b.mois.localeCompare(a.mois))
      )

      setRevMois('')
      setRevMontant('')
    } catch (err) {
      console.error('Erreur saveRevenu catch:', err)
      alert(`Erreur sauvegarde revenu : ${err.message}`)
    } finally {
      setSavingRev(false)
    }
  }

  const marquerDeclaration = async (periode, type, statut) => {
    if (!user?.id) {
      alert('Utilisateur non connecté')
      return
    }

    const payload = {
      user_id: user.id,
      periode,
      type_periode: type,
      statut,
      date_limite: getDateLimite(periode, type),
      date_declaration: statut === 'faite' ? new Date().toLocaleDateString('fr-FR') : null,
      ca_declare: 0,
    }

    try {
      const existing = declarations.find((d) => d.periode === periode)

      if (existing) {
        const { error } = await supabase
          .from('ae_declarations')
          .update({
            statut,
            date_declaration: payload.date_declaration,
          })
          .eq('id', existing.id)

        if (error) {
          console.error('Erreur update déclaration:', error)
          alert(`Erreur déclaration : ${error.message}`)
          return
        }

        setDecl((prev) =>
          prev.map((d) =>
            d.periode === periode
              ? { ...d, statut, date_declaration: payload.date_declaration }
              : d
          )
        )
      } else {
        const { data: inserted, error } = await supabase
          .from('ae_declarations')
          .insert(payload)
          .select()
          .single()

        if (error) {
          console.error('Erreur insert déclaration:', error)
          alert(`Erreur déclaration : ${error.message}`)
          return
        }

        if (inserted) setDecl((prev) => [inserted, ...prev])
      }
    } catch (err) {
      console.error('Erreur marquerDeclaration:', err)
      alert(`Erreur déclaration : ${err.message}`)
    }
  }

  const poserQuestion = async () => {
    if (!question.trim()) return

    setAsking(true)
    setReponse('')

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, profil }),
      })

      const data = await res.json()

      if (data.reponse) {
        setReponse(data.reponse)

        const row = {
          user_id: user.id,
          question,
          reponse: data.reponse,
        }

        const { data: saved, error } = await supabase
          .from('ae_questions')
          .insert(row)
          .select()
          .single()

        if (error) console.error('Erreur sauvegarde question:', error)
        if (saved) setHistoQ((prev) => [saved, ...prev.slice(0, 19)])
      } else {
        setReponse("Je n'ai pas pu générer de réponse.")
      }
    } catch (e) {
      console.error('Erreur poserQuestion:', e)
      setReponse('Erreur : ' + e.message)
    } finally {
      setAsking(false)
    }
  }

  const calculer = () => {
    const ca = parseFloat(calcCA) || 0
    if (!ca || !profil) return

    const tauxUrssaf = profil.acre ? TAUX_ACRE[profil.secteur] : TAUX[profil.secteur]
    const cotisations = ca * tauxUrssaf

    let tauxImpot = 0.14
    if (profil.versement_liberatoire) {
      tauxImpot = TAUX_VL[profil.secteur] || 0
    } else if (profil.taux_impot_personnalise !== null && profil.taux_impot_personnalise !== undefined) {
      if (Number(profil.taux_impot_personnalise) > 0) {
        tauxImpot = Number(profil.taux_impot_personnalise) / 100
      }
    }

    const impots_estimes = ca * tauxImpot
    const seuil_tva = profil.secteur === 'ventes' ? SEUILS.tva_ventes : SEUILS.tva_services
    const plafond = profil.secteur === 'ventes' ? SEUILS.plafond_ventes : SEUILS.plafond_services
    const caAnnuel = revenus
      .filter((r) => r.mois.startsWith(String(getNow().year)))
      .reduce((s, r) => s + r.montant, 0) + ca

    setCalcResult({
      ca,
      cotisations,
      impots_estimes,
      tauxUrssaf,
      tauxImpot,
      a_mettre_de_cote: cotisations + impots_estimes,
      net_estime: ca - cotisations - impots_estimes,
      seuil_tva,
      plafond,
      caAnnuel,
      alerte_tva: caAnnuel > seuil_tva * 0.85,
      alerte_plafond: caAnnuel > plafond * 0.85,
    })
  }

  const { year, month } = getNow()
  const caAnnuel = revenus
    .filter((r) => r.mois.startsWith(String(year)))
    .reduce((s, r) => s + r.montant, 0)

  const caMois =
    revenus.find((r) => r.mois === `${year}-${String(month).padStart(2, '0')}`)?.montant || 0

  const tauxUrssaf = profil ? (profil.acre ? TAUX_ACRE[profil.secteur] : TAUX[profil.secteur]) : 0

  let tauxImpotDashboard = 0.14
  if (profil?.versement_liberatoire) {
    tauxImpotDashboard = TAUX_VL[profil.secteur] || 0
  } else if (profil?.taux_impot_personnalise) {
    tauxImpotDashboard = Number(profil.taux_impot_personnalise) / 100
  }

  const cotisAnnuel = caAnnuel * tauxUrssaf
  const seuil_tva = profil?.secteur === 'ventes' ? SEUILS.tva_ventes : SEUILS.tva_services
  const plafond = profil?.secteur === 'ventes' ? SEUILS.plafond_ventes : SEUILS.plafond_services
  const pctTVA = seuil_tva ? Math.min((caAnnuel / seuil_tva) * 100, 100) : 0
  const pctPlafond = plafond ? Math.min((caAnnuel / plafond) * 100, 100) : 0
  const calendrier = profil ? genererCalendrier(profil) : []
  const prochaineDecl = calendrier.find((e) => !e.past && !e.special)

  const objectifMensuel = Number(profil?.objectif_mensuel || 0)
  const prixMoyen = Number(profil?.prix_moyen_prestation || 0)
  const clientsMois = Number(profil?.clients_mois || 0)
  const projectionMensuelle = prixMoyen * clientsMois

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div
          style={{
            width: 28,
            height: 28,
            border: '2.5px solid #E2D8C4',
            borderTopColor: '#B5792A',
            borderRadius: '50%',
            animation: 'spin .7s linear infinite',
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="app-bar">
        <div className="logo">Assistant Serelyo</div>
        <div className="bar-right">
          <span className="user-tag">{profil ? `${profil.prenom} ${profil.nom}` : user?.email}</span>
          <button className="btn-profile" onClick={() => setShowOnboarding(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Mon profil
          </button>
          <button className="btn-logout" onClick={onLogout}>Déconnexion</button>
        </div>
      </div>

      <div className="nav-tabs">
        {[
          ['dashboard', '🏠 Tableau de bord'],
          ['calendrier', '📅 Calendrier'],
          ['revenus', '💶 Mes revenus'],
          ['calculateur', '🧮 Calculateur'],
          ['assistant', '💬 Assistant IA'],
          ['ressources', '📚 Ressources'],
        ].map(([v, l]) => (
          <button
            key={v}
            className={`nav-tab ${view === v ? 'active' : ''}`}
            onClick={() => setView(v)}
          >
            {l}
          </button>
        ))}
      </div>

      {showOnboarding && (
        <div
          className="overlay show"
          onClick={(e) => {
            if (profil && e.target.className.includes('overlay')) {
              setShowOnboarding(false)
            }
          }}
        >
          <div className="modal" style={{ maxWidth: 860 }}>
            <div className="modal-title">{profil ? 'Mon profil' : 'Bienvenue ! Configurons ton profil 👋'}</div>
            <p className="modal-sub">
              Plus ton profil est complet, plus les calculs, alertes et réponses IA seront utiles.
            </p>

            <div className="section-title">Informations de base</div>
            <div className="form-grid">
              <div className="field">
                <label>Prénom *</label>
                <input value={oForm.prenom} onChange={(e) => setOForm((p) => ({ ...p, prenom: e.target.value }))} placeholder="Sophie" />
              </div>

              <div className="field">
                <label>Nom *</label>
                <input value={oForm.nom} onChange={(e) => setOForm((p) => ({ ...p, nom: e.target.value }))} placeholder="Martin" />
              </div>

              <div className="field full">
                <label>Activité *</label>
                <input value={oForm.activite} onChange={(e) => setOForm((p) => ({ ...p, activite: e.target.value }))} placeholder="Développeuse web freelance, graphiste, plombier…" />
              </div>

              <div className="field full">
                <label>Secteur d'activité *</label>
                <select value={oForm.secteur} onChange={(e) => setOForm((p) => ({ ...p, secteur: e.target.value }))}>
                  {SECTEURS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Date de création *</label>
                <input type="date" value={oForm.date_creation} onChange={(e) => setOForm((p) => ({ ...p, date_creation: e.target.value }))} />
              </div>

              <div className="field">
                <label>Régime déclaration URSSAF</label>
                <select value={oForm.regime_declaration} onChange={(e) => setOForm((p) => ({ ...p, regime_declaration: e.target.value }))}>
                  <option value="mensuel">Mensuel</option>
                  <option value="trimestriel">Trimestriel</option>
                </select>
              </div>

              <div className="field">
                <label>Objectif CA annuel (€)</label>
                <input type="number" value={oForm.objectif_ca} onChange={(e) => setOForm((p) => ({ ...p, objectif_ca: e.target.value }))} placeholder="30000" />
              </div>

              <div className="field">
                <label>Objectif CA mensuel (€)</label>
                <input type="number" value={oForm.objectif_mensuel} onChange={(e) => setOForm((p) => ({ ...p, objectif_mensuel: e.target.value }))} placeholder="2500" />
              </div>

              <div className="field">
                <label>ACRE ?</label>
                <select value={oForm.acre ? 'oui' : 'non'} onChange={(e) => setOForm((p) => ({ ...p, acre: e.target.value === 'oui' }))}>
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
                </select>
              </div>

              {oForm.acre && (
                <div className="field">
                  <label>Date de fin ACRE</label>
                  <input type="date" value={oForm.acre_fin} onChange={(e) => setOForm((p) => ({ ...p, acre_fin: e.target.value }))} />
                </div>
              )}
            </div>

            <div className="section-title">Fiscalité & TVA</div>
            <div className="form-grid">
              <div className="field">
                <label>Versement libératoire</label>
                <select
                  value={oForm.versement_liberatoire ? 'oui' : 'non'}
                  onChange={(e) => setOForm((p) => ({ ...p, versement_liberatoire: e.target.value === 'oui' }))}
                >
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
                </select>
              </div>

              <div className="field">
                <label>Taux d'impôt perso (%)</label>
                <input
                  type="number"
                  value={oForm.taux_impot_personnalise}
                  onChange={(e) => setOForm((p) => ({ ...p, taux_impot_personnalise: e.target.value }))}
                  placeholder="14"
                />
              </div>

              <div className="field">
                <label>TVA active ?</label>
                <select
                  value={oForm.tva_actif ? 'oui' : 'non'}
                  onChange={(e) => setOForm((p) => ({ ...p, tva_actif: e.target.value === 'oui' }))}
                >
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
                </select>
              </div>

              <div className="field">
                <label>Régime TVA</label>
                <select
                  value={oForm.regime_tva}
                  onChange={(e) => setOForm((p) => ({ ...p, regime_tva: e.target.value }))}
                >
                  <option value="franchise_base">Franchise en base</option>
                  <option value="reel_simplifie">Réel simplifié</option>
                  <option value="reel_normal">Réel normal</option>
                </select>
              </div>

              {oForm.tva_actif && (
                <div className="field full">
                  <label>Numéro de TVA</label>
                  <input
                    value={oForm.numero_tva}
                    onChange={(e) => setOForm((p) => ({ ...p, numero_tva: e.target.value }))}
                    placeholder="FRXX999999999"
                  />
                </div>
              )}
            </div>

            <div className="section-title">Banque & organisation</div>
            <div className="form-grid">
              <div className="field">
                <label>Compte bancaire dédié ?</label>
                <select
                  value={oForm.compte_dedie ? 'oui' : 'non'}
                  onChange={(e) => setOForm((p) => ({ ...p, compte_dedie: e.target.value === 'oui' }))}
                >
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
                </select>
              </div>

              <div className="field">
                <label>IBAN</label>
                <input value={oForm.iban} onChange={(e) => setOForm((p) => ({ ...p, iban: e.target.value }))} placeholder="FR76..." />
              </div>
            </div>

            <div className="section-title">Objectifs & activité</div>
            <div className="form-grid">
              <div className="field">
                <label>Revenus</label>
                <select value={oForm.revenu_type} onChange={(e) => setOForm((p) => ({ ...p, revenu_type: e.target.value }))}>
                  <option value="régulier">Réguliers</option>
                  <option value="irrégulier">Irréguliers</option>
                </select>
              </div>

              <div className="field">
                <label>Objectif</label>
                <select value={oForm.objectif_type} onChange={(e) => setOForm((p) => ({ ...p, objectif_type: e.target.value }))}>
                  <option value="complément_revenu">Complément de revenu</option>
                  <option value="activité_principale">Activité principale</option>
                  <option value="croissance">Croissance</option>
                </select>
              </div>

              <div className="field">
                <label>Statut complémentaire</label>
                <select value={oForm.statut_complementaire} onChange={(e) => setOForm((p) => ({ ...p, statut_complementaire: e.target.value }))}>
                  <option value="aucun">Aucun</option>
                  <option value="salarié">Salarié en parallèle</option>
                  <option value="chomage">Chômage / ARE</option>
                  <option value="étudiant">Étudiant</option>
                  <option value="retraite">Retraite</option>
                </select>
              </div>

              <div className="field">
                <label>Niveau</label>
                <select value={oForm.niveau_experience} onChange={(e) => setOForm((p) => ({ ...p, niveau_experience: e.target.value }))}>
                  <option value="debutant">Débutant</option>
                  <option value="intermediaire">Intermédiaire</option>
                  <option value="confirme">Confirmé</option>
                </select>
              </div>

              <div className="field">
                <label>Prix moyen prestation (€)</label>
                <input type="number" value={oForm.prix_moyen_prestation} onChange={(e) => setOForm((p) => ({ ...p, prix_moyen_prestation: e.target.value }))} placeholder="250" />
              </div>

              <div className="field">
                <label>Clients / mois</label>
                <input type="number" value={oForm.clients_mois} onChange={(e) => setOForm((p) => ({ ...p, clients_mois: e.target.value }))} placeholder="8" />
              </div>
            </div>

            <div className="modal-actions">
              {profil && (
                <button className="btn btn-ghost" onClick={() => setShowOnboarding(false)}>
                  Annuler
                </button>
              )}
              <button className="btn btn-dark" onClick={saveProfil} disabled={savingProfile}>
                {savingProfile ? 'Enregistrement…' : 'Enregistrer →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'dashboard' && (
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
              <div className="metric-sub">
                Cotisations : ~{(caMois * tauxUrssaf).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">CA {year}</div>
              <div className="metric-value">{caAnnuel.toLocaleString('fr-FR')} €</div>
              <div className="metric-sub">
                Cotisations : ~{cotisAnnuel.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Taux URSSAF</div>
              <div className="metric-value" style={{ color: '#B5792A' }}>
                {profil ? (tauxUrssaf * 100).toFixed(1) : '—'} %
              </div>
              <div className="metric-sub">{profil?.acre ? '✓ ACRE actif' : 'Taux normal'}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">À mettre de côté</div>
              <div className="metric-value" style={{ color: '#2D7A4F' }}>
                {(caMois * (tauxUrssaf + tauxImpotDashboard)).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </div>
              <div className="metric-sub">
                {profil?.versement_liberatoire ? 'URSSAF + versement libératoire' : 'URSSAF + impôts estimés'}
              </div>
            </div>
          </div>

          <div className="metrics-grid" style={{ marginTop: '-0.25rem' }}>
            <div className="metric-card">
              <div className="metric-label">Objectif mensuel</div>
              <div className="metric-value">{objectifMensuel.toLocaleString('fr-FR')} €</div>
              <div className="metric-sub">
                {objectifMensuel > 0
                  ? caMois >= objectifMensuel
                    ? '✓ Objectif atteint ce mois'
                    : `Manque ${(objectifMensuel - caMois).toLocaleString('fr-FR')} €`
                  : 'Non renseigné'}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">TVA</div>
              <div className="metric-value" style={{ color: profil?.tva_actif ? '#B5792A' : '#2D7A4F' }}>
                {profil?.tva_actif ? 'Active' : 'Inactive'}
              </div>
              <div className="metric-sub">{profil?.regime_tva || '—'}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Projection mensuelle</div>
              <div className="metric-value">{projectionMensuelle.toLocaleString('fr-FR')} €</div>
              <div className="metric-sub">
                {prixMoyen > 0 && clientsMois > 0
                  ? `${clientsMois} clients × ${prixMoyen.toLocaleString('fr-FR')} €`
                  : 'Prix moyen / clients non renseignés'}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Profil</div>
              <div className="metric-value" style={{ color: '#1C1710', fontSize: 18 }}>
                {profil?.niveau_experience || '—'}
              </div>
              <div className="metric-sub">{profil?.objectif_type || '—'}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-title">Progression vers les seuils {year}</div>

            <div className="seuil-item">
              <div className="seuil-top">
                <span className="seuil-label">Seuil TVA</span>
                <span className="seuil-val">
                  {caAnnuel.toLocaleString('fr-FR')} € / {seuil_tva?.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: pctTVA + '%',
                    background: pctTVA > 85 ? '#C0392B' : pctTVA > 60 ? '#B5792A' : '#2D7A4F',
                  }}
                />
              </div>
              {pctTVA > 85 && (
                <div className="seuil-alert">
                  ⚠️ Attention — tu approches du seuil de TVA.
                </div>
              )}
            </div>

            <div className="seuil-item" style={{ marginTop: '1rem' }}>
              <div className="seuil-top">
                <span className="seuil-label">Plafond micro-entreprise</span>
                <span className="seuil-val">
                  {caAnnuel.toLocaleString('fr-FR')} € / {plafond?.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: pctPlafond + '%',
                    background: pctPlafond > 85 ? '#C0392B' : pctPlafond > 60 ? '#B5792A' : '#2D7A4F',
                  }}
                />
              </div>
              {pctPlafond > 85 && (
                <div className="seuil-alert">
                  ⚠️ Tu approches du plafond micro-entreprise.
                </div>
              )}
            </div>
          </div>

          {histoQ.length > 0 && (
            <div className="card">
              <div className="card-title">Dernières questions à l'assistant</div>
              {histoQ.slice(0, 3).map((q) => (
                <div
                  key={q.id}
                  className="question-preview"
                  onClick={() => {
                    setQuestion(q.question)
                    setReponse(q.reponse)
                    setView('assistant')
                  }}
                >
                  <div className="question-text">💬 {q.question}</div>
                  <div className="question-date">{new Date(q.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              ))}
              <button className="link-btn" onClick={() => setView('assistant')}>
                Poser une nouvelle question →
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'calendrier' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Calendrier administratif</h2>
            <p className="page-sub">Toutes tes échéances au même endroit</p>
          </div>

          {!profil ? (
            <div className="empty-state">
              <h3>Configure ton profil d'abord</h3>
              <button className="btn btn-dark" onClick={() => setShowOnboarding(true)}>
                Configurer →
              </button>
            </div>
          ) : (
            <div className="cal-list">
              {calendrier.map((ev) => {
                const decl = declarations.find((d) => d.periode === ev.id)
                const statut = decl?.statut || (ev.past ? 'a_verifier' : 'a_faire')

                return (
                  <div
                    key={ev.id}
                    className={`cal-card ${ev.current ? 'cal-current' : ''} ${ev.special ? 'cal-special' : ''} ${
                      ev.past && statut !== 'faite' ? 'cal-past' : ''
                    }`}
                  >
                    <div className="cal-left">
                      <div
                        className={`cal-dot ${
                          statut === 'faite' ? 'dot-done' : ev.past ? 'dot-late' : 'dot-pending'
                        }`}
                      />
                      <div>
                        <div className="cal-label">{ev.label}</div>
                        <div className="cal-date">Avant le {ev.date_limite}</div>
                        {ev.current && <span className="badge-current">Période en cours</span>}
                      </div>
                    </div>

                    <div className="cal-right">
                      {statut === 'faite' ? (
                        <span className="badge-done">✓ Faite</span>
                      ) : (
                        <button className="btn btn-sm btn-amber" onClick={() => marquerDeclaration(ev.id, ev.type, 'faite')}>
                          Marquer comme faite
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="info-box" style={{ marginTop: '1.5rem' }}>
            <div className="info-title">📌 Comment déclarer sur autoentrepreneur.urssaf.fr</div>
            <div className="info-text">
              1. Va sur autoentrepreneur.urssaf.fr<br />
              2. Connecte-toi avec ton numéro SIRET<br />
              3. Clique sur "Déclarer et payer"<br />
              4. Saisis ton CA de la période<br />
              5. Valide
            </div>
          </div>
        </div>
      )}

      {view === 'revenus' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Mes revenus</h2>
            <p className="page-sub">Saisir ton chiffre d'affaires mois par mois</p>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-title">Ajouter / modifier un mois</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <span className="mini-label">Mois</span>
                <input className="mini-input" type="month" value={revMois} onChange={(e) => setRevMois(e.target.value)} />
              </div>
              <div>
                <span className="mini-label">CA encaissé (€ HT)</span>
                <input className="mini-input" type="number" value={revMontant} onChange={(e) => setRevMontant(e.target.value)} placeholder="3500" style={{ width: 160 }} />
              </div>
              <button className="btn btn-dark" onClick={saveRevenu} disabled={savingRev}>
                {savingRev ? 'Sauvegarde…' : 'Enregistrer →'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Historique {year}</div>

            {revenus.filter((r) => r.mois.startsWith(String(year))).length === 0 ? (
              <p style={{ fontSize: 13, color: '#A89878', padding: '1rem 0' }}>
                Aucun revenu saisi pour {year}.
              </p>
            ) : (
              <table className="rev-table">
                <thead>
                  <tr>
                    <th>Mois</th>
                    <th>CA</th>
                    <th>URSSAF ({(tauxUrssaf * 100).toFixed(1)}%)</th>
                    <th>Impôts (~{(tauxImpotDashboard * 100).toFixed(1)}%)</th>
                    <th>Net estimé</th>
                  </tr>
                </thead>
                <tbody>
                  {revenus
                    .filter((r) => r.mois.startsWith(String(year)))
                    .map((r) => {
                      const cotis = r.montant * tauxUrssaf
                      const impots = r.montant * tauxImpotDashboard
                      const net = r.montant - cotis - impots

                      return (
                        <tr key={r.mois}>
                          <td>{formatMois(r.mois)}</td>
                          <td><strong>{r.montant.toLocaleString('fr-FR')} €</strong></td>
                          <td style={{ color: '#8B1A1A' }}>{cotis.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                          <td style={{ color: '#7A3A0A' }}>{impots.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                          <td style={{ color: '#2D7A4F', fontWeight: 600 }}>{net.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                        </tr>
                      )
                    })}

                  <tr className="rev-total">
                    <td>Total {year}</td>
                    <td>{caAnnuel.toLocaleString('fr-FR')} €</td>
                    <td style={{ color: '#8B1A1A' }}>{(caAnnuel * tauxUrssaf).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                    <td style={{ color: '#7A3A0A' }}>{(caAnnuel * tauxImpotDashboard).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                    <td style={{ color: '#2D7A4F' }}>{(caAnnuel * (1 - tauxUrssaf - tauxImpotDashboard)).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {view === 'calculateur' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Calculateur</h2>
            <p className="page-sub">Combien dois-je payer et mettre de côté ?</p>
          </div>

          {!profil ? (
            <div className="empty-state">
              <h3>Configure ton profil d'abord</h3>
              <button className="btn btn-dark" onClick={() => setShowOnboarding(true)}>
                Configurer →
              </button>
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-title">Simuler un encaissement</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <span className="mini-label">Montant encaissé (€ HT)</span>
                    <input
                      className="mini-input"
                      type="number"
                      value={calcCA}
                      onChange={(e) => setCalcCA(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && calculer()}
                      placeholder="2500"
                      style={{ width: 200, fontSize: 18, padding: '12px 14px' }}
                    />
                  </div>
                  <button className="btn btn-dark" style={{ padding: '12px 24px' }} onClick={calculer}>
                    Calculer →
                  </button>
                </div>
              </div>

              {calcResult && (
                <div className="calc-result">
                  <div className="calc-grid">
                    <div className="calc-card main-card">
                      <div className="calc-label">CA encaissé</div>
                      <div className="calc-big">{calcResult.ca.toLocaleString('fr-FR')} €</div>
                    </div>

                    <div className="calc-card red-card">
                      <div className="calc-label">URSSAF à payer ({(calcResult.tauxUrssaf * 100).toFixed(1)}%)</div>
                      <div className="calc-big">{calcResult.cotisations.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
                    </div>

                    <div className="calc-card orange-card">
                      <div className="calc-label">
                        {profil.versement_liberatoire
                          ? `Versement libératoire (${(calcResult.tauxImpot * 100).toFixed(1)}%)`
                          : `Impôts estimés (~${(calcResult.tauxImpot * 100).toFixed(1)}%)`}
                      </div>
                      <div className="calc-big">{calcResult.impots_estimes.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
                    </div>

                    <div className="calc-card amber-card">
                      <div className="calc-label">Total à mettre de côté</div>
                      <div className="calc-big">{calcResult.a_mettre_de_cote.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
                    </div>

                    <div className="calc-card green-card">
                      <div className="calc-label">Net estimé</div>
                      <div className="calc-big">{calcResult.net_estime.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
                    </div>
                  </div>

                  {(calcResult.alerte_tva || calcResult.alerte_plafond) && (
                    <div style={{ marginTop: '1rem' }}>
                      {calcResult.alerte_tva && (
                        <div className="seuil-alert">
                          ⚠️ Avec ce CA annuel estimé ({calcResult.caAnnuel.toLocaleString('fr-FR')} €), tu approches du seuil TVA ({calcResult.seuil_tva.toLocaleString('fr-FR')} €).
                        </div>
                      )}
                      {calcResult.alerte_plafond && (
                        <div className="seuil-alert" style={{ marginTop: 8 }}>
                          ⚠️ Tu approches du plafond micro-entreprise ({calcResult.plafond.toLocaleString('fr-FR')} €).
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {view === 'assistant' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Assistant IA</h2>
            <p className="page-sub">Pose tes questions en français simple</p>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <span className="chips-hint">Questions fréquentes ↓</span>
            <div className="chips">
              {[
                "Quand dois-je déclarer mon CA à l'URSSAF ?",
                'Comment calculer mes cotisations ?',
                "Qu'est-ce que le seuil de TVA ?",
                "C'est quoi la CFE et quand la payer ?",
                "J'ai oublié de déclarer, que faire ?",
                'Puis-je me verser un salaire ?',
              ].map((q) => (
                <span key={q} className="chip" onClick={() => setQuestion(q)}>
                  {q}
                </span>
              ))}
            </div>

            <div className="input-wrap" style={{ marginTop: '1rem' }}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) poserQuestion()
                }}
                placeholder="Ex : J'ai encaissé 4200€ ce mois, combien je vais payer ?"
                style={{ minHeight: 80 }}
              />
              <button className="btn-gen" onClick={poserQuestion} disabled={asking || !question.trim()}>
                {asking ? 'Réflexion…' : 'Envoyer →'}
              </button>
            </div>

            <div className="hint-text">⌘ + Entrée pour envoyer</div>
          </div>

          {(reponse || asking) && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="reponse-header">
                <div className="reponse-avatar">IA</div>
                <span style={{ fontSize: 13, color: '#6B5E45', fontWeight: 500 }}>Assistant AutoIA</span>
              </div>

              {asking ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1rem 0', color: '#A89878' }}>
                  <div className="ring" />
                  Je réfléchis à ta question…
                </div>
              ) : (
                <div className="reponse-text">
                  {reponse.split('\n').map((line, i) => (
                    <p key={i} style={{ marginBottom: line ? '0.75rem' : 0 }}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {histoQ.length > 0 && (
            <div>
              <div className="card-title" style={{ marginBottom: 12 }}>Questions précédentes</div>
              {histoQ.slice(0, 10).map((q) => (
                <div
                  key={q.id}
                  className="question-preview"
                  onClick={() => {
                    setQuestion(q.question)
                    setReponse(q.reponse)
                  }}
                >
                  <div className="question-text">💬 {q.question}</div>
                  <div className="question-date">{new Date(q.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'ressources' && (
        <div className="main">
          <div className="page-header">
            <h2 className="page-title">Ressources officielles</h2>
            <p className="page-sub">Tous les liens utiles pour gérer ton auto-entreprise</p>
          </div>

          <div className="card">
            <div className="card-title">Liens utiles</div>
            <div className="reponse-text">
              <p>• autoentrepreneur.urssaf.fr</p>
              <p>• impots.gouv.fr</p>
              <p>• service-public.fr</p>
              <p>• ameli.fr</p>
              <p>• lassuranceretraite.fr</p>
            </div>
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
.main{max-width:980px;margin:0 auto;padding:2rem 1.5rem 5rem}
.welcome-bar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.75rem;flex-wrap:wrap;gap:1rem}
.welcome-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:600;color:#1C1710}
.welcome-sub{font-size:14px;color:#6B5E45;margin-top:4px}
.next-decl{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:14px;padding:14px 18px;text-align:right}
.next-decl-label{font-size:11px;color:#A89878;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.next-decl-date{font-family:'Playfair Display',serif;font-size:16px;color:#B5792A}
.metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:1.5rem}
@media(max-width:900px){.metrics-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.metrics-grid{grid-template-columns:1fr}}
.metric-card{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:16px;padding:1.1rem 1.25rem}
.metric-label{font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:#A89878;margin-bottom:8px}
.metric-value{font-family:'Playfair Display',serif;font-size:24px;color:#1C1710;margin-bottom:4px}
.metric-sub{font-size:11px;color:#A89878}
.card{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:20px;padding:1.5rem;box-shadow:0 2px 16px rgba(28,23,16,.06)}
.card-title{font-family:'Playfair Display',serif;font-size:17px;margin-bottom:1rem;color:#1C1710}
.seuil-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.seuil-label{font-size:13px;color:#6B5E45;font-weight:500}
.seuil-val{font-size:12px;color:#A89878}
.progress-bar{height:10px;background:#F6F0E4;border-radius:20px;overflow:hidden}
.progress-fill{height:100%;border-radius:20px;transition:width .5s ease}
.seuil-alert{font-size:12px;color:#8B1A1A;background:#FFF3F3;border:1px solid #FFCACA;border-radius:8px;padding:8px 12px;margin-top:8px}
.page-header{margin-bottom:1.75rem}
.page-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:600;color:#1C1710;margin-bottom:4px}
.page-sub{font-size:14px;color:#6B5E45}
.cal-list{display:flex;flex-direction:column;gap:10px}
.cal-card{background:#FFFDF8;border:1px solid #E2D8C4;border-radius:16px;padding:1.1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.cal-current{border-color:#B5792A;background:#FAF3E0}
.cal-special{border-style:dashed}
.cal-past{opacity:.65}
.cal-left{display:flex;align-items:center;gap:14px}
.cal-right{flex-shrink:0}
.cal-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.dot-done{background:#2D7A4F}
.dot-late{background:#C0392B}
.dot-pending{background:#E2D8C4}
.cal-label{font-size:14px;font-weight:500;color:#1C1710;margin-bottom:3px}
.cal-date{font-size:12px;color:#A89878}
.badge-current{display:inline-block;font-size:10px;font-weight:600;background:#B5792A;color:#fff;padding:3px 9px;border-radius:20px;margin-top:5px}
.badge-done{font-size:12px;font-weight:600;color:#2D7A4F;background:#EDFAF3;padding:6px 14px;border-radius:20px}
.info-box{background:#EEF4FF;border:1px solid #C3D8F8;border-radius:14px;padding:1.1rem 1.25rem}
.info-title{font-size:13px;font-weight:600;color:#1A4A8A;margin-bottom:8px}
.info-text{font-size:13px;color:#1A4A8A;line-height:1.8}
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
.calc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:1rem}
@media(max-width:700px){.calc-grid{grid-template-columns:1fr 1fr}}
@media(max-width:500px){.calc-grid{grid-template-columns:1fr}}
.calc-card{border-radius:16px;padding:1.1rem 1.25rem;border:1px solid transparent}
.main-card{background:#1C1710;color:#fff;border-color:#1C1710}
.main-card .calc-label{color:rgba(255,255,255,.6)}
.main-card .calc-big{color:#fff}
.red-card{background:#FFF3F3;border-color:#FFCACA}
.red-card .calc-big{color:#8B1A1A}
.orange-card{background:#FFF4E6;border-color:#FFD5A0}
.orange-card .calc-big{color:#7A3A0A}
.amber-card{background:#FAF3E0;border-color:#E8D5A8}
.amber-card .calc-big{color:#B5792A}
.green-card{background:#EDFAF3;border-color:#9CDBB8}
.green-card .calc-big{color:#2D7A4F}
.calc-label{font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;color:#6B5E45}
.calc-big{font-family:'Playfair Display',serif;font-size:26px;font-weight:600;margin-bottom:4px}
.chips-hint{font-size:11px;color:#A89878;font-weight:500;margin-bottom:10px;display:block}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.chip{font-size:12px;padding:5px 14px;border-radius:30px;border:1px solid #E2D8C4;background:#FBF8F1;color:#6B5E45;cursor:pointer;transition:all .16s}
.chip:hover{background:#FAF3E0;border-color:#E8D5A8;color:#B5792A}
.input-wrap{position:relative}
textarea{width:100%;resize:none;font-family:'Outfit',sans-serif;font-size:14px;font-weight:300;padding:13px 15px 52px;border-radius:13px;border:1.5px solid #E2D8C4;background:#FBF8F1;color:#1C1710;line-height:1.65;min-height:95px}
textarea:focus{outline:none;border-color:#B5792A;background:#fff}
.btn-gen{position:absolute;bottom:11px;right:11px;padding:9px 20px;border-radius:10px;border:none;background:#1C1710;color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif}
.btn-gen:hover{background:#B5792A}
.btn-gen:disabled{background:#ccc;cursor:not-allowed}
.hint-text{font-size:11px;color:#A89878;margin-top:9px}
.reponse-header{display:flex;align-items:center;gap:10px;margin-bottom:1rem}
.reponse-avatar{width:32px;height:32px;border-radius:50%;background:#1C1710;color:#E8D5A8;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'Playfair Display',serif}
.reponse-text{font-size:14px;color:#1C1710;line-height:1.7}
.reponse-text p{margin-bottom:.75rem}
.reponse-text p:last-child{margin-bottom:0}
.ring{width:20px;height:20px;flex-shrink:0;border:2px solid #E2D8C4;border-top-color:#B5792A;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.question-preview{background:#FBF8F1;border:1px solid #E2D8C4;border-radius:12px;padding:.9rem 1rem;margin-bottom:8px;cursor:pointer;transition:all .15s}
.question-preview:hover{border-color:#E8D5A8;background:#FAF3E0}
.question-text{font-size:13px;color:#1C1710;margin-bottom:4px}
.question-date{font-size:11px;color:#A89878}
.link-btn{background:none;border:none;color:#B5792A;font-size:13px;cursor:pointer;font-family:'Outfit',sans-serif;margin-top:8px;padding:0}
.link-btn:hover{text-decoration:underline}
.empty-state{text-align:center;padding:4rem 2rem}
.empty-state h3{font-family:'Playfair Display',serif;font-size:20px;color:#6B5E45;margin-bottom:1rem}
.overlay{display:none;position:fixed;inset:0;background:rgba(28,23,16,.6);z-index:300;align-items:center;justify-content:center;padding:1rem;overflow-y:auto}
.overlay.show{display:flex}
.modal{background:#FFFDF8;border-radius:20px;padding:2rem;width:100%;max-width:860px;box-shadow:0 20px 60px rgba(28,23,16,.25);animation:pop .3s cubic-bezier(.16,1,.3,1);margin:auto}
@keyframes pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
.modal-title{font-family:'Playfair Display',serif;font-size:22px;margin-bottom:6px;color:#1C1710}
.modal-sub{font-size:13px;color:#6B5E45;margin-bottom:1.2rem;line-height:1.5}
.section-title{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#B5792A;margin:1rem 0 .8rem}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:1rem}
@media(max-width:700px){.form-grid{grid-template-columns:1fr}}
.form-grid .full{grid-column:1/-1}
.field label{font-size:11px;font-weight:600;letter-spacing:.6px;color:#6B5E45;display:block;margin-bottom:5px;text-transform:uppercase}
.field input,.field select{width:100%;padding:10px 13px;border-radius:10px;border:1.5px solid #E2D8C4;background:#FBF8F1;color:#1C1710;font-family:'Outfit',sans-serif;font-size:13px}
.field input:focus,.field select:focus{outline:none;border-color:#B5792A;background:#fff}
.modal-actions{display:flex;justify-content:flex-end;gap:8px}
.btn{padding:10px 20px;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .17s}
.btn-ghost{background:transparent;border:1px solid #E2D8C4;color:#6B5E45}
.btn-ghost:hover{background:#F6F0E4}
.btn-dark{background:#1C1710;border:none;color:#fff}
.btn-dark:hover{background:#B5792A}
.btn-dark:disabled{opacity:.7;cursor:not-allowed}
.btn-amber{background:#FAF3E0;border:1px solid #E8D5A8;color:#B5792A}
.btn-amber:hover{background:#B5792A;color:#fff}
.btn-sm{padding:7px 14px;font-size:12px}
`
