import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FilePlus,
  History,
  BarChart3,
  ShieldCheck,
  Settings,
  HelpCircle,
  LogOut,
  User,
  X,
  Radio,
  Terminal,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../constants/routes'

export function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const { officer, logout } = useAuth()
  const navigate = useNavigate()
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  const navItems = [
    {
      to: ROUTES.DASHBOARD,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: ROUTES.NEW_SCREENING,
      label: 'New Screening',
      icon: FilePlus,
    },
    {
      to: ROUTES.HISTORY,
      label: 'Screening History',
      icon: History,
    },
    {
      to: ROUTES.ANALYTICS,
      label: 'Analytics',
      icon: BarChart3,
    },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/80 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-console-border bg-console-bg transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding Header */}
        <div className="flex flex-col border-b border-console-border p-4 bg-console-raised/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center border border-console-accent/40 bg-console-accent/10 text-console-accent">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-sm font-bold tracking-[0.25em] text-console-text uppercase">
                  VerifyX
                </span>
                <span className="text-[9px] uppercase tracking-wider text-console-accent font-semibold">
                  DEMO PROTOTYPE
                </span>
              </div>
            </div>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="text-console-muted hover:text-console-text lg:hidden p-1"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="mt-2 text-[11px] leading-tight text-console-muted font-sans">
            AI-Assisted Identity &amp; Document Screening System
          </p>

          <div className="mt-3 flex items-center gap-1.5 border-t border-console-border/60 pt-2 text-[10px] text-emerald-400 font-mono">
            <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-400" />
            <span>DEMO SESSION • SYNTHETIC DATA</span>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-console-muted">
              Primary Operations
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => onCloseMobile && onCloseMobile()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wider font-medium border transition-colors ${
                        isActive
                          ? 'bg-console-panel border-console-accent/60 text-console-accent font-semibold border-l-2 border-l-console-accent'
                          : 'border-transparent text-console-muted hover:bg-console-raised/50 hover:text-console-text hover:border-console-border/50'
                      }`
                    }
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>

          {/* Secondary Navigation */}
          <div>
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-console-muted">
              System &amp; Support
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wider font-medium text-console-muted hover:bg-console-raised/50 hover:text-console-text border border-transparent hover:border-console-border/50 transition-colors text-left cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span>Console Settings</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wider font-medium text-console-muted hover:bg-console-raised/50 hover:text-console-text border border-transparent hover:border-console-border/50 transition-colors text-left cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Protocol &amp; Help</span>
              </button>
            </div>
          </div>
        </div>

        {/* Officer Status / Footer Info */}
        <div className="border-t border-console-border bg-console-raised/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center border border-console-border bg-console-panel text-console-muted shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-console-text truncate">
                  {officer?.displayName || 'Officer Session'}
                </span>
                <span className="font-mono text-[10px] text-console-muted truncate">
                  {officer?.id || 'OFF-1042'} • {officer?.unit || 'Unit 4'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="End Session"
              className="p-1.5 text-console-muted hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Persistent Disclaimer */}
          <div className="border-t border-console-border/50 pt-2">
            <p className="text-[10px] leading-tight text-console-muted/80 text-center font-mono uppercase tracking-tight">
              Hackathon prototype • Synthetic data • Not an operational government system
            </p>
          </div>
        </div>
      </aside>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg border border-console-border bg-console-panel p-5">
            <div className="flex items-center justify-between border-b border-console-border pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-console-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-console-text">
                  VerifyX System Guide &amp; Protocol
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-console-muted hover:text-console-text cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-console-text/90 font-sans">
              <p>
                <strong className="text-console-accent font-mono uppercase">System Purpose:</strong> VerifyX is an AI-assisted identity and document screening prototype. It assists screening officers by flagging possible document anomalies, verifying machine-readable lines, estimating face similarity, and providing risk indicators.
              </p>
              <div className="border border-console-border/80 bg-console-raised/50 p-3 space-y-1.5 font-mono text-[11px]">
                <p className="text-amber-300 uppercase font-semibold">Synthetic Demo Test Cases:</p>
                <p>• <strong className="text-emerald-400">VX-1043</strong> (Alex Rivera) — Clear (Risk: 12/100, no anomalies)</p>
                <p>• <strong className="text-amber-400">VX-1042</strong> (Jordan Blake) — Needs Review (Risk: 47/100, MRZ date inconsistency)</p>
                <p>• <strong className="text-rose-400">VX-1041</strong> (Morgan Lee) — High Risk (Risk: 87/100, DOB mismatch, text alteration, face mismatch)</p>
              </div>
              <p className="text-console-muted text-[11px]">
                <strong className="text-console-text">Officer Note:</strong> VerifyX provides AI-assisted risk indicators for officer evaluation. It does not prove fraud or make final immigration decisions.
              </p>
            </div>
            <div className="mt-5 flex justify-end border-t border-console-border pt-3">
              <button
                onClick={() => setShowHelpModal(false)}
                className="h-8 px-4 text-xs font-mono uppercase bg-console-raised hover:bg-slate-800 text-console-text border border-console-border cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md border border-console-border bg-console-panel p-5">
            <div className="flex items-center justify-between border-b border-console-border pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-console-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-console-text">
                  Console Configuration (Prototype)
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-console-muted hover:text-console-text cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs font-sans">
              <div className="flex items-center justify-between border-b border-console-border/60 pb-2">
                <span className="text-console-muted">Environment Mode</span>
                <span className="font-mono text-emerald-400 uppercase text-[11px] font-semibold">Simulated Mock Engine</span>
              </div>
              <div className="flex items-center justify-between border-b border-console-border/60 pb-2">
                <span className="text-console-muted">Active Workstation</span>
                <span className="font-mono text-console-text text-[11px]">DEMO-WORKSTATION-04</span>
              </div>
              <div className="flex items-center justify-between border-b border-console-border/60 pb-2">
                <span className="text-console-muted">MRZ Parser Standard</span>
                <span className="font-mono text-console-text text-[11px]">ICAO 9303 Type 1/2/3</span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-console-muted">Face Similarity Threshold</span>
                <span className="font-mono text-console-text text-[11px]">85% Match Cutoff</span>
              </div>
            </div>
            <div className="mt-5 flex justify-end border-t border-console-border pt-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="h-8 px-4 text-xs font-mono uppercase bg-console-raised hover:bg-slate-800 text-console-text border border-console-border cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
