import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReservationDto) {
    return this.reservations.create(user.id, dto);
  }

  @Get('me')
  listMine(@CurrentUser() user: AuthUser) {
    return this.reservations.listMine(user.id);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reservations.cancel(user.id, id);
  }

  @Get(':id/calendar.ics')
  async ics(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { filename, content } = await this.reservations.getIcs(id, user);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }

  @Get(':id/google-calendar')
  google(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.reservations.getGoogleUrl(id, user);
  }
}
