import assert from "node:assert/strict";
import { ClientPad, ClientPadError } from "../dist/index.js";

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

const calls = [];
const fakeFetch = async (url, init) => {
  calls.push({ url: String(url), init });

  if (String(url).includes("/fail")) {
    return jsonResponse({ error: { message: "Nope" } }, { status: 400 });
  }

  if (String(url).includes("/leads") && init?.method === "POST") {
    return jsonResponse({ data: { id: "lead_1" } }, { status: 201 });
  }

  if (String(url).includes("/clients") && init?.method === "POST") {
    return jsonResponse({ data: { id: "client_1" } }, { status: 201 });
  }

  return jsonResponse({ data: [], pagination: { limit: 10, offset: 5 } });
};

const clientpad = new ClientPad({
  baseUrl: "https://example.com/api/public/v1/",
  apiKey: "cp_test_key",
  fetch: fakeFetch,
});

await clientpad.leads.list({
  limit: 10,
  offset: 5,
  status: "new",
});

assert.equal(calls[0].url, "https://example.com/api/public/v1/leads?limit=10&offset=5&status=new");
assert.equal(calls[0].init.headers.get("authorization"), "Bearer cp_test_key");

await clientpad.clients.list({
  q: "",
  limit: null,
  offset: 0,
});

assert.equal(calls[1].url, "https://example.com/api/public/v1/clients?offset=0");

await clientpad.leads.create({
  name: "Ada Customer",
  phone: "+234...",
});

assert.equal(calls[2].init.method, "POST");
assert.equal(calls[2].init.headers.get("content-type"), "application/json");
assert.deepEqual(JSON.parse(calls[2].init.body), {
  name: "Ada Customer",
  phone: "+234...",
});

const failing = new ClientPad({
  baseUrl: "https://example.com/api/public/v1/fail",
  apiKey: "cp_test_key",
  fetch: fakeFetch,
});

await assert.rejects(() => failing.leads.list(), (error) => {
  assert.equal(error instanceof ClientPadError, true);
  assert.equal(error.status, 400);
  assert.equal(error.message, "Nope");
  return true;
});
