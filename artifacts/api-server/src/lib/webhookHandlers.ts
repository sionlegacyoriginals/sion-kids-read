import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// Maps Stripe product names → gift card tier keys
const GIFT_CARD_TIERS: Record<string, string> = {
  "Gift Card – One Story":      "one_story",
  "Gift Card – One Month":      "one_month",
  "Gift Card – Six Months":     "six_months",
  "Gift Card – Twelve Months":  "twelve_months",
  "Gift Card – Hardcover Book": "hardcover_book",
};

function generateGiftCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes O, 0, I, 1
  const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `SLO-${rand}`;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    // Parse event before processWebhook (Buffer is not consumed, parsing is safe)
    let event: any;
    try {
      event = JSON.parse(payload.toString());
    } catch {
      throw new Error("Invalid webhook payload: not valid JSON");
    }

    // Sync stripe data to local postgres stripe schema
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Business logic hooks
    if (event.type === "checkout.session.completed") {
      await WebhookHandlers.handleCheckoutCompleted(event.data.object);
    }

    if (event.type === "customer.subscription.deleted") {
      console.log("Subscription cancelled:", event.data.object.id);
    }
  }

  private static async handleCheckoutCompleted(session: any): Promise<void> {
    try {
      // $1 story credit purchase
      if (session.mode === "payment" && session.metadata?.type === "story_credit") {
        const clerkUserId = session.metadata?.clerkUserId;
        if (clerkUserId) {
          await db.execute(sql`
            UPDATE users
            SET story_credits = story_credits + 1, updated_at = NOW()
            WHERE id = ${clerkUserId}
          `);
          console.log(`Story credit added for user ${clerkUserId}`);
        }
        return;
      }

      if (session.mode === "payment" && session.metadata?.orderId) {
        const orderId = parseInt(session.metadata.orderId, 10);

        await db.execute(sql`
          UPDATE print_orders
          SET status = 'paid',
              stripe_payment_intent_id = ${session.payment_intent ?? null},
              updated_at = NOW()
          WHERE id = ${orderId}
        `);

        // Trigger Lulu fulfillment if credentials are configured
        const luluKey = process.env.LULU_CLIENT_KEY;
        const luluSecret = process.env.LULU_CLIENT_SECRET;
        if (luluKey && luluSecret) {
          const { triggerLuluOrder } = await import("./luluService");
          triggerLuluOrder(orderId).catch((err: Error) => {
            console.error(`Lulu trigger failed for order ${orderId}:`, err.message);
          });
        } else {
          console.log(
            `Order ${orderId} paid. Set LULU_CLIENT_KEY + LULU_CLIENT_SECRET to enable automatic fulfillment.`,
          );
        }
      }
      // ── Gift card purchase via Payment Link ────────────────────────────────
      // Payment Links don't carry our custom metadata, so detect by product name.
      if (session.mode === "payment" && !session.metadata?.type && !session.metadata?.orderId) {
        try {
          const stripe = await getUncachableStripeClient();
          const full = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["line_items.data.price.product"],
          });
          const lineItems = full.line_items?.data ?? [];
          for (const item of lineItems) {
            const product = (item.price as any)?.product as any;
            const productName: string = product?.name ?? "";
            const tier = GIFT_CARD_TIERS[productName];
            if (tier) {
              // Generate a unique code (retry on collision)
              let code = generateGiftCode();
              for (let attempt = 0; attempt < 5; attempt++) {
                const existing = await db.execute(sql`SELECT code FROM gift_card_codes WHERE code = ${code}`);
                if (existing.rows.length === 0) break;
                code = generateGiftCode();
              }
              const buyerEmail = full.customer_details?.email ?? null;
              await db.execute(sql`
                INSERT INTO gift_card_codes (code, tier, stripe_session_id, buyer_email)
                VALUES (${code}, ${tier}, ${session.id}, ${buyerEmail})
              `);
              console.log(`Gift card created: ${code} (${tier}) for ${buyerEmail ?? "unknown"}`);
              break;
            }
          }
        } catch (giftErr: any) {
          console.error("Gift card webhook error:", giftErr.message);
        }
      }

      // subscription mode: stripe-replit-sync handles syncing automatically
    } catch (err) {
      console.error("handleCheckoutCompleted error:", err);
    }
  }
}
