import { Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  get(@Query('date') date: string, @Query('roomId') roomId?: string) {
    return this.availability.getAvailability(date, roomId || undefined);
  }
}
