import React from 'react';

type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
};

export function Table<T>({ columns, data }: Props<T>) {
  return (
    <table className="min-w-full text-left">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className="px-3 py-2 border-b font-medium">{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx} className="odd:bg-gray-50">
            {columns.map((c) => (
              <td key={c.key} className="px-3 py-2 border-b">
                {c.render ? c.render(row) : (row as any)[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Table;

