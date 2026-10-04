import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import 'highlight.js/styles/github-dark.css'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../hooks/useAuth'

export default function RootLayout() {
  const init = useAuth((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg-base text-text">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-4 text-center text-sm text-text-muted">
        CoderCombat - Web Development INSYFEST 2026
      </footer>
    </div>
  )
}
