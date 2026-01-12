"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Eye, Package, Calendar, User, Building2, ClipboardList, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

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
  items: { id: string }[];
  createdAt: string;
  updatedAt: string;
}

export default function CheckoutsPage() {
  const router = useRouter();
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [allCheckouts, setAllCheckouts] = useState<Checkout[]>([]); // สำหรับคำนวณ stats
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchCheckouts();
  }, [router, debouncedSearch, statusFilter]);

  const fetchCheckouts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch filtered checkouts
      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await api.get(`/api/checkouts?${params.toString()}`);
      if (response.data.success) {
        setCheckouts(response.data.data);
      }

      // Fetch all checkouts for stats (without filter)
      const statsResponse = await api.get("/api/checkouts");
      if (statsResponse.data.success) {
        setAllCheckouts(statsResponse.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching checkouts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  // Calculate stats
  const stats = {
    total: allCheckouts.length,
    active: allCheckouts.filter((c) => c.status === "ACTIVE").length,
    partialReturn: allCheckouts.filter((c) => c.status === "PARTIAL_RETURN").length,
    returned: allCheckouts.filter((c) => c.status === "RETURNED").length,
    cancelled: allCheckouts.filter((c) => c.status === "CANCELLED").length,
  };

  const statsData = [
    { title: "ทั้งหมด", value: stats.total, icon: ClipboardList, color: "text-muted-foreground", iconColor: "text-muted-foreground" },
    { title: "กำลังใช้งาน", value: stats.active, icon: Package, color: "text-amber-600", iconColor: "text-amber-500" },
    { title: "คืนบางส่วน", value: stats.partialReturn, icon: Package, color: "text-blue-600", iconColor: "text-blue-500" },
    { title: "คืนแล้ว", value: stats.returned, icon: CheckCircle2, color: "text-emerald-600", iconColor: "text-emerald-500" },
    { title: "ยกเลิก", value: stats.cancelled, icon: XCircle, color: "text-gray-600", iconColor: "text-gray-500" },
  ];

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

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              รายการการเบิกอุปกรณ์
            </h1>
            <p className="text-sm text-muted-foreground mt-1">จัดการและติดตามการเบิก-คืนอุปกรณ์ทั้งหมด</p>
          </div>
          <Link href="/dashboard/checkouts/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              เบิกอุปกรณ์ใหม่
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        {/* Carousel for mobile */}
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
                          <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
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

        {/* Grid for larger screens */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statsData.map((stat, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.iconColor}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาเลขที่การเบิก, บริษัท..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="สถานะทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                  <SelectItem value="ACTIVE">กำลังใช้งาน</SelectItem>
                  <SelectItem value="PARTIAL_RETURN">คืนบางส่วน</SelectItem>
                  <SelectItem value="RETURNED">คืนแล้ว</SelectItem>
                  <SelectItem value="CANCELLED">ยกเลิก</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการการเบิก</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่การเบิก</TableHead>
                      <TableHead className="hidden md:table-cell">บริษัท</TableHead>
                      <TableHead>ผู้เบิก</TableHead>
                      <TableHead>จำนวนอุปกรณ์</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="hidden md:table-cell">วันที่เบิก</TableHead>
                      <TableHead className="text-right min-w-[140px]">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-9 w-32 rounded ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : checkouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">ไม่พบข้อมูลการเบิก</p>
                <Link href="/dashboard/checkouts/new">
                  <Button variant="outline" className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    เบิกอุปกรณ์ใหม่
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่การเบิก</TableHead>
                      <TableHead className="hidden md:table-cell">บริษัท</TableHead>
                      <TableHead>ผู้เบิก</TableHead>
                      <TableHead>จำนวนอุปกรณ์</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="hidden md:table-cell">วันที่เบิก</TableHead>
                      <TableHead className="text-right min-w-[140px]">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkouts.map((checkout) => (
                      <TableRow key={checkout.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm font-medium">
                          {checkout.checkoutNumber}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{checkout.company || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {checkout.borrower ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{checkout.borrower.fullName || checkout.borrower.username}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{checkout.items.length} เครื่อง</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(checkout.status)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(checkout.startTime), "dd MMM yyyy HH:mm", { locale: th })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/dashboard/checkouts/${checkout.id}`}>
                              <Button variant="default" size="sm" className="gap-2 w-full sm:w-auto">
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">ดูรายละเอียด</span>
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
