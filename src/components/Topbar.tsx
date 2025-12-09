import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { fetchBrokerInfo, fetchControllerStatus } from '@/api/brokerApi';
import type { BrokerInfo, ControllerStatus } from '@/types';

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/topics': 'Topics',
  '/consumers': 'Consumer Groups',
  '/metrics': 'Metrics & Observability',
  '/analysis': 'Data Analysis',
};

const controllerTitleMap = Object.entries(titleMap);

function resolveTitle(pathname: string) {
  const entry = controllerTitleMap.find(([key]) => pathname.startsWith(key));
  return entry?.[1] ?? 'wave-ui';
}

const apiEnvBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const apiBaseLabel = apiEnvBase || 'relative /api';

export default function Topbar() {
  const location = useLocation();
  const title = useMemo(
    () => resolveTitle(location.pathname),
    [location.pathname],
  );

  const [controller, setController] = useState<ControllerStatus | null>(null);
  const [brokerInfo, setBrokerInfo] = useState<BrokerInfo | null>(null);

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      try {
        const [controllerResp, brokerResp] = await Promise.all([
          fetchControllerStatus().catch((err) => {
            console.warn('Controller status unavailable', err);
            return null;
          }),
          fetchBrokerInfo().catch((err) => {
            console.warn('Broker info unavailable', err);
            return null;
          }),
        ]);
        if (!active) return;
        setController(controllerResp);
        setBrokerInfo(brokerResp);
      } catch (err) {
        console.error('Failed to refresh controller data', err);
      }
    }
    loadStatus();
    return () => {
      active = false;
    };
  }, []);

  const useMocks =
    (import.meta.env.VITE_USE_MOCKS as string | undefined)?.toLowerCase() !==
    'false';
  const controllerMode =
    controller?.mode ?? brokerInfo?.controllerMode ?? 'single';
  const raftState = controller?.raftState ?? 'unknown';
  const term = controller?.term ?? 0;
  const peers = controller?.peers ?? [];
  const peerList = peers.length
    ? peers
        .map((peer) => `${peer.id}${peer.address ? `@${peer.address}` : ''}`)
        .join(', ')
    : 'none';
  const replicationFactor = brokerInfo?.replicationFactor ?? 1;
  const showExperimentBanner = controllerMode === 'raft' && replicationFactor > 1;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="page-title">{title}</p>
          <p className="muted" style={{ margin: 0 }}>
            Wave MQ control plane - single node prototype
          </p>
          <div className="topbar-meta">
            <span className="tag">Mode: {controllerMode}</span>
            <span className="tag">
              State: {raftState} · term {term}
            </span>
            <span className="tag">
              Peers: {peerList}
            </span>
          </div>
        </div>
        <div className="actions">
          <span className="pill">{apiBaseLabel}</span>
          <span className={`pill ${useMocks ? '' : 'success'}`}>
            {useMocks ? 'Mock data' : 'Live API'}
          </span>
        </div>
      </div>
      {showExperimentBanner && (
        <div className="experiment-banner">
          Raft mode with RF&gt;1 is experimental and intended for demos only; it does not
          guarantee production reliability.
        </div>
      )}
    </>
  );
}
