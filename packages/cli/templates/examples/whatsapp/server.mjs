#!/usr/bin/env node
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { URL } from "node:url";

const port = Number(process.env.PORT || 8787);
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
const appSecret = process.env.WHATSAPP_APP_SECRET;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const clientpadApiBaseUrl = process.env.CLIENTPAD_PUBLIC_API_BASE_URL;
const clientpadApiKey = process.env.CLIENTPAD_API_KEY;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function isValidMetaSignature(rawBody, signatureHeader) {
  if (!appSecret) return true;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = Buffer.from(
    `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`,
    "utf8"
  );
  const received = Buffer.from(signatureHeader, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function createClientPadLead(message) {
  if (!clientpadApiBaseUrl || !clientpadApiKey) return;

  await fetch(new URL("/v1/leads", clientpadApiBaseUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${clientpadApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      source: "whatsapp",
      customer_phone: message.from,
      message_id: message.id,
      body: message.text?.body || message.button?.text || message.interactive?.button_reply?.title || "",
      raw: message,
    }),
  });
}

async function sendWhatsAppText(to, text) {
  if (!accessToken || !phoneNumberId) return;

  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

async function handleWebhookPost(request, response) {
  const rawBody = await readBody(request);
  if (!isValidMetaSignature(rawBody, request.headers["x-hub-signature-256"])) {
    sendJson(response, 401, { error: "Invalid Meta signature" });
    return;
  }

  const payload = JSON.parse(rawBody.toString("utf8") || "{}");
  const messages = payload.entry?.flatMap((entry) =>
    entry.changes?.flatMap((change) => change.value?.messages || []) || []
  ) || [];

  for (const message of messages) {
    await createClientPadLead(message);
    await sendWhatsAppText(
      message.from,
      "Thanks for your message. We received it and will follow up shortly."
    );
  }

  sendJson(response, 200, { ok: true, messages: messages.length });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/webhooks/whatsapp") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge") || "";

      if (mode === "subscribe" && token === verifyToken) {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end(challenge);
        return;
      }

      response.writeHead(403, { "content-type": "text/plain" });
      response.end("Forbidden");
      return;
    }

    if (request.method === "POST" && url.pathname === "/webhooks/whatsapp") {
      await handleWebhookPost(request, response);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => {
  console.log(`WhatsApp webhook server listening on http://localhost:${port}/webhooks/whatsapp`);
});
