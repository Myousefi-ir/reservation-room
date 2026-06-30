import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

function publicUser(u: {
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
    if (exists) {
      throw new ConflictException('این شماره موبایل قبلاً ثبت شده است.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        mobile: dto.mobile,
        password: passwordHash,
        status: 'pending',
        role: 'user',
      },
    });

    return {
      message: 'ثبت‌نام انجام شد. حساب شما پس از تأیید مدیر فعال می‌شود.',
      user: publicUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
    if (!user) {
      throw new UnauthorizedException('شماره موبایل یا رمز عبور نادرست است.');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('شماره موبایل یا رمز عبور نادرست است.');
    }

    if (user.status === 'pending') {
      throw new ForbiddenException('حساب شما هنوز توسط مدیر تأیید نشده است.');
    }
    if (user.status === 'rejected') {
      throw new ForbiddenException('حساب شما رد شده است؛ با مدیر تماس بگیرید.');
    }

    const tokens = await this.tokens.issueTokens(user.id);
    return { ...tokens, user: publicUser(user) };
  }

  async refresh(refreshToken: string) {
    const { userId, tokens } = await this.tokens.rotate(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { ...tokens, user: publicUser(user) };
  }

  async logout(refreshToken: string) {
    await this.tokens.revoke(refreshToken);
    return { message: 'خروج انجام شد.' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return publicUser(user);
  }
}
