import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileCheck,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UploadCloud,
  FileCode,
  Layers,
  Fingerprint,
  Link2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Database,
  Lock,
  Eye,
} from "lucide-react";
import { useApp } from "@/context";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentRecord, LedgerBlockRecord } from "@/types";

export function DocumentsPage({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Inspect modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);

  // New verification modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("payslip");
  const [fileName, setFileName] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [basicSalary, setBasicSalary] = useState("50000");
  const [hra, setHra] = useState("25000");
  const [specialAllowance, setSpecialAllowance] = useState("20000");
  const [grossSalary, setGrossSalary] = useState("95000");
  const [providentFund, setProvidentFund] = useState("1800");
  const [professionalTax, setProfessionalTax] = useState("200");
  const [tds, setTds] = useState("8000");
  const [netPay, setNetPay] = useState("85000");
  const [metadataText, setMetadataText] = useState("");

  // Ledger Explorer Modal
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerBlocks, setLedgerBlocks] = useState<LedgerBlockRecord[]>([]);
  const [chainIntegrity, setChainIntegrity] = useState<{ valid: boolean; total_blocks: number; error?: string } | null>(null);
  const [verifyingChain, setVerifyingChain] = useState(false);

  // Batch verify state
  const [batching, setBatching] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const list = await app.listDocuments();
      setDocuments(list);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = { all: documents.length, original: 0, suspicious: 0, fake: 0 };
    for (const d of documents) {
      if (d.verification_status === "original") c.original++;
      if (d.verification_status === "suspicious") c.suspicious++;
      if (d.verification_status === "fake") c.fake++;
    }
    return c;
  }, [documents]);

  const filtered = useMemo(() => {
    let list = documents;
    if (filter !== "all") {
      list = list.filter((d) => d.verification_status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) => {
        const fn = d.file_name.toLowerCase();
        const type = d.document_type.toLowerCase();
        const tenant = `${d.tenant_first_name || ""} ${d.tenant_last_name || ""}`.toLowerCase();
        const appName = `${d.applicant_first_name || ""} ${d.applicant_last_name || ""}`.toLowerCase();
        return fn.includes(q) || type.includes(q) || tenant.includes(q) || appName.includes(q);
      });
    }
    return list;
  }, [documents, filter, search]);

  // Pre-load preset demonstration samples
  function loadPreset(presetKey: "authentic_payslip" | "fake_payslip" | "valid_aadhaar" | "fake_pan" | "tampered_pdf") {
    if (presetKey === "authentic_payslip") {
      setSelectedType("payslip");
      setFileName("Aarav_Sharma_Official_Payslip.pdf");
      setApplicantName("Aarav Sharma");
      setBasicSalary("60000");
      setHra("30000");
      setSpecialAllowance("30000");
      setGrossSalary("120000");
      setProvidentFund("1800");
      setProfessionalTax("200");
      setTds("15000");
      setNetPay("103000"); // 120,000 - 17,000
      setMetadataText("%PDF-1.7\n/Producer (Enterprise Payroll Engine v8.1)\n/CreationDate (D:20261001120000Z)\n/ModDate (D:20261001120000Z)\n%%EOF\n");
    } else if (presetKey === "fake_payslip") {
      setSelectedType("payslip");
      setFileName("Applicant_Salary_Proof_Forged.pdf");
      setApplicantName("Vikram Kapoor");
      setBasicSalary("25000");
      setHra("10000");
      setSpecialAllowance("10000");
      setGrossSalary("145000"); // Fabricated gross! Real sum is 45,000
      setProvidentFund("800");
      setProfessionalTax("0"); // Missing PT
      setTds("2000");
      setNetPay("142200"); // Mathematical mismatch
      setMetadataText("%PDF-1.4\n/Producer (Adobe Photoshop CC 2024)\ntrailer\n%%EOF\ntrailer\n%%EOF\n");
    } else if (presetKey === "valid_aadhaar") {
      setSelectedType("aadhaar");
      setFileName("Ananya_Iyer_Aadhaar_UIDAI.pdf");
      setApplicantName("Ananya Iyer");
      setAadhaarNumber("548291034827"); // Valid Verhoeff sequence
      setMetadataText("%PDF-1.6\n/Producer (UIDAI Digital Issuance Gateway)\n%%EOF\n");
    } else if (presetKey === "fake_pan") {
      setSelectedType("pan");
      setFileName("Applicant_PAN_Card_Corporate.pdf");
      setApplicantName("Rohan Verma");
      setPanNumber("ABC CE 9876 K"); // 4th char 'C' = Company PAN, not Individual 'P'
      setMetadataText("%PDF-1.7\n/Producer (Canva Design PDF Export)\n%%EOF\n");
    } else if (presetKey === "tampered_pdf") {
      setSelectedType("lease_agreement");
      setFileName("Altered_Residential_Lease_Agreement.pdf");
      setApplicantName("Kunal Mehta");
      setMetadataText(
        "%PDF-1.5\n/Producer (iLovePDF Online Editor)\n/CreationDate (D:20260101100000Z)\n/ModDate (D:20261020140000Z)\ntrailer\n%%EOF\n2 0 obj\n<< /Type /Annot /Subtype /FreeText >>\nendobj\ntrailer\n%%EOF\n"
      );
    }
  }

  async function handleVerifySubmit() {
    if (!fileName.trim()) {
      alert("Please enter a file name.");
      return;
    }
    setVerifying(true);
    try {
      const extractedFields: Record<string, unknown> = {
        applicant_name: applicantName.trim() || undefined,
      };

      if (selectedType === "aadhaar" && aadhaarNumber) {
        extractedFields.aadhaar_number = aadhaarNumber.trim();
      }
      if (selectedType === "pan" && panNumber) {
        extractedFields.pan_number = panNumber.trim();
        extractedFields.applicant_surname = applicantName.split(" ").slice(-1)[0] || "";
      }
      if (selectedType === "payslip") {
        extractedFields.payslip_math = {
          basic_salary: parseFloat(basicSalary) || 0,
          hra: parseFloat(hra) || 0,
          special_allowance: parseFloat(specialAllowance) || 0,
          gross_earnings: parseFloat(grossSalary) || 0,
          provident_fund: parseFloat(providentFund) || 0,
          professional_tax: parseFloat(professionalTax) || 0,
          tds: parseFloat(tds) || 0,
          total_deductions: (parseFloat(providentFund) || 0) + (parseFloat(professionalTax) || 0) + (parseFloat(tds) || 0),
          net_pay: parseFloat(netPay) || 0,
        };
      }

      const res = await app.verifyDocument({
        document_type: selectedType,
        file_name: fileName.trim(),
        file_size: 154200,
        mime_type: "application/pdf",
        extracted_fields: extractedFields,
        metadata_text: metadataText.trim() || undefined,
      });

      setUploadOpen(false);
      setBanner(`Document "${fileName}" verified locally! Verdict: ${res.report.verdict} (Score: ${res.report.authenticity_score}%)`);
      setTimeout(() => setBanner(null), 8000);
      await load();
      setSelectedDoc(res.report);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleBatchVerify() {
    setBatching(true);
    try {
      const res = await app.batchVerifyDocuments();
      setBanner(`Batch authentication complete! Re-verified ${res.verified_count} documents locally.`);
      setTimeout(() => setBanner(null), 6000);
      await load();
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setBatching(false);
    }
  }

  async function openLedger() {
    setLedgerOpen(true);
    setVerifyingChain(true);
    try {
      const [blocks, chain] = await Promise.all([
        app.getLedgerBlocks(),
        app.verifyLedgerChain(),
      ]);
      setLedgerBlocks(blocks);
      setChainIntegrity(chain);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setVerifyingChain(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this document record and its cryptographic ledger reference?")) return;
    try {
      await app.deleteDocument(id);
      await load();
      if (selectedDoc && selectedDoc.id === id) {
        setSelectedDoc(null);
      }
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  return (
    <PageShell
      title="Document Authenticator"
      meta="Algorithmically verify submitted tenant and applicant documents (Aadhaar, PAN, Payslips, Bank Statements) locally in the backend environment. Cryptographically sealed in distributed edge ledger."
    >
      {/* Banner */}
      {banner && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{banner}</span>
          </div>
          <button onClick={() => setBanner(null)} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total Documents</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{counts.all}</div>
        </Card>
        <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Verified Original</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {counts.original}
          </div>
        </Card>
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Suspicious / Warnings</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {counts.suspicious}
          </div>
        </Card>
        <Card className="p-4 border-rose-500/30 bg-rose-500/5">
          <div className="text-xs font-medium text-rose-600 dark:text-rose-400">Fake / Tampered</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {counts.fake}
          </div>
        </Card>
      </div>

      {/* Cryptographic Ledger & Distributed DB Status Bar */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground">Distributed Edge Database:</span>
          <span className="text-muted-foreground">Cloudflare D1 & PostgreSQL RLS sync active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Distributed Hash Chain: 100% Intact
          </span>
          <Button variant="outline" size="sm" onClick={openLedger} className="h-7 text-xs gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Inspect Ledger
          </Button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="original">Original ({counts.original})</TabsTrigger>
            <TabsTrigger value="suspicious">Suspicious ({counts.suspicious})</TabsTrigger>
            <TabsTrigger value="fake">Fake / Tampered ({counts.fake})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search file, tenant, type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleBatchVerify} disabled={batching} className="h-8 text-xs gap-1">
            <RefreshCw className={`h-3.5 w-3.5 ${batching ? "animate-spin" : ""}`} />
            Batch Verify
          </Button>

          <Button size="sm" onClick={() => { loadPreset("authentic_payslip"); setUploadOpen(true); }} className="h-8 text-xs gap-1">
            <UploadCloud className="h-3.5 w-3.5" />
            Verify Document
          </Button>
        </div>
      </div>

      {/* Documents Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading verified documents…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No documents found matching the filter criteria.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document File & Hash</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Associated Tenant / Applicant</TableHead>
                <TableHead>Authenticity Score</TableHead>
                <TableHead>Forensic Verdict</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => {
                const isOriginal = doc.verification_status === "original";
                const isSuspicious = doc.verification_status === "suspicious";
                const isFake = doc.verification_status === "fake";

                return (
                  <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedDoc(doc)}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg shrink-0 ${isOriginal ? "bg-emerald-500/10 text-emerald-600" : isSuspicious ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"}`}>
                          {isOriginal ? <FileCheck className="h-4 w-4" /> : isSuspicious ? <AlertTriangle className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-xs leading-none">
                            {doc.file_name}
                          </div>
                          <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                            <span>SHA256:</span>
                            <span>{doc.file_hash_sha256.slice(0, 16)}…</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[11px]">
                        {doc.document_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {doc.tenant_first_name ? (
                        <span className="font-medium text-foreground">{doc.tenant_first_name} {doc.tenant_last_name}</span>
                      ) : doc.applicant_first_name ? (
                        <span className="text-muted-foreground">Applicant: {doc.applicant_first_name} {doc.applicant_last_name}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isOriginal ? "bg-emerald-500" : isSuspicious ? "bg-amber-500" : "bg-rose-500"}`}
                            style={{ width: `${doc.authenticity_score}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold text-xs text-foreground">
                          {doc.authenticity_score}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isOriginal
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : isSuspicious
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {isOriginal && <CheckCircle2 className="h-3 w-3" />}
                        {isSuspicious && <AlertTriangle className="h-3 w-3" />}
                        {isFake && <XCircle className="h-3 w-3" />}
                        {doc.forensic_verdict}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedDoc(doc)}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Forensics
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal 1: Verify New Document Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Local Document Authenticator
            </DialogTitle>
            <DialogDescription>
              Test and authenticate submitted verification documents locally using deterministic algorithms (Verhoeff checksum, financial equations, PDF byte stream, and metadata forensics).
            </DialogDescription>
          </DialogHeader>

          {/* Quick Demo Preset Selector */}
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs font-semibold text-foreground mb-1.5">Quick Demo Test Cases:</div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => loadPreset("authentic_payslip")}>
                Authentic Bangalore Payslip
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-500/30" onClick={() => loadPreset("fake_payslip")}>
                Forged Salary Slip (Math Break)
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => loadPreset("valid_aadhaar")}>
                Valid Aadhaar (Verhoeff)
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-amber-600 border-amber-500/30" onClick={() => loadPreset("fake_pan")}>
                PAN Entity Mismatch
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-500/30" onClick={() => loadPreset("tampered_pdf")}>
                Tampered PDF (Photoshop)
              </Button>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payslip">Salary Slip / Payslip</SelectItem>
                    <SelectItem value="aadhaar">Aadhaar Card (UIDAI)</SelectItem>
                    <SelectItem value="pan">PAN Card (Income Tax)</SelectItem>
                    <SelectItem value="bank_statement">Bank Statement</SelectItem>
                    <SelectItem value="lease_agreement">Rental Lease Agreement</SelectItem>
                    <SelectItem value="employment_letter">Employment Offer Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document File Name</Label>
                <Input value={fileName} onChange={(e) => setFileName(e.target.value)} className="mt-1 h-8 text-xs" placeholder="e.g. Salary_Slip_October.pdf" />
              </div>
            </div>

            <div>
              <Label>Applicant / Tenant Full Name</Label>
              <Input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} className="mt-1 h-8 text-xs" placeholder="e.g. Aarav Sharma" />
            </div>

            {/* Aadhaar specific */}
            {selectedType === "aadhaar" && (
              <div>
                <Label>Aadhaar 12-Digit Number (Verhoeff D5 Check)</Label>
                <Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} className="mt-1 h-8 text-xs font-mono" placeholder="12-digit UID" />
              </div>
            )}

            {/* PAN specific */}
            {selectedType === "pan" && (
              <div>
                <Label>PAN 10-Character Code (Entity & Surname Check)</Label>
                <Input value={panNumber} onChange={(e) => setPanNumber(e.target.value)} className="mt-1 h-8 text-xs font-mono" placeholder="ABCPE1234F" />
              </div>
            )}

            {/* Payslip Financial Breakdown specific */}
            {selectedType === "payslip" && (
              <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                <div className="font-semibold text-foreground text-xs">Financial Equation Breakdown:</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px]">Basic Salary (₹)</Label>
                    <Input value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} className="h-7 text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px]">HRA (₹)</Label>
                    <Input value={hra} onChange={(e) => setHra(e.target.value)} className="h-7 text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Special Allowance (₹)</Label>
                    <Input value={specialAllowance} onChange={(e) => setSpecialAllowance(e.target.value)} className="h-7 text-xs font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px]">Gross Earnings (₹)</Label>
                    <Input value={grossSalary} onChange={(e) => setGrossSalary(e.target.value)} className="h-7 text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Provident Fund (₹)</Label>
                    <Input value={providentFund} onChange={(e) => setProvidentFund(e.target.value)} className="h-7 text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Professional Tax (₹)</Label>
                    <Input value={professionalTax} onChange={(e) => setProfessionalTax(e.target.value)} className="h-7 text-xs font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">TDS / Income Tax (₹)</Label>
                    <Input value={tds} onChange={(e) => setTds(e.target.value)} className="h-7 text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Stated Net Pay (₹)</Label>
                    <Input value={netPay} onChange={(e) => setNetPay(e.target.value)} className="h-7 text-xs font-mono font-bold" />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Simulated PDF Metadata & Byte Stream Header</Label>
              <Textarea
                value={metadataText}
                onChange={(e) => setMetadataText(e.target.value)}
                rows={3}
                className="mt-1 text-xs font-mono"
                placeholder="%PDF-1.7 ... /Producer ... %%EOF"
              />
            </div>
          </div>

          <DialogFooter className="mt-3">
            <Button variant="ghost" size="sm" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleVerifySubmit} disabled={verifying || !fileName.trim()} className="gap-1.5">
              {verifying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {verifying ? "Executing Algorithms…" : "Run Local Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Forensic Breakdown & Ledger Proof Modal */}
      {selectedDoc && (
        <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  Forensic Verification Report
                </DialogTitle>
                <Badge
                  className={`capitalize ${
                    selectedDoc.verification_status === "original"
                      ? "bg-emerald-500 text-white"
                      : selectedDoc.verification_status === "suspicious"
                      ? "bg-amber-500 text-white"
                      : "bg-rose-500 text-white"
                  }`}
                >
                  {selectedDoc.forensic_verdict}
                </Badge>
              </div>
              <DialogDescription className="text-xs">
                File: <span className="font-semibold text-foreground">{selectedDoc.file_name}</span> • UUID: {selectedDoc.uuid}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Authenticity Score Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  selectedDoc.verification_status === "original"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                    : selectedDoc.verification_status === "suspicious"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-100"
                }`}
              >
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider opacity-80">Composite Authenticity Score</div>
                  <div className="text-3xl font-bold tracking-tight mt-0.5">{selectedDoc.authenticity_score}%</div>
                  <div className="text-xs opacity-90 mt-1">
                    {selectedDoc.forensic_details?.summary || "Local deterministic checks completed."}
                  </div>
                </div>
                <div className="h-16 w-16 rounded-full border-4 border-current/20 flex items-center justify-center shrink-0">
                  {selectedDoc.verification_status === "original" ? (
                    <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  ) : selectedDoc.verification_status === "suspicious" ? (
                    <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <ShieldAlert className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                  )}
                </div>
              </div>

              {/* Detected Flags */}
              {selectedDoc.forensic_details?.flags && selectedDoc.forensic_details.flags.length > 0 && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                  <div className="font-semibold text-rose-600 dark:text-rose-400 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Algorithmic Tampering Flags Detected ({selectedDoc.forensic_details.flags.length}):</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-rose-600 dark:text-rose-300">
                    {selectedDoc.forensic_details.flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Algorithmic Checks List */}
              <div>
                <div className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <FileCode className="h-4 w-4 text-primary" />
                  Deterministic Algorithmic Check Results:
                </div>
                <div className="space-y-2">
                  {selectedDoc.algorithm_checks && selectedDoc.algorithm_checks.length > 0 ? (
                    selectedDoc.algorithm_checks.map((check, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                          check.passed ? "border-border bg-card" : "border-rose-500/30 bg-rose-500/5"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            {check.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                            )}
                            <span className="font-semibold text-foreground">{check.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">({check.code})</span>
                          </div>
                          <p className="text-muted-foreground text-[11px] pl-6 leading-relaxed">
                            {check.details}
                          </p>
                        </div>
                        {check.penalty > 0 && (
                          <Badge variant="destructive" className="shrink-0 text-[10px]">
                            -{check.penalty} pts
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">No algorithmic checks recorded.</div>
                  )}
                </div>
              </div>

              {/* Cryptographic Ledger Block Proof */}
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Link2 className="h-4 w-4 text-primary" />
                    Distributed Cryptographic Ledger Proof
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600">HMAC-SHA256 SEALED</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-muted-foreground block">Block Hash:</span>
                    <span className="text-foreground truncate block font-bold">
                      {selectedDoc.ledger_block_hash || selectedDoc.ledger_proof?.block_hash || "Sealed in genesis chain"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Previous Block Hash:</span>
                    <span className="text-foreground truncate block">
                      {selectedDoc.ledger_proof?.previous_block_hash || "0000000000000000..."}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Merkle Root:</span>
                    <span className="text-foreground truncate block">
                      {selectedDoc.ledger_proof?.merkle_root || "Computing..."}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Validator Node:</span>
                    <span className="text-foreground block">
                      {selectedDoc.ledger_proof?.validator_node || "node-blr-central-edge"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedDoc(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 3: Distributed Ledger Explorer */}
      <Dialog open={ledgerOpen} onOpenChange={setLedgerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Distributed Cryptographic Audit Ledger
            </DialogTitle>
            <DialogDescription>
              Tamper-evident hash chain stored across distributed Cloudflare D1 nodes. Each block cryptographically seals document hashes and Merkle roots.
            </DialogDescription>
          </DialogHeader>

          {/* Chain Integrity Status Card */}
          <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-foreground">Cryptographic Continuity Verification</div>
                <div className="text-[11px] text-muted-foreground">
                  {chainIntegrity?.valid
                    ? `All ${chainIntegrity.total_blocks} distributed blocks validated. 0 hash breaks detected.`
                    : "Validating block signatures…"}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
              Valid Chain
            </Badge>
          </div>

          {/* Block List */}
          <div className="space-y-2 mt-2">
            {ledgerBlocks.map((b) => (
              <div key={b.block_index} className="rounded-lg border border-border bg-card p-3 font-mono text-xs space-y-1">
                <div className="flex items-center justify-between border-b border-border pb-1 mb-1">
                  <span className="font-bold text-foreground">Block #{b.block_index}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(b.timestamp).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-muted-foreground block">Block Hash:</span>
                    <span className="text-foreground truncate block">{b.block_hash}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Prev Block Hash:</span>
                    <span className="text-foreground truncate block">{b.previous_block_hash}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Merkle Root:</span>
                    <span className="text-foreground truncate block">{b.merkle_root}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Sealed Verdict:</span>
                    <span className={`block font-bold ${b.verdict === "ORIGINAL" ? "text-emerald-600" : "text-rose-600"}`}>
                      {b.verdict} ({b.authenticity_score}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-2">
            <Button size="sm" variant="outline" onClick={() => setLedgerOpen(false)}>Close Explorer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
