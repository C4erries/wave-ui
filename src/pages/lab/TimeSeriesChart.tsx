import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  samples: Float32Array;
  sampleRateHz: number;
}

function downsample(samples: Float32Array, sampleRateHz: number, target = 1024) {
  const step = Math.max(1, Math.floor(samples.length / target));
  const data: { x: number; y: number }[] = [];
  for (let i = 0; i < samples.length; i += step) {
    data.push({ x: +(i / sampleRateHz * 1000).toFixed(3), y: samples[i] });
  }
  return data;
}

export default function TimeSeriesChart({ samples, sampleRateHz }: Props) {
  const data = downsample(samples, sampleRateHz);
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
        <XAxis
          dataKey="x"
          type="number"
          domain={['dataMin', 'dataMax']}
          label={{ value: 'Время, мс', position: 'insideBottom', offset: -10 }}
          tickCount={6}
        />
        <YAxis
          label={{ value: 'Амплитуда', angle: -90, position: 'insideLeft', offset: 10 }}
          tickCount={5}
        />
        <Tooltip formatter={(v: number) => v.toFixed(4)} labelFormatter={(l) => `${l} мс`} />
        <Area
          type="monotone"
          dataKey="y"
          dot={false}
          isAnimationActive={false}
          stroke="var(--accent)"
          fill="var(--accent)"
          fillOpacity={0.15}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
