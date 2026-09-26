import type { CanonicalPermission, CanonicalRole } from "./constants.js";

export interface VerifiedJwtClaims {
  readonly sub?: unknown;
  readonly exp?: unknown;
  readonly permissions?: unknown;
  readonly [claim: string]: unknown;
}

export interface JwtVerificationOptions {
  readonly issuer: string;
  readonly audience: string;
}

export interface JwtVerifier {
  readonly mode: "AUTH0" | "MOCK_AUTH";
  verify(token: string, options: JwtVerificationOptions): Promise<VerifiedJwtClaims>;
}

export type RoleExtractor = (claims: VerifiedJwtClaims) => readonly unknown[] | undefined;

export interface Auth0Config {
  readonly issuer: string;
  readonly audience: string;
  readonly roleExtractor?: RoleExtractor;
}

export interface AuthContext {
  readonly authSource: "AUTH0" | "MOCK_AUTH";
  readonly subject: string;
  readonly permissions: ReadonlySet<CanonicalPermission>;
  readonly roles: ReadonlySet<CanonicalRole>;
  readonly claims: VerifiedJwtClaims;
}

export interface HeaderSource {
  readonly authorization?: string | readonly string[];
}
