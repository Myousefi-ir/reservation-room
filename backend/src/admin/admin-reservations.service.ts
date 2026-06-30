import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { ReservationStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RejectReservationDto, UpdateReservationDto } from './dto/update-reservation.dto';
import {
  formatDateOnly,
  hhmmToHour,
  hourToHHmm,
  isAllowedDay,
  isValidDateStr,
  isWithinBookingWindow,
  prismaDateOnly,
} from '../common/time/tehran-time';

const ADMIN_INCLUDE = {
  room: { select: { id: true, name: true } },
  user: { select: { id: true, firstName: true, lastName: true, mobile: true } },
  participants: {
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  },
} satisfies Prisma.ReservationInclude;

type AdminReservation = Prisma.ReservationGetPayload<{ include: typeof ADMIN_INCLUDE }>;

export interface ListReservationsQuery {
  date?: string;
  roomId?: string;
  status?: ReservationStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
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

  async list(query: ListReservationsQuery) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));

    const where: Prisma.ReservationWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.roomId) where.roomId = query.roomId;
    if (query.date && isValidDateStr(query.date)) where.date = prismaDateOnly(query.date);
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { title: { contains: q } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
        { user: { mobile: { contains: q } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { items: items.map((r) => this.shape(r)), total, page, pageSize };
  }

  async update(adminId: string, id: string, dto: UpdateReservationDto) {
    const current = await this.prisma.reservation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('رزرو یافت نشد.');

    const rescheduleKeys = [dto.roomId, dto.date, dto.startTime];
    const isReschedule = rescheduleKeys.some((v) => v !== undefined);

    // Unchecked variant so the reschedule branch can set the scalar `roomId`
    // (the checked ReservationUpdateInput only exposes the `room` relation).
    const data: Prisma.ReservationUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.attendees !== undefined) data.attendees = dto.attendees;

    if (!isReschedule) {
      const updated = await this.prisma.reservation.update({
        where: { id },
        data,
        include: ADMIN_INCLUDE,
      });
      await this.audit.log({
        actorId: adminId,
        action: 'reservation_updated',
        entityType: 'reservation',
        entityId: id,
        metadata: { fields: Object.keys(data) },
      });
      return this.shape(updated);
    }

    // ---- reschedule path: requires all three and re-checks conflicts ----
    const roomId = dto.roomId ?? current.roomId;
    const dateStr = dto.date ?? formatDateOnly(current.date);
    const startTime = dto.startTime ?? current.startTime;

    if (!isValidDateStr(dateStr) || !isAllowedDay(dateStr)) {
      throw new BadRequestException('تاریخ نامعتبر است (فقط شنبه تا چهارشنبه).');
    }
    if (!isWithinBookingWindow(dateStr, this.maxDaysAhead)) {
      throw new BadRequestException(`بازه مجاز: امروز تا ${this.maxDaysAhead} روز آینده.`);
    }
    const hour = hhmmToHour(startTime);
    if (Number.isNaN(hour) || hour < this.startHour || hour >= this.endHour) {
      throw new BadRequestException('اسلات زمانی نامعتبر است.');
    }
    const room = await this.prisma.room.findFirst({ where: { id: roomId, isActive: true } });
    if (!room) throw new NotFoundException('اتاق یافت نشد یا غیرفعال است.');

    const endTime = hourToHHmm(hour + 1);

    const updated = await this.prisma
      .$transaction(async (tx) => {
        const clash = await tx.reservation.findFirst({
          where: {
            roomId,
            date: prismaDateOnly(dateStr),
            startTime,
            status: 'active',
            id: { not: id },
          },
          select: { id: true },
        });
        if (clash) throw new ForbiddenException('بازه مقصد قبلاً رزرو شده است.');

        return tx.reservation.update({
          where: { id },
          data: { ...data, roomId, date: prismaDateOnly(dateStr), startTime, endTime },
          include: ADMIN_INCLUDE,
        });
      })
      .catch((e: unknown) => {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ForbiddenException('بازه مقصد قبلاً رزرو شده است.');
        }
        throw e;
      });

    await this.audit.log({
      actorId: adminId,
      action: 'reservation_updated',
      entityType: 'reservation',
      entityId: id,
      metadata: { rescheduledTo: { roomId, date: dateStr, startTime } },
    });
    return this.shape(updated);
  }

  async reject(adminId: string, id: string, dto: RejectReservationDto) {
    const current = await this.prisma.reservation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('رزرو یافت نشد.');

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: 'cancelled' },
      include: ADMIN_INCLUDE,
    });
    await this.audit.log({
      actorId: adminId,
      action: 'reservation_rejected',
      entityType: 'reservation',
      entityId: id,
      metadata: { reason: dto.reason ?? null },
    });
    return this.shape(updated);
  }

  async remove(adminId: string, id: string) {
    const current = await this.prisma.reservation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('رزرو یافت نشد.');

    // Soft delete (keeps the audit trail and frees the slot via the partial index).
    await this.prisma.reservation.update({ where: { id }, data: { status: 'deleted' } });
    await this.audit.log({
      actorId: adminId,
      action: 'reservation_deleted',
      entityType: 'reservation',
      entityId: id,
    });
    return { message: 'رزرو حذف شد.' };
  }

  private shape(r: AdminReservation) {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      date: formatDateOnly(r.date),
      startTime: r.startTime,
      endTime: r.endTime,
      attendees: r.attendees,
      status: r.status,
      createdAt: r.createdAt,
      room: { id: r.room.id, name: r.room.name },
      reservedBy: {
        id: r.user.id,
        name: `${r.user.firstName} ${r.user.lastName}`,
        mobile: r.user.mobile,
      },
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
