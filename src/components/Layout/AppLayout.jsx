import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBell,
  FaChartBar,
  FaChartLine,
  FaClipboardCheck,
  FaClipboardList,
  FaCog,
  FaDumbbell,
  FaFileAlt,
  FaHome,
  FaLaptopCode,
  FaMicrophone,
  FaRocket,
  FaSignOutAlt,
  FaUser,
} from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { isAdminUser } from '../../utils/admin';
import BrandLogo from '../common/BrandLogo';

const navItems = [
  { label: 'Dashboard', icon: <FaHome />, path: '/' },
];

// Everything that existed before the assessment module now lives under "Practice".
const practiceItems = [
  { label: 'Quiz', icon: <FaClipboardList />, path: '/quiz' },
  { label: 'Resume', icon: <FaFileAlt />, path: '/resume' },
  { label: 'Interviews', icon: <FaMicrophone />, path: '/interviews' },
  { label: 'Coding', icon: <FaChartLine />, path: '/upcoming-assignment' },
  { label: 'Performance', icon: <FaChartLine />, path: '/performance' },
];

// Assessment has two sections: MCQ & Coding (existing /assessments page)
// and Interview (separate setup page).
const assessmentItems = [
  { label: 'MCQ & Coding', icon: <FaLaptopCode />, path: '/assessments' },
  { label: 'Interview', icon: <FaMicrophone />, path: '/assessments/interview' },
];

const isAssessmentInterviewPath = (pathname) => pathname.toLowerCase().startsWith('/assessments/interview');

const isAssessmentItemActive = (label, pathname) => {
  const path = pathname.toLowerCase();
  if (label === 'Interview') return isAssessmentInterviewPath(path);
  if (label === 'MCQ & Coding') return path.startsWith('/assessments') && !isAssessmentInterviewPath(path);
  return false;
};

// All quiz-related routes: setup (/quiz), instructions (/quiz/start),
// the test (/Phase1Test) and the result (/phase1/result).
const isQuizPath = (pathname) => {
  const path = pathname.toLowerCase();
  return path.startsWith('/quiz') || path.startsWith('/phase1') || path === '/practice';
};

const isPracticeItemActive = (label, pathname) => {
  if (label === 'Quiz') return isQuizPath(pathname);
  if (label === 'Resume') return pathname === '/resume' || pathname === '/intro' || pathname === '/upload-resume';
  if (label === 'Interviews') return pathname === '/interviews' || pathname === '/interview' || pathname === '/interview/questions';
  if (label === 'Coding') return pathname === '/upcoming-assignment';
  if (label === 'Performance') return pathname === '/performance';
  return false;
};

const pageNames = [
  { match: (path) => path === '/' || path === '/dashboard', name: 'Overview' },
  { match: (path) => isQuizPath(path), name: 'Quiz' },
  { match: (path) => path === '/performance', name: 'Performance' },
  { match: (path) => path === '/report' || path === '/interview/report', name: 'Interview Report' },
  { match: (path) => path === '/interviews' || path === '/interview' || path === '/interview/questions', name: 'Interviews' },
  { match: (path) => path === '/upcoming-assignment', name: 'Coding' },
  { match: (path) => path === '/resume' || path === '/intro' || path === '/upload-resume', name: 'Resume' },
  { match: (path) => isAssessmentInterviewPath(path), name: 'Assessment Interview' },
  { match: (path) => path.toLowerCase().startsWith('/assessments'), name: 'Assessment' },
  { match: (path) => path === '/profile', name: 'Profile' },
];

const getPageName = (pathname) => pageNames.find(({ match }) => match(pathname))?.name || 'skillEngine';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isPracticeOpen, setIsPracticeOpen] = useState(true);
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(true);

  const handleNavigation = (path) => {
    onClose();
    navigate(path);
  };

  const isDashboardActive = location.pathname === '/' || location.pathname === '/dashboard';
  const isPracticeActive = practiceItems.some((item) => isPracticeItemActive(item.label, location.pathname));
  const isAssessmentActive = assessmentItems.some((item) => isAssessmentItemActive(item.label, location.pathname));

  return (
    <aside className={`dashboard-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="dashboard-brand"><BrandLogo className="dashboard-shell-logo" /></div>
      <nav className="dashboard-nav" aria-label="Dashboard navigation">
        {navItems.map((item) => (
          <button type="button" key={item.label} onClick={() => handleNavigation(item.path)} className={`dashboard-nav-item ${isDashboardActive ? 'is-active' : ''}`}><span>{item.icon}</span>{item.label}</button>
        ))}
        <button type="button" aria-expanded={isPracticeOpen} onClick={() => setIsPracticeOpen((open) => !open)} className={`dashboard-nav-item ${isPracticeActive ? 'is-active' : ''}`}><span><FaDumbbell /></span>Practice<span className="dashboard-nav-chevron">{isPracticeOpen ? '⌃' : '⌄'}</span></button>
        {isPracticeOpen && <div className="dashboard-subnav">{practiceItems.map((item) => (
          <button type="button" key={item.label} onClick={() => handleNavigation(item.path)} className={`dashboard-subnav-item ${isPracticeItemActive(item.label, location.pathname) ? 'is-active' : ''}`}><span>{item.icon}</span>{item.label}</button>
        ))}</div>}
        <button type="button" aria-expanded={isAssessmentOpen} onClick={() => setIsAssessmentOpen((open) => !open)} className={`dashboard-nav-item ${isAssessmentActive ? 'is-active' : ''}`}><span><FaClipboardCheck /></span>Assessment<span className="dashboard-nav-chevron">{isAssessmentOpen ? '⌃' : '⌄'}</span></button>
        {isAssessmentOpen && <div className="dashboard-subnav">{assessmentItems.map((item) => (
          <button type="button" key={item.label} onClick={() => handleNavigation(item.path)} className={`dashboard-subnav-item ${isAssessmentItemActive(item.label, location.pathname) ? 'is-active' : ''}`}><span>{item.icon}</span>{item.label}</button>
        ))}</div>}
      </nav>
      <div className="sidebar-prompt"><FaRocket /><strong>Your skills<br />build your future</strong><span>Keep taking quizzes,<br />keep growing!</span></div>
    </aside>
  );
};

const ProfileDropdown = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const openProfile = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  return (
    <div className="dashboard-profile-menu" ref={menuRef}>
      <button type="button" className="dashboard-user-button" aria-expanded={isOpen} aria-haspopup="menu" onClick={() => setIsOpen((open) => !open)}>
        <span className="dashboard-avatar">{(user?.fullName || 'U').charAt(0).toUpperCase()}</span>
        <span>{user?.fullName || 'User'}</span>
        <span className="dashboard-chevron">⌄</span>
      </button>
      {isOpen && <div className="dashboard-dropdown" role="menu">
        <button type="button" onClick={openProfile}><FaUser /> Profile</button>
        <button type="button" onClick={openProfile}><FaCog /> Settings</button>
        {isAdminUser(user) && <button type="button" onClick={() => { setIsOpen(false); navigate('/admin/dashboard'); }}><FaChartBar /> Admin Dashboard</button>}
        <button type="button" onClick={onLogout}><FaSignOutAlt /> Logout</button>
      </div>}
    </div>
  );
};

const NotificationPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const notifications = [
    { title: 'Interview reminder', detail: 'Your mock interview is scheduled for today at 4:00 PM.', time: '2m ago', unread: true },
    { title: 'Coding assignment', detail: 'New frontend challenge unlocked in your dashboard.', time: '18m ago', unread: true },
    { title: 'Profile update', detail: 'Your latest skill summary has been synced.', time: '1h ago', unread: false },
  ];

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setIsOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className="dashboard-notification-wrapper" ref={panelRef}>
      <button
        type="button"
        className={`dashboard-icon-button dashboard-notification-button ${isOpen ? 'is-active' : ''}`}
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <FaBell />
        <span className="dashboard-notification-dot" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="dashboard-notification-panel" role="dialog" aria-label="Notifications panel">
          <div className="dashboard-notification-header">
            <h3>Notifications</h3>
            <span>3 new</span>
          </div>

          <div className="dashboard-notification-list">
            {notifications.map((item, index) => (
              <button type="button" key={index} className="dashboard-notification-item">
                <span className={`dashboard-notification-bullet ${item.unread ? 'is-unread' : ''}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <small>{item.time}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TopHeader = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-mobile-brand"><button type="button" className="dashboard-menu-button" onClick={onMenuToggle} aria-label="Toggle dashboard menu">☰</button><BrandLogo className="dashboard-shell-mobile-logo" /></div>
      <div className="dashboard-breadcrumb"><span>Dashboard</span><span>/</span><strong>{getPageName(location.pathname)}</strong></div>
      <div className="dashboard-user-actions">
        <NotificationPanel />
        <ProfileDropdown user={user} onLogout={handleLogout} />
      </div>
    </header>
  );
};

const AppLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-page">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="dashboard-content">
        <TopHeader onMenuToggle={() => setIsSidebarOpen((open) => !open)} />
        <div className="app-page-content">{children || <Outlet />}</div>
      </div>
    </div>
  );
};

export { AppLayout, Sidebar, TopHeader, ProfileDropdown };
export default AppLayout;