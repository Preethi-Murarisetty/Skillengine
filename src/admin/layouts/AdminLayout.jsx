import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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
import BrandLogo from "../../components/common/BrandLogo";

const T = {
  sidebarWidth: 260,
  headerHeight: 64,
  orange: "#ea580c",
  orangeSoft: "#ffedd5",
  orangeHover: "#fdf1e8",
  text: "#374151",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  white: "#ffffff",
  bg: "#f7f7f8",
  red: "#dc2626",
  redSoft: "#fee2e2",
};

const dashboardSections = [
  { name: "Overview", section: "Overview", icon: <FaThLarge /> },
  { name: "Students", section: "Students", icon: <FaUserTie /> },
  { name: "Assessments", section: "Assessments", icon: <FaTasks /> },
  { name: "Academics", section: "Academics", icon: <FaLayerGroup /> },
  { name: "Institutions", section: "Institutions", icon: <FaLayerGroup /> },
];

const otherMenuItems = [
  { name: "Quiz Manual", path: "/admin/quiz", icon: <FaClipboardList /> },
  { name: "Quiz PDF", path: "/admin/resume", icon: <FaFilePdf /> },
  { name: "Interviews", path: "/admin/interviews", icon: <FaUserTie /> },
  { name: "Coding", path: "/admin/coding", icon: <FaCode /> },
  { name: "Assessment", path: "/admin/assessment", icon: <FaTasks /> },
  { name: "Performance", path: "/admin/analytics", icon: <FaChartLine /> },
  { name: "Master Data", path: "/admin/master-data", icon: <FaLayerGroup /> },
];

function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName =
    user?.fullName || user?.name || user?.email || "Admin";

  const activeSection =
    new URLSearchParams(location.search).get("section") || "Overview";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("access_token");
    }

    window.location.assign("/admin/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  const linkStyle = (active, nested = false) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    padding: nested ? "0 12px 0 28px" : "0 14px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: nested ? 13 : 14,
    fontWeight: active ? 600 : 500,
    color: active ? T.orange : T.text,
    background: active ? T.orangeSoft : "transparent",
    marginBottom: 4,
    boxSizing: "border-box",
    position: "relative",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        .se-sidebar-link:hover {
          background: ${T.orangeHover};
          color: ${T.orange};
        }

        .se-sidebar-link.active::before {
          content: "";
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 3px;
          background: ${T.orange};
        }

        @media (max-width: 900px) {
          .se-sidebar {
            position: fixed !important;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: 50;
            transform: translateX(-100%);
            transition: transform .25s ease;
          }

          .se-sidebar.se-open {
            transform: translateX(0);
          }

          .se-mobile-toggle {
            display: inline-flex !important;
          }

          .se-sidebar-close {
            display: inline-flex !important;
          }

          .se-overlay {
            display: block !important;
          }
        }

        @media (max-width: 480px) {
          .se-profile-name {
            display: none;
          }

          .se-content {
            padding: 16px !important;
          }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {sidebarOpen && (
          <div
            className="se-overlay"
            onClick={closeSidebar}
            style={{
              display: "none",
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,.4)",
              zIndex: 40,
            }}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`se-sidebar ${sidebarOpen ? "se-open" : ""}`}
          style={{
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
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              height: T.headerHeight,
              padding: "0 16px",
              borderBottom: `1px solid ${T.border}`,
              flexShrink: 0,
            }}
          >
            <BrandLogo className="admin-sidebar-brand-logo" />

            <button
              type="button"
              className="se-sidebar-close"
              onClick={closeSidebar}
              aria-label="Close menu"
              style={{
                display: "none",
                marginLeft: "auto",
                border: 0,
                background: "transparent",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              <FaTimes />
            </button>
          </div>

          <nav style={{ flex: 1, padding: 12 }}>
            {/* Dashboard parent */}
            <NavLink
              to="/admin/dashboard?section=Overview"
              onClick={closeSidebar}
              className="se-sidebar-link"
              style={linkStyle(
                location.pathname === "/admin/dashboard" &&
                  activeSection === "Overview"
              )}
            >
              <FaThLarge />
              Dashboard
            </NavLink>

            {/* Dashboard sections */}
            <div
              style={{
                margin: "4px 0 12px",
                paddingLeft: 8,
                borderLeft: `1px solid ${T.border}`,
                marginLeft: 15,
              }}
            >
              {dashboardSections.map((item) => {
                const active =
                  location.pathname === "/admin/dashboard" &&
                  activeSection === item.section;

                return (
                  <NavLink
                    key={item.section}
                    to={`/admin/dashboard?section=${encodeURIComponent(
                      item.section
                    )}`}
                    onClick={closeSidebar}
                    className="se-sidebar-link"
                    style={linkStyle(active, true)}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Other existing pages */}
            {otherMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className="se-sidebar-link"
                style={({ isActive }) => linkStyle(isActive)}
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div style={{ padding: 12, borderTop: `1px solid ${T.border}` }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                height: 44,
                padding: "0 14px",
                border: 0,
                borderRadius: 10,
                background: "transparent",
                color: T.red,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <header
            style={{
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
            }}
          >
            <button
              type="button"
              className="se-mobile-toggle"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label="Toggle menu"
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                background: T.white,
                cursor: "pointer",
              }}
            >
              <FaBars />
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginRight: "auto",
                color: T.textMuted,
                fontSize: 14,
              }}
            >
              <BrandLogo className="admin-header-brand-logo" />
              <span>/</span>
              <strong style={{ color: "#111827" }}>
                {location.pathname === "/admin/dashboard"
                  ? activeSection
                  : otherMenuItems.find(
                      (item) => item.path === location.pathname
                    )?.name || "Admin"}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                color: T.text,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: T.orange,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>

              <span className="se-profile-name" style={{ fontWeight: 600 }}>
                {displayName}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 34,
                  padding: "0 12px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  background: T.white,
                  cursor: "pointer",
                  color: T.text,
                }}
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </header>

          <main
            className="se-content"
            style={{ flex: 1, padding: 24, minWidth: 0 }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;