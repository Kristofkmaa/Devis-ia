
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICES = {
  mensuel:  process.env.STRIPE_PRICE_MENSUEL,
  annuel:   process.env.STRIPE_PRICE_ANNUEL,
  hotline:  process.env.STRIPE_PRICE_HOTLINE,
}

export async function POST(req) {
  try {
    const { plan } = await req.json()
    if (!PRICES[plan]) return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })

    // Get current user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    // Get or create Stripe customer
    const { data: profil } = await supabase
      .from('ae_profiles')
      .select('stripe_customer_id, prenom, nom')
      .eq('user_id', user.id)
      .single()

    let customerId = profil?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profil ? `${profil.prenom || ''} ${profil.nom || ''}`.trim() : undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('ae_profiles')
        .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: 'user_id' })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICES[plan], quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?success=1`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/premium?cancelled=1`,
      locale: 'fr',
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { user_id: user.id, plan },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
