"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket, WebSocketMessage } from "@/lib/websocket";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Battery, Wifi, MapPin, Activity, Search, Plus, Tablet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AddTabletDialog } from "@/components/tablets/add-tablet-dialog";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  deviceCode: string;
  name: string | null;
  battery: number;
  wifiStatus: boolean;
  latitude: number | null;
  longitude: number | null;
  status: "ONLINE" | "OFFLINE" | "IN_USE" | "AVAILABLE";
  lastSeen: string;
  kioskMode: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    // Check authentication
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Fetch devices
    fetchDevices();
  }, [router]);

  useEffect(() => {
    // Filter devices based on search
    if (searchQuery) {
      const filtered = devices.filter(
        (device) =>
          device.deviceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDevices(filtered);
    } else {
      setFilteredDevices(devices);
    }
  }, [searchQuery, devices]);

  const fetchDevices = async () => {
    try {
      const response = await api.get("/api/device");
      if (response.data.success) {
        setDevices(response.data.data);
        setFilteredDevices(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceAdded = () => {
    fetchDevices();
    setIsDialogOpen(false);
  };


  const getStatusVariant = (status: string): "success" | "muted" | "warning" | "info" => {
    switch (status) {
      case "ONLINE":
        return "success";
      case "OFFLINE":
        return "muted";
      case "IN_USE":
        return "warning";
      case "AVAILABLE":
        return "info";
      default:
        return "muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "bg-green-500";
      case "OFFLINE":
        return "bg-muted";
      case "IN_USE":
        return "bg-yellow-500";
      case "AVAILABLE":
        return "bg-blue-500";
      default:
        return "bg-muted";
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
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาอุปกรณ์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {loading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-12" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">อุปกรณ์ทั้งหมด</p>
                      <p className="text-2xl font-bold mt-1">{devices.length}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">ออนไลน์</p>
                      <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                        {devices.filter((d) => d.status === "ONLINE").length}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Activity className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">พร้อมใช้งาน</p>
                      <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                        {devices.filter((d) => d.status === "AVAILABLE").length}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Wifi className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">กำลังใช้งาน</p>
                      <p className="text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">
                        {devices.filter((d) => d.status === "IN_USE").length}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Battery className="h-6 w-6 text-yellow-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">ออฟไลน์</p>
                      <p className="text-2xl font-bold mt-1 text-muted-foreground">
                        {devices.filter((d) => d.status === "OFFLINE").length}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Devices Grid - 6 columns with Add button */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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
            {(() => {
              const allItems = [
                { type: "add" as const },
                ...filteredDevices.map((device) => ({ type: "device" as const, device })),
              ];

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {allItems.map((item) => {
                    if (item.type === "add") {
                      return (
                        <Card
                          key="add"
                          className="card-hover cursor-pointer border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px] space-y-3">
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
                    return (
                      <Card
                        key={device.id}
                        className="card-hover cursor-pointer"
                        onClick={() => router.push(`/dashboard/device/${device.id}`)}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* Device Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Tablet className="h-4 w-4 text-muted-foreground shrink-0" />
                                <h3 className="font-semibold text-sm line-clamp-1">
                                  {device.name || device.deviceCode}
                                </h3>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {device.deviceCode}
                              </p>
                            </div>
                            <Badge
                              variant={getStatusVariant(device.status)}
                              className="text-xs shrink-0"
                            >
                              {device.status}
                            </Badge>
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
                                {formatDistanceToNow(new Date(device.lastSeen), {
                                  addSuffix: true,
                                })}
                              </span>
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
            {filteredDevices.length === 0 && !searchQuery && (
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
            {filteredDevices.length === 0 && searchQuery && (
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

