import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export const Sparkline: React.FC<SparklineProps> = React.memo(({ data, width = 80, height = 30, color = '#d32f2f' }) => {
  if (!data || data.length < 2) return <span style={{ color: '#999', fontSize: '0.8rem' }}>—</span>;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 20; // Default range if flat to show line in middle

  // Add some padding to the range so points don't touch the edges
  const padding = range * 0.1;
  const effectiveMin = min - padding;
  const effectiveMax = max + padding;
  const effectiveRange = effectiveMax - effectiveMin;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - effectiveMin) / effectiveRange) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* Small dot on the last point to indicate current state */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - effectiveMin) / effectiveRange) * height}
        r="3"
        fill={color}
      />
    </svg>
  );
});
