"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Package,
  Calendar,
  User,
  Building2,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Tablet,
  Battery,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";
import { getSwalConfig, getToastConfig } from "@/lib/swal-config";
import { Tooltip } from "@/components/ui/tippy";

interface CheckoutItem {
  id: string;
  deviceId: string;
  device: {
    id: string;
    deviceCode: string;
    name: string | null;
    model: string | null;
  };
  returnedAt: string | null;
  returnedBy: string | null;
  returner: {
    id: string;
    username: string;
    fullName: string | null;
  } | null;
  problem: string | null;
  solution: string | null;
  maintenanceStatus: "NONE" | "HAS_PROBLEM" | "NEEDS_REPAIR" | "IN_MAINTENANCE" | "DAMAGED" | null;
  returnNotes: string | null;
}

interface CheckoutEvent {
  id: string;
  eventType: string;
  userId: string | null;
  user: {
    id: string;
    username: string;
    fullName: string | null;
  } | null;
  notes: string | null;
  createdAt: string;
}

interface Checkout {
  id: string;
  checkoutNumber: string;
  company: string | null;
  borrowerId: string | null;
  borrower: {
    id: string;
    username: string;
    fullName: string | null;
  } | null;
  creator: {
    id: string;
    username: string;
    fullName: string | null;
  };
  charger: number | null;
  startTime: string;
  endTime: string | null;
  usageNotes: string | null;
  status: "ACTIVE" | "PARTIAL_RETURN" | "RETURNED" | "CANCELLED";
  items: CheckoutItem[];
  events: CheckoutEvent[];
  createdAt: string;
  updatedAt: string;
}

export default function CheckoutDetailPage() {
  const router = useRouter();
  const params = useParams();
  const checkoutId = params.id as string;

  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [returning, setReturning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  // Store collapsed state for each tablet (itemId -> boolean)
  // Default to true (collapsed) for all items
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});
  // Store per-item problem reporting (itemId -> { hasProblem, problem, solution, maintenanceStatus })
  const [itemProblems, setItemProblems] = useState<Record<string, {
    hasProblem: boolean;
    problem: string;
    solution: string;
    maintenanceStatus: "NONE" | "HAS_PROBLEM" | "NEEDS_REPAIR" | "IN_MAINTENANCE" | "DAMAGED";
  }>>({});
  
  // Filter and sort for returned items
  const [returnedFilter, setReturnedFilter] = useState<"ALL" | "WITH_PROBLEM" | "NO_PROBLEM">("ALL");
  const [returnedSort, setReturnedSort] = useState<"DATE_DESC" | "DATE_ASC" | "NAME_ASC" | "NAME_DESC">("DATE_DESC");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutId, router]);

  const fetchCheckout = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/checkouts/${checkoutId}`);
      if (response.data.success) {
        setCheckout(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching checkout:", error);
      if (error.response?.status === 404) {
        await Swal.fire(
          getSwalConfig({
            icon: "error",
            title: "ไม่พบข้อมูล",
            text: "ไม่พบการเบิกอุปกรณ์นี้",
          })
        );
        router.push("/dashboard/checkouts");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReturnDevices = async () => {
    if (selectedItems.length === 0) {
      await Swal.fire(
        getToastConfig({
          icon: "warning",
          title: "กรุณาเลือกอุปกรณ์ที่ต้องการคืน",
        })
      );
      return;
    }

    // Confirmation dialog
    const activeItems = checkout?.items.filter((item) => !item.returnedAt) || [];
    const selectedDeviceNames = activeItems
      .filter((item) => selectedItems.includes(item.id))
      .map((item) => item.device.deviceCode)
      .join(", ");

    const hasProblems = Object.values(itemProblems).some((p) => p.hasProblem);
    const problemCount = Object.values(itemProblems).filter((p) => p.hasProblem).length;

    const confirmResult = await Swal.fire(
      getSwalConfig({
        title: "ยืนยันการคืนอุปกรณ์",
        html: `
          <div class="text-left space-y-2">
            <p><strong>จำนวนอุปกรณ์:</strong> ${selectedItems.length} เครื่อง</p>
            <p><strong>อุปกรณ์:</strong> ${selectedDeviceNames}</p>
            ${hasProblems ? `<p class="text-amber-600"><strong>⚠️ มีการรายงานปัญหา:</strong> ${problemCount} เครื่อง</p>` : ""}
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ยืนยันการคืน",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#6b7280",
      })
    );

    if (!confirmResult.isConfirmed) {
      return;
    }

    try {
      setReturning(true);
      
      // Prepare items array with per-item data
      const items = selectedItems.map((itemId) => {
        const problemData = itemProblems[itemId];
        if (problemData?.hasProblem) {
          return {
            itemId,
            problem: problemData.problem || null,
            solution: problemData.solution || null,
            maintenanceStatus: problemData.maintenanceStatus || 'HAS_PROBLEM', // Default to HAS_PROBLEM if has problem
            returnNotes: null,
          };
        } else {
          return {
            itemId,
            problem: null,
            solution: null,
            maintenanceStatus: 'NONE',
            returnNotes: null,
          };
        }
      });

      const response = await api.post(`/api/checkouts/${checkoutId}/return`, {
        items,
        returnNotes: returnNotes || null, // Global return notes
      });

      if (response.data.success) {
        await Swal.fire(
          getToastConfig({
            icon: "success",
            title: "คืนอุปกรณ์สำเร็จ",
          })
        );
        setReturnDialogOpen(false);
        setSelectedItems([]);
        setReturnNotes("");
        setItemProblems({});
        fetchCheckout();
      }
    } catch (error: any) {
      console.error("Error returning devices:", error);
      await Swal.fire(
        getSwalConfig({
          icon: "error",
          title: "คืนอุปกรณ์ไม่สำเร็จ",
          text: error?.response?.data?.error || "โปรดลองอีกครั้ง",
        })
      );
    } finally {
      setReturning(false);
    }
  };

  const handleCancelCheckout = async () => {
    if (!checkout) return;

    const activeItems = checkout.items.filter((item) => !item.returnedAt);
    
    const result = await Swal.fire({
      title: "ยืนยันการยกเลิกการเบิก",
      html: `
        <div class="text-left space-y-2">
          <p><strong>เลขที่การเบิก:</strong> ${checkout.checkoutNumber}</p>
          <p><strong>จำนวนอุปกรณ์ที่ยังไม่ได้คืน:</strong> ${activeItems.length} เครื่อง</p>
          <p class="text-sm text-muted-foreground mt-3">การยกเลิกจะทำให้อุปกรณ์ทั้งหมดกลับมาเป็นสถานะ "ว่าง" ทันที</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยืนยันยกเลิก",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      input: "textarea",
      inputPlaceholder: "เหตุผลในการยกเลิก (ไม่บังคับ)",
      inputAttributes: {
        "aria-label": "เหตุผลในการยกเลิก"
      },
      showLoaderOnConfirm: true,
      preConfirm: async (reason) => {
        try {
          setCancelling(true);
          const response = await api.post(`/api/checkouts/${checkoutId}/cancel`, {
            reason: reason || null,
          });
          return response.data;
        } catch (error: any) {
          Swal.showValidationMessage(
            error?.response?.data?.error || "เกิดข้อผิดพลาดในการยกเลิก"
          );
          throw error;
        } finally {
          setCancelling(false);
        }
      },
    });

    if (result.isConfirmed) {
      await Swal.fire(
        getToastConfig({
          icon: "success",
          title: "ยกเลิกการเบิกสำเร็จ",
        })
      );
      // Redirect to checkout list immediately (don't fetch again since checkout is now deleted)
      router.push("/dashboard/checkouts");
    }
  };

  const toggleItemProblem = (itemId: string) => {
    setItemProblems((prev) => {
      const current = prev[itemId];
      const newHasProblem = !current?.hasProblem;
      // Auto expand when enabling problem reporting
      if (newHasProblem) {
        setCollapsedItems((prevCollapsed) => ({
          ...prevCollapsed,
          [itemId]: false, // Expand
        }));
      }
      // Clear values when disabling problem reporting
      if (!newHasProblem) {
        return {
          ...prev,
          [itemId]: {
            hasProblem: false,
            problem: "",
            solution: "",
            maintenanceStatus: "NONE",
          },
        };
      }
      return {
        ...prev,
        [itemId]: {
          hasProblem: newHasProblem,
          problem: current?.problem || "",
          solution: current?.solution || "",
          maintenanceStatus: current?.maintenanceStatus || "HAS_PROBLEM",
        },
      };
    });
  };

  const updateItemProblem = (itemId: string, field: string, value: any) => {
    setItemProblems((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {
          hasProblem: true,
          problem: "",
          solution: "",
          maintenanceStatus: "HAS_PROBLEM",
        }),
        [field]: value,
      },
    }));
  };

  const getItemProblem = (itemId: string) => {
    return itemProblems[itemId] || {
      hasProblem: false,
      problem: "",
      solution: "",
      maintenanceStatus: "NONE" as const,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
            กำลังใช้งาน
          </Badge>
        );
      case "PARTIAL_RETURN":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
            คืนบางส่วน
          </Badge>
        );
      case "RETURNED":
        return (
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
            คืนแล้ว
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="border-gray-500 text-gray-600 dark:text-gray-400">
            ยกเลิก
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };


  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "CREATED":
      case "CHECKED_OUT":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "ITEM_RETURNED":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case "CREATED":
        return "สร้างการเบิก";
      case "CHECKED_OUT":
        return "เบิกอุปกรณ์";
      case "ITEM_RETURNED":
        return "คืนอุปกรณ์";
      case "CANCELLED":
        return "ยกเลิก";
      default:
        return eventType;
    }
  };

  const activeItems = checkout?.items.filter((item) => !item.returnedAt) || [];
  const allReturnedItems = checkout?.items.filter((item) => item.returnedAt) || [];
  
  // Filter returned items
  const filteredReturnedItems = allReturnedItems.filter((item) => {
    if (returnedFilter === "ALL") return true;
    const hasProblem = item.problem || (item.maintenanceStatus && item.maintenanceStatus !== "NONE");
    if (returnedFilter === "WITH_PROBLEM") return hasProblem;
    if (returnedFilter === "NO_PROBLEM") return !hasProblem;
    return true;
  });
  
  // Sort returned items
  const returnedItems = [...filteredReturnedItems].sort((a, b) => {
    if (returnedSort === "DATE_DESC") {
      return new Date(b.returnedAt || 0).getTime() - new Date(a.returnedAt || 0).getTime();
    }
    if (returnedSort === "DATE_ASC") {
      return new Date(a.returnedAt || 0).getTime() - new Date(b.returnedAt || 0).getTime();
    }
    if (returnedSort === "NAME_ASC") {
      return (a.device.name || a.device.deviceCode).localeCompare(b.device.name || b.device.deviceCode, "th");
    }
    if (returnedSort === "NAME_DESC") {
      return (b.device.name || b.device.deviceCode).localeCompare(a.device.name || a.device.deviceCode, "th");
    }
    return 0;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 container mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!checkout) {
    return null;
  }

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/checkouts">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                {checkout.checkoutNumber}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">รายละเอียดการเบิกอุปกรณ์</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(checkout.status)}
            {activeItems.length > 0 && (checkout.status === "ACTIVE" || checkout.status === "PARTIAL_RETURN") && (
              <>
                <Button 
                  onClick={() => {
                    if (activeItems.length === 0) {
                      Swal.fire(
                        getToastConfig({
                          icon: "info",
                          title: "ไม่มีอุปกรณ์ที่สามารถคืนได้",
                          text: "กรุณาเลือกอุปกรณ์ที่ต้องการคืนก่อน",
                        })
                      );
                      return;
                    }
                    setReturnDialogOpen(true);
                  }} 
                  className="gap-2"
                >
                  <Package className="h-4 w-4" />
                  คืนอุปกรณ์
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelCheckout}
                  disabled={cancelling}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  {cancelling ? "กำลังยกเลิก..." : "ยกเลิกการเบิก"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Checkout Info - Top Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              ข้อมูลการเบิก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground">บริษัท</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{checkout.company || "-"}</span>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">ผู้เบิก</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{checkout.borrower?.fullName || checkout.borrower?.username || "-"}</span>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">วันที่เริ่มใช้งาน</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(checkout.startTime), "dd MMM yyyy HH:mm", { locale: th })}
                  </span>
                </div>
              </div>
              {checkout.endTime && (
                <div>
                  <Label className="text-muted-foreground">วันที่สิ้นสุด</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(checkout.endTime), "dd MMM yyyy HH:mm", { locale: th })}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {checkout.usageNotes && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-muted-foreground">หมายเหตุการใช้งาน</Label>
                <p className="mt-1 text-sm">{checkout.usageNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Devices Grid */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Devices */}
            {activeItems.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      กำลังใช้งาน ({activeItems.length} เครื่อง)
                    </CardTitle>
                    {(checkout.status === "ACTIVE" || checkout.status === "PARTIAL_RETURN") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedItems.length === 0) {
                            setSelectedItems(activeItems.map((item) => item.id));
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                      >
                        {selectedItems.length === activeItems.length ? "ยกเลิกการเลือก" : "เลือกทั้งหมด"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeItems.map((item) => {
                      const isSelected = selectedItems.includes(item.id);
                      return (
                        <Card
                          key={item.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-lg border-2",
                            isSelected 
                              ? "ring-2 ring-primary border-primary bg-primary/5" 
                              : "border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10"
                          )}
                          onClick={() => {
                            if (checkout.status === "ACTIVE" || checkout.status === "PARTIAL_RETURN") {
                              if (isSelected) {
                                setSelectedItems(selectedItems.filter((id) => id !== item.id));
                              } else {
                                setSelectedItems([...selectedItems, item.id]);
                              }
                            }
                          }}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Tablet className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <h3 className="font-semibold text-sm line-clamp-1">
                                    {item.device.name || item.device.deviceCode}
                                  </h3>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {item.device.deviceCode}
                                </p>
                                {item.device.model && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.device.model}
                                  </p>
                                )}
                              </div>
                              {(checkout.status === "ACTIVE" || checkout.status === "PARTIAL_RETURN") && (
                                <div className="shrink-0">
                                  {isSelected ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                  )}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 w-full justify-center">
                              กำลังใช้งาน
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Returned Devices */}
            {allReturnedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      คืนแล้ว ({filteredReturnedItems.length} / {allReturnedItems.length} เครื่อง)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Select
                        value={returnedFilter}
                        onValueChange={(value: "ALL" | "WITH_PROBLEM" | "NO_PROBLEM") => setReturnedFilter(value)}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <Filter className="h-3.5 w-3.5 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">ทั้งหมด</SelectItem>
                          <SelectItem value="WITH_PROBLEM">มีปัญหา</SelectItem>
                          <SelectItem value="NO_PROBLEM">ไม่มีปัญหา</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={returnedSort}
                        onValueChange={(value: "DATE_DESC" | "DATE_ASC" | "NAME_ASC" | "NAME_DESC") => setReturnedSort(value)}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DATE_DESC">วันที่ล่าสุด</SelectItem>
                          <SelectItem value="DATE_ASC">วันที่เก่าสุด</SelectItem>
                          <SelectItem value="NAME_ASC">ชื่อ A-Z</SelectItem>
                          <SelectItem value="NAME_DESC">ชื่อ Z-A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {returnedItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไข</p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {returnedItems.map((item) => {
                      const hasProblem = item.problem || (item.maintenanceStatus && item.maintenanceStatus !== "NONE");
                      return (
                        <Card 
                          key={item.id} 
                          className={cn(
                            "border-2 transition-all hover:shadow-lg",
                            hasProblem
                              ? "border-red-500/50 bg-red-500/5 hover:bg-red-500/10"
                              : "border-green-500/50 bg-green-500/5 hover:bg-green-500/10"
                          )}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Tablet className={cn(
                                    "h-4 w-4 shrink-0",
                                    hasProblem 
                                      ? "text-red-600 dark:text-red-400" 
                                      : "text-green-600 dark:text-green-400"
                                  )} />
                                  <Tooltip content={item.device.name || item.device.deviceCode}>
                                    <h3 className="font-semibold text-sm line-clamp-1 ">
                                      {item.device.name || item.device.deviceCode}
                                    </h3>
                                  </Tooltip>
                                </div>
                                <Tooltip content={item.device.deviceCode}>
                                  <p className="text-xs text-muted-foreground line-clamp-1 ">
                                    {item.device.deviceCode}
                                  </p>
                                </Tooltip>
                                {item.device.model && (
                                  <Tooltip content={item.device.model}>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 ">
                                      {item.device.model}
                                    </p>
                                  </Tooltip>
                                )}
                                {item.returnedAt && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    คืนเมื่อ: {format(new Date(item.returnedAt), "dd MMM yyyy HH:mm", { locale: th })}
                                  </p>
                                )}
                                {item.problem && (
                                  <div className="mt-2 space-y-1">
                                    <div className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                      <span className="font-medium">ปัญหา:</span>
                                    </div>
                                    <Tooltip content={item.problem}>
                                      <p className="text-xs text-red-600 dark:text-red-400 ml-4 line-clamp-2 ">
                                        {item.problem}
                                      </p>
                                    </Tooltip>
                                  </div>
                                )}
                                {item.solution && (
                                  <div className="mt-2 space-y-1">
                                    <div className="text-xs text-green-600 dark:text-green-400 flex items-start gap-1">
                                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                                      <span className="font-medium">แนวทางแก้ไข:</span>
                                    </div>
                                    <Tooltip content={item.solution}>
                                      <p className="text-xs text-green-600 dark:text-green-400 ml-4 line-clamp-2 ">
                                        {item.solution}
                                      </p>
                                    </Tooltip>
                                  </div>
                                )}
                                {item.maintenanceStatus && item.maintenanceStatus !== "NONE" && (
                                  <div className="mt-2">
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-xs",
                                        item.maintenanceStatus === "HAS_PROBLEM" && "border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/10",
                                        item.maintenanceStatus === "NEEDS_REPAIR" && "border-red-500 text-red-600 dark:text-red-400 bg-red-500/10",
                                        item.maintenanceStatus === "IN_MAINTENANCE" && "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10",
                                        item.maintenanceStatus === "DAMAGED" && "border-gray-500 text-gray-600 dark:text-gray-400 bg-gray-500/10"
                                      )}
                                    >
                                      {item.maintenanceStatus === "HAS_PROBLEM" && "มีปัญหา"}
                                      {item.maintenanceStatus === "NEEDS_REPAIR" && "ต้องซ่อม"}
                                      {item.maintenanceStatus === "IN_MAINTENANCE" && "กำลังซ่อม"}
                                      {item.maintenanceStatus === "DAMAGED" && "เสียหาย"}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "w-full justify-center",
                                  hasProblem
                                    ? "border-red-500 text-red-600 dark:text-red-400 bg-red-500/10"
                                    : "border-green-500 text-green-600 dark:text-green-400 bg-green-500/10"
                                )}
                              >
                                คืนแล้ว
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>สรุป</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">จำนวนอุปกรณ์ทั้งหมด</Label>
                  <div className="text-2xl font-bold mt-1">{checkout.items.length} เครื่อง</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">กำลังใช้งาน</Label>
                  <div className="text-2xl font-bold text-amber-600 mt-1">{activeItems.length} เครื่อง</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">คืนแล้ว</Label>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{returnedItems.length} เครื่อง</div>
                </div>
                {checkout.charger && (
                  <div>
                    <Label className="text-muted-foreground">จำนวนที่ชาร์จ</Label>
                    <div className="text-2xl font-bold mt-1">{checkout.charger}</div>
                  </div>
                )}
                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground">สร้างโดย</Label>
                  <div className="mt-1">
                    {checkout.creator.fullName || checkout.creator.username}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">วันที่สร้าง</Label>
                  <div className="mt-1">
                    {format(new Date(checkout.createdAt), "dd MMM yyyy HH:mm", { locale: th })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {checkout.events.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                          {getEventIcon(event.eventType)}
                        </div>
                        {index < checkout.events.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{getEventLabel(event.eventType)}</div>
                            {event.notes && (
                              <div className="text-xs text-muted-foreground mt-1">{event.notes}</div>
                            )}
                            {event.user && (
                              <div className="text-xs text-muted-foreground mt-1">
                                โดย: {event.user.fullName || event.user.username}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(event.createdAt), "dd MMM yyyy HH:mm", { locale: th })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Return Dialog */}
        <Dialog 
          open={returnDialogOpen} 
          onOpenChange={(open) => {
            setReturnDialogOpen(open);
            if (!open) {
              // Reset states when dialog closes
              setCollapsedItems({});
              setItemProblems({});
              setReturnNotes("");
            }
          }}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] w-[95vw]">
            <DialogHeader>
              <DialogTitle>คืนอุปกรณ์</DialogTitle>
              <DialogDescription>
                เลือกอุปกรณ์ที่ต้องการคืนและกรอกข้อมูลเพิ่มเติม
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-2 max-h-[60vh] space-y-6 p-1">
              {/* Global Return Notes - Moved to top */}
              <div className="border-b pb-4 pt-2">
                <Label htmlFor="returnNotes" className="text-base font-semibold ">หมายเหตุการคืน (สำหรับทุกอุปกรณ์)</Label>
                <Textarea
                  id="returnNotes"
                  placeholder="เช่น คืนครบทุกอุปกรณ์, คืนพร้อมอุปกรณ์เสริม"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Per-Device Problem Reporting */}
              <div>
                {selectedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">กรุณาเลือกอุปกรณ์ที่ต้องการคืนก่อน</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-base font-semibold">รายงานปัญหารายเครื่อง (ถ้ามี)</Label>
                      {Object.values(itemProblems).filter(p => p.hasProblem).length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {Object.values(itemProblems).filter(p => p.hasProblem).length} เครื่องที่เลือกรายงานปัญหา
                        </Badge>
                      )}
                    </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeItems
                    .filter((item) => selectedItems.includes(item.id))
                    .map((item) => {
                      const problemData = getItemProblem(item.id);
                      // Default to true (collapsed) if not set
                      const isCollapsed = collapsedItems[item.id] ?? true;
                      return (
                        <div key={item.id} className={cn(
                          "border rounded-lg bg-card transition-all duration-200 self-start",
                          problemData.hasProblem 
                            ? "border-orange-500/50 shadow-sm" 
                            : "border-border hover:border-border/80",
                          "hover:shadow-md"
                        )}>
                          <div className="p-4 space-y-3">
                            {/* Device Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {problemData.hasProblem && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => setCollapsedItems((prev) => ({
                                      ...prev,
                                      [item.id]: !(prev[item.id] ?? true), // Default to true (collapsed), then toggle
                                    }))}
                                  >
                                    {isCollapsed ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronUp className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm line-clamp-1">
                                    {item.device.deviceCode}
                                  </h4>
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {item.device.name || item.device.model || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Problem Toggle */}
                            <div className="flex items-center justify-between gap-2 pt-3 border-t">
                              <Label htmlFor={`problem-toggle-${item.id}`} className="text-sm cursor-pointer font-medium">
                                รายงานปัญหา
                              </Label>
                              <Switch
                                id={`problem-toggle-${item.id}`}
                                checked={problemData.hasProblem}
                                onCheckedChange={() => toggleItemProblem(item.id)}
                              />
                            </div>
                          </div>

                          {problemData.hasProblem && !isCollapsed && (
                            <div className="px-4 pb-4 space-y-3 border-t bg-muted/30 animate-in slide-in-from-top-2">
                              <div className="pt-3">

                              <div>
                                  <Label htmlFor={`maintenanceStatus-${item.id}`} className="text-sm font-medium">
                                    สถานะการซ่อม
                                  </Label>
                                  <Select
                                    value={problemData.maintenanceStatus}
                                    onValueChange={(value: "NONE" | "HAS_PROBLEM" | "NEEDS_REPAIR" | "IN_MAINTENANCE" | "DAMAGED") =>
                                      updateItemProblem(item.id, "maintenanceStatus", value)
                                    }
                                  >
                                    <SelectTrigger className="mt-2">
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
                                
                                <div>
                                  <Label htmlFor={`problem-${item.id}`} className="text-sm font-medium flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                                    ปัญหาที่พบ
                                  </Label>
                                  <Textarea
                                    id={`problem-${item.id}`}
                                    placeholder="เช่น หน้าจอแตก, เปิดไม่ติด"
                                    value={problemData.problem}
                                    onChange={(e) => updateItemProblem(item.id, "problem", e.target.value)}
                                    className="mt-2 text-sm"
                                    rows={3}
                                  />
                                </div>

                                <div>
                                  <Label htmlFor={`solution-${item.id}`} className="text-sm font-medium flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                    แนวทางการแก้ไข
                                  </Label>
                                  <Textarea
                                    id={`solution-${item.id}`}
                                    placeholder="เช่น ส่งซ่อม, จัดซื้อใหม่"
                                    value={problemData.solution}
                                    onChange={(e) => updateItemProblem(item.id, "solution", e.target.value)}
                                    className="mt-2 text-sm"
                                    rows={3}
                                  />
                                </div>

                              
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleReturnDevices} disabled={returning || selectedItems.length === 0}>
                {returning ? "กำลังคืน..." : "ยืนยันการคืน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

