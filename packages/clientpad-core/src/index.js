export const CLIENTPAD_CORE_PACKAGE_NAME = "@abdulmuiz44/clientpad-core";
export const CLIENTPAD_APP_NAME = "ClientPad";
export function getClientPadCoreInfo() {
    return {
        packageName: CLIENTPAD_CORE_PACKAGE_NAME,
        appName: CLIENTPAD_APP_NAME,
    };
}
export const LEAD_STATUSES = ["new", "contacted", "qualified", "unqualified", "paid"];
export const PIPELINE_STAGES = [
    "new_lead",
    "quoted",
    "booked",
    "in_progress",
    "completed",
    "paid",
    "review_requested",
];
export const API_SCOPES = [
    "leads:read",
    "leads:write",
    "clients:read",
    "clients:write",
    "deals:read",
    "deals:write",
    "quotes:read",
    "quotes:write",
    "invoices:read",
    "invoices:write",
    "jobs:read",
    "jobs:write",
    "tasks:read",
    "tasks:write",
    "reports:read",
    "usage:read",
    "whatsapp:read",
    "whatsapp:write",
    "services:read",
    "services:write",
    "bookings:read",
    "bookings:write",
    "payments:read",
    "payments:write",
    "reviews:write",
];
export function normalizeBaseUrl(baseUrl) {
    return baseUrl.trim().replace(/\/+$/, "");
}
export function buildUrl(baseUrl, path, query) {
    const url = new URL(`${normalizeBaseUrl(baseUrl)}/${path.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value === undefined || value === null || value === "")
            continue;
        url.searchParams.set(key, String(value));
    }
    return url.toString();
}
export function isLeadStatus(value) {
    return LEAD_STATUSES.includes(value);
}
export function isPipelineStage(value) {
    return PIPELINE_STAGES.includes(value);
}
export function normalizeNigerianPhoneNumber(phone) {
    const compactPhone = phone.trim().replace(/[\s().-]+/g, "");
    if (compactPhone.startsWith("+234"))
        return compactPhone;
    if (compactPhone.startsWith("00234"))
        return `+${compactPhone.slice(2)}`;
    if (compactPhone.startsWith("234"))
        return `+${compactPhone}`;
    if (compactPhone.startsWith("0"))
        return `+234${compactPhone.slice(1)}`;
    return compactPhone;
}
export function getPublicPrefix(rawKey) {
    const parts = rawKey.split("_");
    if (parts.length < 4 || parts[0] !== "cp")
        return null;
    if (parts[1] !== "live" && parts[1] !== "test")
        return null;
    return parts[2] || null;
}
export function parseBearerToken(header) {
    const [scheme, token] = (header ?? "").split(" ");
    if (scheme.toLowerCase() !== "bearer" || !token)
        return null;
    return token.trim();
}
//# sourceMappingURL=index.js.map