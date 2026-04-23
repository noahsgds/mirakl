import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, FlaskConical, AlertTriangle,
  Zap, BarChart2, Inbox, Settings, Bell, X, Flame, MessageSquare,
  Bot, GitBranch, Globe, Target, Mail, Store, Crosshair, Activity,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

/* ─── Nav definitions ────────────────────────────────── */
const GLOBAL_NAV = [
  { to: '/',           label: 'Vue globale',  icon: Globe },
]

const C1_NAV = [
  { to: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/pipeline',   label: 'Pipeline',    icon: GitBranch },
  { to: '/scraping',   label: 'Scraping',    icon: Bot },
  { to: '/leads',      label: 'Leads',       icon: Users },
  { to: '/inbox',      label: 'Inbox',       icon: Inbox },
  { to: '/analytics',  label: 'Analytics',   icon: BarChart2 },
  { to: '/templates',  label: 'Templates',   icon: FileText },
  { to: '/abtest',     label: 'A/B Test',    icon: FlaskConical },
  { to: '/erreurs',    label: 'Erreurs',     icon: AlertTriangle },
  { to: '/campagne',   label: 'Campagne',    icon: Settings },
]

/* ─── BDR Outreach Cockpit — C2 silo ─────────────────── */
const C2_NAV = [
  { to: '/c2',               label: 'Global Dashboard',   icon: LayoutDashboard },
  { to: '/c2/prospects',     label: 'Prospects',          icon: Users },
  { to: '/c2/marketplaces',  label: 'Marketplaces',       icon: Store },
  { to: '/c2/matching',      label: 'Matching & Reasoning', icon: Crosshair },
  { to: '/c2/campagne-email',label: 'Campaign Following', icon: Activity },
  { to: '/c2/campagne',      label: 'Campaign Parameters',icon: Settings },
]

/* ─── Campaign tabs ──────────────────────────────────── */
const CAMPAIGNS = [
  { key: 'global', label: 'Globale', shortLabel: 'Globale', color: 'text-white', activeColor: '#E8445A' },
  { key: 'c1',     label: 'Amazon FR', shortLabel: 'C1',    color: 'text-white', activeColor: '#E8445A' },
  { key: 'c2',     label: 'Campagne 2', shortLabel: 'C2',   color: 'text-white', activeColor: '#2563EB' },
]

function detectCampaign(pathname) {
  if (pathname.startsWith('/c2')) return 'c2'
  if (pathname === '/')           return 'global'
  return 'c1'
}

function getNav(campaign) {
  if (campaign === 'global') return GLOBAL_NAV
  if (campaign === 'c2')     return C2_NAV
  return C1_NAV
}

/* ─── Notification Bell ──────────────────────────────── */
function NotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen]     = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const channel = supabase
      .channel('hot-replied-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seller_qualification', filter: 'statut=eq.HOT' },
        (payload) => setNotifs((prev) => [
          { id: payload.new.seller_id, type: 'HOT', ts: new Date(), label: 'Nouveau lead HOT !' },
          ...prev.slice(0, 19),
        ])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seller_sequence', filter: 'replied=eq.true' },
        (payload) => setNotifs((prev) => [
          { id: payload.new.seller_id + Date.now(), type: 'REPLIED', ts: new Date(), label: 'Nouvelle réponse reçue !' },
          ...prev.slice(0, 19),
        ])
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="relative p-1.5 rounded-lg hover:bg-white/10 transition-colors">
        <Bell size={18} className="text-white/70" />
        {notifs.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#E8445A] rounded-full text-white text-[9px] font-bold flex items-center justify-center">
            {notifs.length > 9 ? '9+' : notifs.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-text">Notifications</p>
            {notifs.length > 0 && (
              <button onClick={() => setNotifs([])} className="text-xs text-muted hover:text-text">Tout effacer</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted text-sm">Aucune notification</div>
            ) : notifs.map((n, i) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Layout ──────────────────────────────────────────── */
export default function Layout({ children }) {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const campaign     = detectCampaign(pathname)
  const nav          = getNav(campaign)
  const isC2         = campaign === 'c2'

  const accentColor  = isC2 ? '#2563EB' : '#E8445A'
  const campaignLabel = campaign === 'global' ? 'Vue Globale' : campaign === 'c2' ? 'Campagne 2' : 'Amazon FR'

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 flex-shrink-0 flex flex-col" style={{ background: '#1B3A5C' }}>

        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accentColor }}>
                {isC2 ? <Target size={16} className="text-white" /> : <Zap size={16} className="text-white" fill="white" />}
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Mirakl Connect</p>
                <p className="text-white/50 text-xs">{campaignLabel}</p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Campaign tabs */}
        <div className="flex border-b border-white/10">
          {CAMPAIGNS.map(({ key, shortLabel }) => {
            const active = campaign === key
            const to = key === 'global' ? '/' : key === 'c2' ? '/c2' : '/dashboard'
            return (
              <button
                key={key}
                onClick={() => navigate(to)}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'text-white border-b-2'
                    : 'text-white/35 hover:text-white/60'
                }`}
                style={active ? { borderBottomColor: accentColor } : {}}
              >
                {shortLabel}
              </button>
            )
          })}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/c2' || to === '/dashboard'}
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

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          {isC2 ? (
            <>
              <p className="text-white/30 text-xs">Campagne 2 · Sales outreach</p>
              <p className="text-white/20 text-xs">Matching sellers → marketplaces</p>
            </>
          ) : (
            <>
              <p className="text-white/30 text-xs">Amazon FR → 8 marketplaces</p>
              <p className="text-white/20 text-xs">Mode · Beauté · Maison · Sport · +4</p>
            </>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
