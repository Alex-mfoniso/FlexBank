import { ProviderInvalidAccountError } from "../provider.errors";

/**
 * Normalizes and validates a Kenyan phone number into Safaricom Daraja's required format: 2547XXXXXXXX or 2541XXXXXXXX (12 digits).
 *
 * Supported user formats:
 * - Local with leading zero: "0712345678", "0112345678"
 * - International with plus: "+254712345678", "+254 712 345 678"
 * - International without plus: "254712345678"
 * - 9-digit format: "712345678", "112345678"
 * - Formatted with hyphens/spaces: "0712-345-678", "(0712) 345678"
 */
export function normalizeKenyanPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== "string") {
    throw new ProviderInvalidAccountError(
      "mpesa",
      "Phone number is required for Kenyan mobile money transfer",
    );
  }

  // Strip all non-digit characters (spaces, +, -, parens, dots)
  const cleaned = phone.replace(/\D/g, "");

  let normalized = cleaned;

  // Handle 10-digit local format: "07XXXXXXXX" or "01XXXXXXXX"
  if (cleaned.length === 10 && cleaned.startsWith("0")) {
    normalized = "254" + cleaned.slice(1);
  }
  // Handle 9-digit format: "7XXXXXXXX" or "1XXXXXXXX"
  else if (cleaned.length === 9 && (cleaned.startsWith("7") || cleaned.startsWith("1"))) {
    normalized = "254" + cleaned;
  }
  // Handle 12-digit format already starting with 254
  else if (cleaned.length === 12 && cleaned.startsWith("254")) {
    normalized = cleaned;
  }

  // Validate final format: Must start with 254 followed by 7 or 1, and 8 additional digits (12 digits total)
  const KENYAN_MOBILE_REGEX = /^254(7\d{8}|1\d{8})$/;
  if (!KENYAN_MOBILE_REGEX.test(normalized)) {
    throw new ProviderInvalidAccountError(
      "mpesa",
      `Invalid Kenyan mobile number: '${phone}'. Must be a valid Kenyan mobile number (e.g. 0712345678 or 254712345678).`,
    );
  }

  return normalized;
}

/**
 * Masks a phone number for secure logging: "254712345678" -> "2547****5678"
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return "******";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 8) return "******";
  return `${cleaned.slice(0, 4)}****${cleaned.slice(-4)}`;
}

/**
 * Converts minor currency units (cents) to major KES shillings.
 */
export function formatKesAmount(minorUnits: number): number {
  return minorUnits / 100;
}

/**
 * Strips sensitive provider credentials (passwords, tokens, secret keys) from arbitrary strings or error messages.
 */
export function sanitizeMpesaText(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/(bearer\s+)[a-zA-Z0-9_\-\.]+/gi, "$1[REDACTED]")
    .replace(/(basic\s+)[a-zA-Z0-9+/=]+/gi, "$1[REDACTED]")
    .replace(/(consumer_?secret\s*[:=]\s*)[a-zA-Z0-9_\-]+/gi, "$1[REDACTED]")
    .replace(/(security_?credential\s*[:=]\s*)[^"\s,]+/gi, "$1[REDACTED]")
    .replace(/(initiator_?password\s*[:=]\s*)[^"\s,]+/gi, "$1[REDACTED]")
    .replace(/(password\s*[:=]\s*)[^"\s,]+/gi, "$1[REDACTED]");
}


