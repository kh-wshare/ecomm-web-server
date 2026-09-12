import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import Ajv from 'ajv';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { RedisService } from '#app/infrastructure/redis/redis.service';
import {
  DEFAULT_THEME_CONFIG,
  THEME_CONFIG_SCHEMA,
  ThemeConfig,
} from './theme.constants';
import { PreviewThemeDto, UpdateThemeDraftDto } from './dto/theme-input.dto';

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

const ajv = new Ajv({ allErrors: true });
const validateThemeConfig = ajv.compile<ThemeConfig>(THEME_CONFIG_SCHEMA);

@Injectable()
export class ThemeService {
  private readonly logger = new Logger(ThemeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  getCurrent(merchantId: string) {
    return this.ensureTheme(merchantId);
  }

  async updateDraft(
    merchantId: string,
    userId: string,
    dto: UpdateThemeDraftDto,
    metadata: AuditMetadata,
  ) {
    const current = await this.ensureTheme(merchantId);
    const draftConfig =
      dto.config === undefined
        ? this.requireValidConfig(current.draftConfig)
        : this.requireValidConfig(dto.config);
    const customDomain =
      dto.customDomain === undefined
        ? current.customDomain
        : dto.customDomain?.trim().toLowerCase() || null;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const theme = await tx.merchantTheme.update({
          where: { merchantId },
          data: {
            draftConfig: this.toJson(draftConfig),
            customDomain,
          },
        });
        await tx.auditLog.create({
          data: {
            merchantId,
            userId,
            action: 'theme.draft_updated',
            entityType: 'merchant_theme',
            entityId: theme.id,
            before: {
              draftConfig: current.draftConfig,
              customDomain: current.customDomain,
            },
            after: {
              draftConfig: this.toJson(draftConfig),
              customDomain,
            },
            ...metadata,
          },
        });
        return theme;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Custom domain is already in use');
      }
      throw error;
    }
  }

  async preview(merchantId: string, dto: PreviewThemeDto) {
    const current = await this.ensureTheme(merchantId);
    const config =
      dto.config === undefined
        ? this.requireValidConfig(current.draftConfig)
        : this.requireValidConfig(dto.config);
    return {
      version: 1,
      config,
      publishedAt: null,
      preview: true,
      source:
        dto.config === undefined ? ('draft' as const) : ('provided' as const),
    };
  }

  async publish(merchantId: string, userId: string, metadata: AuditMetadata) {
    const current = await this.ensureTheme(merchantId);
    const config = this.requireValidConfig(current.draftConfig);
    const publishedAt = new Date();
    const theme = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.merchantTheme.update({
        where: { merchantId },
        data: {
          liveConfig: this.toJson(config),
          publishedAt,
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'theme.published',
          entityType: 'merchant_theme',
          entityId: updated.id,
          before: {
            liveConfig: current.liveConfig,
            publishedAt: current.publishedAt?.toISOString() ?? null,
          },
          after: {
            liveConfig: this.toJson(config),
            publishedAt: publishedAt.toISOString(),
          },
          ...metadata,
        },
      });
      return updated;
    });
    await this.invalidateLiveTheme(merchantId);
    return this.liveResponse(theme.liveConfig, theme.publishedAt);
  }

  async resetDraft(
    merchantId: string,
    userId: string,
    metadata: AuditMetadata,
  ) {
    const current = await this.ensureTheme(merchantId);
    return this.prisma.$transaction(async (tx) => {
      const theme = await tx.merchantTheme.update({
        where: { merchantId },
        data: { draftConfig: this.toJson(DEFAULT_THEME_CONFIG) },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'theme.draft_reset',
          entityType: 'merchant_theme',
          entityId: theme.id,
          before: { draftConfig: current.draftConfig },
          after: { draftConfig: this.toJson(DEFAULT_THEME_CONFIG) },
          ...metadata,
        },
      });
      return theme;
    });
  }

  getLiveTheme(merchantId: string) {
    return this.cached(
      this.cacheKey(merchantId),
      async () => {
        const theme = await this.prisma.merchantTheme.findUnique({
          where: { merchantId },
          select: { liveConfig: true, publishedAt: true },
        });
        if (!theme) return this.liveResponse(DEFAULT_THEME_CONFIG, null);
        if (!validateThemeConfig(theme.liveConfig)) {
          this.logger.error(
            `Invalid persisted live theme for merchant ${merchantId}`,
          );
          return this.liveResponse(DEFAULT_THEME_CONFIG, null);
        }
        return this.liveResponse(theme.liveConfig, theme.publishedAt);
      },
      300,
    );
  }

  private ensureTheme(merchantId: string) {
    return this.prisma.merchantTheme.upsert({
      where: { merchantId },
      update: {},
      create: {
        merchantId,
        liveConfig: this.toJson(DEFAULT_THEME_CONFIG),
        draftConfig: this.toJson(DEFAULT_THEME_CONFIG),
      },
    });
  }

  private requireValidConfig(value: unknown): ThemeConfig {
    if (!validateThemeConfig(value)) {
      throw new BadRequestException({
        message: 'Theme config does not match the JSON Schema',
        errors: (validateThemeConfig.errors ?? []).map((error) => ({
          path: error.instancePath || '/',
          message: error.message,
        })),
      });
    }
    return value;
  }

  private liveResponse(config: unknown, publishedAt: Date | null) {
    return {
      version: 1,
      config: this.requireValidConfig(config),
      publishedAt: publishedAt?.toISOString() ?? null,
    };
  }

  private toJson(config: ThemeConfig): Prisma.InputJsonObject {
    return config;
  }

  private async invalidateLiveTheme(merchantId: string) {
    try {
      await this.redis.del(this.cacheKey(merchantId));
    } catch (error) {
      this.logger.debug(
        `Theme cache invalidation skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private cacheKey(merchantId: string) {
    return `merchant:${merchantId}:theme:live`;
  }

  private async cached<T>(
    key: string,
    producer: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    try {
      const value = await this.redis.get(key);
      if (value) {
        const parsed: unknown = JSON.parse(value);
        return parsed as T;
      }
    } catch (error) {
      this.logger.debug(
        `Theme cache read skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const value = await producer();
    try {
      await this.redis.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      this.logger.debug(
        `Theme cache write skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return value;
  }

  private isUniqueViolation(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
