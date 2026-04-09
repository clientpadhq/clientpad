export function normalizeNigerianPhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0") && digits.length === 11) return `234${digits.slice(1)}`;
  if (digits.startsWith("234") && digits.length >= 13) return digits;
  if (digits.length === 10) return `234${digits}`;
  return digits;
}

export function buildWhatsAppShareUrl(message: string, phone?: string | null) {
  const normalized = normalizeNigerianPhone(phone);
  const text = encodeURIComponent(message);
  if (normalized) return `https://wa.me/${normalized}?text=${text}`;
  return `https://wa.me/?text=${text}`;
}
