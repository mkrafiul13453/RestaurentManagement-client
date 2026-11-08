import { EmptyState } from "./feedback";

export function DataTable({
  columns,
  rows,
  getRowKey = (row) => row.id ?? row._id,
  caption,
  emptyTitle = "No records yet",
  emptyDescription,
  className = "",
}) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error("DataTable requires at least one column");
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <EmptyState
        className={className}
        description={emptyDescription}
        title={emptyTitle}
      />
    );
  }

  return (
    <div
      className={`overflow-x-auto rounded-2xl border border-stone-200 bg-white ${className}`}
    >
      <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
          <tr>
            {columns.map((column) => (
              <th
                className={`px-4 py-3 font-semibold ${column.className ?? ""}`}
                key={column.key}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row, rowIndex) => (
            <tr
              className="transition-colors hover:bg-orange-50/40"
              key={getRowKey(row) ?? rowIndex}
            >
              {columns.map((column) => (
                <td
                  className={`whitespace-nowrap px-4 py-3.5 text-stone-700 ${column.className ?? ""}`}
                  key={column.key}
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : (row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
