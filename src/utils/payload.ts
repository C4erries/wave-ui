export interface PayloadInfo {
  kind: 'json' | 'number' | 'text' | 'binary' | 'float64';
  display: string;
  badges: string[];
  numericValue: number | null;
  contentType?: string;
  byteLength?: number;
}

const BASE64_PREFIX = 'base64:';

export function inspectPayload(raw: string, contentType?: string | null): PayloadInfo {
  const normalizedType = normalizeContentType(contentType);
  if (normalizedType) {
    return inspectTypedPayload(raw, normalizedType);
  }

  return inspectLegacyPayload(raw);
}

export function prettyPayload(raw: string, contentType?: string | null): string {
  return inspectPayload(raw, contentType).display;
}

export function parseNumericPayload(raw: string, contentType?: string | null): number | null {
  return inspectPayload(raw, contentType).numericValue;
}

function tryParseJSON(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function inspectTypedPayload(raw: string, contentType: string): PayloadInfo {
  const badges = [`content-type: ${contentType}`];

  if (isJsonContentType(contentType)) {
    const text = decodeTextPayload(raw);
    const parsedJson = tryParseJSON(text);
    if (parsedJson !== null) {
      const numericValue = extractNumericFromJSON(parsedJson);
      return {
        kind: typeof parsedJson === 'number' ? 'number' : 'json',
        display: JSON.stringify(parsedJson, null, 2),
        badges: typeof parsedJson === 'number' ? [...badges, 'json', 'number'] : [...badges, 'json'],
        numericValue,
        contentType,
      };
    }

    return {
      kind: 'text',
      display: text,
      badges: [...badges, 'json', 'text'],
      numericValue: null,
      contentType,
    };
  }

  if (isTextContentType(contentType)) {
    const text = decodeTextPayload(raw);
    return {
      kind: 'text',
      display: text,
      badges: [...badges, 'text'],
      numericValue: null,
      contentType,
    };
  }

  const bytes = decodePayloadBytes(raw);
  if (contentType === 'application/x.float64') {
    const float64 = decodeFloat64(bytes);
    if (float64 !== null) {
      return {
        kind: 'float64',
        display: `${float64}\n\nhex: ${bytesToHex(bytes)}`,
        badges: [...badges, 'binary', 'float64', `bytes:${bytes.length}`],
        numericValue: float64,
        byteLength: bytes.length,
        contentType,
      };
    }
  }

  const legacyBinary = decodeBase64Payload(raw);
  if (legacyBinary) {
    return {
      kind: 'binary',
      display: bytesToHex(legacyBinary.bytes),
      badges: [...badges, 'base64', `bytes:${legacyBinary.bytes.length}`],
      numericValue: null,
      byteLength: legacyBinary.bytes.length,
      contentType,
    };
  }

  return {
    kind: 'text',
    display: decodeTextPayload(raw),
    badges: [...badges, 'text'],
    numericValue: null,
    contentType,
  };
}

function inspectLegacyPayload(raw: string): PayloadInfo {
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

function normalizeContentType(contentType?: string | null): string | null {
  const value = contentType?.trim().toLowerCase() ?? '';
  if (!value) {
    return null;
  }

  return value.split(';', 1)[0].trim() || null;
}

function isJsonContentType(contentType: string): boolean {
  return contentType === 'application/json' || contentType.endsWith('+json');
}

function isTextContentType(contentType: string): boolean {
  return contentType.startsWith('text/');
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

function decodeTextPayload(raw: string): string {
  const binary = decodeBase64Payload(raw);
  if (binary) {
    return new TextDecoder('utf-8', { fatal: false }).decode(binary.bytes);
  }

  return raw;
}

function decodePayloadBytes(raw: string): Uint8Array {
  const binary = decodeBase64Payload(raw);
  if (binary) {
    return binary.bytes;
  }

  return new TextEncoder().encode(raw);
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
