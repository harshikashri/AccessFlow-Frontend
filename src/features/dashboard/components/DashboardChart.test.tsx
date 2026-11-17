import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardChart } from '@/features/dashboard/components/DashboardChart';

const points = [
  { label: 'North America', value: 1200 },
  { label: 'Europe', value: 800 },
];

describe('DashboardChart', () => {
  it('shows readable legend values and lets users select a data point', () => {
    render(
      <DashboardChart
        title="Requests by region"
        points={points}
        type="bar"
        valueLabel="requests"
      />,
    );

    const regionButton = screen.getByRole('button', { name: /North America.*1,200/ });
    expect(screen.getByRole('button', { name: /Europe.*800/ })).toBeTruthy();

    fireEvent.click(regionButton);

    expect(regionButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('North America');
    expect(screen.getByRole('status').textContent).toContain('1,200 requests');
  });

  it('updates the live value summary when a chart mark is hovered', () => {
    const { container } = render(
      <DashboardChart title="Requests by region" points={points} valueLabel="requests" />,
    );
    const firstMark = container.querySelector('[data-chart-point="0"]');

    if (!firstMark) throw new Error('Expected the first chart mark to render');
    fireEvent.pointerEnter(firstMark);

    expect(screen.getByRole('status').textContent).toContain('North America');
    expect(screen.getByRole('status').textContent).toContain('1,200 requests');
  });

  it('shows percentages for selectable donut segments', () => {
    render(
      <DashboardChart
        title="Requests by region"
        points={points}
        type="donut"
        valueLabel="requests"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /North America.*1,200.*60.0%/ }));

    expect(screen.getByRole('status').textContent).toContain('60.0%');
  });

  it.each(['bar', 'line'] as const)(
    'shortens dates and limits crowded axis labels for %s charts',
    (type) => {
      const dailyPoints = [
        '2026-10-18',
        '2026-10-22',
        '2026-10-26',
        '2026-10-30',
        '2026-11-03',
        '2026-11-07',
        '2026-11-11',
        '2026-11-15',
      ].map((label, index) => ({ label, value: index + 1 }));

      const { container } = render(
        <DashboardChart title="Daily activity" points={dailyPoints} type={type} />,
      );
      const axisLabels = container.querySelectorAll('.dashboard-chart__axis-label');

      expect(axisLabels.length).toBe(4);
      expect(Array.from(axisLabels).some((label) => label.textContent?.includes('2026-'))).toBe(
        false,
      );
    },
  );
});
