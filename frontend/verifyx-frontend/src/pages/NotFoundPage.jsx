import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Terminal } from 'lucide-react'
import { ROUTES } from '../constants/routes'
import Button from '../components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-console-bg px-4 py-12 text-console-text">
      <div className="w-full max-w-md border border-console-border bg-console-panel p-8 text-center shadow-2xl space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center border border-rose-800 bg-rose-950/40 text-rose-400">
          <AlertCircle className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <span className="font-mono text-3xl font-bold tracking-tight text-rose-400">
            404
          </span>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-console-text">
            RESOURCE NOT FOUND
          </h2>
          <p className="text-xs text-console-muted font-sans pt-1">
            The requested console URI or screening identifier does not exist in the routing table.
          </p>
        </div>

        <div className="border border-console-border bg-console-raised p-2.5 font-mono text-[10px] text-console-muted">
          STATUS: ERR_ROUTE_UNRESOLVED
        </div>

        <div className="pt-2 flex justify-center">
          <Button
            variant="primary"
            size="md"
            icon={ArrowLeft}
            onClick={() => navigate(ROUTES.DASHBOARD)}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
