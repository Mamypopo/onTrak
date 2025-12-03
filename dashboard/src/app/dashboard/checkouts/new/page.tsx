"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DeviceMultiSelect, CheckoutDevice } from "@/components/checkouts/device-multi-select";
import Swal from "sweetalert2";
import { getToastConfig } from "@/lib/swal-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreateCheckoutForm {
  company: string;
  borrowerId: string;
  charger: number | null;
  startTime: string;
  endTime: string;
  usageNotes: string;
}

interface CheckoutUser {
  id: string;
  username: string;
  fullName: string | null;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
}

export default function CreateCheckoutPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<CheckoutDevice[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [users, setUsers] = useState<CheckoutUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateCheckoutForm>({
    company: "",
    borrowerId: "",
    charger: null,
    startTime: "",
    endTime: "",
    usageNotes: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAvailableDevices();
    fetchUsers();
  }, [router]);

  const fetchAvailableDevices = async () => {
    try {
      setLoadingDevices(true);
      const response = await api.get("/api/device");
      if (response.data.success) {
        const all: CheckoutDevice[] = response.data.data.map((d: any) => ({
          id: d.id,
          deviceCode: d.deviceCode,
          name: d.name,
          model: d.model,
          battery: d.battery,
          status: d.status,
          borrowStatus: d.borrowStatus,
        }));

        // แสดงเฉพาะเครื่องที่ว่าง (หรือไม่มี borrowStatus = ถือว่าว่าง)
        const available = all.filter(
          (d) => (d.borrowStatus || "AVAILABLE") === "AVAILABLE"
        );

        setDevices(available);
      }
    } catch (error) {
      console.error("Error fetching devices for checkout:", error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get("/api/user");
      if (res.data?.success) {
        const all: CheckoutUser[] = res.data.data;
        const active = all.filter((u) => u.isActive);
        setUsers(active);
      }
    } catch (error) {
      console.error("Error fetching users for borrower dropdown:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateCheckoutForm,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "charger" ? (value ? Number(value) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      await Swal.fire(
        getToastConfig({
          icon: "warning",
          title: "กรุณาเลือกอุปกรณ์อย่างน้อย 1 เครื่อง",
        })
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        company: form.company || null,
        borrowerId: form.borrowerId || null,
        charger: form.charger,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        usageNotes: form.usageNotes || null,
        deviceIds: selectedIds,
      };

      const response = await api.post("/api/checkouts", payload);

      if (response.data?.success && response.data?.data?.id) {
        await Swal.fire(
          getToastConfig({
            icon: "success",
            title: "สร้างการเบิกสำเร็จ",
          })
        );
        router.push(`/dashboard/checkouts/${response.data.data.id}`);
      } else {
        throw new Error("Invalid response");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      await Swal.fire(
        getToastConfig({
          icon: "error",
          title: "สร้างการเบิกไม่สำเร็จ",
          text:
            error?.response?.data?.error ||
            error?.message ||
            "โปรดลองอีกครั้ง",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">สร้างการเบิกอุปกรณ์</h1>
            <p className="text-muted-foreground mt-1">
              เลือกอุปกรณ์และกรอกรายละเอียดการเบิก
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                กลับไป Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form + Device selector layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: form */}
            <div className="space-y-4 lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>ข้อมูลการเบิก</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">บริษัท / หน่วยงาน</Label>
                    <Input
                      id="company"
                      placeholder="เช่น ฝ่ายคลังสินค้า, แผนกขาย"
                      value={form.company}
                      onChange={(e) =>
                        handleInputChange("company", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borrower">ผู้เบิก (optional)</Label>
                    {loadingUsers ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select
                        value={form.borrowerId || undefined}
                        onValueChange={(value) =>
                          handleInputChange("borrowerId", value)
                        }
                      >
                        <SelectTrigger id="borrower">
                          <SelectValue placeholder="เลือกผู้เบิก (เว้นว่างได้)" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.fullName || user.username}{" "}
                              {user.role === "ADMIN" ? "(Admin)" : "(Staff)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="charger">จำนวนที่ชาร์จ (optional)</Label>
                    <Input
                      id="charger"
                      type="number"
                      min={0}
                      value={form.charger ?? ""}
                      onChange={(e) =>
                        handleInputChange("charger", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">วันที่และเวลาเริ่มใช้งาน (optional)</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) =>
                        handleInputChange("startTime", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">วันที่และเวลาสิ้นสุด (optional)</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={form.endTime}
                      onChange={(e) =>
                        handleInputChange("endTime", e.target.value)
                      }
                    />
                  </div>

                  
                  <div className="space-y-2">
                    <Label htmlFor="usageNotes">หมายเหตุการใช้งาน (optional)</Label>
                    <Textarea
                      id="usageNotes"
                      placeholder="เช่น ใช้ในงาน event, ใช้หน้างานลูกค้า ฯลฯ"
                      value={form.usageNotes}
                      onChange={(e) =>
                        handleInputChange("usageNotes", e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: device selector (summary + modal) */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>อุปกรณ์ที่เลือก</CardTitle>
                  <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={loadingDevices}>
                        เลือกอุปกรณ์
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl w-[95vw] sm:w-[90vw]">
                      <DialogHeader>
                        <DialogTitle>เลือกอุปกรณ์ที่จะเบิก</DialogTitle>
                      </DialogHeader>
                      {loadingDevices ? (
                        <div className="space-y-3">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : (
                        <DeviceMultiSelect
                          devices={devices}
                          selectedIds={selectedIds}
                          onChange={setSelectedIds}
                        />
                      )}
                      <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-sm text-muted-foreground">
                          เลือกแล้ว {selectedIds.length} / {devices.length} เครื่อง
                        </div>
                        <div className="flex gap-2 sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeviceDialogOpen(false)}
                          >
                            ปิด
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setDeviceDialogOpen(false)}
                            disabled={selectedIds.length === 0}
                          >
                            ยืนยันการเลือก
                          </Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {selectedIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      ยังไม่ได้เลือกอุปกรณ์ คลิกปุ่ม &quot;เลือกอุปกรณ์&quot; เพื่อเริ่มเลือก
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        เลือกแล้ว {selectedIds.length} เครื่อง:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {devices
                          .filter((d) => selectedIds.includes(d.id))
                          .map((device) => (
                            <div
                              key={device.id}
                              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                            >
                              <div className="space-y-0.5">
                                <div className="font-mono text-xs truncate">
                                  {device.deviceCode}
                                </div>
                                <div className="text-xs truncate">
                                  {device.name || "-"}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() =>
                                  setSelectedIds((prev) =>
                                    prev.filter((id) => id !== device.id)
                                  )
                                }
                              >
                                ลบ
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "กำลังสร้างการเบิก..." : "ยืนยันการเบิก"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}


