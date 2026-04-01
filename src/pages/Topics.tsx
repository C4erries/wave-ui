import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createTopic, fetchTopics } from '@/api/brokerApi';
import type { Topic } from '@/types';
import { formatDate } from '@/utils/format';

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [name, setName] = useState('');
  const [partitions, setPartitions] = useState(1);
  const [replicationFactor, setReplicationFactor] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const loadTopics = useCallback(async () => {
    try {
      const data = await fetchTopics();
      setTopics(data);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  async function handleCreate() {
    setError(null);
    setSuccess(null);
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
      setSuccess(`Topic ${name.trim()} created`);
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
          <div>
            <h3 style={{ margin: 0 }}>Create topic</h3>
            <p className="muted" style={{ margin: 0 }}>
              POST /api/topics
            </p>
          </div>
          <button className="button secondary" onClick={() => void loadTopics()}>
            Refresh list
          </button>
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
        {error && (
          <p className="error-text" style={{ marginBottom: 0 }}>
            {error}
          </p>
        )}
        {success && (
          <p className="success-text" style={{ marginBottom: 0 }}>
            {success}
          </p>
        )}
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Topics</h3>
            <p className="muted" style={{ margin: 0 }}>
              {topics.length} total
            </p>
          </div>
          {lastUpdated && <span className="tag">Updated {formatDate(lastUpdated)}</span>}
        </div>
        {loading ? (
          <p className="muted">Loading topics...</p>
        ) : topics.length ? (
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
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No topics created yet.
          </p>
        )}
      </div>
    </div>
  );
}
