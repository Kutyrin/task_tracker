import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
      },
    });

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    return this.generateTokens(user.id, user.email);
  }

  async requestPasswordReset(email: string) {
    const genericResponse = {
      message:
        'If an account with that email exists, password reset instructions have been sent.',
    };

    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      return genericResponse;
    }

    const now = new Date();
    const cooldownMs = 60_000;

    if (
      user.passwordResetRequestedAt &&
      now.getTime() - user.passwordResetRequestedAt.getTime() < cooldownMs
    ) {
      return genericResponse;
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    const cooldownCutoff = new Date(now.getTime() - cooldownMs);

    // Atomic cooldown check prevents concurrent requests from issuing
    // multiple valid reset links for the same account.
    const claimed = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        OR: [
          { passwordResetRequestedAt: null },
          { passwordResetRequestedAt: { lte: cooldownCutoff } },
        ],
      },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
        passwordResetRequestedAt: now,
      },
    });

    if (claimed.count === 0) {
      return genericResponse;
    }

    try {
      await this.mailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      // Remove the token if delivery failed. Keep the timestamp so a
      // failed delivery cannot be used to spam repeated SMTP attempts.
      await this.prisma.user.updateMany({
        where: {
          id: user.id,
          passwordResetTokenHash: tokenHash,
        },
        data: {
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      });

      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Password reset email delivery failed: ${reason}`);
    }

    return genericResponse;
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    const result = await this.prisma.user.updateMany({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: {
          gt: now,
        },
      },
      data: {
        password: passwordHash,
        refreshTokenHash: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    return {
      message: 'Password has been reset successfully',
    };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokenHash: null,
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
      }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
      });

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(userId: number, email: string) {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '30d',
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokenHash,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
