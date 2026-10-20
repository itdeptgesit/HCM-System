import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
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
  Home,
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
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 dark:border-[#222225] bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md px-4 sm:px-6 transition-colors">
      {/* ── LEFT: SIDEBAR TRIGGER + SEPARATOR + BREADCRUMBS ── */}
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="size-8.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer" />

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

        <Breadcrumb className="truncate">
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/');
                }}
                className="flex items-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.nav.workspace}</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
                {breadcrumbLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* ── RIGHT: SEARCH BUTTON (Ctrl K) + LANG + THEME + NOTIF + QUICK CTA + AVATAR ── */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Search button styled clean & modern */}
        <button
          type="button"
          onClick={onSearchClick}
          className="relative hidden md:flex items-center gap-2.5 h-9 w-56 lg:w-72 rounded-full border border-slate-200/90 dark:border-[#27272a] bg-slate-50/60 hover:bg-slate-100/80 dark:bg-[#18181b]/60 dark:hover:bg-[#18181b] px-3.5 text-xs text-slate-500 dark:text-zinc-400 shadow-2xs transition-all cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"
        >
          <Search className="h-4 w-4 text-slate-400 dark:text-zinc-500 shrink-0" />
          <span className="truncate text-slate-500 dark:text-zinc-400">{t.common.searchPlaceholder}</span>
          <kbd className="ml-auto pointer-events-none inline-flex items-center rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-sans font-medium text-slate-500 dark:text-zinc-400 shadow-2xs">
            {t.common.ctrlK}
          </kbd>
        </button>

        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchClick}
          className="h-8.5 w-8.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white md:hidden cursor-pointer"
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
            className="h-8.5 w-8.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
            title={isDark ? t.common.themeLight : t.common.themeDark}
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </Button>
        )}

        {/* Interactive Notifications Center */}
        <NexoraNotifications />

        {/* Profile Dropdown */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8.5 w-8.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                  title={`${t.nav.myProfile}: ${currentUser?.fullName || 'User'}`}
                />
              }
            >
              <User className="h-4 w-4" />
            </DropdownMenuTrigger>

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
