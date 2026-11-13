import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Select } from '@/components/ui';
import type {
  DashboardDateRange,
  DashboardDateRangeFilter,
} from '@/features/dashboard/types/dashboard.types';
import { isValidDashboardDateFilter } from '@/features/dashboard/utils/dashboard.utils';

const rangeLabels: Record<DashboardDateRange, string> = {
  LAST_7_DAYS: 'Last 7 days',
  LAST_30_DAYS: 'Last 30 days',
  LAST_90_DAYS: 'Last 90 days',
  THIS_MONTH: 'This month',
  THIS_YEAR: 'This year',
  CUSTOM: 'Custom range',
};

interface DashboardFiltersProps {
  availableRanges: readonly DashboardDateRange[];
  maxCustomRangeDays: number;
  value: DashboardDateRangeFilter;
  onApply: (filter: DashboardDateRangeFilter) => void;
  onReset: () => void;
}

export function DashboardFilters({
  availableRanges,
  maxCustomRangeDays,
  value,
  onApply,
  onReset,
}: DashboardFiltersProps) {
  const [range, setRange] = useState<DashboardDateRange>(value.range);
  const [fromDate, setFromDate] = useState(value.fromDate ?? '');
  const [toDate, setToDate] = useState(value.toDate ?? '');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setRange(value.range);
    setFromDate(value.fromDate ?? '');
    setToDate(value.toDate ?? '');
    setSubmitted(false);
  }, [value]);

  const draft: DashboardDateRangeFilter = {
    range,
    ...(range === 'CUSTOM' ? { fromDate, toDate } : {}),
  };
  const valid = isValidDashboardDateFilter(draft, maxCustomRangeDays);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (valid) onApply(draft);
  }

  return (
    <form className="dashboard-filters" onSubmit={apply}>
      <Select
        label="Date range"
        value={range}
        options={availableRanges.map((item) => ({ value: item, label: rangeLabels[item] }))}
        onChange={(event) => {
          setRange(event.currentTarget.value as DashboardDateRange);
          setSubmitted(false);
        }}
      />
      {range === 'CUSTOM' && (
        <div className="dashboard-filters__custom">
          <Input
            label="From"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => setFromDate(event.currentTarget.value)}
          />
          <Input
            label="To"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => setToDate(event.currentTarget.value)}
          />
        </div>
      )}
      <div className="dashboard-filters__actions">
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSubmitted(false);
            onReset();
          }}
        >
          Reset
        </Button>
      </div>
      {submitted && !valid && (
        <p className="dashboard-filters__error" role="alert">
          Choose a valid date range no longer than {maxCustomRangeDays} days, ending no later than
          today.
        </p>
      )}
    </form>
  );
}
