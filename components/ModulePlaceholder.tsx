import React from 'react';
import { Layers } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  description?: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description = 'Modul ini sedang dalam tahap konfigurasi sistem dan akan segera dirilis.',
}) => {
  return (
    <div className="flex min-h-[55vh] items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 sm:p-8 text-center shadow-xs">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border/80">
          <Layers className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <h2 className="mt-4 text-base sm:text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-center">
          <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded border border-border/60">
            Fase Rilis Mendatang
          </span>
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
