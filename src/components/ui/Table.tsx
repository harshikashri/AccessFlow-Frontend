import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export function Table({ className = '', ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="ui-table__scroll">
      <table {...props} className={`ui-table ${className}`.trim()} />
    </div>
  );
}

export function TableHead({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={`ui-table__head ${className}`.trim()} />;
}

export function TableBody({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} className={`ui-table__body ${className}`.trim()} />;
}

export function TableRow({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={`ui-table__row ${className}`.trim()} />;
}

export function TableHeader({ className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={`ui-table__cell ui-table__cell--header ${className}`.trim()} />;
}

export function TableCell({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={`ui-table__cell ${className}`.trim()} />;
}

export function TableEmptyState({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow>
      <TableCell className="ui-table__empty" colSpan={colSpan}>
        {children}
      </TableCell>
    </TableRow>
  );
}

export function TableLoadingState({ columns, rows = 3 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row} aria-hidden="true">
          {Array.from({ length: columns }, (_, column) => (
            <TableCell key={column}>
              <span className="ui-skeleton ui-skeleton--line" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
