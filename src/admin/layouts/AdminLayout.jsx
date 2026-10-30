import React, { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  FaTable,
  FaSearch,
  FaBell,
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import BrandLogo from "../../components/common/BrandLogo";

const T = {
  sidebarWidth: 260,
  headerHeight: 64,
  orange: "#F47721",
  orangeSoft: "#fff0e3",
  orangeHover: "#3a3734",
  text: "#292524",
  textMuted: "#78716c",
  border: "#e8e1da",
  white: "#ffffff",
  bg: "#FAF8F5",
  red: "#dc2626",
  redSoft: "#fee2e2",
};

const dashboardSections = [
  { name: "Overview", section: "Overview", icon: <FaThLarge /> },
  { name: "Students", section: "Students", icon: <FaUserTie /> },
  { name: "Institutional Student Data", section: "Institutional Student Data", icon: <FaTable /> },
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
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");

  const displayName =
    user?.fullName || user?.name || user?.email || "Admin";

  const dashboardParams = new URLSearchParams(location.search);
  const legacySection = dashboardParams.get("section");
  const activeSection = dashboardParams.get("dashboardTab") ||
    (dashboardSections.some((item) => item.section === legacySection) ? legacySection : "Dashboard");

  const assessmentPath = (() => {
    if (location.pathname !== "/admin/dashboard") return "/admin/assessment";
    const current = new URLSearchParams(location.search);
    const cohort = new URLSearchParams();
    ["institution", "campus", "course", "year", "department", "section", "semester"].forEach((key) => {
      const value = current.get(key);
      if (value) cohort.set(key, value);
    });
    const query = cohort.toString();
    return `/admin/assessment${query ? `?${query}` : ""}`;
  })();

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
    color: active ? "#ffffff" : "#e7e5e4",
    background: active ? "#3a3734" : "transparent",
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
          color: #ffffff;
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

        .se-admin-search:focus-within {
          border-color: ${T.orange};
          box-shadow: 0 0 0 3px rgba(244, 119, 33, .13);
        }

        @media (max-width: 700px) {
          .se-admin-search { display: none !important; }
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
              background: "rgba(25,22,20,.55)",
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
            background: "#242424",
            borderRight: "1px solid #373431",
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
              borderBottom: "1px solid #373431",
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
                color: "#f5f5f4",
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
              to="/admin/dashboard?section=Dashboard"
              onClick={closeSidebar}
              className="se-sidebar-link"
              style={linkStyle(
                location.pathname === "/admin/dashboard" &&
                  activeSection === "Dashboard"
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
                    to={`/admin/dashboard?dashboardTab=${encodeURIComponent(item.section)}${["institution", "campus", "course", "year", "department", "section", "semester"].map((key) => {
                      const value = location.pathname === "/admin/dashboard" ? dashboardParams.get(key) : null;
                      return value ? `&${encodeURIComponent(key)}=${encodeURIComponent(value)}` : "";
                    }).join("")}`}
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
                to={item.path === "/admin/assessment" ? assessmentPath : item.path}
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
              background: "rgba(255,255,255,.94)",
              borderBottom: `1px solid ${T.border}`,
              boxShadow: "0 2px 10px rgba(41, 37, 36, .035)",
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
                flexShrink: 0,
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

            <form className="se-admin-search" onSubmit={(event) => {
              event.preventDefault();
              const query = adminSearch.trim();
              if (!query) return;
              navigate(`/admin/dashboard?dashboardTab=Students&studentSearch=${encodeURIComponent(query)}`);
            }} style={{ display: "flex", alignItems: "center", gap: 9, width: "min(360px, 30vw)", height: 40, marginLeft: "auto", padding: "0 12px", border: `1px solid ${T.border}`, borderRadius: 10, background: "#FAF8F5", color: T.textMuted }}>
              <FaSearch size={13} aria-hidden="true" />
              <input aria-label="Search students" value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search students by name, ID, email" style={{ width: "100%", minWidth: 0, border: 0, outline: 0, background: "transparent", color: T.text, fontSize: 13 }} />
            </form>

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
                onClick={() => navigate("/admin/dashboard?dashboardTab=Assessments")}
                aria-label="View assessment notifications"
                title="View assessment activity"
                style={{ display: "grid", placeItems: "center", width: 38, height: 38, border: `1px solid ${T.border}`, borderRadius: 10, background: T.white, color: T.text, cursor: "pointer" }}
              >
                <FaBell />
              </button>

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