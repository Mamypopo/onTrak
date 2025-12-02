'use client'

import * as React from "react"
import DatePicker from "react-datepicker"
import { th } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import "react-datepicker/dist/react-datepicker.css"

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  showTime?: boolean
  className?: string
}

export function DatePickerComponent({
  value,
  onChange,
  placeholder = "เลือกวันที่และเวลา",
  showTime = true,
  className
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(
    value ? new Date(value) : null
  )

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date)
    if (date) {
      onChange(date.toISOString())
    } else {
      onChange('')
    }
  }

  return (
    <div className={cn("relative", className)}>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        showTimeSelect={showTime}
        timeIntervals={15}
        dateFormat={showTime ? "dd MMM yyyy HH:mm" : "dd MMM yyyy"}
        locale={th}
        placeholderText={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !selectedDate && "text-muted-foreground"
        )}
        calendarClassName="!border !border-border !rounded-md !shadow-lg"
        popperClassName="z-50"
        wrapperClassName="w-full"
        customInput={
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate
              ? showTime
                ? selectedDate.toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : selectedDate.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
              : placeholder}
          </Button>
        }
      />
      <style jsx global>{`
        .react-datepicker {
          font-family: inherit;
          border-color: hsl(var(--border));
          background-color: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        .react-datepicker__header {
          background-color: hsl(var(--muted));
          border-bottom-color: hsl(var(--border));
        }
        .react-datepicker__current-month {
          color: hsl(var(--foreground));
          font-weight: 600;
        }
        .react-datepicker__day-name {
          color: hsl(var(--muted-foreground));
        }
        .react-datepicker__day {
          color: hsl(var(--foreground));
        }
        .react-datepicker__day:hover {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }
        .react-datepicker__day--selected {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .react-datepicker__day--today {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          font-weight: 600;
        }
        .react-datepicker__time-container {
          border-left-color: hsl(var(--border));
        }
        .react-datepicker__time-container .react-datepicker__time {
          background-color: hsl(var(--background));
        }
        .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box {
          background-color: hsl(var(--background));
        }
        .react-datepicker__time-list-item {
          color: hsl(var(--foreground));
        }
        .react-datepicker__time-list-item:hover {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }
        .react-datepicker__time-list-item--selected {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .react-datepicker__navigation-icon::before {
          border-color: hsl(var(--foreground));
        }
        .react-datepicker__month-dropdown,
        .react-datepicker__year-dropdown {
          background-color: hsl(var(--background));
          border-color: hsl(var(--border));
        }
        .react-datepicker__month-option,
        .react-datepicker__year-option {
          color: hsl(var(--foreground));
        }
        .react-datepicker__month-option:hover,
        .react-datepicker__year-option:hover {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }
        .react-datepicker__month-option--selected,
        .react-datepicker__year-option--selected {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
      `}</style>
    </div>
  )
}
