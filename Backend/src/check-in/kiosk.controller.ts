import { Body, Controller, Post } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { KioskScanDto } from './dto/kiosk-scan.dto';

/**
 * Public kiosk endpoints — no login required.
 * Scanning QR only sends a check-in REQUEST to the patient's phone.
 * Patient must approve before check-in happens.
 */
@Controller('kiosk')
export class KioskController {
  constructor(private readonly checkInService: CheckInService) {}

  @Post('scan')
  scan(@Body() dto: KioskScanDto) {
    return this.checkInService.requestCheckInFromKiosk(dto.appointmentId);
  }
}
