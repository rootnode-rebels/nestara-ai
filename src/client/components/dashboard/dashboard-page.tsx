import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Home,
  Receipt,
  Wrench,
} from "lucide-react";
import { useApp } from "@/context";
import { api } from "@/api";
import { cn, daysBetween, formatDate, formatMoney, toIsoDate } from "@/lib/utils";
import type { DashboardSummary } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/page-shell";

export function DashboardPage({ navigate }: { navigate: (to: string) => void }) {
  const { settings, setError } = useApp();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await api<DashboardSummary>("GET", "/api/dashboard/summary");
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setError]);

  if (loading || !summary) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  return (
    <PageShell
      title="Dashboard"
      meta={`Snapshot of ${new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}`}
    >

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            label="Occupancy"
            value={`${summary.occupancy_rate}%`}
            sub={`${summary.occupied} of ${summary.units} units`}
            icon={<Home className="h-4 w-4" />}
          />
          <KpiCard
            label="Active leases"
            value={String(summary.active_leases)}
            sub={summary.upcoming_move_outs ? `${summary.upcoming_move_outs} ending in 30 days` : "No upcoming move-outs"}
            icon={<ClipboardList className="h-4 w-4" />}
          />
          <KpiCard
            label="Outstanding rent"
            value={formatMoney(summary.month_outstanding, settings.currency)}
            sub={`${formatMoney(summary.month_collected, settings.currency)} collected this month`}
            icon={<Receipt className="h-4 w-4" />}
          />
          <KpiCard
            label="Open work orders"
            value={String(summary.open_work_orders)}
            sub={summary.urgent_work_orders ? `${summary.urgent_work_orders} urgent` : "Nothing urgent"}
            icon={<Wrench className="h-4 w-4" />}
            tone={summary.urgent_work_orders > 0 ? "warn" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Portfolio</h2>
              <button
                type="button"
                onClick={() => navigate("/properties")}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </button>
            </div>
            <OccupancyGauge rate={summary.occupancy_rate} occupied={summary.occupied} total={summary.units} />
            <dl className="mt-3 space-y-2 border-t border-border/60 pt-3 text-sm">
              <Row label="Active Properties" value={summary.properties} icon={<Building2 className="h-4 w-4" />} />
            </dl>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">This month's rent</h2>
              <button
                type="button"
                onClick={() => navigate("/rent")}
                className="text-xs font-medium text-primary hover:underline"
              >
                Open ledger
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Stat
                label="Collected"
                value={formatMoney(summary.month_collected, settings.currency)}
                tone="positive"
              />
              <Stat
                label="Outstanding"
                value={formatMoney(summary.month_outstanding, settings.currency)}
                tone={summary.month_outstanding > 0 ? "warn" : "default"}
              />
              <Stat
                label="Overdue"
                value={formatMoney(summary.overdue_total, settings.currency)}
                sub={summary.overdue_count ? `${summary.overdue_count} charge${summary.overdue_count === 1 ? "" : "s"}` : undefined}
                tone={summary.overdue_total > 0 ? "danger" : "default"}
              />
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Monthly Cashflow Realization</span>
                <span className="font-semibold text-foreground">
                  {summary.month_collected + summary.month_outstanding > 0
                    ? `${Math.round((summary.month_collected / (summary.month_collected + summary.month_outstanding)) * 100)}% collected`
                    : "100% collected"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden flex">
                <div
                  style={{ width: `${(summary.month_collected / Math.max(1, summary.month_collected + summary.month_outstanding)) * 100}%` }}
                  className="bg-emerald-600 h-full transition-all duration-500"
                />
                <div
                  style={{ width: `${(summary.month_outstanding / Math.max(1, summary.month_collected + summary.month_outstanding)) * 100}%` }}
                  className="bg-amber-500 h-full transition-all duration-500"
                />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Settled</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending</span>
                {summary.overdue_total > 0 && (
                  <span className="flex items-center gap-1.5 text-rose-600 font-medium"><span className="h-2 w-2 rounded-full bg-rose-600" /> Overdue Arrears</span>
                )}
              </div>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Open work orders</h2>
              <button
                type="button"
                onClick={() => navigate("/maintenance")}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </button>
            </div>
            {summary.recent_work_orders.length === 0 ? (
              <Empty icon={<CheckCircle2 className="h-5 w-5" />} title="All caught up" message="No open work orders right now." />
            ) : (
              <ul className="divide-y">
                {summary.recent_work_orders.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{w.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[w.property_name, w.unit_name].filter(Boolean).join(" · ") || "Unassigned"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={w.priority} />
                      <StatusBadge status={w.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Lease expirations</h2>
              <button
                type="button"
                onClick={() => navigate("/leases")}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </button>
            </div>
            {summary.upcoming_expirations.length === 0 ? (
              <Empty icon={<CheckCircle2 className="h-5 w-5" />} title="Nothing in the next 60 days" message="No lease expirations coming up." />
            ) : (
              <ul className="divide-y">
                {summary.upcoming_expirations.map((l) => {
                  const today = toIsoDate(new Date());
                  const days = daysBetween(today, l.end_date);
                  return (
                    <li key={l.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {l.tenant_first_name || "—"} {l.tenant_last_name || ""}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[l.property_name, l.unit_name].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <div className="font-medium text-foreground">{formatDate(l.end_date)}</div>
                          <div className={cn(
                            "text-muted-foreground",
                            days <= 14 && "text-destructive font-medium",
                          )}>
                            {days < 0 ? "Already ended" : days === 0 ? "Today" : `in ${days} day${days === 1 ? "" : "s"}`}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs shrink-0"
                          onClick={() => navigate("/leases")}
                        >
                          Renew
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>
    </PageShell>
  );
}


function OccupancyGauge({ rate, occupied, total }: { rate: number; occupied: number; total: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="flex items-center gap-4 py-2">
      <div className="relative flex items-center justify-center shrink-0">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={radius}
            className="text-muted/60"
            strokeWidth="7"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            className="text-emerald-600 transition-all duration-700 ease-out"
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-base font-bold text-foreground tracking-tight">{rate}%</span>
          <span className="text-[9px] text-muted-foreground uppercase font-medium">Occupied</span>
        </div>
      </div>
      <div className="flex-1 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Occupied:</span>
          <span className="font-semibold text-emerald-600">{occupied} units</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vacant:</span>
          <span className="font-semibold text-amber-600">{total - occupied} units</span>
        </div>
        <div className="flex justify-between border-t border-border/60 pt-1">
          <span className="text-muted-foreground">Portfolio Total:</span>
          <span className="font-semibold text-foreground">{total} units</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, sub, icon, tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: "default" | "warn";
}) {
  return (
    <Card className={cn("relative px-3 py-2.5", tone === "warn" && "bg-warning-tint")}>
      <span
        className={cn(
          "absolute right-3 top-2.5 opacity-50",
          tone === "warn" ? "text-warning" : "text-muted-foreground",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className={cn(
        "data text-[1.375rem] font-semibold leading-tight tracking-[-0.01em]",
        tone === "warn" && "text-warning",
      )}>
        {value}
      </div>
      <div className="section-label mt-0.5">{label}</div>
      {/* Fixed height: toggling the comparison line must never shift the row. */}
      <div className="mt-1 h-4 truncate text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}

function Row({
  label, value, icon, tone = "default",
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: "default" | "positive" | "warn" | "danger";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className={cn(
        "font-medium tabular-nums",
        tone === "positive" && "text-success",
        tone === "warn" && "text-warning",
        tone === "danger" && "text-destructive",
      )}>
        {value}
      </dd>
    </div>
  );
}

function Stat({
  label, value, sub, tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "positive" | "warn" | "danger";
}) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className={cn(
        "mt-1 text-xl font-semibold tabular-nums",
        tone === "positive" && "text-success",
        tone === "warn" && "text-warning",
        tone === "danger" && "text-destructive",
      )}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Empty({
  icon, title, message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: "bg-destructive-tint text-destructive",
    high: "bg-warning-tint text-warning",
    normal: "bg-info-tint text-info",
    low: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
      map[priority] ?? map.normal,
    )}>
      {priority === "urgent" && <CircleAlert className="h-3 w-3" />}
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "secondary",
    assigned: "default",
    in_progress: "default",
    completed: "outline",
    cancelled: "outline",
  };
  return <Badge variant={(map[status] ?? "secondary") as never} className="capitalize">{status.replace("_", " ")}</Badge>;
}
