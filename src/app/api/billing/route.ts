// ============================================
// Billing API Routes
// Checkout, Portal, and Subscription Management
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/rbac';
import {
  createCheckoutSession,
  createPortalSession,
  getOrCreateStripeCustomer,
  cancelStripeSubscription,
  reactivateStripeSubscription,
  updateStripeSubscriptionPlan,
  getPriceIdFromPlan,
  isStripeConfigured,
} from '@/lib/billing/stripe';
import { PLAN_LIMITS } from '@/lib/subscription/limits';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import type { Plan } from '@/types';

// ============================================
// GET /api/billing - Get billing info
// ============================================

export async function GET() {
  const authResult = await requireAuth();
  
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return NextResponse.json({
      success: true,
      data: {
        isStripeConfigured: false,
        plans: PLAN_LIMITS,
        currentPlan: 'FREE',
        planStatus: 'ACTIVE',
        customerId: null,
        subscriptionId: null,
      },
    });
  }

  if (!isDatabaseAvailable() || !user.organizationId) {
    return NextResponse.json({
      success: true,
      data: {
        isStripeConfigured: true,
        plans: PLAN_LIMITS,
        currentPlan: 'FREE',
        planStatus: 'ACTIVE',
        customerId: null,
        subscriptionId: null,
      },
    });
  }

  try {
    const organization = await prisma!.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        isStripeConfigured: true,
        plans: PLAN_LIMITS,
        currentPlan: organization.plan,
        planStatus: organization.planStatus,
        customerId: organization.stripeCustomerId,
        subscriptionId: organization.stripeSubscriptionId,
        currentPeriodStart: organization.currentPeriodStart,
        currentPeriodEnd: organization.currentPeriodEnd,
        invoices: organization.invoices,
        subscription: organization.subscriptions[0] || null,
      },
    });
  } catch (error) {
    console.error('Failed to get billing info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get billing info' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/billing - Create checkout session
// ============================================

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Billing is not configured' },
      { status: 400 }
    );
  }

  if (!isDatabaseAvailable() || !user.organizationId) {
    return NextResponse.json(
      { success: false, error: 'Organization not found' },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const { action, plan, priceId } = body;

    // Get organization
    const organization = await prisma!.organization.findUnique({
      where: { id: user.organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      organization.id,
      user.email,
      organization.name
    );

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Failed to create customer' },
        { status: 500 }
      );
    }

    switch (action) {
      case 'checkout': {
        // Create checkout session
        const targetPriceId = priceId || getPriceIdFromPlan(plan as Plan);
        
        if (!targetPriceId) {
          return NextResponse.json(
            { success: false, error: 'Invalid plan' },
            { status: 400 }
          );
        }

        const checkoutUrl = await createCheckoutSession({
          customerId,
          priceId: targetPriceId,
          organizationId: organization.id,
          successUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/settings?billing=success`,
          cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/settings?billing=canceled`,
        });

        if (!checkoutUrl) {
          return NextResponse.json(
            { success: false, error: 'Failed to create checkout session' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: { checkoutUrl },
        });
      }

      case 'portal': {
        // Create customer portal session
        const portalUrl = await createPortalSession(
          customerId,
          `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/settings`
        );

        if (!portalUrl) {
          return NextResponse.json(
            { success: false, error: 'Failed to create portal session' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: { portalUrl },
        });
      }

      case 'cancel': {
        // Cancel subscription
        if (!organization.stripeSubscriptionId) {
          return NextResponse.json(
            { success: false, error: 'No active subscription' },
            { status: 400 }
          );
        }

        const result = await cancelStripeSubscription(organization.stripeSubscriptionId);

        if (!result) {
          return NextResponse.json(
            { success: false, error: 'Failed to cancel subscription' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: { 
            message: 'Subscription will be canceled at the end of the billing period',
            cancelAtPeriodEnd: result.cancel_at_period_end,
          },
        });
      }

      case 'reactivate': {
        // Reactivate canceled subscription
        if (!organization.stripeSubscriptionId) {
          return NextResponse.json(
            { success: false, error: 'No subscription to reactivate' },
            { status: 400 }
          );
        }

        const result = await reactivateStripeSubscription(organization.stripeSubscriptionId);

        if (!result) {
          return NextResponse.json(
            { success: false, error: 'Failed to reactivate subscription' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Subscription reactivated' },
        });
      }

      case 'upgrade':
      case 'downgrade': {
        // Change plan
        const targetPriceId = priceId || getPriceIdFromPlan(plan as Plan);
        
        if (!targetPriceId || !organization.stripeSubscriptionId) {
          return NextResponse.json(
            { success: false, error: 'Invalid plan or no active subscription' },
            { status: 400 }
          );
        }

        const result = await updateStripeSubscriptionPlan(
          organization.stripeSubscriptionId,
          targetPriceId
        );

        if (!result) {
          return NextResponse.json(
            { success: false, error: 'Failed to update subscription' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: { message: `Plan ${action}d successfully` },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Billing operation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Billing operation failed' },
      { status: 500 }
    );
  }
}
