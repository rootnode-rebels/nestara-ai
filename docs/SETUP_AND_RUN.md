# Setup and Run Guide — Nestara AI

**Environment:** Windows (PowerShell)  
**Verified On:** October 22, 2026  
**Primary Target Directory:** `C:\Projects\Nestara AI\OpenProperty`  

---

## 1. Prerequisites and Installed Tool Versions

Before starting, ensure you have the required runtimes installed:

| Tool | Minimum Version | Verified Version on Machine | Check Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` | `v24.20.0` | `node -v` |
| **pnpm** | `>= 9.0.0` | `12.15.0` | `pnpm -v` |
| **Git** | `>= 2.40.0` | `2.55.0.windows.5` | `git --version` |

### Installing pnpm (if not already installed)
If `pnpm` is not installed on your system, enable it via corepack or install it globally with npm:

```powershell
# Option A: Via Corepack (recommended for Node.js 18+)
corepack enable
corepack prepare pnpm@latest --activate

# Option B: Via npm
npm install -g pnpm
```

---

## 2. Workspace Navigation and Directory Structure

Open a PowerShell terminal and navigate to the primary application directory:

```powershell
Set-Location "C:\Projects\Nestara AI\OpenProperty"
```

> [!IMPORTANT]
> Always execute commands from `C:\Projects\Nestara AI\OpenProperty` (or your cloned repository root).  
> The reference implementations in `C:\Projects\Nestara AI` are isolated sibling directories and are not part of the active production build.

---

## 3. Dependency Installation

Install the workspace dependencies using pnpm:

```powershell
pnpm install
```

*Note on pnpm warnings:* If you see a warning about `pnpm.onlyBuiltDependencies`, it can be safely ignored. All native binaries (`workerd`, `esbuild`) are correctly linked.

---

## 4. Local Database Setup & Migration

Nestara AI uses Cloudflare D1 (SQLite) locally managed by Wrangler.

Initialize and apply the schema to the local D1 instance:

```powershell
pnpm db:migrate
```

**Expected Output:**
```
⛅️ wrangler 4.86.0
Resource location: local
🌀 Executing on local database open-property-db (local) from .wrangler\state\v3\d1:
🚣 25 commands executed successfully.
```

The local database file will be created and persisted in `.wrangler\state\v3\d1`.

---

## 5. Running the Application

### Option A: Unified Development Server (UI + API together)
The standard dev script applies the database migrations, then launches the Vite frontend server and Wrangler API server concurrently:

```powershell
pnpm dev
```

- **Frontend URL:** [http://localhost:5173](http://localhost:5173)
- **Backend API URL:** [http://localhost:8787](http://localhost:8787)
- **API Health Check:** [http://localhost:8787/api/health](http://localhost:8787/api/health)

### Option B: Running Frontend and Backend Separately (Recommended for Debugging)

**Terminal 1 — Backend API (Cloudflare Worker):**
```powershell
Set-Location "C:\Projects\Nestara AI\OpenProperty"
npx wrangler dev --port 8787
```

**Terminal 2 — Frontend UI (Vite):**
```powershell
Set-Location "C:\Projects\Nestara AI\OpenProperty"
npx vite
```

---

## 6. Verification and Build Commands

### Type Checking
Run the TypeScript compiler across the entire codebase:

```powershell
pnpm typecheck
```
*Expected: Exits cleanly with code 0 and no output.*

### Production Build
Compile and bundle the production assets:

```powershell
pnpm build
```
*Expected: Vite transforms ~6,400 modules and outputs optimized production assets into `dist/`.*

---

## 7. Environment Configuration

The local development stack runs out of the box with zero external configuration because D1 runs in a local SQLite file.

When adding future external AI capabilities (Google Gemini), create an environment file `.dev.vars` inside `OpenProperty/`:

```env
# C:\Projects\Nestara AI\OpenProperty\.dev.vars
GEMINI_API_KEY=your_gemini_api_key_here
```

> [!WARNING]
> Never commit `.dev.vars` or any real API keys to version control. The `.gitignore` file is configured to exclude all `.env*` and `.dev.vars` files.

---

## 8. Common Troubleshooting & Solutions

### Problem 1: Port Conflict (Port 8787 or 5173 in use)
**Symptom:** `Error: listen EADDRINUSE: address already in use :::8787`  
**Solution:** Find and terminate the process holding the port:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8787).OwningProcess | Stop-Process -Force
```

### Problem 2: Corrupted Local D1 Database
**Symptom:** Inconsistent database state or migration errors.  
**Solution:** Remove the local `.wrangler` state and re-run migrations:
```powershell
Remove-Item -Recurse -Force ".wrangler\state"
pnpm db:migrate
```

### Problem 3: PowerShell Script Execution Policy
**Symptom:** `pnpm : File cannot be loaded because running scripts is disabled on this system.`  
**Solution:** Run PowerShell as Administrator and enable local script execution:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 9. Stopping the Development Server

To stop the servers running in PowerShell:
- Press `Ctrl + C` in the active terminal window.
- When prompted `Terminate batch job (Y/N)?`, type `Y` and press `Enter`.
