import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  data: Array<{ x: number | string; value: number }>;
  title?: string;
}

export default function WaveformChart({ data, title }: Props) {
  return (
    <div className="card chart-card">
      {title && <p className="muted">{title}</p>}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="x" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3be0b4"
            fill="rgba(59, 224, 180, 0.25)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
