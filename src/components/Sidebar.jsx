import { Home, Database, AlertCircle, FileText, Users, Wrench, Building2, ChevronLeft, ChevronRight, LogOut, BarChart2, Settings, LayoutGrid } from 'lucide-react'
import logo from '../image-1779305303942.png'

const NAV_BG      = '#1C3461'
const ACTIVE_BG   = 'rgba(255,255,255,0.14)'
const HOVER_BG    = 'rgba(255,255,255,0.07)'
const DIVIDER     = 'rgba(255,255,255,0.10)'
const TEXT_ON     = '#ffffff'
const TEXT_DIM    = 'rgba(255,255,255,0.55)'
const TEXT_FAINT  = 'rgba(255,255,255,0.35)'
const ACCENT_LINE = 'rgba(255,255,255,0.65)'

const navItems = [
  { id: 'dashboard',        label: 'Översikt',       icon: Home       },
  { id: 'fastigheter',      label: 'Fastigheter',    icon: Building2  },
  { id: 'register',         label: 'Portregister',   icon: Database   },
  { id: 'arenden',          label: 'Ärenden',        icon: AlertCircle },
  { id: 'protokoll',        label: 'Protokoll',      icon: FileText   },
  { id: 'montageplanering', label: 'Montering',      icon: Wrench     },
  { id: 'planeringstavla',  label: 'Planeringstavla', icon: LayoutGrid },
  { id: 'kunder',           label: 'Kunder',         icon: Users      },
  { id: 'statistik',    label: 'Statistik',     icon: BarChart2,  adminOnly: true },
  { id: 'installningar', label: 'Inställningar', icon: Settings,   adminOnly: true },
]

export default function Sidebar({ active, onNav, oppnaArenden = 0, öppen = true, erMobil = false, onToggle, onLoggaUt, epost = '', roll = '' }) {

  const visibleItems = navItems.filter(item => !item.adminOnly || roll === 'admin')

  if (erMobil && !öppen) return null

  const bredd = öppen ? 220 : 58

  return (
    <aside style={{
      width: bredd,
      flexShrink: 0,
      background: NAV_BG,
      display: 'flex',
      flexDirection: 'column',
      padding: '0 0 16px',
      height: '100vh',
      position: erMobil ? 'fixed' : 'sticky',
      top: 0,
      left: 0,
      zIndex: erMobil ? 50 : 'auto',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>

      {/* Logo / Topprad */}
      <div style={{
        padding: öppen ? '14px 16px' : '14px 0',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: öppen ? 'space-between' : 'center',
        flexShrink: 0,
        boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
      }}>
        {öppen && <img src={logo} alt="NMV Portservice" style={{ width: 120, display: 'block' }} />}
        {!öppen && (
          <div style={{
            width: 30, height: 30, background: NAV_BG, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '-0.5px' }}>N</span>
          </div>
        )}

        {!erMobil && (
          <button onClick={onToggle} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#9298AE',
            display: 'flex', alignItems: 'center', padding: 2, marginLeft: öppen ? 0 : 'auto',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#1C2235'}
          onMouseLeave={e => e.currentTarget.style.color = '#9298AE'}
          >
            {öppen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: öppen ? '8px 10px' : '8px 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {visibleItems.map(({ id, label, icon: Icon, adminOnly }) => {
          const isActive = active === id
          return (
            <div key={id}>
              {adminOnly && <div style={{ height: 1, background: DIVIDER, margin: '6px 0' }} />}
              <button
                onClick={() => onNav(id)}
                title={!öppen ? label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: öppen ? 10 : 0,
                  justifyContent: öppen ? 'flex-start' : 'center',
                  padding: öppen ? '8px 10px 8px 10px' : '10px 0',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? ACTIVE_BG : 'transparent',
                  color: isActive ? TEXT_ON : TEXT_DIM,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  borderLeft: öppen ? `3px solid ${isActive ? ACCENT_LINE : 'transparent'}` : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = HOVER_BG
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = TEXT_DIM
                  }
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {öppen && label}
                {id === 'arenden' && oppnaArenden > 0 && (
                  <span style={{
                    marginLeft: öppen ? 'auto' : undefined,
                    position: öppen ? 'static' : 'absolute',
                    top: öppen ? undefined : 4,
                    right: öppen ? undefined : 4,
                    background: '#C0392B', color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 10,
                    lineHeight: 1.4,
                  }}>
                    {oppnaArenden}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </nav>

      {/* Stäng-knapp på mobil */}
      {erMobil && (
        <button onClick={onToggle} style={{
          margin: '8px 10px 0',
          background: HOVER_BG,
          border: `1px solid ${DIVIDER}`,
          borderRadius: 8,
          color: TEXT_DIM,
          fontSize: 12,
          padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}>
          <ChevronLeft size={14} /> Stäng meny
        </button>
      )}

      {/* Footer */}
      <div style={{
        padding: öppen ? '12px 16px 0' : '12px 6px 0',
        borderTop: `1px solid ${DIVIDER}`,
        flexShrink: 0,
      }}>
        {öppen ? (
          <>
            <div style={{
              fontSize: 11, color: TEXT_FAINT,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginBottom: 8,
            }}>{epost}</div>
            <button onClick={onLoggaUt} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              background: 'none',
              border: `1px solid ${DIVIDER}`,
              borderRadius: 6,
              color: TEXT_DIM,
              fontSize: 12, padding: '6px 10px', cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = TEXT_ON; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.borderColor = DIVIDER }}
            >
              <LogOut size={13} /> Logga ut
            </button>
          </>
        ) : (
          <button onClick={onLoggaUt} title="Logga ut" style={{
            width: '100%', display: 'flex', justifyContent: 'center',
            background: 'none', border: 'none',
            color: TEXT_DIM, padding: '6px 0', cursor: 'pointer',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = TEXT_ON}
          onMouseLeave={e => e.currentTarget.style.color = TEXT_DIM}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  )
}
