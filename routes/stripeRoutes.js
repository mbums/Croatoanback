import express from 'express';
import Stripe from 'stripe';

const router = express.Router();
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const stripe = new Stripe('sk_test_51R2OeCCjLlrtGPQNWd6NOKuq1gUXAoSUzekhQiZxGWuwh5ZwMPmjV7KxySseHpAPT4P6oRAetbw4L1dFoz7ildJj00aV5toDl6');

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, customerEmail, userId, planType } = req.body;


    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&user_id=${userId}&plan_type=${planType}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-canceled`,
    });

    // ✅ Return session with URL
    res.json({ 
      id: session.id,
      url: session.url // This is important!
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription plans
router.get('/subscription-plans', async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      active: true,
      type: 'recurring',
      expand: ['data.product']
    });

    const plans = prices.data.map(price => ({
      id: price.id,
      product: price.product.name,
      amount: price.unit_amount / 100,
      currency: price.currency,
      interval: price.recurring.interval,
      planType: price.product.metadata.planType || 'monthly'
    }));

    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
