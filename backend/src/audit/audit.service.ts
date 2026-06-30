import { Injectable } from '@nestjs/common';
import { AuditAction } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';

interface AuditInput {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Records an audit entry. Failures here never break the main operation. */
  async log(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });
    } catch {
      // Intentionally swallowed: auditing must not interfere with the request.
    }
  }

  list(params: { entityType?: string; take?: number } = {}) {
    return this.prisma.auditLog.findMany({
      where: { entityType: params.entityType },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 100,
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, mobile: true } },
      },
    });
  }
}
