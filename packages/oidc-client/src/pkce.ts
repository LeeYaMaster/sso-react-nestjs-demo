/**
 * PKCE (Proof Key for Code Exchange) helpers — RFC 7636
 *
 * Why PKCE?
 * Public SPAs cannot safely store a client_secret. An attacker who intercepts
 * the authorization `code` could otherwise redeem it. With PKCE the SPA keeps
 * a high-entropy `code_verifier` locally; only its SHA-256 hash (`code_challenge`)
 * is sent to /authorize. /token later requires the original verifier, so a stolen
 * code alone is useless.
 */

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate a cryptographically random code_verifier (43–128 chars). */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** S256 code_challenge = BASE64URL(SHA256(ASCII(code_verifier))) */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

/** Opaque CSRF/state value bound to this login attempt. */
export function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** Random nonce included in the ID Token (replay protection). */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}
