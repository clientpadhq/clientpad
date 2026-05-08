import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  createPaymentLink,
  createStoredPaymentLink,
  mapProviderPaymentStatus,
  verifyPaymentWebhook,
} from "../dist/index.js";

const fetchCalls = [];
const fetchImpl = async (url, init) => {
  fetchCalls.push({ url, init: { ...init, body: JSON.parse(init.body) } });
  if (String(url).includes("paystack")) {
    return Response.json({
      status: true,
      data: {
        authorization_url: "https://checkout.paystack.com/test",
        access_code: "access_1",
        reference: "ref_1",
      },
    });
  }
  return Response.json({
    status: "success",
    data: {
      link: "https://checkout.flutterwave.com/test",
      id: 123,
    },
  });
};

const paystackLink = await createPaymentLink({
  provider: "paystack",
  amount: 5000,
  currency: undefined,
  serviceItemReference: "logo-design",
  customer: { email: "ada@example.com", phone: "+234801", name: "Ada" },
  reference: "ref_1",
  secretKey: "sk_test",
  fetchImpl,
});
assert.equal(paystackLink.authorizationUrl, "https://checkout.paystack.com/test");
assert.equal(fetchCalls[0].url, "https://api.paystack.co/transaction/initialize");
assert.equal(fetchCalls[0].init.body.amount, 500000);
assert.equal(fetchCalls[0].init.body.currency, "NGN");

const flutterwaveLink = await createPaymentLink({
  provider: "flutterwave",
  amount: 5000,
  serviceItemReference: "logo-design",
  customer: { email: "ada@example.com", phone: "+234801", name: "Ada" },
  reference: "flw_1",
  secretKey: "FLWSECK_TEST",
  fetchImpl,
});
assert.equal(flutterwaveLink.authorizationUrl, "https://checkout.flutterwave.com/test");
assert.equal(fetchCalls[1].url, "https://api.flutterwave.com/v3/payments");
assert.equal(fetchCalls[1].init.body.currency, "NGN");

const inserts = [];
const db = {
  async query(text, values) {
    inserts.push({ text, values });
    return { rows: [{ id: "payment_1" }], rowCount: 1 };
  },
};
const stored = await createStoredPaymentLink({
  db,
  workspaceId: "workspace_1",
  leadId: "lead_1",
  provider: "flutterwave",
  amount: 5000,
  serviceItemReference: "logo-design",
  customer: { email: "ada@example.com", phone: "+234801", name: "Ada" },
  reference: "flw_2",
  secretKey: "FLWSECK_TEST",
  fetchImpl,
});
assert.equal(stored.paymentId, "payment_1");
assert.equal(inserts[0].values[6], "NGN");

assert.equal(mapProviderPaymentStatus({ provider: "paystack", status: "success" }), "paid");
assert.equal(mapProviderPaymentStatus({ provider: "flutterwave", status: "cancelled" }), "cancelled");

const paystackRaw = JSON.stringify({ event: "charge.success", data: { status: "success", reference: "ref_1", amount: 500000, currency: "NGN", customer: { email: "ada@example.com" } } });
const paystackSignature = createHmac("sha512", "sk_test").update(paystackRaw).digest("hex");
const paystackWebhook = verifyPaymentWebhook({
  provider: "paystack",
  rawBody: paystackRaw,
  headers: { "x-paystack-signature": paystackSignature },
  secretKey: "sk_test",
});
assert.equal(paystackWebhook.verified, true);
assert.equal(paystackWebhook.status, "paid");
assert.equal(paystackWebhook.reference, "ref_1");

const flutterwaveWebhook = verifyPaymentWebhook({
  provider: "flutterwave",
  rawBody: JSON.stringify({ event: "charge.completed", data: { status: "successful", tx_ref: "flw_1", amount: 5000, currency: "NGN", customer: { email: "ada@example.com", name: "Ada" } } }),
  headers: { "verif-hash": "webhook_secret" },
  webhookSecret: "webhook_secret",
});
assert.equal(flutterwaveWebhook.verified, true);
assert.equal(flutterwaveWebhook.status, "paid");
assert.equal(flutterwaveWebhook.reference, "flw_1");
