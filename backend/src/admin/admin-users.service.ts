import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(status?: UserStatus) {
    const users = await this.prisma.user.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mobile: true,
        status: true,
        role: true,
        createdAt: true,
      },
    });
    return users;
  }

  private async getOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('کاربر یافت نشد.');
    return user;
  }

  async approve(adminId: string, id: string) {
    await this.getOrThrow(id);
    const user = await this.prisma.user.update({ where: { id }, data: { status: 'active' } });
    await this.audit.log({
      actorId: adminId,
      action: 'user_approved',
      entityType: 'user',
      entityId: id,
    });
    return this.publicUser(user);
  }

  async reject(adminId: string, id: string) {
    await this.getOrThrow(id);
    const user = await this.prisma.user.update({ where: { id }, data: { status: 'rejected' } });
    await this.audit.log({
      actorId: adminId,
      action: 'user_rejected',
      entityType: 'user',
      entityId: id,
    });
    return this.publicUser(user);
  }

  async makeAdmin(adminId: string, id: string) {
    await this.getOrThrow(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: 'admin', status: 'active' },
    });
    await this.audit.log({
      actorId: adminId,
      action: 'role_granted',
      entityType: 'user',
      entityId: id,
    });
    return this.publicUser(user);
  }

  async revokeAdmin(adminId: string, id: string) {
    if (adminId === id) {
      throw new BadRequestException('نمی‌توانید نقش ادمین خود را حذف کنید.');
    }
    await this.getOrThrow(id);
    const user = await this.prisma.user.update({ where: { id }, data: { role: 'user' } });
    await this.audit.log({
      actorId: adminId,
      action: 'role_revoked',
      entityType: 'user',
      entityId: id,
    });
    return this.publicUser(user);
  }

  async remove(adminId: string, id: string) {
    if (adminId === id) {
      throw new BadRequestException('نمی‌توانید حساب خود را حذف کنید.');
    }
    await this.getOrThrow(id);
    await this.prisma.user.delete({ where: { id } });
    await this.audit.log({
      actorId: adminId,
      action: 'user_deleted',
      entityType: 'user',
      entityId: id,
    });
    return { message: 'کاربر حذف شد.' };
  }

  private publicUser(u: {
    id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    role: string;
    status: string;
  }) {
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      mobile: u.mobile,
      role: u.role,
      status: u.status,
    };
  }
}
