import { Inject, Injectable, Logger } from '@nestjs/common';
import { SMS_PROVIDER, SmsProvider } from './sms.types';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(@Inject(SMS_PROVIDER) private readonly provider: SmsProvider) {}

  /** Best-effort send; failures are logged, never thrown into the request flow. */
  async send(to: string, message: string): Promise<void> {
    try {
      await this.provider.send(to, message);
    } catch (err) {
      this.logger.warn(`SMS send failed for ${to}: ${(err as Error).message}`);
    }
  }
}
