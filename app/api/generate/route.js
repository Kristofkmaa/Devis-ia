export async function POST(request) {
  try {
    const { prompt, docType } = await request.json()

    if (!prompt) {
      return Response.json({ error: 'Prompt manquant' }, { status: 400 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: `Tu génères des devis/factures en JSON uniquement. Réponds SEULEMENT avec un objet JSON valide, sans texte ni backticks.
Format : {"client":{"nom":"...","adresse":"...","type":"particulier|entreprise"},"lignes":[{"ref":"","designation":"...","detail":"...","quantite":1,"unite":"jour|heure|forfait|unité","prix_unitaire":0}],"tva_taux":20,"conditions":"Paiement à 30 jours","validite":"30 jours","date_prestation":"","ref_commande":""}
Infère des valeurs réalistes. Pour articles avec variantes (tailles, couleurs), crée une ligne par variante.`,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
    const doc  = JSON.parse(text)

    return Response.json({ doc })

  } catch (error) {
    console.error('Generate error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
