import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createTopic, fetchTopics } from '@/api/brokerApi';
import type { Topic } from '@/types';

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [name, setName] = useState('');
  const [partitions, setPartitions] = useState(1);
  const [replicationFactor, setReplicationFactor] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  async function loadTopics() {
    try {
      const data = await fetchTopics();
      setTopics(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (partitions < 1) {
      setError('Partitions must be >= 1');
      return;
    }
    setSubmitting(true);
    try {
      await createTopic({ name: name.trim(), partitions, replicationFactor });
      setName('');
      setPartitions(1);
      setReplicationFactor(1);
      await loadTopics();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="layout-grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="topbar" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Create topic</h3>
          <span className="muted">POST /api/topics</span>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label className="muted">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="telemetry"
            />
          </div>
          <div className="form-field">
            <label className="muted">Partitions</label>
            <input
              className="input"
              type="number"
              min={1}
              value={partitions}
              onChange={(e) => setPartitions(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label className="muted">Replication factor</label>
            <input
              className="input"
              type="number"
              min={1}
              value={replicationFactor}
              onChange={(e) => setReplicationFactor(Number(e.target.value))}
            />
          </div>
          <button className="button" onClick={handleCreate} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create topic'}
          </button>
        </div>
        {error && <p className="muted" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Topics</h3>
          <span className="muted">{topics.length} total</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Partitions</th>
              <th>Replication</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic.name}>
                <td>{topic.name}</td>
                <td>{topic.partitions}</td>
                <td>{topic.replicationFactor}</td>
                <td>
                  <Link to={`/topics/${topic.name}`} className="tag">
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
