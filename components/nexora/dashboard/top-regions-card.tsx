"use client"

import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  DownloadIcon,
  EyeIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

// ---------------------------------------------------------------------------
// Data — top countries by pipeline share
// ---------------------------------------------------------------------------

const countries = [
  { rank: 1, name: "Australia", code: "au", share: 48, change: "+6%", trend: "up" as const },
  { rank: 2, name: "Malaysia", code: "my", share: 33, change: "+3%", trend: "up" as const },
  { rank: 3, name: "Indonesia", code: "id", share: 25, change: "-2%", trend: "down" as const },
  { rank: 4, name: "Singapore", code: "sg", share: 17, change: "+4%", trend: "up" as const },
  { rank: 5, name: "Japan", code: "jp", share: 14, change: "-1%", trend: "down" as const },
  { rank: 6, name: "India", code: "in", share: 11, change: "+8%", trend: "up" as const },
  { rank: 7, name: "Vietnam", code: "vn", share: 9, change: "+5%", trend: "up" as const },
  { rank: 8, name: "Thailand", code: "th", share: 7, change: "-3%", trend: "down" as const },
]

export function TopRegionsCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <p className="text-sm font-semibold">Top Country</p>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl p-2">
  <DropdownMenuItem className="gap-2">
    <EyeIcon className="size-4" />
    <span>View Details</span>
  </DropdownMenuItem>

  <DropdownMenuItem className="gap-2">
    <DownloadIcon className="size-4" />
    <span>Export Data</span>
  </DropdownMenuItem>

  <DropdownMenuItem className="gap-2">
    <RefreshCwIcon className="size-4" />
    <span>Refresh</span>
  </DropdownMenuItem>
</DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <div className="divide-y">
          {countries.map((country) => {
            const isUp = country.trend === "up"

            return (
              <div
                key={country.name}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm text-muted-foreground">
                    {country.rank}
                  </span>

                  <span className="relative size-5 shrink-0 overflow-hidden rounded-full border">
                    <img
                      src={`https://flagcdn.com/w40/${country.code}.png`}
                      srcSet={`https://flagcdn.com/w80/${country.code}.png 2x`}
                      alt={country.name}
                      className="size-full object-cover"
                    />
                  </span>

                  <p className="text-sm font-medium">{country.name}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {country.share}%
                  </span>
                  <span
                    className={cn(
                      "flex w-12 shrink-0 items-center justify-end gap-0.5 text-xs font-medium",
                      isUp
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {isUp ? (
                      <ArrowUpRightIcon className="size-3" />
                    ) : (
                      <ArrowDownRightIcon className="size-3" />
                    )}
                    {country.change}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <CardFooter className="border-t bg-background">
        <Button variant="outline" className="w-full gap-1.5">
          View more
          <ArrowRightIcon className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}