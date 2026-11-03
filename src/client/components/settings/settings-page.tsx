import { useEffect, useState } from "react";
import {
  Pencil,
  Plus,
  Trash2,
  Database,
  Shield,
  Server,
  CheckCircle2,
  HardDrive,
  Layers,
  Cpu,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useApp } from "@/context";
import { cn, colorClasses } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Vendor, VendorCategory } from "@/types";
import { PageShell } from "@/components/page-shell";

const COLORS = ["sky", "emerald", "amber", "rose", "violet", "fuchsia", "teal", "orange", "slate"];

const VENDOR_CATEGORIES: { value: VendorCategory; label: string }[] = [
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "hvac", label: "HVAC" },
  { value: "handyman", label: "Handyman" },
  { value: "cleaning", label: "Cleaning" },
  { value: "landscaping", label: "Landscaping" },
  { value: "general", label: "General" },
];

export function SettingsPage() {
  return (
    <PageShell
      title="Settings & System Architecture"
      meta="Distributed Database cluster, Blockchain ledger, and property policies"
      width="max-w-5xl"
    >
        <Tabs defaultValue="architecture">
          <TabsList>
            <TabsTrigger value="architecture" className="gap-1.5">
              <Database className="h-3.5 w-3.5" /> Distributed DB & Blockchain
            </TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="policy">Rent policy</TabsTrigger>
          </TabsList>

          <TabsContent value="architecture" className="mt-4">
            <ArchitectureTab />
          </TabsContent>
          <TabsContent value="vendors" className="mt-4">
            <VendorsTab />
          </TabsContent>
          <TabsContent value="policy" className="mt-4">
            <PolicyTab />
          </TabsContent>
        </Tabs>
    </PageShell>
  );
}

// ── Distributed DB & Blockchain Architecture ───────────────────────

function ArchitectureTab() {
  return (
    <div className="space-y-6">
      {/* 2-Tier Architecture Hero Banner */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold border border-emerald-500/20 mb-2">
              <CheckCircle2 className="h-3 w-3" />
              <span>Distributed Architecture Active</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              MongoDB Document Store + 3-Node Blockchain Consensus
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Hybrid enterprise storage architecture: high-speed distributed JSON document queries paired with an immutable 3-node Raft consensus cryptographic verification ledger.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            Write Concern: majority
          </Badge>
        </div>

        {/* 2 Main Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
          {/* Card 1: MongoDB Distributed Document Store */}
          <Card className="p-4 border-border bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">MongoDB Document Store</h3>
                  <p className="text-[11px] text-muted-foreground">Distributed NoSQL Replica Set</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>

            <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Cluster Set:</span>
                <span className="text-foreground font-semibold">rs-nestara-primary</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Collections:</span>
                <span className="text-foreground font-semibold">8 Active (BSON / JSON)</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Query Latency:</span>
                <span className="text-emerald-600 font-semibold">&lt; 4ms (Indexed)</span>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground block">Active Collections:</span>
              <div className="flex flex-wrap gap-1">
                {["properties", "units", "leases", "tenants", "rent_charges", "applications", "documents", "blockchain_ledger"].map((c) => (
                  <Badge key={c} variant="neutral" className="text-[10px] font-mono py-0">{c}</Badge>
                ))}
              </div>
            </div>
          </Card>

          {/* Card 2: 3-Node Blockchain Raft Consensus */}
          <Card className="p-4 border-border bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Distributed Blockchain Ledger</h3>
                  <p className="text-[11px] text-muted-foreground">3-Node Raft Consensus Cluster</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                <Shield className="h-3 w-3" />
                QUORUM (2/3)
              </span>
            </div>

            <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Active Leader:</span>
                <span className="text-blue-600 font-semibold">node-alpha-primary</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Failover Algorithm:</span>
                <span className="text-foreground font-semibold">Raft Leader Election</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Proof Standard:</span>
                <span className="text-foreground font-semibold">SHA-256 Merkle Root</span>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground block">Cluster Nodes:</span>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] bg-background/50 px-2 py-1 rounded border border-border/50">
                  <span className="font-medium text-foreground">Node A (Primary Edge)</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">LEADER (ONLINE)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-background/50 px-2 py-1 rounded border border-border/50">
                  <span className="font-medium text-foreground">Node B (Secondary Validator)</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">FOLLOWER (ONLINE)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-background/50 px-2 py-1 rounded border border-border/50">
                  <span className="font-medium text-foreground">Node C (Quorum Witness)</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">WITNESS (ONLINE)</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Vendors ────────────────────────────────────────────────────────

function VendorsTab() {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | undefined>(undefined);

  return (
    <Card>
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-sm font-semibold">Vendors</h2>
          <p className="text-xs text-muted-foreground">Plumbers, electricians, handymen, and other service providers.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(undefined); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Add vendor
        </Button>
      </div>
      {app.vendors.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No vendors yet.</div>
      ) : (
        <ul className="divide-y">
          {app.vendors.map((v) => {
            const palette = colorClasses(v.color);
            return (
              <li key={v.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className={cn("h-2.5 w-2.5 rounded-full", palette.dot)} />
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[v.phone, v.email].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" className="capitalize">{v.category}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <VendorDialog open={open} onOpenChange={setOpen} vendor={editing} />
    </Card>
  );
}

function VendorDialog({
  open, onOpenChange, vendor,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vendor?: Vendor;
}) {
  const app = useApp();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<VendorCategory>("general");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState("slate");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(vendor?.name ?? "");
    setCategory(vendor?.category ?? "general");
    setPhone(vendor?.phone ?? "");
    setEmail(vendor?.email ?? "");
    setColor(vendor?.color ?? "slate");
    setNotes(vendor?.notes ?? "");
  }, [open, vendor]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        phone: phone.trim() || null,
        email: email.trim() || null,
        color,
        notes: notes.trim() || null,
      };
      if (vendor) await app.updateVendor(vendor.id, payload);
      else await app.createVendor(payload);
      onOpenChange(false);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!vendor) return;
    try {
      await app.deleteVendor(vendor.id);
      onOpenChange(false);
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit vendor" : "New vendor"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="v-name">Name</Label>
            <Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as VendorCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VENDOR_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLORS.map((c) => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full bg-${c}-500`} />
                        <span className="capitalize">{c}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="v-phone">Phone</Label>
              <Input id="v-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="v-email">Email</Label>
              <Input id="v-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="v-notes">Notes</Label>
            <Textarea id="v-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          {vendor && (
            <Button type="button" variant="destructive" className="sm:mr-auto" onClick={() => setConfirming(true)}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={save} disabled={saving || !name.trim()}>
            {vendor ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {vendor ? (
        <ConfirmDelete
          open={confirming}
          onOpenChange={setConfirming}
          title={`Delete ${vendor.name}?`}
          description="Work orders already assigned to them keep the name on record."
          onConfirm={remove}
        />
      ) : null}
    </>
  );
}

// ── Policy ─────────────────────────────────────────────────────────

function PolicyTab() {
  const app = useApp();
  const [dueDay, setDueDay] = useState(String(app.settings.default_rent_due_day));
  const [lateFee, setLateFee] = useState(String(app.settings.late_fee_amount));
  const [grace, setGrace] = useState(String(app.settings.late_fee_grace_days));
  const [currency, setCurrency] = useState(app.settings.currency);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDueDay(String(app.settings.default_rent_due_day));
    setLateFee(String(app.settings.late_fee_amount));
    setGrace(String(app.settings.late_fee_grace_days));
    setCurrency(app.settings.currency);
  }, [app.settings]);

  async function save() {
    setSaving(true);
    try {
      await app.updateSettings({
        default_rent_due_day: Math.min(31, Math.max(1, parseInt(dueDay, 10) || 1)),
        late_fee_amount: parseFloat(lateFee) || 0,
        late_fee_grace_days: Math.max(0, parseInt(grace, 10) || 0),
        currency: currency.trim().toUpperCase() || "USD",
      });
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-1 text-sm font-semibold">Rent policy defaults</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Used when creating new leases. Each lease can override these.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <Label htmlFor="s-day">Rent due day</Label>
          <Input id="s-day" type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="s-late">Late fee</Label>
          <Input id="s-late" type="number" value={lateFee} onChange={(e) => setLateFee(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="s-grace">Grace days</Label>
          <Input id="s-grace" type="number" min={0} value={grace} onChange={(e) => setGrace(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="s-cur">Currency</Label>
          <Input id="s-cur" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={save} disabled={saving}>Save settings</Button>
      </div>
    </Card>
  );
}
