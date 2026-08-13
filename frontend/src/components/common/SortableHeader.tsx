export type SortDirection = 'asc' | 'desc';

interface Props<T extends string> {
  label: string;
  column: T;
  activeColumn: T | null;
  direction: SortDirection;
  onSort: (column: T) => void;
  title?: string;
}

export default function SortableHeader<T extends string>({
  label, column, activeColumn, direction, onSort, title,
}: Props<T>) {
  const isActive = activeColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      title={title}
      className="px-4 py-2 font-semibold text-center cursor-pointer select-none hover:bg-slate-700"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${isActive ? 'opacity-100' : 'opacity-30'}`}>
          {isActive && direction === 'asc' ? '▲' : '▼'}
        </span>
      </span>
    </th>
  );
}
