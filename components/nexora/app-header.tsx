"use client"

import { SidebarTrigger } from "@workspace/ui/components/sidebar"

import { HeaderNotifications } from "@/components/nexora/header-notifications"
import { HeaderCreate } from "@/components/nexora/header-create"
import { HeaderSearch } from "@/components/nexora/header-search"

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b">
      <div className="flex w-full items-center gap-3 px-4">
        {/* Sidebar */}
        <SidebarTrigger className="size-8 shrink-0" />

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Page title */}
        <div className="flex min-w-0 items-center">
          <h1 className="truncate text-sm font-medium">
            Dashboard
          </h1>
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <HeaderSearch />

          {/* Notifications */}
          <HeaderNotifications />
          <HeaderCreate />
        </div>
      </div>
    </header>
  )
}