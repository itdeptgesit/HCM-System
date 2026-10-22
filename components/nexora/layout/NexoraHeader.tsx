import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NexoraNotifications } from './NexoraNotifications';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Sparkles,
  User,
  Users,
  LogOut,
  ChevronDown,
} from '@/components/ui/icons';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

interface NexoraHeaderProps {
  currentUser?: any;
  breadcrumbLabel?: string;
  onSearchClick?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onLogout?: () => void;
}

export function NexoraHeader({
  currentUser,
  breadcrumbLabel = 'Dashboard',
  onSearchClick,
  isDark,
  onToggleTheme,
  onLogout,
}: NexoraHeaderProps) {
  const navigate = useNavigate();
  const { t, isEn } = useLanguage();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-neutral-300/60 dark:border-white/10 bg-[#edf0f4] dark:bg-[#121622] px-4 sm:px-6 transition-colors rounded-t-[26px] w-full">
      {/* ── LEFT: SIDEBAR TRIGGER + SEPARATOR + BREADCRUMBS ── */}
      <div className="flex items-center gap-3.5 min-w-0">
        <SidebarTrigger className="size-9 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 hover:text-black dark:bg-[#1a2030] dark:text-neutral-200 dark:hover:text-white transition-all cursor-pointer border border-neutral-300/60 dark:border-white/10 shadow-2xs" />

        <div className="h-4 w-px bg-neutral-300/80 dark:bg-zinc-700" />

        <Breadcrumb>
          <BreadcrumbList className="text-xs sm:text-sm">
            <BreadcrumbItem>
              <BreadcrumbPage className="font-bold text-neutral-900 dark:text-white">
                {breadcrumbLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* ── RIGHT: SEARCH BUTTON (Ctrl K) + LANG + THEME + NOTIF + QUICK CTA + AVATAR ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search button styled to match sidebar tokens */}
        <button
          type="button"
          onClick={onSearchClick}
          className="relative hidden md:flex items-center gap-2.5 h-9.5 w-60 lg:w-80 max-w-[420px] rounded-full border border-neutral-300/60 dark:border-white/10 bg-white dark:bg-[#1a2030] px-3.5 text-xs text-neutral-700 dark:text-neutral-300 shadow-2xs transition-all cursor-pointer hover:border-neutral-400 hover:ring-2 hover:ring-neutral-200/50 dark:hover:ring-neutral-800"
        >
          <Search className="h-4 w-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
          <span className="truncate text-neutral-600 dark:text-neutral-300 font-medium">{t.common.searchPlaceholder}</span>
          <kbd className="ml-auto pointer-events-none inline-flex items-center rounded-md border border-neutral-200 dark:border-zinc-700 bg-neutral-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-sans font-bold text-neutral-500 shadow-2xs">
            {t.common.ctrlK}
          </kbd>
        </button>

        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchClick}
          className="h-9 w-9 rounded-[10px] bg-[#f8fafc] dark:bg-[#16233c] text-[#475569] hover:text-[#2563eb] dark:text-[#a7b4c9] dark:hover:text-white md:hidden cursor-pointer"
          title={`${t.common.search} (${t.common.ctrlK})`}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Language Switcher (EN / ID) */}
        <LanguageToggle size="sm" />

        {/* Dark Mode Toggle */}
        {onToggleTheme && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className="h-9 w-9 rounded-[10px] bg-[#f8fafc] dark:bg-[#16233c] text-[#475569] hover:text-[#2563eb] dark:text-[#a7b4c9] dark:hover:text-white cursor-pointer transition-colors border border-[#e5eaf1] dark:border-[#22314d]"
            title={isDark ? t.common.themeLight : t.common.themeDark}
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#475569]" />}
          </Button>
        )}

        {/* Interactive Notifications Center */}
        <NexoraNotifications />

        {/* Profile Dropdown */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="h-9.5 w-9.5 rounded-full bg-[#eff6ff] text-[#2563eb] font-bold text-xs flex items-center justify-center ring-1 ring-[#cbd5e1] hover:ring-2 hover:ring-[#2563eb] transition-all shadow-xs cursor-pointer"
                  title={`${t.nav.myProfile}: ${currentUser?.fullName || 'User'}`}
                >
                  {currentUser?.fullName?.[0] || 'U'}
                </button>
              }
            />

            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-56 p-1.5 shadow-2xl rounded-xl bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a]"
            >
              <DropdownMenuLabel className="font-normal p-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                    {currentUser?.fullName || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate leading-none mt-1">
                    {currentUser?.email || '-'}
                  </p>
                  <p className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 leading-none mt-0.5">
                    {currentUser?.role || 'Staff'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate('/employees')}
                className="text-xs cursor-pointer gap-2 py-2"
              >
                <Users className="h-3.5 w-3.5 text-slate-500" />
                <span>{t.nav.employees}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/admin/users')}
                className="text-xs cursor-pointer gap-2 py-2"
              >
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>{t.nav.myProfile}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onLogout && (
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-xs cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t.nav.signOut}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
