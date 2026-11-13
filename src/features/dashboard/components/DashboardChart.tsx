import { useId } from 'react';

export interface DashboardChartPoint {
  label: string;
  value: number;
}

interface DashboardChartProps {
  title: string;
  points: readonly DashboardChartPoint[];
  type?: 'bar' | 'line' | 'donut';
  valueLabel?: string;
}

const colors = [
  'var(--color-primary)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-information)',
  'var(--color-error)',
  'var(--color-action-secondary)',
];

function formatValue(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function getTrendLabel(label: string): string {
  if (label.length <= 10) return label;
  const date = new Date(label);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }
  return `${label.slice(0, 9)}…`;
}

function renderBarChart(points: readonly DashboardChartPoint[]) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const width = 640;
  const height = 220;
  const chartHeight = 166;
  const slot = width / points.length;
  const barWidth = Math.max(2, Math.min(34, slot * 0.62));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {points.map((point, index) => {
        const barHeight = (point.value / max) * chartHeight;
        const x = index * slot + (slot - barWidth) / 2;
        const y = chartHeight - barHeight + 8;
        const showLabel = points.length <= 12 || index % Math.ceil(points.length / 8) === 0;
        return (
          <g key={`${point.label}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="3" fill={colors[0]} />
            {showLabel && (
              <text x={index * slot + slot / 2} y="202" textAnchor="middle">
                {getTrendLabel(point.label)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function renderLineChart(points: readonly DashboardChartPoint[]) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const width = 640;
  const height = 220;
  const chartHeight = 166;
  const slot = width / Math.max(points.length - 1, 1);
  const getX = (index: number) => (points.length === 1 ? width / 2 : index * slot);
  const getY = (value: number) => chartHeight - (value / max) * chartHeight + 8;
  const coordinates = points.map((point, index) => `${getX(index)},${getY(point.value)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <polyline points={coordinates} fill="none" stroke={colors[0]} strokeWidth="3" />
      {points.map((point, index) => {
        const showLabel = points.length <= 12 || index % Math.ceil(points.length / 8) === 0;
        return (
          <g key={`${point.label}-${index}`}>
            <circle cx={getX(index)} cy={getY(point.value)} r="4" fill={colors[0]} />
            {showLabel && (
              <text x={getX(index)} y="202" textAnchor="middle">
                {getTrendLabel(point.label)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function renderDonutChart(points: readonly DashboardChartPoint[]) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const circumference = 2 * Math.PI * 42;
  let offset = 0;

  return (
    <svg viewBox="0 0 120 120" className="dashboard-chart__donut" aria-hidden="true">
      {points.map((point, index) => {
        const length = (point.value / total) * circumference;
        const circle = (
          <circle
            key={`${point.label}-${index}`}
            cx="60"
            cy="60"
            r="42"
            fill="none"
            stroke={colors[index % colors.length]}
            strokeWidth="18"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          />
        );
        offset += length;
        return circle;
      })}
      <text x="60" y="64" textAnchor="middle">
        {formatValue(total)}
      </text>
    </svg>
  );
}

export function DashboardChart({
  title,
  points,
  type = 'bar',
  valueLabel = 'records',
}: DashboardChartProps) {
  const id = useId();
  const validPoints = points.filter(
    (point) => Number.isFinite(point.value) && point.value >= 0 && point.label.trim(),
  );
  const total = validPoints.reduce((sum, point) => sum + point.value, 0);

  return (
    <figure className="dashboard-chart" aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`}>{title}</figcaption>
      {validPoints.length === 0 || total === 0 ? (
        <p className="dashboard-chart__empty">No data is available for this range.</p>
      ) : (
        <>
          <div
            className={`dashboard-chart__visual dashboard-chart__visual--${type}`}
            role="img"
            aria-label={`${title}: ${validPoints
              .map((point) => `${point.label}, ${formatValue(point.value)} ${valueLabel}`)
              .join('; ')}`}
          >
            {type === 'donut'
              ? renderDonutChart(validPoints)
              : type === 'line'
                ? renderLineChart(validPoints)
                : renderBarChart(validPoints)}
          </div>
          <details className="dashboard-chart__data">
            <summary>View chart data</summary>
            <ul>
              {validPoints.map((point, index) => (
                <li key={`${point.label}-${index}`}>
                  <span>{point.label}</span>
                  <strong>{formatValue(point.value)}</strong>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </figure>
  );
}
