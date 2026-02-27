import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Use service role client — webhook has no user auth context
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      if (!subscriptionId) break;

      // Fetch subscription to get interval details
      const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as Stripe.Subscription;
      const priceItem = subscription.items.data[0]?.price;
      const interval = priceItem?.recurring?.interval;
      const intervalCount = priceItem?.recurring?.interval_count ?? 1;

      let plan = "monthly";
      if (interval === "year") plan = "yearly";
      else if (interval === "month" && intervalCount === 3) plan = "quarterly";

      // Find user by metadata or stripe_customer_id
      const metaUserId = subscription.metadata?.supabase_user_id;
      let targetUserId = metaUserId;

      if (!targetUserId) {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        targetUserId = data?.id;
      }

      if (targetUserId) {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_plan: plan,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            subscription_ends_at: new Date(
              (subscription as unknown as { current_period_end: number }).current_period_end * 1000
            ).toISOString(),
          })
          .eq("id", targetUserId);
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string | null;
      if (!subscriptionId) break;

      const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as Stripe.Subscription;
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      if (data?.id) {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_ends_at: new Date(
              (subscription as unknown as { current_period_end: number }).current_period_end * 1000
            ).toISOString(),
          })
          .eq("id", data.id);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string | null;
      if (!subscriptionId) break;

      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      if (data?.id) {
        await supabase
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("id", data.id);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (data?.id) {
        const stripeStatus = subscription.status;
        let status: string;
        if (stripeStatus === "active") status = "active";
        else if (stripeStatus === "past_due") status = "past_due";
        else if (stripeStatus === "canceled") status = "canceled";
        else status = stripeStatus;

        await supabase
          .from("profiles")
          .update({
            subscription_status: status,
            subscription_ends_at: new Date(
              (subscription as unknown as { current_period_end: number }).current_period_end * 1000
            ).toISOString(),
          })
          .eq("id", data.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (data?.id) {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "expired",
            stripe_subscription_id: null,
            subscription_plan: null,
          })
          .eq("id", data.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
