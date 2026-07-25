import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

async function getStripeCredentials(): Promise<{
  secretKey: string;
  webhookSecret?: string;
}> {
  // Primary: use environment secrets (set directly in Replit Secrets)
  const envSecretKey = process.env.STRIPE_SECRET_KEY;
  const envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (envSecretKey) {
    return { secretKey: envSecretKey, webhookSecret: envWebhookSecret };
  }

  // Fallback: try the Replit connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (hostname && xReplitToken) {
    const resp = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
      {
        headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (resp.ok) {
      const data = await resp.json();
      const settings = data.items?.[0]?.settings;
      const secretKey = settings?.secret_key ?? settings?.secret;
      if (secretKey) {
        return {
          secretKey,
          webhookSecret: settings.webhook_secret ?? settings.webhook_signing_secret,
        };
      }
    }
  }

  throw new Error(
    "Stripe secret key not found. Add STRIPE_SECRET_KEY to Replit Secrets.",
  );
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret ?? "",
  });
}
