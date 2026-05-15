"use client";

import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Info,
  Users,
  Tablet,
  ClipboardList,
  Wrench,
  ChevronRight,
} from "lucide-react";

// ─── Smart Sheet Reader ───────────────────────────────────────────────────
// Column เหล่านี้เท่านั้นที่ควรแปลงเป็น ISO date string
const DATE_COLUMNS = new Set([
  "Start_Time", "End_Time", "Take_Time", "Return_Time", "Problem_Date",
]);

function readSheetRows(sheet: XLSX.WorkSheet): Record<string, string>[] {
  if (!sheet["!ref"]) return [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);

  // อ่าน headers จากแถวแรก
  const headers: string[] = [];
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
    headers.push(cell ? String(cell.v ?? "").trim() : "");
  }

  const rows: Record<string, string>[] = [];
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    const row: Record<string, string> = {};
    let hasData = false;

    for (let C = range.s.c; C <= range.e.c; C++) {
      const header = headers[C - range.s.c];
      if (!header) continue;
      const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];

      if (!cell || cell.v == null) { row[header] = ""; continue; }

      if (DATE_COLUMNS.has(header)) {
        // Column วันที่ → ISO string
        const d = cell.t === "d" ? (cell.v as Date)
          : cell.t === "n" ? new Date(Math.round(((cell.v as number) - 25569) * 86400000))
          : null;
        row[header] = d && !isNaN(d.getTime()) ? d.toISOString() : String(cell.w || cell.v || "");
      } else {
        // Column อื่น → ใช้ formatted text ที่ user เห็นใน Excel (cell.w)
        // ป้องกันกรณี Excel แปลง "9/12" เป็น date cell โดยอัตโนมัติ
        row[header] = cell.w ? String(cell.w) : String(cell.v ?? "");
      }

      if (row[header]) hasData = true;
    }

    if (hasData) rows.push(row);
  }

  return rows;
}

// ─── Types ────────────────────────────────────────────────────────────────

type SheetKey = "tablet-status" | "users" | "problems" | "checkouts";
type StepState = "idle" | "ready" | "loading" | "done" | "error";

interface ImportResult {
  created?: number;
  updated?: number;
  skipped?: number;
  errors: { row: string | object; error: string }[];
}

interface StepData {
  state: StepState;
  rows: Record<string, string>[];
  result?: ImportResult;
  errorMsg?: string;
}

// ─── Step config ───────────────────────────────────────────────────────────

const STEPS: {
  key: SheetKey;
  sheetName: string;
  label: string;
  description: string;
  icon: React.ElementType;
  note: string;
}[] = [
  {
    key: "tablet-status",
    sheetName: "Tablet_Status",
    label: "Tablet_Status",
    description: "แท็บเล็ตและสถานะ",
    icon: Tablet,
    note: "AVAILABLE → ว่าง, PENDING → กำลังใช้งาน, WAIT → รอซ่อม",
  },
  {
    key: "users",
    sheetName: "Users",
    label: "Users",
    description: "ข้อมูลผู้ใช้งาน",
    icon: Users,
    note: "รหัสผ่านจะถูกตั้งเป็นเบอร์โทรอัตโนมัติ",
  },
  {
    key: "problems",
    sheetName: "Problem",
    label: "Problem",
    description: "ปัญหาของแท็บเล็ต",
    icon: Wrench,
    note: "ต้องมี Tablet_Status และ Users ในระบบก่อน",
  },
  {
    key: "checkouts",
    sheetName: "Tablet",
    label: "Tablet (การเบิกยืม)",
    description: "ประวัติการเบิก-คืน",
    icon: ClipboardList,
    note: "ต้องมี Tablet_Status และ Users ในระบบก่อน",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [steps, setSteps] = useState<Record<SheetKey, StepData>>({
    "tablet-status": { state: "idle", rows: [] },
    users: { state: "idle", rows: [] },
    problems: { state: "idle", rows: [] },
    checkouts: { state: "idle", rows: [] },
  });

  const updateStep = (key: SheetKey, patch: Partial<StepData>) =>
    setSteps((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // ── Read Excel file ──────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    setFileError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        const sheetNameMap: Record<string, SheetKey> = {
          Tablet_Status: "tablet-status",
          Users: "users",
          Problem: "problems",
          Tablet: "checkouts",
        };

        let found = 0;
        for (const [xlsxName, stepKey] of Object.entries(sheetNameMap)) {
          // ค้นหาชีตแบบ case-insensitive
            const actualName = workbook.SheetNames.find(
            (n) => n.trim().toLowerCase() === xlsxName.toLowerCase()
          );

          if (!actualName) {
            updateStep(stepKey, {
              state: "error",
              rows: [],
              errorMsg: `ไม่พบชีต "${xlsxName}" ในไฟล์`,
            });
            continue;
          }

          const sheet = workbook.Sheets[actualName];
          const rows = readSheetRows(sheet);

          if (rows.length === 0) {
            updateStep(stepKey, { state: "error", rows: [], errorMsg: `ชีต "${xlsxName}" ไม่มีข้อมูล` });
          } else {
            updateStep(stepKey, { state: "ready", rows, result: undefined, errorMsg: undefined });
            found++;
          }
        }

        if (found === 0) {
          setFileError("ไม่พบชีตที่ต้องการ — ตรวจสอบว่าชื่อชีตคือ Tablet_Status, Users, Problem, Tablet");
        }
      } catch {
        setFileError("อ่านไฟล์ไม่ได้ — กรุณาตรวจสอบว่าเป็นไฟล์ Excel (.xlsx / .xls)");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Import one sheet ─────────────────────────────────────────────────────
  const handleImport = async (key: SheetKey) => {
    updateStep(key, { state: "loading" });
    try {
      const { data } = await api.post(`/api/import/${key}`, { rows: steps[key].rows });
      updateStep(key, { state: "done", result: data.results });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "เกิดข้อผิดพลาด กรุณาลองใหม่";
      updateStep(key, { state: "error", errorMsg: msg });
    }
  };

  const handleImportAll = async () => {
    for (const step of STEPS) {
      if (steps[step.key].state === "ready") {
        await handleImport(step.key);
      }
    }
  };

  const allReady = STEPS.every((s) =>
    ["ready", "done"].includes(steps[s.key].state)
  );
  const anyReady = STEPS.some((s) => steps[s.key].state === "ready");

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Import ข้อมูล</h1>
          </div>
          <p className="text-muted-foreground pl-[52px]">
            นำเข้าข้อมูลจาก Google Sheets โดยอัปโหลดไฟล์ Excel ที่มีครบทั้ง 4 ชีต
          </p>
        </div>

        {/* Upload card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">อัปโหลดไฟล์ Excel</CardTitle>
            <CardDescription>
              ไฟล์ต้องมีชีต: <code className="bg-muted px-1 rounded">Tablet_Status</code>,{" "}
              <code className="bg-muted px-1 rounded">Users</code>,{" "}
              <code className="bg-muted px-1 rounded">Problem</code>,{" "}
              <code className="bg-muted px-1 rounded">Tablet</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-all duration-150 ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : fileName
                  ? "border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <FileSpreadsheet className={`h-10 w-10 mx-auto mb-3 transition-colors ${
                isDragging ? "text-primary" : fileName ? "text-primary" : "text-muted-foreground"
              }`} />
              {isDragging ? (
                <>
                  <p className="font-medium text-primary">วางไฟล์ที่นี่</p>
                  <p className="text-sm text-muted-foreground mt-1">ปล่อยเพื่ออัปโหลด</p>
                </>
              ) : fileName ? (
                <>
                  <p className="font-medium text-primary">{fileName}</p>
                  <p className="text-sm text-muted-foreground mt-1">คลิกหรือลากไฟล์มาวางเพื่อเลือกใหม่</p>
                </>
              ) : (
                <>
                  <p className="font-medium">คลิกหรือลากไฟล์มาวางที่นี่</p>
                  <p className="text-sm text-muted-foreground mt-1">รองรับ .xlsx และ .xls</p>
                </>
              )}
            </button>

            {fileError && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                {fileError}
              </p>
            )}

            {anyReady && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-4 w-4" />
                  ระบบจะนำเข้าตามลำดับโดยอัตโนมัติ
                </p>
                <Button onClick={handleImportAll} className="gap-2">
                  <Upload className="h-4 w-4" />
                  นำเข้าทั้งหมด
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const data = steps[step.key];
            const Icon = step.icon;
            const isDone = data.state === "done";

            return (
              <Card
                key={step.key}
                className={`transition-colors ${
                  isDone ? "border-green-300 dark:border-green-800" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isDone
                            ? "bg-green-100 dark:bg-green-900/30"
                            : "bg-muted"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-normal">
                            {idx + 1}.
                          </span>
                          {step.label}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {step.description}
                        </CardDescription>
                      </div>
                    </div>
                    <StepBadge state={data.state} rows={data.rows.length} />
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    {step.note}
                  </p>

                  {/* Ready → preview + import button */}
                  {data.state === "ready" && (
                    <>
                      <PreviewTable rows={data.rows} />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => handleImport(step.key)} className="gap-2">
                          <Upload className="h-4 w-4" />
                          นำเข้า {data.rows.length} แถว
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Loading */}
                  {data.state === "loading" && (
                    <div className="flex items-center gap-3 py-3 text-muted-foreground justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">กำลังนำเข้า...</span>
                    </div>
                  )}

                  {/* Error */}
                  {data.state === "error" && data.errorMsg && (
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <XCircle className="h-4 w-4 shrink-0" />
                      {data.errorMsg}
                    </p>
                  )}

                  {/* Done */}
                  {data.state === "done" && data.result && (
                    <ImportResultPanel result={data.result} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StepBadge({
  state,
  rows,
}: {
  state: StepState;
  rows: number;
}) {
  if (state === "idle")
    return <Badge variant="outline" className="text-muted-foreground">รอไฟล์</Badge>;
  if (state === "ready")
    return <Badge variant="outline" className="gap-1 border-blue-300 text-blue-600"><Info className="h-3 w-3" />{rows} แถว</Badge>;
  if (state === "loading")
    return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />กำลังนำเข้า</Badge>;
  if (state === "done")
    return <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />สำเร็จ</Badge>;
  if (state === "error")
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />ผิดพลาด</Badge>;
  return null;
}

function PreviewTable({ rows }: { rows: Record<string, string>[] }) {
  const headers = Object.keys(rows[0] ?? {});
  const preview = rows.slice(0, 3);

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {preview.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30">
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2 whitespace-nowrap max-w-[180px] truncate">
                    {row[h] || <span className="text-muted-foreground/40">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 3 && (
        <div className="px-3 py-1.5 bg-muted/30 text-xs text-muted-foreground">
          แสดง 3 แถวแรก จากทั้งหมด {rows.length} แถว
        </div>
      )}
    </div>
  );
}

function ImportResultPanel({ result }: { result: ImportResult }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-600 font-medium">✓ สร้างใหม่ {result.created ?? 0}</span>
        {result.updated !== undefined && (
          <span className="text-blue-600 font-medium">↻ อัปเดต {result.updated}</span>
        )}
        <span className="text-muted-foreground">⊘ ข้าม {result.skipped ?? 0}</span>
        {result.errors.length > 0 && (
          <span className="text-destructive font-medium">✗ ผิดพลาด {result.errors.length}</span>
        )}
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            รายการที่มีปัญหา
          </p>
          <div className="max-h-28 overflow-y-auto space-y-0.5">
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs text-destructive/80 truncate">
                {typeof e.row === "string" ? e.row : JSON.stringify(e.row).slice(0, 50)} — {e.error}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
