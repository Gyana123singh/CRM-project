"use client";

import React, { useState, useRef } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Download, Loader2 } from "lucide-react";

export default function CSVImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const parseCSV = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { setErrors(["CSV must have at least a header row and one data row"]); return; }

    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    const rows: any[] = [];
    const parseErrors: string[] = [];

    // Validate headers
    const requiredHeaders = ["Name", "Mobile"];
    const lowerHeaders = headers.map(h => h.toLowerCase());
    const hasRequired = requiredHeaders.every(rh => lowerHeaders.includes(rh.toLowerCase()));
    if (!hasRequired) {
      parseErrors.push(`Missing required columns: ${requiredHeaders.filter(h => !lowerHeaders.includes(h.toLowerCase())).join(", ")}. Expected: Name, Mobile, Email, Tags`);
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
      const row: any = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

      // Validate
      if (!row.Name && !row.name) { parseErrors.push(`Row ${i}: Missing Name`); }
      if (!row.Mobile && !row.mobile) { parseErrors.push(`Row ${i}: Missing Mobile`); }
      else {
        const m = (row.Mobile || row.mobile || "").replace(/\D/g, "");
        if (m.length < 8 || m.length > 15) { parseErrors.push(`Row ${i}: Invalid mobile number "${row.Mobile || row.mobile}"`); }
      }

      rows.push(row);
    }

    // Duplicate check
    const mobiles = rows.map(r => (r.Mobile || r.mobile || "").replace(/\D/g, ""));
    const seen = new Set<string>();
    mobiles.forEach((m, idx) => {
      if (seen.has(m) && m) { parseErrors.push(`Row ${idx + 1}: Duplicate mobile number "${m}"`); }
      seen.add(m);
    });

    setParsedRows(rows);
    setErrors(parseErrors);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) { toast.error("Please upload a .csv file"); return; }
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => { parseCSV(ev.target?.result as string); };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 90));
    }, 300);

    try {
      const res = await axiosInstance.post(ENDPOINTS.whatsapp.contactImport, { rows: parsedRows });
      setResult(res.data);
      setProgress(100);
      toast.success(`Imported ${res.data.summary.imported} contacts!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Import failed");
    } finally {
      clearInterval(progressInterval);
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "Name,Mobile,Email,Tags\nJohn Doe,9876543210,john@example.com,\"Premium,VIP\"\nJane Smith,9876543211,jane@example.com,Lead\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contacts_template.csv"; a.click();
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">Import CSV Contacts <Upload className="h-5 w-5 text-amber-500" /></h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Upload a CSV file with contact data. Supported columns: Name, Mobile, Email, Tags.</p>
          </div>
          <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition self-start sm:self-auto">
            <Download className="h-4 w-4" /> Download Template
          </button>
        </div>

        {/* Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-all group"
        >
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          <Upload className="h-12 w-12 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition mb-3" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {file ? file.name : "Click or drag & drop your CSV file here"}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Max file size: 10MB • .csv format only</p>
        </div>

        {/* Preview Section */}
        {parsedRows.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" /> Preview ({parsedRows.length} rows)
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                {errors.length > 0 && <span className="text-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {errors.length} warnings</span>}
                {errors.length === 0 && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> All valid</span>}
              </div>
            </div>

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold sticky top-0 bg-white dark:bg-slate-900">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Mobile</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2 pr-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 pr-4 font-semibold text-slate-900 dark:text-slate-100">{row.Name || row.name || "—"}</td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{row.Mobile || row.mobile || "—"}</td>
                      <td className="py-2 pr-4 text-slate-500">{row.Email || row.email || "—"}</td>
                      <td className="py-2 text-slate-500">{row.Tags || row.tags || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 space-y-1">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Validation Warnings</p>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {errors.map((e, i) => (
                    <p key={i} className="text-[10px] text-amber-500">{e}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {importing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>Importing contacts...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-2"><CheckCircle className="h-3.5 w-3.5" /> Import Complete</p>
                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                  <div><p className="text-lg font-black text-slate-900 dark:text-slate-100">{result.summary.totalProcessed}</p><p className="text-[9px] text-slate-400 font-bold uppercase">Processed</p></div>
                  <div><p className="text-lg font-black text-emerald-600">{result.summary.imported}</p><p className="text-[9px] text-slate-400 font-bold uppercase">Imported</p></div>
                  <div><p className="text-lg font-black text-amber-500">{result.summary.duplicates}</p><p className="text-[9px] text-slate-400 font-bold uppercase">Duplicates</p></div>
                  <div><p className="text-lg font-black text-rose-500">{result.summary.errors}</p><p className="text-[9px] text-slate-400 font-bold uppercase">Errors</p></div>
                </div>
              </div>
            )}

            {/* Import Button */}
            {!result && (
              <div className="flex justify-end">
                <button onClick={handleImport} disabled={importing} className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 text-white rounded-xl font-bold shadow-md transition-all disabled:opacity-50">
                  {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4" /> Import {parsedRows.length} Contacts</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
}
