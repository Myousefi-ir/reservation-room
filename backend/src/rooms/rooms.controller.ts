import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller()
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  // ---- user ----
  @Get('rooms')
  listActive() {
    return this.rooms.listActive();
  }

  // ---- admin ----
  @Roles('admin')
  @Get('admin/rooms')
  listAll() {
    return this.rooms.listAll();
  }

  @Roles('admin')
  @Post('admin/rooms')
  create(@Body() dto: CreateRoomDto) {
    return this.rooms.create(dto);
  }

  @Roles('admin')
  @Patch('admin/rooms/:id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.rooms.update(id, dto);
  }
}
