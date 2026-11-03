/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IDP_ISSUER: string;
  readonly VITE_CLIENT_ID: string;
  readonly VITE_REDIRECT_URI: string;
  readonly VITE_POST_LOGOUT_REDIRECT_URI: string;
  readonly VITE_SIBLING_APP_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
