import React from 'react';
import { Construction } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  description?: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description = 'Modul ini sedang dalam pengembangan dan belum tersedia.',
}) => {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#131316] p-8 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40">
          <Construction className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-100">{title}</h2>
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-zinc-400">{description}</p>
        <span className="mt-4 inline-block rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-900/40 px-3 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
          Segera hadir
        </span>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
