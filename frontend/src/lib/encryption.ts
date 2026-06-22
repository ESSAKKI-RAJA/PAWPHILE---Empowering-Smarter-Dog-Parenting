export const getEncryptionKey = async (): Promise<CryptoKey> => {
  // Derive key from a fixed stable seed for offline-first local consistency.
  // In a full production app, you might derive this from a user password using PBKDF2.
  const rawKey = new TextEncoder().encode("PAWPHILE-OFFLINE-SECURE-KEY-32B!"); // 32 bytes
  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptData = async (data: any, enabled: boolean): Promise<string> => {
  if (!enabled) return JSON.stringify(data);
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const key = await getEncryptionKey();
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    
    // Convert to base64 for safe transport
    const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));
    const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(cipher)));
    return `${ivBase64}:${cipherBase64}`;
  } catch (err) {
    console.error("Encryption failed", err);
    return JSON.stringify(data); // Fallback if WebCrypto fails
  }
};

export const decryptData = async (encryptedText: string, enabled: boolean): Promise<any> => {
  if (!enabled) {
    try { return JSON.parse(encryptedText); } catch { return null; }
  }
  try {
    const [ivBase64, cipherBase64] = encryptedText.split(':');
    const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
    const cipher = new Uint8Array(atob(cipherBase64).split('').map(c => c.charCodeAt(0)));
    const key = await getEncryptionKey();
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    return null; // Return null gracefully on decrypt failure
  }
};
