import { useState, useRef, useCallback, useEffect } from 'react';

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
  maxHeight?: string;
  stickyHeader?: boolean;
  enableResize?: boolean;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  emptyMessage = 'No data found',
  responsive = true,
  maxHeight = '600px',
  stickyHeader = true,
  enableResize = true,
}: TableProps<T>) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const resizingColRef = useRef<string | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const colKey = resizingColRef.current;
    if (!colKey) return;
    const diff = e.clientX - startXRef.current;
    const newWidth = Math.max(60, startWidthRef.current + diff);
    setColumnWidths(prev => ({ ...prev, [colKey]: newWidth }));
  }, []);

  const onMouseUp = useCallback(() => {
    resizingColRef.current = null;
    setResizingCol(null);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    containerRef.current?.classList.remove('resizing');
  }, [onMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const onResizeStart = useCallback((colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const th = (e.target as HTMLElement).parentElement;
    if (!th) return;
    startXRef.current = e.clientX;
    startWidthRef.current = th.offsetWidth;
    resizingColRef.current = colKey;
    setResizingCol(colKey);
    containerRef.current?.classList.add('resizing');
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [onMouseMove, onMouseUp]);

  const onResizeReset = useCallback((colKey: string) => {
    setColumnWidths(prev => {
      const next = { ...prev };
      delete next[colKey];
      return next;
    });
  }, []);

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">{emptyMessage}</div>;
  }

  const hasResizedCols = Object.keys(columnWidths).length > 0;
  const actionCols = columns.filter(c => !c.header);
  const dataCols = columns.filter(c => c.header);

  return (
    <>
      {/* Mobile card layout */}
      {responsive && (
        <div className="md:hidden space-y-3">
          {data.map((item) => (
            <div
              key={item[keyField]}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 hover:shadow-md transition-shadow"
            >
              {/* First data column as title */}
              {dataCols.length > 0 && (
                <div className="pb-2 mb-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{dataCols[0].header}</span>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                    {dataCols[0].render ? dataCols[0].render(item) : item[dataCols[0].key]}
                  </div>
                </div>
              )}
              {/* Remaining data columns */}
              {dataCols.slice(1).map((col) => (
                <div key={col.key} className="flex justify-between items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase shrink-0">{col.header}</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 text-right">
                    {col.render ? col.render(item) : item[col.key]}
                  </span>
                </div>
              ))}
              {/* Action columns as footer */}
              {actionCols.length > 0 && (
                <div className="pt-2 mt-1 border-t border-gray-100 dark:border-gray-700 flex gap-2 justify-end">
                  {actionCols.map((col) => (
                    <span key={col.key}>
                      {col.render ? col.render(item) : item[col.key]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Desktop table layout */}
      <div
        ref={containerRef}
        className={`table-scroll overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 ${responsive ? 'hidden md:block' : ''}`}
        style={{ maxHeight }}
      >
        <table
          className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${hasResizedCols ? 'table-fixed' : ''}`}
          style={hasResizedCols ? { tableLayout: 'fixed' } : undefined}
        >
          <thead className={`bg-gray-50 dark:bg-gray-800/50 ${stickyHeader ? 'sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : ''}`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`relative px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col.className || ''}`}
                  style={columnWidths[col.key] ? { width: columnWidths[col.key] } : undefined}
                >
                  {col.header}
                  {enableResize && (
                    <div
                      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-500 ${resizingCol === col.key ? 'bg-blue-500' : ''}`}
                      onMouseDown={(e) => onResizeStart(col.key, e)}
                      onDoubleClick={() => onResizeReset(col.key)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((item) => (
              <tr key={item[keyField]} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {columns.map((col) => (
                  <td key={col.key} className={`px-6 py-4 text-sm dark:text-gray-300 break-words ${col.className || ''}`}>
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
