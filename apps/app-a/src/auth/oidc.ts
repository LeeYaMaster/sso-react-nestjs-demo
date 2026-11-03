import { OidcClient } from '@sso/oidc-client';

/**
 * App A (门户) OIDC client.
 * client_id differs from App B so the IdP can issue audience-specific id_tokens,
 * but both share the same IdP session cookie — that is what enables SSO.
 */
export const oidc = new OidcClient({
  clientId: import.meta.env.VITE_CLIENT_ID,
  issuer: import.meta.env.VITE_IDP_ISSUER,
  redirectUri: import.meta.env.VITE_REDIRECT_URI,
  postLogoutRedirectUri: import.meta.env.VITE_POST_LOGOUT_REDIRECT_URI,
  scope: 'openid profile email',
});

export const SIBLING_APP_URL = import.meta.env.VITE_SIBLING_APP_URL;
export const APP_NAME = '门户 App A';
export const APP_ACCENT = '#2563eb';
