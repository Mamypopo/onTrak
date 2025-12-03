import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CheckoutDevice {
  id: string;
  deviceCode: string;
  name: string | null;
  model?: string | null;
  status: "ONLINE" | "OFFLINE";
  borrowStatus?: "AVAILABLE" | "IN_USE" | "IN_MAINTENANCE";
}

interface DeviceMultiSelectProps {
  devices: CheckoutDevice[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function DeviceMultiSelect({ devices, selectedIds, onChange }: DeviceMultiSelectProps) {
  const allSelected = useMemo(
    () => devices.length > 0 && selectedIds.length === devices.length,
    [devices.length, selectedIds.length]
  );

  const isIndeterminate = useMemo(
    () => selectedIds.length > 0 && selectedIds.length < devices.length,
    [devices.length, selectedIds.length]
  );

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(devices.map((d) => d.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const getBorrowBadge = (status?: "AVAILABLE" | "IN_USE" | "IN_MAINTENANCE") => {
    const s = status || "AVAILABLE";
    switch (s) {
      case "IN_USE":
        return <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">กำลังใช้งาน</Badge>;
      case "IN_MAINTENANCE":
        return <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400">กำลังซ่อม</Badge>;
      default:
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">ว่าง</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>เลือกอุปกรณ์ที่จะเบิก</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {allSelected ? "ยกเลิกการเลือกทั้งหมด" : "เลือกทั้งหมด"}
            </button>
            <span className="text-sm font-normal text-muted-foreground">
              เลือกแล้ว {selectedIds.length} / {devices.length} เครื่อง
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {devices.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            ไม่มีอุปกรณ์ที่ว่างสำหรับการเบิก
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => {
              const selected = selectedIds.includes(device.id);
              return (
                <button
                  key={device.id}
                  type="button"
                  onClick={() => toggleOne(device.id)}
                  className={cn(
                    "relative text-left rounded-lg border p-4 transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    selected && "border-primary bg-primary/5 shadow-sm"
                  )}
                >
                  <div className="absolute top-3 right-3">
                    <Checkbox
                      checked={selected}
                      indeterminate={false}
                      onCheckedChange={() => toggleOne(device.id)}
                      aria-label={`เลือก ${device.deviceCode}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="space-y-2 pr-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-xs md:text-sm truncate">
                        {device.deviceCode}
                      </div>
                      {device.status === "ONLINE" ? (
                        <Badge variant="success">ออนไลน์</Badge>
                      ) : (
                        <Badge variant="outline">ออฟไลน์</Badge>
                      )}
                    </div>
                    <div className="text-xs md:text-sm font-medium truncate">
                      {device.name || "-"}
                    </div>
                    <div className="text-[11px] md:text-xs text-muted-foreground truncate">
                      {device.model || "ไม่ทราบรุ่น"}
                    </div>
                    <div className="pt-1">
                      {getBorrowBadge(device.borrowStatus)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


