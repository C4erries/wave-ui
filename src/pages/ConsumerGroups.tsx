import { useEffect, useMemo, useState } from 'react';
import { fetchConsumerGroups } from '@/api/brokerApi';
import type { ConsumerGroup } from '@/types';
import { formatNumber } from '@/utils/format';

export default function ConsumerGroups() {
  const [groups, setGroups] = useState<ConsumerGroup[]>([]);

  useEffect(() => {
    fetchConsumerGroups().then(setGroups).catch(console.error);
  }, []);

  return (
    <div className="card">
      <div className="topbar" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Consumer groups</h3>
        <span className="muted">{groups.length} groups</span>
      </div>
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
            const uniqueTopics = new Set(
              group.assignments.map((a) => a.topic),
            ).size;
            const totalLag = group.assignments.reduce(
              (acc, a) => acc + a.lag,
              0,
            );
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
      .slice(0, 3)
      .map(
        (a) =>
          `${a.topic} p${a.partition} - offset ${a.committedOffset} / hwm ${a.highWatermark} (lag ${a.lag})`,
      )
      .join(' | ');
  }, [assignments]);

  return (
    <span className="muted">
      {text}
      {assignments.length > 3 ? ' ...' : ''}
    </span>
  );
}
