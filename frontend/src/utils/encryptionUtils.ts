/**
 * encryptionUtils.ts
 * PAWPHILE data encryption wrapper.
 *
 * CURRENT: Base-64 + URI encoding (demonstration layer only).
 * FUTURE (Phase-2): Replace with Web Crypto API — AES-GCM 256-bit.
 *   Steps:
 *   1. Generate a random 256-bit key:  crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
 *   2. Derive key from user password:  crypto.subtle.deriveKey(PBKDF2 params, ...)
 *   3. Encrypt:                        crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
 *   4. Store IV + ciphertext in IndexedDB (NOT localStorage — localStorage is synchronous and visible in DevTools)
 *   5. Database security: each row is tagged with user_id and encrypted server-side at rest.
 *   6. In-transit: all backend calls are over HTTPS/TLS 1.3 automatically.
 *   7. Audit log: record sensitive operations.
 */

/**
 * Encrypt a data object.
 * @param data - Any JSON-serializable value
 * @param enabled - If false, returns raw JSON (no encryption applied)
 */
export function encryptData(data: unknown, enabled: boolean): string {
  if (!enabled) return JSON.stringify(data);
  try {
    // Mock encryption: base64(encodeURIComponent(json))
    // TODO: Replace with AES-GCM via crypto.subtle.encrypt()
    return btoa(encodeURIComponent(JSON.stringify(data)));
  } catch {
    return JSON.stringify(data);
  }
}

/**
 * Decrypt a stored string.
 * @param encryptedText - Previously encrypted string
 * @param enabled - Must match the value used during encryption
 */
export function decryptData<T>(encryptedText: string, enabled: boolean): T | null {
  try {
    if (!enabled) return JSON.parse(encryptedText) as T;
    // TODO: Replace with AES-GCM via crypto.subtle.decrypt()
    return JSON.parse(decodeURIComponent(atob(encryptedText))) as T;
  } catch {
    return null;
  }
}

/**
 * Quick check: is the current encrypted storage compatible?
 * Use before upgrading encryption scheme to avoid data loss.
 */
export function isEncryptedPayload(value: string): boolean {
  try {
    JSON.parse(value);
    return false; // Plain JSON — not encrypted
  } catch {
    return true; // Likely encrypted / base64
  }
}
