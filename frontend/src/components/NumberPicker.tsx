interface Props {
  selected: number[];
  onChange: (numbers: number[]) => void;
}

export default function NumberPicker({ selected, onChange }: Props) {
  const selectedSet = new Set(selected);
  const isComplete  = selected.length === 15;

  const toggle = (n: number) => {
    if (selectedSet.has(n)) {
      onChange(selected.filter((x) => x !== n));
    } else if (!isComplete) {
      onChange([...selected, n]);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => {
          const isSelected = selectedSet.has(n);
          const isDisabled = !isSelected && isComplete;
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              disabled={isDisabled}
              className={[
                'aspect-square rounded-lg text-sm font-bold transition-all duration-150 select-none',
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md scale-105'
                  : isDisabled
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700',
              ].join(' ')}
            >
              {String(n).padStart(2, '0')}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-center font-medium text-slate-500">
        <span className={selected.length === 15 ? 'text-green-600 font-bold' : 'text-indigo-600'}>
          {selected.length}
        </span>
        {' / 15 selecionados'}
      </p>
    </div>
  );
}
