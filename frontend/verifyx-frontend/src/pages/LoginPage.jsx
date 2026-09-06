import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, Lock, User, AlertCircle, KeyRound, Terminal } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../constants/routes'
import Button from '../components/ui/Button'

export function LoginPage() {
  const [officerId, setOfficerId] = useState('OFF-1042')
  const [password, setPassword] = useState('verifyx')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!officerId.trim()) {
      setError('Officer ID is required.')
      return
    }
    if (!password.trim()) {
      setError('Password / PIN is required.')
      return
    }

    try {
      setLoading(true)
      await login({ officerId, password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCreds = () => {
    setOfficerId('OFF-1042')
    setPassword('verifyx')
    setError('')
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-console-bg px-4 py-8 text-console-text">
      {/* Background grid overlay */}
      <div
        className="fixed inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #2c3440 1px, transparent 1px), linear-gradient(to bottom, #2c3440 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Terminal Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center border border-console-accent/40 bg-console-panel mb-3 text-console-accent shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-mono text-2xl font-bold uppercase tracking-[0.25em] text-console-text">
            VerifyX
          </h1>
          <p className="mt-1 text-xs text-console-muted">
            AI-Assisted Identity &amp; Document Screening System
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 border border-amber-900/60 bg-amber-950/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-300">
            <Terminal className="h-3 w-3" />
            <span>DEMO ENVIRONMENT • RESTRICTED ACCESS</span>
          </div>
        </div>

        {/* Login Form Panel */}
        <div className="border border-console-border bg-console-panel p-6 shadow-2xl">
          <div className="border-b border-console-border pb-3 mb-5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-console-text font-mono">
              Officer Authentication
            </span>
            <span className="text-[10px] text-console-muted font-mono">
              SEC-LVL 3
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 border border-rose-800/80 bg-rose-950/40 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="leading-tight">{error}</div>
              </div>
            )}

            <div>
              <label
                htmlFor="officerId"
                className="block text-[11px] font-semibold uppercase tracking-wider text-console-muted mb-1.5"
              >
                Officer ID / Badge
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-console-muted">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="officerId"
                  type="text"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  placeholder="e.g. OFF-1042"
                  autoComplete="username"
                  className="w-full bg-console-raised border border-console-border px-3.5 py-2 pl-9 text-xs font-mono text-console-text placeholder:text-console-muted/60 focus:border-console-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-semibold uppercase tracking-wider text-console-muted mb-1.5"
              >
                Password / PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-console-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-console-raised border border-console-border px-3.5 py-2 pl-9 text-xs font-mono text-console-text placeholder:text-console-muted/60 focus:border-console-accent focus:outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              icon={KeyRound}
              className="w-full mt-2"
            >
              Sign In to Console
            </Button>
          </form>

          {/* Synthetic Demo Credential helper */}
          <div className="mt-5 border-t border-console-border/70 pt-4">
            <div className="flex items-center justify-between text-[11px] text-console-muted font-mono">
              <span>Demo Account:</span>
              <button
                type="button"
                onClick={fillDemoCreds}
                className="text-console-accent hover:underline uppercase text-[10px] font-semibold cursor-pointer"
              >
                Auto-Fill Demo Credentials
              </button>
            </div>
            <div className="mt-1.5 bg-console-raised/70 border border-console-border p-2 font-mono text-[11px] text-slate-400 space-y-0.5">
              <p>Officer ID: <strong className="text-console-text">OFF-1042</strong></p>
              <p>Password: <strong className="text-console-text">verifyx</strong></p>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <p className="mt-6 text-center text-[10px] font-mono text-console-muted">
          Hackathon prototype • Synthetic data • Not an operational government system
        </p>
      </div>
    </div>
  )
}

export default LoginPage
