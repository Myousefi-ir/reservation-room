/**
 * Phase-2 SMS abstraction.
 *
 * The reservation flow depends only on this interface, never on a concrete
 * vendor. To go live in phase 2, add a KavenegarSmsProvider / MelipayamakSmsProvider
 * that implements `SmsProvider`, register it in SmsModule, and set SMS_PROVIDER.
 * No business logic changes.
 */
export interface SmsProvider {
  send(to: string, message: string): Promise<void>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
