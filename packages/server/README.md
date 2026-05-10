# ClientPad Server

Fetch-standard server handlers for ClientPad public APIs.

## Install

```bash
pnpm add @clientpad/server
```

Install the optional WhatsApp package when you want the same handler to receive Meta WhatsApp Cloud API webhooks:

```bash
pnpm add @clientpad/whatsapp
```

## Basic Usage

```ts
import { createClientPadHandler } from "@clientpad/server";

export const handler = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
});
```

The handler accepts a standard `Request` and returns a standard `Response`.

## Next.js Route Handler

```ts
import { createClientPadHandler } from "@clientpad/server";

const handler = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
});

export const GET = handler;
export const POST = handler;
```

Mount it under routes that forward to:

```text
/api/public/v1/leads
/api/public/v1/clients
/api/public/v1/usage
```

## WhatsApp Webhooks

Add the optional `whatsapp` config to enable `GET /whatsapp/webhook` for Meta verification and `POST /whatsapp/webhook` for inbound WhatsApp Cloud API messages. Full public API paths also work, so `/api/public/v1/whatsapp/webhook` is equivalent.

```ts
import { createClientPadHandler } from "@clientpad/server";

export const handler = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    clientpadBaseUrl: "https://your-app.com/api/public/v1",
    clientpadApiKey: process.env.CLIENTPAD_API_KEY!,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    defaultCountryCode: "+234",
    flow: {
      // Service/business pipeline flow config consumed by @clientpad/whatsapp.
    },
  },
});
```

When `appSecret` is set, the server validates Meta's `X-Hub-Signature-256` HMAC before dispatching the webhook. The WhatsApp integration normalizes inbound phone numbers to `+234` by default, upserts ClientPad-compatible leads, stores raw messages in the WhatsApp tables, maps button/list replies to pipeline updates, and sends native WhatsApp interactive responses.

### Express example

```ts
import express from "express";
import { createClientPadHandler } from "@clientpad/server";

const app = express();
const clientpad = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    clientpadBaseUrl: "https://your-app.com/api/public/v1",
    clientpadApiKey: process.env.CLIENTPAD_API_KEY!,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    defaultCountryCode: "+234",
  },
});

app.all(["/api/public/v1/*path", "/whatsapp/webhook"], async (req, res) => {
  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : req;
  const response = await clientpad(new Request(url, { method: req.method, headers: req.headers as HeadersInit, body }));

  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(Buffer.from(await response.arrayBuffer()));
});
```

### Hono example

```ts
import { Hono } from "hono";
import { createClientPadHandler } from "@clientpad/server";

const app = new Hono();
const clientpad = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    clientpadBaseUrl: "https://your-app.com/api/public/v1",
    clientpadApiKey: process.env.CLIENTPAD_API_KEY!,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    defaultCountryCode: "+234",
  },
});

app.all("/api/public/v1/*", (c) => clientpad(c.req.raw));
app.all("/whatsapp/webhook", (c) => clientpad(c.req.raw));
```

## Supported Routes

- `GET /leads`
- `POST /leads`
- `GET /clients`
- `POST /clients`
- `GET /usage`
- `GET /whatsapp/webhook` when WhatsApp is configured
- `POST /whatsapp/webhook` when WhatsApp is configured

The handler also accepts full public API paths such as `/api/public/v1/leads`.

## Usage Metering

The server records API key usage in PostgreSQL and enforces optional limits:

- `monthly_request_limit`
- `rate_limit_per_minute`
- `billing_mode`

Leaving limits empty keeps self-hosted deployments unlimited. Hosted ClientPad Cloud deployments can set limits on API keys and return `429` when a key exceeds quota.
