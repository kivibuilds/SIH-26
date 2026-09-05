import { Loader2 } from 'lucide-react'

export function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  loading = false,
  emptyMessage = 'No records found matching criteria',
  className = '',
}) {
  return (
    <div className={`w-full overflow-x-auto border border-console-border bg-console-panel ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-console-border bg-console-raised/70 text-[11px] uppercase tracking-[0.16em] text-console-muted font-medium">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={`py-2.5 px-3.5 font-medium select-none ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-console-border/70 font-sans">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-console-muted">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-console-accent" />
                  <span className="font-mono text-xs uppercase tracking-wider">Loading records...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-console-muted">
                <p className="font-mono text-xs">{emptyMessage}</p>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const rowId = row[keyField] || rowIdx
              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors duration-100 ${onRowClick ? 'cursor-pointer hover:bg-slate-800/50 active:bg-slate-800/80' : ''}`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={`${rowId}-${col.key || colIdx}`}
                      className={`py-3 px-3.5 text-console-text align-middle ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                    >
                      {col.render ? col.render(row, rowIdx) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
