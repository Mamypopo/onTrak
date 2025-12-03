import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
          <span className="text-sm font-normal text-muted-foreground">
            เลือกแล้ว {selectedIds.length} / {devices.length} เครื่อง
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {devices.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            ไม่มีอุปกรณ์ที่ว่างสำหรับการเบิก
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      indeterminate={isIndeterminate}
                      aria-label="เลือกทั้งหมด"
                    />
                  </TableHead>
                  <TableHead>รหัสเครื่อง</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>รุ่น</TableHead>
                  <TableHead>การเชื่อมต่อ</TableHead>
                  <TableHead>สถานะการยืม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  const selected = selectedIds.includes(device.id);
                  return (
                    <TableRow
                      key={device.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selected && "bg-primary/5"
                      )}
                      onClick={() => toggleOne(device.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleOne(device.id)}
                          aria-label={`เลือก ${device.deviceCode}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs md:text-sm">
                        {device.deviceCode}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm">
                        {device.name || "-"}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm">
                        {device.model || "-"}
                      </TableCell>
                      <TableCell>
                        {device.status === "ONLINE" ? (
                          <Badge variant="success">ออนไลน์</Badge>
                        ) : (
                          <Badge variant="outline">ออฟไลน์</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getBorrowBadge(device.borrowStatus)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


