import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { LeaveService } from './leave.service';
import { CreateLeaveDto, UpdateLeaveDto } from './dto/leave.dto';

@Controller('doctor/leave')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  async createLeave(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateLeaveDto,
  ) {
    const leave = await this.leaveService.createLeave(user.id, dto);
    return {
      message: 'Leave applied successfully',
      data: leave,
    };
  }

  @Get()
  async getLeaves(@CurrentUser() user: { id: string }) {
    const leaves = await this.leaveService.getLeaves(user.id);
    return {
      message: 'Leaves retrieved successfully',
      data: leaves,
    };
  }

  @Patch(':id')
  async updateLeave(
    @CurrentUser() user: { id: string },
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Invalid leave ID format. Expected a valid UUID.'),
      }),
    )
    id: string,
    @Body() dto: UpdateLeaveDto,
  ) {
    const leave = await this.leaveService.updateLeave(user.id, id, dto);
    return {
      message: 'Leave updated successfully',
      data: leave,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteLeave(
    @CurrentUser() user: { id: string },
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Invalid leave ID format. Expected a valid UUID.'),
      }),
    )
    id: string,
  ) {
    await this.leaveService.deleteLeave(user.id, id);
    return {
      message: 'Leave deleted successfully',
    };
  }
}
