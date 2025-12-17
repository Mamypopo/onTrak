"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Search, MoreHorizontal, Eraser } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DiAndroid } from "react-icons/di";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppDetail {
  packageName: string;
  label: string;
  versionName: string | null;
  versionCode: number;
  firstInstallTime: number;
  lastUpdateTime: number;
}

interface AppListProps {
  apps: AppDetail[];
  onUninstall: (packageName: string) => void;
  onClearData: (packageName: string) => void;
  foregroundApp?: string | null;
  sendingCommand: boolean;
}

const AppList = ({ apps, onUninstall, onClearData, foregroundApp, sendingCommand }: AppListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const filteredApps = useMemo(() => {
    const sortedApps = [...apps].sort((a, b) => a.packageName.localeCompare(b.packageName));
    if (!searchTerm) {
      return sortedApps;
    }
    return sortedApps.filter(app =>
      (app.packageName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.label?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [apps, searchTerm]);

  const formatDate = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return '-';
    try {
      return new Date(timestamp).toLocaleString('th-TH', {
        year: '2-digit',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '-';
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาชื่อแอป หรือ Package Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="border rounded-lg max-h-[40rem] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50">
            <TableRow>
              <TableHead className="w-[48px]">Icon</TableHead>
              <TableHead>Application</TableHead>
              <TableHead className="w-[90px] md:w-[140px]">Version</TableHead>
              <TableHead className="w-[160px] hidden md:table-cell">Installed</TableHead>
              <TableHead className="w-[160px] hidden md:table-cell">Last Updated</TableHead>
              <TableHead className="w-[40px] md:w-auto text-right pr-2">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApps.length > 0 ? (
              filteredApps.map((app) => (
                <TableRow key={app.packageName}>
                  <TableCell className="pr-1 md:pr-2">
                    <div className="h-6 w-6 md:h-8 md:w-8 flex items-center justify-center">
                      {!imageErrors[app.packageName] ? (
                        <img
                          src={`https://p.apk4.in/p/${app.packageName}`}
                          alt={app.packageName}
                          className="h-6 w-6 md:h-8 md:w-8 rounded-md object-cover"
                          onError={() => setImageErrors(prev => ({ ...prev, [app.packageName]: true }))}
                          loading="lazy"
                        />
                      ) : (
                        <DiAndroid className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1 md:gap-2 max-w-[160px] md:max-w-xs">
                      <div className="truncate">
                        <p className="font-semibold text-xs md:text-sm truncate">{app.label || 'Unknown App'}</p>
                        <p className="font-mono text-xs text-muted-foreground truncate hidden md:block">{app.packageName}</p>
                      </div>
                       {foregroundApp === app.packageName && (
                         <Badge variant="success" className="text-[10px] px-1.5 py-0 shrink-0">Foreground</Badge>
                       )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] md:text-xs truncate">
                    <div className="truncate">{app.versionName || '-'}</div>
                    <div className="text-muted-foreground text-[10px] md:text-[11px]">({app.versionCode})</div>
                  </TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{formatDate(app.firstInstallTime)}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{formatDate(app.lastUpdateTime)}</TableCell>
                  <TableCell className="text-right pr-2 md:pr-4">
                    {/* Desktop Button */}
                    <div className="hidden md:flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/10"
                        onClick={() => onClearData(app.packageName)}
                        disabled={sendingCommand}
                      >
                        <Eraser className="w-3.5 h-3.5 mr-1.5" />
                        ล้างข้อมูล
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => onUninstall(app.packageName)}
                        disabled={sendingCommand}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        ถอนฯ
                      </Button>
                    </div>
                    {/* Mobile Dropdown */}
                    <div className="md:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={sendingCommand} className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onClearData(app.packageName)} className="text-yellow-600 focus:text-yellow-600">
                            <Eraser className="w-4 h-4 mr-2" /> ล้างข้อมูล
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUninstall(app.packageName)} className="text-red-500 focus:text-red-500">
                            <Trash2 className="w-4 h-4 mr-2" /> ถอนการติดตั้ง
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <p className="font-medium">ไม่พบแอปพลิเคชัน</p>
                  <p className="text-sm text-muted-foreground">{searchTerm ? "ไม่พบผลลัพธ์ที่ตรงกับการค้นหา" : "อุปกรณ์นี้ยังไม่มีแอปพลิเคชันที่ติดตั้ง"}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AppList;