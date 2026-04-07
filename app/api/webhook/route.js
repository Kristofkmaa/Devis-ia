import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PLAN_FROM_PRICE = {
  [process.env.STRIPE_PRICE_MENSUEL]: 'mensuel',
  [process.env.STRIPE_PRICE_ANNUEL]:  'annuel',
  [process.env.STRIPE_PRICE_HOTLINE]: 'hotline',
}

async function updatePlan(userId, plan, expiresAt = null) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  await supabase.from('ae_profiles')
    .upsert({
      user_id: userId,
      plan,
      plan_expires_at: expiresAt,
    }, { onConflict: 'user_id' })
}

export async function POST(req) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Abonnement créé ou mis à jour ──────────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub    = event.data.object
        const userId = sub.metadata?.user_id
        if (!userId) break
        const priceId = sub.items.data[0]?.price?.id
        const plan    = PLAN_FROM_PRICE[priceId] || 'mensuel'
        const active  = ['active', 'trialing'].includes(sub.status)
        const expires = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null
        await updatePlan(userId, active ? plan : 'none', expires)
        break
      }

      // ── Abonnement annulé ou expiré ────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub    = event.data.object
        const userId = sub.metadata?.user_id
        if (!userId) break
        await updatePlan(userId, 'none', null)
        break
      }

      // ── Paiement échoué ────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice  = event.data.object
        const customer = await stripe.customers.retrieve(invoice.customer)
        const userId   = customer.metadata?.user_id
        if (userId) await updatePlan(userId, 'suspended', null)
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
  }

  return NextResponse.json({ received: true })
}
