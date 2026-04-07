export default function MentionsLegales() {
  return (
    <>
      <style>{`
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
        .legal-body { max-width: 760px; margin: 0 auto; padding: 60px 5% 120px; }
        .ml-card {
          background: rgba(20,5,40,0.35); backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.13);
          border-radius: 18px; padding: 24px 28px; margin-bottom: 16px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .ml-card h2 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 16px; font-weight: 700; color: #fff;
          margin-bottom: 14px; padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08); letter-spacing: -.01em;
        }
        .ml-row {
          display: flex; gap: 16px; font-size: 13px;
          color: rgba(255,255,255,0.55); margin-bottom: 10px; line-height: 1.7;
        }
        .ml-label { font-weight: 600; color: rgba(255,255,255,0.8); min-width: 180px; flex-shrink: 0; }
        .ml-text { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.85; }
        .ml-link { color: #f382ff; text-decoration: none; }
        .ml-link:hover { text-decoration: underline; }
        .legal-footer {
          background: rgba(4,0,12,0.85); backdrop-filter: blur(40px);
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 36px 5% calc(48px + env(safe-area-inset-bottom)); text-align: center;
          font-size: 12px; color: rgba(255,255,255,0.22);
        }
        .legal-footer a { color: rgba(243,130,255,0.7); text-decoration: none; margin: 0 12px; transition: color .2s; }
        .legal-footer a:hover { color: #f382ff; }
        /* Hide app bottom nav if present on this page */
        .nav-tabs { display: none !important; }
        @media (max-width: 600px) {
          .legal-hero { padding: 60px 5% 40px; }
          .legal-body { padding: 40px 5% 100px; }
          .ml-row { flex-direction: column; gap: 4px; }
          .ml-label { min-width: unset; }
        }
      `}</style>

      <nav className="legal-nav">
        <a href="/" className="legal-nav-logo">Serely<span>o</span></a>
        <a href="/dashboard" className="legal-nav-back">← Retour à l'application</a>
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
          <p className="ml-text">
            L'ensemble du contenu de ce site (textes, graphiques, logos, code source) est protégé par le droit d'auteur et appartient à l'éditeur de Serelyo. Toute reproduction sans autorisation préalable est interdite.
          </p>
        </div>

        <div className="ml-card">
          <h2>Limitation de responsabilité</h2>
          <p className="ml-text">
            Les informations et calculs fournis par Serelyo ont une valeur indicative. Ils sont basés sur les taux officiels URSSAF et fiscaux en vigueur, mais ne constituent pas un conseil comptable ou fiscal certifié. Serelyo ne saurait être tenu responsable des décisions prises sur la base des informations fournies. En cas de doute, consultez un expert-comptable.
          </p>
        </div>

        <div className="ml-card">
          <h2>Données personnelles et RGPD</h2>
          <p className="ml-text">
            Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits ou pour toute question relative à vos données personnelles, contactez-nous à contact@serelyo.fr.
            <br/><br/>
            Consultez notre <a href="/confidentialite" className="ml-link">Politique de confidentialité complète</a> pour plus d'informations.
          </p>
        </div>

        <div className="ml-card">
          <h2>Droit applicable</h2>
          <p className="ml-text">
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
