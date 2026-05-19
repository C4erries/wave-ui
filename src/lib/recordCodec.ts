export type DecodedRecord = {
  timestampNs: bigint;
  sampleRateHz: number;
  nSamples: number;
  channelId: number;
  sourceId: number;
  samples: Float32Array;
};

export function decodeRecord(raw: string): DecodedRecord {
  const b64 = raw.startsWith('base64:') ? raw.slice(7) : raw;
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);

  if (buf.byteLength < 20)
    throw new Error(`frame too short: ${buf.byteLength} bytes`);

  const dv = new DataView(buf);
  const timestampNs = dv.getBigInt64(0, false);
  const sampleRateHz = dv.getInt32(8, false);
  const nSamples = dv.getInt32(12, false);
  const channelId = dv.getInt8(16);
  const sourceId = dv.getInt8(17);

  const expected = 20 + nSamples * 4;
  if (buf.byteLength !== expected)
    throw new Error(`length mismatch: got ${buf.byteLength}, expected ${expected}`);

  // Float32Array напрямую не подходит — буфер big-endian, читаем по одному
  const samples = new Float32Array(nSamples);
  for (let i = 0; i < nSamples; i++) {
    samples[i] = dv.getFloat32(20 + i * 4, false);
  }

  return { timestampNs, sampleRateHz, nSamples, channelId, sourceId, samples };
}
