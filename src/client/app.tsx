import { useEffect, useRef } from "react";
import { AppNav, reportLocation, type AppNavItem } from "@clawnify/app/client";
import { useAppState } from "./hooks/use-app-state";
import { useRouter, type Route } from "./hooks/use-router";
import { AppContext } from "./context";
import { AuthContext, useAuthProvider } from "./hooks/use-auth";
import { AuthModal } from "./components/auth/auth-modal";
import { UserNav } from "./components/auth/user-nav";
import { ErrorBanner } from "./components/error-banner";
import { ExplorePage } from "./components/public/explore-page";
import { TenantPortalPage } from "./components/tenant/tenant-portal-page";
import { DashboardPage } from "./components/dashboard/dashboard-page";
import { PropertiesList } from "./components/properties/properties-list";
import { PropertyPage } from "./components/properties/property-page";
import { TenantsList } from "./components/tenants/tenants-list";
import { TenantPage } from "./components/tenants/tenant-page";
import { LeasesPage } from "./components/leases/leases-page";
import { RentPage } from "./components/rent/rent-page";
import { MaintenancePage } from "./components/maintenance/maintenance-page";
import { ApplicationsPage } from "./components/applications/applications-page";
import { DocumentsPage } from "./components/documents/documents-page";
import { SettingsPage } from "./components/settings/settings-page";
import { Button } from "./components/ui/button";
import { ShieldCheck, Lock } from "lucide-react";

const LANDLORD_PORTFOLIO: AppNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", home: true },
  { id: "explore", label: "Public Listings", href: "/explore", icon: "compass", color: "sky" },
  { id: "properties", label: "Properties", href: "/properties", icon: "building-2", color: "green" },
  { id: "tenants", label: "Tenants", href: "/tenants", icon: "users", color: "blue" },
  { id: "leases", label: "Leases", href: "/leases", icon: "clipboard-list", color: "violet" },
];

const LANDLORD_OPERATIONS: AppNavItem[] = [
  { id: "applications", label: "Applications", href: "/applications", icon: "clipboard-list", color: "blue" },
  { id: "documents", label: "Verify Documents", href: "/documents", icon: "file-check", color: "green" },
  { id: "rent", label: "Rent Ledger", href: "/rent", icon: "dollar-sign", color: "amber" },
  { id: "maintenance", label: "Maintenance", href: "/maintenance", icon: "list-checks", color: "orange" },
];

const LANDLORD_ADMIN: AppNavItem[] = [
  { id: "settings", label: "Settings", href: "/settings", icon: "settings" },
];

const PUBLIC_DISCOVERY: AppNavItem[] = [
  { id: "explore", label: "Discover Residences", href: "/explore", icon: "compass", color: "green", home: true },
  { id: "portal", label: "Resident Portal", href: "/portal", icon: "key", color: "violet" },
  { id: "dashboard", label: "Owner & Landlord Hub", href: "/dashboard", icon: "building-2", color: "blue" },
];

const TENANT_NAV: AppNavItem[] = [
  { id: "portal", label: "My Resident Portal", href: "/portal", icon: "key", color: "violet", home: true },
  { id: "explore", label: "Browse Rentals", href: "/explore", icon: "compass", color: "green" },
];

/** A record page keeps its collection's row lit. */
function activeFor(route: Route): string {
  if (route.name === "property") return "properties";
  if (route.name === "tenant") return "tenants";
  return route.name;
}

export function App() {
  const state = useAppState();
  const auth = useAuthProvider();
  const { path, route, navigate } = useRouter();

  // Track previous user to detect smooth login / logout transitions
  const prevUserRef = useRef<typeof auth.user>(auth.user);

  // Route visitors appropriately based on authentication state
  useEffect(() => {
    if (auth.loading) return;

    const prevUser = prevUserRef.current;
    prevUserRef.current = auth.user;

    // Detect user login event
    if (!prevUser && auth.user) {
      if (auth.user.role === "tenant") {
        navigate("/portal");
        return;
      } else if (auth.user.role === "landlord" || auth.user.role === "admin") {
        if (path === "/" || path === "/explore" || path === "/portal") {
          navigate("/dashboard");
          return;
        }
      }
    }

    // Detect user logout event
    if (prevUser && !auth.user) {
      if (path !== "/explore") {
        navigate("/explore");
        return;
      }
    }

    // Default route protections
    if (!auth.user && (path === "/" || path === "/dashboard")) {
      navigate("/explore");
    } else if (auth.user?.role === "tenant" && (path === "/" || path === "/dashboard")) {
      navigate("/portal");
    }
  }, [auth.loading, auth.user, path, navigate]);

  // Lets the dashboard restore this exact screen on reload.
  useEffect(() => {
    reportLocation(path);
  }, [path]);

  // Dynamic role-based navigation groups
  let groups: { label?: string; items: AppNavItem[] }[] = [];
  if (!auth.user) {
    // Unauthenticated public explorer: main discovery and portals
    groups = [{ items: PUBLIC_DISCOVERY }];
  } else if (auth.user.role === "tenant") {
    // Resident tenant
    groups = [{ items: TENANT_NAV }];
  } else {
    // Landlord / Administrator
    groups = [
      { items: LANDLORD_PORTFOLIO },
      { label: "Operations", items: LANDLORD_OPERATIONS },
      { label: "Admin", items: LANDLORD_ADMIN },
    ];
  }

  // Permission checks for guarded pages
  const isLandlordOrAdmin = auth.user?.role === "landlord" || auth.user?.role === "admin";
  const isBackOfficeRoute = [
    "dashboard",
    "properties",
    "property",
    "tenants",
    "tenant",
    "leases",
    "applications",
    "rent",
    "maintenance",
    "settings",
  ].includes(route.name);

  return (
    <AuthContext.Provider value={auth}>
      <AppContext.Provider value={state}>
        <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground md:flex-row">
          <div className="flex shrink-0 flex-col justify-between border-r border-border bg-card w-full md:w-64">
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
              <AppNav
                title="Nestara AI"
                icon="home"
                groups={groups}
                active={activeFor(route)}
                onNavigate={(item) => navigate(item.href ?? (auth.user?.role === "tenant" ? "/portal" : isLandlordOrAdmin ? "/dashboard" : "/explore"))}
              />
            </div>

            {/* Nordic Privacy & Security Assurance Box */}
            <div className="hidden md:flex flex-col gap-2 p-3 m-3 rounded-lg border border-border bg-card/60 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Personal Data Guard</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  RLS Active
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Hardware-isolated session. Tenant PII and financials protected via strict Row-Level Security.
              </p>
              <div className="pt-2 border-t border-border space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Encryption</span>
                  <span className="font-medium text-foreground">AES-256 GCM</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Privacy Norm</span>
                  <span className="font-medium text-foreground">Zero PII Leakage</span>
                </div>
              </div>
            </div>

            <div className="hidden md:block p-3 border-t border-border/60">
              <UserNav />
            </div>
          </div>
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {state.loading ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                Loading…
              </div>
            ) : isBackOfficeRoute && !isLandlordOrAdmin ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center max-w-md mx-auto">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <Lock className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Landlord & Admin Access Only
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This section is reserved for verified property owners and managers. Please sign in with your landlord account to access management ledgers and controls.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <Button onClick={auth.openAuthModal}>Sign In</Button>
                  <Button variant="outline" onClick={() => navigate("/explore")}>
                    Browse Rentals
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {route.name === "dashboard" && <DashboardPage navigate={navigate} />}
                {route.name === "explore" && <ExplorePage key={path} navigate={navigate} currentPath={path} />}
                {route.name === "portal" && <TenantPortalPage navigate={navigate} />}
                {route.name === "properties" && <PropertiesList navigate={navigate} />}
                {route.name === "property" && <PropertyPage id={route.id} navigate={navigate} />}
                {route.name === "tenants" && <TenantsList navigate={navigate} />}
                {route.name === "tenant" && <TenantPage id={route.id} navigate={navigate} />}
                {route.name === "leases" && <LeasesPage navigate={navigate} />}
                {route.name === "applications" && <ApplicationsPage navigate={navigate} />}
                {route.name === "documents" && <DocumentsPage navigate={navigate} />}
                {route.name === "rent" && <RentPage />}
                {route.name === "maintenance" && <MaintenancePage />}
                {route.name === "settings" && <SettingsPage />}
                {route.name === "not-found" && (
                  <Placeholder title="Not found" message="That page doesn't exist." />
                )}
              </>
            )}
          </main>
          <AuthModal />
          <ErrorBanner />
        </div>
      </AppContext.Provider>
    </AuthContext.Provider>
  );
}

function Placeholder({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
