interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  emptyMessage?: string;
  responsive?: boolean;
}

export function Table<T extends Record<string, any>>({ columns, data, keyField = 'id', emptyMessage = 'No data found', responsive = true }: TableProps<T>) {
  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">{emptyMessage}</div>;
  }

  return (
    <>
      {/* Mobile card layout */}
      {responsive && (
        <div className="md:hidden space-y-3">
          {data.map((item) => (
            <div key={item[keyField]} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase shrink-0">{col.header}</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 text-right">
                    {col.render ? col.render(item) : item[col.key]}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Desktop table layout */}
      <div className={`overflow-x-auto ${responsive ? 'hidden md:block' : ''}`}>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((item) => (
              <tr key={item[keyField]} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {columns.map((col) => (
                  <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm dark:text-gray-300 ${col.className || ''}`}>
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
