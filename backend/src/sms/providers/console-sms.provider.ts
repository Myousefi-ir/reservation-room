import { Logger } from '@nestjs/common';
import { SmsProvider } from '../sms.types';

/**
 * Default no-op provider used until a real gateway is wired in phase 2.
 * It only logs, so flows that "send" SMS work end-to-end during development.
 */
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SMS');

  async send(to: string, message: string): Promise<void> {
    this.logger.log(`[console-sms] → ${to}: ${message}`);
  }
}
