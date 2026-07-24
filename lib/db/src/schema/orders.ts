import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const printOrdersTable = pgTable("print_orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  storyId: integer("story_id"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  shippingAddress: jsonb("shipping_address").notNull(),
  luluJobId: text("lulu_job_id"),
  quantity: integer("quantity").notNull().default(1),
  amountCents: integer("amount_cents"),
  currency: text("currency").default("usd"),
  /**
   * Lifecycle: pending_payment → paid → sent_to_lulu → in_production → shipped → delivered
   */
  status: text("status").notNull().default("pending_payment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type PrintOrder = typeof printOrdersTable.$inferSelect;
