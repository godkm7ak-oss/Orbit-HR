/* ================================================
   ORBIT HR — Auth Guard & Session
   ================================================ */

const Auth = (() => {

  function currentUser() {
    const session = DB.Session.get();
    if (!session?.userId) return null;
    return DB.Users.get(session.userId);
  }

  function currentCompany() {
    const session = DB.Session.get();
    if (!session?.companyId) return null;
    return DB.Companies.get(session.companyId);
  }

  function isLoggedIn() {
    return !!DB.Session.userId();
  }

  // Redirect to auth if not logged in
  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'auth.html';
      return null;
    }
    return currentUser();
  }

  // Redirect if logged in already (for auth page)
  function requireGuest() {
    if (isLoggedIn()) {
      window.location.href = 'dashboard.html';
    }
  }

  // Require specific roles
  function requireRole(...roles) {
    const user = requireAuth();
    if (!user) return null;
    if (!roles.includes(user.role)) {
      window.location.href = 'dashboard.html';
      return null;
    }
    return user;
  }

  function loginAdmin(email, password) {
    const session = DB.Session.get();
    // Find company where this admin email matches
    const users = DB.Users.getAll();
    const user = users.find(u =>
      u.email.toLowerCase() === email.toLowerCase() &&
      ['admin','hr','manager'].includes(u.role)
    );
    if (!user) return { error: 'ไม่พบบัญชีผู้ดูแลระบบนี้' };
    if (!DB.Users.verifyPassword(user, password)) return { error: 'รหัสผ่านไม่ถูกต้อง' };
    const company = DB.Companies.get(user.companyId);
    DB.Session.set({ userId: user.id, companyId: user.companyId, role: user.role });
    return { user, company };
  }

  function loginEmployee(companyCode, employeeCode) {
    const result = DB.Users.getByCode(companyCode, employeeCode);
    if (result.error === 'company') return { error: 'ไม่พบรหัสบริษัทนี้' };
    if (result.error === 'code')    return { error: 'รหัสพนักงานไม่ถูกต้อง' };
    const { user, company } = result;
    DB.Session.set({ userId: user.id, companyId: company.id, role: user.role });
    return { user, company };
  }

  function register(companyData, adminData) {
    const company = DB.Companies.create(companyData);
    const admin   = DB.Users.create({ ...adminData, companyId: company.id, role: 'admin' });
    DB.LeaveTypes.seedDefaults(company.id);
    DB.Shifts.seedDefaults(company.id);
    DB.Session.set({ userId: admin.id, companyId: company.id, role: 'admin' });
    return { company, admin };
  }

  function logout() {
    DB.Session.clear();
    window.location.href = 'auth.html';
  }

  function canApproveLeave(user) {
    return ['admin','hr','manager'].includes(user?.role);
  }
  function isAdmin(user) { return user?.role === 'admin'; }
  function isHR(user)    { return ['admin','hr'].includes(user?.role); }

  return { currentUser, currentCompany, isLoggedIn, requireAuth, requireGuest, requireRole, loginAdmin, loginEmployee, register, logout, canApproveLeave, isAdmin, isHR };
})();
