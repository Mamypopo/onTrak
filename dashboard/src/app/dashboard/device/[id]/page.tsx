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
  Square, Bell, Camera, Zap, Signal, Shield, MemoryStick,
  User, Package, PackageCheck, Users, MessageCircle, Globe, PhoneCall, WifiOff as WifiOffIcon,
  Network, RadioTower, MicOff, Usb, AppWindow, Wallpaper, Scan, Clock,
  ShieldCheck, Fingerprint, UserCog, FileLock, Factory, Bug, ScreenShare, Key, LockIcon, EyeOff,
  MessageSquare, AlertCircle, Edit, Trash2, Wrench, WifiOff
} from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { getSwalConfig, getToastConfig } from "@/lib/swal-config";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { safeFormatDistanceToNow, safeParseDate } from "@/lib/date-utils";

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
  locationEnabled?: boolean;
  installedAppsCount?: number;
  bootTime?: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  lastSeen: string;
  kioskMode: boolean;
  cameraEnabled?: boolean;
  metrics: any[];
  actionLogs: any[];
  borrowStatus?: "AVAILABLE" | "IN_USE" | "IN_MAINTENANCE";
  maintenanceStatus?: "NONE" | "HAS_PROBLEM" | "NEEDS_REPAIR" | "IN_MAINTENANCE" | "DAMAGED";
  latestProblem?: string | null;
  encrytionEnable?: boolean;
  factoryResetAllowed?: boolean;
  safeModeAllowed?: boolean;
  debugAllowed?: boolean;
  sceenCapAllowed?: boolean;
  credentialAllowed?: boolean;
  smartLockAllowed?: boolean;
  locationServiceAllowed?: boolean;
  fingerUnlockAllowed?: boolean;
  accPicAllowed?: boolean;
  hideSensitiveLSceen?: boolean;
  accManageAllowed?: boolean;
  smsAllowed?: boolean;
  romingAllowed?: boolean;
  vpncfAllowed?: boolean;
  callAllowed?: boolean;
  netResetAllowed?: boolean;
  wificfAllowed?: boolean;
  cellBroadcfAllowed?: boolean;
  tetheringcfAllowed?: boolean;
  bluePolicyAllowed?: boolean;
  micMute?: boolean;
  sdcardAllowed?: boolean;
  usbfileTranferAllowed?: boolean;
  uninstallAllowed?: boolean;
  installUnknowAllowed?: boolean;
  systemAppEnable?: boolean;
  wallpaperAllowed?: boolean;
  manageAppAllowed?: boolean;
  googleScanAllowed?: boolean;
  datetimeChange?: boolean;
}

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.id as string;
  
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingCommand, setSendingCommand] = useState(false);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [logsPage, setLogsPage] = useState(0);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [isReportProblemDialogOpen, setIsReportProblemDialogOpen] = useState(false);
  const [problemData, setProblemData] = useState({
    problem: "",
    solution: "",
    maintenanceStatus: "HAS_PROBLEM" as "HAS_PROBLEM" | "NEEDS_REPAIR" | "IN_MAINTENANCE" | "DAMAGED",
  });
  const [reportingProblem, setReportingProblem] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    deviceCode: "",
    serialNumber: "",
    model: "",
    osVersion: "",
  });
  const [editing, setEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // WebSocket for realtime updates
  const { isConnected } = useWebSocket((message: WebSocketMessage) => {
    if (
      message.deviceId === deviceId &&
      (message.type === "device_status" ||
        message.type === "device_location" ||
        message.type === "device_metrics")
    ) {
      setDevice((prev) => (prev ? { ...prev, ...message.data } : null));
      
      // เมื่อได้รับ location update ให้เพิ่มเข้าไปใน locationHistory เพื่อให้ route ถูกคำนวณใหม่
      if (message.type === "device_location" && message.data?.latitude && message.data?.longitude) {
        setLocationHistory((prev) => {
          const newLocation = {
            latitude: message.data.latitude,
            longitude: message.data.longitude,
            createdAt: new Date().toISOString(),
          };
          
          // เพิ่ม location ใหม่เข้าไป (ไม่ให้ซ้ำกับอันสุดท้าย)
          const lastLocation = prev[prev.length - 1];
          if (
            !lastLocation ||
            lastLocation.latitude !== newLocation.latitude ||
            lastLocation.longitude !== newLocation.longitude
          ) {
            return [...prev, newLocation];
          }
          return prev;
        });
      }
    }
  });

  const fetchDevice = useCallback(async () => {
    try {
      const response = await api.get(`/api/device/${deviceId}`);
      if (response.data.success) {
        const deviceData = response.data.data;
        // Debug: Check lastSeen value
        console.log("Device lastSeen:", deviceData.lastSeen, typeof deviceData.lastSeen);
        setDevice(deviceData);
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

  const fetchActionLogs = useCallback(async (page: number = 0, append: boolean = false) => {
    try {
      setLoadingLogs(true);
      const limit = 20;
      const offset = page * limit;
      
      const response = await api.get(`/api/device/${deviceId}/history?limit=${limit}&offset=${offset}`);
      if (response.data.success) {
        const newLogs = response.data.data?.logs || [];
        const borrows = response.data.data?.borrows || [];
        
        if (append) {
          setActionLogs((prev) => [...prev, ...newLogs]);
        } else {
          setActionLogs(newLogs);
          setBorrowRecords(borrows);
        }
        
        // ถ้าได้น้อยกว่า limit แสดงว่าไม่มีข้อมูลเพิ่มแล้ว
        setHasMoreLogs(newLogs.length === limit);
      }
    } catch (error: any) {
      console.error("Error fetching action logs:", error);
      if (!append) {
        setActionLogs([]);
        setBorrowRecords([]);
      }
    } finally {
      setLoadingLogs(false);
    }
  }, [deviceId]);

  const loadMoreLogs = useCallback(() => {
    if (!loadingLogs && hasMoreLogs) {
      const nextPage = logsPage + 1;
      setLogsPage(nextPage);
      fetchActionLogs(nextPage, true);
    }
  }, [loadingLogs, hasMoreLogs, logsPage, fetchActionLogs]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchDevice();
    fetchLocationHistory();
    fetchActionLogs(0, false);
  }, [deviceId, router, fetchDevice, fetchLocationHistory, fetchActionLogs]);

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
          SHOW_MESSAGE: {
            title: "Message Sent",
            text: "Message will be displayed on the device",
          },
          LOCK_DEVICE: {
            title: "Device Locked",
            text: "Lock command sent successfully",
          },
          RESTART_DEVICE: {
            title: "Restart Command Sent",
            text: "Device will restart shortly",
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
          BLUETOOTH_ON: {
            title: "Bluetooth Enabled",
            text: "Bluetooth will be turned on",
          },
          BLUETOOTH_OFF: {
            title: "Bluetooth Disabled",
            text: "Bluetooth will be turned off",
          },
          SHUTDOWN_DEVICE: {
            title: "Shutdown Command Sent",
            text: "Device will shutdown shortly",
          },
          DISABLE_CAMERA: {
            title: "Camera Disabled",
            text: "Camera access has been blocked on device",
          },
          ENABLE_CAMERA: {
            title: "Camera Enabled",
            text: "Camera access has been restored on device",
          },
          SEND_DATA_NOW: {
            title: "ส่งคำสั่ง Sync แล้ว",
            text: "อุปกรณ์จะทำการส่งข้อมูลล่าสุดในไม่ช้า",
          },
          // Security Policies
          SET_FACTORY_RESET_ALLOWED: { title: "Policy Updated", text: "Factory reset policy has been updated." },
          SET_SAFE_MODE_ALLOWED: { title: "Policy Updated", text: "Safe mode policy has been updated." },
          SET_DEBUGGING_ALLOWED: { title: "Policy Updated", text: "Debugging policy has been updated." },
          SET_SCREEN_CAPTURE_ALLOWED: { title: "Policy Updated", text: "Screen capture policy has been updated." },
          SET_CONFIG_CREDENTIALS_ALLOWED: { title: "Policy Updated", text: "Credentials config policy has been updated." },
          SET_SMART_LOCK_ALLOWED: { title: "Policy Updated", text: "Smart Lock policy has been updated." },
          SET_LOCATION_SERVICES_ALLOWED: { title: "Policy Updated", text: "Location services policy has been updated." },
          SET_FINGERPRINT_UNLOCK_ALLOWED: { title: "Policy Updated", text: "Fingerprint unlock policy has been updated." },
          SET_CHANGE_ACCOUNT_PICTURE_ALLOWED: { title: "Policy Updated", text: "Account picture policy has been updated." },
          SET_HIDE_SENSITIVE_INFO_ON_LOCK_SCREEN: { title: "Policy Updated", text: "Lock screen privacy policy has been updated." },
          SET_ENCRYPTION_ENABLED: { title: "Policy Updated", text: "Encryption policy has been updated." },
          SET_MANAGING_ACCOUNTS_ALLOWED: { title: "Policy Updated", text: "Managing accounts policy has been updated." },
          SET_SMS_ALLOWED: { title: "Policy Updated", text: "SMS policy has been updated." },
          SET_DATA_ROAMING_ALLOWED: { title: "Policy Updated", text: "Data roaming policy has been updated." },
          SET_VPN_CONFIG_ALLOWED: { title: "Policy Updated", text: "VPN config policy has been updated." },
          SET_OUTGOING_CALLS_ALLOWED: { title: "Policy Updated", text: "Outgoing calls policy has been updated." },
          SET_NETWORK_RESET_ALLOWED: { title: "Policy Updated", text: "Network reset policy has been updated." },
          SET_WIFI_CONFIG_ALLOWED: { title: "Policy Updated", text: "Wi-Fi config policy has been updated." },
          SET_CELL_BROADCASTS_CONFIG_ALLOWED: { title: "Policy Updated", text: "Cell broadcasts config policy has been updated." },
          SET_TETHERING_CONFIG_ALLOWED: { title: "Policy Updated", text: "Tethering config policy has been updated." },
          SET_BLUETOOTH_POLICY_ALLOWED: { title: "Policy Updated", text: "Bluetooth policy has been updated." },
          SET_MICROPHONE_MUTED: { title: "Policy Updated", text: "Microphone mute policy has been updated." },
          SET_EXTERNAL_MEDIA_ALLOWED: { title: "Policy Updated", text: "External media policy has been updated." },
          SET_USB_FILE_TRANSFER_ALLOWED: { title: "Policy Updated", text: "USB file transfer policy has been updated." },
          SET_APP_UNINSTALL_ALLOWED: { title: "Policy Updated", text: "App uninstall policy has been updated." },
          SET_INSTALL_UNKNOWN_SOURCES_ALLOWED: { title: "Policy Updated", text: "Install unknown sources policy has been updated." },
          SET_MANAGING_APPS_ALLOWED: { title: "Policy Updated", text: "Managing apps policy has been updated." },
          SET_GOOGLE_SECURITY_SCANS_ALLOWED: { title: "Policy Updated", text: "Google security scans policy has been updated." },
          SET_DATE_TIME_CHANGE_ALLOWED: { title: "Policy Updated", text: "Date/Time change policy has been updated." },


        };

        const message = messages[action] || {
          title: "Command Sent",
          text: `Command "${action}" sent successfully`,
        };

        Swal.fire(getToastConfig({
          icon: "success",
          title: message.title,
          text: message.text,
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
    // Redirect to checkout creation page with device pre-selected
    router.push(`/dashboard/checkouts/new?deviceId=${deviceId}`);
  };

  const handleReturn = async () => {
    // Find active checkout for this device
    try {
      const checkoutResponse = await api.get("/api/checkouts");
      if (checkoutResponse.data?.success) {
        const checkouts = checkoutResponse.data.data || [];
        // Find checkout that has this device and is still active
        const activeCheckout = checkouts.find((checkout: any) => {
          const status = checkout.status || "ACTIVE";
          return (
            (status === "ACTIVE" || status === "PARTIAL_RETURN") &&
            checkout.items?.some((item: any) => 
              item.deviceId === deviceId && !item.returnedAt
            )
          );
        });

        if (activeCheckout) {
          router.push(`/dashboard/checkouts/${activeCheckout.id}`);
        } else {
          await Swal.fire(
            getSwalConfig({
              icon: "info",
              title: "ไม่พบการเบิกที่ใช้งานอยู่",
              text: "อุปกรณ์นี้ไม่ได้ถูกเบิกอยู่",
            })
          );
        }
      }
    } catch (error: any) {
      await Swal.fire(
        getSwalConfig({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: error.response?.data?.error || "ไม่สามารถค้นหาการเบิกได้",
        })
      );
    }
  };

  const handleShowMessage = () => {
    setIsMessageDialogOpen(true);
  };

  const handleConfirmMessage = async () => {
    if (!messageBody.trim()) {
      Swal.fire(getSwalConfig({
        icon: "warning",
        title: "กรุณากรอกข้อความ",
        text: "ต้องมีข้อความอย่างน้อย 1 บรรทัด",
      }));
      return;
    }

    try {
      await sendCommand("SHOW_MESSAGE", {
        title: messageTitle.trim() || "ข้อความจาก Dashboard",
        message: messageBody.trim(),
      });
      setIsMessageDialogOpen(false);
      setMessageTitle("");
      setMessageBody("");
    } catch (error) {
      // error ถูก handle แล้วใน sendCommand
    }
  };

  const handleReportProblem = async () => {
    if (!problemData.problem.trim()) {
      await Swal.fire(
        getSwalConfig({
          icon: "warning",
          title: "กรุณากรอกปัญหา",
          text: "ต้องระบุปัญหาที่พบ",
        })
      );
      return;
    }

    try {
      setReportingProblem(true);
      const response = await api.patch("/api/device/maintenance-status", {
        deviceIds: [deviceId],
        maintenanceStatus: problemData.maintenanceStatus,
        problem: problemData.problem.trim() || null,
        solution: problemData.solution.trim() || null,
      });

      if (response.data.success) {
        await Swal.fire(
          getToastConfig({
            icon: "success",
            title: "รายงานปัญหาสำเร็จ",
          })
        );
        setIsReportProblemDialogOpen(false);
        setProblemData({
          problem: "",
          solution: "",
          maintenanceStatus: "HAS_PROBLEM",
        });
        fetchDevice();
      }
    } catch (error: any) {
      await Swal.fire(
        getSwalConfig({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: error?.response?.data?.error || "ไม่สามารถรายงานปัญหาได้",
        })
      );
    } finally {
      setReportingProblem(false);
    }
  };

  const handleEditDevice = async () => {
    if (!editData.deviceCode.trim()) {
      await Swal.fire(
        getSwalConfig({
          icon: "warning",
          title: "กรุณากรอกรหัสอุปกรณ์",
          text: "รหัสอุปกรณ์เป็นข้อมูลที่จำเป็น",
        })
      );
      return;
    }

    // Show confirmation dialog
    const result = await Swal.fire(
      getSwalConfig({
        title: "ยืนยันการแก้ไขข้อมูล",
        html: `
          <div class="text-left space-y-2">
            <p>คุณต้องการบันทึกการแก้ไขข้อมูลอุปกรณ์ <strong>${device?.deviceCode || editData.deviceCode}</strong> ใช่หรือไม่?</p>
            ${editData.deviceCode !== device?.deviceCode ? `<p class="text-sm text-muted-foreground">รหัสอุปกรณ์: <strong>${device?.deviceCode}</strong> → <strong>${editData.deviceCode}</strong></p>` : ""}
            ${editData.name !== device?.name ? `<p class="text-sm text-muted-foreground">ชื่อ: <strong>${device?.name || "-"}</strong> → <strong>${editData.name || "-"}</strong></p>` : ""}
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "บันทึก",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#8b5cf6",
        cancelButtonColor: "#6b7280",
      })
    );

    if (!result.isConfirmed) {
      return;
    }

    try {
      setEditing(true);
      const response = await api.put(`/api/device/${deviceId}`, editData);

      if (response.data.success) {
        await Swal.fire(
          getToastConfig({
            icon: "success",
            title: "แก้ไขข้อมูลสำเร็จ",
          })
        );
        setIsEditDialogOpen(false);
        fetchDevice();
      }
    } catch (error: any) {
      await Swal.fire(
        getSwalConfig({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: error?.response?.data?.error || "ไม่สามารถแก้ไขข้อมูลได้",
        })
      );
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteDevice = async () => {
    try {
      setDeleting(true);
      const response = await api.delete(`/api/device/${deviceId}`);

      if (response.data.success) {
        await Swal.fire(
          getToastConfig({
            icon: "success",
            title: "ลบอุปกรณ์สำเร็จ",
          })
        );
        router.push("/dashboard");
      }
    } catch (error: any) {
      await Swal.fire(
        getSwalConfig({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: error?.response?.data?.error || "ไม่สามารถลบอุปกรณ์ได้",
        })
      );
    } finally {
      setDeleting(false);
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
                <Button variant="secondary">
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
      default:
        return "muted";
    }
  };

  const getBorrowStatusLabel = (status?: string): string => {
    switch (status) {
      case "AVAILABLE":
        return "ว่าง";
      case "IN_USE":
        return "กำลังใช้งาน";
      case "IN_MAINTENANCE":
        return "มีปัญหา";
      default:
        return "ว่าง";
    }
  };

  const getBorrowStatusVariant = (status?: string): "success" | "warning" | "destructive" | "default" => {
    switch (status) {
      case "AVAILABLE":
        return "success";
      case "IN_USE":
        return "warning";
      case "IN_MAINTENANCE":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">
                {device.name || device.deviceCode}
              </h1>
              <Badge variant={getStatusVariant(device.status)}>
                {device.status === "ONLINE" ? (
                  <Signal className="h-3 w-3 mr-1" />
                ) : (
                  <WifiOff className="h-3 w-3 mr-1" />
                )}
                {device.status}
              </Badge>
              <Badge variant={getBorrowStatusVariant(device.borrowStatus)}>
                {getBorrowStatusLabel(device.borrowStatus)}
              </Badge>
              {device.maintenanceStatus && device.maintenanceStatus !== "NONE" && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {device.maintenanceStatus === "HAS_PROBLEM" && "มีปัญหา"}
                  {device.maintenanceStatus === "NEEDS_REPAIR" && "ต้องซ่อม"}
                  {device.maintenanceStatus === "IN_MAINTENANCE" && "กำลังซ่อม"}
                  {device.maintenanceStatus === "DAMAGED" && "เสียหาย"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{device.deviceCode}</p>
            {device.latestProblem && device.borrowStatus === "IN_MAINTENANCE" && (
              <p className="text-sm text-destructive mt-1">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {device.latestProblem}
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats - Top Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-hover ">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  device.battery > 50 ? "bg-green-500/10" :
                  device.battery > 20 ? "bg-yellow-500/10" :
                  "bg-red-500/10"
                )}>
                  <Battery className={cn(
                    "h-5 w-5",
                    device.battery > 50 ? "text-green-600 dark:text-green-400" :
                    device.battery > 20 ? "text-yellow-600 dark:text-yellow-400" :
                    "text-red-600 dark:text-red-400"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Battery</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={cn(
                      "text-lg font-bold",
                      device.battery > 50 ? "text-green-600 dark:text-green-400" :
                      device.battery > 20 ? "text-yellow-600 dark:text-yellow-400" :
                      "text-red-600 dark:text-red-400"
                    )}>
                      {device.battery}%
                    </p>
                    {/* Simple Battery Bar */}
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          device.battery > 50 ? "bg-green-500" :
                          device.battery > 20 ? "bg-yellow-500" :
                          "bg-red-500"
                        )}
                        style={{ width: `${device.battery}%` }}
                      />
                    </div>
                  </div>
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
                    {safeFormatDistanceToNow(device.lastSeen, {
                      addSuffix: true,
                    }, "ไม่ทราบเวลา")}
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
                      <span className="font-semibold">
                        {device.volumeLevel != null && device.volumeLevel > 0
                          ? `${device.volumeLevel}%`
                          : "-"}
                      </span>
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
                    {device.installedAppsCount != null && device.installedAppsCount > 0 && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">แอปที่ติดตั้ง</span>
                        </div>
                        <span className="font-semibold">{device.installedAppsCount}</span>
                      </div>
                    )}
                    {device.bootTime && (() => {
                      // bootTime is BigInt string (timestamp in milliseconds)
                      const bootTimeNum = typeof device.bootTime === 'string' 
                        ? Number(device.bootTime) 
                        : device.bootTime;
                      const bootDate = new Date(bootTimeNum);
                      if (isNaN(bootDate.getTime())) return null;
                      return (
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">เวลาบูต</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {bootDate.toLocaleString('th-TH')}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Control Panel - All Controls Together */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>แผงควบคุมและนโยบาย</CardTitle>
                <CardDescription>
                  ส่งคำสั่งและจัดการนโยบายความปลอดภัยของอุปกรณ์
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="actions" className="w-full overflow-x-hidden">
                  <TabsList className="flex w-full overflow-x-auto whitespace-nowrap justify-start sm:grid sm:grid-cols-5 sm:justify-items-stretch">
                    <TabsTrigger value="actions">คำสั่งด่วน</TabsTrigger>
                    <TabsTrigger value="security">ความปลอดภัย</TabsTrigger>
                    <TabsTrigger value="network">เครือข่าย</TabsTrigger>
                    <TabsTrigger value="hardware">ฮาร์ดแวร์</TabsTrigger>
                    <TabsTrigger value="apps">แอปพลิเคชัน</TabsTrigger>
                  </TabsList>

                  {/* Actions Tab */}
                  <TabsContent value="actions" className="mt-4">
                    <div className="space-y-6">
                      {/* Alert Section */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground">การแจ้งเตือน</h4>
                        <div className="space-y-2">
                          <Button onClick={() => sendCommand("PLAY_SOUND")} disabled={sendingCommand} variant="default" className="w-full">
                            <Bell className="w-4 h-4 mr-2" />
                            ส่งเสียงแจ้งเตือน (เสียง + สั่น)
                          </Button>
                          <Button onClick={handleShowMessage} disabled={sendingCommand} variant="outline" className="w-full">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            ส่งข้อความขึ้นหน้าจอ
                          </Button>
                        </div>
                      </div>

                      {/* Device Control Section */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground">ควบคุมอุปกรณ์</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={() => sendCommand("RESTART_DEVICE")} disabled={sendingCommand} variant="outline">
                            <Power className="w-4 h-4 mr-2" />
                            รีสตาร์ท
                          </Button>
                          <Button onClick={() => sendCommand("SHUTDOWN_DEVICE")} disabled={sendingCommand} variant="destructive" className="bg-red-600/10 text-red-600 border-red-600/20 hover:bg-red-600/20">
                            <Power className="w-4 h-4 mr-2" />
                            ปิดเครื่อง
                          </Button>
                          <Button onClick={() => sendCommand("LOCK_DEVICE")} disabled={sendingCommand} variant="outline">
                            <Lock className="w-4 h-4 mr-2" />
                            ล็อค
                          </Button>
                          <Button onClick={() => sendCommand("SEND_DATA_NOW")} disabled={sendingCommand} variant="outline" className="col-span-2">
                            <Zap className="w-4 h-4 mr-2" />
                            Sync Data Now
                          </Button>
                        </div>
                      </div>

                      {/* Kiosk Mode Section */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground">โหมด Kiosk</h4>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Square className={cn("w-4 h-4", device.kioskMode ? "text-primary" : "text-muted-foreground")} />
                            <Label htmlFor="kiosk-toggle" className="text-sm font-medium cursor-pointer">Kiosk Mode</Label>
                          </div>
                          <Switch id="kiosk-toggle" checked={device.kioskMode} onCheckedChange={async (checked) => {
                            setDevice((prev) => prev ? { ...prev, kioskMode: checked } : null);
                            await sendCommand(checked ? "ENABLE_KIOSK" : "DISABLE_KIOSK");
                          }} disabled={sendingCommand} />
                        </div>
                      </div>

                      {/* Camera Control Section */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground">กล้อง</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Camera className={cn("w-4 h-4", device.cameraEnabled !== false ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")} />
                              <Label htmlFor="camera-toggle" className="text-sm font-medium cursor-pointer">อนุญาตให้ใช้กล้อง</Label>
                            </div>
                            <Switch id="camera-toggle" checked={device.cameraEnabled !== false} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, cameraEnabled: checked } : null);
                              await sendCommand(checked ? "ENABLE_CAMERA" : "DISABLE_CAMERA");
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button onClick={() => sendCommand("OPEN_CAMERA")} disabled={sendingCommand || device.cameraEnabled === false} variant="outline">
                              <Camera className="w-4 h-4 mr-2" />
                              เปิดกล้อง
                            </Button>
                            <Button onClick={() => sendCommand("TAKE_PHOTO")} disabled={sendingCommand || device.cameraEnabled === false} variant="default">
                              <Camera className="w-4 h-4 mr-2" />
                              ถ่ายรูป
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Security Tab */}
                  <TabsContent value="security" className="mt-4">
                    <div className="space-y-6">
                      {/* Authentication & Lock Screen */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground">การยืนยันตัวตนและหน้าจอล็อก</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Fingerprint className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="fingerprint-toggle" className="text-sm font-medium cursor-pointer">อนุญาตปลดล็อคด้วยลายนิ้วมือ</Label>
                            </div>
                            <Switch id="fingerprint-toggle" checked={device.fingerUnlockAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, fingerUnlockAllowed: checked } : null);
                              await sendCommand("SET_FINGERPRINT_UNLOCK_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileLock className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="encryption-toggle" className="text-sm font-medium cursor-pointer">เข้ารหัสข้อมูล</Label>
                            </div>
                            <Switch id="encryption-toggle" checked={device.encrytionEnable} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, encrytionEnable: checked } : null);
                              await sendCommand("SET_ENCRYPTION_ENABLED", { enabled: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Factory className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="factory-reset-toggle" className="text-sm font-medium cursor-pointer">อนุญาต Factory Reset</Label>
                            </div>
                            <Switch id="factory-reset-toggle" checked={device.factoryResetAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, factoryResetAllowed: checked } : null);
                              await sendCommand("SET_FACTORY_RESET_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="safe-mode-toggle" className="text-sm font-medium cursor-pointer">อนุญาต Safe Mode</Label>
                            </div>
                            <Switch id="safe-mode-toggle" checked={device.safeModeAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, safeModeAllowed: checked } : null);
                              await sendCommand("SET_SAFE_MODE_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Bug className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="debugging-toggle" className="text-sm font-medium cursor-pointer">อนุญาต Debugging</Label>
                            </div>
                            <Switch id="debugging-toggle" checked={device.debugAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, debugAllowed: checked } : null);
                              await sendCommand("SET_DEBUGGING_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <ScreenShare className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="screen-capture-toggle" className="text-sm font-medium cursor-pointer">อนุญาตจับภาพหน้าจอ</Label>
                            </div>
                            <Switch id="screen-capture-toggle" checked={device.sceenCapAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, sceenCapAllowed: checked } : null);
                              await sendCommand("SET_SCREEN_CAPTURE_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Key className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="credentials-toggle" className="text-sm font-medium cursor-pointer">อนุญาตจัดการ Credentials</Label>
                            </div>
                            <Switch id="credentials-toggle" checked={device.credentialAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, credentialAllowed: checked } : null);
                              await sendCommand("SET_CONFIG_CREDENTIALS_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <LockIcon className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="smart-lock-toggle" className="text-sm font-medium cursor-pointer">อนุญาต Smart Lock</Label>
                            </div>
                            <Switch id="smart-lock-toggle" checked={device.smartLockAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, smartLockAllowed: checked } : null);
                              await sendCommand("SET_SMART_LOCK_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="hide-sensitive-toggle" className="text-sm font-medium cursor-pointer">ซ่อนข้อมูลบน Lock Screen</Label>
                            </div>
                            <Switch id="hide-sensitive-toggle" checked={device.hideSensitiveLSceen} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, hideSensitiveLSceen: checked } : null);
                              await sendCommand("SET_HIDE_SENSITIVE_INFO_ON_LOCK_SCREEN", { hide: checked });
                            }} disabled={sendingCommand} />
                          </div>
                        </div>
                      </div>

                      {/* Accounts */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground">บัญชี</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="managing-accounts-toggle" className="text-sm font-medium cursor-pointer">อนุญาตจัดการบัญชี</Label>
                            </div>
                            <Switch id="managing-accounts-toggle" checked={device.accManageAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, accManageAllowed: checked } : null);
                              await sendCommand("SET_MANAGING_ACCOUNTS_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <UserCog className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="account-picture-toggle" className="text-sm font-medium cursor-pointer">อนุญาตเปลี่ยนรูปโปรไฟล์</Label>
                            </div>
                            <Switch id="account-picture-toggle" checked={device.accPicAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, accPicAllowed: checked } : null);
                              await sendCommand("SET_CHANGE_ACCOUNT_PICTURE_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                        </div>
                      </div>

                      {/* System Settings */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground">การตั้งค่าระบบ</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="datetime-change-toggle" className="text-sm font-medium cursor-pointer">อนุญาตเปลี่ยนวัน/เวลา</Label>
                            </div>
                            <Switch id="datetime-change-toggle" checked={device.datetimeChange} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, datetimeChange: checked } : null);
                              await sendCommand("SET_DATE_TIME_CHANGE_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Network Tab */}
                  <TabsContent value="network" className="mt-4">
                    <div className="space-y-6">
                      {/* Network Control Section */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground">การควบคุมเครือข่าย</h4>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Radio className={cn("w-4 h-4", device.bluetoothEnabled ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")} />
                            <Label htmlFor="bluetooth-toggle-2" className="text-sm font-medium cursor-pointer">Bluetooth</Label>
                          </div>
                          <Switch id="bluetooth-toggle-2" checked={device.bluetoothEnabled || false} onCheckedChange={async (checked) => {
                            setDevice((prev) => prev ? { ...prev, bluetoothEnabled: checked } : null);
                            await sendCommand(checked ? "BLUETOOTH_ON" : "BLUETOOTH_OFF");
                          }} disabled={sendingCommand} />
                        </div>
                      </div>
                      {/* Network & Communication Policies */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground">นโยบายเครือข่ายและการสื่อสาร</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="location-service-toggle" className="text-sm font-medium cursor-pointer">อนุญาต Location Services</Label>
                            </div>
                            <Switch id="location-service-toggle" checked={device.locationServiceAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, locationServiceAllowed: checked } : null);
                              await sendCommand("SET_LOCATION_SERVICES_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <MessageCircle className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="sms-toggle" className="text-sm font-medium cursor-pointer">อนุญาต SMS</Label>
                            </div>
                            <Switch id="sms-toggle" checked={device.smsAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, smsAllowed: checked } : null);
                              await sendCommand("SET_SMS_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="roaming-toggle" className="text-sm font-medium cursor-pointer">อนุญาต Data Roaming</Label>
                            </div>
                            <Switch id="roaming-toggle" checked={device.romingAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, romingAllowed: checked } : null);
                              await sendCommand("SET_DATA_ROAMING_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Shield className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="vpn-config-toggle" className="text-sm font-medium cursor-pointer">อนุญาตตั้งค่า VPN</Label>
                            </div>
                            <Switch id="vpn-config-toggle" checked={device.vpncfAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, vpncfAllowed: checked } : null);
                              await sendCommand("SET_VPN_CONFIG_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <PhoneCall className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="outgoing-calls-toggle" className="text-sm font-medium cursor-pointer">อนุญาตโทรออก</Label>
                            </div>
                            <Switch id="outgoing-calls-toggle" checked={device.callAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, callAllowed: checked } : null);
                              await sendCommand("SET_OUTGOING_CALLS_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <WifiOffIcon className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="network-reset-toggle" className="text-sm font-medium cursor-pointer">อนุญาตรีเซ็ตเครือข่าย</Label>
                            </div>
                            <Switch id="network-reset-toggle" checked={device.netResetAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, netResetAllowed: checked } : null);
                              await sendCommand("SET_NETWORK_RESET_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Wifi className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="wifi-config-toggle" className="text-sm font-medium cursor-pointer">อนุญาตตั้งค่า Wi-Fi</Label>
                            </div>
                            <Switch id="wifi-config-toggle" checked={device.wificfAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, wificfAllowed: checked } : null);
                              await sendCommand("SET_WIFI_CONFIG_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <RadioTower className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="cell-broadcast-toggle" className="text-sm font-medium cursor-pointer">อนุญาตตั้งค่า Cell Broadcast</Label>
                            </div>
                            <Switch id="cell-broadcast-toggle" checked={device.cellBroadcfAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, cellBroadcfAllowed: checked } : null);
                              await sendCommand("SET_CELL_BROADCASTS_CONFIG_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Network className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="tethering-toggle" className="text-sm font-medium cursor-pointer">อนุญาตปล่อย Hotspot</Label>
                            </div>
                            <Switch id="tethering-toggle" checked={device.tetheringcfAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, tetheringcfAllowed: checked } : null);
                              await sendCommand("SET_TETHERING_CONFIG_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Radio className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor="bluetooth-policy-toggle" className="text-sm font-medium cursor-pointer">อนุญาต Bluetooth</Label>
                            </div>
                            <Switch id="bluetooth-policy-toggle" checked={device.bluePolicyAllowed} onCheckedChange={async (checked) => {
                              setDevice((prev) => prev ? { ...prev, bluePolicyAllowed: checked } : null);
                              await sendCommand("SET_BLUETOOTH_POLICY_ALLOWED", { allowed: checked });
                            }} disabled={sendingCommand} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Hardware Tab */}
                  <TabsContent value="hardware" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <MicOff className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="mic-mute-toggle" className="text-sm font-medium cursor-pointer">ปิดไมโครโฟน</Label>
                        </div>
                        <Switch id="mic-mute-toggle" checked={device.micMute} onCheckedChange={async (checked) => {
                          setDevice((prev) => prev ? { ...prev, micMute: checked } : null);
                          await sendCommand("SET_MICROPHONE_MUTED", { muted: checked });
                        }} disabled={sendingCommand} />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <MemoryStick className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="sd-card-toggle" className="text-sm font-medium cursor-pointer">อนุญาตใช้ SD Card</Label>
                        </div>
                        <Switch id="sd-card-toggle" checked={device.sdcardAllowed} onCheckedChange={async (checked) => {
                          setDevice((prev) => prev ? { ...prev, sdcardAllowed: checked } : null);
                          await sendCommand("SET_EXTERNAL_MEDIA_ALLOWED", { allowed: checked });
                        }} disabled={sendingCommand} />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Usb className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="usb-transfer-toggle" className="text-sm font-muted cursor-pointer">อนุญาตโอนไฟล์ผ่าน USB</Label>
                        </div>
                        <Switch id="usb-transfer-toggle" checked={device.usbfileTranferAllowed} onCheckedChange={async (checked) => {
                          setDevice((prev) => prev ? { ...prev, usbfileTranferAllowed: checked } : null);
                          await sendCommand("SET_USB_FILE_TRANSFER_ALLOWED", { allowed: checked });
                        }} disabled={sendingCommand} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Applications Tab */}
                  <TabsContent value="apps" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AppWindow className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="uninstall-toggle" className="text-sm font-medium cursor-pointer">อนุญาตถอนการติดตั้งแอป</Label>
                        </div>
                        <Switch id="uninstall-toggle" checked={device.uninstallAllowed} onCheckedChange={async (checked) => {
                          setDevice((prev) => prev ? { ...prev, uninstallAllowed: checked } : null);
                          await sendCommand("SET_APP_UNINSTALL_ALLOWED", { allowed: checked });
                        }} disabled={sendingCommand} />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="unknown-sources-toggle" className="text-sm font-medium cursor-pointer">อนุญาตติดตั้งแอปที่ไม่รู้จัก</Label>
                        </div>
                        <Switch id="unknown-sources-toggle" checked={device.installUnknowAllowed} onCheckedChange={async (checked) => {
                          setDevice((prev) => prev ? { ...prev, installUnknowAllowed: checked } : null);
                          await sendCommand("SET_INSTALL_UNKNOWN_SOURCES_ALLOWED", { allowed: checked });
                        }} disabled={sendingCommand} />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AppWindow className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="manage-apps-toggle" className="text-sm font-medium cursor-pointer">อนุญาตจัดการแอป</Label>
                        </div>
                        <Switch id="manage-apps-toggle" checked={device.manageAppAllowed} onCheckedChange={async (checked) => {
                          setDevice((prev) => prev ? { ...prev, manageAppAllowed: checked } : null);
                          await sendCommand("SET_MANAGING_APPS_ALLOWED", { allowed: checked });
                        }} disabled={sendingCommand} />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Scan className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="google-scan-toggle" className="text-sm font-medium cursor-pointer">บังคับสแกนแอปด้วย Google</Label>
                        </div>
                        <Switch id="google-scan-toggle" checked={device.googleScanAllowed} onCheckedChange={async (checked) => {
                          setDevice((prev) => prev ? { ...prev, googleScanAllowed: checked } : null);
                          await sendCommand("SET_GOOGLE_SECURITY_SCANS_ALLOWED", { allowed: checked });
                        }} disabled={sendingCommand} />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Action History - Timeline with Tabs */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>ประวัติการทำงาน</CardTitle>
                <CardDescription>
                  รายการคำสั่ง กิจกรรม และการเบิก/คืนอุปกรณ์
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="activity" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="activity">
                      <Activity className="w-4 h-4 mr-2" />
                      กิจกรรม
                    </TabsTrigger>
                    <TabsTrigger value="borrow">
                      <Package className="w-4 h-4 mr-2" />
                      การเบิก/คืน
                    </TabsTrigger>
                  </TabsList>

                  {/* Activity Logs Tab */}
                  <TabsContent value="activity" className="mt-4">
                    {loadingLogs && actionLogs.length === 0 ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : actionLogs.length > 0 ? (
                      <div className="relative">
                        {/* Timeline - max-h-96 overflow-y-auto */}
                        <div className="space-y-0 max-h-96 overflow-y-auto px-2">
                          {actionLogs.map((log: any, index: number) => {
                            if (!log.createdAt) return null;
                            const logDate = new Date(log.createdAt);
                            if (isNaN(logDate.getTime())) return null;
                            const prevLogDate = index > 0 && actionLogs[index - 1].createdAt 
                              ? new Date(actionLogs[index - 1].createdAt) 
                              : null;
                            const showDateSeparator = !prevLogDate || !isSameDay(logDate, prevLogDate);
                            
                            const getActionIcon = (action: string) => {
                              if (action.includes("COMMAND_")) {
                                const cmd = action.replace("COMMAND_", "");
                                if (cmd.includes("WIFI")) return <Wifi className="w-3.5 h-3.5 text-primary" />;
                                if (cmd.includes("BLUETOOTH")) return <Radio className="w-3.5 h-3.5 text-primary" />;
                                if (cmd.includes("LOCATION")) return <MapPin className="w-3.5 h-3.5 text-primary" />;
                                if (cmd.includes("KIOSK")) return <Square className="w-3.5 h-3.5 text-primary" />;
                                if (cmd.includes("LOCK")) return <Lock className="w-3.5 h-3.5 text-primary" />;
                                if (cmd.includes("RESTART") || cmd.includes("POWER") || cmd.includes("SHUTDOWN")) return <Power className="w-3.5 h-3.5 text-primary" />;
                                if (cmd.includes("CAMERA")) return <Camera className="w-3.5 h-3.5 text-primary" />;
                                if (cmd.includes("SOUND") || cmd.includes("BELL")) return <Bell className="w-3.5 h-3.5 text-primary" />;
                              }
                              // Event icons
                              if (action === 'BOOT') return <Power className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />;
                              if (action === 'SHUTDOWN') return <Power className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />;
                              if (action === 'LOCK') return <Lock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
                              if (action === 'UNLOCK') return <Lock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />;
                              if (action === 'KIOSK_ENABLED') return <Square className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
                              if (action === 'KIOSK_DISABLED') return <Square className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />;
                              if (action === 'ERROR') return <Activity className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />;
                              return <Activity className="w-3.5 h-3.5 text-primary" />;
                            };

                            const formatTime = (date: Date) => {
                              if (isToday(date)) {
                                return format(date, "HH:mm", { locale: th });
                              } else if (isYesterday(date)) {
                                return `เมื่อวาน ${format(date, "HH:mm", { locale: th })}`;
                              } else {
                                return format(date, "d MMM HH:mm", { locale: th });
                              }
                            };

                            const formatDateHeader = (date: Date) => {
                              if (isToday(date)) return "วันนี้";
                              if (isYesterday(date)) return "เมื่อวาน";
                              return format(date, "d MMMM yyyy", { locale: th });
                            };

                            return (
                              <div key={log.id || `log-${index}`}>
                                {showDateSeparator && (
                                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 px-2 mb-2 border-b">
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      {formatDateHeader(logDate)}
                                    </p>
                                  </div>
                                )}
                                <div className="relative  pl-4 pb-4 last:pb-0 group">
                                  {/* Timeline line */}
                                  {index < actionLogs.length - 1 && (
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 to-transparent" />
                                  )}
                                  {/* Timeline dot */}
                                  <div className="absolute left-0 top-1.5 -translate-x-1/2">
                                    <div className="h-3 w-3 rounded-full bg-primary border-2 border-background shadow-sm group-hover:scale-125 transition-transform" />
                                  </div>
                                  {/* Content */}
                                  <div className="pl-4">
                                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all duration-200">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className="mt-0.5 shrink-0">
                                              {getActionIcon(log.action)}
                                            </div>
                                            <p className="font-medium text-sm">
                                              {log.action.replace("COMMAND_", "").replace(/_/g, " ")}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            {log.user && (
                                              <div className="flex items-center gap-1.5">
                                                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                  <User className="h-2.5 w-2.5 text-primary" />
                                                </div>
                                                <span className="text-xs font-medium text-foreground">{log.user}</span>
                                              </div>
                                            )}
                                            <span className="text-[10px] text-muted-foreground">
                                              {formatTime(logDate)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Load More Button */}
                        {hasMoreLogs && (
                          <div className="mt-4 pt-4 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={loadMoreLogs}
                              disabled={loadingLogs}
                            >
                              {loadingLogs ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                                  กำลังโหลด...
                                </>
                              ) : (
                                <>
                                  <Activity className="w-4 h-4 mr-2" />
                                  โหลดเพิ่มเติม
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                          <Activity className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">ยังไม่มี activity log</p>
                        <p className="text-xs text-muted-foreground/80">กิจกรรมจะแสดงที่นี่เมื่อมีการดำเนินการ</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Borrow Records Tab */}
                  <TabsContent value="borrow" className="mt-4">
                    {borrowRecords.length > 0 ? (
                      <div className="relative">
                        <div className="space-y-0 max-h-96 overflow-y-auto px-2">
                          {borrowRecords.map((borrow: any, index: number) => {
                            if (!borrow.borrowTime) return null;
                            const borrowDate = new Date(borrow.borrowTime);
                            if (isNaN(borrowDate.getTime())) return null;
                            const prevBorrowDate = index > 0 && borrowRecords[index - 1].borrowTime
                              ? new Date(borrowRecords[index - 1].borrowTime)
                              : null;
                            const showDateSeparator = !prevBorrowDate || !isSameDay(borrowDate, prevBorrowDate);

                            const formatTime = (date: Date) => {
                              if (isToday(date)) {
                                return format(date, "HH:mm", { locale: th });
                              } else if (isYesterday(date)) {
                                return `เมื่อวาน ${format(date, "HH:mm", { locale: th })}`;
                              } else {
                                return format(date, "d MMM HH:mm", { locale: th });
                              }
                            };

                            const formatDateHeader = (date: Date) => {
                              if (isToday(date)) return "วันนี้";
                              if (isYesterday(date)) return "เมื่อวาน";
                              return format(date, "d MMMM yyyy", { locale: th });
                            };

                            return (
                              <div key={borrow.id || `borrow-${index}`}>
                                {showDateSeparator && (
                                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 px-2 mb-2 border-b">
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      {formatDateHeader(borrowDate)}
                                    </p>
                                  </div>
                                )}
                                <div className="relative pl-4 pb-4 last:pb-0 group">
                                  {/* Timeline line */}
                                  {index < borrowRecords.length - 1 && (
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 to-transparent" />
                                  )}
                                  {/* Timeline dot */}
                                  <div className="absolute left-0 top-1.5 -translate-x-1/2">
                                    <div className={cn(
                                      "h-3 w-3 rounded-full border-2 border-background shadow-sm group-hover:scale-125 transition-transform",
                                      borrow.returnTime ? "bg-green-500" : "bg-blue-500"
                                    )} />
                                  </div>
                                  {/* Content */}
                                  <div className="pl-4">
                                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all duration-200">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            {borrow.returnTime ? (
                                              <PackageCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                            ) : (
                                              <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                            )}
                                            <p className="font-medium text-sm">
                                              {borrow.returnTime ? "คืนอุปกรณ์" : "ยืมอุปกรณ์"}
                                            </p>
                                          </div>
                                          {borrow.reason && (
                                            <p className="text-xs text-muted-foreground mb-1">
                                              เหตุผล: {borrow.reason}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center gap-1.5">
                                              <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <User className="h-2.5 w-2.5 text-primary" />
                                              </div>
                                              <span className="text-xs font-medium text-foreground">{borrow.user}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                              {formatTime(borrowDate)}
                                            </span>
                                            {borrow.returnTime && (() => {
                                              try {
                                                const returnDate = new Date(borrow.returnTime);
                                                if (isNaN(returnDate.getTime())) return null;
                                                return (
                                                  <span className="text-[10px] text-muted-foreground">
                                                    • คืน: {formatTime(returnDate)}
                                                  </span>
                                                );
                                              } catch {
                                                return null;
                                              }
                                            })()}
                                          </div>
                                        </div>
                                        <Badge variant={borrow.returnTime ? "success" : "info"} className="text-xs shrink-0">
                                          {borrow.returnTime ? "คืนแล้ว" : "กำลังยืม"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">ยังไม่มีประวัติการเบิก/คืน</p>
                        <p className="text-xs text-muted-foreground/80">ประวัติการเบิก/คืนจะแสดงที่นี่</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
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
                  <Package className="h-4 w-4 mr-2" />
                  ยืมอุปกรณ์
                </Button>
                <Button
                  onClick={handleReturn}
                  className="w-full"
                  variant="outline"
                >
                  <PackageCheck className="h-4 w-4 mr-2" />
                  คืนอุปกรณ์
                </Button>
                <Button
                  onClick={() => setIsReportProblemDialogOpen(true)}
                  className="w-full"
                  variant="outline"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  รายงานปัญหา
                </Button>
                <Button
                  onClick={() => {
                    if (device) {
                      setEditData({
                        name: device.name || "",
                        deviceCode: device.deviceCode || "",
                        serialNumber: device.serialNumber || "",
                        model: device.model || "",
                        osVersion: device.osVersion || "",
                      });
                    }
                    setIsEditDialogOpen(true);
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  แก้ไขข้อมูล
                </Button>
                <Button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="w-full"
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบอุปกรณ์
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
                      {safeFormatDistanceToNow(device.lastSeen, {
                        addSuffix: true,
                      }, "ไม่ทราบเวลา")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Send Message Dialog */}
        <Dialog open={isMessageDialogOpen} onOpenChange={(open) => {
          setIsMessageDialogOpen(open);
          if (!open) {
            setMessageTitle("");
            setMessageBody("");
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>ส่งข้อความไปที่อุปกรณ์</DialogTitle>
              <DialogDescription>
                พิมพ์ข้อความที่ต้องการให้แสดงบนอุปกรณ์เครื่องนี้
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="message-title">หัวข้อ (ไม่บังคับ)</Label>
                <Input
                  id="message-title"
                  placeholder="เช่น แจ้งเตือนสำคัญ"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message-body">ข้อความ</Label>
                <textarea
                  id="message-body"
                  placeholder="พิมพ์ข้อความที่ต้องการส่งไปยังอุปกรณ์..."
                  rows={4}
                  value={messageBody}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageBody(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMessageDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={handleConfirmMessage}
                disabled={sendingCommand}
              >
                ส่งข้อความ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Report Problem Dialog */}
        <Dialog open={isReportProblemDialogOpen} onOpenChange={setIsReportProblemDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>รายงานปัญหา</DialogTitle>
              <DialogDescription>
                รายงานปัญหาที่พบกับอุปกรณ์นี้
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="maintenanceStatus">สถานะการซ่อม</Label>
                <Select
                  value={problemData.maintenanceStatus}
                  onValueChange={(value: "HAS_PROBLEM" | "NEEDS_REPAIR" | "IN_MAINTENANCE" | "DAMAGED") =>
                    setProblemData({ ...problemData, maintenanceStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HAS_PROBLEM">มีปัญหา</SelectItem>
                    <SelectItem value="NEEDS_REPAIR">ต้องซ่อม</SelectItem>
                    <SelectItem value="IN_MAINTENANCE">กำลังซ่อม</SelectItem>
                    <SelectItem value="DAMAGED">เสียหาย (ไม่สามารถซ่อมได้)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="problem">ปัญหาที่พบ *</Label>
                <Textarea
                  id="problem"
                  placeholder="เช่น หน้าจอแตก, เปิดไม่ติด, แบตเตอรี่เสื่อม"
                  value={problemData.problem}
                  onChange={(e) => setProblemData({ ...problemData, problem: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="solution">แนวทางการแก้ไข (ไม่บังคับ)</Label>
                <Textarea
                  id="solution"
                  placeholder="เช่น ส่งซ่อม, จัดซื้อใหม่, เปลี่ยนแบตเตอรี่"
                  value={problemData.solution}
                  onChange={(e) => setProblemData({ ...problemData, solution: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsReportProblemDialogOpen(false);
                  setProblemData({
                    problem: "",
                    solution: "",
                    maintenanceStatus: "HAS_PROBLEM",
                  });
                }}
                disabled={reportingProblem}
              >
                ยกเลิก
              </Button>
              <Button onClick={handleReportProblem} disabled={reportingProblem}>
                {reportingProblem ? "กำลังรายงาน..." : "ยืนยัน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Device Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>แก้ไขข้อมูลอุปกรณ์</DialogTitle>
              <DialogDescription>
                แก้ไขข้อมูลพื้นฐานของอุปกรณ์
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-deviceCode">รหัสอุปกรณ์ *</Label>
                <Input
                  id="edit-deviceCode"
                  value={editData.deviceCode}
                  onChange={(e) => setEditData({ ...editData, deviceCode: e.target.value })}
                  placeholder="เช่น TABLET-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">ชื่ออุปกรณ์</Label>
                <Input
                  id="edit-name"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="เช่น Tablet สำหรับงานสนาม"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-serialNumber">Serial Number</Label>
                <Input
                  id="edit-serialNumber"
                  value={editData.serialNumber}
                  onChange={(e) => setEditData({ ...editData, serialNumber: e.target.value })}
                  placeholder="เช่น SN123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">รุ่น</Label>
                <Input
                  id="edit-model"
                  value={editData.model}
                  onChange={(e) => setEditData({ ...editData, model: e.target.value })}
                  placeholder="เช่น iPad Pro 12.9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-osVersion">เวอร์ชัน OS</Label>
                <Input
                  id="edit-osVersion"
                  value={editData.osVersion}
                  onChange={(e) => setEditData({ ...editData, osVersion: e.target.value })}
                  placeholder="เช่น Android 13, iOS 17.0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={editing}
              >
                ยกเลิก
              </Button>
              <Button onClick={handleEditDevice} disabled={editing}>
                {editing ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Device Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ยืนยันการลบอุปกรณ์</DialogTitle>
              <DialogDescription>
                คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์นี้? การกระทำนี้ไม่สามารถยกเลิกได้
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                <strong>รหัสอุปกรณ์:</strong> {device?.deviceCode}
              </p>
              {device?.name && (
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>ชื่อ:</strong> {device.name}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={deleting}
              >
                ยกเลิก
              </Button>
              <Button variant="destructive" onClick={handleDeleteDevice} disabled={deleting}>
                {deleting ? "กำลังลบ..." : "ลบอุปกรณ์"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
