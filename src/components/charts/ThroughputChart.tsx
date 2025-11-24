import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  data: Array<{ time: string; produced: number; consumed: number }>;
  title?: string;
}

export default function ThroughputChart({ data, title }: Props) {
  return (
    <div className="card chart-card">
      {title && <p className="muted">{title}</p>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="time" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="produced"
            stroke="#3be0b4"
            strokeWidth={2.2}
            dot={false}
            name="Produced/s"
          />
          <Line
            type="monotone"
            dataKey="consumed"
            stroke="#ffb347"
            strokeWidth={2.2}
            dot={false}
            name="Consumed/s"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
