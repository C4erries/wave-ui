import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchConsumerGroups } from '@/api/brokerApi';
import type { ConsumerGroup } from '@/types';
import { formatDate, formatNumber } from '@/utils/format';

export default function ConsumerGroups() {
  const [groups, setGroups] = useState<ConsumerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchConsumerGroups();
      setGroups(data);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 5_000);
    return () => window.clearInterval(id);
  }, [load]);

  const totals = useMemo(() => {
    const totalLag = groups.reduce(
      (acc, group) => acc + group.assignments.reduce((sum, assignment) => sum + assignment.lag, 0),
      0,
    );
    const totalAssignments = groups.reduce((acc, group) => acc + group.assignments.length, 0);
    return { totalLag, totalAssignments };
  }, [groups]);

  if (loading) return <p className="muted">Loading consumer groups...</p>;

  return (
    <div className="layout-grid" style={{ gap: 16 }}>
      <div className="topbar" style={{ marginBottom: 0 }}>
        <div>
          <h3 style={{ margin: '0 0 4px' }}>Consumer groups</h3>
          <p className="muted" style={{ margin: 0 }}>
            Committed offsets, lag, and active assignment snapshots from /api/consumers.
          </p>
        </div>
        <div className="actions">
          {lastUpdated && <span className="tag">Updated {formatDate(lastUpdated)}</span>}
          <button className="button secondary" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card">
          <p className="error-text" style={{ margin: 0 }}>
            Failed to load consumer groups: {error}
          </p>
        </div>
      )}

      <div className="layout-grid three">
        <div className="stat-item">
          <div className="label">Groups</div>
          <div className="value">{groups.length}</div>
        </div>
        <div className="stat-item">
          <div className="label">Assignments</div>
          <div className="value">{totals.totalAssignments}</div>
        </div>
        <div className="stat-item">
          <div className="label">Total lag</div>
          <div className="value">{formatNumber(totals.totalLag)}</div>
        </div>
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Groups</h3>
          <span className="muted">{groups.length} groups</span>
        </div>
        {groups.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Members</th>
                <th>Topics</th>
                <th>Total lag</th>
                <th>Assignments</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const uniqueTopics = new Set(group.assignments.map((a) => a.topic)).size;
                const totalLag = group.assignments.reduce((acc, a) => acc + a.lag, 0);
                return (
                  <tr key={group.name}>
                    <td>{group.name}</td>
                    <td>{group.members}</td>
                    <td>{uniqueTopics}</td>
                    <td>{formatNumber(totalLag)}</td>
                    <td>
                      <AssignmentPreview assignments={group.assignments} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No consumer groups yet. Start an SDK, MQTT, or HTTP consumer and refresh this page.
          </p>
        )}
      </div>
    </div>
  );
}

function AssignmentPreview({
  assignments,
}: {
  assignments: ConsumerGroup['assignments'];
}) {
  const text = useMemo(() => {
    return assignments
      .slice(0, 4)
      .map(
        (a) =>
          `${a.topic} p${a.partition}: committed ${a.committedOffset}, hwm ${a.highWatermark}, lag ${a.lag}`,
      )
      .join(' | ');
  }, [assignments]);

  return (
    <span className="muted">
      {text || 'No assignments'}
      {assignments.length > 4 ? ' ...' : ''}
    </span>
  );
}
