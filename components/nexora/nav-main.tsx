"use client"

import type { LucideIcon } from "lucide-react"
import { ChevronRight } from "lucide-react"
import { Link, useLocation } from "@tanstack/react-router"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar"

type NavSubItem = {
  title: string
  url: string
}

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  items?: readonly NavSubItem[]
}

type NavGroup = {
  label: string
  items: readonly NavItem[]
}

const menuButtonCollapsedClasses =
  "group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center"

/**
 * Shared look for every menu button (parent, collapsible parent, sub item).
 * Uses only theme tokens, so light/dark switch automatically.
 *  - default: muted text, transparent bg/border
 *  - hover:   raised "card" look
 *  - active:  same raised look + foreground text + medium weight
 */
const itemClasses = [
  "border border-transparent",
  "bg-transparent shadow-none",
  "text-muted-foreground",
  "transition-all duration-150",

  // Raised look (shared by hover + active)
  // Light: white card with border + shadow
  // Dark: muted surface with border + shadow
  "hover:!bg-white dark:hover:!bg-muted",
  "hover:!border-border",
  "hover:!shadow-sm",
  "hover:!text-foreground",
  "hover:[&_svg]:!text-foreground",

  // Active: identical to hover
  "data-[active=true]:!bg-white dark:data-[active=true]:!bg-muted",
  "data-[active=true]:!border-border",
  "data-[active=true]:!shadow-sm",
  "data-[active=true]:!text-foreground",
  "data-[active=true]:!font-medium",
  "data-[active=true]:[&_svg]:!text-foreground",

  // Same, for versions of the sidebar that use `data-active` without a value
  "data-active:!bg-white dark:data-active:!bg-muted",
  "data-active:!border-border",
  "data-active:!shadow-sm",
  "data-active:!text-foreground",
  "data-active:!font-medium",
  "data-active:[&_svg]:!text-foreground",
].join(" ")

export function NavMain({
  groups,
}: {
  groups: readonly NavGroup[]
}) {
  const location = useLocation()
  const pathname = location.pathname

  const isExactUrlActive = (url: string) => pathname === url

  const isSectionActive = (url: string) =>
    pathname === url || pathname.startsWith(`${url}/`)

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel className="text-muted-foreground">
            {group.label}
          </SidebarGroupLabel>

          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            {group.items.map((item) => {
              const Icon = item.icon

              const hasChildren = Boolean(
                item.items && item.items.length > 0,
              )

              // ------------------------------------------------------------
              // Normal menu item
              // ------------------------------------------------------------
              if (!hasChildren) {
                const active = isSectionActive(item.url)

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      render={<Link to={item.url} />}
                      isActive={active}
                      className={`${menuButtonCollapsedClasses} ${itemClasses}`}
                    >
                      {Icon && <Icon />}

                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }

              // ------------------------------------------------------------
              // Collapsible menu item
              // ------------------------------------------------------------
              const groupActive = isSectionActive(item.url)

              return (
                <Collapsible
                  key={item.title}
                  className="group/collapsible"
                  defaultOpen={groupActive}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={groupActive}
                          className={`${menuButtonCollapsedClasses} ${itemClasses}`}
                        />
                      }
                    >
                      {Icon && <Icon />}

                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>

                      <ChevronRight
                        className="
                          ml-auto
                          text-current
                          transition-transform
                          duration-200
                          group-data-open/collapsible:rotate-90
                          group-data-[collapsible=icon]:hidden
                        "
                      />
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const subActive = isExactUrlActive(subItem.url)

                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                render={<Link to={subItem.url} />}
                                isActive={subActive}
                                className={itemClasses}
                              >
                                <span>{subItem.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}