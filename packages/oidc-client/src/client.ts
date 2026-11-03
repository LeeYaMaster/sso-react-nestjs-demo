import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
} from './pkce.js';
import {
  clearPending,
  clearTokens,
  loadPending,
  loadProfile,
  loadTokens,
  savePending,
  saveProfile,
  saveTokens,
  type TokenSet,
  type UserProfile,
} from './storage.js';

export interface OidcClientConfig {
  /** Unique client_id registered at the IdP */
  clientId: string;
  /** IdP issuer base URL, e.g. http://localhost:3000 */
  issuer: string;
  /** Must exactly match a redirect_uri registered for this client */
  redirectUri: string;
  /** post_logout_redirect_uri */
  postLogoutRedirectUri: string;
  /** Space-delimited scopes */
  scope?: string;
}

export interface DiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
}

/**
 * Minimal browser OIDC client for teaching Authorization Code + PKCE.
 * Comments mark the three critical hops: redirect → callback → token exchange.
 */
export class OidcClient {
  private discovery: DiscoveryDocument | null = null;

  constructor(private readonly config: OidcClientConfig) {}

  async getDiscovery(): Promise<DiscoveryDocument> {
    if (this.discovery) return this.discovery;
    const res = await fetch(
      `${this.config.issuer}/.well-known/openid-configuration`,
    );
    if (!res.ok) throw new Error(`Discovery failed: ${res.status}`);
    this.discovery = (await res.json()) as DiscoveryDocument;
    return this.discovery;
  }

  isLoggedIn(): boolean {
    const tokens = loadTokens();
    if (!tokens) return false;
    const expiresAt = tokens.obtained_at + tokens.expires_in * 1000;
    // small skew allowance
    return Date.now() < expiresAt - 5_000;
  }

  getTokens(): TokenSet | null {
    return loadTokens();
  }

  getProfile(): UserProfile | null {
    return loadProfile();
  }

  /**
   * STEP 1 — Start login
   * Build /authorize URL with PKCE challenge + state/nonce, stash verifier in
   * sessionStorage, then navigate the browser to the IdP. The IdP will set /
   * check its session cookie and eventually redirect back with ?code=&state=.
   */
  async login(returnTo = '/'): Promise<void> {
    const discovery = await this.getDiscovery();
    const state = generateState();
    const nonce = generateNonce();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Keep verifier ONLY in the SPA (never send to IdP until /token)
    savePending({ state, nonce, codeVerifier, returnTo });

    const url = new URL(discovery.authorization_endpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('scope', this.config.scope ?? 'openid profile email');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    window.location.assign(url.toString());
  }

  /**
   * STEP 2+3 — Handle callback
   * Validate state (CSRF), then POST code + code_verifier to /token.
   * On success store tokens locally and fetch /userinfo.
   */
  async handleCallback(search: string): Promise<string> {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const error = params.get('error');
    if (error) {
      throw new Error(
        `IdP error: ${error} — ${params.get('error_description') ?? ''}`,
      );
    }

    const code = params.get('code');
    const state = params.get('state');
    const pending = loadPending();

    // state must match what we stored before the redirect (CSRF protection)
    if (!code || !state || !pending || state !== pending.state) {
      clearPending();
      throw new Error('Invalid OIDC callback: missing/mismatched code or state');
    }

    const discovery = await this.getDiscovery();

    // Token exchange: prove possession of code_verifier (PKCE)
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      code_verifier: pending.codeVerifier,
    });

    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      clearPending();
      throw new Error(`Token exchange failed (${tokenRes.status}): ${text}`);
    }

    const json = (await tokenRes.json()) as {
      access_token: string;
      id_token: string;
      refresh_token?: string;
      token_type: string;
      expires_in: number;
    };

    // Optional: verify id_token nonce matches pending.nonce (skipped deep JWT
    // crypto verify here for brevity; production must validate signature via JWKS)
    if (pending.nonce && json.id_token) {
      const payload = decodeJwtPayload(json.id_token);
      if (payload.nonce && payload.nonce !== pending.nonce) {
        clearPending();
        throw new Error('ID Token nonce mismatch');
      }
    }

    const tokens: TokenSet = {
      ...json,
      obtained_at: Date.now(),
    };
    saveTokens(tokens);
    clearPending();

    // Enrich UI with userinfo
    try {
      const profile = await this.fetchUserInfo(tokens.access_token);
      saveProfile(profile);
    } catch {
      // non-fatal for demo
    }

    return pending.returnTo || '/';
  }

  async fetchUserInfo(accessToken?: string): Promise<UserProfile> {
    const token = accessToken ?? loadTokens()?.access_token;
    if (!token) throw new Error('No access token');
    const discovery = await this.getDiscovery();
    const res = await fetch(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`userinfo failed: ${res.status}`);
    const profile = (await res.json()) as UserProfile;
    saveProfile(profile);
    return profile;
  }

  /**
   * Clear local tokens, then redirect to IdP end_session so the shared SSO
   * cookie is cleared too — otherwise App B would still silently SSO.
   */
  async logout(): Promise<void> {
    const tokens = loadTokens();
    clearTokens();
    clearPending();

    const discovery = await this.getDiscovery();
    const url = new URL(discovery.end_session_endpoint);
    url.searchParams.set('post_logout_redirect_uri', this.config.postLogoutRedirectUri);
    url.searchParams.set('client_id', this.config.clientId);
    if (tokens?.id_token) {
      url.searchParams.set('id_token_hint', tokens.id_token);
    }
    window.location.assign(url.toString());
  }

  /** Local-only logout (does NOT clear IdP session — useful to contrast with SSO). */
  logoutLocal(): void {
    clearTokens();
    clearPending();
  }
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.');
  if (parts.length < 2) return {};
  const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const json = atob(padded);
  return JSON.parse(json) as Record<string, unknown>;
}
