import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  hourToHHmm,
  nowTehran,
  prismaDateOnly,
  tehranDate,
  todayTehran,
} from '../common/time/tehran-time';

@Injectable()
export class AdminDashboardService {
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

  async getStats() {
    const today = todayTehran();
    const d = tehranDate(today);
    const daysSinceSat = (d.day() - 6 + 7) % 7; // Saturday = start of Iranian week
    const weekStart = d.subtract(daysSinceSat, 'day').format('YYYY-MM-DD');
    const weekEnd = d.subtract(daysSinceSat, 'day').add(6, 'day').format('YYYY-MM-DD');

    const [
      totalUsers,
      pendingUsers,
      activeUsers,
      totalActiveRooms,
      todayReservations,
      weekReservations,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'pending' } }),
      this.prisma.user.count({ where: { status: 'active' } }),
      this.prisma.room.count({ where: { isActive: true } }),
      this.prisma.reservation.count({
        where: { status: 'active', date: prismaDateOnly(today) },
      }),
      this.prisma.reservation.count({
        where: {
          status: 'active',
          date: { gte: prismaDateOnly(weekStart), lte: prismaDateOnly(weekEnd) },
        },
      }),
    ]);

    // Rooms free / occupied at the current slot.
    const now = nowTehran();
    const hour = now.hour();
    let roomsOccupiedNow = 0;
    let roomsFreeNow = totalActiveRooms;
    if (hour >= this.startHour && hour < this.endHour) {
      const occ = await this.prisma.reservation.findMany({
        where: { status: 'active', date: prismaDateOnly(today), startTime: hourToHHmm(hour) },
        select: { roomId: true },
        distinct: ['roomId'],
      });
      roomsOccupiedNow = occ.length;
      roomsFreeNow = Math.max(0, totalActiveRooms - roomsOccupiedNow);
    }

    return {
      users: { total: totalUsers, pending: pendingUsers, active: activeUsers },
      reservations: { today: todayReservations, week: weekReservations },
      rooms: { total: totalActiveRooms, freeNow: roomsFreeNow, occupiedNow: roomsOccupiedNow },
      week: { start: weekStart, end: weekEnd },
      asOf: now.format('YYYY-MM-DD HH:mm'),
    };
  }
}
