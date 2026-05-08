import { ClientPad } from "@abdulmuiz44/clientpad-sdk";

const clientpad = new ClientPad({
  baseUrl: process.env.CLIENTPAD_API_URL ?? "https://api.clientpad.com/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY,
});

const usage = await clientpad.usage.retrieve();
console.log(usage.data);
