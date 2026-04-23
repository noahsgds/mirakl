import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, FlaskConical, AlertTriangle,
  Zap, BarChart2, Inbox, Settings, Bell, X, Flame, MessageSquare,
  Bot, GitBranch, Globe, Target,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

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
const C2_NAV = [
  { to: '/c2',           label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/c2/pipeline',  label: 'Pipeline',    icon: GitBranch },
  { to: '/c2/leads',     label: 'Leads',       icon: Users },
  { to: '/c2/templates', label: 'Templates',   icon: FileText },
  { to: '/c2/campagne',  label: 'Campagne',    icon: Settings },
]
const CAMPAIGNS = [
  { key: 'global', short: 'All', to: '/' },
  { key: 'c1',     short: 'C1',  to: '/dashboard' },
  { key: 'c2',     short: 'C2',  to: '/c2' },
]

function detectCampaign(pathname) {
  if (pathname.startsWith('/c2')) return 'c2'
  if (pathname === '/') return 'global'
  return 'c1'
}
function getNav(campaign) {
  if (campaign === 'global') return GLOBAL_NAV
  if (campaign === 'c2') return C2_NAV
  return C1_NAV
}

/* C1 accent = Mirakl blue #2764ff, C2 accent = a lighter variant */
const ACCENT = { global: '#2764ff', c1: '#2764ff', c2: '#3e6289' }

function NotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen]     = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const channel = supabase
      .channel('hot-replied-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seller_qualification', filter: 'statut=eq.HOT' },
        (p) => setNotifs((prev) => [{ id: p.new.seller_id, type: 'HOT', ts: new Date(), label: 'Nouveau lead HOT !' }, ...prev.slice(0, 19)])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seller_sequence', filter: 'replied=eq.true' },
        (p) => setNotifs((prev) => [{ id: p.new.seller_id + Date.now(), type: 'REPLIED', ts: new Date(), label: 'Nouvelle réponse reçue !' }, ...prev.slice(0, 19)])
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg transition-colors"
        style={{ background: open ? 'rgba(255,255,255,0.12)' : 'transparent' }}
      >
        <Bell size={15} style={{ color: 'rgba(255,255,255,0.55)' }} />
        {notifs.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center"
            style={{ background: '#dc2626', fontSize: '8px', fontWeight: 700 }}
          >
            {notifs.length > 9 ? '9+' : notifs.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 w-72 z-50 overflow-hidden rounded-xl"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border)',
            boxShadow: '0 16px 48px rgba(16,43,73,0.18)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Notifications</p>
            {notifs.length > 0 && (
              <button onClick={() => setNotifs([])} className="text-xs" style={{ color: 'var(--text-3)' }}>
                Tout effacer
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-3)' }}>Aucune notification</div>
            ) : notifs.map((n, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: n.type === 'HOT' ? 'var(--danger-bg)' : 'var(--success-bg)' }}
                >
                  {n.type === 'HOT'
                    ? <Flame size={13} style={{ color: 'var(--danger)' }} />
                    : <MessageSquare size={13} style={{ color: 'var(--success)' }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{n.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{n.ts.toLocaleTimeString('fr-FR')}</p>
                </div>
                <button onClick={() => setNotifs((p) => p.filter((_, j) => j !== i))} style={{ color: 'var(--text-3)' }}>
                  <X size={12} />
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
  const navigate     = useNavigate()
  const campaign     = detectCampaign(pathname)
  const nav          = getNav(campaign)
  const accent       = ACCENT[campaign]

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside
        className="w-52 flex-shrink-0 flex flex-col"
        style={{
          background: 'var(--sidebar)',       /* #102b49 Mirakl navy */
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: accent, boxShadow: `0 0 12px ${accent}50` }}
              >
                <Zap size={13} style={{ color: '#fff' }} fill="#fff" />
              </div>
              <div>
                <p style={{
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontSize: '15px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  lineHeight: 1.1,
                }}>
                  Mirakl
                </p>
                <p style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                  Connect
                </p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Campaign tabs */}
        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex gap-1">
            {CAMPAIGNS.map(({ key, short, to }) => {
              const active = campaign === key
              return (
                <button
                  key={key}
                  onClick={() => navigate(to)}
                  className="flex-1 py-1.5 text-[10px] font-bold rounded-md tracking-wider uppercase transition-all duration-200"
                  style={active ? {
                    background: accent,
                    color: '#ffffff',
                    boxShadow: `0 2px 8px ${accent}50`,
                  } : {
                    color: 'rgba(255,255,255,0.35)',
                    background: 'transparent',
                  }}
                >
                  {short}
                </button>
              )
            })}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/c2' || to === '/dashboard'}
              className="nav-link-item"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'Outfit, sans-serif',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
                background: isActive ? `${accent}22` : 'transparent',
                borderLeft: `2px solid ${isActive ? accent : 'transparent'}`,
                paddingLeft: '8px',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={14} style={{ color: isActive ? accent : 'rgba(255,255,255,0.4)', flexShrink: 0, transition: 'color 0.15s' }} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.02em' }}>
            {campaign === 'c2' ? 'Campagne 2 · Setup en cours' : 'Amazon FR · 8 marketplaces'}
          </p>
          <p style={{ fontSize: '10px', marginTop: '2px', color: 'rgba(255,255,255,0.16)' }}>
            {campaign === 'c2' ? 'Connecter vos tables →' : 'Mode · Beauté · Maison · +5'}
          </p>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
