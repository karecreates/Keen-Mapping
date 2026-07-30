const AUTH_STORAGE_KEY = "keen-mapping-access";
/** SHA-256 of the access password — plaintext is not stored in source. */
const ACCESS_PASSWORD_HASH =
  "da4b51f2cd8511cdc648196c7c38eb0e0fb12091d5fb6b55522058b937b34401";

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isAccessGranted(): boolean {
  try {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === ACCESS_PASSWORD_HASH;
  } catch {
    return false;
  }
}

export async function verifyAccessPassword(password: string): Promise<boolean> {
  const hash = await sha256Hex(password);
  if (hash !== ACCESS_PASSWORD_HASH) return false;
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, ACCESS_PASSWORD_HASH);
  } catch {
    // Still allow this session if storage is blocked
  }
  return true;
}
