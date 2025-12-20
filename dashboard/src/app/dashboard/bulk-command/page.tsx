"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Swal from "sweetalert2";
import { getSwalConfig, getToastConfig } from "@/lib/swal-config";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox"; 
import { Tablet, CheckCircle2, XCircle, Bell, Power, Lock, Zap, Square, Camera, Fingerprint, FileLock, Factory, ShieldCheck, Bug, ScreenShare, Key, LockIcon, EyeOff, Users, UserCog, Clock, Radio, MapPin, Globe, Shield, PhoneCall, WifiOff as WifiOffIcon, Network, RadioTower, MicOff, MemoryStick, Usb, AppWindow, Package, Scan, Wifi, Settings, Vibrate, VolumeX, Moon, Star, AlertCircle, Music, Phone, AlarmClock, Trash2, Wrench, Sun, CalendarIcon, MessageCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";

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
  const [policyStates, setPolicyStates] = useState<Record<string, any>>({});
  const [approvedApps, setApprovedApps] = useState<ApprovedApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [policyApps, setPolicyApps] = useState<Record<string, InstallType>>({});
  const [systemUpdatePolicy, setSystemUpdatePolicy] = useState<"AUTOMATIC" | "WINDOWED" | "POSTPONE" | "NONE">("NONE");
  const [updateWindow, setUpdateWindow] = useState<{ start: Date, end: Date }>({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 0, 0)),
  });
  
  const selectedDateTime = useMemo(() => {
    const timestamp = policyStates['security.SET_TIME.timestamp'];
    return timestamp ? new Date(timestamp) : new Date();
  }, [policyStates]);


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
  
  useEffect(() => {
    const fetchPolicyStates = async () => {
      try {
        const response = await api.get("/api/bulk-command/states");
        if (response.data.success) {
          setPolicyStates(response.data.data || {});
        }
      } catch (error) {
        console.error("Error fetching policy states:", error);
      }
    };
    fetchPolicyStates();
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

    // Optimistically update local state
    const updatedStates = { ...policyStates };
    if (params) {
      Object.keys(params).forEach(key => {
        const stateKey = `${activeTab}.${action}.${key}`;
        updatedStates[stateKey] = params[key];
      });
    } else {
      updatedStates[`${activeTab}.${action}`] = true; // For simple commands
    }
    setPolicyStates(updatedStates);

    setSending(true);
    try {
      const response = await api.post('/api/device/bulk/command', {
        deviceIds: selectedDeviceIds,
        action: action,
        params: params || {},
      });

      // Persist state to backend
      await api.post('/api/bulk-command/states', { states: updatedStates });

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
  }, [selectedDeviceIds, policyStates, activeTab]);

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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : devices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                    <div className="flex items-center gap-4">
                      <Tablet className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      <div className="flex-grow overflow-hidden">
                        <p className="text-sm font-semibold leading-tight truncate w-full text-left">{device.name || device.deviceCode}</p>
                        <p className="text-xs text-muted-foreground truncate w-full text-left">{device.deviceCode}</p>
                        <div className="flex items-center gap-1.5 text-xs mt-1">
                          <div className={cn("h-2 w-2 rounded-full", device.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400')} />
                          <span>{device.status}</span>
                        </div>
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
              <TabsContent value="actions" className="mt-6 animate-in fade-in-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button onClick={() => handleSendCommand("PLAY_SOUND")} disabled={sending} variant="outline" className="justify-start p-6 text-left h-auto transition-transform duration-200 hover:scale-105"><Bell className="w-5 h-5 mr-4" /><div><p className="font-semibold">ส่งเสียง</p><p className="text-xs text-muted-foreground">ส่งเสียงแจ้งเตือนและสั่น</p></div></Button>
                  <Button onClick={() => handleSendCommand("LOCK_DEVICE")} disabled={sending} variant="outline" className="justify-start p-6 text-left h-auto transition-transform duration-200 hover:scale-105"><Lock className="w-5 h-5 mr-4" /><div><p className="font-semibold">ล็อคเครื่อง</p><p className="text-xs text-muted-foreground">สั่งล็อคหน้าจอทันที</p></div></Button>
                  <Button onClick={() => handleSendCommand("RESTART_DEVICE")} disabled={sending} variant="outline" className="justify-start p-6 text-left h-auto transition-transform duration-200 hover:scale-105"><Power className="w-5 h-5 mr-4" /><div><p className="font-semibold">รีสตาร์ท</p><p className="text-xs text-muted-foreground">สั่งรีสตาร์ทเครื่อง</p></div></Button>
                  <Button onClick={() => handleSendCommand("SEND_DATA_NOW")} disabled={sending} variant="outline" className="justify-start p-6 text-left h-auto transition-transform duration-200 hover:scale-105"><Zap className="w-5 h-5 mr-4" /><div><p className="font-semibold">Sync Data</p><p className="text-xs text-muted-foreground">บังคับให้อุปกรณ์ส่งข้อมูลล่าสุด</p></div></Button>
                  <Button onClick={() => handleSendCommand("WIPE_DEVICE")} disabled={sending} variant="destructive" className="justify-start p-6 text-left h-auto transition-transform duration-200 hover:scale-105"><Trash2 className="w-5 h-5 mr-4" /><div><p className="font-semibold">ล้างข้อมูลเครื่อง</p><p className="text-xs">ล้างข้อมูลทั้งหมด (Factory Reset)</p></div></Button>
                </div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="mt-6 animate-in fade-in-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3"><Square className="w-4 h-4 text-muted-foreground" /><Label htmlFor="kiosk-toggle">Kiosk Mode</Label></div>
                    <Switch id="kiosk-toggle" checked={policyStates['security.kiosk'] ?? false} onCheckedChange={(checked) => handleSendCommand(checked ? "ENABLE_KIOSK" : "DISABLE_KIOSK")} disabled={sending} />
                  </div>
                  {[
                    { id: 'factory-reset', label: 'อนุญาต Factory Reset', command: 'SET_FACTORY_RESET_ALLOWED', stateKey: 'security.SET_FACTORY_RESET_ALLOWED.allowed', icon: Factory },
                    { id: 'safe-mode', label: 'อนุญาต Safe Mode', command: 'SET_SAFE_MODE_ALLOWED', stateKey: 'security.SET_SAFE_MODE_ALLOWED.allowed', icon: ShieldCheck },
                    { id: 'debugging', label: 'อนุญาต Debugging', command: 'SET_DEBUGGING_ALLOWED', stateKey: 'security.SET_DEBUGGING_ALLOWED.allowed', icon: Bug },
                    { id: 'screen-capture', label: 'อนุญาตจับภาพหน้าจอ', command: 'SET_SCREEN_CAPTURE_ALLOWED', stateKey: 'security.SET_SCREEN_CAPTURE_ALLOWED.allowed', icon: ScreenShare },
                    { id: 'fingerprint-unlock', label: 'อนุญาตปลดล็อกด้วยลายนิ้วมือ', command: 'SET_FINGERPRINT_UNLOCK_ALLOWED', stateKey: 'security.SET_FINGERPRINT_UNLOCK_ALLOWED.allowed', icon: Fingerprint },
                    { id: 'encryption', label: 'บังคับเข้ารหัสข้อมูล', command: 'SET_ENCRYPTION_ENABLED', stateKey: 'security.SET_ENCRYPTION_ENABLED.enabled', icon: FileLock, type: 'enabled' },
                    { id: 'config-credentials', label: 'อนุญาตจัดการ Credentials', command: 'SET_CONFIG_CREDENTIALS_ALLOWED', stateKey: 'security.SET_CONFIG_CREDENTIALS_ALLOWED.allowed', icon: Key },
                    { id: 'smart-lock', label: 'อนุญาต Smart Lock', command: 'SET_SMART_LOCK_ALLOWED', stateKey: 'security.SET_SMART_LOCK_ALLOWED.allowed', icon: LockIcon },
                    { id: 'hide-sensitive-lockscreen', label: 'ซ่อนข้อมูลบน Lock Screen', command: 'SET_HIDE_SENSITIVE_INFO_ON_LOCK_SCREEN', stateKey: 'security.SET_HIDE_SENSITIVE_INFO_ON_LOCK_SCREEN.hide', icon: EyeOff, type: 'hide' },
                    { id: 'manage-accounts', label: 'อนุญาตจัดการบัญชี', command: 'SET_MANAGING_ACCOUNTS_ALLOWED', stateKey: 'security.SET_MANAGING_ACCOUNTS_ALLOWED.allowed', icon: Users },
                    { id: 'date-time-change', label: 'อนุญาตเปลี่ยนวัน/เวลา', command: 'SET_DATE_TIME_CHANGE_ALLOWED', stateKey: 'security.SET_DATE_TIME_CHANGE_ALLOWED.allowed', icon: Clock },
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3"><item.icon className="w-4 h-4 text-muted-foreground" /><Label htmlFor={`${item.id}-toggle`}>{item.label}</Label></div>
                      <Switch id={`${item.id}-toggle`} checked={policyStates[item.stateKey] ?? false} onCheckedChange={(checked) => handleSendCommand(item.command, { [item.type || 'allowed']: checked })} disabled={sending} />
                    </div>
                  ))}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">นโยบายอัปเดต OS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select value={policyStates['security.SET_SYSTEM_UPDATE_POLICY.policy'] || 'NONE'} onValueChange={(v: any) => setPolicyStates(prev => ({...prev, 'security.SET_SYSTEM_UPDATE_POLICY.policy': v}))}>
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
                      {policyStates['security.SET_SYSTEM_UPDATE_POLICY.policy'] === 'WINDOWED' && (
                        <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                          <p className="text-xs font-medium text-muted-foreground">กำหนดช่วงเวลา</p>
                          <div className="flex items-center justify-around gap-2">
                            <TimePicker date={updateWindow.start} setDate={(d) => setUpdateWindow(prev => ({ ...prev, start: d! }))} />
                            <TimePicker date={updateWindow.end} setDate={(d) => setUpdateWindow(prev => ({ ...prev, end: d! }))} />
                          </div>
                        </div>
                      )}
                      <Button onClick={() => {
                        const policy = policyStates['security.SET_SYSTEM_UPDATE_POLICY.policy'] || 'NONE';
                        let params: any = { policy };
                        if (policy === 'WINDOWED') {
                          params.start = updateWindow.start.getHours() * 60 + updateWindow.start.getMinutes();
                          params.end = updateWindow.end.getHours() * 60 + updateWindow.end.getMinutes();
                        }
                        handleSendCommand("SET_SYSTEM_UPDATE_POLICY", params);
                      }} disabled={sending} className="w-full">
                        <Settings className="w-4 h-4 mr-2" /> บันทึกนโยบายอัปเดต
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">ตั้งค่าวัน-เวลา และโซน</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       {/* Date & Time */}
                       <div className="space-y-2">
                        <Label>ตั้งค่าวันและเวลา</Label>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("justify-start text-left font-normal w-full", !selectedDateTime && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDateTime ? format(selectedDateTime, "PPP HH:mm", { locale: th }) : <span>เลือกวันที่</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={selectedDateTime} onSelect={(d) => d && setPolicyStates(prev => ({...prev, 'security.SET_TIME.timestamp': d.getTime()}))} initialFocus />
                              <div className="p-3 border-t border-border"><TimePicker setDate={(d) => d && setPolicyStates(prev => ({...prev, 'security.SET_TIME.timestamp': d.getTime()}))} date={selectedDateTime} /></div>
                            </PopoverContent>
                          </Popover>
                          <Button size="icon" variant="outline" onClick={() => handleSendCommand("SET_TIME", { timestamp: selectedDateTime.getTime() })} disabled={sending}><Zap className="w-4 h-4" /></Button>
                        </div>
                        <Button onClick={() => setPolicyStates(prev => ({...prev, 'security.SET_TIME.timestamp': new Date().getTime()}))} disabled={sending} variant="outline" className="w-full"><Clock className="w-4 h-4 mr-2" />ซิงค์เวลากับเซิร์ฟเวอร์</Button>
                      </div>
                      {/* Timezone */}
                      <div className="space-y-2">
                        <Label>ตั้งค่าโซนเวลา (Timezone)</Label>
                        <div className="flex items-center gap-2">
                          <Select value={policyStates['security.SET_TIMEZONE.timezone'] || 'Asia/Bangkok'} onValueChange={(v) => setPolicyStates(prev => ({...prev, 'security.SET_TIMEZONE.timezone': v}))}>
                            <SelectTrigger disabled={sending}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectGroup><SelectLabel>Asia</SelectLabel><SelectItem value="Asia/Bangkok">Asia/Bangkok (UTC+07:00)</SelectItem><SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+09:00)</SelectItem></SelectGroup>
                              <SelectGroup><SelectLabel>America</SelectLabel><SelectItem value="America/New_York">America/New_York (ET)</SelectItem><SelectItem value="America/Los_Angeles">America/Los_Angeles (PT)</SelectItem></SelectGroup>
                              <SelectGroup><SelectLabel>Europe</SelectLabel><SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem><SelectItem value="Europe/Paris">Europe/Paris (CET/CEST)</SelectItem></SelectGroup>
                              <SelectGroup><SelectLabel>Other</SelectLabel><SelectItem value="UTC">Coordinated Universal Time (UTC)</SelectItem></SelectGroup>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="outline" onClick={() => handleSendCommand("SET_TIMEZONE", { timezone: policyStates['security.SET_TIMEZONE.timezone'] || 'Asia/Bangkok' })} disabled={sending}><Zap className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Network Tab */}
              <TabsContent value="network" className="mt-6 animate-in fade-in-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3"><Radio className="w-4 h-4 text-muted-foreground" /><Label htmlFor="bluetooth-toggle">เปิด Bluetooth</Label></div>
                    <Switch id="bluetooth-toggle" checked={policyStates['network.bluetooth'] ?? false} onCheckedChange={(checked) => handleSendCommand(checked ? "BLUETOOTH_ON" : "BLUETOOTH_OFF")} disabled={sending} />
                  </div>
                  {[
                    { id: 'data-roaming', label: 'อนุญาต Data Roaming', command: 'SET_DATA_ROAMING_ALLOWED', stateKey: 'network.SET_DATA_ROAMING_ALLOWED.allowed', icon: Globe },
                    { id: 'tethering', label: 'อนุญาตปล่อย Hotspot', command: 'SET_TETHERING_CONFIG_ALLOWED', stateKey: 'network.SET_TETHERING_CONFIG_ALLOWED.allowed', icon: Network },
                    { id: 'wifi-config', label: 'อนุญาตตั้งค่า Wi-Fi', command: 'SET_WIFI_CONFIG_ALLOWED', stateKey: 'network.SET_WIFI_CONFIG_ALLOWED.allowed', icon: Wifi },
                    { id: 'vpn-config', label: 'อนุญาตตั้งค่า VPN', command: 'SET_VPN_CONFIG_ALLOWED', stateKey: 'network.SET_VPN_CONFIG_ALLOWED.allowed', icon: Shield },
                    { id: 'outgoing-calls', label: 'อนุญาตโทรออก', command: 'SET_OUTGOING_CALLS_ALLOWED', stateKey: 'network.SET_OUTGOING_CALLS_ALLOWED.allowed', icon: PhoneCall },
                    { id: 'network-reset', label: 'อนุญาตรีเซ็ตเครือข่าย', command: 'SET_NETWORK_RESET_ALLOWED', stateKey: 'network.SET_NETWORK_RESET_ALLOWED.allowed', icon: WifiOffIcon },
                    { id: 'sms', label: 'อนุญาต SMS', command: 'SET_SMS_ALLOWED', stateKey: 'network.SET_SMS_ALLOWED.allowed', icon: MessageCircle },
                    { id: 'cell-broadcast', label: 'อนุญาตตั้งค่า Cell Broadcast', command: 'SET_CELL_BROADCASTS_CONFIG_ALLOWED', stateKey: 'network.SET_CELL_BROADCASTS_CONFIG_ALLOWED.allowed', icon: RadioTower },
                    { id: 'bluetooth-policy', label: 'อนุญาตตั้งค่า Bluetooth', command: 'SET_BLUETOOTH_POLICY_ALLOWED', stateKey: 'network.SET_BLUETOOTH_POLICY_ALLOWED.allowed', icon: Radio },
                    { id: 'location-services', label: 'อนุญาต Location Services', command: 'SET_LOCATION_SERVICES_ALLOWED', stateKey: 'network.SET_LOCATION_SERVICES_ALLOWED.allowed', icon: MapPin },
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3"><item.icon className="w-4 h-4 text-muted-foreground" /><Label htmlFor={`${item.id}-toggle`}>{item.label}</Label></div>
                      <Switch id={`${item.id}-toggle`} checked={policyStates[item.stateKey] ?? false} onCheckedChange={(checked) => handleSendCommand(item.command, { allowed: checked })} disabled={sending} />
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Hardware Tab */}
              <TabsContent value="hardware" className="mt-6 animate-in fade-in-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3"><Camera className="w-4 h-4 text-muted-foreground" /><Label htmlFor="camera-toggle">ปิดใช้งานกล้อง</Label></div>
                    <Switch id="camera-toggle" checked={policyStates['hardware.camera.disabled'] ?? false} onCheckedChange={(checked) => handleSendCommand(checked ? "DISABLE_CAMERA" : "ENABLE_CAMERA")} disabled={sending} />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3"><MicOff className="w-4 h-4 text-muted-foreground" /><Label htmlFor="mic-mute-toggle">ปิดไมโครโฟน</Label></div>
                    <Switch id="mic-mute-toggle" checked={policyStates['hardware.SET_MICROPHONE_MUTED.muted'] ?? false} onCheckedChange={(checked) => handleSendCommand("SET_MICROPHONE_MUTED", { muted: checked })} disabled={sending} />
                  </div>
                  {[
                    { id: 'sd-card', label: 'อนุญาตใช้ SD Card', command: 'SET_EXTERNAL_MEDIA_ALLOWED', icon: MemoryStick },
                    { id: 'usb-transfer', label: 'อนุญาตโอนไฟล์ผ่าน USB', command: 'SET_USB_FILE_TRANSFER_ALLOWED', icon: Usb },
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3"><item.icon className="w-4 h-4 text-muted-foreground" /><Label htmlFor={`${item.id}-toggle`}>{item.label}</Label></div>
                      <Switch id={`${item.id}-toggle`} checked={policyStates[`hardware.${item.command}.allowed`] ?? false} onCheckedChange={(checked) => handleSendCommand(item.command, { allowed: checked })} disabled={sending} />
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3"><Sun className="w-4 h-4 text-muted-foreground" /><Label htmlFor="brightness-mode-toggle">ปรับความสว่างอัตโนมัติ</Label></div>
                    <Switch id="brightness-mode-toggle" checked={policyStates['hardware.SET_SCREEN_BRIGHTNESS_MODE.mode'] === 'AUTOMATIC'} onCheckedChange={(checked) => handleSendCommand("SET_SCREEN_BRIGHTNESS_MODE", { mode: checked ? 'AUTOMATIC' : 'MANUAL' })} disabled={sending} />
                  </div>
                </div>
              </TabsContent>

              {/* Apps Tab */}
              <TabsContent value="apps" className="mt-6 animate-in fade-in-0">
                <div className="space-y-6">
                  {/* App Policy Management */}
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <CardTitle>จัดการแอปพลิเคชัน (Policy)</CardTitle>
                          <CardDescription>เลือกแอปที่ต้องการบังคับติดตั้งหรือถอนการติดตั้งบนอุปกรณ์</CardDescription>
                        </div>
                        <div className="flex gap-2 flex-wrap">
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
                            <div key={app.productId} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-3 border rounded-lg">
                              <div className="flex items-center gap-3 flex-grow">
                                <img src={app.iconUrl} alt={app.title} className="h-10 w-10 rounded-md" />
                                <div className="overflow-hidden">
                                  <p className="font-medium">{app.title}</p>
                                  <p className="text-xs text-muted-foreground">{app.packageName}</p>
                                </div>
                              </div>
                              <div className="flex-shrink-0 w-full md:w-auto">
                                <Select
                                  value={policyApps[app.packageName] || "AVAILABLE"}
                                  onValueChange={(value: InstallType) => handlePolicyChange(app.packageName, value)}
                                >
                                  <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="เลือกสถานะ" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AVAILABLE">ปล่อยตามเดิม</SelectItem>
                                    <SelectItem value="REQUIRED">บังคับติดตั้ง</SelectItem>
                                    <SelectItem value="UNAVAILABLE">ถอนการติดตั้ง</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
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
                            <div key={app.productId} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border rounded-lg">
                              <div className="flex items-center gap-3 flex-grow">
                                <img src={app.iconUrl} alt={app.title} className="h-10 w-10 rounded-md" />
                                <div className="overflow-hidden">
                                  <p className="font-medium">{app.title}</p>
                                  <p className="text-xs text-muted-foreground">{app.packageName}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
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
                  <div className="space-y-4">
                    {[
                      { id: 'app-uninstall', label: 'อนุญาตถอนการติดตั้งแอป', command: 'SET_APP_UNINSTALL_ALLOWED', stateKey: 'apps.SET_APP_UNINSTALL_ALLOWED.allowed', icon: AppWindow },
                      { id: 'unknown-sources', label: 'อนุญาตติดตั้งแอปที่ไม่รู้จัก', command: 'SET_INSTALL_UNKNOWN_SOURCES_ALLOWED', stateKey: 'apps.SET_INSTALL_UNKNOWN_SOURCES_ALLOWED.allowed', icon: Package },
                      { id: 'manage-apps', label: 'อนุญาตจัดการแอป', command: 'SET_MANAGING_APPS_ALLOWED', stateKey: 'apps.SET_MANAGING_APPS_ALLOWED.allowed', icon: Settings },
                      { id: 'google-scan', label: 'บังคับสแกนแอปด้วย Google', command: 'SET_GOOGLE_SECURITY_SCANS_ALLOWED', stateKey: 'apps.SET_GOOGLE_SECURITY_SCANS_ALLOWED.allowed', icon: Scan },
                      { id: 'account-picture', label: 'อนุญาตเปลี่ยนรูปโปรไฟล์', command: 'SET_CHANGE_ACCOUNT_PICTURE_ALLOWED', stateKey: 'apps.SET_CHANGE_ACCOUNT_PICTURE_ALLOWED.allowed', icon: UserCog },
                    ].map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3"><item.icon className="w-4 h-4 text-muted-foreground" /><Label htmlFor={`${item.id}-toggle`}>{item.label}</Label></div>
                        <Switch id={`${item.id}-toggle`} checked={policyStates[item.stateKey] ?? false} onCheckedChange={(checked) => handleSendCommand(item.command, { allowed: checked })} disabled={sending} />
                      </div>
                    ))}
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
