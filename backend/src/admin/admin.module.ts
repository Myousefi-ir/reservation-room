import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminReservationsController } from './admin-reservations.controller';
import { AdminReservationsService } from './admin-reservations.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  controllers: [AdminUsersController, AdminReservationsController, AdminDashboardController],
  providers: [AdminUsersService, AdminReservationsService, AdminDashboardService],
})
export class AdminModule {}
