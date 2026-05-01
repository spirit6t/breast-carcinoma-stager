interface ChipProps {
  options: string[];
  selected: string[];
  toggle: (v: string) => void;
}

export function Chips({ options, selected, toggle }: ChipProps) {
  return (
    <div className="chip-row">
      {options.map((o) => (
        <button
          key={o}
          className={`chip ${selected.includes(o) ? 'active' : ''}`}
          onClick={() => toggle(o)}
          type="button"
        >
          {o}
        </button>
      ))}
    </div>
  );
}

interface SingleChipProps {
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
}

export function SingleChips({ options, value, onChange }: SingleChipProps) {
  return (
    <div className="chip-row">
      {options.map((o) => (
        <button
          key={o}
          className={`chip ${value === o ? 'active' : ''}`}
          onClick={() => onChange(o)}
          type="button"
        >
          {o}
        </button>
      ))}
    </div>
  );
}
