import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.room.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  listAll() {
    return this.prisma.room.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateRoomDto) {
    const exists = await this.prisma.room.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('اتاقی با این نام وجود دارد.');
    return this.prisma.room.create({
      data: { name: dto.name.trim(), description: dto.description?.trim() },
    });
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.ensureExists(id);
    if (dto.name) {
      const clash = await this.prisma.room.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (clash) throw new ConflictException('اتاقی با این نام وجود دارد.');
    }
    return this.prisma.room.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        isActive: dto.isActive,
      },
    });
  }

  private async ensureExists(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('اتاق یافت نشد.');
    return room;
  }
}
