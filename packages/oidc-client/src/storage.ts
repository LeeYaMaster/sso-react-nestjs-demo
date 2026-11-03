export interface PendingAuth {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

const PENDING_KEY = 'oidc.pending';
const TOKENS_KEY = 'oidc.tokens';
const PROFILE_KEY = 'oidc.profile';

export interface TokenSet {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  obtained_at: number; // epoch ms
}

export interface UserProfile {
  sub: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  roles?: string[];
}

export function savePending(p: PendingAuth): void {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
}

export function loadPending(): PendingAuth | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAuth;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  sessionStorage.removeItem(PENDING_KEY);
}

export function saveTokens(t: TokenSet): void {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(t));
}

export function loadTokens(): TokenSet | null {
  const raw = localStorage.getItem(TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TokenSet;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  localStorage.removeItem(TOKENS_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function saveProfile(p: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function loadProfile(): UserProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function truncateToken(token: string, head = 18, tail = 10): string {
  if (token.length <= head + tail + 3) return token;
  return `${token.slice(0, head)}…${token.slice(-tail)}`;
}
