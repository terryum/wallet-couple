/**
 * Type definitions for officecrypto-tool
 */

declare module 'officecrypto-tool' {
  interface DecryptOptions {
    password: string;
  }

  interface EncryptOptions {
    password: string;
  }

  /**
   * Check if a buffer contains an encrypted Office file
   */
  export function isEncrypted(buffer: Buffer): boolean;

  /**
   * Decrypt an encrypted Office file
   */
  export function decrypt(buffer: Buffer, options: DecryptOptions): Promise<Buffer>;

  /**
   * Encrypt an Office file
   */
  export function encrypt(buffer: Buffer, options: EncryptOptions): Promise<Buffer>;
}
