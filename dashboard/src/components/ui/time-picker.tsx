"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
}

export function TimePicker({ date, setDate, className }: TimePickerProps) {
  const [hours, setHours] = React.useState(date ? date.getHours() : 0);
  const [minutes, setMinutes] = React.useState(date ? date.getMinutes() : 0);

  const handleHourChange = (value: string) => {
    const newHours = parseInt(value, 10);
    setHours(newHours);
    updateDate(newHours, minutes);
  };

  const handleMinuteChange = (value: string) => {
    const newMinutes = parseInt(value, 10);
    setMinutes(newMinutes);
    updateDate(hours, newMinutes);
  };
  const updateDate = (newHours: number, newMinutes: number) => {
    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(newHours);
    newDate.setMinutes(newMinutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    setDate(newDate);
  };

  React.useEffect(() => {
    if (date) {
      setHours(date.getHours());
      setMinutes(date.getMinutes());
    }
  }, [date]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="grid gap-1 text-center">
        <Label htmlFor="hours" className="text-xs">
          ชั่วโมง
        </Label>
        <Select value={String(hours).padStart(2, "0")} onValueChange={handleHourChange}>
          <SelectTrigger id="hours" className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {[...Array(24).keys()].map((h) => (
              <SelectItem key={h} value={String(h).padStart(2, "0")}>
                {String(h).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1 text-center">
        <Label htmlFor="minutes" className="text-xs">
          นาที
        </Label>
        <Select value={String(minutes).padStart(2, "0")} onValueChange={handleMinuteChange}>
          <SelectTrigger id="minutes" className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {[...Array(60).keys()].map((m) => (
              <SelectItem key={m} value={String(m).padStart(2, "0")}>
                {String(m).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}