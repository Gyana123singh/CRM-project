"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { Search, Filter, Trash2, Printer, Download, Eye, ChevronDown, ChevronUp, AlertCircle, CheckCircle, RefreshCw, Star, Info, Building, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/api";

interface AuditDetails {
  id: string;
  type: string; // "seo" | "social" | "gmb"
  target: string;
  score: number;
  status: string;
  createdAt: string;
  seoAudit?: any;
  socialAudit?: any;
  googleBusinessAudit?: any;
}

export default function MyAuditsPage() {
  const [audits, setAudits] = useState<AuditDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "seo" | "social" | "gmb">("all");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/client-admin/audits?type=${filterType}&search=${searchQuery}`);
      setAudits(response.data);
    } catch (error) {
      console.error("Failed to fetch audits:", error);
      toast.error("Failed to load audit history logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [filterType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAudits();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this audit record?")) {
      return;
    }
    try {
      await axiosInstance.delete(`/api/client-admin/audits/${id}`);
      toast.success("Audit history record deleted");
      fetchAudits();
      if (expandedId === id) setExpandedId(null);
    } catch (error) {
      toast.error("Failed to delete audit record.");
    }
  };

  const handlePrint = (item: AuditDetails, e: React.MouseEvent) => {
    e.stopPropagation();

    // Open print view of report in a new window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow pop-ups to download the PDF report");
      return;
    }

    const reportHTML = generateReportHTML(item);
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.focus();

    // Trigger window print after styles load
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // HTML template for PDF/Print view
  const generateReportHTML = (item: AuditDetails) => {
    const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");
    const formattedDate = new Date(item.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    let detailsHTML = "";
    if (item.type === "seo" && item.seoAudit) {
      const seo = item.seoAudit;
      detailsHTML = `
        <div class="section">
          <h2>Executive Summary</h2>
          <p>${seo.executiveSummary || "N/A"}</p>
        </div>
        
        <div class="grid">
          <div>
            <h3>Technical Checkpoints</h3>
            <ul>
              <li><strong>SSL Status:</strong> ${seo.ssl ? "✓ Secure (SSL active)" : "✗ Warning (No valid SSL)"}</li>
              <li><strong>HTTPS Redirection:</strong> ${seo.https ? "✓ Active" : "✗ Missing Redirect"}</li>
              <li><strong>Mobile Responsiveness:</strong> ${seo.mobileResponsive ? "✓ Responsive layout" : "✗ Outdated viewport"}</li>
              <li><strong>Contact Info:</strong> ${seo.contactInfo ? "✓ Detected (Email/Phone found)" : "✗ Missing CTA info"}</li>
              <li><strong>CTA buttons:</strong> ${seo.ctaPresence ? "✓ Present on homepage" : "✗ No CTA detected"}</li>
            </ul>
          </div>
          <div>
            <h3>SEO & Crawl Status</h3>
            <ul>
              <li><strong>Indexability:</strong> ${seo.indexability ? "✓ Indexable" : "✗ Blocked"}</li>
              <li><strong>Robots.txt:</strong> ${seo.robotsTxt ? "✓ Verified" : "✗ Missing"}</li>
              <li><strong>Sitemap.xml:</strong> ${seo.sitemapXml ? "✓ Verified" : "✗ Missing"}</li>
              <li><strong>Canonical Tags:</strong> ${seo.canonicalTags ? "✓ Formatted correctly" : "✗ Missing canonicals"}</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <h2 class="critical">Critical Findings</h2>
          <ul>
            ${(seo.criticalFindings || []).map((f: string) => `<li>${f}</li>`).join("") || "<li>None found</li>"}
          </ul>
        </div>

        <div class="section">
          <h2 class="high">High Priority Issues</h2>
          <ul>
            ${(seo.highFindings || []).map((f: string) => `<li>${f}</li>`).join("") || "<li>None found</li>"}
          </ul>
        </div>

        <div class="section">
          <h2 class="medium">Medium Priority Issues</h2>
          <ul>
            ${(seo.mediumFindings || []).map((f: string) => `<li>${f}</li>`).join("") || "<li>None found</li>"}
          </ul>
        </div>

        <div class="section">
          <h2 class="good">Good Signals (Passed Checks)</h2>
          <ul>
            ${(seo.goodFindings || []).map((f: string) => `<li>${f}</li>`).join("") || "<li>None found</li>"}
          </ul>
        </div>

        <div class="section">
          <h2 class="wins">Quick Wins & Recommendations</h2>
          <ul>
            ${(seo.quickWins || []).map((f: string) => `<li>${f}</li>`).join("") || "<li>None</li>"}
          </ul>
        </div>
      `;
    } else if (item.type === "social" && item.socialAudit) {
      const social = item.socialAudit;
      detailsHTML = `
        <div class="section">
          <h2>Branding Analysis</h2>
          <p>${social.brandingAnalysis || "N/A"}</p>
        </div>

        <div class="section">
          <h2>Engagement Analysis</h2>
          <p>${social.engagementAnalysis || "N/A"}</p>
        </div>

        <div class="section">
          <h2 class="high">Growth Opportunities</h2>
          <ul>
            ${(social.growthOpportunities || []).map((f: string) => `<li>${f}</li>`).join("") || "<li>None</li>"}
          </ul>
        </div>

        <div class="section">
          <h2 class="good">Recommendations</h2>
          <ul>
            ${(social.recommendations || []).map((f: string) => `<li>${f}</li>`).join("") || "<li>None</li>"}
          </ul>
        </div>

        <div class="section">
          <h2>30-Day Content Plan</h2>
          <table class="plan-table">
            <thead>
              <tr>
                <th>Day Range</th>
                <th>Content Topic</th>
                <th>Posting Format</th>
                <th>Suggested Caption</th>
              </tr>
            </thead>
            <tbody>
              ${(social.contentPlan || []).map((day: any) => `
                <tr>
                  <td><strong>${day.day}</strong></td>
                  <td>${day.topic}</td>
                  <td><span class="badge">${day.format}</span></td>
                  <td>${day.caption}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    } else if (item.type === "gmb" && item.googleBusinessAudit) {
      const gmb = item.googleBusinessAudit;
      const reviews = gmb.reviews || {};
      detailsHTML = `
        <div class="grid">
          <div>
            <h3>Profile Health Indicators</h3>
            <ul>
              <li><strong>Profile Existence:</strong> ${gmb.profileExistence ? "✓ Live on Google Maps" : "✗ Missing listing"}</li>
              <li><strong>Profile Completeness:</strong> ${gmb.completeness}% Completed</li>
              <li><strong>Average Rating:</strong> ${gmb.ratings} / 5.0 ★</li>
            </ul>
          </div>
          <div>
            <h3>Visibility Metrics</h3>
            <ul>
              <li><strong>Local Visibility Score:</strong> ${gmb.localVisibility}%</li>
              <li><strong>Local SEO Readiness:</strong> ${gmb.localSEOReadiness}%</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <h2>Customer Reviews Sentiment</h2>
          <p>${reviews.reviewsSummary || "No review analysis details generated."}</p>
          ${reviews.total ? `
            <div style="margin-top: 10px; font-size: 13px;">
              <strong>Total Reviews:</strong> ${reviews.total} | 
              <span class="good"><strong>Positive:</strong> ${reviews.positive}</span> | 
              <span class="critical"><strong>Negative:</strong> ${reviews.negative}</span>
            </div>
          ` : ""}
        </div>

        <div class="section">
          <h2 class="wins">Local SEO Recommendations</h2>
          <ul>
            ${(gmb.recommendations || []).map((f: string) => `<li>${f}</li>`).join("") || "<li>None</li>"}
          </ul>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Audit Report - ${item.target}</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            padding: 40px;
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
          }
          header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .logo {
            font-size: 20px;
            font-weight: 900;
            color: #0d9488;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .meta {
            text-align: right;
            font-size: 12px;
            color: #64748b;
          }
          .title-section {
            margin-bottom: 25px;
          }
          h1 {
            font-size: 24px;
            font-weight: 950;
            margin: 0;
            color: #0f172a;
          }
          h2 {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
            margin-top: 30px;
            margin-bottom: 12px;
          }
          h3 {
            font-size: 14px;
            font-weight: 800;
            color: #334155;
            margin-bottom: 8px;
          }
          p {
            font-size: 13px;
            color: #475569;
            margin: 0 0 10px 0;
          }
          .score-badge {
            background: #f0fdfa;
            border: 1px solid #99f6e4;
            color: #0f766e;
            padding: 10px 20px;
            border-radius: 12px;
            display: inline-block;
            text-align: center;
          }
          .score-num {
            font-size: 28px;
            font-weight: 950;
            line-height: 1;
          }
          .score-lbl {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
          }
          ul {
            margin: 0;
            padding-left: 20px;
            font-size: 13px;
            color: #475569;
          }
          li {
            margin-bottom: 6px;
          }
          .critical { color: #dc2626; border-color: #fca5a5; }
          .high { color: #ea580c; border-color: #ffedd5; }
          .medium { color: #ca8a04; border-color: #fef9c3; }
          .good { color: #16a34a; border-color: #dcfce7; }
          .wins { color: #0d9488; border-color: #ccfbf1; }
          
          .plan-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 15px;
          }
          .plan-table th, .plan-table td {
            border: 1px solid #e2e8f0;
            padding: 10px;
            text-align: left;
          }
          .plan-table th {
            background: #f8fafc;
            color: #475569;
            font-weight: 700;
          }
          .badge {
            background: #e0f2fe;
            color: #0369a1;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <header>
          <div class="logo">Lead Sangrah</div>
          <div class="meta">
            <div>Report Date: ${formattedDate}</div>
            <div>Audit Mode: ${item.type.toUpperCase()} Report</div>
          </div>
        </header>

        <div class="title-section" style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1>Audit Analysis Report</h1>
            <p style="font-size: 14px; font-weight: 600; margin-top: 5px; color: #64748b;">${item.target}</p>
          </div>
          <div class="score-badge">
            <div class="score-num">${item.score}</div>
            <div class="score-lbl">Audit Score</div>
          </div>
        </div>

        ${detailsHTML}

        <footer style="margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 10px; color: #94a3b8;">
          Report automatically generated by Lead Sangrah Audit Engine. © 2026. All rights reserved.
        </footer>
      </body>
      </html>
    `;
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
              My Audits
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              History of all your audits and content plans.
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by URL or handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-250 font-bold text-xs rounded-xl transition"
            >
              Search
            </button>
          </form>

          {/* Filter Type Tab switches */}
          <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-[10px] font-bold max-w-md overflow-x-auto self-start md:self-auto shrink-0 select-none">
            {[
              { id: "all", label: "All Audits" },
              { id: "seo", label: "Website SEO" },
              { id: "social", label: "Social Media" },
              { id: "gmb", label: "Google Business" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition shrink-0 ${filterType === tab.id
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mb-2 text-primary" />
            <span className="text-xs font-bold">Loading audit logs...</span>
          </div>
        ) : audits.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-400">
            No audits found matching the current filters.
          </div>
        ) : (
          <div className="space-y-4">
            {audits.map((item) => {
              const isExpanded = expandedId === item.id;
              const formattedDate = new Date(item.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all ${isExpanded ? "ring-1 ring-primary shadow-lg shadow-primary/5" : "hover:border-slate-350 dark:hover:border-slate-700"
                    }`}
                >
                  {/* Card Header clickable to expand */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${item.type === "seo"
                          ? "bg-teal-500/10 text-teal-600"
                          : item.type === "social"
                            ? "bg-pink-500/10 text-pink-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}>
                        <Building className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-slate-50 text-sm truncate max-w-xs sm:max-w-md lg:max-w-lg">
                          {item.target}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-1 uppercase">
                          <span>
                            {item.type === "seo" ? "Website SEO" : item.type === "social" ? "Social Media" : "Google Business"}
                          </span>
                          <span>•</span>
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Audit Score</span>
                        <span className="text-sm font-black text-teal-500">{item.score}/100</span>
                      </div>

                      {/* Action buttons */}
                      <button
                        onClick={(e) => handlePrint(item, e)}
                        className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider"
                      >
                        <Printer className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
                      </button>

                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-2 border border-rose-100 dark:border-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-xl transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Report Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/40 space-y-6 text-xs animate-fade-in">

                      {/* 1. Website SEO Expanded view */}
                      {item.type === "seo" && item.seoAudit && (() => {
                        const isNoindex = item.seoAudit.criticalFindings?.some((f: any) => f.toLowerCase().includes("noindex"));
                        const hasFavicon = item.seoAudit.goodFindings?.some((f: any) => f.toLowerCase().includes("favicon"));
                        const hasSchema = item.seoAudit.goodFindings?.some((f: any) => f.toLowerCase().includes("structured data") || f.toLowerCase().includes("schema")) || item.seoAudit.localSEO?.schemaDetected;
                        const missingAltsCount = item.seoAudit.imageAltTags?.missing || 0;
                        const totalAltsCount = item.seoAudit.imageAltTags?.total || 0;
                        const titleLength = item.seoAudit.metaTitle?.length || 0;
                        const descLength = item.seoAudit.metaDescription?.length || 0;
                        const h1Count = item.seoAudit.headings?.h1?.length || 0;

                        return (
                          <div className="space-y-6">
                            {/* Executive Summary */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-2">
                              <h4 className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider flex items-center gap-1.5">
                                <Info className="h-4 w-4 text-primary" /> Executive Summary
                              </h4>
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                                {item.seoAudit.executiveSummary}
                              </p>
                            </div>

                            {/* Technical Grid Checkboxes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left Column: Core Technical Checks */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4">
                                <h5 className="font-black uppercase text-[10px] text-slate-400 tracking-wider">Technical Elements Checklist</h5>
                                <ul className="space-y-3.5">

                                  {/* SSL */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {item.seoAudit.ssl ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>SSL Encryption: {item.seoAudit.ssl ? "Secure (+12 pts)" : "Insecure (-12 pts)"}</span>
                                    </div>
                                    {!item.seoAudit.ssl && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Install a valid SSL certificate (e.g., Let's Encrypt) on your hosting server to encrypt visitor connections.
                                      </p>
                                    )}
                                  </li>

                                  {/* HTTPS */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {item.seoAudit.https ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>HTTPS Redirection: {item.seoAudit.https ? "Active (+8 pts)" : "Inactive (-8 pts)"}</span>
                                    </div>
                                    {!item.seoAudit.https && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Enforce permanent 301 redirection rules from HTTP to HTTPS in server config (.htaccess / nginx).
                                      </p>
                                    )}
                                  </li>

                                  {/* Indexability */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {!isNoindex ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0 animate-pulse" />
                                      )}
                                      <span>Google Search Indexability: {!isNoindex ? "Allowed (+10 pts)" : "Blocked (-30 pts)"}</span>
                                    </div>
                                    {isNoindex && (
                                      <p className="pl-6.5 text-[10.5px] text-red-400 leading-normal font-bold">
                                        Action needed: Remove the &lt;meta name="robots" content="noindex"&gt; tag from your document header immediately.
                                      </p>
                                    )}
                                  </li>

                                  {/* Robots.txt */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {item.seoAudit.robotsTxt ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>robots.txt configuration file: {item.seoAudit.robotsTxt ? "Found (+7 pts)" : "Missing (-7 pts)"}</span>
                                    </div>
                                    {!item.seoAudit.robotsTxt && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Create a robots.txt file at your root directory to control crawler indexing rules.
                                      </p>
                                    )}
                                  </li>

                                  {/* Sitemap */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {item.seoAudit.sitemapXml ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>sitemap.xml map index: {item.seoAudit.sitemapXml ? "Found (+7 pts)" : "Missing (-7 pts)"}</span>
                                    </div>
                                    {!item.seoAudit.sitemapXml && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Generate an XML sitemap and upload it to /sitemap.xml so search bots discover your pages.
                                      </p>
                                    )}
                                  </li>

                                  {/* Canonical */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {item.seoAudit.canonicalTags ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>Canonical URLs link tags: {item.seoAudit.canonicalTags ? "Configured (+6 pts)" : "Missing (-6 pts)"}</span>
                                    </div>
                                    {!item.seoAudit.canonicalTags && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Add a &lt;link rel="canonical" href="..."&gt; tag to prevent search engines indexing duplicate pages.
                                      </p>
                                    )}
                                  </li>

                                  {/* Favicon */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {hasFavicon ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>Shortcut Favicon tag: {hasFavicon ? "Detected (+5 pts)" : "Missing (-5 pts)"}</span>
                                    </div>
                                    {!hasFavicon && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Configure a rel="icon" shortcut tag inside your head markup pointing to your site icon.
                                      </p>
                                    )}
                                  </li>

                                </ul>
                              </div>

                              {/* Right Column: On-Page Elements & Content Checks */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4">
                                <h5 className="font-black uppercase text-[10px] text-slate-400 tracking-wider">SEO & Content Checklist</h5>
                                <ul className="space-y-3.5">

                                  {/* Meta Title */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {titleLength > 5 ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>Meta Title Tag: {titleLength > 5 ? `Configured (+8 pts)` : "Missing / Too short (-8 pts)"}</span>
                                    </div>
                                    {titleLength <= 5 && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Add a homepage &lt;title&gt; element between 50-60 characters featuring core target search keywords.
                                      </p>
                                    )}
                                  </li>

                                  {/* Meta Description */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {descLength > 15 ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>Meta Description Tag: {descLength > 15 ? "Configured (+8 pts)" : "Missing / Empty (-8 pts)"}</span>
                                    </div>
                                    {descLength <= 15 && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Write a compelling &lt;meta name="description"&gt; snippet between 150-160 characters ending in a clear CTA.
                                      </p>
                                    )}
                                  </li>

                                  {/* Headings */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {h1Count === 1 ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : h1Count === 0 ? (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      ) : (
                                        <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                                      )}
                                      <span>H1 Headers Hierarchy: {h1Count === 1 ? "Passed (+8 pts)" : h1Count === 0 ? "Missing H1 (-8 pts)" : `Multiple H1 tags (${h1Count}) (-4 pts)`}</span>
                                    </div>
                                    {h1Count === 0 ? (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Declare your primary landing page headline inside a single &lt;h1&gt; block.
                                      </p>
                                    ) : h1Count > 1 ? (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Convert secondary &lt;h1&gt; tags to &lt;h2&gt; or &lt;h3&gt; subheadings to focus crawler relevance.
                                      </p>
                                    ) : null}
                                  </li>

                                  {/* Image Alts */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {missingAltsCount === 0 ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>Image Alt attributes check: {missingAltsCount === 0 ? "Passed (+8 pts)" : `${missingAltsCount} missing alt tags (-8 pts)`}</span>
                                    </div>
                                    {missingAltsCount > 0 && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Add descriptive alt="..." text attributes to all image elements (e.g. &lt;img src="..." alt="Description"&gt;).
                                      </p>
                                    )}
                                  </li>

                                  {/* Schema */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {hasSchema ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>Structured Schema Data: {hasSchema ? "Local Schema detected (+15 pts)" : "Missing Schema (-15 pts)"}</span>
                                    </div>
                                    {!hasSchema && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Build and embed a JSON-LD structured script (e.g., LocalBusiness or Organization schema) in page headers.
                                      </p>
                                    )}
                                  </li>

                                  {/* Call to Actions */}
                                  <li className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-250 font-bold">
                                      {item.seoAudit.ctaPresence ? (
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                      )}
                                      <span>Lead capturing call to actions: {item.seoAudit.ctaPresence ? "CTAs Found (+10 pts)" : "None detected (-10 pts)"}</span>
                                    </div>
                                    {!item.seoAudit.ctaPresence && (
                                      <p className="pl-6.5 text-[10.5px] text-slate-400 leading-normal">
                                        Action needed: Add high-visibility CTA links or lead capture form buttons in primary view sections.
                                      </p>
                                    )}
                                  </li>

                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Critical and High Priorities */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-red-500/5 dark:bg-red-950/10 border border-red-200 dark:border-red-900/40 p-5 rounded-2xl space-y-3">
                          <h5 className="font-extrabold uppercase text-[10px] text-red-600 dark:text-red-400 tracking-wider flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" /> Critical Findings
                          </h5>
                          <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300 font-semibold">
                            {item.seoAudit.criticalFindings?.map((f: string, i: number) => (
                              <li key={i}>{f}</li>
                            )) || <li>None detected.</li>}
                          </ul>
                        </div>

                        <div className="bg-amber-500/5 dark:bg-amber-950/10 border border-amber-250 dark:border-amber-900/30 p-5 rounded-2xl space-y-3">
                          <h5 className="font-extrabold uppercase text-[10px] text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" /> High Findings
                          </h5>
                          <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300 font-semibold">
                            {item.seoAudit.highFindings?.map((f: string, i: number) => (
                              <li key={i}>{f}</li>
                            )) || <li>None detected.</li>}
                          </ul>
                        </div>
                      </div>

                      {/* Medium & Good signals */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-100/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3">
                          <h5 className="font-extrabold uppercase text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">Medium Issues</h5>
                          <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300 font-semibold">
                            {item.seoAudit.mediumFindings?.map((f: string, i: number) => (
                              <li key={i}>{f}</li>
                            )) || <li>None</li>}
                          </ul>
                        </div>

                        <div className="bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 p-5 rounded-2xl space-y-3">
                          <h5 className="font-extrabold uppercase text-[10px] text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> Good Scores
                          </h5>
                          <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300 font-semibold">
                            {item.seoAudit.goodFindings?.map((f: string, i: number) => (
                              <li key={i}>{f}</li>
                            )) || <li>None</li>}
                          </ul>
                        </div>
                      </div>

                      {/* Quick Wins */}
                      <div className="bg-teal-500/5 dark:bg-teal-950/10 border border-teal-200 dark:border-teal-900/40 p-5 rounded-2xl space-y-2">
                        <h5 className="font-extrabold uppercase text-[10px] text-teal-600 dark:text-teal-400 tracking-wider">Quick Wins & Recommendations</h5>
                        <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300 font-semibold">
                          {item.seoAudit.quickWins?.map((f: string, i: number) => (
                            <li key={i}>{f}</li>
                          )) || <li>None</li>}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* 2. Social Media expanded report */}
                  {item.type === "social" && item.socialAudit && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-2">
                          <h5 className="font-black uppercase text-[10px] text-slate-400 tracking-wider">Branding & Bio Analysis</h5>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                            {item.socialAudit.brandingAnalysis}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-2">
                          <h5 className="font-black uppercase text-[10px] text-slate-400 tracking-wider">Audience & Engagement</h5>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                            {item.socialAudit.engagementAnalysis}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-amber-500/5 dark:bg-amber-950/10 border border-amber-250 dark:border-amber-900/30 p-5 rounded-2xl space-y-3">
                          <h5 className="font-extrabold uppercase text-[10px] text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" /> Growth Opportunities
                          </h5>
                          <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300 font-semibold">
                            {item.socialAudit.growthOpportunities?.map((f: string, i: number) => (
                              <li key={i}>{f}</li>
                            )) || <li>None</li>}
                          </ul>
                        </div>

                        <div className="bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 p-5 rounded-2xl space-y-3">
                          <h5 className="font-extrabold uppercase text-[10px] text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> Branding Recommendations
                          </h5>
                          <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300 font-semibold">
                            {item.socialAudit.recommendations?.map((f: string, i: number) => (
                              <li key={i}>{f}</li>
                            )) || <li>None</li>}
                          </ul>
                        </div>
                      </div>

                      {/* 30-day content plan */}
                      {item.socialAudit.contentPlan && item.socialAudit.contentPlan.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4">
                          <h5 className="font-black uppercase text-[10px] text-slate-400 tracking-wider">30-Day Content Roadmap Plan</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                                  <th className="pb-2 pr-4">Days</th>
                                  <th className="pb-2 pr-4">Topic / Theme</th>
                                  <th className="pb-2 pr-4">Format</th>
                                  <th className="pb-2">Suggested Caption</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {item.socialAudit.contentPlan.map((day: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                    <td className="py-3 pr-4 font-bold text-slate-900 dark:text-slate-100">{day.day}</td>
                                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-350 font-semibold">{day.topic}</td>
                                    <td className="py-3 pr-4">
                                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-600 text-[9px] font-black uppercase">
                                        {day.format}
                                      </span>
                                    </td>
                                    <td className="py-3 text-slate-500 dark:text-slate-400 italic">"{day.caption}"</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Google Business expanded report */}
                  {item.type === "gmb" && item.googleBusinessAudit && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Completeness</span>
                          <span className="text-xl font-black text-teal-500">{item.googleBusinessAudit.completeness}%</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Average Rating</span>
                          <span className="text-xl font-black text-amber-500 flex items-center justify-center gap-1">
                            {item.googleBusinessAudit.ratings} <Star className="h-4.5 w-4.5 fill-amber-500 text-amber-500" />
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Local SEO Readiness</span>
                          <span className="text-xl font-black text-emerald-500">{item.googleBusinessAudit.localSEOReadiness}%</span>
                        </div>
                      </div>

                      {/* Reviews Summary */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3">
                        <h5 className="font-black uppercase text-[10px] text-slate-400 tracking-wider">Reviews Sentiment Feedback</h5>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                          {item.googleBusinessAudit.reviews?.reviewsSummary}
                        </p>
                        {item.googleBusinessAudit.reviews?.total && (
                          <div className="flex gap-4 text-[10px] font-bold uppercase text-slate-400">
                            <span>Total Reviews: {item.googleBusinessAudit.reviews.total}</span>
                            <span className="text-emerald-500">Positive: {item.googleBusinessAudit.reviews.positive}</span>
                            <span className="text-rose-500">Negative: {item.googleBusinessAudit.reviews.negative}</span>
                          </div>
                        )}
                      </div>

                      {/* GMB Recommendations */}
                      <div className="bg-teal-500/5 dark:bg-teal-950/10 border border-teal-200 dark:border-teal-900/40 p-5 rounded-2xl space-y-2">
                        <h5 className="font-extrabold uppercase text-[10px] text-teal-600 dark:text-teal-400 tracking-wider">Local SEO Recommendations</h5>
                        <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300 font-semibold">
                          {item.googleBusinessAudit.recommendations?.map((f: string, i: number) => (
                            <li key={i}>{f}</li>
                          )) || <li>None</li>}
                        </ul>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
}
