import { Auth0Client } from "@auth0/nextjs-auth0/server";

const configured = Boolean(
  process.env.AUTH0_DOMAIN
  && process.env.AUTH0_CLIENT_ID
  && process.env.AUTH0_CLIENT_SECRET
  && process.env.AUTH0_SECRET,
);

/**
 * Auth0 is optional for the public and local mock runtime. Instantiating the
 * SDK only when its server-side configuration is complete keeps that runtime
 * usable while production authentication fails closed in the API.
 */
export const auth0 = configured
  ? new Auth0Client({
      appBaseUrl: process.env.AUTH0_BASE_URL,
      authorizationParameters: {
        audience: process.env.AUTH0_AUDIENCE,
        scope: "openid profile email offline_access",
      },
      signInReturnToPath: "/ops",
    })
  : null;

