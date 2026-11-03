import { OidcClient } from '@sso/oidc-client';

/**
 * App B (后台) OIDC client — different client_id / redirect_uri from App A,
 * but same IdP. After App A login, IdP session cookie makes /authorize skip password.
 */
export const oidc = new OidcClient({
  clientId: import.meta.env.VITE_CLIENT_ID,
  issuer: import.meta.env.VITE_IDP_ISSUER,
  redirectUri: import.meta.env.VITE_REDIRECT_URI,
  postLogoutRedirectUri: import.meta.env.VITE_POST_LOGOUT_REDIRECT_URI,
  scope: 'openid profile email',
});

export const SIBLING_APP_URL = import.meta.env.VITE_SIBLING_APP_URL;
export const APP_NAME = '后台 App B';
export const APP_ACCENT = '#059669';
