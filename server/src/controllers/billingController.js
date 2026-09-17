const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');

const tierConfig = {
  Premium: 'STRIPE_PREMIUM_PRICE_ID',
  Gold: 'STRIPE_GOLD_PRICE_ID'
};

const publicAppUrl = () => (process.env.PUBLIC_APP_URL || 'http://localhost:4200').replace(/\/$/, '');

exports.createCheckoutSession = async (req, res) => {
  const tier = req.body?.tier;
  const priceEnvKey = tierConfig[tier];
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = priceEnvKey ? process.env[priceEnvKey] : undefined;

  if (!priceEnvKey || !secretKey || !priceId) {
    return res.status(503).json({
      message: 'Paid plans are not configured yet. Add the Stripe secret and price IDs in the server environment.'
    });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Billing is temporarily unavailable.' });
  }

  const user = await User.findById(req.user.id).select('email').lean();
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${publicAppUrl()}/settings?checkout=success`,
    cancel_url: `${publicAppUrl()}/settings?checkout=cancelled`,
    client_reference_id: String(req.user.id),
    'metadata[userId]': String(req.user.id),
    'metadata[tier]': tier,
    'subscription_data[metadata][userId]': String(req.user.id),
    'subscription_data[metadata][tier]': tier
  });
  if (user.email) params.set('customer_email', user.email);

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    const data = await response.json();
    if (!response.ok || typeof data.url !== 'string') {
      console.error('Stripe checkout session creation failed:', data?.error?.message || response.status);
      return res.status(502).json({ message: 'Unable to start secure checkout.' });
    }
    return res.json({ url: data.url });
  } catch (error) {
    console.error('Stripe checkout request failed:', error.message);
    return res.status(502).json({ message: 'Unable to start secure checkout.' });
  }
};

const hasValidStripeSignature = (payload, header, secret) => {
  if (!header || !secret) return false;
  const values = Object.fromEntries(header.split(',').map((part) => part.split('=')));
  if (!values.t || !values.v1) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${values.t}.${payload.toString()}`)
    .digest('hex');
  const actual = Buffer.from(values.v1, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
};

exports.handleWebhook = async (req, res) => {
  if (!hasValidStripeSignature(req.body, req.header('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET)) {
    return res.status(400).json({ message: 'Invalid Stripe signature.' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ message: 'Invalid webhook payload.' });
  }

  const session = event.data?.object;
  if (event.type === 'checkout.session.completed' && session?.metadata?.userId && session.metadata.tier) {
    await User.findByIdAndUpdate(session.metadata.userId, {
      subscriptionTier: session.metadata.tier,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription
    });
  }

  if (event.type === 'customer.subscription.deleted' && session?.metadata?.userId) {
    await User.findByIdAndUpdate(session.metadata.userId, {
      subscriptionTier: 'Free',
      stripeSubscriptionId: null
    });
  }

  return res.json({ received: true });
};
