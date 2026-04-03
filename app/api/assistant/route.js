export async function POST(request) {
  try {
    const { question, profil } = await request.json()
    if (!question) return Response.json({ error: 'Question manquante' }, { status: 400 })

    const contexte = profil ? `
L'utilisateur est auto-entrepreneur avec ce profil :
- Activité : ${profil.activite || 'non précisée'}
- Secteur : ${profil.secteur || 'non précisé'}
- Date de création : ${profil.date_creation || 'non précisée'}
- Régime de déclaration : ${profil.regime_declaration || 'trimestriel'}
- ACRE : ${profil.acre ? 'oui, fin le ' + profil.acre_fin : 'non'}
` : ''

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Tu es un expert-comptable français spécialisé dans les auto-entrepreneurs. Tu réponds en français, de façon claire, simple et bienveillante — comme un ami comptable, pas un robot administratif.

Tes réponses sont :
- Courtes et directes (max 4-5 paragraphes)
- En langage simple, sans jargon inutile
- Toujours adaptées à la situation spécifique de l'utilisateur
- Accompagnées d'exemples chiffrés quand c'est utile
- Honnêtes si tu n'es pas sûr d'une info

Données clés 2025 :
- Taux URSSAF services BNC/libéral : 21.2% (avec ACRE 50% la 1ère année)
- Taux URSSAF services BIC : 21.2%
- Taux URSSAF ventes marchandises : 12.3%
- Seuil franchise TVA services : 36 800€
- Seuil franchise TVA ventes : 91 900€
- Plafond micro-entreprise services : 77 700€
- Plafond micro-entreprise ventes : 188 700€
- CFE : due chaque année en décembre (sauf première année)
- Déclaration URSSAF mensuelle ou trimestrielle selon choix
- Date limite déclaration : 30 avril de l'année suivante pour impôts

${contexte}

Si la question dépasse tes compétences ou nécessite un vrai comptable, dis-le clairement.`,
        messages: [{ role: 'user', content: question }],
      }),
    })

    if (!response.ok) throw new Error('Erreur API ' + response.status)
    const data = await response.json()
    const reponse = data.content.map(b => b.text || '').join('')
    return Response.json({ reponse })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
