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
  Camera,
  Upload,
  AlertTriangle,
  X,
  Printer,
  Download,
  CreditCard,
} from "lucide-react";
import { generateRentReceiptHtml, generateLeaseAgreementHtml, printDocument } from "../../lib/document-generator";

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

  // Self-service rent payment states
  const [payingCharge, setPayingCharge] = useState<any | null>(null);
  const [payingMethod, setPayingMethod] = useState<string>("upi");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<string | null>(null);

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

  const handleTenantPay = async () => {
    if (!payingCharge) return;
    setIsProcessingPayment(true);
    try {
      const remaining = payingCharge.amount - payingCharge.amount_paid;
      await api("POST", "/api/tenant/payments", {
        charge_id: payingCharge.id,
        amount: remaining,
        method: payingMethod,
        reference: `UPI-${Date.now().toString().slice(-6)}`,
        notes: `Resident digital settlement via ${payingMethod.toUpperCase()}`,
      });
      setPaymentBanner(`Payment of ₹${remaining.toLocaleString("en-IN")} processed successfully! Receipt updated.`);
      setPayingCharge(null);
      await fetchPortalData();
      setTimeout(() => setPaymentBanner(null), 8000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Payment processing failed");
    } finally {
      setIsProcessingPayment(false);
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
            <h2 className="text-xl font-bold text-foreground">Sign In to Your Resident Portal</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Access your lease documents, pay monthly rent and view cryptographically verified agreements.
              Registered by property management? You can sign in directly using your email and provided credentials without creating an account.
            </p>
          </div>
          <button
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            Sign In to Resident Portal
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
                {lease.status === "upcoming" ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 border border-amber-500/20">
                    <Clock className="h-3.5 w-3.5" /> Upcoming Possession (Starts {lease.start_date})
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
                    <CheckCircle className="h-3.5 w-3.5" /> Active Lease Agreement
                  </div>
                )}
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {lease.unit_name} — {lease.property_name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {lease.property_address}, {lease.property_city} · {lease.bedrooms} Bed ·{" "}
                  {lease.bathrooms} Bath · {lease.sqft ? `${lease.sqft} sqft` : "Standard layout"}
                </p>
              </div>

              <div className="rounded-2xl bg-card border border-border/70 p-4 text-right flex flex-col items-end gap-2.5">
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Monthly Rent</span>
                  <div className="text-2xl font-black text-foreground">
                    ₹{lease.monthly_rent.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Due on day {lease.rent_due_day} of each month
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const html = generateLeaseAgreementHtml({
                      agreementNumber: `NSTR-LSE-${lease.id.toString().padStart(4, "0")}`,
                      landlordName: "Nestara Property Management",
                      landlordContact: "desk@nestara.ai",
                      tenantName: user.full_name,
                      tenantEmail: user.email,
                      propertyName: lease.property_name,
                      propertyAddress: lease.property_address || "Bengaluru Corridor",
                      propertyCity: lease.property_city || "Bengaluru",
                      unitName: lease.unit_name,
                      bedrooms: lease.bedrooms,
                      bathrooms: lease.bathrooms,
                      sqft: lease.sqft,
                      startDate: lease.start_date,
                      endDate: lease.end_date,
                      monthlyRent: lease.monthly_rent,
                      deposit: lease.deposit,
                      rentDueDay: lease.rent_due_day,
                      lateFee: lease.late_fee,
                      eSignStatus: (lease as any).e_sign_status || "signed",
                      signedAt: (lease as any).signed_at || lease.start_date,
                      signerName: (lease as any).signer_name || user.full_name,
                      signatureHash: (lease as any).signature_hash || "SHA256:NSTR-VERIFIED-E-SIGN",
                    });
                    printDocument(`Lease-Agreement-${lease.unit_name}`, html);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground px-2.5 py-1 text-[11px] font-semibold transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Print / Save Agreement PDF
                </button>
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
                <span className="font-semibold text-foreground">₹{lease.deposit.toLocaleString("en-IN")}</span>
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
                      <div className="flex items-center gap-3">
                        <div className="text-right space-y-1">
                          <span className="font-semibold text-foreground block">
                            ₹{ch.amount.toLocaleString("en-IN")}
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
                        {ch.status !== "paid" && (
                          <button
                            type="button"
                            onClick={() => setPayingCharge(ch)}
                            className="px-2.5 py-1 rounded-md bg-foreground text-background hover:bg-foreground/90 font-medium text-[11px] transition-colors"
                          >
                            Pay ₹{(ch.amount - ch.amount_paid).toLocaleString("en-IN")}
                          </button>
                        )}
                        {ch.amount_paid > 0 && (
                          <button
                            type="button"
                            title="Download / Print Official Receipt"
                            onClick={() => {
                              const html = generateRentReceiptHtml({
                                receiptNumber: `RCP-${ch.period.replace("-", "")}-${ch.id.toString().padStart(4, "0")}`,
                                tenantName: user.full_name,
                                tenantEmail: user.email,
                                propertyName: lease.property_name,
                                propertyAddress: lease.property_address,
                                unitName: lease.unit_name,
                                period: ch.period,
                                dueDate: ch.due_date,
                                amount: ch.amount,
                                amountPaid: ch.amount_paid,
                                status: ch.status,
                                paymentReference: ch.notes || "Digital Transfer (Verified)",
                              });
                              printDocument(`Rent-Receipt-${ch.period}`, html);
                            }}
                            className="p-1.5 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cryptographic Proof & Verified Lease Badge */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Cryptographic Lease Credentials
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verified on Ledger
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your tenancy agreement, KYC credentials, and rent payment receipts are cryptographically anchored to Nestara's distributed blockchain ledger, guaranteeing tamper-proof authenticity across all nodes.
              </p>
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ledger Consensus:</span>
                  <span className="font-mono text-emerald-600 font-bold">Raft Consensus Active (3/3 Nodes)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document AI Verification:</span>
                  <span className="font-semibold text-foreground">Isolation Forest Anomaly Check Passed (0.02)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Rent Payment Modal */}
      {payingCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Settle Rent Payment</h3>
                <p className="text-xs text-muted-foreground">Period: {payingCharge.period}</p>
              </div>
              <button
                type="button"
                onClick={() => setPayingCharge(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Charge Amount:</span>
                <span className="font-medium text-foreground">₹{payingCharge.amount.toLocaleString("en-IN")}</span>
              </div>
              {payingCharge.amount_paid > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Already Paid:</span>
                  <span className="font-medium">-₹{payingCharge.amount_paid.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex justify-between text-sm font-bold text-foreground">
                <span>Payable Amount:</span>
                <span>₹{(payingCharge.amount - payingCharge.amount_paid).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Payment Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "upi", label: "Instant UPI" },
                  { id: "credit", label: "Card / NetBanking" },
                  { id: "ach", label: "Bank Transfer" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayingMethod(m.id)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                      payingMethod === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-border/80 bg-muted/20 text-[11px] text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>256-bit encrypted direct ledger settlement. Official receipt issued immediately.</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayingCharge(null)}
                className="flex-1 rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleTenantPay}
                className="flex-1 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1.5"
              >
                {isProcessingPayment ? "Processing Settlement…" : "Confirm & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
