export interface PayloadInfo {
  kind: 'json' | 'number' | 'text' | 'binary' | 'float64';
  display: string;
  badges: string[];
  numericValue: number | null;
  byteLength?: number;
}

const BASE64_PREFIX = 'base64:';

export function inspectPayload(raw: string): PayloadInfo {
  const parsedJson = tryParseJSON(raw);
  if (parsedJson !== null) {
    const numericValue = extractNumericFromJSON(parsedJson);
    return {
      kind: typeof parsedJson === 'number' ? 'number' : 'json',
      display: JSON.stringify(parsedJson, null, 2),
      badges: typeof parsedJson === 'number' ? ['json', 'number'] : ['json'],
      numericValue,
    };
  }

  const direct = Number(raw);
  if (Number.isFinite(direct)) {
    return {
      kind: 'number',
      display: raw,
      badges: ['text', 'number'],
      numericValue: direct,
    };
  }

  const binary = decodeBase64Payload(raw);
  if (binary) {
    const float64 = decodeFloat64(binary.bytes);
    const badges = ['base64', `bytes:${binary.bytes.length}`];
    if (float64 !== null) {
      badges.push('float64');
      return {
        kind: 'float64',
        display: `${float64}\n\nhex: ${bytesToHex(binary.bytes)}`,
        badges,
        numericValue: float64,
        byteLength: binary.bytes.length,
      };
    }

    return {
      kind: 'binary',
      display: bytesToHex(binary.bytes),
      badges,
      numericValue: null,
      byteLength: binary.bytes.length,
    };
  }

  return {
    kind: 'text',
    display: raw,
    badges: ['text'],
    numericValue: null,
  };
}

export function prettyPayload(raw: string): string {
  return inspectPayload(raw).display;
}

export function parseNumericPayload(raw: string): number | null {
  return inspectPayload(raw).numericValue;
}

function tryParseJSON(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractNumericFromJSON(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    const candidate =
      (value as Record<string, unknown>).value ??
      (value as Record<string, unknown>).total ??
      (value as Record<string, unknown>).reading;
    const numeric = Number(candidate);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function decodeBase64Payload(raw: string): { bytes: Uint8Array } | null {
  if (!raw.startsWith(BASE64_PREFIX)) {
    return null;
  }

  try {
    const base64 = raw.slice(BASE64_PREFIX.length);
    const decoded = atob(base64);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return { bytes };
  } catch {
    return null;
  }
}

function decodeFloat64(bytes: Uint8Array): number | null {
  if (bytes.byteLength !== 8) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const value = view.getFloat64(0, false);
  return Number.isFinite(value) ? value : null;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join(' ');
}
