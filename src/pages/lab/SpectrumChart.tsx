import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  samples: Float32Array;
  sampleRateHz: number;
}

function buildSpectrumData(samples: Float32Array, sampleRateHz: number, target = 512) {
  const n = samples.length;
  const nyquist = sampleRateHz / 2;
  const step = Math.max(1, Math.floor(n / target));
  const data: { freq: number; amp: number }[] = [];
  for (let i = 0; i < n; i += step) {
    data.push({ freq: Math.round((i * nyquist) / (n - 1)), amp: samples[i] });
  }
  return data;
}

export default function SpectrumChart({ samples, sampleRateHz }: Props) {
  const data = buildSpectrumData(samples, sampleRateHz);
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
        <XAxis
          dataKey="freq"
          type="number"
          domain={['dataMin', 'dataMax']}
          label={{ value: 'Частота, Гц', position: 'insideBottom', offset: -10 }}
          tickCount={6}
        />
        <YAxis
          label={{ value: 'Амплитуда', angle: -90, position: 'insideLeft', offset: 10 }}
          tickCount={5}
        />
        <Tooltip formatter={(v: number) => v.toFixed(1)} labelFormatter={(l) => `${l} Гц`} />
        <Line
          type="monotone"
          dataKey="amp"
          dot={false}
          isAnimationActive={false}
          stroke="var(--accent)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
