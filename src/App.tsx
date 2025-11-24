import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Topics from './pages/Topics';
import TopicDetails from './pages/TopicDetails';
import ConsumerGroups from './pages/ConsumerGroups';
import Metrics from './pages/Metrics';
import DataAnalysis from './pages/DataAnalysis';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/topics/:name" element={<TopicDetails />} />
          <Route path="/consumers" element={<ConsumerGroups />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/analysis" element={<DataAnalysis />} />
        </Routes>
      </Layout>
    </Router>
  );
}
