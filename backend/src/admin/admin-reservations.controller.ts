import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { AdminReservationsService } from './admin-reservations.service';
import { RejectReservationDto, UpdateReservationDto } from './dto/update-reservation.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Roles('admin')
@Controller('admin/reservations')
export class AdminReservationsController {
  constructor(private readonly reservations: AdminReservationsService) {}

  @Get()
  list(
    @Query('date') date?: string,
    @Query('roomId') roomId?: string,
    @Query('status') status?: ReservationStatus,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.reservations.list({
      date,
      roomId,
      status,
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservations.update(admin.id, id, dto);
  }

  @Patch(':id/reject')
  reject(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectReservationDto,
  ) {
    return this.reservations.reject(admin.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.reservations.remove(admin.id, id);
  }
}
