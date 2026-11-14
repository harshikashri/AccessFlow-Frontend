import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DepartmentTable } from '@/features/departments/components/DepartmentTable';
import type { Department } from '@/features/departments/types/department.types';

const department: Department = {
  id: '64b000000000000000000001',
  organizationId: '64b000000000000000000002',
  name: 'Engineering',
  description: 'Product engineering',
  status: 'ACTIVE',
  managerCount: 2,
  memberCount: 14,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
};

function renderTable(
  items: Department[],
  options: { isLoading?: boolean; hasFilters?: boolean } = {},
) {
  return render(
    <MemoryRouter>
      <DepartmentTable
        items={items}
        isLoading={options.isLoading ?? false}
        hasFilters={options.hasFilters ?? false}
        canCreate={false}
        onClearFilters={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('DepartmentTable', () => {
  it('displays supported department data and links to the detail route', () => {
    renderTable([department]);

    expect(screen.getByText('Engineering')).toBeTruthy();
    expect(screen.getByText('Product engineering')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Engineering' }).getAttribute('href')).toBe(
      `/departments/${department.id}`,
    );
  });

  it('renders loading skeletons and a filter-aware empty state', () => {
    const { rerender } = renderTable([], { isLoading: true });
    expect(screen.getByRole('table', { name: 'Departments' })).toBeTruthy();

    rerender(
      <MemoryRouter>
        <DepartmentTable
          items={[]}
          isLoading={false}
          hasFilters
          canCreate={false}
          onClearFilters={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('No departments match these filters.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeTruthy();
  });
});
