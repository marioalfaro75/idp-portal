import { inflateRawSync } from 'node:zlib';

/**
 * Extract the first file from a ZIP buffer.
 * Handles single-file ZIP archives like Terraform release zips.
 */
export function extractFirstFile(zipBuffer: Buffer): Buffer {
  // Local file header signature = 0x04034b50
  const sig = zipBuffer.readUInt32LE(0);
  if (sig !== 0x04034b50) {
    throw new Error('Invalid ZIP file: missing local file header signature');
  }

  const compressionMethod = zipBuffer.readUInt16LE(8);
  const compressedSize = zipBuffer.readUInt32LE(18);
  const fileNameLength = zipBuffer.readUInt16LE(26);
  const extraFieldLength = zipBuffer.readUInt16LE(28);

  const dataOffset = 30 + fileNameLength + extraFieldLength;
  const compressedData = zipBuffer.subarray(dataOffset, dataOffset + compressedSize);

  if (compressionMethod === 0) {
    // Stored (no compression)
    return Buffer.from(compressedData);
  } else if (compressionMethod === 8) {
    // Deflate
    return inflateRawSync(compressedData);
  } else {
    throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
  }
}
