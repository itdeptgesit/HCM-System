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
      className="w-full rounded-[10px] bg-[#16324f]/60 hover:bg-[#16324f] border border-white/10 p-3 flex items-center gap-3 cursor-pointer transition-all duration-200 select-none group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group"
      title="Gesit People - HCM Enterprise System"
    >
      <div className="relative shrink-0">
        <img
          src="/image/logo.png"
          alt="Gesit People"
          className="h-8 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
        />
      </div>
      <div className="flex flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
        <span className="font-bold text-[15px] tracking-tight text-white leading-tight flex items-center gap-1">
          Gesit<span className="text-[#3b82f6]">People</span>
        </span>
        <span className="text-[11px] text-[#7d94b3] font-normal leading-tight mt-0.5">
          HCM Workspace System
        </span>
      </div>
    </div>
  );
}
