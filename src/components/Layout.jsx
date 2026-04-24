import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, FlaskConical, AlertTriangle,
  Zap, BarChart2, Inbox, Settings, Bell, X, Flame, MessageSquare,
  Bot, GitBranch, Globe, Target, Store, Crosshair, Mail,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const GLOBAL_NAV = [
  { to: '/global', label: 'Global view', icon: Globe },
]

const C1_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { to: '/scraping', label: 'Scraping', icon: Bot },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/abtest', label: 'A/B Test', icon: FlaskConical },
  { to: '/erreurs', label: 'Errors', icon: AlertTriangle },
  { to: '/campagne', label: 'Campaign', icon: Settings },
]

const C2_NAV = [
  { to: '/c2', label: 'Global Dashboard', icon: LayoutDashboard },
  { to: '/c2/email-generation', label: 'Email Generation', icon: Mail },
  { to: '/c2/prospects', label: 'Prospects', icon: Users },
  { to: '/c2/marketplaces', label: 'Marketplaces', icon: Store },
  { to: '/c2/matching', label: 'Matching & Reasoning', icon: Crosshair },
  { to: '/c2/campagne', label: 'Campaign Parameters', icon: Settings },
]

const CAMPAIGNS = [
  { key: 'global', shortLabel: 'Global', activeColor: '#E8445A' },
  { key: 'c1', shortLabel: 'C1', activeColor: '#E8445A' },
  { key: 'c2', shortLabel: 'C2', activeColor: '#2563EB' },
]

function detectCampaign(pathname) {
  if (pathname.startsWith('/c2')) return 'c2'
  if (pathname === '/global') return 'global'
  return 'c1'
}

function getNav(campaign) {
  if (campaign === 'global') return GLOBAL_NAV
  if (campaign === 'c2') return C2_NAV
  return C1_NAV
}

function NotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const channel = supabase
      .channel('hot-replied-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seller_qualification', filter: 'statut=eq.HOT' },
        (payload) => setNotifs((prev) => [
          { id: payload.new.seller_id, type: 'HOT', ts: new Date(), label: 'New HOT lead!' },
          ...prev.slice(0, 19),
        ])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seller_sequence', filter: 'replied=eq.true' },
        (payload) => setNotifs((prev) => [
          { id: payload.new.seller_id + Date.now(), type: 'REPLIED', ts: new Date(), label: 'New reply received!' },
          ...prev.slice(0, 19),
        ])
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

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="relative rounded-xl border border-white/70 bg-white/30 p-1.5 transition-colors hover:bg-white/50">
        <Bell size={18} className="text-slate-700" />
        {notifs.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E8445A] text-[9px] font-bold text-white">
            {notifs.length > 9 ? '9+' : notifs.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-72 overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
            <p className="text-sm font-semibold text-text">Notifications</p>
            {notifs.length > 0 && (
              <button onClick={() => setNotifs([])} className="text-xs text-muted hover:text-text">Clear all</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">No notifications</div>
            ) : notifs.map((n, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 hover:bg-white/60">
                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${n.type === 'HOT' ? 'bg-red-100' : 'bg-green-100'}`}>
                  {n.type === 'HOT' ? <Flame size={14} className="text-[#E8445A]" /> : <MessageSquare size={14} className="text-green-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{n.label}</p>
                  <p className="text-xs text-muted">{n.ts.toLocaleTimeString('fr-FR')}</p>
                </div>
                <button onClick={() => setNotifs((prev) => prev.filter((_, j) => j !== i))} className="text-muted hover:text-text">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const campaign = detectCampaign(pathname)
  const nav = getNav(campaign)
  const isC2 = campaign === 'c2'

  const accentColor = isC2 ? '#2563EB' : '#E8445A'
  const campaignLabel = campaign === 'global' ? 'Global view' : campaign === 'c2' ? 'Campaign 2' : 'Amazon FR'

  return (
    <div className="flex min-h-screen">
      <aside className="m-3 flex w-64 flex-shrink-0 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/55 shadow-xl backdrop-blur-xl">
        <div className="border-b border-slate-200/70 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: accentColor }}>
                {isC2 ? <Target size={16} className="text-white" /> : <Zap size={16} className="text-white" fill="white" />}
              </div>
              <div>
                <p className="text-sm font-bold leading-tight text-slate-900">Mirakl Connect</p>
                <p className="text-xs text-slate-500">{campaignLabel}</p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>

        <div className="flex border-b border-slate-200/70">
          {CAMPAIGNS.map(({ key, shortLabel, activeColor }) => {
            const active = campaign === key
            const to = key === 'global' ? '/global' : key === 'c2' ? '/c2' : '/dashboard'
            return (
              <button
                key={key}
                onClick={() => navigate(to)}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  active ? 'border-b-2 text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
                style={active ? { borderBottomColor: activeColor } : {}}
              >
                {shortLabel}
              </button>
            )
          })}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/global' || to === '/c2' || to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border border-white/70 bg-white/75 text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:bg-white/45 hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200/70 px-5 py-4">
          {isC2 ? (
            <>
              <p className="text-xs text-slate-500">Campaign 2 · Sales outreach</p>
              <p className="text-xs text-slate-400">Matching sellers → marketplaces</p>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">Amazon FR → 8 marketplaces</p>
              <p className="text-xs text-slate-400">Fashion · Beauty · Home · Sports · +4</p>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
