import { Hono } from "hono";
import { createClientPadHandler } from "@abdulmuiz44/clientpad-server";

const app = new Hono();
const clientpad = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
});

app.all("/api/public/v1/*", (context) => clientpad(context.req.raw));

export default app;
