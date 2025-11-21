import { useMemo } from 'react';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleChartProps {
  data: ChartDataPoint[];
  type?: 'line' | 'bar' | 'pie';
  height?: number;
  showLabels?: boolean;
}

export default function SimpleChart({ 
  data, 
  type = 'line', 
  height = 200,
  showLabels = true 
}: SimpleChartProps) {
  const maxValue = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => d.value), 1);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-brand-muted text-sm">
        Sem dados disponíveis
      </div>
    );
  }

  if (type === 'line') {
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1 || 1)) * 100;
      const y = 100 - (point.value / maxValue) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative" style={{ height }}>
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-brand-primary"
          />
          {data.map((point, index) => {
            const x = (index / (data.length - 1 || 1)) * 100;
            const y = 100 - (point.value / maxValue) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1"
                fill="currentColor"
                className="text-brand-primary"
              />
            );
          })}
        </svg>
        {showLabels && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-brand-muted">
            {data.map((point, index) => (
              <span key={index} className="truncate" style={{ maxWidth: `${100 / data.length}%` }}>
                {point.label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'bar') {
    const barWidth = 100 / data.length;

    return (
      <div className="relative" style={{ height }}>
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {data.map((point, index) => {
            const barHeight = (point.value / maxValue) * 100;
            const x = index * barWidth;
            const y = 100 - barHeight;
            return (
              <rect
                key={index}
                x={x}
                y={y}
                width={barWidth * 0.8}
                height={barHeight}
                fill={point.color || 'currentColor'}
                className={point.color ? '' : 'text-brand-primary'}
              />
            );
          })}
        </svg>
        {showLabels && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-brand-muted">
            {data.map((point, index) => (
              <span key={index} className="truncate text-center" style={{ width: `${barWidth}%` }}>
                {point.label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Pie chart
  let currentAngle = -90;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {data.map((point, index) => {
          const percentage = (point.value / total) * 100;
          const angle = (percentage / 100) * 360;
          const startAngle = currentAngle;
          currentAngle += angle;

          const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
          const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
          const x2 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
          const y2 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
          const largeArc = angle > 180 ? 1 : 0;

          return (
            <path
              key={index}
              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={point.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`}
            />
          );
        })}
      </svg>
      {showLabels && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-brand-muted">
          <div className="font-semibold text-white">{total}</div>
          <div>Total</div>
        </div>
      )}
    </div>
  );
}

