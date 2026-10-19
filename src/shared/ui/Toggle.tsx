import type { LucideIcon } from 'lucide-react';

interface ToggleProps {
  icon?: LucideIcon;
  title: string;
  desc?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ icon: Icon, title, desc, checked, onChange }: ToggleProps) {
  return (
    <label className="switch-row">
      {Icon && (
        <span className="row-icon">
          <Icon size={18} />
        </span>
      )}
      <span className="switch-text">
        <b>{title}</b>
        {desc && <small>{desc}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
    </label>
  );
}
