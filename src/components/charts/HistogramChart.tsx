import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  data: Array<{ bucket: string; count: number }>;
  title?: string;
}

export default function HistogramChart({ data, title }: Props) {
  return (
    <div className="card chart-card">
      {title && <p className="muted">{title}</p>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#ffb347" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
