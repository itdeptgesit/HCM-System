/**
 * Basil Icon Bridge
 * -----------------
 * Drop-in replacement for lucide-react icons using the Basil icon set
 * from https://icon-sets.iconify.design/basil/
 *
 * Usage:  import { Users, Search, Settings } from '@/components/ui/icons';
 *         <Users className="h-4 w-4" />
 */
import React from 'react';
import { Icon as IconifyIcon } from '@iconify/react';

// ── Lucide-name → Basil-name mapping ──────────────────────────────
const BASIL_MAP: Record<string, string> = {
  // Navigation & Layout
  LayoutDashboard: 'basil:apps-outline',
  Home: 'basil:home-outline',
  Menu: 'basil:menu-outline',
  PanelLeftIcon: 'basil:columns-outline',
  Grid: 'basil:apps-outline',
  List: 'basil:rows-outline',
  Layers: 'basil:stack-outline',

  // Users
  Users: 'basil:user-outline',
  User: 'basil:user-outline',
  UserCheck: 'basil:user-outline',
  UserPlus: 'basil:user-plus-outline',
  UserX: 'basil:user-block-outline',

  // Time & Calendar
  Clock: 'basil:clock-outline',
  Clock3: 'basil:clock-outline',
  Timer: 'basil:timer-outline',
  Calendar: 'basil:calendar-outline',
  CalendarDays: 'basil:calendar-outline',

  // Documents & Files
  FileText: 'basil:document-outline',
  FileWarning: 'basil:document-outline',
  FileCheck: 'basil:document-outline',
  FileCheck2: 'basil:document-outline',
  FileSpreadsheet: 'basil:document-outline',
  BookOpen: 'basil:book-open-outline',

  // Business
  Briefcase: 'basil:bag-outline',
  CreditCard: 'basil:card-outline',
  Wallet: 'basil:wallet-outline',
  Receipt: 'basil:invoice-outline',
  DollarSign: 'basil:card-outline',
  Landmark: 'basil:bank-outline',

  // Charts & Analytics
  BarChart2: 'basil:chart-pie-outline',
  BarChart3: 'basil:chart-pie-alt-outline',
  PieChart: 'basil:chart-pie-outline',
  Activity: 'basil:pulse-outline',
  TrendingUp: 'basil:arrow-up-outline',
  TrendingDown: 'basil:arrow-down-outline',
  Percent: 'basil:chart-pie-alt-outline',

  // Settings & Admin
  Settings: 'basil:settings-outline',
  Settings2: 'basil:settings-alt-outline',
  Sliders: 'basil:settings-adjust-outline',
  SlidersHorizontal: 'basil:settings-adjust-outline',

  // Actions
  Search: 'basil:search-outline',
  SearchIcon: 'basil:search-outline',
  Filter: 'basil:filter-outline',
  Plus: 'basil:add-outline',
  PlusCircle: 'basil:add-outline',
  Minus: 'basil:cancel-outline',
  MinusIcon: 'basil:cancel-outline',
  Edit: 'basil:edit-outline',
  Edit3: 'basil:edit-alt-outline',
  Pencil: 'basil:edit-outline',
  Trash2: 'basil:trash-outline',
  Save: 'basil:save-outline',
  Copy: 'basil:copy-outline',
  Download: 'basil:download-outline',
  Upload: 'basil:upload-outline',
  UploadCloud: 'basil:cloud-upload-outline',
  Send: 'basil:send-outline',
  Printer: 'basil:printer-outline',
  RefreshCw: 'basil:refresh-outline',
  RefreshCcw: 'basil:refresh-outline',
  RotateCcw: 'basil:refresh-outline',

  // Status & Feedback
  Check: 'basil:check-outline',
  CheckIcon: 'basil:check-outline',
  CheckCircle: 'basil:check-outline',
  CheckCircle2: 'basil:check-outline',
  BadgeCheck: 'basil:award-outline',
  AlertCircle: 'basil:info-circle-outline',
  AlertTriangle: 'basil:info-triangle-outline',
  Info: 'basil:info-circle-outline',
  HelpCircle: 'basil:info-circle-outline',
  Ban: 'basil:cancel-outline',
  X: 'basil:cross-outline',
  XIcon: 'basil:cross-outline',
  XCircle: 'basil:cancel-outline',
  Bell: 'basil:notification-outline',

  // Visibility
  Eye: 'basil:eye-outline',
  EyeOff: 'basil:eye-closed-outline',

  // Navigation arrows
  ArrowLeft: 'basil:arrow-left-outline',
  ArrowRight: 'basil:arrow-right-outline',
  ArrowUpRight: 'basil:arrow-right-outline',
  ArrowDownRight: 'basil:arrow-down-outline',
  ArrowRightLeft: 'basil:exchange-outline',
  ArrowUpDown: 'basil:sort-outline',
  ChevronDown: 'basil:caret-down-outline',
  ChevronDownIcon: 'basil:caret-down-outline',
  ChevronUpIcon: 'basil:caret-up-outline',
  ChevronLeft: 'basil:caret-left-outline',
  ChevronLeftIcon: 'basil:caret-left-outline',
  ChevronRight: 'basil:caret-right-outline',
  ChevronRightIcon: 'basil:caret-right-outline',
  ChevronsUpDown: 'basil:sort-outline',

  // Security
  Lock: 'basil:lock-outline',
  Unlock: 'basil:unlock-outline',
  Shield: 'basil:shield-outline',
  ShieldCheck: 'basil:shield-outline',
  ShieldAlert: 'basil:shield-outline',
  KeyRound: 'basil:key-outline',

  // Theme
  Sun: 'basil:sun-outline',
  Sunrise: 'basil:sun-outline',
  Moon: 'basil:moon-outline',
  Sunset: 'basil:moon-outline',

  // Location & Map
  MapPin: 'basil:location-outline',
  MapPinOff: 'basil:location-outline',
  Map: 'basil:map-location-outline',
  Navigation: 'basil:navigation-outline',
  Locate: 'basil:current-location-outline',
  Compass: 'basil:explore-outline',
  Globe: 'basil:globe-outline',
  Pin: 'basil:pin-outline',

  // Buildings & Org
  Building: 'basil:university-outline',
  Building2: 'basil:university-outline',
  FolderTree: 'basil:stack-outline',
  FolderOpen: 'basil:folder-open-outline',
  GitMerge: 'basil:exchange-outline',

  // Communication
  Mail: 'basil:envelope-outline',
  Phone: 'basil:phone-outline',
  Smartphone: 'basil:mobile-phone-outline',
  Megaphone: 'basil:bullhorn-outline',
  ExternalLink: 'basil:share-box-outline',

  // Auth
  LogOut: 'basil:logout-outline',

  // Misc
  Camera: 'basil:camera-outline',
  Image: 'basil:image-outline',
  Paperclip: 'basil:attach-outline',
  Award: 'basil:award-outline',
  Gift: 'basil:present-outline',
  PartyPopper: 'basil:present-outline',
  Sparkles: 'basil:lightning-outline',
  Coffee: 'basil:alarm-outline',
  Stethoscope: 'basil:medkit-outline',
  HeartHandshake: 'basil:heart-outline',
  LifeBuoy: 'basil:shield-outline',
  GraduationCap: 'basil:university-outline',
  Hash: 'basil:document-outline',
  Scale: 'basil:settings-adjust-outline',
  History: 'basil:history-outline',

  // Infrastructure
  Server: 'basil:server-outline',
  Database: 'basil:server-outline',
  Cpu: 'basil:processor-outline',

  // Loading
  Loader2: 'basil:sand-watch-outline',
  Loader2Icon: 'basil:sand-watch-outline',

  // Other
  MoreHorizontalIcon: 'basil:other-1-outline',
};

// ── Shared props interface (Lucide-compatible) ────────────────────
export interface IconProps extends React.HTMLAttributes<SVGElement> {
  size?: number | string;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
  color?: string;
}

/**
 * Factory: create a React component that renders a specific Basil icon.
 * Supports `className`, `size`, `style`, and all standard HTML/SVG attributes.
 */
function createBasilIcon(lucideName: string) {
  const basilName = BASIL_MAP[lucideName];

  if (!basilName) {
    // Fallback: render nothing visually but warn in dev
    const Fallback = React.forwardRef<SVGElement, IconProps>(
      ({ className, size = 24, ...rest }, _ref) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[BasilIcons] No mapping for "${lucideName}"`);
        }
        return (
          <span
            className={className}
            style={{ display: 'inline-flex', width: size, height: size }}
            {...(rest as any)}
          />
        );
      },
    );
    Fallback.displayName = lucideName;
    return Fallback;
  }

  const BasilIcon = React.forwardRef<SVGElement, IconProps>(
    ({ className, size, style, ...rest }, _ref) => {
      // Derive pixel size from className (h-4 → 16, h-5 → 20, etc.) if `size` not explicit
      let resolvedSize = size;
      if (!resolvedSize && className) {
        const match = className.match(/(?:^|\s)(?:h|w)-(\d+(?:\.\d+)?)/);
        if (match) {
          resolvedSize = parseFloat(match[1]) * 4; // Tailwind unit → px
        }
      }
      if (!resolvedSize) resolvedSize = 20; // sensible default

      return (
        <IconifyIcon
          icon={basilName}
          className={className}
          width={resolvedSize}
          height={resolvedSize}
          style={style}
          {...(rest as any)}
        />
      );
    },
  );
  BasilIcon.displayName = lucideName;
  return BasilIcon;
}

// ── Export every icon name used in the codebase ───────────────────
// Navigation & Layout
export const LayoutDashboard = createBasilIcon('LayoutDashboard');
export const Home = createBasilIcon('Home');
export const Menu = createBasilIcon('Menu');
export const PanelLeftIcon = createBasilIcon('PanelLeftIcon');
export const Grid = createBasilIcon('Grid');
export const List = createBasilIcon('List');
export const Layers = createBasilIcon('Layers');

// Users
export const Users = createBasilIcon('Users');
export const User = createBasilIcon('User');
export const UserCheck = createBasilIcon('UserCheck');
export const UserPlus = createBasilIcon('UserPlus');
export const UserX = createBasilIcon('UserX');

// Time & Calendar
export const Clock = createBasilIcon('Clock');
export const Clock3 = createBasilIcon('Clock3');
export const Timer = createBasilIcon('Timer');
export const Calendar = createBasilIcon('Calendar');
export const CalendarDays = createBasilIcon('CalendarDays');

// Documents & Files
export const FileText = createBasilIcon('FileText');
export const FileWarning = createBasilIcon('FileWarning');
export const FileCheck = createBasilIcon('FileCheck');
export const FileCheck2 = createBasilIcon('FileCheck2');
export const FileSpreadsheet = createBasilIcon('FileSpreadsheet');
export const BookOpen = createBasilIcon('BookOpen');

// Business
export const Briefcase = createBasilIcon('Briefcase');
export const CreditCard = createBasilIcon('CreditCard');
export const Wallet = createBasilIcon('Wallet');
export const Receipt = createBasilIcon('Receipt');
export const DollarSign = createBasilIcon('DollarSign');
export const Landmark = createBasilIcon('Landmark');

// Charts & Analytics
export const BarChart2 = createBasilIcon('BarChart2');
export const BarChart3 = createBasilIcon('BarChart3');
export const PieChart = createBasilIcon('PieChart');
export const Activity = createBasilIcon('Activity');
export const TrendingUp = createBasilIcon('TrendingUp');
export const TrendingDown = createBasilIcon('TrendingDown');
export const Percent = createBasilIcon('Percent');

// Settings & Admin
export const Settings = createBasilIcon('Settings');
export const Settings2 = createBasilIcon('Settings2');
export const Sliders = createBasilIcon('Sliders');
export const SlidersHorizontal = createBasilIcon('SlidersHorizontal');

// Actions
export const Search = createBasilIcon('Search');
export const SearchIcon = createBasilIcon('SearchIcon');
export const Filter = createBasilIcon('Filter');
export const Plus = createBasilIcon('Plus');
export const PlusCircle = createBasilIcon('PlusCircle');
export const Minus = createBasilIcon('Minus');
export const MinusIcon = createBasilIcon('MinusIcon');
export const Edit = createBasilIcon('Edit');
export const Edit3 = createBasilIcon('Edit3');
export const Pencil = createBasilIcon('Pencil');
export const Trash2 = createBasilIcon('Trash2');
export const Save = createBasilIcon('Save');
export const Copy = createBasilIcon('Copy');
export const Download = createBasilIcon('Download');
export const Upload = createBasilIcon('Upload');
export const UploadCloud = createBasilIcon('UploadCloud');
export const Send = createBasilIcon('Send');
export const Printer = createBasilIcon('Printer');
export const RefreshCw = createBasilIcon('RefreshCw');
export const RefreshCcw = createBasilIcon('RefreshCcw');
export const RotateCcw = createBasilIcon('RotateCcw');

// Status & Feedback
export const Check = createBasilIcon('Check');
export const CheckIcon = createBasilIcon('CheckIcon');
export const CheckCircle = createBasilIcon('CheckCircle');
export const CheckCircle2 = createBasilIcon('CheckCircle2');
export const BadgeCheck = createBasilIcon('BadgeCheck');
export const AlertCircle = createBasilIcon('AlertCircle');
export const AlertTriangle = createBasilIcon('AlertTriangle');
export const Info = createBasilIcon('Info');
export const HelpCircle = createBasilIcon('HelpCircle');
export const Ban = createBasilIcon('Ban');
export const X = createBasilIcon('X');
export const XIcon = createBasilIcon('XIcon');
export const XCircle = createBasilIcon('XCircle');
export const Bell = createBasilIcon('Bell');

// Visibility
export const Eye = createBasilIcon('Eye');
export const EyeOff = createBasilIcon('EyeOff');

// Navigation arrows
export const ArrowLeft = createBasilIcon('ArrowLeft');
export const ArrowRight = createBasilIcon('ArrowRight');
export const ArrowUpRight = createBasilIcon('ArrowUpRight');
export const ArrowDownRight = createBasilIcon('ArrowDownRight');
export const ArrowRightLeft = createBasilIcon('ArrowRightLeft');
export const ArrowUpDown = createBasilIcon('ArrowUpDown');
export const ChevronDown = createBasilIcon('ChevronDown');
export const ChevronDownIcon = createBasilIcon('ChevronDownIcon');
export const ChevronUpIcon = createBasilIcon('ChevronUpIcon');
export const ChevronLeft = createBasilIcon('ChevronLeft');
export const ChevronLeftIcon = createBasilIcon('ChevronLeftIcon');
export const ChevronRight = createBasilIcon('ChevronRight');
export const ChevronRightIcon = createBasilIcon('ChevronRightIcon');
export const ChevronsUpDown = createBasilIcon('ChevronsUpDown');

// Security
export const Lock = createBasilIcon('Lock');
export const Unlock = createBasilIcon('Unlock');
export const Shield = createBasilIcon('Shield');
export const ShieldCheck = createBasilIcon('ShieldCheck');
export const ShieldAlert = createBasilIcon('ShieldAlert');
export const KeyRound = createBasilIcon('KeyRound');

// Theme
export const Sun = createBasilIcon('Sun');
export const Sunrise = createBasilIcon('Sunrise');
export const Moon = createBasilIcon('Moon');
export const Sunset = createBasilIcon('Sunset');

// Location & Map
export const MapPin = createBasilIcon('MapPin');
export const MapPinOff = createBasilIcon('MapPinOff');
export const Map = createBasilIcon('Map');
export const Navigation = createBasilIcon('Navigation');
export const Locate = createBasilIcon('Locate');
export const Compass = createBasilIcon('Compass');
export const Globe = createBasilIcon('Globe');
export const Pin = createBasilIcon('Pin');

// Buildings & Org
export const Building = createBasilIcon('Building');
export const Building2 = createBasilIcon('Building2');
export const FolderTree = createBasilIcon('FolderTree');
export const FolderOpen = createBasilIcon('FolderOpen');
export const GitMerge = createBasilIcon('GitMerge');

// Communication
export const Mail = createBasilIcon('Mail');
export const Phone = createBasilIcon('Phone');
export const Smartphone = createBasilIcon('Smartphone');
export const Megaphone = createBasilIcon('Megaphone');
export const ExternalLink = createBasilIcon('ExternalLink');

// Auth
export const LogOut = createBasilIcon('LogOut');

// Misc
export const Camera = createBasilIcon('Camera');
export const Image = createBasilIcon('Image');
export const Paperclip = createBasilIcon('Paperclip');
export const Award = createBasilIcon('Award');
export const Gift = createBasilIcon('Gift');
export const PartyPopper = createBasilIcon('PartyPopper');
export const Sparkles = createBasilIcon('Sparkles');
export const Coffee = createBasilIcon('Coffee');
export const Stethoscope = createBasilIcon('Stethoscope');
export const HeartHandshake = createBasilIcon('HeartHandshake');
export const LifeBuoy = createBasilIcon('LifeBuoy');
export const GraduationCap = createBasilIcon('GraduationCap');
export const Hash = createBasilIcon('Hash');
export const Scale = createBasilIcon('Scale');
export const History = createBasilIcon('History');

// Infrastructure
export const Server = createBasilIcon('Server');
export const Database = createBasilIcon('Database');
export const Cpu = createBasilIcon('Cpu');

// Loading
export const Loader2 = createBasilIcon('Loader2');
export const Loader2Icon = createBasilIcon('Loader2Icon');

// Other
export const MoreHorizontalIcon = createBasilIcon('MoreHorizontalIcon');

// Re-export type for compatibility with code that does `icon: typeof LayoutDashboard`
export type LucideIcon = ReturnType<typeof createBasilIcon>;
