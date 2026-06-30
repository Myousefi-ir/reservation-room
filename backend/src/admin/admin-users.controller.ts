import { Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { UserStatus } from '../common/enums';
import { AdminUsersService } from './admin-users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Roles('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Query('status') status?: UserStatus) {
    return this.users.list(status);
  }

  @Patch(':id/approve')
  approve(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.users.approve(admin.id, id);
  }

  @Patch(':id/reject')
  reject(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.users.reject(admin.id, id);
  }

  @Patch(':id/make-admin')
  makeAdmin(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.users.makeAdmin(admin.id, id);
  }

  @Patch(':id/revoke-admin')
  revokeAdmin(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.users.revokeAdmin(admin.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.users.remove(admin.id, id);
  }
}
