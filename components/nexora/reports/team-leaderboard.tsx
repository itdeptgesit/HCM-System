import {
  ArrowUpRight,
  ExternalLink,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"

import { Button } from "@workspace/ui/components/button"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

// -----------------------------------------------------------------------------
// Team Data
// -----------------------------------------------------------------------------

const leaders = [
  {
    id: "1",
    name: "Sarah Johnson",
    title: "Enterprise Sales",
    dealsWon: 42,
    revenue: "$186.4K",
    attainment: 94,
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    id: "2",
    name: "Michael Chen",
    title: "Account Executive",
    dealsWon: 36,
    revenue: "$154.8K",
    attainment: 88,
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    id: "3",
    name: "Emily Davis",
    title: "Senior Account Executive",
    dealsWon: 31,
    revenue: "$128.6K",
    attainment: 81,
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    id: "4",
    name: "James Wilson",
    title: "Sales Executive",
    dealsWon: 28,
    revenue: "$96.4K",
    attainment: 74,
    avatar: "https://randomuser.me/api/portraits/men/46.jpg",
  },
  {
    id: "5",
    name: "Olivia Martinez",
    title: "Account Executive",
    dealsWon: 24,
    revenue: "$82.7K",
    attainment: 68,
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
  },
]

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function TeamLeaderboard() {
  return (
    <Card className="overflow-hidden w-full">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">
            Top Performing Team
          </CardTitle>

          <p className="mt-1 text-xs text-muted-foreground">
            Sales performance this quarter
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          View all
          <ArrowUpRight className="ml-1 size-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {/* Header */}
        <div className="grid grid-cols-[minmax(0,1fr)_80px_90px] gap-3 border-y bg-muted/30 px-6 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Team member</span>
          <span className="text-right">Won</span>
          <span className="text-right">Action</span>
        </div>

        {/* Members */}
        <div className="divide-y">
          {leaders.map((leader) => (
            <div
              key={leader.id}
              className="group grid grid-cols-[minmax(0,1fr)_80px_90px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              {/* Member */}
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarImage
                    src={leader.avatar}
                    alt={leader.name}
                  />

                  <AvatarFallback>
                    {leader.name
                      .split(" ")
                      .map((name) => name[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {leader.name}
                  </p>

                  <p className="truncate text-xs text-muted-foreground">
                    {leader.title}
                  </p>
                </div>
              </div>

              {/* Deals Won */}
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {leader.dealsWon}
                </p>

                <p className="text-[10px] text-muted-foreground">
                  deals
                </p>
              </div>
              {/* Review */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                >
                  Review
                </Button>
              </div>
            </div>
          ))}
        </div>

      </CardContent>
      <div className="border-t px-3 pt-3">
        <Button
          variant="outline"
          className="w-full"
        >
          <ExternalLink className="mr-2 size-4" />
          View all team members
        </Button>
      </div>
    </Card>
  )
}