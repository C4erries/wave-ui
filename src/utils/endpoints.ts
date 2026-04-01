export interface EndpointDisplay {
  raw: string;
  label: string;
  url?: string;
  derivedFromBrowserHost: boolean;
}

export function resolveEndpointDisplay(
  endpoint: string | null | undefined,
  scheme?: 'http' | 'https' | 'mqtt' | 'tcp',
): EndpointDisplay {
  const raw = (endpoint ?? '').trim();
  if (!raw) {
    return {
      raw: '',
      label: 'not configured',
      derivedFromBrowserHost: false,
    };
  }

  if (raw.includes('://')) {
    return {
      raw,
      label: raw,
      url: raw,
      derivedFromBrowserHost: false,
    };
  }

  const browserHost =
    typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';

  const bindLikeHosts = new Set(['', '0.0.0.0', '::', '[::]']);
  const [hostPart, portPart] = splitHostPort(raw);
  const useBrowserHost = bindLikeHosts.has(hostPart);
  const host = useBrowserHost ? browserHost : hostPart;
  const label = portPart ? `${host}:${portPart}` : host;

  return {
    raw,
    label,
    url: scheme === 'http' || scheme === 'https' ? `${scheme}://${label}` : undefined,
    derivedFromBrowserHost: useBrowserHost,
  };
}

function splitHostPort(value: string): [string, string] {
  if (value.startsWith(':')) {
    return ['', value.slice(1)];
  }

  const lastColon = value.lastIndexOf(':');
  if (lastColon <= 0 || lastColon === value.length - 1) {
    return [value, ''];
  }

  return [value.slice(0, lastColon), value.slice(lastColon + 1)];
}
