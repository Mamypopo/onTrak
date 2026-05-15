"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket, WebSocketMessage } from "@/lib/websocket";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Battery, Wifi, Activity, Search, Plus, Tablet, ClipboardList, AlertCircle, Signal, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AddTabletDialog } from "@/components/tablets/add-tablet-dialog";
import { PaginationControl } from "@/components/ui/pagination-control";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

interface Device {
  id: string;
  deviceCode: string;
  name: string | null;
  battery: number;
  wifiStatus: boolean;
  latitude: number | null;
  longitude: number | null;
  status: "ONLINE" | "OFFLINE";
  lastSeen: string | null;
  kioskMode: boolean;
  // สถานะการยืม (คำนวณจาก backend ถ้ามี, ถ้าไม่มีถือว่า AVAILABLE)
  borrowStatus?: "AVAILABLE" | "IN_USE" | "IN_MAINTENANCE";
}

export default function DashboardPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [borrowFilter, setBorrowFilter] = useState<"ALL" | "AVAILABLE" | "IN_USE" | "IN_MAINTENANCE">("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, available: 0, inUse: 0, inMaintenance: 0 });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { setPage(1); }, [borrowFilter]);

  // WebSocket for realtime updates
  const { isConnected } = useWebSocket((message: WebSocketMessage) => {
    if (message.type === "device_status" || message.type === "device_location") {
      setDevices((prev) =>
        prev.map((device) =>
          device.deviceCode === message.deviceCode
            ? { ...device, ...message.data }
            : device
        )
      );
    }
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, debouncedSearch, borrowFilter, page, limit]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (debouncedSearch) params.search = debouncedSearch;
      if (borrowFilter !== "ALL") params.borrowStatus = borrowFilter;
      const response = await api.get("/api/device", { params });
      if (response.data.success) {
        setDevices(response.data.data);
        setTotal(response.data.total ?? 0);
        if (response.data.stats) setStats(response.data.stats);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const statsData = [
    { title: "อุปกรณ์ทั้งหมด", value: stats.total, icon: Tablet, color: "text-primary", iconColor: "text-primary" },
    { title: "ออนไลน์", value: stats.online, icon: Signal, color: "text-green-600 dark:text-green-400", iconColor: "text-green-500" },
    { title: "ออฟไลน์", value: stats.offline, icon: WifiOff, color: "text-muted-foreground", iconColor: "text-muted-foreground" },
    { title: "ว่าง", value: stats.available, icon: Tablet, color: "text-green-600 dark:text-green-400", iconColor: "text-green-500" },
    { title: "กำลังใช้งาน", value: stats.inUse, icon: Activity, color: "text-amber-600 dark:text-amber-400", iconColor: "text-amber-500" },
    { title: "มีปัญหา", value: stats.inMaintenance, icon: AlertCircle, color: "text-red-600 dark:text-red-400", iconColor: "text-red-500" },
  ];

  const handleDeviceAdded = () => {
    fetchDevices();
    setIsDialogOpen(false);
  };


  const getStatusVariant = (status: string): "success" | "muted" => {
    switch (status) {
      case "ONLINE":
        return "success";
      case "OFFLINE":
        return "muted";
      default:
        return "muted";
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">จัดการและติดตามอุปกรณ์ทั้งหมด</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                isConnected ? "bg-green-500" : "bg-destructive"
              )}
            />
            <span className="text-sm text-muted-foreground">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาอุปกรณ์..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm text-muted-foreground">สถานะการยืม:</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={borrowFilter === "ALL" ? "default" : "outline"}
                      onClick={() => setBorrowFilter("ALL")}
                    >
                      ทั้งหมด
                    </Button>
                    <Button
                      size="sm"
                      variant={borrowFilter === "AVAILABLE" ? "default" : "outline"}
                      onClick={() => setBorrowFilter("AVAILABLE")}
                    >
                      ว่าง
                    </Button>
                    <Button
                      size="sm"
                      variant={borrowFilter === "IN_USE" ? "default" : "outline"}
                      onClick={() => setBorrowFilter("IN_USE")}
                    >
                      กำลังใช้งาน
                    </Button>
                    <Button
                      size="sm"
                      variant={borrowFilter === "IN_MAINTENANCE" ? "default" : "outline"}
                      onClick={() => setBorrowFilter("IN_MAINTENANCE")}
                    >
                      มีปัญหา
                    </Button>
                  </div>
                </div>
                <Link href="/dashboard/checkouts/new">
                  <Button size="sm" className="gap-2 w-full md:w-auto">
                    <ClipboardList className="h-4 w-4" />
                    เบิกอุปกรณ์
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Carousel for mobile */}
        <div className="md:hidden px-3">
          <Carousel className="w-full" opts={{ align: "center", loop: true }}>
            <CarouselContent>
              {statsData.map((stat, index) => (
                <CarouselItem key={index} className="basis-full">
                  <div className="p-2">
                    <Card>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                          <div className={`text-2xl font-bold mt-1 ${stat.color}`}>{loading ? <Skeleton className="h-8 w-12" /> : stat.value}</div>
                        </div>
                        <stat.icon className={`h-8 w-8 ${stat.iconColor}`} />
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="inline-flex left-0 -translate-x-8" />
            <CarouselNext className="inline-flex right-0 translate-x-8" />
          </Carousel>
        </div>

        {/* Stats Cards - Grid for larger screens */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statsData.map((stat, index) => (
            <Card key={index} className="card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className={`text-2xl font-bold mt-1 ${stat.color}`}>{loading ? <Skeleton className="h-8 w-12" /> : stat.value}</div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Devices Grid - 6 columns with Add button */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <Card key={i} className="card-hover">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Calculate grid: 6 columns, first item is "Add" button */}

            {devices.length > 0 && (() => {
              const allItems = [
                { type: "add" as const },
                ...devices.map((device) => ({ type: "device" as const, device })),
              ];

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4">
                  {allItems.map((item) => {
                    if (item.type === "add") {
                      return (
                        <Card
                          key="add"
                          className="card-hover cursor-pointer border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all flex flex-col"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          <CardContent className="p-6 flex flex-col items-center justify-center flex-1 space-y-3">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Plus className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-center">เพิ่ม Tablet</p>
                            <p className="text-xs text-muted-foreground text-center">
                              คลิกเพื่อเพิ่มอุปกรณ์ใหม่
                            </p>
                          </CardContent>
                        </Card>
                      );
                    }

                    const { device } = item;
                    const hasProblem = device.borrowStatus === "IN_MAINTENANCE";
                    const isInUse = device.borrowStatus === "IN_USE";
                    const isAvailable = device.borrowStatus === "AVAILABLE" || !device.borrowStatus;
                    const latestProblem = (device as any).latestProblem;
                    return (
                      <Card
                        key={device.id}
                        className={cn(
                          "card-hover cursor-pointer transition-all",
                          hasProblem 
                            ? "border-red-500/50 bg-red-500/5 hover:bg-red-500/10" 
                            : isInUse
                            ? "border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10"
                            : isAvailable
                            ? "border-green-500/50 bg-green-500/5 hover:bg-green-500/10"
                            : ""
                        )}
                        onClick={() => router.push(`/dashboard/device/${device.id}`)}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* Device Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Tablet className={cn(
                                  "h-4 w-4 shrink-0",
                                  hasProblem 
                                    ? "text-red-500" 
                                    : isInUse
                                    ? "text-amber-500"
                                    : isAvailable
                                    ? "text-green-500"
                                    : "text-muted-foreground"
                                )} />
                                <h3 className="font-semibold text-sm line-clamp-1">
                                  {device.name || device.deviceCode}
                                </h3>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {device.deviceCode}
                              </p>
                              {hasProblem && latestProblem && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 line-clamp-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  {latestProblem}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0" title={device.status === "ONLINE" ? "ออนไลน์" : "ออฟไลน์"}>
                              {device.status === "ONLINE" ? (
                                <Signal className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
                              ) : (
                                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} />
                              )}
                            </div>
                          </div>

                          {/* Device Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                              <Battery className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{device.battery}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Wifi
                                className={cn(
                                  "h-3 w-3",
                                  device.wifiStatus
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-muted-foreground"
                                )}
                              />
                              <span className="text-muted-foreground">
                                {device.wifiStatus ? "เชื่อมต่อ" : "ไม่เชื่อมต่อ"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Activity className="h-3 w-3" />
                              <span className="line-clamp-1">
                                {safeFormatDistanceToNow(device.lastSeen, { addSuffix: true })}
                              </span>
                            </div>
                            <div className="pt-2 border-t">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "w-full justify-center text-xs",
                                  hasProblem
                                    ? "border-red-500 text-red-600 dark:text-red-400 bg-red-500/10"
                                    : isInUse
                                    ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                    : "border-green-500 text-green-600 dark:text-green-400 bg-green-500/10"
                                )}
                              >
                                {hasProblem && "มีปัญหา"}
                                {isInUse && "กำลังใช้งาน"}
                                {isAvailable && "ว่าง"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}

            {/* Empty State */}
            {devices.length === 0 && !searchQuery && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Tablet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">ยังไม่มี Tablet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    คลิกปุ่ม &quot;เพิ่ม Tablet&quot; เพื่อเพิ่มอุปกรณ์ใหม่
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่ม Tablet
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* No Search Results */}
            {devices.length === 0 && searchQuery && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">ไม่พบอุปกรณ์</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ลองเปลี่ยนคำค้นหา
                  </p>
                </CardContent>
              </Card>
            )}

            <PaginationControl
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
              isLoading={loading}
            />
          </>
        )}

        {/* Add Tablet Dialog */}
        <AddTabletDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onDeviceAdded={handleDeviceAdded}
        />
      </div>
    </AppLayout>
  );
}
