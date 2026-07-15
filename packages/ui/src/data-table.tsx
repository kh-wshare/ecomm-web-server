import type { ReactNode } from "react";

import { Table } from "@heroui/react";

export type DataTableColumn<Row> = {
  key: string;
  header: ReactNode;
  className?: string;
  headerClassName?: string;
  render: (row: Row) => ReactNode;
};

export function DataTable<Row>({
  caption,
  columns,
  getRowKey,
  rows,
}: {
  caption?: string;
  columns: DataTableColumn<Row>[];
  getRowKey: (row: Row) => string;
  rows: Row[];
}) {
  return (
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content
          aria-label={caption ?? "Data table"}
          className="min-w-[720px] text-left text-sm"
        >
          <Table.Header className="bg-surface-secondary text-xs text-muted">
            {columns.map((column) => (
              <Table.Column
                className={`px-4 py-3 font-medium ${column.headerClassName ?? ""}`}
                id={column.key}
                key={column.key}
              >
                {column.header}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row
                className="border-t border-separator hover:bg-surface-secondary/60"
                id={getRowKey(row)}
                key={getRowKey(row)}
              >
                {columns.map((column) => (
                  <Table.Cell
                    className={`px-4 py-4 ${column.className ?? ""}`}
                    key={column.key}
                  >
                    {column.render(row)}
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
