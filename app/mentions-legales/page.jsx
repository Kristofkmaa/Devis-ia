export default function MentionsLegales() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Outfit', sans-serif; background: #FFFDF8; color: #1C1710; }
        .legal-nav { background: #1C1710; padding: 18px 5%; display: flex; align-items: center; justify-content: space-between; }
        .legal-nav-logo { font-family: 'Playfair Display', serif; font-size: 20px; color: #fff; text-decoration: none; }
        .legal-nav-logo span { color: #B5792A; }
        .legal-nav-back { font-size: 13px; color: rgba(255,255,255,.5); text-decoration: none; }
        .legal-hero { background: #1C1710; padding: 60px 5% 50px; text-align: center; }
        .legal-tag { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #B5792A; margin-bottom: 14px; }
        .legal-title { font-family: 'Playfair Display', serif; font-size: clamp(28px,4vw,44px); color: #fff; margin-bottom: 14px; }
        .legal-body { max-width: 760px; margin: 0 auto; padding: 60px 5% 100px; }
        .ml-card { background: #fff; border: 1px solid #E2D8C4; border-radius: 16px; padding: 24px 28px; margin-bottom: 20px; }
        .ml-card h2 { font-family: 'Playfair Display', serif; font-size: 18px; color: #1C1710; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #F6F0E4; }
        .ml-row { display: flex; gap: 12px; font-size: 13px; color: #4A3F2E; margin-bottom: 8px; line-height: 1.7; }
        .ml-label { font-weight: 600; color: #1C1710; min-width: 180px; flex-shrink: 0; }
        .legal-footer { background: #1C1710; padding: 32px 5%; text-align: center; font-size: 12px; color: rgba(255,255,255,.3); }
        .legal-footer a { color: #B5792A; text-decoration: none; margin: 0 12px; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet"/>

      <nav className="legal-nav">
        <a href="/dashboard" className="legal-nav-logo">Serely<span>o</span></a>
        <a href="/" className="legal-nav-back">← Retour</a>
      </nav>

      <div className="legal-hero">
        <div className="legal-tag">Documents légaux</div>
        <h1 className="legal-title">Mentions légales</h1>
      </div>

      <div className="legal-body">

        <div className="ml-card">
          <h2>Éditeur du site</h2>
          <div className="ml-row"><span className="ml-label">Statut juridique</span><span>Auto-entrepreneur</span></div>
          <div className="ml-row"><span className="ml-label">Site web</span><span>serelyo.fr</span></div>
          <div className="ml-row"><span className="ml-label">Email de contact</span><span>contact@serelyo.fr</span></div>
          <div className="ml-row"><span className="ml-label">Pays</span><span>France</span></div>
        </div>

        <div className="ml-card">
          <h2>Hébergement</h2>
          <div className="ml-row"><span className="ml-label">Hébergeur principal</span><span>Vercel Inc. — 340 Pine Street, Suite 701, San Francisco, CA 94104, USA</span></div>
          <div className="ml-row"><span className="ml-label">Base de données</span><span>Supabase — infrastructure hébergée en Europe (Frankfurt, Allemagne)</span></div>
        </div>

        <div className="ml-card">
          <h2>Propriété intellectuelle</h2>
          <p style={{fontSize:13,color:'#4A3F2E',lineHeight:1.8}}>
            L'ensemble du contenu de ce site (textes, graphiques, logos, code source) est protégé par le droit d'auteur et appartient à l'éditeur de Serelyo. Toute reproduction sans autorisation préalable est interdite.
          </p>
        </div>

        <div className="ml-card">
          <h2>Limitation de responsabilité</h2>
          <p style={{fontSize:13,color:'#4A3F2E',lineHeight:1.8}}>
            Les informations et calculs fournis par Serelyo ont une valeur indicative. Ils sont basés sur les taux officiels URSSAF et fiscaux en vigueur, mais ne constituent pas un conseil comptable ou fiscal certifié. Serelyo ne saurait être tenu responsable des décisions prises sur la base des informations fournies. En cas de doute, consultez un expert-comptable.
          </p>
        </div>

        <div className="ml-card">
          <h2>Données personnelles et RGPD</h2>
          <p style={{fontSize:13,color:'#4A3F2E',lineHeight:1.8}}>
            Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits ou pour toute question relative à vos données personnelles, contactez-nous à contact@serelyo.fr.
            <br/><br/>
            Consultez notre <a href="/confidentialite" style={{color:'#B5792A'}}>Politique de confidentialité complète</a> pour plus d'informations.
          </p>
        </div>

        <div className="ml-card">
          <h2>Droit applicable</h2>
          <p style={{fontSize:13,color:'#4A3F2E',lineHeight:1.8}}>
            Le présent site est soumis au droit français. En cas de litige, les tribunaux français seront seuls compétents.
          </p>
        </div>

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
