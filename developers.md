# ClientPad for Developers

Install ClientPad into your app and use API keys as the gateway for real business workflows.

## Install

```bash
pnpm add @clientpad/sdk
pnpm add @clientpad/core @clientpad/server
pnpm add -D @clientpad/cli
```

## SDK

```ts
import { ClientPad } from "@clientpad/sdk";

const clientpad = new ClientPad({
  baseUrl: "https://api.clientpad.xyz/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});
```

## Build paths

- Use `@clientpad/sdk` from apps and scripts.
- Use `@clientpad/server` to expose the public API.
- Use `@clientpad/whatsapp` to turn WhatsApp messages into client operations.
- Use `@clientpad/cloud` and `@clientpad/dashboard` for hosted operator workflows.
