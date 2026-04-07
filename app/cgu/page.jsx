export default function CGU() {
  const sections = [
    {
      title: "1. Présentation de Serelyo",
      content: `Serelyo est un service en ligne édité par un auto-entrepreneur français, accessible à l'adresse serelyo.fr. Il s'agit d'un outil de gestion et de simulation administrative destiné aux micro-entrepreneurs et auto-entrepreneurs français.

Serelyo n'est pas un logiciel de comptabilité certifié, ni un cabinet d'expertise comptable. Les informations et calculs fournis sont des estimations basées sur les données officielles URSSAF et fiscales, et ne constituent pas un conseil comptable, fiscal ou juridique.`
    },
    {
      title: "2. Acceptation des conditions",
      content: `L'utilisation de Serelyo implique l'acceptation pleine et entière des présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser le service.

Ces CGU peuvent être modifiées à tout moment. Vous serez informé des modifications substantielles par email ou par notification dans l'application. La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles conditions.`
    },
    {
      title: "3. Description du service",
      content: `Serelyo propose les fonctionnalités suivantes :

• Tableau de bord personnalisé avec indicateurs financiers
• Calcul des cotisations URSSAF selon le secteur d'activité
• Simulateur de revenus annuels avec graphiques
• Calendrier des échéances administratives (déclarations URSSAF, CFE, IR)
• Générateur de devis professionnels
• Suivi des revenus mensuels
• Assistant IA pour questions administratives
• Ressources et liens officiels

Les fonctionnalités disponibles varient selon le plan souscrit (Gratuit ou Pro).`
    },
    {
      title: "4. Inscription et compte utilisateur",
      content: `Pour utiliser Serelyo, vous devez créer un compte avec une adresse email valide et un mot de passe. Vous êtes responsable de la confidentialité de vos identifiants et de toutes les actions effectuées depuis votre compte.

Vous vous engagez à fournir des informations exactes lors de l'inscription et à les maintenir à jour. Serelyo se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU ou d'activité frauduleuse.

Vous pouvez supprimer votre compte à tout moment depuis les paramètres de l'application. La suppression entraîne la perte définitive de vos données.`
    },
    {
      title: "5. Tarifs et abonnement",
      content: `Serelyo propose un plan Gratuit avec des fonctionnalités limitées, et un plan Pro à 25€ par mois (ou 249€ par an).

Le plan Pro inclut un essai gratuit de 30 jours sans engagement et sans carte bancaire requise. À l'issue de la période d'essai, le paiement est prélevé automatiquement via Stripe.

Vous pouvez annuler votre abonnement à tout moment depuis votre espace compte. L'annulation prend effet à la fin de la période en cours — aucun remboursement proratisé n'est effectué pour la période restante.

Les tarifs peuvent évoluer. Vous serez informé par email au moins 30 jours avant toute modification tarifaire.`
    },
    {
      title: "6. Limitation de responsabilité",
      content: `Serelyo est un outil d'aide à la gestion administrative. Les calculs et informations fournis sont basés sur les taux officiels URSSAF et les données fiscales en vigueur, mais ils ont une valeur indicative et ne constituent en aucun cas un conseil comptable ou fiscal certifié.

Serelyo ne peut être tenu responsable :
• Des erreurs ou omissions dans les calculs résultant d'informations inexactes saisies par l'utilisateur
• Des conséquences fiscales ou sociales d'une décision prise sur la base des informations fournies
• Des changements législatifs ou réglementaires non encore intégrés à l'application
• Des pertes de données dues à des circonstances indépendantes de notre volonté

En cas de doute sur votre situation fiscale ou comptable, nous vous recommandons de consulter un expert-comptable ou un conseiller fiscal.`
    },
    {
      title: "7. Propriété intellectuelle",
      content: `L'ensemble du contenu de Serelyo (code source, design, textes, logos, graphiques) est protégé par le droit de la propriété intellectuelle et appartient à son éditeur.

Vous êtes autorisé à utiliser Serelyo pour votre usage personnel et professionnel. Toute reproduction, modification, distribution ou exploitation commerciale du service ou de ses éléments sans autorisation préalable est strictement interdite.

Les devis générés par Serelyo vous appartiennent et vous pouvez les utiliser librement dans le cadre de votre activité professionnelle.`
    },
    {
      title: "8. Disponibilité du service",
      content: `Serelyo s'efforce d'assurer la disponibilité du service 24h/24 et 7j/7, mais ne peut garantir une disponibilité sans interruption. Des maintenances planifiées peuvent entraîner des interruptions temporaires, communiquées à l'avance dans la mesure du possible.

En cas d'interruption non planifiée, Serelyo ne pourra être tenu responsable des préjudices directs ou indirects pouvant en résulter.`
    },
    {
      title: "9. Droit applicable et juridiction",
      content: `Les présentes CGU sont soumises au droit français. En cas de litige, et après tentative de résolution amiable, les tribunaux français seront compétents.

Conformément à l'article L.612-1 du Code de la consommation, vous pouvez recourir gratuitement à un médiateur de la consommation en cas de litige non résolu.`
    },
    {
      title: "10. Contact",
      content: `Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse : contact@serelyo.fr

Dernière mise à jour : Avril 2026`
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
          border-radius: 18px; padding: 28px 32px; margin-bottom: 48px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
        }
        .legal-toc h3 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #fff;
        }
        .legal-toc ol { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
        .legal-toc li a { font-size: 13px; color: rgba(243,130,255,0.8); text-decoration: none; transition: color .2s; }
        .legal-toc li a:hover { color: #f382ff; }
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
        <h1 className="legal-title">Conditions Générales d'Utilisation</h1>
        <div className="legal-date">Dernière mise à jour : Avril 2026</div>
      </div>

      <div className="legal-body">
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
