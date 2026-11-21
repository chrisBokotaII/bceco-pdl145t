import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';

const OPTIONS: {
  id: ThemePreference;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'light', label: 'Clair', hint: 'Toujours clair — idéal en extérieur', Icon: Sun },
  { id: 'dark', label: 'Sombre', hint: 'Toujours sombre', Icon: Moon },
  { id: 'system', label: 'Système', hint: 'Suivre le système d’exploitation', Icon: Monitor },
];

interface Props {
  /** Visual density */
  variant?: 'segmented' | 'list' | 'header';
  className?: string;
  /** Show section title above the control */
  showLabel?: boolean;
}

/**
 * Explicit Light / Dark / System switcher (Sun / Moon / Monitor).
 * Preference is persisted via ThemeContext.
 */
export const ThemeSwitcher: React.FC<Props> = ({
  variant = 'segmented',
  className = '',
  showLabel = false,
}) => {
  const { preference, setPreference } = useTheme();

  if (variant === 'list') {
    return (
      <div className={`space-y-2 ${className}`} role="radiogroup" aria-label="Thème d’affichage">
        {showLabel && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1">
            Thème d’affichage
          </p>
        )}
        {OPTIONS.map(({ id, label, hint, Icon }) => {
          const active = preference === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left min-h-[44px] border transition-colors ${
                active
                  ? 'bg-blue-50 border-blue-300 text-[#0F2544]'
                  : 'bg-transparent border-transparent text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                  active
                    ? 'bg-white border-blue-200 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-[11px] text-slate-500 truncate">{hint}</span>
              </span>
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                  active ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-transparent'
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div
        className={`inline-flex items-center gap-0.5 p-0.5 rounded-md bg-white/10 border border-white/15 ${className}`}
        role="radiogroup"
        aria-label="Thème d’affichage"
      >
        {OPTIONS.map(({ id, label, Icon }) => {
          const active = preference === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(id)}
              className={`p-1.5 rounded min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors ${
                active
                  ? 'bg-white/20 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={label}
              aria-label={label}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>
    );
  }

  // segmented (default) — for login / settings panels
  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Thème d’affichage
        </p>
      )}
      <div
        className="inline-flex w-full sm:w-auto items-stretch gap-0.5 p-1 rounded-lg border border-slate-300 bg-slate-100"
        role="radiogroup"
        aria-label="Thème d’affichage"
      >
        {OPTIONS.map(({ id, label, Icon }) => {
          const active = preference === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(id)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md min-h-[36px] transition-colors ${
                active
                  ? 'bg-white text-[#0F2544] shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
              title={label}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** @deprecated Prefer ThemeSwitcher — kept for any residual imports */
export { ThemeSwitcher as ThemeToggle };
