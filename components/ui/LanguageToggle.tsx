import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

interface LanguageToggleProps {
  className?: string;
  size?: 'sm' | 'default';
  showLabel?: boolean;
}

/**
 * Compact Single-Button Language Toggle (EN / ID)
 * Displays only 1 current language icon/badge at a time.
 * Clicking it instantly switches between English and Indonesian.
 */
export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  className,
  size = 'sm',
  showLabel = true,
}) => {
  const { language, toggleLanguage } = useLanguage();

  const isEn = language === 'en';
  const flagSrc = isEn ? '/image/flag/uk.png' : '/image/flag/indo.png';
  const label = isEn ? 'EN' : 'ID';
  const tooltip = isEn
    ? 'Language: English (Click to switch to Bahasa Indonesia)'
    : 'Bahasa: Indonesia (Klik untuk beralih ke English)';

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 dark:border-zinc-800',
        'bg-white/80 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800/90',
        'text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white',
        'shadow-2xs backdrop-blur-xs transition-all duration-150 cursor-pointer active:scale-95 select-none',
        size === 'sm' ? 'h-8 px-2 text-[11px] font-bold' : 'h-8.5 px-2.5 text-xs font-bold',
        className
      )}
    >
      <img
        src={flagSrc}
        alt={label}
        className={cn(
          'size-4 rounded-full object-cover shrink-0 shadow-2xs ring-1 ring-black/10 dark:ring-white/15 transition-transform duration-200 group-hover:scale-110'
        )}
      />
      {showLabel && (
        <span className="leading-none tracking-tight font-bold">
          {label}
        </span>
      )}
    </button>
  );
};

export default LanguageToggle;
