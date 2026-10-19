import { AlignLeft, Clock, MapPin, Pencil, Trash2, Users } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { EVENT_TYPE_CONFIG, type CalendarEvent } from "./calendar-data"
import { formatEventWhen } from "./calendar-utils"

interface EventDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CalendarEvent | null
  onEdit: (event: CalendarEvent) => void
  onDelete: (event: CalendarEvent) => void
}

export function EventDetailsDialog({
  open,
  onOpenChange,
  event,
  onEdit,
  onDelete,
}: EventDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {event && (
          <>
            <DialogHeader>
              <div>
                <Badge variant="outline" className="gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${EVENT_TYPE_CONFIG[event.type].dot}`}
                  />
                  {EVENT_TYPE_CONFIG[event.type].label}
                </Badge>
              </div>
              <DialogTitle className="text-xl">{event.title}</DialogTitle>
              <DialogDescription>Event details</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{formatEventWhen(event)}</span>
              </div>

              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}

              {event.attendees.length > 0 && (
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1.5">
                    {event.attendees.map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {event.description && (
                <div className="flex items-start gap-3">
                  <AlignLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-muted-foreground">{event.description}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => onDelete(event)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button className="gap-2" onClick={() => onEdit(event)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
