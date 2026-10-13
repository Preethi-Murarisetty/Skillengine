import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  FaThLarge,
  FaClipboardList,
  FaFilePdf,
  FaUserTie,
  FaCode,
  FaTasks,
  FaChartLine,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaLayerGroup,
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS (mirror these in the <style> block below)
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  sidebarWidth: 260,
  headerHeight: 64,
  rowHeight: 44,
  rowGap: 4,
  rowPadX: 14,
  iconSize: 18,
  iconGap: 12,
  radius: 10,
  orange: "#ea580c",
  orangeSoft: "#ffedd5",
  orangeHover: "#fdf1e8",
  text: "#374151",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  borderSoft: "#eadfd6",
  white: "#ffffff",
  bg: "#f7f7f8",
  red: "#dc2626",
  redSoft: "#fee2e2",
};

const menuItems = [
  { name: "Dashboard",   path: "/admin/dashboard",   icon: <FaThLarge /> },
  { name: "Quiz Manual", path: "/admin/quiz",        icon: <FaClipboardList /> },
  { name: "Quiz PDF",    path: "/admin/resume",      icon: <FaFilePdf /> },
  { name: "Interviews",  path: "/admin/interviews",  icon: <FaUserTie /> },
  { name: "Coding",      path: "/admin/coding",      icon: <FaCode /> },
  { name: "Assessment",  path: "/admin/assessment",  icon: <FaTasks /> },
  { name: "Performance", path: "/admin/analytics",   icon: <FaChartLine /> },
  { name: "Master Data", path: "/admin/master-data", icon: <FaLayerGroup /> }
];

function AdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovered, setHovered] = useState(null);     // track hovered link path
  const [logoutHover, setLogoutHover] = useState(false);
  const [profileLogoutHover, setProfileLogoutHover] = useState(false);
  const [toggleHover, setToggleHover] = useState(false);

  const displayName = user?.fullName || user?.name || user?.email || "Admin";

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      localStorage.removeItem("authToken");
      localStorage.removeItem("access_token");
    }
    window.location.assign("/admin/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  // ─────────────────────────────────────────────────────────────────────────
  // INLINE STYLE OBJECTS
  // ─────────────────────────────────────────────────────────────────────────
  const s = {
    root: {
      minHeight: "100vh",
      background: T.bg,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    layout: {
      display: "flex",
      minHeight: "100vh",
    },

    // ── Sidebar ──
    sidebar: {
      display: "flex",
      flexDirection: "column",
      width: T.sidebarWidth,
      flexShrink: 0,
      background: T.white,
      borderRight: `1px solid ${T.border}`,
      height: "100vh",
      position: "sticky",
      top: 0,
      boxSizing: "border-box",
      // mobile drawer handled by media query in <style>
      transform: sidebarOpen ? "translateX(0)" : undefined,
      transition: "transform 0.25s ease",
    },
    logoRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      height: T.headerHeight,
      padding: "0 16px",
      borderBottom: `1px solid ${T.border}`,
      flexShrink: 0,
      boxSizing: "border-box",
    },
    logoBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: T.orange,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 15,
      flexShrink: 0,
    },
    logoText: {
      fontSize: 16,
      fontWeight: 700,
      color: "#111827",
      whiteSpace: "nowrap",
    },
    sidebarClose: {
      display: "none",                 // shown only on mobile via <style>
      marginLeft: "auto",
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      border: "none",
      borderRadius: 8,
      color: T.textMuted,
      fontSize: 16,
      cursor: "pointer",
    },
    menu: {
      display: "flex",
      flexDirection: "column",
      gap: T.rowGap,
      padding: 12,
      overflowY: "auto",
      flex: "1 1 auto",
    },
    linkBase: {
      display: "flex",
      alignItems: "center",
      gap: T.iconGap,
      height: T.rowHeight,
      padding: `0 ${T.rowPadX}px`,
      borderRadius: T.radius,
      color: T.text,
      fontWeight: 500,
      fontSize: 14,
      textDecoration: "none",
      lineHeight: 1,
      boxSizing: "border-box",
      transition: "background 0.15s ease, color 0.15s ease",
      position: "relative",
    },
    iconBox: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: T.iconSize,
      height: T.iconSize,
      fontSize: 15,
      flexShrink: 0,
      lineHeight: 1,
    },
    label: {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    footer: {
      flexShrink: 0,
      padding: 12,
      borderTop: `1px solid ${T.border}`,
    },
    logoutBtn: {
      display: "flex",
      alignItems: "center",
      gap: T.iconGap,
      width: "100%",
      height: T.rowHeight,
      padding: `0 ${T.rowPadX}px`,
      border: "none",
      background: logoutHover ? T.redSoft : "transparent",
      borderRadius: T.radius,
      color: T.red,
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer",
      textAlign: "left",
      boxSizing: "border-box",
      transition: "background 0.15s ease",
    },

    // ── Main ──
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      height: T.headerHeight,
      padding: "0 24px",
      background: T.white,
      borderBottom: `1px solid ${T.border}`,
      position: "sticky",
      top: 0,
      zIndex: 20,
      boxSizing: "border-box",
    },
    toggleBtn: {
      display: "none",                 // shown only on mobile via <style>
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      border: `1px solid ${T.borderSoft}`,
      background: toggleHover ? T.orangeHover : T.white,
      color: toggleHover ? T.orange : T.text,
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 15,
      flexShrink: 0,
      transition: "background 0.15s ease, color 0.15s ease",
    },
    breadcrumb: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 14,
      color: T.textMuted,
      marginRight: "auto",
    },
    breadcrumbSep: { color: "#d1d5db" },
    breadcrumbStrong: { color: "#111827", fontWeight: 600 },

    profile: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 14,
      color: T.text,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      background: T.orange,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 14,
      flexShrink: 0,
    },
    profileName: {
      fontWeight: 600,
      maxWidth: 160,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    profileLogout: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 34,
      padding: "0 14px",
      border: `1px solid ${
        profileLogoutHover ? "#fecaca" : T.borderSoft
      }`,
      borderRadius: 8,
      background: profileLogoutHover ? T.redSoft : T.white,
      color: profileLogoutHover ? T.red : T.text,
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      boxSizing: "border-box",
      transition:
        "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
    },
    content: {
      flex: 1,
      padding: 24,
      minWidth: 0,
    },
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.4)",
      zIndex: 40,
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {/* Only things that CANNOT be inline: media queries + :hover on <a> */}
      <style>{`
        .se-sidebar { transition: transform 0.25s ease; }
        .se-sidebar-link:hover { background: ${T.orangeHover}; color: ${T.orange}; }
        .se-sidebar-link.active { background: ${T.orangeSoft}; color: ${T.orange}; font-weight: 600; }
        .se-sidebar-link.active::before {
          content: "";
          position: absolute;
          left: -12px;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 3px;
          background: ${T.orange};
        }
        .se-sidebar-close:hover { background: #f3f4f6; color: #111827; }

        @media (max-width: 900px) {
          .se-sidebar {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            height: 100vh;
            z-index: 50;
            transform: translateX(-100%);
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          }
          .se-sidebar.se-open { transform: translateX(0); }
          .se-sidebar-close { display: inline-flex !important; }
          .se-toggle { display: inline-flex !important; }
        }
        @media (min-width: 901px) {
          .se-overlay { display: none !important; }
        }
        @media (max-width: 480px) {
          .se-profile-name { display: none !important; }
          .se-content { padding: 16px !important; }
        }
      `}</style>

      <div style={s.layout}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="se-overlay"
            onClick={closeSidebar}
            style={s.overlay}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`se-sidebar ${sidebarOpen ? "se-open" : ""}`}
          style={s.sidebar}
        >
          {/* Logo row */}
          <div style={s.logoRow}>
            <div style={s.logoBox}>S</div>
            <span style={s.logoText}>skillEngine</span>
            <button
              type="button"
              className="se-sidebar-close"
              onClick={closeSidebar}
              aria-label="Close menu"
              style={s.sidebarClose}
            >
              <FaTimes />
            </button>
          </div>

          {/* Menu */}
          <nav style={s.menu}>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                onMouseEnter={() => setHovered(item.path)}
                onMouseLeave={() => setHovered(null)}
                className={({ isActive }) =>
                  `se-sidebar-link ${isActive ? "active" : ""}`
                }
                style={{
                  ...s.linkBase,
                  background:
                    hovered === item.path ? T.orangeHover : "transparent",
                  color: hovered === item.path ? T.orange : T.text,
                }}
              >
                <span style={s.iconBox}>{item.icon}</span>
                <span style={s.label}>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer: logout pinned to bottom */}
          <div style={s.footer}>
            <button
              type="button"
              onClick={handleLogout}
              onMouseEnter={() => setLogoutHover(true)}
              onMouseLeave={() => setLogoutHover(false)}
              style={s.logoutBtn}
            >
              <span style={s.iconBox}>
                <FaSignOutAlt />
              </span>
              <span style={s.label}>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <div style={s.main}>
          <header style={s.header}>
            <button
              type="button"
              className="se-toggle"
              onClick={() => setSidebarOpen((v) => !v)}
              onMouseEnter={() => setToggleHover(true)}
              onMouseLeave={() => setToggleHover(false)}
              aria-label="Toggle menu"
              style={s.toggleBtn}
            >
              <FaBars />
            </button>

            <div style={s.breadcrumb}>
              <span>Dashboard</span>
              <span style={s.breadcrumbSep}>/</span>
              <strong style={s.breadcrumbStrong}>skillEngine</strong>
            </div>

            <div style={s.profile}>
              <div style={s.avatar}>{displayName.charAt(0).toUpperCase()}</div>
              <span className="se-profile-name" style={s.profileName}>
                {displayName}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                onMouseEnter={() => setProfileLogoutHover(true)}
                onMouseLeave={() => setProfileLogoutHover(false)}
                style={s.profileLogout}
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          </header>

          <main className="se-content" style={s.content}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;