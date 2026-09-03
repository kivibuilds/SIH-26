import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Menu,
  PlusCircle,
  Clock,
  LogOut,
  User,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../constants/routes'
import Button from '../ui/Button'

export function TopBar({ onToggleMobile }) {
  const { officer, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const utcString = now.toUTCString().slice(17, 25)
      setTimeStr(`${utcString} UTC`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const getPageContext = () => {
    const path = location.pathname
    if (path.startsWith('/dashboard')) return { title: 'DASHBOARD', section: 'OPERATIONS' }
    if (path.startsWith('/screening/new')) return { title: 'NEW SCREENING', section: 'DOCUMENT INGEST' }
    if (path.includes('/status')) return { title: 'SCREENING PIPELINE', section: 'PIPELINE EXECUTION' }
    if (path.includes('/result')) return { title: 'SCREENING RESULT', section: 'VERIFICATION POSTURE' }
    if (path.includes('/analysis')) return { title: 'DETAILED ANALYSIS', section: 'DOCUMENT ANALYSIS • PROTOTYPE' }
    if (path.startsWith('/history')) return { title: 'SCREENING HISTORY', section: 'RECORDS ARCHIVE' }
    if (path.startsWith('/analytics')) return { title: 'ANALYTICS', section: 'SYSTEM METRICS' }
    return { title: 'VERIFYX', section: 'PROTOTYPE' }
  }

  const context = getPageContext()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  return (
    <header className="sticky top-0 z-30 flex h-13 w-full items-center justify-between border-b border-console-border bg-console-bg px-4 sm:px-6">
      {/* Left: Mobile toggle + Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="p-1.5 text-console-muted hover:text-console-text lg:hidden border border-console-border bg-console-panel cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-console-muted tracking-wider hidden sm:inline">
            PROTOTYPE://{context.section}
          </span>
          <span className="text-console-border hidden sm:inline">/</span>
          <span className="font-semibold tracking-wider text-console-text">
            {context.title}
          </span>
        </div>
      </div>

      {/* Right: Station Clock + Officer session badge + Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Clock */}
        <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-console-muted border border-console-border/70 bg-console-panel/60 px-2.5 py-1">
          <Clock className="h-3 w-3 text-console-accent" />
          <span>{timeStr || '00:00:00 UTC'}</span>
        </div>

        {/* Quick New Screening */}
        {location.pathname !== ROUTES.NEW_SCREENING && (
          <Button
            size="sm"
            variant="primary"
            icon={PlusCircle}
            onClick={() => navigate(ROUTES.NEW_SCREENING)}
            className="hidden sm:inline-flex text-[11px]"
          >
            New Screening
          </Button>
        )}

        {/* Officer info */}
        <div className="flex items-center gap-2 border-l border-console-border pl-3 sm:pl-4 text-xs font-mono">
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-semibold text-console-text">
              {officer?.id || 'OFF-1042'}
            </span>
            <span className="text-[9px] text-emerald-400 font-semibold tracking-widest">
              DEMO SESSION
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-console-muted hover:text-rose-400 hover:bg-rose-950/40 border border-console-border transition-colors ml-1 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopBar
