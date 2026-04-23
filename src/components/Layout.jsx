import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, FlaskConical, AlertTriangle,
  Zap, BarChart2, Inbox, Settings, Bell, X, Flame, MessageSquare,
  Bot, GitBranch, Globe, Target, Mail,
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

/*
 * C2 est un silo séparé : ses pages ne consomment QUE les tables C2
 * (sellers, marketplaces, seller_marketplace_matches, seller_emails_campagne_1,
 * seller_sequence_campagne_1, email_templates_campagne_1, workflow_config_campagne_1).
 * On ne réutilise JAMAIS les composants C1 (amazon_sellers, seller_emails, etc.).
 */
const C2_NAV = [
  { to: '/c2',                 label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/c2/pipeline',        label: 'Pipeline',       icon: GitBranch },
  { to: '/c2/leads',           label: 'Leads',          icon: Users },
  { to: '/c2/templates',       label: 'Templates',      icon: FileText },
  { to: '/c2/campagne',        label: 'Campagne',       icon: Settings },
  { to: '/c2/campagne-email',  label: 'Campagne Email', icon: Mail },
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors ring-1 ring-white/5 hover:ring-white/15"
      >
        <Bell size={16} className="text-white/75" />
        {notifs.length > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-crimson-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-sidebar tnum"
            style={{ boxShadow: '0 0 10px rgba(232,68,90,0.6)' }}
          >
            {notifs.length > 9 ? '9+' : notifs.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-elevated border border-ink-100 z-50 overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100/80 bg-ink-50/40">
            <div>
              <p className="eyebrow">Activité</p>
              <p className="text-sm font-semibold text-text mt-0.5">Notifications</p>
            </div>
            {notifs.length > 0 && (
              <button onClick={() => setNotifs([])} className="text-2xs uppercase tracking-wider font-semibold text-muted hover:text-accent transition-colors">Tout effacer</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="inline-flex w-9 h-9 rounded-full bg-ink-50 items-center justify-center mb-2">
                  <Bell size={14} className="text-ink-300" />
                </div>
                <p className="text-sm text-muted">Aucune notification</p>
                <p className="text-2xs text-ink-300 mt-1">Tout est calme pour le moment.</p>
              </div>
            ) : notifs.map((n, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-ink-100/60 last:border-b-0 hover:bg-ink-50/60 transition-colors">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${n.type === 'HOT' ? 'bg-crimson-50 text-crimson-500 ring-1 ring-crimson-100' : 'bg-green-50 text-green-600 ring-1 ring-green-100'}`}>
                  {n.type === 'HOT' ? <Flame size={14} /> : <MessageSquare size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text leading-tight">{n.label}</p>
                  <p className="text-2xs text-muted mt-0.5 tnum">{n.ts.toLocaleTimeString('fr-FR')}</p>
                </div>
                <button onClick={() => setNotifs((prev) => prev.filter((_, j) => j !== i))} className="text-ink-300 hover:text-accent transition-colors">
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
      <aside className="w-64 flex-shrink-0 flex flex-col surface-dark relative overflow-hidden">
        {/* Editorial top hairline */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Logo */}
        <div className="relative px-5 py-5 border-b border-white/[0.07]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center relative"
                style={{
                  background: `linear-gradient(135deg, ${accentColor} 0%, ${isC2 ? '#1E40AF' : '#CF2B43'} 100%)`,
                  boxShadow: `0 8px 20px -6px ${accentColor}80, inset 0 1px 0 rgba(255,255,255,0.25)`,
                }}
              >
                {isC2 ? <Target size={17} className="text-white" /> : <Zap size={16} className="text-white" fill="white" />}
              </div>
              <div className="min-w-0">
                <p className="text-white font-display text-[17px] leading-none tracking-tight">Mirakl<span className="text-white/40">·</span>Connect</p>
                <p className="text-white/45 text-2xs mt-1 uppercase tracking-[0.14em] font-medium">{campaignLabel}</p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Campaign tabs */}
        <div className="relative flex px-3 pt-3 pb-1 gap-1">
          {CAMPAIGNS.map(({ key, shortLabel }) => {
            const active = campaign === key
            const to = key === 'global' ? '/' : key === 'c2' ? '/c2' : '/dashboard'
            const tabAccent = key === 'c2' ? '#2563EB' : '#E8445A'
            return (
              <button
                key={key}
                onClick={() => navigate(to)}
                className={`flex-1 py-1.5 rounded-md text-2xs font-semibold uppercase tracking-[0.12em] transition-all duration-200 ${
                  active
                    ? 'text-white bg-white/[0.08] ring-1 ring-white/10'
                    : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
                style={active ? { boxShadow: `inset 0 -2px 0 ${tabAccent}` } : {}}
              >
                {shortLabel}
              </button>
            )
          })}
        </div>

        {/* Nav */}
        <nav className="relative flex-1 px-4 py-3 space-y-0.5 overflow-y-auto">
          <p className="eyebrow text-white/30 px-3 mb-2">Navigation</p>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/c2' || to === '/dashboard'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={16} className="opacity-80" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="relative px-5 py-4 border-t border-white/[0.07]">
          <div className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
            <div className="min-w-0">
              {isC2 ? (
                <>
                  <p className="text-white/70 text-2xs font-medium leading-tight">Campagne 2 · Sales outreach</p>
                  <p className="text-white/35 text-2xs mt-1 leading-snug">Matching sellers → marketplaces</p>
                </>
              ) : (
                <>
                  <p className="text-white/70 text-2xs font-medium leading-tight">Amazon FR → 8 marketplaces</p>
                  <p className="text-white/35 text-2xs mt-1 leading-snug">Mode · Beauté · Maison · Sport · +4</p>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-8 py-8 overflow-auto">
          <div className="max-w-[1400px] mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  )
}
