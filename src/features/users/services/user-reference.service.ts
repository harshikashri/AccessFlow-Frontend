import { departmentService } from '@/features/departments/services/department.service';
import type { Department, DepartmentStatus } from '@/features/departments/types/department.types';

const pageLimit = 100;

export const userReferenceService = {
  async listDepartments(status?: DepartmentStatus): Promise<Department[]> {
    const departments: Department[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await departmentService.list({
        page,
        limit: pageLimit,
        search: '',
        ...(status ? { status } : {}),
        sortBy: 'name',
        sortOrder: 'asc',
      });
      departments.push(...response.items);
      hasNextPage = response.pagination.hasNextPage;
      page += 1;
    }

    return departments;
  },
};
