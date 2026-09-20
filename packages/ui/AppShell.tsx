"use client";

import { useState, type ReactNode } from "react";
import { 
  Map as MapIcon, 
  Users, 
  BarChart, 
  MessageSquare, 
  LogOut,
  User,
  UserPlus,
  CalendarCheck,
  FileText,
  AlertTriangle,
  Megaphone,
  Settings,
  PieChart,
  Landmark,
  Headset,
  Package,
  Shield,
  Menu,
  X
} from "lucide-react";
import type { NavItemConfig } from "./role-home.js";
import { getNavSection } from "./role-home.js";
import { QuickCreateFab } from "./QuickCreateFab.js";

export type AppShellProps = Readonly<{
  children: ReactNode;
  userDisplayName: string;
  userRoleLabel: string;
  /**
   * Rol con el que se filtra el menú. Quien monte este componente tiene que pasar el rol
   * vigente en la base y no el que traiga la sesión: la cookie conserva el rol del momento
   * en que se inició sesión, y con ella el menú acaba enseñando pantallas que las guardas
   * del servidor —que sí consultan la base— le niegan a quien cambió de rol.
   */
  userRoleKey: string;
  activeNavKey: string;
  /**
   * Municipio de quien está usando el sistema. La marca se arma con él —"Zapopan OS"— en vez
   * de estar clavada a Tonalá: la aplicación es la misma, el territorio no.
   */
  municipality?: string | null | undefined;
  /** Nombre de respaldo mientras la persona no tenga municipio asignado. */
  appName?: string | undefined;
  logoutAction?: string;
}>;

const getIconForNavKey = (key: string, size = 18) => {
  switch (key) {
    case "resumen": return <BarChart size={size} />;
    case "analytics": return <PieChart size={size} />;
    case "crm": return <Users size={size} />;
    case "crm-nuevo": return <UserPlus size={size} />;
    case "equipo": return <CalendarCheck size={size} />;
    case "admin-equipos": return <Users size={size} />;
    case "admin-usuarios": return <Shield size={size} />;
    case "estructura": return <Landmark size={size} />;
    case "inbox": return <Headset size={size} />;
    case "mapa": return <MapIcon size={size} />;
    case "admin-incidencias": return <AlertTriangle size={size} />;
    case "escucha-social": return <MessageSquare size={size} />;
    case "admin-inbox": return <FileText size={size} />;
    case "reportes": return <Megaphone size={size} />;
    case "logistica": return <Package size={size} />;
    case "perfil": return <User size={size} />;
    case "settings": return <Settings size={size} />;
    default: return <MessageSquare size={size} />;
  }
};

type ElementoNav = NavItemConfig & { active: boolean };

/** Iniciales para el avatar de la sesión: dos letras bastan y no dependen de tener foto. */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

function EnlaceNav({ item, alNavegar }: { item: ElementoNav; alNavegar?: () => void }) {
  return (
    <a
      className={`nav-button ${item.active ? "is-active" : ""}`}
      href={item.href}
      // `aria-current` es lo que anuncia un lector de pantalla como "página actual": el color
      // de fondo solo lo dice a quien lo ve.
      {...(item.active ? { "aria-current": "page" as const } : {})}
      title={item.label}
      {...(alNavegar ? { onClick: alNavegar } : {})}
    >
      <span className="nav-icono">{getIconForNavKey(item.key)}</span>
      <span className="nav-texto">{item.label}</span>
    </a>
  );
}

/**
 * Un bloque del menú. Antes los cuatro grupos estaban escritos cuatro veces con los mismos
 * estilos en línea copiados; cambiar el menú obligaba a corregir cuatro sitios y siempre se
 * quedaba uno atrás.
 */
function SeccionNav({
  titulo,
  items,
  alNavegar
}: {
  titulo: string;
  items: ElementoNav[];
  alNavegar?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="nav-grupo">
      <p className="side-section-title">{titulo}</p>
      <nav className="nav-list" aria-label={titulo}>
        {items.map((item) => (
          <EnlaceNav key={item.key} item={item} {...(alNavegar ? { alNavegar } : {})} />
        ))}
      </nav>
    </div>
  );
}

export function AppShell({
  children,
  userDisplayName,
  userRoleLabel,
  userRoleKey,
  activeNavKey,
  municipality,
  appName,
  logoutAction = "/api/auth/logout"
}: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const cerrarCajon = () => setIsDrawerOpen(false);

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
  const marca = municipality ? `${municipality} OS` : (appName || "Jalisco OS");
  const activeTitle = allItems.find((n) => n.active)?.label ?? marca;

  return (
    <div className="shell">
      {/* DESKTOP SIDEBAR */}
      <aside className="sidebar" aria-label="Navegación general" style={{ paddingBottom: "24px" }}>
        <div className="brand" style={{ padding: "24px 20px 16px" }}>
          <div className="brand-mark" style={{ borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src="/brand/el-monograma-blanco.png"
              alt="EL"
              width={26}
              height={26}
              style={{ objectFit: "contain" }}
            />
          </div>
          <div>
            <h1 className="brand-title" style={{ fontSize: "20px", letterSpacing: "-0.5px" }}>{marca}</h1>
            <p className="brand-subtitle" style={{ color: "var(--primary-light)", fontWeight: 500 }}>Gestor de Campaña</p>
          </div>
        </div>

        <div className="sesion-tarjeta">
          <span className="sesion-avatar" aria-hidden="true">{iniciales(userDisplayName)}</span>
          <span className="sesion-datos">
            <span className="sesion-nombre" title={userDisplayName}>{userDisplayName}</span>
            <span className="sesion-rol">{userRoleLabel}</span>
          </span>
        </div>

        <div className="sidebar-scrollable">
          <SeccionNav titulo="Panel de Control" items={dashboardItems} />
          <SeccionNav titulo="Estructura y CRM" items={estructuraItems} />
          <SeccionNav titulo="Territorio y Operación" items={territorioItems} />
          <SeccionNav titulo="Configuración" items={configuracionItems} />
        </div>

        {/* Profile / Logout Section at bottom */}
        <div className="sidebar-salida">
          <form action={logoutAction} method="post">
            <button className="nav-button nav-salir" type="submit">
              <span className="nav-icono"><LogOut size={18} /></span>
              <span className="nav-texto">Cerrar sesión</span>
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
        <div style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
          {children}
        </div>
      </main>

      {/* MOBILE DRAWER */}
      {isDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="brand" style={{ padding: "0", border: "none" }}>
                <div className="brand-mark" style={{ borderRadius: "8px", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                    src="/brand/el-monograma-blanco.png"
                    alt="EL"
                    width={21}
                    height={21}
                    style={{ objectFit: "contain" }}
                  />
                </div>
                <div>
                  <h1 className="brand-title" style={{ fontSize: "16px" }}>{marca}</h1>
                  <p className="brand-subtitle" style={{ margin: 0, fontSize: "10px" }}>Gestor de Campaña</p>
                </div>
              </div>
              <button className="mobile-drawer-close" onClick={() => setIsDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="mobile-drawer-content sidebar-scrollable">
              {/* Las mismas secciones que en el escritorio: una lista corrida de trece enlaces
                  obligaba a leerlos todos para encontrar uno. */}
              <SeccionNav titulo="Panel de Control" items={dashboardItems} alNavegar={cerrarCajon} />
              <SeccionNav titulo="Estructura y CRM" items={estructuraItems} alNavegar={cerrarCajon} />
              <SeccionNav titulo="Territorio y Operación" items={territorioItems} alNavegar={cerrarCajon} />
              <SeccionNav titulo="Configuración" items={configuracionItems} alNavegar={cerrarCajon} />
            </div>

            <div className="mobile-drawer-salida">
              <form action={logoutAction} method="post">
                <button className="nav-button nav-salir" type="submit">
                  <span className="nav-icono"><LogOut size={18} /></span>
                  <span className="nav-texto">Cerrar sesión</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-bottom-nav" aria-label="Navegación movil">
        {/* We take up to 4 most important items that the user has access to */}
        {allItems.filter((i) => i.key !== "perfil" && i.key !== "settings").slice(0, 4).map((item) => (
          <a
            key={item.key}
            className={`mobile-nav-button ${item.active ? "is-active" : ""}`}
            href={item.href}
            {...(item.active ? { "aria-current": "page" as const } : {})}
          >
            <span className="mobile-nav-marca" aria-hidden="true" />
            {getIconForNavKey(item.key, 21)}
            {/* Nombre corto: "Directorio Ciudadano" no cabe en un quinto de pantalla y se partía
                en tres renglones ilegibles. */}
            <span className="mobile-nav-texto">{item.corto ?? item.label}</span>
          </a>
        ))}
        {/* 'Más' abre el cajón con el menú completo */}
        <button className="mobile-nav-button" onClick={() => setIsDrawerOpen(true)} aria-haspopup="dialog">
          <span className="mobile-nav-marca" aria-hidden="true" />
          <Menu size={21} />
          <span className="mobile-nav-texto">Más</span>
        </button>
      </nav>

      {/* Crear incidencia o evento desde cualquier pantalla, sin ir al mapa. */}
      <QuickCreateFab userRoleKey={userRoleKey} />
    </div>
  );
}
