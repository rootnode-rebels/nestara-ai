import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useAuth } from "../../hooks/use-auth";
import { PageShell } from "../page-shell";
import {
  Home,
  FileText,
  DollarSign,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Send,
  Calendar,
  ShieldCheck,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface TenantPortalData {
  tenant: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
  lease: {
    id: number;
    unit_id: number;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    deposit: number;
    rent_due_day: number;
    late_fee: number;
    status: string;
    unit_name: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number | null;
    property_name: string;
    property_address: string | null;
    property_city: string | null;
  } | null;
  charges: Array<{
    id: number;
    period: string;
    due_date: string;
    amount: number;
    amount_paid: number;
    status: string;
    notes: string | null;
  }>;
  work_orders: Array<{
    id: number;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    created_at: string;
    vendor_name: string | null;
  }>;
  applications?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    status: string;
    desired_move_in: string | null;
    created_at: string;
  }>;
}

export function TenantPortalPage({ navigate }: { navigate: (to: string) => void }) {
  const { user, openAuthModal } = useAuth();
  const [data, setData] = useState<TenantPortalData | null>(null);
  const [loading, setLoading] = useState(true);

  // Ticket Modal state
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketPriority, setTicketPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const fetchPortalData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api<TenantPortalData>("GET", "/api/tenant/portal");
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTicket(true);
    setTicketError(null);
    try {
      await api("POST", "/api/tenant/work-orders", {
        title: ticketTitle,
        description: ticketDesc,
        priority: ticketPriority,
      });
      setTicketTitle("");
      setTicketDesc("");
      setTicketPriority("normal");
      setTicketModalOpen(false);
      fetchPortalData();
    } catch (err: unknown) {
      setTicketError(err instanceof Error ? err.message : "Failed to create maintenance ticket");
    } finally {
      setSubmittingTicket(false);
    }
  };

  if (!user) {
    return (
      <PageShell title="Tenant Portal" width="max-w-4xl">
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/60 p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Home className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Sign In to Your Tenant Portal</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Access your lease documents, pay monthly rent, and submit maintenance repair requests.
            </p>
          </div>
          <button
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            Sign In / Register
          </button>
        </div>
      </PageShell>
    );
  }

  const lease = data?.lease;
  const charges = data?.charges || [];
  const workOrders = data?.work_orders || [];
  const applications = data?.applications || [];

  return (
    <PageShell
      title={`Resident Portal — ${user.full_name}`}
      meta={lease ? `${lease.unit_name} at ${lease.property_name}` : "Prospective Resident"}
      width="max-w-6xl"
    >
      {/* If No Active Lease Linked Yet */}
      {!lease ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">No Active Lease Associated</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                You are registered as a tenant account. Explore available portfolio properties to submit your rental application.
              </p>
            </div>
            <button
              onClick={() => navigate("/explore")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              Explore Available Units <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {applications.length > 0 && (
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Submitted Rental Applications ({applications.length})
              </h4>
              <div className="divide-y divide-border/50 text-xs">
                {applications.map((app) => (
                  <div key={app.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">
                        Application #{app.id}
                      </span>
                      <p className="text-muted-foreground text-[11px]">
                        Desired Move-In: {app.desired_move_in || "Immediate"}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary capitalize">
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Lease Hero Card */}
          <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
                  <CheckCircle className="h-3.5 w-3.5" /> Active Lease Agreement
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {lease.unit_name} — {lease.property_name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {lease.property_address}, {lease.property_city} · {lease.bedrooms} Bed ·{" "}
                  {lease.bathrooms} Bath · {lease.sqft ? `${lease.sqft} sqft` : "Standard layout"}
                </p>
              </div>

              <div className="rounded-2xl bg-card border border-border/70 p-4 text-right">
                <span className="text-xs text-muted-foreground font-medium">Monthly Rent</span>
                <div className="text-2xl font-black text-foreground">
                  ${lease.monthly_rent.toLocaleString()}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Due on day {lease.rent_due_day} of each month
                </span>
              </div>
            </div>

            {/* Lease Meta Grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="rounded-xl bg-background/50 p-3 border border-border/40">
                <span className="text-muted-foreground block text-[11px]">Lease Start</span>
                <span className="font-semibold text-foreground">{lease.start_date}</span>
              </div>
              <div className="rounded-xl bg-background/50 p-3 border border-border/40">
                <span className="text-muted-foreground block text-[11px]">Lease End</span>
                <span className="font-semibold text-foreground">{lease.end_date}</span>
              </div>
              <div className="rounded-xl bg-background/50 p-3 border border-border/40">
                <span className="text-muted-foreground block text-[11px]">Security Deposit</span>
                <span className="font-semibold text-foreground">${lease.deposit.toLocaleString()}</span>
              </div>
              <div className="rounded-xl bg-background/50 p-3 border border-border/40">
                <span className="text-muted-foreground block text-[11px]">Late Fee Grace</span>
                <span className="font-semibold text-foreground">5 Days</span>
              </div>
            </div>
          </div>

          {/* Dual Panel: Rent Charges & Maintenance Tickets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rent Ledger Tracker */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Rent Ledger & Payments
                </h3>
                <span className="text-xs text-muted-foreground">Recent cycles</span>
              </div>

              {charges.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No rent charges posted yet.
                </p>
              ) : (
                <div className="divide-y divide-border/50 text-xs">
                  {charges.map((ch) => (
                    <div key={ch.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-foreground">{ch.period}</span>
                        <p className="text-muted-foreground text-[11px]">Due: {ch.due_date}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="font-semibold text-foreground block">
                          ${ch.amount.toLocaleString()}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            ch.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : ch.status === "overdue"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          {ch.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Maintenance Work Orders */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-500" />
                  Maintenance & Repairs
                </h3>
                <button
                  onClick={() => setTicketModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Report Issue
                </button>
              </div>

              {workOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No active repair tickets. Everything looks great!
                </p>
              ) : (
                <div className="divide-y divide-border/50 text-xs">
                  {workOrders.map((wo) => (
                    <div key={wo.id} className="py-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground">{wo.title}</span>
                        <p className="text-muted-foreground text-[11px] line-clamp-1">
                          {wo.description || "No additional description"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            wo.priority === "urgent"
                              ? "bg-destructive/15 text-destructive font-bold"
                              : wo.priority === "high"
                              ? "bg-orange-500/15 text-orange-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {wo.priority}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground capitalize">
                          {wo.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Maintenance Ticket Dialog */}
      {ticketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <button
              onClick={() => setTicketModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            >
              <AlertCircle className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Report Maintenance Issue</h3>
                <p className="text-xs text-muted-foreground">Tied directly to your residence</p>
              </div>
            </div>

            {ticketError && (
              <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                {ticketError}
              </div>
            )}

            <form onSubmit={handleTicketSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Issue Summary *
                </label>
                <input
                  type="text"
                  required
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="e.g. Leaking kitchen faucet"
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Urgency / Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["low", "normal", "high", "urgent"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTicketPriority(p)}
                      className={`rounded-xl border p-2 text-center text-xs font-medium capitalize transition-all ${
                        ticketPriority === p
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Detailed Description
                </label>
                <textarea
                  rows={3}
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Provide context so the technician brings the correct tools..."
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingTicket}
                className="w-full mt-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                {submittingTicket ? "Submitting Dispatch…" : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Dispatch Work Order
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
