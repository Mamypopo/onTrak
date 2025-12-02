"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import Swal from "sweetalert2";
import { getSwalConfig } from "@/lib/swal-config";

interface AddTabletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceAdded: () => void;
}

export function AddTabletDialog({
  open,
  onOpenChange,
  onDeviceAdded,
}: AddTabletDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deviceCode: "",
    name: "",
    serialNumber: "",
    model: "",
    osVersion: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.deviceCode.trim()) {
      Swal.fire(getSwalConfig({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "กรุณากรอก Device Code",
      }));
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/api/device", formData);

      if (response.data.success) {
        Swal.fire(getSwalConfig({
          icon: "success",
          title: "สำเร็จ",
          text: "เพิ่ม Tablet สำเร็จแล้ว",
          timer: 2000,
          showConfirmButton: false,
        }));

        // Reset form
        setFormData({
          deviceCode: "",
          name: "",
          serialNumber: "",
          model: "",
          osVersion: "",
        });

        onDeviceAdded();
      }
    } catch (error: any) {
      console.error("Error creating device:", error);
      Swal.fire(getSwalConfig({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.response?.data?.error || "ไม่สามารถเพิ่ม Tablet ได้",
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>เพิ่ม Tablet ใหม่</DialogTitle>
          <DialogDescription>
            กรอกข้อมูลเพื่อเพิ่ม Tablet ใหม่เข้าสู่ระบบ
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deviceCode">
                Device Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deviceCode"
                placeholder="เช่น TABLET-001"
                value={formData.deviceCode}
                onChange={(e) => handleChange("deviceCode", e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ Tablet</Label>
              <Input
                id="name"
                placeholder="เช่น Tablet สำนักงาน"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                placeholder="เช่น SN123456789"
                value={formData.serialNumber}
                onChange={(e) => handleChange("serialNumber", e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">รุ่น</Label>
              <Input
                id="model"
                placeholder="เช่น Samsung Galaxy Tab A8"
                value={formData.model}
                onChange={(e) => handleChange("model", e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="osVersion">OS Version</Label>
              <Input
                id="osVersion"
                placeholder="เช่น Android 13"
                value={formData.osVersion}
                onChange={(e) => handleChange("osVersion", e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังเพิ่ม..." : "เพิ่ม Tablet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

