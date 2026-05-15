"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Tablet,
  CheckSquare,
  Square,
  RotateCcw,
  Search,
  History,
  Wrench,
  CheckCircle2,
  Clock,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";
import { getSwalConfig, getToastConfig } from "@/lib/swal-config";
import { PaginationControl } from "@/components/ui/pagination-control";

interface Device {
  id: string;
  deviceCode: string;
  name: string | null;
  model: string | null;
  maintenanceStatus: "NONE" | "HAS_PROBLEM" | "NEEDS_REPAIR" | "IN_MAINTENANCE" | "DAMAGED";
  borrowStatus?: "AVAILABLE" | "IN_USE" | "IN_MAINTENANCE";
  latestProblem?: string | null;
}

interface HistoryRecord {
  id: string;
  deviceCode: string;
  deviceName: string | null;
  date: string;
  problem: string | null;
  solution: string | null;
  status: "RESOLVED" | "PENDING";
  reportedBy: string | null;
  company: string | null;
}

type Tab = "devices" | "history";

export default function MaintenancePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("devices");

  const [deviceLimit, setDeviceLimit] = useState(10);
  const [historyLimit, setHistoryLimit] = useState(10);

  // ── Devices tab state ──
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "HAS_PROBLEM" | "NEEDS_REPAIR" | "IN_MAINTENANCE" | "DAMAGED">("ALL");
  const [devicePage, setDevicePage] = useState(1);
  const [deviceTotal, setDeviceTotal] = useState(0);

  // ── History tab state ──
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historySearchDebounced, setHistorySearchDebounced] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"ALL" | "RESOLVED" | "PENDING">("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Debounce device search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setDevicePage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { setDevicePage(1); }, [statusFilter]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
  }, [router]);

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, devicePage, deviceLimit]);

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      const params: Record<string, string> = {
        problemsOnly: "true",
        page: String(devicePage),
        limit: String(deviceLimit),
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "ALL") params.maintenanceStatus = statusFilter;
      const response = await api.get("/api/device", { params });
      if (response.data.success) {
        setDevices(response.data.data);
        setDeviceTotal(response.data.total ?? 0);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const params: Record<string, string> = { page: String(historyPage), limit: String(historyLimit) };
      if (historyStatus !== "ALL") params.status = historyStatus;
      if (historySearchDebounced) params.deviceCode = historySearchDebounced;
      const response = await api.get("/api/maintenance/history", { params });
      if (response.data.success) {
        setHistory(response.data.data);
        setHistoryTotal(response.data.total ?? 0);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyStatus, historyPage, historySearchDebounced, historyLimit]);

  // Debounce history search
  useEffect(() => {
    const t = setTimeout(() => { setHistorySearchDebounced(historySearch); setHistoryPage(1); }, 300);
    return () => clearTimeout(t);
  }, [historySearch]);

  useEffect(() => { setHistoryPage(1); }, [historyStatus]);

  useEffect(() => {
    if (tab === "history") fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, historyStatus, historySearchDebounced, historyPage]);

  const toggleSelect = (deviceId: string) => {
    setSelectedIds((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === devices.length ? [] : devices.map((d) => d.id)
    );
  };

  const handleUpdateStatus = async () => {
    if (selectedIds.length === 0) {
      await Swal.fire(getToastConfig({ icon: "warning", title: "กรุณาเลือกอุปกรณ์อย่างน้อย 1 เครื่อง" }));
      return;
    }
    const confirmResult = await Swal.fire(
      getSwalConfig({
        title: "ยืนยันเปลี่ยนสถานะเป็นพร้อมใช้",
        html: `<div class="text-left space-y-2"><p><strong>จำนวนอุปกรณ์:</strong> ${selectedIds.length} เครื่อง</p></div>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#6b7280",
      })
    );
    if (!confirmResult.isConfirmed) return;
    try {
      setUpdating(true);
      const response = await api.patch("/api/device/maintenance-status", {
        deviceIds: selectedIds,
        maintenanceStatus: "NONE",
      });
      if (response.data.success) {
        await Swal.fire(getToastConfig({ icon: "success", title: "เปลี่ยนสถานะเป็นพร้อมใช้สำเร็จ" }));
        setSelectedIds([]);
        fetchDevices();
      }
    } catch (error: any) {
      await Swal.fire(
        getSwalConfig({ icon: "error", title: "เกิดข้อผิดพลาด", text: error?.response?.data?.error || "ไม่สามารถเปลี่ยนสถานะได้" })
      );
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HAS_PROBLEM":
        return <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/10">มีปัญหา</Badge>;
      case "NEEDS_REPAIR":
        return <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400 bg-red-500/10">ต้องซ่อม</Badge>;
      case "IN_MAINTENANCE":
        return <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10">กำลังซ่อม</Badge>;
      case "DAMAGED":
        return <Badge variant="outline" className="border-gray-500 text-gray-600 dark:text-gray-400 bg-gray-500/10">เสียหาย</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">จัดการซ่อมบำรุง</h1>
          <p className="text-muted-foreground mt-1">จัดการอุปกรณ์ที่มีปัญหาและดูประวัติการซ่อม</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setTab("devices")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === "devices"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Wrench className="h-4 w-4" />
            อุปกรณ์ที่มีปัญหา
            {devices.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {devices.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setTab("history")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-4 w-4" />
            ประวัติการซ่อม
          </button>
        </div>

        {/* ── Devices Tab ── */}
        {tab === "devices" && (
          <>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-end">
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
                <Button variant="default" onClick={handleUpdateStatus} disabled={updating} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  เปลี่ยนเป็นพร้อมใช้ ({selectedIds.length})
                </Button>
              )}
            </div>

            {loadingDevices ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : devices.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter !== "ALL" ? "ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไข" : "ไม่มีอุปกรณ์ที่มีปัญหา"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">พบ {devices.length} เครื่อง</p>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll} className="gap-2">
                    {selectedIds.length === devices.length ? (
                      <><CheckSquare className="h-4 w-4" />ยกเลิกการเลือกทั้งหมด</>
                    ) : (
                      <><Square className="h-4 w-4" />เลือกทั้งหมด</>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {devices.map((device) => {
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
                              <p className="text-xs text-muted-foreground line-clamp-1">{device.deviceCode}</p>
                              {device.model && (
                                <p className="text-xs text-muted-foreground mt-1">{device.model}</p>
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
                <PaginationControl
                  page={devicePage}
                  totalPages={Math.ceil(deviceTotal / deviceLimit) || 1}
                  total={deviceTotal}
                  limit={deviceLimit}
                  onPageChange={setDevicePage}
                  onLimitChange={(l) => { setDeviceLimit(l); setDevicePage(1); }}
                  isLoading={loadingDevices}
                />
              </>
            )}
          </>
        )}

        {/* ── History Tab ── */}
        {tab === "history" && (
          <>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหารหัสอุปกรณ์, ปัญหา, บริษัท..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={historyStatus} onValueChange={(value: any) => setHistoryStatus(value)}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="สถานะทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทั้งหมด</SelectItem>
                  <SelectItem value="RESOLVED">ซ่อมเสร็จแล้ว</SelectItem>
                  <SelectItem value="PENDING">รอดำเนินการ</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => fetchHistory()} className="shrink-0">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {loadingHistory ? (
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted px-4 py-3 flex gap-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 flex-1" />)}
                </div>
                <div className="divide-y">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="px-4 py-3 flex gap-3">
                      {[1, 2, 3, 4, 5].map((j) => <Skeleton key={j} className="h-4 flex-1" />)}
                    </div>
                  ))}
                </div>
              </div>
            ) : history.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">ไม่มีประวัติการซ่อม</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">พบ {historyTotal} รายการ</p>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[140px]">อุปกรณ์</TableHead>
                        <TableHead className="w-[140px]">วันที่</TableHead>
                        <TableHead>ปัญหา</TableHead>
                        <TableHead>วิธีแก้ไข</TableHead>
                        <TableHead className="w-[120px]">บริษัท</TableHead>
                        <TableHead className="w-[100px]">สถานะ</TableHead>
                        <TableHead className="w-[120px]">ผู้รายงาน</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((record) => (
                        <TableRow key={record.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="font-medium text-sm">{record.deviceCode}</div>
                            {record.deviceName && (
                              <div className="text-xs text-muted-foreground line-clamp-1">{record.deviceName}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(record.date)}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm line-clamp-2">{record.problem || "-"}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm line-clamp-2 text-muted-foreground">{record.solution || "-"}</p>
                          </TableCell>
                          <TableCell>
                            {record.company ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="line-clamp-1">{record.company}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.status === "RESOLVED" ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span className="text-xs font-medium">เสร็จแล้ว</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                <Clock className="h-4 w-4 shrink-0" />
                                <span className="text-xs font-medium">รอดำเนินการ</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {record.reportedBy || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControl
                  page={historyPage}
                  totalPages={Math.ceil(historyTotal / historyLimit) || 1}
                  total={historyTotal}
                  limit={historyLimit}
                  onPageChange={setHistoryPage}
                  onLimitChange={(l) => { setHistoryLimit(l); setHistoryPage(1); }}
                  isLoading={loadingHistory}
                />
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
