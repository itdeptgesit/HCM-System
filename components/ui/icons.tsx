/**
 * Nexora Unified Icon System
 * ---------------------------
 * Drop-in, ultra-clean Lucide icon exports matching Nexora design guidelines.
 * Re-exports native Lucide icons with stroke width and dimensions optimized for SaaS interfaces.
 */
import * as LucideIcons from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';

export type { LucideIcon, LucideProps };
export type IconProps = LucideProps;

// Re-export all native Lucide icons
export * from 'lucide-react';

// Backwards-compatible aliases for components that import with the *Icon suffix
export const CheckIcon = LucideIcons.Check;
export const SearchIcon = LucideIcons.Search;
export const PlusIcon = LucideIcons.Plus;
export const MinusIcon = LucideIcons.Minus;
export const XIcon = LucideIcons.X;
export const TrashIcon = LucideIcons.Trash2;
export const Trash2Icon = LucideIcons.Trash2;
export const PencilIcon = LucideIcons.Pencil;
export const EyeIcon = LucideIcons.Eye;
export const FileTextIcon = LucideIcons.FileText;
export const Building2Icon = LucideIcons.Building2;
export const SlidersHorizontalIcon = LucideIcons.SlidersHorizontal;
export const CameraIcon = LucideIcons.Camera;
export const UserIcon = LucideIcons.User;
export const DownloadIcon = LucideIcons.Download;
export const LayoutGridIcon = LucideIcons.LayoutGrid;
export const ListIcon = LucideIcons.List;
export const MoreHorizontalIcon = LucideIcons.MoreHorizontal;
export const FolderIcon = LucideIcons.Folder;
export const ArrowRightIcon = LucideIcons.ArrowRight;
export const ArrowLeftIcon = LucideIcons.ArrowLeft;
export const ChevronDownIcon = LucideIcons.ChevronDown;
export const ChevronUpIcon = LucideIcons.ChevronUp;
export const ChevronLeftIcon = LucideIcons.ChevronLeft;
export const ChevronRightIcon = LucideIcons.ChevronRight;
export const ChevronsUpDownIcon = LucideIcons.ChevronsUpDown;
export const SettingsIcon = LucideIcons.Settings;
export const PanelLeftIcon = LucideIcons.PanelLeft;
export const Loader2Icon = LucideIcons.Loader2;
