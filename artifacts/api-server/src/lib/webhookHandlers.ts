import { getStripeSync } from "./stripeClient";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

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
      // subscription mode: stripe-replit-sync handles syncing automatically
    } catch (err) {
      console.error("handleCheckoutCompleted error:", err);
    }
  }
}
