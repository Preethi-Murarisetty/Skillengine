// src/utils/admin.js
//
// Decides whether a logged-in user should get the admin dashboard.
//
// The backend's /login and /me responses are inspected for the usual role
// markers. If your backend doesn't send a role, list admin emails in
// `.env` instead:   VITE_ADMIN_EMAILS=admin@example.com,other@example.com

const ADMIN_ROLE_NAMES = ['admin', 'administrator', 'superadmin', 'super_admin', 'super-admin'];

const adminEmails = String(import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const isAdminRoleName = (value) =>
  typeof value === 'string' && ADMIN_ROLE_NAMES.includes(value.trim().toLowerCase());

export const isAdminUser = (user) => {
  if (!user || typeof user !== 'object') return false;

  // Boolean flags
  if ([user.is_admin, user.isAdmin, user.is_superuser, user.isSuperuser, user.is_staff, user.isStaff].some((flag) => flag === true)) {
    return true;
  }

  // Single role string
  if ([user.role, user.user_role, user.userRole, user.user_type, user.userType, user.type, user.account_type]
    .some(isAdminRoleName)) {
    return true;
  }

  // Role list, either strings or { name } objects
  const roles = user.roles ?? user.user_roles;
  if (Array.isArray(roles) && roles.some((r) => isAdminRoleName(typeof r === 'string' ? r : r?.name))) {
    return true;
  }

  // Email allow-list from .env
  const email = String(user.email || '').toLowerCase();
  return !!email && adminEmails.includes(email);
};
