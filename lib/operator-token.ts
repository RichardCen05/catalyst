"use client";

/**
 * Browser half of the operator guard. The token lives in this browser only —
 * it is typed into the Pengaturan drawer, never shipped in the bundle and
 * never sent anywhere except our own `/api` mutations.
 */

const STORAGE_KEY = "catalyst:operator-token";

export function getOperatorToken(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setOperatorToken(value: string): void {
  try {
    const trimmed = value.trim();
    if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: the header is simply omitted and the
    // API answers 401, which the caller already reports.
  }
}

/** JSON headers plus the bearer, when the operator has set one. */
export function operatorHeaders(): Record<string, string> {
  const token = getOperatorToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}
