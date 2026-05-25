import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(apiKey);
  }
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

const PROGRAM_TYPES = ['emotional', 'confidence', 'anger', 'stress', 'social-anxiety', 'thoughts'];
const PLAN_TYPES = ['monthly', 'lifetime', 'premium-lifetime'];

const PRICING: Record<string, Record<string, number>> = {
  monthly: {
    emotional: 4.99,
    confidence: 4.99,
    anger: 4.99,
    stress: 4.99,
    'social-anxiety': 4.99,
    thoughts: 4.99,
  },
  lifetime: {
    emotional: 10.99,
    confidence: 10.99,
    anger: 10.99,
    stress: 10.99,
    'social-anxiety': 10.99,
    thoughts: 10.99,
  },
  'premium-lifetime': {
    emotional: 59.99,
    confidence: 59.99,
    anger: 59.99,
    stress: 59.99,
    'social-anxiety': 59.99,
    thoughts: 59.99,
  },
};

export interface PriceId {
  id: string;
  productId: string;
  planType: string;
  programType: string;
  amount: number;
  currency: string;
  recurring?: {
    interval: string;
    interval_count: number;
  };
}

export async function getStripePriceIds(): Promise<PriceId[]> {
  const stripe = getStripe();
  try {
    const prices = await stripe.prices.list({ limit: 100 });
    return prices.data.map((price) => ({
      id: price.id,
      productId: typeof price.product === 'string' ? price.product : price.product.id,
      planType: price.metadata?.plan_type || '',
      programType: price.metadata?.program_type || '',
      amount: price.unit_amount || 0,
      currency: price.currency,
      recurring: price.recurring
        ? {
            interval: price.recurring.interval,
            interval_count: price.recurring.interval_count,
          }
        : undefined,
    }));
  } catch (error) {
    throw new Error(`Failed to fetch Stripe prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function bootstrapStripe(): Promise<void> {
  // Validate the key format before attempting to bootstrap
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || (!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('sk_live_'))) {
    console.info('[Stripe] STRIPE_SECRET_KEY not set or invalid format — skipping Stripe bootstrap');
    return;
  }

  const stripe = getStripe();

  try {
    // Check if products already exist
    const existingProducts = await stripe.products.list({ limit: 1 });
    if (existingProducts.data.length > 0) {
      return; // Already bootstrapped
    }

    // Create products and prices for each program type
    for (const programType of PROGRAM_TYPES) {
      // Create monthly product
      const monthlyProduct = await stripe.products.create({
        name: `${programType.charAt(0).toUpperCase() + programType.slice(1)} Program - Monthly`,
        metadata: {
          program_type: programType,
          plan_type: 'monthly',
        },
      });

      await stripe.prices.create({
        product: monthlyProduct.id,
        unit_amount: Math.round(PRICING.monthly[programType] * 100),
        currency: 'usd',
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
        metadata: {
          program_type: programType,
          plan_type: 'monthly',
        },
      });

      // Create lifetime product
      const lifetimeProduct = await stripe.products.create({
        name: `${programType.charAt(0).toUpperCase() + programType.slice(1)} Program - Lifetime`,
        metadata: {
          program_type: programType,
          plan_type: 'lifetime',
        },
      });

      await stripe.prices.create({
        product: lifetimeProduct.id,
        unit_amount: Math.round(PRICING.lifetime[programType] * 100),
        currency: 'usd',
        metadata: {
          program_type: programType,
          plan_type: 'lifetime',
        },
      });

      // Create premium lifetime product
      const premiumProduct = await stripe.products.create({
        name: `${programType.charAt(0).toUpperCase() + programType.slice(1)} Program - Premium Lifetime`,
        metadata: {
          program_type: programType,
          plan_type: 'premium-lifetime',
        },
      });

      await stripe.prices.create({
        product: premiumProduct.id,
        unit_amount: Math.round(PRICING['premium-lifetime'][programType] * 100),
        currency: 'usd',
        metadata: {
          program_type: programType,
          plan_type: 'premium-lifetime',
        },
      });
    }
  } catch (error) {
    throw new Error(`Failed to bootstrap Stripe: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
