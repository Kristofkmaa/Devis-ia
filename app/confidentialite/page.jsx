export default function Confidentialite() {
  const sections = [
    {
      title: "1. Responsable du traitement",
      content: `Le responsable du traitement des données personnelles collectées via Serelyo est l'éditeur du service, auto-entrepreneur français.

Contact : contact@serelyo.fr
Site web : serelyo.fr`
    },
    {
      title: "2. Données collectées",
      content: `Serelyo collecte les données suivantes :

Données de compte :
• Adresse email (obligatoire pour la création de compte)
• Mot de passe (stocké chiffré, non accessible)
• Prénom et nom (optionnel, saisi dans le profil)

Données professionnelles saisies par l'utilisateur :
• Secteur d'activité et informations de profil auto-entrepreneur
• Chiffre d'affaires mensuel
• Informations clients (nom, email, adresse) dans les devis
• Rendez-vous personnels du calendrier

Données techniques :
• Adresse IP et données de connexion
• Données de navigation (pages visitées, durée de session)
• Type de navigateur et appareil

Données de paiement :
• Les paiements sont traités par Stripe. Serelyo ne stocke aucune donnée bancaire.`
    },
    {
      title: "3. Finalités du traitement",
      content: `Vos données sont utilisées pour :

• Fournir et améliorer le service Serelyo
• Gérer votre compte et votre abonnement
• Effectuer les calculs et simulations demandés
• Envoyer les notifications liées au service (rappels d'échéances, etc.)
• Assurer la sécurité du service et prévenir la fraude
• Respecter nos obligations légales

Nous n'utilisons pas vos données à des fins publicitaires et ne les vendons jamais à des tiers.`
    },
    {
      title: "4. Base légale du traitement",
      content: `Les traitements de données réalisés par Serelyo reposent sur les bases légales suivantes :

• Exécution du contrat : pour fournir le service auquel vous avez souscrit
• Intérêt légitime : pour améliorer le service et assurer sa sécurité
• Obligation légale : pour respecter nos obligations comptables et fiscales
• Consentement : pour les communications marketing optionnelles`
    },
    {
      title: "5. Conservation des données",
      content: `Vos données sont conservées pendant toute la durée de votre utilisation du service, et pendant 3 ans après la suppression de votre compte (conformément aux obligations légales de conservation).

Les données de paiement sont conservées par Stripe selon leurs propres politiques de rétention.

Vous pouvez demander la suppression de vos données à tout moment en contactant contact@serelyo.fr ou en supprimant votre compte depuis l'application.`
    },
    {
      title: "6. Partage des données",
      content: `Serelyo ne vend jamais vos données personnelles. Elles peuvent être partagées uniquement avec :

• Supabase (infrastructure base de données et authentification) — hébergement en Europe
• Stripe (traitement des paiements) — certifié PCI DSS
• Anthropic (assistant IA) — uniquement les questions posées, sans données d'identification

Ces sous-traitants sont liés par des contrats garantissant la protection de vos données conformément au RGPD.

En cas d'obligation légale (décision judiciaire, réquisition), Serelyo peut être amené à communiquer des données aux autorités compétentes.`
    },
    {
      title: "7. Vos droits (RGPD)",
      content: `Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :

• Droit d'accès : obtenir une copie de vos données personnelles
• Droit de rectification : corriger des données inexactes
• Droit à l'effacement : demander la suppression de vos données
• Droit à la portabilité : recevoir vos données dans un format structuré
• Droit d'opposition : vous opposer à certains traitements
• Droit à la limitation : limiter le traitement de vos données

Pour exercer ces droits, contactez-nous à : contact@serelyo.fr

Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : cnil.fr`
    },
    {
      title: "8. Sécurité des données",
      content: `Serelyo met en oeuvre les mesures techniques et organisationnelles appropriées pour protéger vos données :

• Chiffrement des données en transit (HTTPS/TLS)
• Chiffrement des mots de passe (bcrypt)
• Authentification sécurisée via Supabase Auth
• Politiques d'accès strictes (Row Level Security) — chaque utilisateur n'accède qu'à ses propres données
• Hébergement sur infrastructure sécurisée en Europe

En cas de violation de données susceptible de vous porter préjudice, vous serez notifié dans les 72 heures conformément au RGPD.`
    },
    {
      title: "9. Cookies et traceurs",
      content: `Serelyo utilise uniquement les cookies strictement nécessaires au fonctionnement du service :

• Cookie de session : maintenir votre connexion
• Cookie de préférences : mémoriser vos paramètres

Aucun cookie publicitaire ou de tracking tiers n'est utilisé. Serelyo ne contient aucune publicité.

Les données analytiques sont collectées de manière agrégée et anonymisée pour améliorer le service.`
    },
    {
      title: "10. Transferts hors UE",
      content: `Vos données sont principalement hébergées en Europe. Certains de nos sous-traitants (Anthropic, Stripe) peuvent traiter des données aux États-Unis, dans le cadre de garanties appropriées (clauses contractuelles types de la Commission européenne).`
    },
    {
      title: "11. Modifications de la politique",
      content: `Cette politique de confidentialité peut être mise à jour pour refléter des changements dans nos pratiques ou la réglementation. En cas de modification substantielle, vous serez informé par email.

La version en vigueur est toujours accessible sur serelyo.fr/confidentialite

Dernière mise à jour : Avril 2026
Contact : contact@serelyo.fr`
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { background: #04000C; min-height: 100vh; }
        body {
          font-family: 'Inter', sans-serif; color: #fff;
          background: #04000C;
          background-image:
            radial-gradient(ellipse 140% 120% at 38% 42%, rgba(70,8,120,0.38) 0%, rgba(35,3,70,0.22) 45%, transparent 72%),
            radial-gradient(ellipse 90% 70% at 98% 90%, rgba(28,0,55,0.18) 0%, transparent 62%);
          background-attachment: fixed;
        }
        .legal-nav {
          background: rgba(4,0,12,0.80); backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          padding: 0 5%; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          position: sticky; top: 0; z-index: 100;
        }
        .legal-nav-logo {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px; font-weight: 800;
          letter-spacing: .14em; text-transform: uppercase;
          color: #fff; text-decoration: none;
        }
        .legal-nav-logo span { color: #f382ff; }
        .legal-nav-back {
          font-size: 13px; color: rgba(255,255,255,0.4);
          text-decoration: none; font-weight: 500; transition: color .2s;
        }
        .legal-nav-back:hover { color: #f382ff; }
        .legal-hero { padding: 80px 5% 60px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .legal-tag {
          display: inline-block; font-size: 10px; font-weight: 700;
          letter-spacing: .12em; text-transform: uppercase; color: #f382ff;
          margin-bottom: 16px; background: rgba(243,130,255,0.1);
          border: 1px solid rgba(243,130,255,0.2); padding: 5px 14px; border-radius: 9999px;
        }
        .legal-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(28px, 4vw, 44px); font-weight: 800;
          letter-spacing: -.02em; color: #fff; margin-bottom: 12px;
        }
        .legal-date { font-size: 13px; color: rgba(255,255,255,0.3); }
        .legal-body { max-width: 760px; margin: 0 auto; padding: 60px 5% 100px; }
        .legal-toc {
          background: rgba(20,5,40,0.40); backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 18px; padding: 28px 32px; margin-bottom: 40px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
        }
        .legal-toc h3 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #fff;
        }
        .legal-toc ol { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
        .legal-toc li a { font-size: 13px; color: rgba(243,130,255,0.8); text-decoration: none; transition: color .2s; }
        .legal-toc li a:hover { color: #f382ff; }
        .rgpd-badge {
          background: rgba(192,129,255,0.1);
          border: 1px solid rgba(192,129,255,0.25);
          border-radius: 14px; padding: 16px 20px;
          font-size: 13px; color: #dbb4ff;
          margin-bottom: 40px; display: flex; gap: 12px; align-items: flex-start; line-height: 1.7;
        }
        .rgpd-badge strong { color: #fff; }
        .legal-section { margin-bottom: 48px; scroll-margin-top: 80px; }
        .legal-section h2 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 19px; font-weight: 700; color: #fff;
          padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 20px; letter-spacing: -.01em;
        }
        .legal-section p {
          font-size: 14px; color: rgba(255,255,255,0.58);
          line-height: 1.9; white-space: pre-line;
        }
        .legal-footer {
          background: rgba(4,0,12,0.85); backdrop-filter: blur(40px);
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 36px 5%; text-align: center;
          font-size: 12px; color: rgba(255,255,255,0.22);
        }
        .legal-footer a { color: rgba(243,130,255,0.7); text-decoration: none; margin: 0 12px; transition: color .2s; }
        .legal-footer a:hover { color: #f382ff; }
        @media (max-width: 600px) {
          .legal-hero { padding: 60px 5% 40px; }
          .legal-body { padding: 40px 5% 80px; }
        }
      `}</style>

      <nav className="legal-nav">
        <a href="/" className="legal-nav-logo">Serely<span>o</span></a>
        <a href="/dashboard" className="legal-nav-back">← Retour à l'application</a>
      </nav>

      <div className="legal-hero">
        <div className="legal-tag">Documents légaux</div>
        <h1 className="legal-title">Politique de confidentialité</h1>
        <div className="legal-date">Dernière mise à jour : Avril 2026</div>
      </div>

      <div className="legal-body">
        <div className="rgpd-badge">
          <span style={{flexShrink:0,marginTop:2}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <span><strong>Conforme RGPD</strong> — Serelyo respecte le Règlement Général sur la Protection des Données (UE) 2016/679. Vos données ne sont jamais vendues ni utilisées à des fins publicitaires.</span>
        </div>

        <div className="legal-toc">
          <h3>Sommaire</h3>
          <ol>
            {sections.map((s, i) => (
              <li key={i}><a href={`#section-${i}`}>{s.title}</a></li>
            ))}
          </ol>
        </div>

        {sections.map((s, i) => (
          <div key={i} id={`section-${i}`} className="legal-section">
            <h2>{s.title}</h2>
            <p>{s.content}</p>
          </div>
        ))}
      </div>

      <footer className="legal-footer">
        © 2026 Serelyo — Tous droits réservés
        <br/><br/>
        <a href="/cgu">CGU</a>
        <a href="/confidentialite">Politique de confidentialité</a>
        <a href="/mentions-legales">Mentions légales</a>
      </footer>
    </>
  )
}
