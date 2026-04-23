import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  FlaskConical,
  AlertTriangle,
  Zap,
  BarChart2,
  Inbox,
  Settings,
  Bell,
  X,
  Flame,
  MessageSquare,
  Bot,
  GitBranch,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const NAV = [
  { to: '/',         label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline',   icon: GitBranch },
  { to: '/scraping', label: 'Scraping',   icon: Bot },
  { to: '/leads',    label: 'Leads',      icon: Users },
  { to: '/inbox',    label: 'Inbox',      icon: Inbox },
  { to: '/analytics',label: 'Analytics',  icon: BarChart2 },
  { to: '/templates',label: 'Templates',  icon: FileText },
  { to: '/abtest',   label: 'A/B Test',   icon: FlaskConical },
  { to: '/erreurs',  label: 'Erreurs',    icon: AlertTriangle },
  { to: '/campagne', label: 'Campagne',   icon: Settings },
]

function NotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const channel = supabase
      .channel('hot-replied-watch')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seller_qualification',
          filter: 'statut=eq.HOT',
        },
        (payload) => {
          setNotifs((prev) => [
            { id: payload.new.seller_id, type: 'HOT', ts: new Date(), label: 'Nouveau lead HOT !' },
            ...prev.slice(0, 19),
          ])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seller_sequence',
          filter: 'replied=eq.true',
        },
        (payload) => {
          setNotifs((prev) => [
            { id: payload.new.seller_id + Date.now(), type: 'REPLIED', ts: new Date(), label: 'Nouvelle réponse reçue !' },
            ...prev.slice(0, 19),
          ])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const unread = notifs.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell size={18} className="text-white/70" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#E8445A] rounded-full text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-text">Notifications</p>
            {unread > 0 && (
              <button onClick={() => setNotifs([])} className="text-xs text-muted hover:text-text">
                Tout effacer
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted text-sm">Aucune notification</div>
            ) : (
              notifs.map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'HOT' ? 'bg-red-100' : 'bg-green-100'}`}>
                    {n.type === 'HOT' ? <Flame size={14} className="text-[#E8445A]" /> : <MessageSquare size={14} className="text-green-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text">{n.label}</p>
                    <p className="text-xs text-muted">{n.ts.toLocaleTimeString('fr-FR')}</p>
                  </div>
                  <button onClick={() => setNotifs((prev) => prev.filter((_, j) => j !== i))} className="text-muted hover:text-text">
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 flex-shrink-0 flex flex-col" style={{ background: '#1B3A5C' }}>
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E8445A] flex items-center justify-center">
                <Zap size={16} className="text-white" fill="white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Mirakl Connect</p>
                <p className="text-white/50 text-xs">Campaign Dashboard</p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/8'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-white/30 text-xs">Amazon FR → 8 marketplaces</p>
          <p className="text-white/20 text-xs">Mode · Beauté · Maison · Sport · +4</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
