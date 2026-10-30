import { useState } from "react";
import { useAuth } from "../../hooks/use-auth";
import type { UserRole } from "../../types";
import { Shield, KeyRound, Mail, User, CheckCircle2, AlertCircle, X } from "lucide-react";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("landlord");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, fullName, role);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      if (
        msg.includes("already been registered by your property manager") ||
        msg.includes("TENANT_ALREADY_REGISTERED")
      ) {
        setMode("login");
        setError("Your tenant account is already active! Please sign in directly with your email and password (default: Password123!).");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPassword: string) => {
    setError(null);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setMode("login");
    setSubmitting(true);
    try {
      await login(demoEmail, demoPassword);
      closeAuthModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {mode === "login" ? "Sign In to Nestara AI" : "Create an Account"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Intelligent Property & Rental Management
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-xl bg-muted/60 p-1 mb-5">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === "login"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === "register"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === "register" && (
          <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-primary">
            💡 <b>Are you a resident tenant?</b> If your landlord has registered your email, your account is already active. You do not need to create an account—simply switch to <b>Sign In</b>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full rounded-xl border border-input bg-background/50 pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("landlord")}
                    className={`rounded-xl border p-2.5 text-left text-xs font-medium transition-all ${
                      role === "landlord"
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    🏢 Landlord / Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("tenant")}
                    className={`rounded-xl border p-2.5 text-left text-xs font-medium transition-all ${
                      role === "tenant"
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    🔑 Prospective / Tenant
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-input bg-background/50 pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Password {mode === "register" && "(min 8 characters)"}
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={mode === "register" ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-input bg-background/50 pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              "Authenticating…"
            ) : mode === "login" ? (
              <>Sign In</>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Create Account
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Helper */}
        {mode === "login" && (
          <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground text-center">One-Click Demo Access (Auto Sign-In)</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickLogin("admin@nestara.ai", "Admin123!")}
                className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 py-1.5 px-2 text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors text-left disabled:opacity-50"
              >
                🛡️ Admin (admin@nestara.ai)
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickLogin("demo@nestara.ai", "Password123!")}
                className="rounded-xl border border-dashed border-primary/40 bg-primary/5 py-1.5 px-2 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors text-left disabled:opacity-50"
              >
                🏢 Landlord (demo)
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickLogin("tenant1@nestara.ai", "Password123!")}
                className="rounded-xl border border-dashed border-primary/40 bg-primary/5 py-1.5 px-2 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors text-left disabled:opacity-50"
              >
                🔑 Tenant (Aarav)
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickLogin("rohan.verma@gmail.com", "Password123!")}
                className="rounded-xl border border-border bg-muted/40 py-1.5 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left disabled:opacity-50"
              >
                🔑 Tenant (Rohan)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickLogin("ananya.iyer@gmail.com", "Password123!")}
                className="rounded-xl border border-border bg-muted/40 py-1.5 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left disabled:opacity-50"
              >
                🔑 Tenant (Ananya)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
