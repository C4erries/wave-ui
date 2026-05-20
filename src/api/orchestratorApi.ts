import type { GraphConfig, ConfigSummary, OrchestratorStatus } from '@/pages/constructor/graphUtils';

const envUrl = (import.meta.env.VITE_ORCHESTRATOR_URL as string | undefined)?.trim();
export const orchestratorBaseURL = envUrl ? envUrl.replace(/\/$/, '') : 'http://localhost:8099';

async function orchRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${orchestratorBaseURL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      detail = parsed.error ?? text;
    } catch { /* keep raw text */ }
    throw new Error(detail || `${res.status} ${res.statusText}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function fetchOrchestratorStatus(): Promise<OrchestratorStatus> {
  return orchRequest<OrchestratorStatus>('/status');
}

export async function fetchConfigs(): Promise<ConfigSummary[]> {
  return orchRequest<ConfigSummary[]>('/configs');
}

export async function fetchConfig(name: string): Promise<GraphConfig> {
  return orchRequest<GraphConfig>(`/configs/${encodeURIComponent(name)}`);
}

export async function applyGraph(graph: GraphConfig): Promise<{ ok: boolean; mode: string }> {
  return orchRequest<{ ok: boolean; mode: string }>('/apply', {
    method: 'POST',
    body: JSON.stringify(graph),
  });
}
