import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SMS_PROVIDER, SmsProvider } from './sms.types';
import { ConsoleSmsProvider } from './providers/console-sms.provider';
import { SmsService } from './sms.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SmsProvider => {
        const choice = (config.get<string>('SMS_PROVIDER') || 'console').toLowerCase();
        if (choice !== 'console') {
          // Real adapters land in phase 2; until then we degrade to console.
          new Logger('SMS').warn(
            `SMS_PROVIDER="${choice}" is not wired yet (phase 2). Falling back to console provider.`,
          );
        }
        return new ConsoleSmsProvider();
      },
    },
    SmsService,
  ],
  exports: [SmsService],
})
export class SmsModule {}
