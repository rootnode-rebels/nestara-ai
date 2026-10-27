import { useAuth } from "../../hooks/use-auth";
import { LogIn, LogOut, User as UserIcon, ShieldCheck } from "lucide-react";

export function UserNav() {
  const { user, loading, openAuthModal, logout } = useAuth();

  if (loading) {
    return <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />;
  }

  if (!user) {
    return (
      <button
        onClick={openAuthModal}
        className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-semibold transition-colors border border-primary/20"
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign In
      </button>
    );
  }

  const roleBadgeColor =
    user.role === "admin"
      ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
      : user.role === "landlord"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      : "bg-blue-500/10 text-blue-600 border-blue-500/20";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl bg-card border border-border/80 px-2.5 py-1 shadow-sm">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
          {user.full_name?.charAt(0).toUpperCase() || <UserIcon className="h-3.5 w-3.5" />}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold leading-tight text-foreground truncate max-w-[120px]">
            {user.full_name}
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">
            {user.email}
          </span>
        </div>
        <span
          className={`capitalize rounded px-1.5 py-0.5 text-[10px] font-semibold border ${roleBadgeColor}`}
        >
          {user.role}
        </span>
      </div>
      <button
        onClick={() => logout()}
        title="Sign Out"
        className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors border border-border/60"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
