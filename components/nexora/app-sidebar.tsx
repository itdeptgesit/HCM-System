"use client"

import * as React from "react"

import { navigation } from "@/config/navigation"

import { NavMain } from "@/components/nexora/nav-main"
import { NavUser } from "@/components/nexora/nav-user"
import { TeamSwitcher } from "@/components/nexora/team-switcher"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

import { ScrollArea } from "@workspace/ui/components/scroll-area"

import {
  TargetIcon,
  MegaphoneIcon,
  ChartNoAxesCombinedIcon,
} from "lucide-react"

const data = {
  user: {
    name: "Alex Morgan",
    email: "alex@nexora.dev",
    avatar: "https://untitledui.com/images/avatars/aliah-lane",
  },

  teams: [
  {
    name: "Nexora",
    logo: <TargetIcon className="size-4" />,
    plan: "CRM",
  },
  {
    name: "Marketing",
    logo: <MegaphoneIcon className="size-4" />,
    plan: "Marketing",
  },
  {
    name: "Analytics",
    logo: <ChartNoAxesCombinedIcon className="size-4" />,
    plan: "Analytics",
  },
],
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props} collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          <NavMain groups={navigation} />
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>

      <SidebarRail className="hover:bg-transparent hover:after:bg-transparent" />
    </Sidebar>
  )
}