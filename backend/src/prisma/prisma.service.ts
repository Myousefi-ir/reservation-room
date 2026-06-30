import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();

    // Defense-in-depth against double booking: a PARTIAL unique index that
    // applies only to ACTIVE reservations. Two cancelled/deleted rows on the
    // same slot are allowed, but never two active ones. Created idempotently.
    await this.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_slot"
       ON "reservations" ("room_id", "date", "start_time")
       WHERE "status" = 'active';`,
    );

    this.logger.log('Prisma connected; active-slot unique index ensured.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
