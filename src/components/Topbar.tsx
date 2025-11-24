import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/topics': 'Topics',
  '/consumers': 'Consumer Groups',
  '/metrics': 'Metrics & Observability',
  '/analysis': 'Data Analysis',
};

function resolveTitle(pathname: string) {
  const entry = Object.entries(titleMap).find(([key]) =>
    pathname.startsWith(key),
  );
  return entry?.[1] ?? 'wave-ui';
}

export default function Topbar() {
  const location = useLocation();
  const title = useMemo(
    () => resolveTitle(location.pathname),
    [location.pathname],
  );

  const useMocks =
    (import.meta.env.VITE_USE_MOCKS as string | undefined)?.toLowerCase() !==
    'false';
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8090';

  return (
    <div className="topbar">
      <div>
        <p className="page-title">{title}</p>
        <p className="muted" style={{ margin: 0 }}>
          Wave MQ control plane - single node prototype
        </p>
      </div>
      <div className="actions">
        <span className="pill">{apiBase}</span>
        <span className={`pill ${useMocks ? '' : 'success'}`}>
          {useMocks ? 'Mock data' : 'Live API'}
        </span>
      </div>
    </div>
  );
}
