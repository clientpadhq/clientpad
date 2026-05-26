import { createClientPadCloudHandler } from "@clientpad/cloud";
import { createClientPadHandler } from "@clientpad/server";

const getEnv = (name) => {
  const fromNetlify = globalThis.Netlify?.env?.get?.(name);
  if (typeof fromNetlify === "string" && fromNetlify.trim()) return fromNetlify.trim();
  const fromProcess = typeof process !== "undefined" ? process.env?.[name] : "";
  if (typeof fromProcess === "string" && fromProcess.trim()) return fromProcess.trim();
  return "";
};

const runtimeConfig = {
  databaseUrl: getEnv("DATABASE_URL"),
  apiKeyPepper: getEnv("API_KEY_PEPPER"),
  adminToken: getEnv("CLIENTPAD_CLOUD_ADMIN_TOKEN"),
};

const missingConfig = Object.entries(runtimeConfig)
  .filter(([, value]) => typeof value !== "string" || !value.trim())
  .map(([key]) => key);

const hasRuntimeConfig = missingConfig.length === 0;

const cloudHandler = hasRuntimeConfig
  ? createClientPadCloudHandler({
      databaseUrl: runtimeConfig.databaseUrl,
      apiKeyPepper: runtimeConfig.apiKeyPepper,
      adminToken: runtimeConfig.adminToken,
    })
  : null;

const publicHandler = hasRuntimeConfig
  ? createClientPadHandler({
      databaseUrl: runtimeConfig.databaseUrl,
      apiKeyPepper: runtimeConfig.apiKeyPepper,
    })
  : null;

const routes = [
  "/",
  "/health",
  "/readiness",
  "/api/cloud/v1",
  "/api/cloud/v1/*",
  "/api/public/v1",
  "/api/public/v1/*",
];

async function checkReadiness(request) {
  if (!hasRuntimeConfig) {
    return Response.json(
      {
        status: "configuration_required",
        service: "@clientpad/api-host",
        configured: false,
        missing: missingConfig,
        checks: {
          cloudHealth: { ok: false, status: 503, detail: "Runtime configuration missing" },
          cloudAuthStatus: { ok: false, status: 503, detail: "Runtime configuration missing" },
          publicGateway: { ok: false, status: 503, detail: "Runtime configuration missing" },
        },
        time: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const authHeader = request.headers.get("authorization");

  const cloudHealthReq = new Request(`${origin}/api/cloud/v1/health`, { method: "GET" });
  const cloudAuthReq = new Request(`${origin}/api/cloud/v1/auth/status`, { method: "GET" });
  const publicHeaders = new Headers();
  if (authHeader) publicHeaders.set("authorization", authHeader);
  const publicUsageReq = new Request(`${origin}/api/public/v1/usage`, {
    method: "GET",
    headers: publicHeaders,
  });

  const [cloudHealthRes, cloudAuthRes, publicUsageRes] = await Promise.all([
    cloudHandler(cloudHealthReq),
    cloudHandler(cloudAuthReq),
    publicHandler(publicUsageReq),
  ]);

  const cloudHealthOk = cloudHealthRes.status === 200;
  const cloudAuthOk = cloudAuthRes.status === 200;
  const publicGatewayOk = authHeader
    ? publicUsageRes.status < 500
    : publicUsageRes.status === 401 || publicUsageRes.status === 403;
  const ready = cloudHealthOk && cloudAuthOk && publicGatewayOk;

  return Response.json(
    {
      status: ready ? "ok" : "degraded",
      service: "@clientpad/api-host",
      configured: true,
      missing: [],
      checks: {
        cloudHealth: {
          ok: cloudHealthOk,
          status: cloudHealthRes.status,
          detail: cloudHealthOk ? "Cloud API health endpoint responded" : "Cloud API health check failed",
        },
        cloudAuthStatus: {
          ok: cloudAuthOk,
          status: cloudAuthRes.status,
          detail: cloudAuthOk ? "Cloud auth status endpoint responded" : "Cloud auth status check failed",
        },
        publicGateway: {
          ok: publicGatewayOk,
          status: publicUsageRes.status,
          detail: publicGatewayOk
            ? authHeader
              ? "Public API responded with authorization header"
              : "Public API correctly requires an API key"
            : "Public API usage route returned an unexpected response",
        },
      },
      time: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 }
  );
}

export default async function handler(request) {
  const url = new URL(request.url);

  if (url.pathname === "/" || url.pathname === "/health") {
    return Response.json({
      status: hasRuntimeConfig ? "ok" : "configuration_required",
      service: "@clientpad/api-host",
      configured: hasRuntimeConfig,
      missing: missingConfig,
      routes: {
        cloud: "/api/cloud/v1",
        public: "/api/public/v1",
      },
      time: new Date().toISOString(),
    });
  }

  if (url.pathname === "/readiness") {
    return checkReadiness(request);
  }

  if (url.pathname.startsWith("/api/cloud/v1")) {
    if (!cloudHandler) {
      return Response.json(
        {
          status: "configuration_required",
          service: "@clientpad/api-host",
          missing: missingConfig,
          message: "Cloud API is not configured yet.",
        },
        { status: 503 }
      );
    }
    return cloudHandler(request);
  }

  if (url.pathname.startsWith("/api/public/v1")) {
    if (!publicHandler) {
      return Response.json(
        {
          status: "configuration_required",
          service: "@clientpad/api-host",
          missing: missingConfig,
          message: "Public API is not configured yet.",
        },
        { status: 503 }
      );
    }
    return publicHandler(request);
  }

  return new Response("Not Found", { status: 404 });
}

export const config = {
  path: routes,
  preferStatic: false,
};
