import { useState } from "react"
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
  FaTiktok,
  FaEnvelope,
  FaXTwitter
} from "react-icons/fa6"
import { Search } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { Input } from "@workspace/ui/components/input"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

// -----------------------------------------------------------------------------
// Channel Data
// -----------------------------------------------------------------------------

const channels = [
  {
    id: "facebook",
    name: "Facebook",
    icon: FaFacebookF,
    iconBg: "bg-[#1877F2]",
    leads: 92,
    engagement: 78,
    conversion: 64,
    revenue: "$128K",
    retention: 71,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: FaInstagram,
    iconBg: "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]",
    leads: 84,
    engagement: 91,
    conversion: 58,
    revenue: "$112K",
    retention: 76,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: FaLinkedinIn,
    iconBg: "bg-[#0A66C2]",
    leads: 76,
    engagement: 82,
    conversion: 79,
    revenue: "$186K",
    retention: 88,
  },
  {
    id: "twitter",
    name: "X / Twitter",
    icon: FaXTwitter,
    iconBg: "bg-black dark:bg-zinc-800",
    leads: 61,
    engagement: 73,
    conversion: 52,
    revenue: "$84K",
    retention: 65,
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: FaYoutube,
    iconBg: "bg-[#FF0000]",
    leads: 48,
    engagement: 86,
    conversion: 67,
    revenue: "$96K",
    retention: 81,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: FaTiktok,
    iconBg: "bg-black dark:bg-zinc-800",
    leads: 57,
    engagement: 94,
    conversion: 49,
    revenue: "$72K",
    retention: 62,
  },
  {
    id: "email",
    name: "Campaigns",
    icon: FaEnvelope,
    iconBg: "bg-[#4B5563]",
    leads: 68,
    engagement: 81,
    conversion: 55,
    revenue: "$90K",
    retention: 74,
  },
  
]

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ChannelPerformance() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <Card className="w-full overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Header with Search Box */}
      {/* ------------------------------------------------------------------ */}

      <CardHeader className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">
            Channel Performance Comparison
          </CardTitle>

          <p className="text-xs text-muted-foreground">
            Compare lead generation, engagement, conversion and retention
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search channel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full pl-8 text-xs"
          />
        </div>
      </CardHeader>

      {/* ------------------------------------------------------------------ */}
      {/* Table Container */}
      {/* ------------------------------------------------------------------ */}

      <CardContent className="p-0 pb-0 [&:has(table)]:pb-0">
        <div className="overflow-x-auto border-t">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-10 pl-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Channel
                </TableHead>

                <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Leads
                </TableHead>

                <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Engagement
                </TableHead>

                <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Conversion
                </TableHead>

                <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Revenue
                </TableHead>

                <TableHead className="h-10 pr-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Retention
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="[&_tr:last-child]:border-0">
              {filteredChannels.length > 0 ? (
                filteredChannels.map((channel) => {
                  const Icon = channel.icon

                  return (
                    <TableRow
                      key={channel.id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      {/* Channel */}
                      <TableCell className="pl-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg border border-border p-0.5 shadow-xs">
                            <div
                              className={`flex size-full items-center justify-center rounded-md text-white ${channel.iconBg}`}
                            >
                              <Icon className="size-3.5" />
                            </div>
                          </div>

                          <span className="text-sm font-medium">
                            {channel.name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Leads */}
                      <TableCell className="py-2.5 text-sm tabular-nums text-muted-foreground">
                        {channel.leads}
                      </TableCell>

                      {/* Engagement */}
                      <TableCell className="py-2.5 text-sm tabular-nums text-muted-foreground">
                        {channel.engagement}%
                      </TableCell>

                      {/* Conversion */}
                      <TableCell className="py-2.5 text-sm font-medium tabular-nums">
                        {channel.conversion}%
                      </TableCell>

                      {/* Revenue */}
                      <TableCell className="py-2.5 text-sm font-medium tabular-nums">
                        {channel.revenue}
                      </TableCell>

                      {/* Retention */}
                      <TableCell className="py-2.5 pr-4 text-sm tabular-nums text-muted-foreground">
                        {channel.retention}%
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-xs text-muted-foreground"
                  >
                    No channels found matching "{searchQuery}".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}