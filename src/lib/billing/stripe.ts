// ============================================
// Stripe Billing Integration
// Enterprise-Grade Payment Processing
// ============================================

import Stripe from 'stripe';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { PLAN_LIMITS, type PlanLimits } from '@/lib/subscription/limits';
import type { Plan } from '@/types';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
}) : null;

// Stripe product and price IDs from environment
const STRIPE_PRODUCTS = {
  STARTER: process.env.STRIPE_STARTER_PRODUCT_ID,
  PROFESSIONAL: process.env.STRIPE_PROFESSIONAL_PRODUCT_ID,
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRODUCT_ID,
};

const STRIPE_PRICES = {
  STARTER: process.env.STRIPE_STARTER_PRICE_ID,
  PROFESSIONAL: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID,
};

// ============================================
// Customer Management
// ============================================

export interface CustomerData {
  email: string;
  name: string;
  organizationId: string;
}

/**
 * Create a Stripe customer for an organization
 */
export async function createStripeCustomer(data: CustomerData): Promise<string | null> {
  if (!stripe) {
    console.warn('Stripe not configured - skipping customer creation');
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        organizationId: data.organizationId,
      },
    });

    // Update organization with Stripe customer ID
    if (isDatabaseAvailable()) {
      await prisma!.organization.update({
        where: { id: data.organizationId },
        data: { stripeCustomerId: customer.id },
      });
    }

    return customer.id;
  } catch (error) {
    console.error('Failed to create Stripe customer:', error);
    return null;
  }
}

/**
 * Get Stripe customer by ID
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer | null> {
  if (!stripe) return null;

  try {
    return await stripe.customers.retrieve(customerId) as Stripe.Customer;
  } catch (error) {
    console.error('Failed to retrieve Stripe customer:', error);
    return null;
  }
}

/**
 * Get or create Stripe customer for an organization
 */
export async function getOrCreateStripeCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<string | null> {
  if (!isDatabaseAvailable()) {
    return null;
  }

  const organization = await prisma!.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) return null;

  // Return existing customer ID if exists
  if (organization.stripeCustomerId) {
    return organization.stripeCustomerId;
  }

  // Create new customer
  return createStripeCustomer({
    email,
    name,
    organizationId,
  });
}

// ============================================
// Subscription Management
// ============================================

export interface SubscriptionData {
  customerId: string;
  priceId: string;
  organizationId: string;
  trialDays?: number;
}

/**
 * Create a Stripe subscription
 */
export async function createStripeSubscription(data: SubscriptionData): Promise<{
  subscriptionId: string;
  clientSecret: string | null;
  status: string;
} | null> {
  if (!stripe) {
    console.warn('Stripe not configured - skipping subscription creation');
    return null;
  }

  try {
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: data.customerId,
      items: [{ price: data.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        organizationId: data.organizationId,
      },
    };

    if (data.trialDays && data.trialDays > 0) {
      subscriptionParams.trial_period_days = data.trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret ?? null,
      status: subscription.status,
    };
  } catch (error) {
    console.error('Failed to create Stripe subscription:', error);
    return null;
  }
}

/**
 * Get Stripe subscription by ID
 */
export async function getStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!stripe) return null;

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Failed to retrieve Stripe subscription:', error);
    return null;
  }
}

/**
 * Cancel a Stripe subscription
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription | null> {
  if (!stripe) return null;

  try {
    if (immediately) {
      return await stripe.subscriptions.cancel(subscriptionId);
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  } catch (error) {
    console.error('Failed to cancel Stripe subscription:', error);
    return null;
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!stripe) return null;

  try {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  } catch (error) {
    console.error('Failed to reactivate Stripe subscription:', error);
    return null;
  }
}

/**
 * Update subscription plan
 */
export async function updateStripeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) return null;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Failed to update Stripe subscription:', error);
    return null;
  }
}

// ============================================
// Invoice Management
// ============================================

/**
 * Get invoices for a customer
 */
export async function getStripeInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
  if (!stripe) return [];

  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  } catch (error) {
    console.error('Failed to retrieve Stripe invoices:', error);
    return [];
  }
}

/**
 * Get upcoming invoice
 */
export async function getUpcomingInvoice(customerId: string): Promise<Stripe.UpcomingInvoice | null> {
  if (!stripe) return null;

  try {
    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
    return invoice as unknown as Stripe.UpcomingInvoice;
  } catch (error) {
    console.error('Failed to retrieve upcoming invoice:', error);
    return null;
  }
}

// ============================================
// Checkout Session
// ============================================

export interface CheckoutSessionData {
  customerId: string;
  priceId: string;
  organizationId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(data: CheckoutSessionData): Promise<string | null> {
  if (!stripe) {
    console.warn('Stripe not configured - skipping checkout session');
    return null;
  }

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: data.customerId,
      mode: 'subscription',
      line_items: [{
        price: data.priceId,
        quantity: 1,
      }],
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: {
        organizationId: data.organizationId,
      },
      subscription_data: {
        metadata: {
          organizationId: data.organizationId,
        },
      },
    };

    if (data.trialDays && data.trialDays > 0) {
      sessionParams.subscription_data!.trial_period_days = data.trialDays;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return session.url;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return null;
  }
}

/**
 * Create customer portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string | null> {
  if (!stripe) return null;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  } catch (error) {
    console.error('Failed to create portal session:', error);
    return null;
  }
}

// ============================================
// Webhook Handlers
// ============================================

export type WebhookEvent = Stripe.Event;

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event | null {
  if (!stripe) return null;

  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Failed to verify webhook signature:', error);
    return null;
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  if (!isDatabaseAvailable()) {
    console.log('Database not available - skipping webhook processing');
    return;
  }

  try {
    switch (event.type) {
      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
    throw error;
  }
}

// Webhook handlers

async function handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
  const organizationId = customer.metadata?.organizationId;
  if (!organizationId) return;

  await prisma!.organization.update({
    where: { id: organizationId },
    data: { stripeCustomerId: customer.id },
  });
}

async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  const organizationId = customer.metadata?.organizationId;
  if (!organizationId) return;

  // Update any customer-related data if needed
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);

  // Get plan limits
  const planLimits = plan ? PLAN_LIMITS[plan] : null;

  // Update organization
  await prisma!.organization.update({
    where: { id: organizationId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan: plan ?? 'FREE',
      planStatus: subscription.status.toUpperCase(),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      maxCandidates: planLimits?.maxCandidates ?? 100,
      maxJobs: planLimits?.maxJobs ?? 5,
      maxUsers: planLimits?.maxUsers ?? 3,
    },
  });

  // Create or update subscription record
  await prisma!.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      organizationId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId ?? '',
      stripeProductId: subscription.items.data[0]?.price.product as string ?? '',
      stripeCustomerId: subscription.customer as string,
      status: subscription.status,
      plan: plan ?? 'FREE',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    },
    update: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) return;

  // Revert to free plan
  await prisma!.organization.update({
    where: { id: organizationId },
    data: {
      plan: 'FREE',
      planStatus: 'CANCELED',
      stripeSubscriptionId: null,
      stripePriceId: null,
      maxCandidates: 100,
      maxJobs: 5,
      maxUsers: 3,
    },
  });

  // Update subscription record
  await prisma!.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'canceled' },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  
  const organization = await prisma!.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!organization) return;

  // Create invoice record
  await prisma!.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      organizationId: organization.id,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: invoice.subscription as string ?? null,
      amount: (invoice.amount_paid ?? 0) / 100,
      currency: invoice.currency ?? 'usd',
      status: invoice.status ?? 'open',
      invoiceNumber: invoice.number ?? null,
      invoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
      paidAt: invoice.status === 'paid' ? new Date() : null,
    },
    update: {
      status: invoice.status ?? 'open',
      paidAt: invoice.status === 'paid' ? new Date() : null,
    },
  });

  // Update organization status
  if (organization.planStatus === 'PAST_DUE') {
    await prisma!.organization.update({
      where: { id: organization.id },
      data: { planStatus: 'ACTIVE' },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  
  const organization = await prisma!.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!organization) return;

  // Update organization status
  await prisma!.organization.update({
    where: { id: organization.id },
    data: { planStatus: 'PAST_DUE' },
  });

  // Create/update invoice record
  await prisma!.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      organizationId: organization.id,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: invoice.subscription as string ?? null,
      amount: (invoice.amount_due ?? 0) / 100,
      currency: invoice.currency ?? 'usd',
      status: 'open',
      invoiceNumber: invoice.number ?? null,
      invoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
    },
    update: {
      status: 'open',
    },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const organizationId = session.metadata?.organizationId;
  if (!organizationId) return;

  // The subscription webhook will handle the actual subscription creation
  // This is just for logging or additional processing
  console.log(`Checkout completed for organization: ${organizationId}`);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get plan from Stripe price ID
 */
export function getPlanFromPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;

  for (const [plan, id] of Object.entries(STRIPE_PRICES)) {
    if (id === priceId) {
      return plan as Plan;
    }
  }

  return null;
}

/**
 * Get Stripe price ID from plan
 */
export function getPriceIdFromPlan(plan: Plan): string | undefined {
  if (plan === 'FREE') return undefined;
  return STRIPE_PRICES[plan as keyof typeof STRIPE_PRICES];
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return stripe !== null;
}
