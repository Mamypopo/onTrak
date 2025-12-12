"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Swal from "sweetalert2";
import { getSwalConfig, getToastConfig } from "@/lib/swal-config";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tablet, CheckCircle2, XCircle, Bell, MessageSquare, Power, Lock, Zap, Square, Camera, Fingerprint, FileLock, Factory, ShieldCheck, Bug, ScreenShare, Key, LockIcon, EyeOff, Users, UserCog, Clock, Radio, MapPin, MessageCircle, Globe, Shield, PhoneCall, WifiOff as WifiOffIcon, Network, RadioTower, MicOff, MemoryStick, Usb, AppWindow, Package, Scan, Wifi, Settings, Vibrate, VolumeX, Moon, Star, AlertCircle, Music, Phone, AlarmClock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { TimePicker } from "@/components/ui/time-picker";
interface Device {
  id: string;
  deviceCode: string;
  name: string | null;
  status: 'ONLINE' | 'OFFLINE';
}

interface ApprovedApp {
  productId: string;
  packageName: string;
  title: string;
  iconUrl: string;
}

type InstallType = "REQUIRED" | "UNAVAILABLE" | "AVAILABLE";

interface PolicyApp {
  packageName: string;
  installType: InstallType;
}

export default function BulkCommandPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("actions");
  const [approvedApps, setApprovedApps] = useState<ApprovedApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [policyApps, setPolicyApps] = useState<Record<string, InstallType>>({});
  const [systemUpdatePolicy, setSystemUpdatePolicy] = useState<"AUTOMATIC" | "WINDOWED" | "POSTPONE" | "NONE">("NONE");
  const [updateWindow, setUpdateWindow] = useState<{ start: Date, end: Date }>({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 0, 0)),
  });

  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/device");
        if (response.data.success) {
          setDevices(response.data.data || []);
        }
      } catch (error) {
        console.error("Error fetching devices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const fetchApprovedApps = useCallback(async () => {
    setLoadingApps(true);
    try {
      const response = await api.get("/api/enterprise/approved-apps");
      setApprovedApps(response.data || []);
    } catch (error) {
      console.error("Error fetching approved apps:", error);
      Swal.fire(getSwalConfig({
        icon: "error",
        title: "ไม่สามารถโหลดแอปได้",
        text: (error as any).response?.data?.error || (error as Error).message,
      }));
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "apps") {
      fetchApprovedApps();
    }
  }, [activeTab, fetchApprovedApps]);

  const handleOpenPlayStore = useCallback(async () => {
    try {
      // Determine the correct parentFrameUrl. It MUST be an HTTPS URL.
      // In development, this often means using an ngrok tunnel URL.
      let parentUrl = window.location.origin;
      const ngrokUrl = document.querySelector('meta[name="ngrok-url"]')?.getAttribute('content');

      if (ngrokUrl && parentUrl.startsWith('http://localhost')) {
        parentUrl = ngrokUrl;
        console.log('Using ngrok URL for parentFrameUrl:', parentUrl);
      }

      if (!parentUrl.startsWith('https://')) {
        Swal.fire(getSwalConfig({
          icon: "error",
          title: "การตั้งค่าไม่ถูกต้อง",
          text: "จำเป็นต้องเข้าถึง Dashboard ผ่าน HTTPS (เช่น ngrok) เพื่อเปิด Managed Google Play",
        }));
        return;
      }

      // The parentFrameUrl must be an HTTPS URL.
      const tokenRes = await api.post("/api/enterprise/managed-play-token", {
        parentFrameUrl: parentUrl,
      });
      const webToken = tokenRes.data.webToken;

      const iframeUrl = `https://play.google.com/work/embedded/search?token=${webToken}&mode=SELECT`;

      Swal.fire({
        title: 'Managed Google Play',
        html: `<iframe src="${iframeUrl}" style="width: 100%; height: 70vh; border: none;"></iframe>`,
        width: '80vw',
        showConfirmButton: false,
        showCloseButton: true,
      });

      // Define the expected structure of the event data from the iFrame
      interface PlayIframeEvent extends MessageEvent {
        data: {
          productId?: string;
          kind?: string;
        };
      }
      const handlePlayEvent = (event: PlayIframeEvent) => {
        if (event.origin === 'https://play.google.com' && event.data && event.data.productId) {
          fetchApprovedApps(); // Refresh app list after approval
          Swal.fire(getToastConfig({
            icon: 'success',
            title: 'อนุมัติแอปเรียบร้อยแล้ว',
          }));
          Swal.close();
          window.removeEventListener('message', handlePlayEvent);
        }
      };

      window.addEventListener('message', handlePlayEvent);

    } catch (error) {
      Swal.fire(getSwalConfig({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: (error as any).response?.data?.error || "ไม่สามารถเปิด Managed Google Play ได้",
      }));
    }
  }, [fetchApprovedApps]);

  const handleSendCommand = useCallback(async (action: string, params?: any) => {
    if (selectedDeviceIds.length === 0) {
      Swal.fire(getSwalConfig({
        icon: "warning",
        title: "กรุณาเลือกอุปกรณ์",
        text: "โปรดเลือกอุปกรณ์อย่างน้อย 1 เครื่องเพื่อส่งคำสั่ง",
      }));
      return;
    }

    const confirmResult = await Swal.fire(getSwalConfig({
      icon: 'question',
      title: 'ยืนยันการส่งคำสั่ง',
      html: `คุณต้องการส่งคำสั่ง <strong>${action.replace(/_/g, ' ')}</strong> ไปยังอุปกรณ์ที่เลือก <strong>${selectedDeviceIds.length}</strong> เครื่องใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    }));

    if (!confirmResult.isConfirmed) {
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/api/device/bulk/command', {
        deviceIds: selectedDeviceIds,
        action: action,
        params: params || {},
      });

      if (response.data.success) {
        const { successCount, failureCount } = response.data.data;
        Swal.fire(getSwalConfig({
          icon: "success",
          title: "ส่งคำสั่งสำเร็จ",
          html: `ส่งคำสั่งไปยังอุปกรณ์สำเร็จ ${successCount} เครื่อง<br>ล้มเหลว ${failureCount} เครื่อง`,
        }));
      } else {
        throw new Error(response.data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error sending command:", error);
      Swal.fire(getSwalConfig({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: (error as any).response?.data?.error || "ไม่สามารถส่งคำสั่งไปยังอุปกรณ์ได้",
      }));
    } finally {
      setSending(false);
    }
  }, [selectedDeviceIds]);

  const handleSetSystemUpdatePolicy = useCallback(async () => {
    let params: any = { policy: systemUpdatePolicy };

    if (systemUpdatePolicy === 'WINDOWED') {
      const startMinutes = updateWindow.start.getHours() * 60 + updateWindow.start.getMinutes();
      const endMinutes = updateWindow.end.getHours() * 60 + updateWindow.end.getMinutes();

      if (startMinutes >= endMinutes) {
        Swal.fire(getSwalConfig({
          icon: "warning",
          title: "เวลาไม่ถูกต้อง",
          text: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น",
        }));
        return;
      }

      params.start = startMinutes;
      params.end = endMinutes;
    }

    // Use the generic sendCommand function
    await handleSendCommand("SET_SYSTEM_UPDATE_POLICY", params);
  }, [
    systemUpdatePolicy,
    updateWindow.start,
    updateWindow.end,
    handleSendCommand
  ]);


  const handleDeployPolicy = useCallback(async () => {
    const appsToDeploy = Object.entries(policyApps)
      .filter(([, installType]) => installType !== "AVAILABLE")
      .map(([packageName, installType]) => ({ packageName, installType }));

    if (appsToDeploy.length === 0) {
      Swal.fire(getSwalConfig({
        icon: "info",
        title: "ไม่มีการเปลี่ยนแปลง",
        text: "โปรดเลือกสถานะ 'บังคับติดตั้ง' หรือ 'ถอนการติดตั้ง' สำหรับแอปที่ต้องการ",
      }));
      return;
    }

    const confirmResult = await Swal.fire(getSwalConfig({
      icon: 'question',
      title: 'ยืนยันการใช้ Policy',
      html: `คุณต้องการอัปเดต App Policy สำหรับแอป <strong>${appsToDeploy.length}</strong> รายการใช่หรือไม่?<br/><br/><strong class="text-amber-600">หมายเหตุ:</strong> การเปลี่ยนแปลงนี้จะมีผลกับอุปกรณ์ <strong>ทั้งหมด</strong> ที่ใช้ Policy 'default' ไม่ใช่แค่ ${selectedDeviceIds.length} เครื่องที่เลือกไว้`,
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    }));

    if (!confirmResult.isConfirmed) return;

    setSending(true);
    try {
      const response = await api.post('/api/enterprise/deploy-app-policy', {
        policyId: 'default',
        // The backend expects a 'policyBody' object that matches the Google API structure.
        // We construct it here before sending.
        policyBody: {
          applications: appsToDeploy,
        },
      });

      Swal.fire(getSwalConfig({
        icon: "success",
        title: "อัปเดต Policy สำเร็จ",
        text: "Policy ของแอปพลิเคชันถูกส่งไปอัปเดตแล้ว อุปกรณ์จะทยอยรับการเปลี่ยนแปลง",
      }));
    } catch (error) {
      console.error("Error deploying policy:", error);
      Swal.fire(getSwalConfig({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: (error as any).response?.data?.error || "ไม่สามารถอัปเดต Policy ได้",
      }));
    } finally {
      setSending(false);
    }
  }, [policyApps, selectedDeviceIds.length]);

  const toggleSelectAll = () => {
    if (selectedDeviceIds.length === devices.length) {
      setSelectedDeviceIds([]);
    } else {
      setSelectedDeviceIds(devices.map(d => d.id));
    }
  };

  const isAllSelected = devices.length > 0 && selectedDeviceIds.length === devices.length;

  const handlePolicyChange = (packageName: string, installType: InstallType) => {
    setPolicyApps(prev => ({ ...prev, [packageName]: installType }));
  };


  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Device Selection */}
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>เลือกอุปกรณ์</CardTitle>
                <CardDescription>
                  เลือกอุปกรณ์ที่ต้องการส่งคำสั่ง ({selectedDeviceIds.length} / {devices.length} เครื่อง)
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={loading}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">เลือกทั้งหมด</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : devices.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {devices.map(device => (
                  <div
                    key={device.id}
                    onClick={() => {
                      setSelectedDeviceIds(prev =>
                        prev.includes(device.id)
                          ? prev.filter(id => id !== device.id)
                          : [...prev, device.id]
                      );
                    }}
                    className={cn(
                      "relative p-4 border rounded-lg cursor-pointer transition-all duration-200",
                      "hover:border-primary/80 hover:shadow-md",
                      selectedDeviceIds.includes(device.id) ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    {selectedDeviceIds.includes(device.id) && (
                      <CheckCircle2 className="absolute top-2 right-2 h-5 w-5 text-primary" />
                    )}
                    <div className="flex flex-col items-center justify-center text-center gap-2">
                      <Tablet className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-semibold leading-tight truncate w-full">{device.name || device.deviceCode}</p>
                      <p className="text-xs text-muted-foreground truncate w-full">{device.deviceCode}</p>
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className={cn("h-2 w-2 rounded-full", device.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400')} />
                        <span>{device.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">ไม่พบอุปกรณ์ในระบบ</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commands */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>คำสั่งและนโยบาย</CardTitle>
            <CardDescription>
              เลือกคำสั่งหรือนโยบายที่จะนำไปใช้กับอุปกรณ์ที่เลือกทั้งหมด
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Dropdown for small screens */}
              <div className="sm:hidden mb-4">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actions">คำสั่งด่วน</SelectItem>
                    <SelectItem value="security">ความปลอดภัย</SelectItem>
                    <SelectItem value="network">เครือข่าย</SelectItem>
                    <SelectItem value="hardware">ฮาร์ดแวร์</SelectItem>
                    <SelectItem value="apps">แอปพลิเคชัน</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabs for larger screens */}
              <TabsList className="hidden sm:grid w-full grid-cols-5">
                <TabsTrigger value="actions">คำสั่งด่วน</TabsTrigger>
                <TabsTrigger value="security">ความปลอดภัย</TabsTrigger>
                <TabsTrigger value="network">เครือข่าย</TabsTrigger>
                <TabsTrigger value="hardware">ฮาร์ดแวร์</TabsTrigger>
                <TabsTrigger value="apps">แอปพลิเคชัน</TabsTrigger>
              </TabsList>

              {/* Actions Tab */}
              <TabsContent value="actions" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">คำสั่งทั่วไป</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("PLAY_SOUND")} disabled={sending}><Bell className="w-4 h-4 mr-2" />ส่งเสียง</Button>
                      <Button onClick={() => handleSendCommand("LOCK_DEVICE")} disabled={sending}><Lock className="w-4 h-4 mr-2" />ล็อค</Button>
                      <Button onClick={() => handleSendCommand("RESTART_DEVICE")} disabled={sending}><Power className="w-4 h-4 mr-2" />รีสตาร์ท</Button>
                      <Button onClick={() => handleSendCommand("SEND_DATA_NOW")} disabled={sending}><Zap className="w-4 h-4 mr-2" />Sync Data</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Kiosk Mode</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("ENABLE_KIOSK")} disabled={sending}><Square className="w-4 h-4 mr-2" />เปิด Kiosk</Button>
                      <Button onClick={() => handleSendCommand("DISABLE_KIOSK")} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ปิด Kiosk</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">โหมดเสียง</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_RINGER_MODE", { mode: "NORMAL" })} disabled={sending}><Bell className="w-4 h-4 mr-2" />ปกติ</Button>
                      <Button onClick={() => handleSendCommand("SET_RINGER_MODE", { mode: "VIBRATE" })} disabled={sending}><Vibrate className="w-4 h-4 mr-2" />สั่น</Button>
                      <Button onClick={() => handleSendCommand("SET_RINGER_MODE", { mode: "SILENT" })} disabled={sending} variant="destructive"><VolumeX className="w-4 h-4 mr-2" />เงียบ</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">โหมดห้ามรบกวน (DND)</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_DND_MODE", { mode: "OFF" })} disabled={sending}>
                        <Bell className="w-4 h-4 mr-2" />ปิด
                      </Button>
                      <Button onClick={() => handleSendCommand("SET_DND_MODE", { mode: "ALARMS_ONLY" })} disabled={sending}>
                        <AlertCircle className="w-4 h-4 mr-2" />เฉพาะการปลุก
                      </Button>
                      <Button onClick={() => handleSendCommand("SET_DND_MODE", { mode: "PRIORITY_ONLY" })} disabled={sending}>
                        <Star className="w-4 h-4 mr-2" />เฉพาะรายการสำคัญ
                      </Button>
                      <Button onClick={() => handleSendCommand("SET_DND_MODE", { mode: "TOTAL_SILENCE" })} disabled={sending} variant="destructive">
                        <Moon className="w-4 h-4 mr-2" />ปิดเสียงทั้งหมด
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">ปิดเสียงเฉพาะประเภท</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_VOLUME_LEVEL", { type: "media", level: 0 })} disabled={sending}><Music className="w-4 h-4 mr-2" />ปิดเสียงมีเดีย</Button>
                      <Button onClick={() => handleSendCommand("SET_VOLUME_LEVEL", { type: "ring", level: 0 })} disabled={sending}><Phone className="w-4 h-4 mr-2" />ปิดเสียงเรียกเข้า</Button>
                      <Button onClick={() => handleSendCommand("SET_VOLUME_LEVEL", { type: "notification", level: 0 })} disabled={sending}><Bell className="w-4 h-4 mr-2" />ปิดเสียงแจ้งเตือน</Button>
                      <Button onClick={() => handleSendCommand("SET_VOLUME_LEVEL", { type: "alarm", level: 0 })} disabled={sending}><AlarmClock className="w-4 h-4 mr-2" />ปิดเสียงปลุก</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-base">ปลดล็อคด้วยลายนิ้วมือ</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_FINGERPRINT_UNLOCK_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_FINGERPRINT_UNLOCK_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Factory Reset</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_FACTORY_RESET_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_FACTORY_RESET_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Safe Mode</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_SAFE_MODE_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_SAFE_MODE_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Debugging</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_DEBUGGING_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_DEBUGGING_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">จับภาพหน้าจอ</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_SCREEN_CAPTURE_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_SCREEN_CAPTURE_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">จัดการบัญชี</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_MANAGING_ACCOUNTS_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_MANAGING_ACCOUNTS_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">เปลี่ยนวัน/เวลา</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_DATE_TIME_CHANGE_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_DATE_TIME_CHANGE_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">นโยบายอัปเดต OS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select value={systemUpdatePolicy} onValueChange={(v: any) => setSystemUpdatePolicy(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกนโยบาย" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">ค่าเริ่มต้นระบบ (Default)</SelectItem>
                          <SelectItem value="AUTOMATIC">อัปเดตอัตโนมัติ (Automatic)</SelectItem>
                          <SelectItem value="WINDOWED">อัปเดตในเวลาที่กำหนด (Windowed)</SelectItem>
                          <SelectItem value="POSTPONE">เลื่อนได้ 30 วัน (Postpone)</SelectItem>
                        </SelectContent>
                      </Select>
                      {systemUpdatePolicy === 'WINDOWED' && (
                        <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                          <p className="text-xs font-medium text-muted-foreground">กำหนดช่วงเวลา</p>
                          <div className="flex items-center justify-around gap-2">
                            <TimePicker date={updateWindow.start} setDate={(d) => setUpdateWindow(prev => ({ ...prev, start: d! }))} />
                            <TimePicker date={updateWindow.end} setDate={(d) => setUpdateWindow(prev => ({ ...prev, end: d! }))} />
                          </div>
                        </div>
                      )}
                      <Button onClick={handleSetSystemUpdatePolicy} disabled={sending} className="w-full">
                        <Settings className="w-4 h-4 mr-2" /> บันทึกนโยบายอัปเดต
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base text-destructive">ล้างข้อมูลเครื่อง (Wipe)</CardTitle></CardHeader>
                    <CardContent>
                      <Button onClick={() => handleSendCommand("WIPE_DEVICE")} disabled={sending} variant="destructive" className="w-full"><Trash2 className="w-4 h-4 mr-2" />ล้างข้อมูลทั้งหมด</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Network Tab */}
              <TabsContent value="network" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Bluetooth</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("BLUETOOTH_ON")} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />เปิด</Button>
                      <Button onClick={() => handleSendCommand("BLUETOOTH_OFF")} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ปิด</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Data Roaming</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_DATA_ROAMING_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_DATA_ROAMING_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">ปล่อย Hotspot</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_TETHERING_CONFIG_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_TETHERING_CONFIG_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">ตั้งค่า Wi-Fi</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_WIFI_CONFIG_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_WIFI_CONFIG_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Hardware Tab */}
              <TabsContent value="hardware" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-base">กล้อง</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("ENABLE_CAMERA")} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />เปิด</Button>
                      <Button onClick={() => handleSendCommand("DISABLE_CAMERA")} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ปิด</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">ไมโครโฟน</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_MICROPHONE_MUTED", { muted: false })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />เปิด</Button>
                      <Button onClick={() => handleSendCommand("SET_MICROPHONE_MUTED", { muted: true })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ปิด</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">SD Card</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_EXTERNAL_MEDIA_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_EXTERNAL_MEDIA_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">โอนไฟล์ผ่าน USB</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_USB_FILE_TRANSFER_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                      <Button onClick={() => handleSendCommand("SET_USB_FILE_TRANSFER_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">โหมดความสว่างหน้าจอ</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleSendCommand("SET_SCREEN_BRIGHTNESS_MODE", { mode: "AUTOMATIC" })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อัตโนมัติ</Button>
                      <Button onClick={() => handleSendCommand("SET_SCREEN_BRIGHTNESS_MODE", { mode: "MANUAL" })} disabled={sending}><XCircle className="w-4 h-4 mr-2" />กำหนดเอง</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Apps Tab */}
              <TabsContent value="apps" className="mt-6">
                <div className="space-y-6">
                  {/* App Policy Management */}
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <CardTitle>จัดการแอปพลิเคชัน (Policy)</CardTitle>
                          <CardDescription>เลือกแอปที่ต้องการบังคับติดตั้งหรือถอนการติดตั้งบนอุปกรณ์</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleOpenPlayStore} variant="outline"><Package className="w-4 h-4 mr-2" /> อนุมัติแอป</Button>
                          <Button onClick={handleDeployPolicy} disabled={sending}><Zap className="w-4 h-4 mr-2" /> ใช้ Policy</Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingApps ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                      ) : approvedApps.length > 0 ? (
                        <div className="space-y-3">
                          {approvedApps.map(app => (
                            <div key={app.productId} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <img src={app.iconUrl} alt={app.title} className="h-10 w-10 rounded-md" />
                                <div>
                                  <p className="font-medium">{app.title}</p>
                                  <p className="text-xs text-muted-foreground">{app.packageName}</p>
                                </div>
                              </div>
                              <Select
                                value={policyApps[app.packageName] || "AVAILABLE"}
                                onValueChange={(value: InstallType) => handlePolicyChange(app.packageName, value)}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="เลือกสถานะ" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AVAILABLE">ปล่อยตามเดิม</SelectItem>
                                  <SelectItem value="REQUIRED">บังคับติดตั้ง</SelectItem>
                                  <SelectItem value="UNAVAILABLE">ถอนการติดตั้ง</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          ยังไม่มีแอปที่อนุมัติ กด &quot;อนุมัติแอป&quot; เพื่อเริ่มต้น
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Direct Install/Uninstall */}
                  <h3 className="text-lg font-medium pt-4 border-t">คำสั่งติดตั้ง/ถอนการติดตั้งโดยตรง</h3>
                  <Card>
                    <CardHeader>
                      <CardTitle>ติดตั้ง/ถอนการติดตั้งแอปโดยตรง</CardTitle>
                      <CardDescription>ส่งคำสั่งติดตั้งหรือถอนการติดตั้งแอปไปยังอุปกรณ์ที่เลือกโดยตรง (สำหรับใช้ในอนาคต)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingApps ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                      ) : approvedApps.length > 0 ? (
                        <div className="space-y-3">
                          {approvedApps.map(app => (
                            <div key={app.productId} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <img src={app.iconUrl} alt={app.title} className="h-10 w-10 rounded-md" />
                                <div>
                                  <p className="font-medium">{app.title}</p>
                                  <p className="text-xs text-muted-foreground">{app.packageName}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleSendCommand("INSTALL_APP", { packageName: app.packageName })} disabled={sending}>
                                  <Package className="w-4 h-4 mr-2" /> ติดตั้ง
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleSendCommand("UNINSTALL_APP", { packageName: app.packageName })} disabled={sending}>
                                  <XCircle className="w-4 h-4 mr-2" /> ถอนการติดตั้ง
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          ยังไม่มีแอปที่อนุมัติ
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* General App Commands */}
                  <h3 className="text-lg font-medium pt-4 border-t">คำสั่งเกี่ยวกับแอปทั่วไป</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader><CardTitle className="text-base">ถอนการติดตั้งแอป</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2">
                        <Button onClick={() => handleSendCommand("SET_APP_UNINSTALL_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                        <Button onClick={() => handleSendCommand("SET_APP_UNINSTALL_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-base">ติดตั้งแอปจากภายนอก</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2">
                        <Button onClick={() => handleSendCommand("SET_INSTALL_UNKNOWN_SOURCES_ALLOWED", { allowed: true })} disabled={sending}><CheckCircle2 className="w-4 h-4 mr-2" />อนุญาต</Button>
                        <Button onClick={() => handleSendCommand("SET_INSTALL_UNKNOWN_SOURCES_ALLOWED", { allowed: false })} disabled={sending} variant="destructive"><XCircle className="w-4 h-4 mr-2" />ห้าม</Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
