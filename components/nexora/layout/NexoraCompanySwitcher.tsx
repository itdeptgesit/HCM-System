import * as React from 'react';
import { useNavigate } from 'react-router-dom';

export interface CompanyEntity {
  id: string;
  name: string;
  branch: string;
  code: string;
  logo?: string;
}

export function NexoraCompanySwitcher({
  isHR: _isHR = false,
}: {
  isHR?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate('/')}
      className="w-full rounded-2xl bg-[#f4f4f6] dark:bg-zinc-800/80 p-3 flex items-center gap-3.5 cursor-pointer hover:bg-[#eaebee] dark:hover:bg-zinc-800 transition-colors select-none group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center"
      title="Gesit People - HCM Enterprise System"
    >
      <img
        src="/image/logo.png"
        alt="Gesit People"
        className="h-9 w-auto object-contain shrink-0"
      />
      <div className="flex flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
        <span className="font-bold text-[14.5px] tracking-tight text-slate-900 dark:text-white leading-tight">
          Gesit People
        </span>
        <span className="text-[11.5px] text-slate-500 dark:text-zinc-400 font-normal leading-tight mt-0.5">
          HCM Enterprise System
        </span>
      </div>
    </div>
  );
}
