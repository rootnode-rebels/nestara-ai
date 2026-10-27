import { useEffect, useState } from "react";
import { useApp } from "@/context";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tenant } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant;
  onSaved?: (t: Tenant) => void;
}

export function TenantDialog({ open, onOpenChange, tenant, onSaved }: Props) {
  const app = useApp();
  const [firstName, setFirstName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [employer, setEmployer] = useState("");
  const [income, setIncome] = useState("");
  const [emergency, setEmergency] = useState("");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(tenant?.first_name ?? "");
    setLastName(tenant?.last_name ?? "");
    setEmail(tenant?.email ?? "");
    setPhone(tenant?.phone ?? "");
    setDob(tenant?.date_of_birth ?? "");
    setEmployer(tenant?.employer ?? "");
    setIncome(tenant?.monthly_income ? String(tenant.monthly_income) : "");
    setEmergency(tenant?.emergency_contact ?? "");
    setNotes(tenant?.notes ?? "");
    setPassword("");
  }, [open, tenant]);

  async function save() {
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        date_of_birth: dob || null,
        employer: employer.trim() || null,
        monthly_income: income ? parseFloat(income) : null,
        emergency_contact: emergency.trim() || null,
        notes: notes.trim() || null,
        password: password.trim() || undefined,
      };
      const saved = tenant
        ? await app.updateTenant(tenant.id, payload)
        : await app.createTenant(payload);
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!tenant) return;
    try {
      await app.deleteTenant(tenant.id);
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
          <DialogTitle>{tenant ? "Edit tenant" : "New tenant"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-first">First name</Label>
              <Input id="t-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="t-last">Last name</Label>
              <Input id="t-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-email">Email</Label>
              <Input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="t-phone">Phone</Label>
              <Input id="t-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-dob">Date of birth</Label>
              <Input id="t-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="t-emerg">Emergency contact</Label>
              <Input id="t-emerg" value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="Name · phone" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-emp">Employer</Label>
              <Input id="t-emp" value={employer} onChange={(e) => setEmployer(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="t-inc">Monthly income</Label>
              <Input id="t-inc" type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="t-notes">Notes</Label>
            <Textarea id="t-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <span>🔑 Automatic Resident Portal Access</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              This tenant will automatically be synced in the database and can sign in directly to the Resident Portal without needing to create an account.
            </p>
            <div className="pt-1">
              <Label htmlFor="t-pwd" className="text-[11px] text-muted-foreground">Initial Portal Password (optional)</Label>
              <Input
                id="t-pwd"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Default: Password123!"
                className="mt-1 h-8 text-xs bg-background/80"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-2">
          {tenant && (
            <Button type="button" variant="destructive" className="sm:mr-auto" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={save} disabled={saving || !firstName.trim() || !lastName.trim()}>
            {tenant ? "Save changes" : "Create tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {tenant ? (
        <ConfirmDelete
          open={confirming}
          onOpenChange={setConfirming}
          title={`Delete ${tenant.first_name} ${tenant.last_name}?`}
          description="Their leases and rent history go with them. This cannot be undone."
          onConfirm={remove}
        />
      ) : null}
    </>
  );
}
