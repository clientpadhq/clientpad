import { Readable, Writable } from "node:stream";
import { createServer } from "node:http";
import handler from "./index.mjs";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

function toRequest(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || "localhost";
  const url = `${proto}://${host}${req.url || "/"}`;
  const method = req.method || "GET";
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === "undefined") continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
      continue;
    }
    headers.set(name, value);
  }

  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers });
  }

  return new Request(url, {
    method,
    headers,
    body: Readable.toWeb(req),
    duplex: "half",
  });
}

async function writeResponse(nodeRes, webRes) {
  nodeRes.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    nodeRes.setHeader(key, value);
  });

  if (!webRes.body) {
    nodeRes.end();
    return;
  }

  await webRes.body.pipeTo(Writable.toWeb(nodeRes));
}

const server = createServer(async (req, res) => {
  try {
    const request = toRequest(req);
    const response = await handler(request);
    await writeResponse(res, response);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        status: "error",
        message: error instanceof Error ? error.message : "Unhandled API host error",
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`ClientPad API host (Render) listening on port ${PORT}`);
});
