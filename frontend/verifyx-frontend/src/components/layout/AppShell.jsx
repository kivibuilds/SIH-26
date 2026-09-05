import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh w-full bg-console-bg text-console-text font-sans antialiased overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar onToggleMobile={() => setMobileOpen((prev) => !prev)} />

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Global Footer */}
        <footer className="border-t border-console-border bg-console-bg px-4 py-2.5 sm:px-6 text-center text-[10px] text-console-muted font-mono tracking-wide">
          <span>VerifyX Console • AI-Assisted Identity &amp; Document Screening System • Prototype • Synthetic Data Only</span>
        </footer>
      </div>
    </div>
  )
}

export default AppShell
