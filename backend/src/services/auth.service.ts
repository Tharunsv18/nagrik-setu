import { randomUUID } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import type { AuthTokenPayload, TokenPair, TokenType } from "../types/auth";

interface NagrikJwtPayload extends JwtPayload {
  sub: string;
  tokenType: TokenType;
}

function isNagrikJwtPayload(value: string | JwtPayload): value is NagrikJwtPayload {
  return (
    typeof value !== "string" &&
    typeof value.sub === "string" &&
    (value.tokenType === "access" || value.tokenType === "refresh")
  );
}

function signToken(userId: string, tokenType: TokenType, secret: string, expiresIn: string): string {
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions["expiresIn"],
    jwtid: randomUUID(),
  };

  return jwt.sign({ tokenType }, secret, {
    ...options,
    subject: userId,
  });
}

function verifyToken(token: string, secret: string, expectedType: TokenType): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, secret);

    if (!isNagrikJwtPayload(decoded) || decoded.tokenType !== expectedType) {
      throw new AppError(401, "INVALID_TOKEN", "The provided token is invalid.");
    }

    return {
      userId: decoded.sub,
      tokenType: decoded.tokenType,
      ...(typeof decoded.jti === "string" ? { jti: decoded.jti } : {}),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, "INVALID_TOKEN", "The provided token is invalid or expired.");
  }
}

export function createTokenPair(userId: string): TokenPair {
  return {
    accessToken: signToken(userId, "access", env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES_IN),
    refreshToken: signToken(userId, "refresh", env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN),
  };
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return verifyToken(token, env.JWT_ACCESS_SECRET, "access");
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  return verifyToken(token, env.JWT_REFRESH_SECRET, "refresh");
}
