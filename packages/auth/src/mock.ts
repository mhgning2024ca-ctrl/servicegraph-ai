import type { JwtVerifier, VerifiedJwtClaims } from "./types.js";

export function createDeterministicJwtVerifier(
  tokens: Readonly<Record<string, VerifiedJwtClaims>>,
  nowEpochSeconds = () => Math.floor(Date.now() / 1_000),
): JwtVerifier {
  return {
    mode: "MOCK_AUTH",
    async verify(token) {
      const claims = tokens[token];
      if (!claims) throw new Error("INVALID_TEST_TOKEN");
      if (typeof claims.exp === "number" && claims.exp <= nowEpochSeconds()) {
        throw new Error("EXPIRED_TEST_TOKEN");
      }
      return claims;
    },
  };
}

export function createClaimKeyRoleExtractor(claimKey: string) {
  return (claims: VerifiedJwtClaims): readonly unknown[] | undefined => {
    const value = claims[claimKey];
    return Array.isArray(value) ? value : undefined;
  };
}
