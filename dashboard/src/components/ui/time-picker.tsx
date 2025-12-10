"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
}

export function TimePicker({ date, setDate, className }: TimePickerProps) {
  const [hours, setHours] = React.useState(date ? date.getHours() : 0);
  const [minutes, setMinutes] = React.useState(date ? date.getMinutes() : 0);

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newHours = parseInt(e.target.value, 10);
    if (isNaN(newHours)) newHours = 0;
    if (newHours > 23) newHours = 23;
    if (newHours < 0) newHours = 0;
    setHours(newHours);
    updateDate(newHours, minutes);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newMinutes = parseInt(e.target.value, 10);
    if (isNaN(newMinutes)) newMinutes = 0;
    if (newMinutes > 59) newMinutes = 59;
    if (newMinutes < 0) newMinutes = 0;
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
        <Input
          id="hours"
          type="number"
          value={String(hours).padStart(2, "0")}
          onChange={handleHourChange}
          className="w-16 text-center"
        />
      </div>
      <div className="grid gap-1 text-center">
        <Label htmlFor="minutes" className="text-xs">
          นาที
        </Label>
        <Input
          id="minutes"
          type="number"
          value={String(minutes).padStart(2, "0")}
          onChange={handleMinuteChange}
          className="w-16 text-center"
        />
      </div>
    </div>
  );
}