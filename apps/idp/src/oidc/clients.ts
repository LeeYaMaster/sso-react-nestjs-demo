export interface OidcClientRegistration {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  post_logout_redirect_uris: string[];
  /** Public SPA clients — no secret; PKCE required */
  token_endpoint_auth_method: 'none';
}

export const CLIENTS: OidcClientRegistration[] = [
  {
    client_id: 'app-a-portal',
    client_name: '门户 App A',
    redirect_uris: ['http://localhost:5173/callback'],
    post_logout_redirect_uris: [
      'http://localhost:5173/',
      'http://localhost:5173',
    ],
    token_endpoint_auth_method: 'none',
  },
  {
    client_id: 'app-b-admin',
    client_name: '后台 App B',
    redirect_uris: ['http://localhost:5174/callback'],
    post_logout_redirect_uris: [
      'http://localhost:5174/',
      'http://localhost:5174',
    ],
    token_endpoint_auth_method: 'none',
  },
];

export function findClient(clientId: string): OidcClientRegistration | undefined {
  return CLIENTS.find((c) => c.client_id === clientId);
}
