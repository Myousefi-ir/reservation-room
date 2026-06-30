import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildSlots,
  isAllowedDay,
  isSlotPast,
  isValidDateStr,
  isWithinBookingWindow,
  prismaDateOnly,
  weekdayOf,
} from '../common/time/tehran-time';

export type SlotStatus = 'available' | 'past' | 'booked' | 'closed';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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

  async getAvailability(dateStr: string, roomId?: string) {
    if (!dateStr || !isValidDateStr(dateStr)) {
      throw new BadRequestException('تاریخ معتبر نیست (قالب درست: YYYY-MM-DD).');
    }

    const allowedDay = isAllowedDay(dateStr);
    const withinWindow = isWithinBookingWindow(dateStr, this.maxDaysAhead);
    const slots = buildSlots(this.startHour, this.endHour);

    const rooms = await this.prisma.room.findMany({
      where: { isActive: true, id: roomId ? roomId : undefined },
      orderBy: { name: 'asc' },
    });

    // Active reservations for that day (one query for all rooms).
    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: 'active',
        date: prismaDateOnly(dateStr),
        roomId: roomId ? roomId : undefined,
      },
      select: { roomId: true, startTime: true },
    });
    const bookedSet = new Set(reservations.map((r) => `${r.roomId}|${r.startTime}`));

    const result = rooms.map((room) => ({
      roomId: room.id,
      roomName: room.name,
      slots: slots.map((s) => {
        let status: SlotStatus;
        if (!allowedDay || !withinWindow) {
          status = 'closed';
        } else if (bookedSet.has(`${room.id}|${s.start}`)) {
          status = 'booked';
        } else if (isSlotPast(dateStr, s.hour)) {
          status = 'past';
        } else {
          status = 'available';
        }
        return { start: s.start, end: s.end, hour: s.hour, status };
      }),
    }));

    return {
      date: dateStr,
      weekday: weekdayOf(dateStr),
      isAllowedDay: allowedDay,
      isWithinWindow: withinWindow,
      rooms: result,
    };
  }
}
