import zlib from 'zlib';

/**
 * Compresses an array of messages using Brotli and returns a base64 encoded string.
 */
export function compressMessages(messages: any[]): string {
  const jsonStr = JSON.stringify(messages);
  const buffer = Buffer.from(jsonStr, 'utf-8');
  const compressed = zlib.brotliCompressSync(buffer);
  return compressed.toString('base64');
}

/**
 * Decompresses a base64 encoded Brotli string back into an array of messages.
 */
export function decompressMessages(base64Data: string): any[] {
  if (!base64Data) return [];
  const buffer = Buffer.from(base64Data, 'base64');
  const decompressed = zlib.brotliDecompressSync(buffer);
  const jsonStr = decompressed.toString('utf-8');
  return JSON.parse(jsonStr);
}
