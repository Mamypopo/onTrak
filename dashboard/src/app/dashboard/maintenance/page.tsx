"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Tablet,
  CheckSquare,
  Square,
  RotateCcw,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";
import { getSwalConfig, getToastConfig } from "@/lib/swal-config";
import { Checkbox } from "@/components/ui/checkbox";

interface Device {
  id: string;
  deviceCode: string;
  name: string | null;
  model: string | null;
  maintenanceStatus: "NONE" | "HAS_PROBLEM" | "NEEDS_REPAIR" | "IN_MAINTENANCE" | "DAMAGED";
  borrowStatus?: "AVAILABLE" | "IN_USE" | "IN_MAINTENANCE";
  latestProblem?: string | null;
}

export default function MaintenancePage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "HAS_PROBLEM" | "NEEDS_REPAIR" | "IN_MAINTENANCE" | "DAMAGED">("ALL");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchDevices();
  }, [router]);

  useEffect(() => {
    let filtered = devices;

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(
        (d) =>
          d.deviceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((d) => d.maintenanceStatus === statusFilter);
    }

    setFilteredDevices(filtered);
  }, [searchQuery, statusFilter, devices]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/device");
      if (response.data.success) {
        // Filter only devices with problems
        const devicesWithProblems = response.data.data.filter(
          (d: Device) => d.maintenanceStatus && d.maintenanceStatus !== "NONE"
        );
        setDevices(devicesWithProblems);
        setFilteredDevices(devicesWithProblems);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (deviceId: string) => {
    if (selectedIds.includes(deviceId)) {
      setSelectedIds(selectedIds.filter((id) => id !== deviceId));
    } else {
      setSelectedIds([...selectedIds, deviceId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDevices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDevices.map((d) => d.id));
    }
  };

  const handleUpdateStatus = async () => {
    if (selectedIds.length === 0) {
      await Swal.fire(
        getToastConfig({
          icon: "warning",
          title: "กรุณาเลือกอุปกรณ์อย่างน้อย 1 เครื่อง",
        })
      );
      return;
    }

    const confirmResult = await Swal.fire(
      getSwalConfig({
        title: "ยืนยันเปลี่ยนสถานะเป็นพร้อมใช้",
        html: `
          <div class="text-left space-y-2">
            <p><strong>จำนวนอุปกรณ์:</strong> ${selectedIds.length} เครื่อง</p>
            <p class="text-sm text-muted-foreground">อุปกรณ์ที่เลือกจะสามารถเบิกได้ทันที</p>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#6b7280",
      })
    );

    if (!confirmResult.isConfirmed) {
      return;
    }

    try {
      setUpdating(true);
      const response = await api.patch("/api/device/maintenance-status", {
        deviceIds: selectedIds,
        maintenanceStatus: "NONE",
      });

      if (response.data.success) {
        await Swal.fire(
          getToastConfig({
            icon: "success",
            title: "เปลี่ยนสถานะเป็นพร้อมใช้สำเร็จ",
          })
        );
        setSelectedIds([]);
        fetchDevices();
      }
    } catch (error: any) {
      await Swal.fire(
        getSwalConfig({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: error?.response?.data?.error || "ไม่สามารถเปลี่ยนสถานะได้",
        })
      );
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HAS_PROBLEM":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/10">
            มีปัญหา
          </Badge>
        );
      case "NEEDS_REPAIR":
        return (
          <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400 bg-red-500/10">
            ต้องซ่อม
          </Badge>
        );
      case "IN_MAINTENANCE":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10">
            กำลังซ่อม
          </Badge>
        );
      case "DAMAGED":
        return (
          <Badge variant="outline" className="border-gray-500 text-gray-600 dark:text-gray-400 bg-gray-500/10">
            เสียหาย
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">จัดการอุปกรณ์ที่มีปัญหา</h1>
            <p className="text-muted-foreground mt-1">
              แสดงและจัดการอุปกรณ์ที่มีปัญหาหรือต้องซ่อม
            </p>
          </div>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่ออุปกรณ์, รหัสอุปกรณ์..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="สถานะทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">สถานะทั้งหมด</SelectItem>
                  <SelectItem value="HAS_PROBLEM">มีปัญหา</SelectItem>
                  <SelectItem value="NEEDS_REPAIR">ต้องซ่อม</SelectItem>
                  <SelectItem value="IN_MAINTENANCE">กำลังซ่อม</SelectItem>
                  <SelectItem value="DAMAGED">เสียหาย</SelectItem>
                </SelectContent>
              </Select>
              {selectedIds.length > 0 && (
                <Button
                  variant="default"
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  เปลี่ยนเป็นพร้อมใช้ ({selectedIds.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Devices Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDevices.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "ALL"
                    ? "ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไข"
                    : "ไม่มีอุปกรณ์ที่มีปัญหา"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                พบ {filteredDevices.length} เครื่อง
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="gap-2"
              >
                {selectedIds.length === filteredDevices.length ? (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    ยกเลิกการเลือกทั้งหมด
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    เลือกทั้งหมด
                  </>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredDevices.map((device) => {
                const isSelected = selectedIds.includes(device.id);
                return (
                  <Card
                    key={device.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-lg border-2",
                      isSelected
                        ? "ring-2 ring-primary border-primary bg-primary/5"
                        : "border-red-500/50 bg-red-500/5 hover:bg-red-500/10"
                    )}
                    onClick={() => toggleSelect(device.id)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Tablet className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                            <h3 className="font-semibold text-sm line-clamp-1">
                              {device.name || device.deviceCode}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {device.deviceCode}
                          </p>
                          {device.model && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {device.model}
                            </p>
                          )}
                          {device.latestProblem && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 line-clamp-2">
                              {device.latestProblem}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(device.maintenanceStatus)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

