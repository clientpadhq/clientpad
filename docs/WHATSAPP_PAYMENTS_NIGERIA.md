# WhatsApp Payments for Nigeria

ClientPad can create Nigerian payment links for WhatsApp commerce flows with Paystack or Flutterwave, persist the payment in PostgreSQL, and process provider webhooks that move the linked lead to the `paid` pipeline stage.

## Environment variables

Set the provider secret key for the checkout provider you enable:

```bash
PAYSTACK_SECRET_KEY=sk_live_or_test_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_live_or_test_key
```

Flutterwave webhook verification normally uses the webhook **secret hash** configured in the Flutterwave dashboard. Set it separately when available:

```bash
FLUTTERWAVE_WEBHOOK_SECRET=your_flutterwave_webhook_secret_hash
```

If `FLUTTERWAVE_WEBHOOK_SECRET` is omitted, ClientPad falls back to `FLUTTERWAVE_SECRET_KEY` so local tests can still verify deterministic webhook requests.

## Database migration

Run migrations after upgrading:

```bash
pnpm db:migrate
```

Migration `0004_whatsapp_payments.sql` adds:

- `payment_provider` enum: `paystack`, `flutterwave`
- `payment_status` enum: `pending`, `paid`, `failed`, `cancelled`
- `paid` lead status for the lead pipeline
- `payments` table keyed by `(provider, provider_reference)`

## WhatsApp flow payment action

A WhatsApp flow action can include a `payment` config with the provider, amount, currency, service item, and customer details. Currency defaults to `NGN` when omitted.

```ts
import { createStoredPaymentLink, type WhatsAppFlowAction } from "@abdulmuiz44/clientpad-whatsapp";

const action: WhatsAppFlowAction = {
  type: "payment",
  payment: {
    provider: "paystack",
    amount: 25000,
    currency: "NGN",
    serviceItemReference: "brand-identity-package",
    customer: {
      email: "ada@example.com",
      phone: "+2348012345678",
      name: "Ada Lovelace",
    },
    callbackUrl: "https://app.example.com/payments/complete",
  },
};

const payment = await createStoredPaymentLink({
  db,
  workspaceId: "workspace_uuid",
  leadId: "lead_uuid",
  reference: `cp_${crypto.randomUUID()}`,
  ...action.payment,
});

await sendWhatsAppText({
  to: action.payment.customer.phone!,
  body: `Please complete payment for ${action.payment.serviceItemReference}: ${payment.authorizationUrl}`,
});
```

Paystack receives the amount in kobo/subunits. Flutterwave receives the major-unit amount, matching Flutterwave Standard checkout.

## Webhook routes

Mount the ClientPad handler and configure optional callbacks for WhatsApp confirmations and review requests:

```ts
import { createClientPadHandler } from "@abdulmuiz44/clientpad-server";

const handler = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
  payments: {
    paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
    flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY,
    flutterwaveWebhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET,
    async sendWhatsAppMessage(payment) {
      await sendWhatsAppText({
        to: payment.phone,
        body: `Thanks ${payment.name}. We received ${payment.currency} ${payment.amount} for ${payment.serviceItemReference}.`,
      });
    },
    async triggerReviewRequest(payment) {
      await maybeSendReviewRequest(payment.leadId);
    },
  },
});
```

Configure these provider webhook URLs in the provider dashboards:

- `POST /payments/paystack/webhook`
- `POST /payments/flutterwave/webhook`

When a verified webhook maps to `paid`, ClientPad:

1. updates the matching payment record to `paid`,
2. stores the provider event payload,
3. updates the linked lead status to `paid`,
4. calls `sendWhatsAppMessage` if configured, and
5. calls `triggerReviewRequest` if configured.

## Status mapping

`mapProviderPaymentStatus` normalizes provider statuses:

| Provider | Provider status/event | ClientPad status |
| --- | --- | --- |
| Paystack | `success` or `charge.success` | `paid` |
| Paystack | `failed`, `reversed`, `abandoned` | `failed` |
| Flutterwave | `successful`, `success`, `completed`, or `charge.completed` | `paid` |
| Flutterwave | `failed`, `error` | `failed` |
| Flutterwave | `cancelled`, `canceled` | `cancelled` |
| Either | anything else | `pending` |

## Provider notes

- Paystack link generation uses `POST https://api.paystack.co/transaction/initialize` with `Authorization: Bearer PAYSTACK_SECRET_KEY`.
- Flutterwave link generation uses `POST https://api.flutterwave.com/v3/payments` with `Authorization: Bearer FLUTTERWAVE_SECRET_KEY`.
- Both providers require `customer.email` for hosted checkout. Keep collecting phone and name so WhatsApp confirmations can be personalized.
