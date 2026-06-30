import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function parseDurationMs(value: string): number {
  const m = /^(\d+)([smhd])$/.exec((value || '').trim());
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = parseInt(m[1], 10);
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]] ?? 86_400_000;
  return n * mult;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /** Signs a short-lived access JWT + creates a persisted opaque refresh token. */
  async issueTokens(userId: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') || '15m',
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const ttlMs = parseDurationMs(this.config.get<string>('JWT_REFRESH_TTL') || '7d');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });

    return { accessToken, refreshToken };
  }

  /** Validates a refresh token, rotates it (old revoked, new issued). */
  async rotate(rawRefreshToken: string): Promise<{ userId: string; tokens: TokenPair }> {
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: this.hashToken(rawRefreshToken) },
    });

    if (!record || record.revoked || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('نشست منقضی شده است؛ دوباره وارد شوید.');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revoked: true },
    });

    const tokens = await this.issueTokens(record.userId);
    return { userId: record.userId, tokens };
  }

  /** Revokes a single refresh token (logout). Silent if unknown. */
  async revoke(rawRefreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(rawRefreshToken), revoked: false },
      data: { revoked: true },
    });
  }
}
