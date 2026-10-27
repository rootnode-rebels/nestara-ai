import { useState } from "react";
import { api } from "../../api";
import type { PublicListing } from "../../types";
import {
  X,
  Send,
  Building,
  User,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ApplyModalProps {
  listing: PublicListing | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplyModal({ listing, isOpen, onClose }: ApplyModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [income, setIncome] = useState("");
  const [employer, setEmployer] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);

  if (!isOpen || !listing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api<{ ok: boolean; application_id: number; message: string }>(
        "POST",
        "/api/public/apply",
        {
          unit_id: listing.unit_id,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
          monthly_income: income ? parseFloat(income) : null,
          employer: employer || null,
          desired_move_in: moveIn || null,
          notes: notes || null,
        }
      );
      setApplicationId(res.application_id);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSubmitted(false);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setIncome("");
    setEmployer("");
    setMoveIn("");
    setNotes("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-2xl overflow-hidden">
        <button
          onClick={resetAndClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">Application Submitted!</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Application reference <strong>#{applicationId}</strong> has been logged for{" "}
                <strong>{listing.unit_name} — {listing.property_name}</strong>.
              </p>
            </div>
            <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground text-left max-w-sm mx-auto space-y-1 border border-border/50">
              <p>• Our leasing team will verify your employment and rental history.</p>
              <p>• You will receive an email update at <strong>{email}</strong>.</p>
            </div>
            <button
              onClick={resetAndClose}
              className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Apply for {listing.unit_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {listing.property_name} · ${listing.market_rent.toLocaleString()}/mo
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="512-555-0199"
                    className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Monthly Income ($)
                  </label>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="e.g. 5500"
                    className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Current Employer
                  </label>
                  <input
                    type="text"
                    value={employer}
                    onChange={(e) => setEmployer(e.target.value)}
                    placeholder="Company name"
                    className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Desired Move-In Date
                </label>
                <input
                  type="date"
                  value={moveIn}
                  onChange={(e) => setMoveIn(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Additional Notes or Questions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell us about pets, lease term preferences, or occupants..."
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? "Submitting Application…" : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Submit Rental Application
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
