import { CalendarAgendaView } from "./calendar-agenda-view"
import { CalendarDeleteDialog } from "./calendar-delete-dialog"
import { CalendarHeader } from "./calendar-header"
import { CalendarMonthView } from "./calendar-month-view"
import { CalendarSidebar } from "./calendar-sidebar"
import { CalendarTimeGrid } from "./calendar-time-grid"
import { CalendarToolbar } from "./calendar-toolbar"
import { getWeekDays } from "./calendar-utils"
import { EventDetailsDialog } from "./event-details-dialog"
import { EventFormSheet } from "./event-form-sheet"
import { useCalendar } from "./use-calendar"

export function CalendarPage() {
  const calendar = useCalendar()
  const { view, currentDate, now, visibleEvents } = calendar

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-4">
      <CalendarHeader onCreate={() => calendar.openCreate()} />

      <div className="flex min-h-0 flex-1 gap-4">
        <CalendarSidebar
          currentDate={currentDate}
          onDateChange={calendar.setCurrentDate}
          events={visibleEvents}
          upcomingEvents={calendar.upcomingEvents}
          typeCounts={calendar.typeCounts}
          activeTypes={calendar.activeTypes}
          onToggleType={calendar.toggleType}
          onEventClick={calendar.openDetails}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <CalendarToolbar
            label={calendar.rangeLabel}
            view={view}
            onViewChange={calendar.setView}
            search={calendar.search}
            onSearchChange={calendar.setSearch}
            onPrev={calendar.goPrev}
            onNext={calendar.goNext}
            onToday={calendar.goToday}
          />

          <div className="flex h-[calc(100vh-17rem)] min-h-[680px] flex-col overflow-hidden rounded-xl border bg-card">
            {view === "month" && (
              <CalendarMonthView
                currentDate={currentDate}
                now={now}
                events={visibleEvents}
                onCreate={(date) => calendar.openCreate(date)}
                onEventClick={calendar.openDetails}
                onShowDay={calendar.showDay}
              />
            )}

            {view === "week" && (
              <CalendarTimeGrid
                // remount per range so the view re-scrolls to the morning
                key={`week-${currentDate.toDateString()}`}
                days={getWeekDays(currentDate)}
                now={now}
                events={visibleEvents}
                onCreate={calendar.openCreate}
                onEventClick={calendar.openDetails}
                onShowDay={calendar.showDay}
              />
            )}

            {view === "day" && (
              <CalendarTimeGrid
                key={`day-${currentDate.toDateString()}`}
                days={[currentDate]}
                now={now}
                events={visibleEvents}
                onCreate={calendar.openCreate}
                onEventClick={calendar.openDetails}
              />
            )}

            {view === "agenda" && (
              <CalendarAgendaView
                currentDate={currentDate}
                now={now}
                events={visibleEvents}
                onEventClick={calendar.openDetails}
              />
            )}
          </div>
        </div>
      </div>

      <EventFormSheet
        key={calendar.form.key}
        open={calendar.form.open}
        onOpenChange={calendar.setFormOpen}
        initial={calendar.form.draft}
        onSave={calendar.saveEvent}
      />

      <EventDetailsDialog
        open={calendar.details.open}
        onOpenChange={calendar.setDetailsOpen}
        event={calendar.details.event}
        onEdit={calendar.editFromDetails}
        onDelete={calendar.requestDelete}
      />

      <CalendarDeleteDialog
        open={calendar.removal.open}
        onOpenChange={calendar.setRemovalOpen}
        event={calendar.removal.event}
        onConfirm={calendar.confirmDelete}
      />
    </div>
  )
}