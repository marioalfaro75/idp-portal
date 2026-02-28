import { inflateRawSync } from 'node:zlib';

interface CentralDirEntry {
  fileName: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
}

/**
 * Parse the central directory to get file metadata.
 */
function parseCentralDirectory(zipBuffer: Buffer): CentralDirEntry[] {
  // Find End of Central Directory Record (signature 0x06054b50)
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= Math.max(0, zipBuffer.length - 65557); i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP file: missing end of central directory');
  }

  const numEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  const entries: CentralDirEntry[] = [];
  let pos = cdOffset;
  for (let i = 0; i < numEntries; i++) {
    if (zipBuffer.readUInt32LE(pos) !== 0x02014b50) break;
    const compressionMethod = zipBuffer.readUInt16LE(pos + 10);
    const compressedSize = zipBuffer.readUInt32LE(pos + 20);
    const fileNameLength = zipBuffer.readUInt16LE(pos + 28);
    const extraFieldLength = zipBuffer.readUInt16LE(pos + 30);
    const commentLength = zipBuffer.readUInt16LE(pos + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(pos + 42);
    const fileName = zipBuffer.subarray(pos + 46, pos + 46 + fileNameLength).toString('utf8');
    entries.push({ fileName, compressionMethod, compressedSize, localHeaderOffset });
    pos += 46 + fileNameLength + extraFieldLength + commentLength;
  }
  return entries;
}

/**
 * Extract a file from a ZIP buffer using its central directory entry.
 */
function extractEntry(zipBuffer: Buffer, entry: CentralDirEntry): Buffer {
  const localOffset = entry.localHeaderOffset;
  if (zipBuffer.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error('Invalid ZIP file: bad local file header');
  }
  const fileNameLength = zipBuffer.readUInt16LE(localOffset + 26);
  const extraFieldLength = zipBuffer.readUInt16LE(localOffset + 28);
  const dataOffset = localOffset + 30 + fileNameLength + extraFieldLength;
  const compressedData = zipBuffer.subarray(dataOffset, dataOffset + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return Buffer.from(compressedData);
  } else if (entry.compressionMethod === 8) {
    return inflateRawSync(compressedData);
  } else {
    throw new Error(`Unsupported ZIP compression method: ${entry.compressionMethod}`);
  }
}

/**
 * Extract the terraform binary from a ZIP buffer.
 * Handles multi-file ZIP archives (e.g. Terraform zips contain LICENSE.txt + terraform).
 */
export function extractFirstFile(zipBuffer: Buffer): Buffer {
  const entries = parseCentralDirectory(zipBuffer);
  if (entries.length === 0) {
    throw new Error('ZIP archive is empty');
  }

  // Prefer the entry named "terraform", fall back to the largest entry
  const terraformEntry = entries.find(e => e.fileName === 'terraform' || e.fileName === 'terraform.exe');
  const entry = terraformEntry || entries.reduce((a, b) => a.compressedSize > b.compressedSize ? a : b);

  return extractEntry(zipBuffer, entry);
}

/**
 * Extract a specific file from a ZIP buffer by name.
 * Falls back to the largest entry if name is not provided.
 */
export function extractFileFromZip(zipBuffer: Buffer, name?: string): Buffer {
  const entries = parseCentralDirectory(zipBuffer);
  if (entries.length === 0) {
    throw new Error('ZIP archive is empty');
  }

  if (name) {
    const entry = entries.find(e => e.fileName === name || e.fileName.endsWith('/' + name));
    if (!entry) {
      throw new Error(`File "${name}" not found in ZIP archive`);
    }
    return extractEntry(zipBuffer, entry);
  }

  return extractEntry(zipBuffer, entries.reduce((a, b) => a.compressedSize > b.compressedSize ? a : b));
}
