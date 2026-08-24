import type { ReactNode } from "react";
import { 
  Map as MapIcon, 
  Users, 
  BarChart, 
  MessageSquare, 
  AlertTriangle, 
  LogOut,
  User,
  Inbox,
  CalendarCheck,
  FileText,
  Megaphone,
  Settings,
  PieChart,
  Landmark,
  Headset,
  Package,
  Shield
} from "lucide-react";
import type { NavItemConfig } from "./role-home.js";
import { getNavSection } from "./role-home.js";
import "./styles.css";

export type AppShellProps = Readonly<{
  children: ReactNode;
  userDisplayName: string;
  userRoleLabel: string;
  userRoleKey: string;
  activeNavKey: string;
  logoutAction?: string;
}>;

const getIconForNavKey = (key: string, size = 18) => {
  switch (key) {
    case "resumen": return <BarChart size={size} />;
    case "analytics": return <PieChart size={size} />;
    case "crm": return <Users size={size} />;
    case "equipo": return <CalendarCheck size={size} />;
    case "admin-equipos": return <Users size={size} />;
    case "admin-usuarios": return <Shield size={size} />;
    case "estructura": return <Landmark size={size} />;
    case "inbox": return <Headset size={size} />;
    case "mapa": return <MapIcon size={size} />;
    case "admin-inbox": return <FileText size={size} />;
    case "reportes": return <Megaphone size={size} />;
    case "logistica": return <Package size={size} />;
    case "perfil": return <User size={size} />;
    case "settings": return <Settings size={size} />;
    default: return <MessageSquare size={size} />;
  }
};

export function AppShell({
  children,
  userDisplayName,
  userRoleLabel,
  userRoleKey,
  activeNavKey,
  logoutAction = "/api/auth/logout"
}: AppShellProps) {

  const filterNavItems = (items: NavItemConfig[]) => {
    return items
      .filter((item) => item.allowedRoles === "all" || item.allowedRoles.includes(userRoleKey))
      .map(item => ({
        ...item,
        active: item.key === activeNavKey
      }));
  };

  const dashboardItems = filterNavItems(getNavSection("dashboard"));
  const estructuraItems = filterNavItems(getNavSection("estructura"));
  const territorioItems = filterNavItems(getNavSection("territorio"));
  const configuracionItems = filterNavItems(getNavSection("configuracion"));

  const allItems = [...dashboardItems, ...estructuraItems, ...territorioItems, ...configuracionItems];
  const activeTitle = allItems.find((n) => n.active)?.label ?? "Tonalá OS";

  return (
    <div className="shell">
      {/* DESKTOP SIDEBAR */}
      <aside className="sidebar" aria-label="Navegación general" style={{ paddingBottom: "24px" }}>
        <div className="brand" style={{ padding: "24px 20px 16px" }}>
          <div className="brand-mark" aria-hidden="true" style={{ borderRadius: "8px" }} />
          <div>
            <h1 className="brand-title" style={{ fontSize: "20px", letterSpacing: "-0.5px" }}>Tonalá OS</h1>
            <p className="brand-subtitle" style={{ color: "var(--primary-light)", fontWeight: 500 }}>Gestor de Campaña</p>
          </div>
        </div>

        <div style={{ padding: '0 20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', textTransform: "uppercase", letterSpacing: "0.5px", color: 'var(--text-soft)', marginBottom: "4px" }}>Sesión Activa</div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: "white" }}>{userDisplayName}</div>
          <div style={{ fontSize: '12px', color: 'var(--primary-light)' }}>{userRoleLabel}</div>
        </div>
        
        <div className="sidebar-scrollable" style={{ flex: 1, overflowY: "auto", paddingRight: "8px" }}>
          {/* Dashboard Section */}
          {dashboardItems.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <p className="side-section-title" style={{ fontSize: "11px", letterSpacing: "1px", opacity: 0.6 }}>Panel de Control</p>
              <nav className="nav-list">
                {dashboardItems.map((item) => (
                  <a key={item.key} className={`nav-button ${item.active ? "is-active" : ""}`} href={item.href} style={{ borderRadius: "8px", margin: "2px 0" }}>
                    {getIconForNavKey(item.key)} {item.label}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Estructura Section */}
          {estructuraItems.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <p className="side-section-title" style={{ fontSize: "11px", letterSpacing: "1px", opacity: 0.6 }}>Estructura y CRM</p>
              <nav className="nav-list">
                {estructuraItems.map((item) => (
                  <a key={item.key} className={`nav-button ${item.active ? "is-active" : ""}`} href={item.href} style={{ borderRadius: "8px", margin: "2px 0" }}>
                    {getIconForNavKey(item.key)} {item.label}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Territory Section */}
          {territorioItems.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <p className="side-section-title" style={{ fontSize: "11px", letterSpacing: "1px", opacity: 0.6 }}>Territorio y Operación</p>
              <nav className="nav-list">
                {territorioItems.map((item) => (
                  <a key={item.key} className={`nav-button ${item.active ? "is-active" : ""}`} href={item.href} style={{ borderRadius: "8px", margin: "2px 0" }}>
                    {getIconForNavKey(item.key)} {item.label}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Settings Section */}
          {configuracionItems.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <p className="side-section-title" style={{ fontSize: "11px", letterSpacing: "1px", opacity: 0.6 }}>Configuración</p>
              <nav className="nav-list">
                {configuracionItems.map((item) => (
                  <a key={item.key} className={`nav-button ${item.active ? "is-active" : ""}`} href={item.href} style={{ borderRadius: "8px", margin: "2px 0" }}>
                    {getIconForNavKey(item.key)} {item.label}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Profile / Logout Section at bottom */}
        <div style={{ padding: "16px 20px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <form action={logoutAction} method="post">
            <button className="nav-button" type="submit" style={{ color: '#fca5a5', width: '100%', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: "8px" }}>
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="content" style={{ background: "#f1f5f9" }}>
        {/* DESKTOP TOPBAR */}
        <header className="topbar" style={{ 
          background: "rgba(241, 245, 249, 0.8)", 
          backdropFilter: "blur(12px)", 
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.05)", 
          padding: "12px 32px",
          position: "sticky",
          top: 0,
          zIndex: 30
        }}>
          <div>
            <h2 className="page-title" style={{ fontSize: "22px", letterSpacing: "-0.5px", color: "var(--blue-950)" }}>{activeTitle}</h2>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div className="user-chip" style={{ background: "white", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <User size={14} className="text-blue-600" />
              <span className="font-bold text-blue-950">{userDisplayName}</span>
            </div>
          </div>
        </header>

        {/* MOBILE HEADER */}
        <header className="mobile-header-top">
          <div>
            <h2 className="mobile-title">{activeTitle}</h2>
            <p className="mobile-subtitle">{userRoleLabel}</p>
          </div>
          <div className="user-chip">
            <User size={14} />
            {userDisplayName}
          </div>
        </header>

        {/* CHILDREN (VIEWS) */}
        <div style={{ height: "calc(100vh - 64px)", overflowY: "auto" }}>
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-bottom-nav" aria-label="Navegación movil">
        {/* We take up to 4 most important items that the user has access to */}
        {allItems.filter(i => i.key !== "perfil" && i.key !== "settings").slice(0, 4).map((item) => (
          <a key={item.key} className={`mobile-nav-button ${item.active ? "is-active" : ""}`} href={item.href}>
            {getIconForNavKey(item.key, 22)}
            <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: item.active ? 700 : 500 }}>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
