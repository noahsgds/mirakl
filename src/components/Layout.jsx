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
  { key: 'global', label: 'Globale', short: 'All', to: '/' },
  { key: 'c1',     label: 'Amazon FR', short: 'C1',  to: '/dashboard' },
  { key: 'c2',     label: 'Campagne 2', short: 'C2', to: '/c2' },
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

function NotificationBell({ accentColor }) {
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg transition-all duration-200"
        style={{ background: open ? 'rgba(120,128,200,0.1)' : 'transparent' }}
      >
        <Bell size={15} style={{ color: 'var(--text-3)' }} />
        {notifs.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center"
            style={{
              background: 'var(--accent)',
              fontSize: '8px',
              fontWeight: 700,
              boxShadow: '0 0 8px rgba(255,51,88,0.5)',
            }}
          >
            {notifs.length > 9 ? '9+' : notifs.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 w-72 z-50 overflow-hidden rounded-xl"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(120,128,200,0.06)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Notifications</p>
            {notifs.length > 0 && (
              <button
                onClick={() => setNotifs([])}
                className="text-xs transition-colors"
                style={{ color: 'var(--text-3)' }}
              >
                Tout effacer
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-3)' }}>
                Aucune notification
              </div>
            ) : notifs.map((n, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: n.type === 'HOT' ? 'rgba(255,51,88,0.12)' : 'rgba(0,224,192,0.1)',
                  }}
                >
                  {n.type === 'HOT'
                    ? <Flame size={13} style={{ color: 'var(--accent)' }} />
                    : <MessageSquare size={13} style={{ color: 'var(--teal)' }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{n.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {n.ts.toLocaleTimeString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => setNotifs((prev) => prev.filter((_, j) => j !== i))}
                  style={{ color: 'var(--text-3)' }}
                >
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
  const isC2         = campaign === 'c2'
  const accentColor  = isC2 ? '#7B6FFF' : '#FF3358'

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside
        className="w-52 flex-shrink-0 flex flex-col relative"
        style={{
          background: 'var(--sidebar)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Left accent glow strip */}
        <div
          className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, ${accentColor}50 35%, ${accentColor}50 65%, transparent 100%)`,
          }}
        />

        {/* Logo */}
        <div className="px-4 pt-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: accentColor + '16',
                  border: `1px solid ${accentColor}30`,
                  boxShadow: `0 0 10px ${accentColor}18`,
                }}
              >
                {isC2
                  ? <Target size={13} style={{ color: accentColor }} />
                  : <Zap size={13} style={{ color: accentColor }} fill={accentColor} />
                }
              </div>
              <div>
                <p
                  className="leading-tight"
                  style={{
                    fontFamily: 'Fraunces, Georgia, serif',
                    fontSize: '15px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'var(--text)',
                  }}
                >
                  Mirakl
                </p>
                <p
                  className="uppercase tracking-widest"
                  style={{ fontSize: '8px', fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.14em' }}
                >
                  Connect
                </p>
              </div>
            </div>
            <NotificationBell accentColor={accentColor} />
          </div>
        </div>

        {/* Campaign tabs */}
        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-1">
            {CAMPAIGNS.map(({ key, short, to }) => {
              const active = campaign === key
              return (
                <button
                  key={key}
                  onClick={() => navigate(to)}
                  className="flex-1 py-1.5 text-[10px] font-semibold rounded-md tracking-wider uppercase transition-all duration-200"
                  style={active ? {
                    background: accentColor + '15',
                    color: accentColor,
                    border: `1px solid ${accentColor}28`,
                  } : {
                    color: 'var(--text-3)',
                    border: '1px solid transparent',
                    background: 'transparent',
                  }}
                >
                  {short}
                </button>
              )
            })}
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/c2' || to === '/dashboard'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '8px 10px 8px 10px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                fontFamily: 'Outfit, sans-serif',
                color: isActive ? 'var(--text)' : 'var(--text-3)',
                background: isActive ? (accentColor + '10') : 'transparent',
                borderLeft: `2px solid ${isActive ? accentColor : 'transparent'}`,
                paddingLeft: '8px',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
              })}
              className="nav-link-item"
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={14}
                    style={{
                      color: isActive ? accentColor : 'var(--text-3)',
                      flexShrink: 0,
                      transition: 'color 0.15s',
                    }}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          {isC2 ? (
            <>
              <p style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-3)', letterSpacing: '0.02em' }}>
                Campagne 2 · Setup en cours
              </p>
              <p style={{ fontSize: '10px', marginTop: '2px', color: accentColor + '70' }}>
                Connecter vos tables →
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-3)', letterSpacing: '0.02em' }}>
                Amazon FR · 8 marketplaces
              </p>
              <p style={{ fontSize: '10px', marginTop: '2px', color: 'var(--text-3)' }}>
                Mode · Beauté · Maison · +5
              </p>
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
