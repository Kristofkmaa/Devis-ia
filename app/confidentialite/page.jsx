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
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Outfit', sans-serif; background: #FFFDF8; color: #1C1710; }
        .legal-nav {
          background: #1C1710; padding: 18px 5%;
          display: flex; align-items: center; justify-content: space-between;
        }
        .legal-nav-logo { font-family: 'Playfair Display', serif; font-size: 20px; color: #fff; text-decoration: none; }
        .legal-nav-logo span { color: #B5792A; }
        .legal-nav-back { font-size: 13px; color: rgba(255,255,255,.5); text-decoration: none; transition: color .2s; }
        .legal-nav-back:hover { color: #fff; }
        .legal-hero {
          background: #1C1710; padding: 60px 5% 50px; text-align: center;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .legal-tag {
          display: inline-block; font-size: 11px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase;
          color: #B5792A; margin-bottom: 14px;
        }
        .legal-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 44px);
          color: #fff; margin-bottom: 14px;
        }
        .legal-date { font-size: 13px; color: rgba(255,255,255,.3); }
        .legal-body { max-width: 760px; margin: 0 auto; padding: 60px 5% 100px; }
        .legal-toc {
          background: #FAF3E0; border: 1px solid #E2D8C4;
          border-radius: 16px; padding: 24px 28px; margin-bottom: 48px;
        }
        .legal-toc h3 {
          font-family: 'Playfair Display', serif;
          font-size: 16px; margin-bottom: 14px; color: #1C1710;
        }
        .legal-toc ol { padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
        .legal-toc li a {
          font-size: 13px; color: #B5792A; text-decoration: none;
          transition: color .2s;
        }
        .legal-toc li a:hover { color: #1C1710; }
        .rgpd-badge {
          background: #EDFAF3; border: 1px solid #9CDBB8;
          border-radius: 12px; padding: 14px 18px;
          font-size: 13px; color: #2D7A4F;
          margin-bottom: 40px; display: flex; gap: 10px; align-items: flex-start;
        }
        .legal-section { margin-bottom: 48px; scroll-margin-top: 80px; }
        .legal-section h2 {
          font-family: 'Playfair Display', serif;
          font-size: 21px; color: #1C1710;
          padding-bottom: 12px; border-bottom: 2px solid #E2D8C4;
          margin-bottom: 20px;
        }
        .legal-section p {
          font-size: 14px; color: #4A3F2E;
          line-height: 1.9; white-space: pre-line;
        }
        .legal-footer {
          background: #1C1710; padding: 32px 5%;
          text-align: center; font-size: 12px; color: rgba(255,255,255,.3);
        }
        .legal-footer a { color: #B5792A; text-decoration: none; margin: 0 12px; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet"/>

      <nav className="legal-nav">
        <a href="/dashboard" className="legal-nav-logo">Serely<span>o</span></a>
        <a href="/dashboard" className="legal-nav-back">← Retour à l'application</a>
      </nav>

      <div className="legal-hero">
        <div className="legal-tag">Documents légaux</div>
        <h1 className="legal-title">Politique de confidentialité</h1>
        <div className="legal-date">Dernière mise à jour : Avril 2026</div>
      </div>

      <div className="legal-body">
        <div className="rgpd-badge">
          <span>🔒</span>
          <span><strong>Conforme RGPD</strong> — Serelyo respecte le Règlement Général sur la Protection des Données (UE) 2016/679. Vos données ne sont jamais vendues ni utilisées à des fins publicitaires.</span>
        </div>

        <div className="legal-toc">
          <h3>Sommaire</h3>
          <ol>
            {sections.map((s, i) => (
              <li key={i}>
                <a href={`#section-${i}`}>{s.title}</a>
              </li>
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
