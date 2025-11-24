import type { ReactNode } from 'react';

interface Props {
  title: string;
  value?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
}

export default function Card({ title, value, subtitle, footer }: Props) {
  return (
    <div className="card">
      <p className="muted" style={{ margin: '0 0 6px' }}>
        {title}
      </p>
      {value !== undefined && <div className="value">{value}</div>}
      {subtitle && <div className="label">{subtitle}</div>}
      {footer && <div style={{ marginTop: 10 }}>{footer}</div>}
    </div>
  );
}
