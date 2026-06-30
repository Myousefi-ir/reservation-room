import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Autocomplete source for the "participants" mention field. Active users only. */
  async search(query: string, excludeId?: string) {
    const q = (query || '').trim();
    if (q.length < 1) return [];

    const users = await this.prisma.user.findMany({
      where: {
        status: 'active',
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { mobile: { contains: q } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, mobile: true },
      take: 10,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return users.map((u) => ({
      id: u.id,
      fullName: `${u.firstName} ${u.lastName}`,
      mobile: u.mobile,
    }));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const data: Prisma.UserUpdateInput = {};
    if (dto.firstName) data.firstName = dto.firstName.trim();
    if (dto.lastName) data.lastName = dto.lastName.trim();

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('برای تغییر رمز، رمز فعلی را وارد کنید.');
      }
      const ok = await bcrypt.compare(dto.currentPassword, user.password);
      if (!ok) throw new BadRequestException('رمز فعلی نادرست است.');
      data.password = await bcrypt.hash(dto.newPassword, 10);
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      mobile: updated.mobile,
      role: updated.role,
      status: updated.status,
    };
  }
}
