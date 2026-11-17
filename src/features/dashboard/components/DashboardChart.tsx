import { useId, useState } from 'react';

export interface DashboardChartPoint {
  label: string;
  value: number;
}

interface DashboardChartProps {
  title: string;
  points: readonly DashboardChartPoint[];
  type?: 'bar' | 'line' | 'donut';
  valueLabel?: string;
  compact?: boolean;
}

const colors = [
  'var(--color-primary)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-information)',
  'var(--color-error)',
  'var(--color-action-secondary)',
];

interface ChartInteraction {
  activeIndex: number | null;
  onHover: (index: number | null) => void;
}

const MAX_AXIS_LABELS = 4;

function formatValue(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatPercentage(value: number, total: number): string {
  return `${((value / total) * 100).toFixed(1)}%`;
}

function getTrendLabel(label: string): string {
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(label);
  if (isoDate) {
    const date = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]), 12);
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }
  if (label.length <= 12) return label;
  const date = new Date(label);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }
  return `${label.slice(0, 11)}…`;
}

function shouldShowAxisLabel(index: number, pointCount: number): boolean {
  if (pointCount <= MAX_AXIS_LABELS) return true;
  return Array.from({ length: MAX_AXIS_LABELS }, (_, labelIndex) =>
    Math.round((labelIndex * (pointCount - 1)) / (MAX_AXIS_LABELS - 1)),
  ).includes(index);
}

function renderBarChart(
  points: readonly DashboardChartPoint[],
  { activeIndex, onHover }: ChartInteraction,
  valueLabel: string,
) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const width = 480;
  const height = 260;
  const chartHeight = 170;
  const slot = width / points.length;
  const barWidth = Math.max(2, Math.min(34, slot * 0.62));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {[0, 1, 2, 3].map((line) => {
        const y = 8 + line * (chartHeight / 3);
        return (
          <line key={line} className="dashboard-chart__gridline" x1="0" x2={width} y1={y} y2={y} />
        );
      })}
      {points.map((point, index) => {
        const barHeight = (point.value / max) * chartHeight;
        const x = index * slot + (slot - barWidth) / 2;
        const y = chartHeight - barHeight + 8;
        const showLabel = shouldShowAxisLabel(index, points.length);
        const isActive = activeIndex === index;
        return (
          <g
            key={`${point.label}-${index}`}
            data-chart-point={index}
            onPointerEnter={() => onHover(index)}
            onPointerLeave={() => onHover(null)}
          >
            <title>{`${point.label}: ${formatValue(point.value)} ${valueLabel}`}</title>
            <rect
              className={
                isActive
                  ? 'dashboard-chart__mark dashboard-chart__mark--active'
                  : 'dashboard-chart__mark'
              }
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="5"
              fill={colors[index % colors.length]}
              opacity={activeIndex === null || isActive ? 1 : 0.35}
            />
            {points.length <= 8 && (
              <text
                className="dashboard-chart__point-value"
                x={x + barWidth / 2}
                y={Math.max(y - 8, 20)}
                textAnchor="middle"
              >
                {formatValue(point.value)}
              </text>
            )}
            {showLabel && (
              <text
                className="dashboard-chart__axis-label"
                x={index * slot + slot / 2}
                y="238"
                textAnchor="middle"
              >
                {getTrendLabel(point.label)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function renderLineChart(
  points: readonly DashboardChartPoint[],
  { activeIndex, onHover }: ChartInteraction,
  valueLabel: string,
) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const width = 480;
  const height = 260;
  const chartHeight = 170;
  const plotWidth = width - 40;
  const slot = plotWidth / Math.max(points.length - 1, 1);
  const getX = (index: number) => (points.length === 1 ? width / 2 : 20 + index * slot);
  const getY = (value: number) => chartHeight - (value / max) * chartHeight + 8;
  const coordinates = points.map((point, index) => `${getX(index)},${getY(point.value)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {[0, 1, 2, 3].map((line) => {
        const y = 8 + line * (chartHeight / 3);
        return (
          <line key={line} className="dashboard-chart__gridline" x1="0" x2={width} y1={y} y2={y} />
        );
      })}
      <polyline
        points={coordinates}
        fill="none"
        stroke={colors[0]}
        strokeWidth="4"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((point, index) => {
        const showLabel = shouldShowAxisLabel(index, points.length);
        const isActive = activeIndex === index;
        return (
          <g
            key={`${point.label}-${index}`}
            data-chart-point={index}
            onPointerEnter={() => onHover(index)}
            onPointerLeave={() => onHover(null)}
          >
            <title>{`${point.label}: ${formatValue(point.value)} ${valueLabel}`}</title>
            <circle
              className={
                isActive
                  ? 'dashboard-chart__mark dashboard-chart__mark--active'
                  : 'dashboard-chart__mark'
              }
              cx={getX(index)}
              cy={getY(point.value)}
              r={isActive ? 8 : 6}
              fill={colors[0]}
              opacity={activeIndex === null || isActive ? 1 : 0.35}
              vectorEffect="non-scaling-stroke"
            />
            {points.length <= 8 && (
              <text
                className="dashboard-chart__point-value"
                x={getX(index)}
                y={getY(point.value) - 12}
                textAnchor="middle"
              >
                {formatValue(point.value)}
              </text>
            )}
            {showLabel && (
              <text
                className="dashboard-chart__axis-label"
                x={getX(index)}
                y="238"
                textAnchor="middle"
              >
                {getTrendLabel(point.label)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function renderDonutChart(
  points: readonly DashboardChartPoint[],
  { activeIndex, onHover }: ChartInteraction,
) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const circumference = 2 * Math.PI * 42;
  let offset = 0;

  return (
    <svg viewBox="0 0 120 120" className="dashboard-chart__donut" aria-hidden="true">
      {points.map((point, index) => {
        const length = (point.value / total) * circumference;
        const isActive = activeIndex === index;
        const circle = (
          <circle
            key={`${point.label}-${index}`}
            data-chart-point={index}
            className={
              isActive
                ? 'dashboard-chart__mark dashboard-chart__mark--active'
                : 'dashboard-chart__mark'
            }
            cx="60"
            cy="60"
            r="42"
            fill="none"
            stroke={colors[index % colors.length]}
            strokeWidth={isActive ? 23 : 18}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
            opacity={activeIndex === null || isActive ? 1 : 0.35}
            onPointerEnter={() => onHover(index)}
            onPointerLeave={() => onHover(null)}
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
  compact = false,
}: DashboardChartProps) {
  const id = useId();
  const validPoints = points.filter(
    (point) => Number.isFinite(point.value) && point.value >= 0 && point.label.trim(),
  );
  const total = validPoints.reduce((sum, point) => sum + point.value, 0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? selectedIndex;
  const activePoint = activeIndex === null ? null : (validPoints[activeIndex] ?? null);
  const interaction: ChartInteraction = {
    activeIndex,
    onHover: setHoveredIndex,
  };

  return (
    <figure
      className={compact ? 'dashboard-chart dashboard-chart--compact' : 'dashboard-chart'}
      aria-labelledby={`${id}-title`}
    >
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
              ? renderDonutChart(validPoints, interaction)
              : type === 'line'
                ? renderLineChart(validPoints, interaction, valueLabel)
                : renderBarChart(validPoints, interaction, valueLabel)}
          </div>
          <div
            className="dashboard-chart__selection"
            aria-live="polite"
            aria-atomic="true"
            role="status"
          >
            {activePoint ? (
              <>
                <strong>{activePoint.label}</strong>
                <span>
                  {formatValue(activePoint.value)} {valueLabel}
                  {type === 'donut' ? ` · ${formatPercentage(activePoint.value, total)}` : ''}
                </span>
              </>
            ) : (
              <span>Hover over a chart mark or select a data point to inspect it.</span>
            )}
          </div>
          <ul className="dashboard-chart__legend" aria-label={`${title} data points`}>
            {validPoints.map((point, index) => {
              const isSelected = selectedIndex === index;
              return (
                <li key={`${point.label}-${index}`}>
                  <button
                    type="button"
                    className={
                      activeIndex === index
                        ? 'dashboard-chart__legend-item dashboard-chart__legend-item--active'
                        : 'dashboard-chart__legend-item'
                    }
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedIndex((current) => (current === index ? null : index))
                    }
                    onPointerEnter={() => setHoveredIndex(index)}
                    onPointerLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                  >
                    <span
                      className="dashboard-chart__legend-swatch"
                      style={{
                        backgroundColor:
                          type === 'line' ? colors[0] : colors[index % colors.length],
                      }}
                      aria-hidden="true"
                    />
                    <span className="dashboard-chart__legend-label" title={point.label}>
                      {point.label}
                    </span>
                    <span className="dashboard-chart__legend-value">
                      <strong>{formatValue(point.value)}</strong>
                      {type === 'donut' && <small>{formatPercentage(point.value, total)}</small>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </figure>
  );
}
