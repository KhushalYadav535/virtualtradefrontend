const STAFF_ROLES = ['admin', 'trainer'];

export function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(normalizeRole(role));
}

export function getDefaultDashboardPath(role) {
  return isStaffRole(role) ? '/dashboard/admin' : '/dashboard';
}

export function isStaffOnlyPath(pathname) {
  return pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/');
}
