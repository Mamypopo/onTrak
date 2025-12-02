"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import { useWebSocket, WebSocketMessage } from "@/lib/websocket";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Battery, Wifi, MapPin, Activity, ArrowLeft, 
  Lock, Power, Radio, Settings,
  Square, Bell, Camera, Zap, Signal
} from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { getSwalConfig } from "@/lib/swal-config";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Dynamic import for Map component to avoid SSR issues
const DeviceMap = dynamic(() => import("@/components/DeviceMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

interface Device {
  id: string;
  deviceCode: string;
  name: string | null;
  serialNumber?: string | null;
  model?: string | null;
  osVersion?: string | null;
  battery: number;
  wifiStatus: boolean;
  isCharging?: boolean;
  batteryHealth?: string | null;
  chargingMethod?: string | null;
  mobileDataEnabled?: boolean;
  networkConnected?: boolean;
  screenOn?: boolean;
  volumeLevel?: number;
  bluetoothEnabled?: boolean;
  installedAppsCount?: number;
  bootTime?: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  lastSeen: string;
  kioskMode: boolean;
  metrics: any[];
  actionLogs: any[];
}

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.id as string;
  
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingCommand, setSendingCommand] = useState(false);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);

  // WebSocket for realtime updates
  const { isConnected } = useWebSocket((message: WebSocketMessage) => {
    if (
      message.deviceId === deviceId &&
      (message.type === "device_status" ||
        message.type === "device_location" ||
        message.type === "device_metrics")
    ) {
      setDevice((prev) => (prev ? { ...prev, ...message.data } : null));
    }
  });

  const fetchDevice = useCallback(async () => {
    try {
      const response = await api.get(`/api/device/${deviceId}`);
      if (response.data.success) {
        setDevice(response.data.data);
      } else {
        console.error("Failed to fetch device:", response.data);
        setDevice(null);
      }
    } catch (error: any) {
      console.error("Error fetching device:", error);
      if (error.response?.status === 404) {
        setDevice(null);
      } else {
        Swal.fire(getSwalConfig({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: error.response?.data?.error || "ไม่สามารถโหลดข้อมูลอุปกรณ์ได้",
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const fetchLocationHistory = useCallback(async () => {
    try {
      // ดึง location history 7 วันล่าสุด
      const response = await api.get(`/api/device/${deviceId}/location-history?days=7`);
      if (response.data.success) {
        const history = response.data.data || [];
        setLocationHistory(history);
        console.log("Location history loaded:", history.length, "points");
      }
    } catch (error: any) {
      console.error("Error fetching location history:", error);
      // ไม่แสดง error ถ้าไม่มีข้อมูล (อาจจะยังไม่มี history)
      setLocationHistory([]);
    }
  }, [deviceId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchDevice();
    fetchLocationHistory();
  }, [deviceId, router, fetchDevice, fetchLocationHistory]);

  const sendCommand = async (action: string, params?: any) => {
    setSendingCommand(true);
    try {
      const response = await api.post(`/api/device/${deviceId}/command`, {
        action,
        params: params || {},
      });

      if (response.data.success) {
        // Custom messages for better UX
        const messages: Record<string, { title: string; text: string }> = {
          PLAY_SOUND: {
            title: "Alert Sent",
            text: "Alert sound and vibration sent to device",
          },
          LOCK_DEVICE: {
            title: "Device Locked",
            text: "Lock command sent successfully",
          },
          RESTART_DEVICE: {
            title: "Restart Command Sent",
            text: "Device will restart shortly",
          },
          WIFI_ON: {
            title: "WiFi Enabled",
            text: "WiFi will be turned on",
          },
          WIFI_OFF: {
            title: "WiFi Disabled",
            text: "WiFi will be turned off",
          },
          ENABLE_KIOSK: {
            title: "Kiosk Mode Enabled",
            text: "Device will enter kiosk mode",
          },
          DISABLE_KIOSK: {
            title: "Kiosk Mode Disabled",
            text: "Device will exit kiosk mode",
          },
          OPEN_CAMERA: {
            title: "Camera Command Sent",
            text: "Camera app will open on device",
          },
          TAKE_PHOTO: {
            title: "Photo Capture Sent",
            text: "Camera will open for photo capture on device",
          },
        };

        const message = messages[action] || {
          title: "Command Sent",
          text: `Command "${action}" sent successfully`,
        };

        Swal.fire(getSwalConfig({
          icon: "success",
          title: message.title,
          text: message.text,
          timer: 2000,
          showConfirmButton: false,
        }));
      }
    } catch (error: any) {
      Swal.fire(getSwalConfig({
        icon: "error",
        title: "Error",
        text: error.response?.data?.error || "Failed to send command",
      }));
    } finally {
      setSendingCommand(false);
    }
  };

  const handleBorrow = async () => {
    const { value: reason } = await Swal.fire(getSwalConfig({
      title: "ยืมอุปกรณ์",
      input: "text",
      inputLabel: "เหตุผล (ไม่บังคับ)",
      inputPlaceholder: "กรอกเหตุผลในการยืม...",
      showCancelButton: true,
      confirmButtonText: "ยืม",
      cancelButtonText: "ยกเลิก",
    }));

    if (reason !== undefined) {
      try {
        const response = await api.post(`/api/device/${deviceId}/borrow`, {
          reason: reason || null,
        });

        if (response.data.success) {
          Swal.fire(getSwalConfig({
            icon: "success",
            title: "ยืมอุปกรณ์สำเร็จ",
            timer: 2000,
            showConfirmButton: false,
          }));
          fetchDevice();
        }
      } catch (error: any) {
        Swal.fire(getSwalConfig({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: error.response?.data?.error || "ไม่สามารถยืมอุปกรณ์ได้",
        }));
      }
    }
  };

  const handleReturn = async () => {
    try {
      const response = await api.post(`/api/device/${deviceId}/return`);

      if (response.data.success) {
        Swal.fire(getSwalConfig({
          icon: "success",
          title: "คืนอุปกรณ์สำเร็จ",
          timer: 2000,
          showConfirmButton: false,
        }));
        fetchDevice();
      }
    } catch (error: any) {
      Swal.fire(getSwalConfig({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.response?.data?.error || "ไม่สามารถคืนอุปกรณ์ได้",
      }));
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 container mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!device) {
    return (
      <AppLayout>
        <div className="flex-1 container mx-auto p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-4">ไม่พบอุปกรณ์</h2>
              <p className="text-muted-foreground mb-4">
                อุปกรณ์ที่คุณกำลังมองหาไม่มีอยู่ในระบบ
              </p>
              <Link href="/dashboard">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  กลับไป Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

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

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">
                {device.name || device.deviceCode}
              </h1>
              <Badge variant={getStatusVariant(device.status)}>
                {device.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{device.deviceCode}</p>
          </div>
        </div>

        {/* Quick Stats - Top Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Battery className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Battery</p>
                  <p className="text-lg font-bold">{device.battery}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  device.wifiStatus ? "bg-green-500/10" : "bg-muted"
                )}>
                  <Wifi className={cn(
                    "h-5 w-5",
                    device.wifiStatus ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WiFi</p>
                  <p className={cn(
                    "text-lg font-bold",
                    device.wifiStatus ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  )}>
                    {device.wifiStatus ? "เชื่อมต่อ" : "ไม่เชื่อมต่อ"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  device.networkConnected ? "bg-green-500/10" : "bg-muted"
                )}>
                  <Signal className={cn(
                    "h-5 w-5",
                    device.networkConnected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Network</p>
                  <p className={cn(
                    "text-lg font-bold",
                    device.networkConnected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  )}>
                    {device.networkConnected ? "เชื่อมต่อ" : "ไม่เชื่อมต่อ"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Seen</p>
                  <p className="text-sm font-medium line-clamp-1">
                    {formatDistanceToNow(new Date(device.lastSeen), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location Card - Priority: Show first */}
            {device.latitude && device.longitude ? (
              <Card className="card-hover">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>ตำแหน่งอุปกรณ์</CardTitle>
                      <CardDescription className="mt-1">
                        {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
                      </CardDescription>
                    </div>
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <DeviceMap
                    latitude={device.latitude}
                    longitude={device.longitude}
                    deviceName={device.name || undefined}
                    deviceCode={device.deviceCode}
                    deviceId={device.id}
                    locationHistory={locationHistory}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>ตำแหน่งอุปกรณ์</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-64 bg-muted rounded-lg flex flex-col items-center justify-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">ไม่มีข้อมูล GPS</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Device Status - Organized by Categories */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>สถานะอุปกรณ์</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Battery Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-foreground">แบตเตอรี่</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Battery className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">ระดับแบตเตอรี่</span>
                      </div>
                      <span className="font-semibold">{device.battery}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {device.isCharging ? (
                          <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <Battery className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">สถานะการชาร์จ</span>
                      </div>
                      {device.isCharging ? (
                        <Badge variant="warning" className="text-xs">
                          กำลังชาร์จ ({device.chargingMethod || "Unknown"})
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">ไม่ชาร์จ</span>
                      )}
                    </div>
                    {device.batteryHealth && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">สุขภาพแบตเตอรี่</span>
                        </div>
                        <span className="font-semibold">{device.batteryHealth}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Network Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-foreground">เครือข่าย</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Wifi className={cn(
                          "w-4 h-4",
                          device.wifiStatus ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                        )} />
                        <span className="text-sm">WiFi</span>
                      </div>
                      <Badge variant={device.wifiStatus ? "success" : "muted"} className="text-xs">
                        {device.wifiStatus ? "เปิด" : "ปิด"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Signal className={cn(
                          "w-4 h-4",
                          device.networkConnected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                        )} />
                        <span className="text-sm">เครือข่าย</span>
                      </div>
                      <Badge variant={device.networkConnected ? "success" : "muted"} className="text-xs">
                        {device.networkConnected ? "เชื่อมต่อ" : "ไม่เชื่อมต่อ"}
                      </Badge>
                    </div>
                    {device.mobileDataEnabled && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm">Mobile Data</span>
                        </div>
                        <Badge variant="info" className="text-xs">เปิด</Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* System Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-foreground">ระบบ</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Activity className={cn(
                          "w-4 h-4",
                          device.screenOn ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                        )} />
                        <span className="text-sm">หน้าจอ</span>
                      </div>
                      <Badge variant={device.screenOn ? "success" : "muted"} className="text-xs">
                        {device.screenOn ? "เปิด" : "ปิด"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">ระดับเสียง</span>
                      </div>
                      <span className="font-semibold">{device.volumeLevel || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Radio className={cn(
                          "w-4 h-4",
                          device.bluetoothEnabled ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                        )} />
                        <span className="text-sm">Bluetooth</span>
                      </div>
                      <Badge variant={device.bluetoothEnabled ? "info" : "muted"} className="text-xs">
                        {device.bluetoothEnabled ? "เปิด" : "ปิด"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Kiosk Mode</span>
                      </div>
                      {device.kioskMode ? (
                        <Badge variant="outline" className="text-xs border-primary/30">เปิด</Badge>
                      ) : (
                        <Badge variant="muted" className="text-xs">ปิด</Badge>
                      )}
                    </div>
                    {device.installedAppsCount && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">แอปที่ติดตั้ง</span>
                        </div>
                        <span className="font-semibold">{device.installedAppsCount}</span>
                      </div>
                    )}
                    {device.bootTime && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">เวลาบูต</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(Number(device.bootTime)).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Control Panel - All Controls Together */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>แผงควบคุม</CardTitle>
                <CardDescription>
                  ส่งคำสั่งควบคุมอุปกรณ์จากระยะไกล
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Alert Section */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground">การแจ้งเตือน</h4>
                    <Button
                      onClick={() => sendCommand("PLAY_SOUND")}
                      disabled={sendingCommand}
                      variant="default"
                      className="w-full"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      ส่งเสียงแจ้งเตือน
                    </Button>
                  </div>

                  {/* Device Control Section */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground">ควบคุมอุปกรณ์</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => sendCommand("LOCK_DEVICE")}
                        disabled={sendingCommand}
                        variant="outline"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        ล็อค
                      </Button>
                      <Button
                        onClick={() => sendCommand("RESTART_DEVICE")}
                        disabled={sendingCommand}
                        variant="outline"
                      >
                        <Power className="w-4 h-4 mr-2" />
                        รีสตาร์ท
                      </Button>
                    </div>
                  </div>

                  {/* Network Control Section */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground">เครือข่าย</h4>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Wifi className={cn(
                          "w-4 h-4",
                          device.wifiStatus ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                        )} />
                        <Label htmlFor="wifi-toggle" className="text-sm font-medium cursor-pointer">
                          WiFi
                        </Label>
                      </div>
                      <Switch
                        id="wifi-toggle"
                        checked={device.wifiStatus}
                        onCheckedChange={(checked) => {
                          sendCommand(checked ? "WIFI_ON" : "WIFI_OFF");
                        }}
                        disabled={sendingCommand}
                      />
                    </div>
                  </div>

                  {/* Kiosk Mode Section */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground">โหมด Kiosk</h4>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Square className={cn(
                          "w-4 h-4",
                          device.kioskMode ? "text-primary" : "text-muted-foreground"
                        )} />
                        <Label htmlFor="kiosk-toggle" className="text-sm font-medium cursor-pointer">
                          Kiosk Mode
                        </Label>
                      </div>
                      <Switch
                        id="kiosk-toggle"
                        checked={device.kioskMode}
                        onCheckedChange={(checked) => {
                          sendCommand(checked ? "ENABLE_KIOSK" : "DISABLE_KIOSK");
                        }}
                        disabled={sendingCommand}
                      />
                    </div>
                  </div>

                  {/* Camera Control Section */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground">กล้อง</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => sendCommand("OPEN_CAMERA")}
                        disabled={sendingCommand}
                        variant="outline"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        เปิดกล้อง
                      </Button>
                      <Button
                        onClick={() => sendCommand("TAKE_PHOTO")}
                        disabled={sendingCommand}
                        variant="default"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        ถ่ายรูป
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action History */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>ประวัติการทำงาน</CardTitle>
                <CardDescription>
                  รายการคำสั่งและกิจกรรมล่าสุด
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {device.actionLogs && device.actionLogs.length > 0 ? (
                    device.actionLogs.map((log: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg transition-all duration-200 hover:border-primary/30 hover:bg-accent/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{log.action}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {log.user && (
                          <Badge variant="outline" className="text-xs ml-2 shrink-0">
                            {log.user}
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        ยังไม่มีประวัติการทำงาน
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>การดำเนินการด่วน</CardTitle>
                <CardDescription>
                  ยืม/คืนอุปกรณ์
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleBorrow}
                  className="w-full"
                  variant="default"
                >
                  ยืมอุปกรณ์
                </Button>
                <Button
                  onClick={handleReturn}
                  className="w-full"
                  variant="outline"
                >
                  คืนอุปกรณ์
                </Button>
              </CardContent>
            </Card>

            {/* System Metrics */}
            {device.metrics && device.metrics.length > 0 && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>ประสิทธิภาพระบบ</CardTitle>
                  <CardDescription>
                    ข้อมูลล่าสุด
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">CPU</span>
                        <span className="text-sm font-semibold">
                          {device.metrics[0]?.cpu?.toFixed(1) || 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${device.metrics[0]?.cpu || 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Memory</span>
                        <span className="text-sm font-semibold">
                          {device.metrics[0]?.memoryUsed
                            ? (
                                (Number(device.metrics[0].memoryUsed) /
                                  Number(device.metrics[0].memoryTotal)) *
                                100
                              ).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{
                            width: `${device.metrics[0]?.memoryUsed
                              ? (
                                  (Number(device.metrics[0].memoryUsed) /
                                    Number(device.metrics[0].memoryTotal)) *
                                  100
                                )
                              : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Storage</span>
                        <span className="text-sm font-semibold">
                          {device.metrics[0]?.storageUsed
                            ? (
                                (Number(device.metrics[0].storageUsed) /
                                  Number(device.metrics[0].storageTotal)) *
                                100
                              ).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{
                            width: `${device.metrics[0]?.storageUsed
                              ? (
                                  (Number(device.metrics[0].storageUsed) /
                                    Number(device.metrics[0].storageTotal)) *
                                  100
                                )
                              : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Device Info Summary */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>ข้อมูลอุปกรณ์</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Device Code</span>
                  <span className="text-sm font-medium">{device.deviceCode}</span>
                </div>
                {device.name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ชื่อ</span>
                    <span className="text-sm font-medium">{device.name}</span>
                  </div>
                )}
                {device.serialNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Serial Number</span>
                    <span className="text-sm font-medium">{device.serialNumber}</span>
                  </div>
                )}
                {device.model && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">รุ่น</span>
                    <span className="text-sm font-medium">{device.model}</span>
                  </div>
                )}
                {device.osVersion && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">OS Version</span>
                    <span className="text-sm font-medium">{device.osVersion}</span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">สถานะ</span>
                    <Badge variant={getStatusVariant(device.status)} className="text-xs">
                      {device.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Seen</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(device.lastSeen), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

