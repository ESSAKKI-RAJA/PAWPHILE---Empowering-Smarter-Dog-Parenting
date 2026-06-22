export function secureSave(key: string, value: any, encryptionEnabled: boolean) {
  try {
    const stringValue = JSON.stringify(value);
    if (encryptionEnabled) {
      // Basic base64 "encryption" for prototype
      const encoded = btoa(encodeURIComponent(stringValue));
      localStorage.setItem(key, encoded);
    } else {
      localStorage.setItem(key, stringValue);
    }
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
}

export function secureLoad(key: string, encryptionEnabled: boolean) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    if (encryptionEnabled) {
      try {
        const decoded = decodeURIComponent(atob(stored));
        return JSON.parse(decoded);
      } catch {
        // Fallback if data was not encrypted
        return JSON.parse(stored);
      }
    } else {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return null;
  }
}

export function secureRemove(key: string) {
  localStorage.removeItem(key);
}
