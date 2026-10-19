"use client"

import * as React from "react"
import {
  BellIcon,
  BriefcaseIcon,
  CalendarClockIcon,
  ChevronRightIcon,
  CheckIcon,
  FileSignatureIcon,
  PaperclipIcon,
  MessageSquareIcon,
  PlugZapIcon,
  ZapIcon,
  UserPlusIcon,
  XIcon,
  DownloadIcon
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationKind =
  | "lead-assigned"
  | "deal-won"
  | "task-overdue"
  | "mention"
  | "contract-signed"
  | "report-shared"   
  | "integration-error"
  | "usage-limit"    

type NotificationItem = {
  id: string
  kind: NotificationKind
  time: string
  unread: boolean
}

// ---------------------------------------------------------------------------
// Seed data — 8 items, new sequence
// ---------------------------------------------------------------------------

const initialNotifications: NotificationItem[] = [
  { id: "1", kind: "lead-assigned", time: "3 min ago", unread: true },
  { id: "2", kind: "deal-won", time: "22 min ago", unread: true },
  { id: "3", kind: "task-overdue", time: "1 hour ago", unread: true },
  { id: "4", kind: "mention", time: "2 hours ago", unread: true },
  { id: "5", kind: "contract-signed", time: "4 hours ago", unread: false },
  { id: "6", kind: "report-shared", time: "Yesterday", unread: false }, 
  { id: "7", kind: "integration-error", time: "Yesterday", unread: false },
  { id: "8", kind: "usage-limit", time: "2 days ago", unread: false },  
]

// ---------------------------------------------------------------------------
// Icon + accent per kind
// ---------------------------------------------------------------------------

const iconMap: Record<
  NotificationKind,
  { icon: React.ElementType; className: string }
> = {
  "lead-assigned": { icon: UserPlusIcon, className: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
  "deal-won": { icon: BriefcaseIcon, className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
  "task-overdue": { icon: CalendarClockIcon, className: "text-red-600 bg-red-50 dark:bg-red-500/10" },
  mention: { icon: MessageSquareIcon, className: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
  "contract-signed": { icon: FileSignatureIcon, className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
  "report-shared": { icon: PaperclipIcon, className: "text-slate-600 bg-slate-100 dark:bg-slate-500/10" },
  "integration-error": { icon: PlugZapIcon, className: "text-red-600 bg-red-50 dark:bg-red-500/10" },
  "usage-limit": { icon: ZapIcon, className: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
}

// ---------------------------------------------------------------------------
// Content per kind (kept separate from row shell so markup stays simple)
// ---------------------------------------------------------------------------

function NotificationContent({ kind }: { kind: NotificationKind }) {
  switch (kind) {
    case "lead-assigned":
      return (
        <>
          <p className="text-sm leading-snug">
            <span className="font-medium">New lead assigned</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Priya Nair from Hexon Traders was routed to you — Enterprise tier.
          </p>
        </>
      )

    case "deal-won":
      return (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Deal closed-won</p>
            <span className="text-xs font-semibold text-emerald-600">
              $86,400
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Vantage Retail signed the annual contract. Great work!
          </p>
        </>
      )

    case "task-overdue":
      return (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Task overdue</p>
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              Overdue
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            "Send renewal proposal" for Orion Logistics was due yesterday.
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" className="h-7 px-2.5 text-xs">
              Complete
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs">
              Reschedule
            </Button>
          </div>
        </>
      )

    case "mention":
      return (
        <>
          <p className="text-sm leading-snug">
            <span className="font-medium">Daniel Cho</span> mentioned you in
            a note
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            "@you can you confirm pricing before we send this to Fenwick Co?"
          </p>
        </>
      )

    case "contract-signed":
      return (
        <>
          <p className="text-sm leading-snug">
            <span className="font-medium">Contract e-signed</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Blackwell & Co. signed the MSA. Onboarding can begin.
          </p>
        </>
      )

    case "report-shared":
  return (
    <>
      <p className="text-sm leading-snug">
        <span className="font-medium">@sarah_r</span> shared a report with you
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Q3 pipeline analysis
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-md border px-2.5 py-1">
        <div className="flex items-center gap-1.5 text-xs">
          <PaperclipIcon className="size-3.5 text-muted-foreground" />
          <span className="font-medium">pipeline-q3.pdf</span>
          <span className="text-muted-foreground">(3.2 MB)</span>
        </div>
        <Button variant="ghost" size="icon" className="size-6" aria-label="Download">
          <DownloadIcon className="size-3.5" />
        </Button>
      </div>
    </>
  )

    case "integration-error":
      return (
        <>
          <p className="text-sm font-medium">Sync failed</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Gmail integration couldn't sync 4 messages. Reconnect your
            account.
          </p>
        </>
      )

    case "usage-limit":
  return (
    <>
      <p className="text-sm font-medium">API usage at 80%</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        You've used 80% of your monthly API quota. Consider upgrading.
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full w-4/5 rounded-full bg-amber-500" />
      </div>
    </>
  )
  }
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function NotificationRow({
  item,
  onMarkRead,
  onRemove,
}: {
  item: NotificationItem
  onMarkRead: (id: string) => void
  onRemove: (id: string) => void
}) {
  const { icon: Icon, className } = iconMap[item.kind]

  return (
    <div className="group relative flex gap-3 px-3 py-3 hover:bg-muted/50">
      <span
        className={cn(
          "mt-2 size-1.5 shrink-0 rounded-full",
          item.unread ? "bg-primary" : "bg-transparent"
        )}
      />

      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          className
        )}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <NotificationContent kind={item.kind} />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {item.time}
        </p>
      </div>

      {item.unread && (
        <div className="absolute right-2 top-2 hidden items-center gap-1 rounded-md border bg-background p-0.5 shadow-sm group-hover:flex">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Mark as read"
            onClick={() => onMarkRead(item.id)}
          >
            <CheckIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Remove"
            onClick={() => onRemove(item.id)}
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HeaderNotifications() {
  const [notifications, setNotifications] = React.useState(
    initialNotifications
  )

  const hasUnread = notifications.some((n) => n.unread)

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    )
  }

  const remove = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-8"
            aria-label="Notifications"
          >
            <BellIcon className="size-4" />
            {hasUnread && (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
            )}
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-88 p-0" sideOffset={6}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="m-0" />

        <ScrollArea className="h-[420px]">
          <div className="divide-y">
            {notifications.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onMarkRead={markRead}
                onRemove={remove}
              />
            ))}
          </div>
        </ScrollArea>

        <DropdownMenuSeparator className="m-0" />

        <DropdownMenuGroup>
          <DropdownMenuItem className="justify-center gap-1.5 py-2.5 text-sm font-medium">
            View all notifications
            <ChevronRightIcon className="size-3.5" />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}