import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTopics } from '@/api/brokerApi';
import type { Topic } from '@/types';

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    fetchTopics().then(setTopics).catch(console.error);
  }, []);

  return (
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
  );
}
