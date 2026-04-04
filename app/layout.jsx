import './globals.css'

export const metadata = {
  title: 'Serelyo — Ton copilote administratif',
  description: 'Calendrier des déclarations, calcul des cotisations, assistant et ressources officielles — tout ce dont l\'auto-entrepreneur a besoin au même endroit.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
