import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Filter,
  Inbox,
  Mail,
  Phone,
  Search,
  Trash2,
  UserCheck,
  UserX,
  FileSpreadsheet,
  ArrowRight,
  Briefcase,
  Calendar,
  Building,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { maskEmail, maskPhone, maskIncome, logPiiAccess } from "@/lib/privacy";
import { useApp } from "@/context";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/page-shell";
import type { Application, ApplicationStatus } from "@/types";

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; tone: string; badgeVariant: "default" | "secondary" | "outline" | "destructive" }
> = {
  new: { label: "New Application", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", badgeVariant: "secondary" },
  screening: { label: "Screening In Progress", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", badgeVariant: "outline" },
  approved: { label: "Approved", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", badgeVariant: "default" },
  declined: { label: "Declined", tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", badgeVariant: "destructive" },
  withdrawn: { label: "Withdrawn", tone: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20", badgeVariant: "outline" },
};

export function ApplicationsPage({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [maskPii, setMaskPii] = useState(true);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const list = await app.listApplications();
      setApplications(list);
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
    const c = { all: applications.length, new: 0, screening: 0, approved: 0, declined: 0 };
    for (const a of applications) {
      if (a.status === "new") c.new++;
      if (a.status === "screening") c.screening++;
      if (a.status === "approved") c.approved++;
      if (a.status === "declined") c.declined++;
    }
    return c;
  }, [applications]);

  const filtered = useMemo(() => {
    let list = applications;
    if (filter !== "all") {
      list = list.filter((a) => a.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        const name = `${a.first_name} ${a.last_name}`.toLowerCase();
        const email = (a.email || "").toLowerCase();
        const prop = (a.property_name || "").toLowerCase();
        const unit = (a.unit_name || "").toLowerCase();
        const employer = (a.employer || "").toLowerCase();
        return name.includes(q) || email.includes(q) || prop.includes(q) || unit.includes(q) || employer.includes(q);
      });
    }
    return list;
  }, [applications, filter, search]);

  async function handleStatusChange(id: number, status: ApplicationStatus) {
    try {
      await app.updateApplication(id, { status });
      await load();
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Are you sure you want to delete this rental application record?")) return;
    try {
      await app.deleteApplication(id);
      await load();
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp(null);
      }
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  async function handleSaveNotes() {
    if (!selectedApp) return;
    try {
      setSavingNotes(true);
      await app.updateApplication(selectedApp.id, { notes: editNotes });
      await load();
      setSelectedApp((prev) => (prev ? { ...prev, notes: editNotes } : null));
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setSavingNotes(false);
    }
  }

  function openDetails(appRecord: Application) {
    setSelectedApp(appRecord);
    setEditNotes(appRecord.notes || "");
  }

  return (
    <PageShell
      title="Rental Applications"
      meta="Review prospective tenant submissions from public discovery, manage screening workflows, and convert approved applicants into active leases."
    >
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total Inquiries</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{counts.all}</div>
        </Card>
        <Card className="p-4 border-blue-500/30 bg-blue-500/5">
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Needs Review</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{counts.new}</div>
        </Card>
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400">In Screening</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{counts.screening}</div>
        </Card>
        <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Approved</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{counts.approved}</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as ApplicationStatus | "all")}
          className="w-full sm:w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="new">
              New {counts.new > 0 && <span className="ml-1.5 rounded-full bg-blue-500 px-1.5 py-0.2 text-[10px] text-white font-bold">{counts.new}</span>}
            </TabsTrigger>
            <TabsTrigger value="screening">Screening ({counts.screening})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
            <TabsTrigger value="declined">Declined ({counts.declined})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (maskPii) {
                logPiiAccess("reveal_pii", "application", undefined, "Landlord revealed applicant PII in table");
              }
              setMaskPii(!maskPii);
            }}
            className="gap-1.5 text-xs h-9 shrink-0"
            title={maskPii ? "PII currently concealed. Click to reveal." : "Click to mask sensitive PII."}
          >
            {maskPii ? <EyeOff className="h-3.5 w-3.5 text-emerald-600" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
            <span>{maskPii ? "PII Masked" : "PII Visible"}</span>
          </Button>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search applicant, property…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Applications Table */}
      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading applications…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No applications match your criteria</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? "Try searching for a different applicant name or property." : "New rental applications submitted via the Discover Listings page will appear here."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Target Residence</TableHead>
                <TableHead>Financial Profile</TableHead>
                <TableHead>Move-in Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
                return (
                  <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-foreground">
                        {item.first_name} {item.last_name}
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mt-0.5">
                        {item.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />
                            {maskPii ? maskEmail(item.email) : item.email}
                          </span>
                        )}
                        {item.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {maskPii ? maskPhone(item.phone) : item.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium text-foreground">
                        {item.property_name || "Any Available Property"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.unit_name ? `Unit ${item.unit_name}` : "Pending assignment"}
                      </div>
                    </TableCell>

                    <TableCell>
                      {item.monthly_income ? (
                        <div className="font-medium tabular-nums text-foreground">
                          {maskPii ? maskIncome(item.monthly_income, app.settings.currency) : `${formatMoney(item.monthly_income, app.settings.currency)}/mo`}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not provided</span>
                      )}
                      {item.employer && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[140px]">{item.employer}</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-sm">
                      {item.desired_move_in ? (
                        <div className="flex items-center gap-1 text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(item.desired_move_in)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Flexible</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.tone)}>
                        {cfg.label}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openDetails(item)}>
                          Review
                        </Button>

                        {item.status === "approved" ? (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            onClick={() => navigate("/leases")}
                          >
                            Create Lease
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            {item.status !== "screening" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Start Screening Background Check"
                                onClick={() => handleStatusChange(item.id, "screening")}
                              >
                                Screen
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="Approve Applicant"
                              onClick={() => handleStatusChange(item.id, "approved")}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Decline Applicant"
                              onClick={() => handleStatusChange(item.id, "declined")}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Application Review & Notes Modal */}
      {selectedApp && (
        <Dialog open={selectedApp !== null} onOpenChange={(o) => { if (!o) setSelectedApp(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Application #{selectedApp.id}</span>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", STATUS_CONFIG[selectedApp.status]?.tone)}>
                  {STATUS_CONFIG[selectedApp.status]?.label}
                </span>
              </DialogTitle>
              <DialogDescription>
                Submitted on {formatDate(selectedApp.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block">Applicant Name</span>
                  <span className="font-semibold text-foreground text-sm">
                    {selectedApp.first_name} {selectedApp.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Desired Move-In</span>
                  <span className="font-medium text-foreground text-sm">
                    {selectedApp.desired_move_in ? formatDate(selectedApp.desired_move_in) : "Flexible"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Email</span>
                  <span className="font-medium text-foreground">{selectedApp.email || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Phone</span>
                  <span className="font-medium text-foreground">{selectedApp.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Stated Monthly Income</span>
                  <span className="font-semibold text-foreground text-sm">
                    {selectedApp.monthly_income ? `${formatMoney(selectedApp.monthly_income, app.settings.currency)}/mo` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Employer / Occupation</span>
                  <span className="font-medium text-foreground">{selectedApp.employer || "—"}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Target Property & Unit
                </label>
                <div className="p-2.5 rounded-lg border border-border bg-card text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{selectedApp.property_name || "Portfolio Residence"}</span>
                    {selectedApp.unit_name && <Badge variant="outline">Unit {selectedApp.unit_name}</Badge>}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Landlord / Leasing Notes & Screening Remarks
                </label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record background check results, credit score verification, or interview notes…"
                  rows={4}
                  className="text-xs"
                />
              </div>

              {/* Status Update Actions */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Update Application Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={selectedApp.status === "screening" ? "default" : "outline"}
                    onClick={() => handleStatusChange(selectedApp.id, "screening")}
                  >
                    Screening
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedApp.status === "approved" ? "default" : "outline"}
                    className={selectedApp.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-emerald-600"}
                    onClick={() => handleStatusChange(selectedApp.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedApp.status === "declined" ? "default" : "outline"}
                    className={selectedApp.status === "declined" ? "bg-rose-600 hover:bg-rose-700 text-white" : "text-rose-600"}
                    onClick={() => handleStatusChange(selectedApp.id, "declined")}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(selectedApp.id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete Record
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)}>
                  Close
                </Button>
                <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                  {savingNotes ? "Saving…" : "Save Notes"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
  );
}
