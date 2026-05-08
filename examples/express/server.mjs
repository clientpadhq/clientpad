import express from "express";
import { createClientPadHandler } from "@abdulmuiz44/clientpad-server";

const app = express();
const clientpad = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL,
  apiKeyPepper: process.env.API_KEY_PEPPER,
});

app.use("/api/public/v1", async (req, res) => {
  const url = new URL(req.originalUrl, `${req.protocol}://${req.get("host")}`);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  const response = await clientpad(
    new Request(url, {
      method: req.method,
      headers: req.headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
      duplex: "half",
    })
  );

  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(Buffer.from(await response.arrayBuffer()));
});

app.listen(process.env.PORT ?? 3000);
