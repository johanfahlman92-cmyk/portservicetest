import { Home, ClipboardList, Calendar, Database, AlertCircle, FileText, Users, Wrench, Building2, ChevronLeft, ChevronRight, LogOut, BarChart2, Settings } from 'lucide-react'
import logo from '../image-1779305303942.png'

const navItems = [
  { id: 'dashboard',    label: 'Översikt',     icon: Home },
  { id: 'fastigheter',  label: 'Fastigheter',  icon: Building2 },
  { id: 'register',     label: 'Portregister', icon: Database },
  { id: 'arenden',      label: 'Ärenden',      icon: AlertCircle },
  { id: 'protokoll',    label: 'Protokoll',    icon: FileText },
  { id: 'montering',    label: 'Montering',    icon: Wrench   },
  { id: 'kalender',     label: 'Kalender',     icon: Calendar },
  { id: 'kunder',       label: 'Kunder',       icon: Users },
  { id: 'nytt-arende',  label: 'Nytt ärende',  icon: ClipboardList },
  { id: 'statistik',    label: 'Statistik',    icon: BarChart2 },
  // Inställningar visas bara för admin (filtreras i komponenten)
  { id: 'installningar', label: 'Inställningar', icon: Settings, adminOnly: true },
]

export default function Sidebar({ active, onNav, oppnaArenden = 0, öppen = true, erMobil = false, onToggle, onLoggaUt, epost = '', roll = '' }) {

  // Filtrera bort adminOnly-items om inte admin
  const visibleItems = navItems.filter(item => !item.adminOnly || roll === 'admin')

  // På mobil: dold när stängd
  if (erMobil && !öppen) return null

  const bredd = öppen ? 220 : 58

  return (
    <aside style={{
      width: bredd,
      flexShrink: 0,
      background: '#1a1917',
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
      }}>
        {öppen && <img src={logo} alt="NMV Portservice" style={{ width: 120, display: 'block' }} />}
        {!öppen && <div style={{ width: 28, height: 28, background: '#1D9E75', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>N</span>
        </div>}

        {/* Toggle-knapp — dölj på mobil (stängs via backdrop) */}
        {!erMobil && (
          <button onClick={onToggle} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#888',
            display: 'flex', alignItems: 'center', padding: 2, marginLeft: öppen ? 0 : 'auto',
          }}>
            {öppen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </div>

      <div style={{ borderTop: '1px solid #2a2925', margin: '0 0 8px' }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: öppen ? '0 10px' : '0 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {visibleItems.map(({ id, label, icon: Icon, adminOnly }) => {
          const isActive = active === id
          return (
            <div key={id}>
              {adminOnly && <div style={{ height: 1, background: '#2a2925', margin: '6px 0' }} />}
            <button onClick={() => onNav(id)}
              title={!öppen ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: öppen ? 10 : 0,
                justifyContent: öppen ? 'flex-start' : 'center',
                padding: öppen ? '8px 12px' : '10px 0',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: isActive ? '#2e2c28' : 'transparent',
                color: isActive ? '#fff' : '#8a8880',
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#232220'; e.currentTarget.style.color = '#ccc' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8880' } }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {öppen && label}
              {id === 'arenden' && oppnaArenden > 0 && (
                <span style={{
                  marginLeft: öppen ? 'auto' : undefined,
                  position: öppen ? 'static' : 'absolute',
                  top: öppen ? undefined : 4,
                  right: öppen ? undefined : 4,
                  background: '#A32D2D', color: '#fff',
                  fontSize: 10, fontWeight: 600,
                  padding: '1px 5px', borderRadius: 10,
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

      {/* Sidomeny-stängningsknapp på mobil */}
      {erMobil && (
        <button onClick={onToggle} style={{
          margin: '8px 10px 0',
          background: '#2a2925', border: 'none', borderRadius: 8,
          color: '#8a8880', fontSize: 12, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}>
          <ChevronLeft size={14} /> Stäng meny
        </button>
      )}

      {/* Footer */}
      <div style={{ padding: öppen ? '12px 20px 0' : '12px 6px 0', borderTop: '1px solid #2a2925', flexShrink: 0 }}>
        {öppen ? (
          <>
            <div style={{ fontSize: 11, color: '#5a5850', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{epost}</div>
            <button onClick={onLoggaUt} style={{
              marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: '1px solid #2a2925', borderRadius: 6,
              color: '#8a8880', fontSize: 12, padding: '6px 10px', cursor: 'pointer',
            }}>
              <LogOut size={13} /> Logga ut
            </button>
          </>
        ) : (
          <button onClick={onLoggaUt} title="Logga ut" style={{
            width: '100%', display: 'flex', justifyContent: 'center',
            background: 'none', border: 'none',
            color: '#5a5850', padding: '6px 0', cursor: 'pointer',
          }}>
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  )
}
