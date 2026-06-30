import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SmsService } from '../sms/sms.service';
import { CreateReservationDto, ParticipantInputDto } from './dto/create-reservation.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  buildIcs,
  buildGoogleCalendarUrl,
  CalendarEvent,
} from '../calendar/calendar.util';
import {
  formatDateOnly,
  hhmmToHour,
  hourToHHmm,
  isAllowedDay,
  isSlotPast,
  isValidDateStr,
  isWithinBookingWindow,
  prismaDateOnly,
} from '../common/time/tehran-time';

const RES_INCLUDE = {
  room: { select: { id: true, name: true } },
  participants: {
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  },
} satisfies Prisma.ReservationInclude;

type ReservationWithRelations = Prisma.ReservationGetPayload<{ include: typeof RES_INCLUDE }>;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly sms: SmsService,
  ) {}

  private get startHour(): number {
    return Number(this.config.get('BOOKING_START_HOUR') ?? 8);
  }
  private get endHour(): number {
    return Number(this.config.get('BOOKING_END_HOUR') ?? 16);
  }
  private get maxDaysAhead(): number {
    return Number(this.config.get('BOOKING_MAX_DAYS_AHEAD') ?? 14);
  }

  // ---------------------------------------------------------------- create
  async create(userId: string, dto: CreateReservationDto) {
    const dateStr = dto.date;

    if (!isValidDateStr(dateStr)) {
      throw new BadRequestException('تاریخ معتبر نیست.');
    }
    if (!isAllowedDay(dateStr)) {
      throw new BadRequestException('فقط شنبه تا چهارشنبه قابل رزرو است.');
    }
    if (!isWithinBookingWindow(dateStr, this.maxDaysAhead)) {
      throw new BadRequestException(`رزرو فقط از امروز تا ${this.maxDaysAhead} روز آینده ممکن است.`);
    }

    const hour = hhmmToHour(dto.startTime);
    if (Number.isNaN(hour) || hour < this.startHour || hour >= this.endHour) {
      throw new BadRequestException('اسلات زمانی نامعتبر است.');
    }
    if (isSlotPast(dateStr, hour)) {
      throw new BadRequestException('این اسلات زمانی گذشته است.');
    }
    const endTime = hourToHHmm(hour + 1);

    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, isActive: true },
    });
    if (!room) {
      throw new NotFoundException('اتاق یافت نشد یا غیرفعال است.');
    }

    const participantsData = await this.buildParticipants(dto.participants);

    // Atomic conflict check: serialize concurrent attempts on the same slot with
    // a Postgres advisory lock, re-check inside the transaction, and rely on the
    // partial unique index as the final guarantee.
    const created = await this.prisma
      .$transaction(async (tx) => {
        const lockKey = `${dto.roomId}|${dateStr}|${dto.startTime}`;
        await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', lockKey);

        const clash = await tx.reservation.findFirst({
          where: {
            roomId: dto.roomId,
            date: prismaDateOnly(dateStr),
            startTime: dto.startTime,
            status: 'active',
          },
          select: { id: true },
        });
        if (clash) {
          throw new ForbiddenException('این بازه زمانی هم‌اکنون رزرو شده است.');
        }

        return tx.reservation.create({
          data: {
            userId,
            roomId: dto.roomId,
            title: dto.title.trim(),
            description: dto.description?.trim() || null,
            date: prismaDateOnly(dateStr),
            startTime: dto.startTime,
            endTime,
            attendees: dto.attendees ?? participantsData.length,
            status: 'active',
            participants: participantsData.length
              ? { create: participantsData }
              : undefined,
          },
          include: RES_INCLUDE,
        });
      })
      .catch((e: unknown) => {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ForbiddenException('این بازه زمانی هم‌اکنون رزرو شده است.');
        }
        throw e;
      });

    await this.audit.log({
      actorId: userId,
      action: 'reservation_created',
      entityType: 'reservation',
      entityId: created.id,
      metadata: { roomId: dto.roomId, date: dateStr, startTime: dto.startTime },
    });

    // Phase-2 hook: best-effort notification (console provider for now).
    await this.sms.send(
      room.name,
      `رزرو ${room.name} در تاریخ ${dateStr} ساعت ${dto.startTime} ثبت شد.`,
    );

    return this.shape(created);
  }

  private async buildParticipants(items?: ParticipantInputDto[]) {
    if (!items || items.length === 0) return [];

    const userIds = [...new Set(items.filter((i) => i.userId).map((i) => i.userId as string))];
    let validIds = new Set<string>();
    if (userIds.length) {
      const found = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });
      validIds = new Set(found.map((u) => u.id));
    }

    const data: { userId: string | null; guestName: string | null }[] = [];
    const seenUsers = new Set<string>();
    for (const it of items) {
      if (it.userId) {
        if (!validIds.has(it.userId)) {
          throw new BadRequestException('یکی از شرکت‌کنندگان انتخاب‌شده معتبر نیست.');
        }
        if (seenUsers.has(it.userId)) continue;
        seenUsers.add(it.userId);
        data.push({ userId: it.userId, guestName: null });
      } else if (it.guestName && it.guestName.trim()) {
        data.push({ userId: null, guestName: it.guestName.trim() });
      }
    }
    return data;
  }

  // ------------------------------------------------------------- my list
  async listMine(userId: string) {
    const rows = await this.prisma.reservation.findMany({
      where: { userId, status: { not: 'deleted' } },
      include: RES_INCLUDE,
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
    });
    return rows.map((r) => this.shape(r));
  }

  // --------------------------------------------------------------- cancel
  async cancel(userId: string, id: string) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r || r.userId !== userId) {
      throw new NotFoundException('رزرو یافت نشد.');
    }
    if (r.status !== 'active') {
      throw new BadRequestException('این رزرو قابل لغو نیست.');
    }
    const dateStr = formatDateOnly(r.date);
    const hour = hhmmToHour(r.startTime);
    if (isSlotPast(dateStr, hour)) {
      throw new BadRequestException('زمان جلسه آغاز شده است؛ امکان لغو وجود ندارد.');
    }

    await this.prisma.reservation.update({ where: { id }, data: { status: 'cancelled' } });
    await this.audit.log({
      actorId: userId,
      action: 'reservation_cancelled',
      entityType: 'reservation',
      entityId: id,
    });
    return { message: 'رزرو لغو شد.' };
  }

  // ------------------------------------------------------------- calendar
  private async getOwnedOrAdmin(id: string, user: AuthUser): Promise<ReservationWithRelations> {
    const r = await this.prisma.reservation.findUnique({ where: { id }, include: RES_INCLUDE });
    if (!r) throw new NotFoundException('رزرو یافت نشد.');
    if (r.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('دسترسی ندارید.');
    }
    return r;
  }

  private toCalendarEvent(r: ReservationWithRelations): CalendarEvent {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      roomName: r.room.name,
      date: formatDateOnly(r.date),
      startTime: r.startTime,
      endTime: r.endTime,
    };
  }

  async getIcs(id: string, user: AuthUser): Promise<{ filename: string; content: string }> {
    const r = await this.getOwnedOrAdmin(id, user);
    return { filename: `reservation-${r.id}.ics`, content: buildIcs(this.toCalendarEvent(r)) };
  }

  async getGoogleUrl(id: string, user: AuthUser): Promise<{ url: string }> {
    const r = await this.getOwnedOrAdmin(id, user);
    return { url: buildGoogleCalendarUrl(this.toCalendarEvent(r)) };
  }

  // --------------------------------------------------------------- shape
  private shape(r: ReservationWithRelations) {
    const dateStr = formatDateOnly(r.date);
    const hour = hhmmToHour(r.startTime);
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      date: dateStr,
      startTime: r.startTime,
      endTime: r.endTime,
      attendees: r.attendees,
      status: r.status,
      createdAt: r.createdAt,
      room: { id: r.room.id, name: r.room.name },
      canCancel: r.status === 'active' && !isSlotPast(dateStr, hour),
      participants: r.participants.map((p) =>
        p.userId && p.user
          ? {
              type: 'user' as const,
              userId: p.userId,
              name: `${p.user.firstName} ${p.user.lastName}`,
            }
          : { type: 'guest' as const, name: p.guestName ?? '' },
      ),
    };
  }
}
