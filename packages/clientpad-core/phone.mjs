export function normalizeNigerianPhoneNumber(input) {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const hasInternationalPrefix = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  let nationalNumber = null;
  if (hasInternationalPrefix) {
    if (!digits.startsWith("234")) return null;
    nationalNumber = digits.slice(3);
  } else if (digits.startsWith("234")) {
    nationalNumber = digits.slice(3);
  } else if (digits.startsWith("0")) {
    nationalNumber = digits.slice(1);
  } else {
    nationalNumber = digits;
  }

  if (!/^\d{10}$/.test(nationalNumber)) return null;
  return `+234${nationalNumber}`;
}
