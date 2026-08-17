export type TokenType = "access" | "refresh";

export interface AuthTokenPayload {
  userId: string;
  tokenType: TokenType;
  jti?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
