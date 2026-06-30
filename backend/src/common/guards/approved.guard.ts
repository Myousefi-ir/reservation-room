import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * Ensures the authenticated user has been approved by an admin (status=active).
 * Public routes are skipped.
 */
@Injectable()
export class ApprovedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const user: AuthUser = context.switchToHttp().getRequest().user;
    if (!user) return false;
    if (user.status !== 'active') {
      throw new ForbiddenException('حساب کاربری شما هنوز تأیید نشده است.');
    }
    return true;
  }
}
