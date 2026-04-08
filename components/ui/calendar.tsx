"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export interface CalendarProps {
  className?: string
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  month?: Date
  onMonthChange?: (date: Date) => void
  disabled?: (date: Date) => boolean
}

function Calendar({
  className,
  selected,
  onSelect,
  month: controlledMonth,
  onMonthChange,
  disabled,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState(
    () => controlledMonth || selected || new Date()
  )

  const currentMonth = controlledMonth || internalMonth

  const handleMonthChange = (newMonth: Date) => {
    if (onMonthChange) {
      onMonthChange(newMonth)
    } else {
      setInternalMonth(newMonth)
    }
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startDay = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const prevMonth = () => {
    handleMonthChange(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    handleMonthChange(new Date(year, month + 1, 1))
  }

  const handleSelect = (day: number) => {
    const date = new Date(year, month, day)
    if (disabled?.(date)) return
    if (onSelect) {
      if (
        selected &&
        selected.getFullYear() === year &&
        selected.getMonth() === month &&
        selected.getDate() === day
      ) {
        onSelect(undefined)
      } else {
        onSelect(date)
      }
    }
  }

  const isSelected = (day: number) => {
    if (!selected) return false
    return (
      selected.getFullYear() === year &&
      selected.getMonth() === month &&
      selected.getDate() === day
    )
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  const isDisabled = (day: number) => {
    if (!disabled) return false
    return disabled(new Date(year, month, day))
  }

  const monthName = currentMonth.toLocaleString("default", { month: "long" })
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = []

  for (let i = 0; i < startDay; i++) {
    currentWeek.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">
          {monthName} {year}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {dayNames.map((day) => (
              <th
                key={day}
                className="text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] text-center pb-1"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((day, dayIndex) => (
                <td
                  key={dayIndex}
                  className="text-center p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
                >
                  {day !== null ? (
                    <button
                      type="button"
                      aria-selected={isSelected(day) || undefined}
                      disabled={isDisabled(day)}
                      onClick={() => handleSelect(day)}
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "h-8 w-8 p-0 font-normal",
                        isSelected(day) &&
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        isToday(day) &&
                          !isSelected(day) &&
                          "bg-accent text-accent-foreground",
                        isDisabled(day) &&
                          "text-muted-foreground opacity-50 cursor-not-allowed"
                      )}
                    >
                      {day}
                    </button>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
