import type { ReactNode } from 'react';
import { Card, Spinner, Table } from '@heroui/react';

export type DataColumn<T> = {
  key: string;
  title: string;
  render: (item: T, index: number) => ReactNode;
  isRowHeader?: boolean;
};

type DataTableProps<T> = {
  ariaLabel: string;
  columns: DataColumn<T>[];
  rows: T[];
  getRowId: (item: T) => string;
  emptyText: string;
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
};

export function DataTable<T>({
  ariaLabel,
  columns,
  emptyText,
  getRowId,
  isLoading = false,
  onRowClick,
  rows,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <Card className="dashboard-state">
        <Card.Content>
          <Spinner />
          <span>Загрузка данных</span>
        </Card.Content>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="dashboard-state">
        <Card.Content>{emptyText}</Card.Content>
      </Card>
    );
  }

  return (
    <Table className="dashboard-table">
      <Table.ScrollContainer>
        <Table.Content aria-label={ariaLabel}>
          <Table.Header>
            {columns.map((column) => (
              <Table.Column
                id={column.key}
                isRowHeader={column.isRowHeader}
                key={column.key}
              >
                {column.title}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body>
            {rows.map((row, index) => (
              <Table.Row
                className={onRowClick ? 'dashboard-table-row-action' : ''}
                id={getRowId(row)}
                key={getRowId(row)}
                onAction={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <Table.Cell key={column.key}>
                    {column.render(row, index)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
