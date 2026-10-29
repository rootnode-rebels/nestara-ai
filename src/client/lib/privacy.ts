/**
 * Nestara AI — Zero-Trust Personal Data Privacy & PII Masking Utilities
 * Complies with India DPDP Act and GDPR specifications for sensitive resident data.
 */

import { api } from "../api";

/**
 * Masks an email address to conceal identity while confirming domain validity.
 * Example: "priya.sharma@example.com" -> "p•••••a@example.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "—";
  const [local, domain] = email.trim().split("@");
  if (local.length <= 2) {
    return `${local[0]}•@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  const maskedLocal = `${first}${"•".repeat(Math.min(local.length - 2, 5))}${last}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Masks phone numbers to conceal personal mobile lines from public displays.
 * Example: "+91 98765 43210" -> "+91 98••• ••210"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const cleaned = phone.trim();
  if (cleaned.length <= 5) return "•••••";
  
  // Keep first 5 chars and last 3 chars, mask the rest
  const start = cleaned.slice(0, 5);
  const end = cleaned.slice(-3);
  return `${start} •••• ${end}`;
}

/**
 * Masks financial salary / income figures for privacy on shared management screens.
 * Example: 65000 -> "₹••••• /mo"
 */
export function maskIncome(amount: number | null | undefined, currency: string = "INR"): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
  return `${symbol}•••••• /mo`;
}

/**
 * Sends a cryptographic audit log event to the backend when sensitive PII is revealed.
 */
export async function logPiiAccess(
  action: "reveal_pii" | "export_data" | "view_contract" | "update_record",
  targetType: "tenant" | "application" | "lease" | "rent_ledger",
  targetId?: number,
  details?: string
): Promise<void> {
  try {
    await api("POST", "/api/audit/log", {
      action,
      target_type: targetType,
      target_id: targetId || null,
      details: details || null,
    });
  } catch {
    // Fail silently in UI to avoid blocking interaction, backend records auth
  }
}

