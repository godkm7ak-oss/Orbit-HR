/* ================================================
   ORBIT HR — Data Layer (localStorage)
   ================================================ */

const DB = (() => {
  const KEYS = {
    companies:     'orbit-companies',
    users:         'orbit-users',
    leaveTypes:    'orbit-leave-types',
    leaves:        'orbit-leaves',
    attendance:    'orbit-attendance',
    shifts:        'orbit-shifts',
    schedules:     'orbit-schedules',
    meetings:      'orbit-meetings',
    announcements: 'orbit-announcements',
    notifications: 'orbit-notifications',
    session:       'orbit-session',
  };

  /* ── Utilities ─────────────────────────────── */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function now() { return new Date().toISOString(); }
  function localDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function today() { return localDate(new Date()); }

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  }
  function loadObj(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  }
  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function generateCompanyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    const companies = load(KEYS.companies);
    const existing = new Set(companies.map(c => c.code));
    do { code = Array.from({length: 6}, () => chars[Math.floor(Math.random()*chars.length)]).join(''); }
    while (existing.has(code));
    return code;
  }

  function generateEmployeeCode(companyId) {
    const users = load(KEYS.users).filter(u => u.companyId === companyId && u.role !== 'admin');
    const codes = new Set(users.map(u => u.employeeCode).filter(Boolean));
    let n = users.length + 1;
    let code;
    do { code = 'EMP' + String(n).padStart(3, '0'); n++; }
    while (codes.has(code));
    return code;
  }

  /* ── Session ───────────────────────────────── */
  const Session = {
    get()      { return loadObj(KEYS.session); },
    set(data)  { localStorage.setItem(KEYS.session, JSON.stringify(data)); },
    clear()    { localStorage.removeItem(KEYS.session); },
    userId()   { return loadObj(KEYS.session).userId; },
    companyId(){ return loadObj(KEYS.session).companyId; },
  };

  /* ── Companies ─────────────────────────────── */
  const Companies = {
    getAll() { return load(KEYS.companies); },
    get(id)  { return load(KEYS.companies).find(c => c.id === id); },
    getByCode(code) { return load(KEYS.companies).find(c => c.code === code.toUpperCase()); },

    create(data) {
      const companies = load(KEYS.companies);
      const company = {
        id: uid(),
        code: generateCompanyCode(),
        name: data.name,
        industry: data.industry || '',
        address: data.address || '',
        phone: data.phone || '',
        logo: data.logo || '',
        workStart: data.workStart || '08:00',
        workEnd:   data.workEnd   || '17:00',
        workDays:  data.workDays  || [1,2,3,4,5],
        checkInRadius: data.checkInRadius || 200,
        locations: data.locations || [],
        plan: 'trial',
        trialEnds: new Date(Date.now() + 14*24*3600*1000).toISOString(),
        createdAt: now(),
      };
      companies.push(company);
      save(KEYS.companies, companies);
      return company;
    },

    update(id, data) {
      const companies = load(KEYS.companies);
      const idx = companies.findIndex(c => c.id === id);
      if (idx === -1) return null;
      companies[idx] = { ...companies[idx], ...data, updatedAt: now() };
      save(KEYS.companies, companies);
      return companies[idx];
    },
  };

  /* ── Users ─────────────────────────────────── */
  const Users = {
    getAll()        { return load(KEYS.users); },
    get(id)         { return load(KEYS.users).find(u => u.id === id); },
    getByCompany(companyId) {
      return load(KEYS.users).filter(u => u.companyId === companyId && !u.deletedAt);
    },
    getByEmail(email, companyId) {
      return load(KEYS.users).find(u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.companyId === companyId
      );
    },
    getByCode(companyCode, employeeCode) {
      const company = Companies.getByCode(companyCode);
      if (!company) return { error: 'company' };
      const user = load(KEYS.users).find(u =>
        u.companyId === company.id &&
        u.employeeCode === employeeCode.toUpperCase() &&
        !u.deletedAt
      );
      if (!user) return { error: 'code' };
      return { user, company };
    },

    create(data) {
      const users = load(KEYS.users);
      const user = {
        id: uid(),
        companyId: data.companyId,
        name: data.name,
        email: data.email || '',
        password: data.password || '',
        role: data.role || 'employee',
        employeeCode: data.role === 'admin' ? '' : generateEmployeeCode(data.companyId),
        department: data.department || '',
        position: data.position || '',
        phone: data.phone || '',
        avatar: data.avatar || '',
        startDate: data.startDate || today(),
        salary: data.salary || 0,
        bankName: data.bankName || '',
        bankAccount: data.bankAccount || '',
        emergencyName: data.emergencyName || '',
        emergencyPhone: data.emergencyPhone || '',
        status: 'active',
        createdAt: now(),
      };
      users.push(user);
      save(KEYS.users, users);
      return user;
    },

    update(id, data) {
      const users = load(KEYS.users);
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      users[idx] = { ...users[idx], ...data, updatedAt: now() };
      save(KEYS.users, users);
      return users[idx];
    },

    softDelete(id) {
      return Users.update(id, { deletedAt: now(), status: 'inactive' });
    },

    resetCode(id) {
      const users = load(KEYS.users);
      const user = users.find(u => u.id === id);
      if (!user) return null;
      const newCode = generateEmployeeCode(user.companyId);
      return Users.update(id, { employeeCode: newCode });
    },

    verifyPassword(user, password) {
      return user.password === password;
    },
  };

  /* ── Leave Types ───────────────────────────── */
  const LeaveTypes = {
    getByCompany(companyId) {
      return load(KEYS.leaveTypes).filter(t => t.companyId === companyId);
    },
    create(data) {
      const types = load(KEYS.leaveTypes);
      const type = {
        id: uid(),
        companyId: data.companyId,
        name: data.name,
        nameEn: data.nameEn || '',
        color: data.color || '#6366F1',
        maxDays: data.maxDays || 10,
        requiresApproval: data.requiresApproval !== false,
        requiresDoc: data.requiresDoc || false,
        paidLeave: data.paidLeave !== false,
        createdAt: now(),
      };
      types.push(type);
      save(KEYS.leaveTypes, types);
      return type;
    },
    update(id, data) {
      const types = load(KEYS.leaveTypes);
      const idx = types.findIndex(t => t.id === id);
      if (idx === -1) return null;
      types[idx] = { ...types[idx], ...data };
      save(KEYS.leaveTypes, types);
      return types[idx];
    },
    delete(id) {
      const types = load(KEYS.leaveTypes).filter(t => t.id !== id);
      save(KEYS.leaveTypes, types);
    },
    seedDefaults(companyId) {
      const defaults = [
        { name: 'ลาพักร้อน',  nameEn: 'Annual Leave',    color: '#4F46E5', maxDays: 10, paidLeave: true },
        { name: 'ลาป่วย',     nameEn: 'Sick Leave',       color: '#EF4444', maxDays: 30, paidLeave: true,  requiresDoc: false },
        { name: 'ลากิจ',      nameEn: 'Personal Leave',   color: '#F59E0B', maxDays: 5,  paidLeave: false },
        { name: 'ลาฉุกเฉิน',  nameEn: 'Emergency Leave',  color: '#0EA5E9', maxDays: 3,  paidLeave: true },
      ];
      defaults.forEach(d => LeaveTypes.create({ ...d, companyId }));
    },
  };

  /* ── Leave Requests ────────────────────────── */
  const Leaves = {
    getByCompany(companyId, filters = {}) {
      let list = load(KEYS.leaves).filter(l => l.companyId === companyId);
      if (filters.userId)  list = list.filter(l => l.userId === filters.userId);
      if (filters.status)  list = list.filter(l => l.status === filters.status);
      if (filters.year)    list = list.filter(l => l.startDate.startsWith(filters.year));
      if (filters.month)   list = list.filter(l => l.startDate.slice(0,7) === filters.month);
      return list.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    },

    getByUser(userId) {
      return load(KEYS.leaves)
        .filter(l => l.userId === userId)
        .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    },

    getBalance(userId, year) {
      const user = Users.get(userId);
      if (!user) return {};
      const types = LeaveTypes.getByCompany(user.companyId);
      const yearStr = year || new Date().getFullYear().toString();
      const approved = load(KEYS.leaves).filter(l =>
        l.userId === userId &&
        l.status === 'approved' &&
        l.startDate.startsWith(yearStr)
      );
      const result = {};
      types.forEach(t => {
        const used = approved
          .filter(l => l.leaveTypeId === t.id)
          .reduce((sum, l) => sum + (l.days || 0), 0);
        result[t.id] = { total: t.maxDays, used, remaining: Math.max(0, t.maxDays - used), type: t };
      });
      return result;
    },

    create(data) {
      const leaves = load(KEYS.leaves);
      const start = new Date(data.startDate);
      const end   = new Date(data.endDate);
      const days  = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
      const leave = {
        id: uid(),
        companyId: data.companyId,
        userId: data.userId,
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        days,
        reason: data.reason || '',
        attachment: data.attachment || '',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        rejectReason: '',
        createdAt: now(),
      };
      leaves.push(leave);
      save(KEYS.leaves, leaves);
      return leave;
    },

    approve(id, approverId, comment = '') {
      const leaves = load(KEYS.leaves);
      const idx = leaves.findIndex(l => l.id === id);
      if (idx === -1) return null;
      leaves[idx] = { ...leaves[idx], status: 'approved', approvedBy: approverId, approvedAt: now(), approverComment: comment };
      save(KEYS.leaves, leaves);
      return leaves[idx];
    },

    reject(id, approverId, reason = '') {
      const leaves = load(KEYS.leaves);
      const idx = leaves.findIndex(l => l.id === id);
      if (idx === -1) return null;
      leaves[idx] = { ...leaves[idx], status: 'rejected', approvedBy: approverId, approvedAt: now(), rejectReason: reason };
      save(KEYS.leaves, leaves);
      return leaves[idx];
    },

    cancel(id) {
      const leaves = load(KEYS.leaves);
      const idx = leaves.findIndex(l => l.id === id);
      if (idx === -1) return null;
      leaves[idx] = { ...leaves[idx], status: 'cancelled' };
      save(KEYS.leaves, leaves);
      return leaves[idx];
    },
  };

  /* ── Attendance ────────────────────────────── */
  const Attendance = {
    getByCompany(companyId, filters = {}) {
      let list = load(KEYS.attendance).filter(a => a.companyId === companyId);
      if (filters.userId) list = list.filter(a => a.userId === filters.userId);
      if (filters.date)   list = list.filter(a => a.date === filters.date);
      if (filters.month)  list = list.filter(a => a.date.slice(0,7) === filters.month);
      if (filters.year)   list = list.filter(a => a.date.startsWith(filters.year));
      return list.sort((a,b) => b.date.localeCompare(a.date) || b.checkIn.localeCompare(a.checkIn));
    },

    getTodayByUser(userId) {
      const d = today();
      return load(KEYS.attendance).find(a => a.userId === userId && a.date === d && !a.checkOut);
    },

    getByUser(userId, filters = {}) {
      return Attendance.getByCompany(
        Users.get(userId)?.companyId,
        { ...filters, userId }
      );
    },

    clockIn(data) {
      const records = load(KEYS.attendance);
      const existing = records.find(r => r.userId === data.userId && r.date === today() && !r.checkOut);
      if (existing) return { error: 'already_checked_in', record: existing };

      const company = Companies.get(data.companyId);
      let lateMinutes = 0;
      let status = 'on_time';

      if (data.shiftId) {
        const shifts = Shifts.getByCompany(data.companyId);
        const shift = shifts.find(s => s.id === data.shiftId);
        if (shift) {
          const [sh, sm] = shift.startTime.split(':').map(Number);
          const shiftStart = sh * 60 + sm;
          const now = new Date();
          const current = now.getHours() * 60 + now.getMinutes();
          lateMinutes = Math.max(0, current - shiftStart);
          if (lateMinutes >= 5) status = 'late';
        }
      } else if (company?.workStart) {
        const [sh, sm] = company.workStart.split(':').map(Number);
        const shiftStart = sh * 60 + sm;
        const nowT = new Date();
        const current = nowT.getHours() * 60 + nowT.getMinutes();
        lateMinutes = Math.max(0, current - shiftStart);
        if (lateMinutes >= 5) status = 'late';
      }

      const record = {
        id: uid(),
        companyId: data.companyId,
        userId: data.userId,
        date: today(),
        checkIn: new Date().toTimeString().slice(0,5),
        checkInFull: now(),
        checkOut: null,
        checkOutFull: null,
        shiftId: data.shiftId || null,
        method: data.method || 'gps',
        lat: data.lat || null,
        lng: data.lng || null,
        locationName: data.locationName || '',
        status,
        lateMinutes,
        overtimeMinutes: 0,
        note: data.note || '',
        createdAt: now(),
      };
      records.push(record);
      save(KEYS.attendance, records);
      return { record };
    },

    clockOut(id, data = {}) {
      const records = load(KEYS.attendance);
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return null;

      const record = records[idx];
      const company = Companies.get(record.companyId);
      let overtimeMinutes = 0;

      if (record.shiftId) {
        const shifts = Shifts.getByCompany(record.companyId);
        const shift = shifts.find(s => s.id === record.shiftId);
        if (shift) {
          const [eh, em] = shift.endTime.split(':').map(Number);
          const shiftEnd = eh * 60 + em;
          const nowT = new Date();
          const current = nowT.getHours() * 60 + nowT.getMinutes();
          overtimeMinutes = Math.max(0, current - shiftEnd);
        }
      } else if (company?.workEnd) {
        const [eh, em] = company.workEnd.split(':').map(Number);
        const shiftEnd = eh * 60 + em;
        const nowT = new Date();
        const current = nowT.getHours() * 60 + nowT.getMinutes();
        overtimeMinutes = Math.max(0, current - shiftEnd);
      }

      records[idx] = {
        ...record,
        checkOut: new Date().toTimeString().slice(0,5),
        checkOutFull: now(),
        overtimeMinutes,
        lat2: data.lat || null,
        lng2: data.lng || null,
        note: data.note || record.note,
      };
      save(KEYS.attendance, records);
      return records[idx];
    },

    exportCSV(companyId, filters = {}) {
      const list = Attendance.getByCompany(companyId, filters);
      const users = Users.getByCompany(companyId);
      const shifts = Shifts.getByCompany(companyId);
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));
      const shiftMap = Object.fromEntries(shifts.map(s => [s.id, s]));

      const header = ['วันที่','ชื่อ-นามสกุล','รหัสพนักงาน','แผนก','ตำแหน่ง','กะ','เข้างาน','ออกงาน','สถานะ','สายกี่นาที','OT กี่นาที'];
      const rows = list.map(r => {
        const u = userMap[r.userId] || {};
        const s = shiftMap[r.shiftId] || {};
        const statusMap = { on_time: 'ตรงเวลา', late: 'สาย', absent: 'ขาดงาน' };
        return [r.date, u.name||'', u.employeeCode||'', u.department||'', u.position||'', s.name||'-', r.checkIn||'', r.checkOut||'', statusMap[r.status]||r.status, r.lateMinutes||0, r.overtimeMinutes||0];
      });
      return [header, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    },
  };

  /* ── Shifts ────────────────────────────────── */
  const Shifts = {
    getByCompany(companyId) {
      return load(KEYS.shifts).filter(s => s.companyId === companyId);
    },
    create(data) {
      const shifts = load(KEYS.shifts);
      const shift = {
        id: uid(),
        companyId: data.companyId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        color: data.color || '#4F46E5',
        createdAt: now(),
      };
      shifts.push(shift);
      save(KEYS.shifts, shifts);
      return shift;
    },
    update(id, data) {
      const shifts = load(KEYS.shifts);
      const idx = shifts.findIndex(s => s.id === id);
      if (idx === -1) return null;
      shifts[idx] = { ...shifts[idx], ...data };
      save(KEYS.shifts, shifts);
      return shifts[idx];
    },
    delete(id) {
      save(KEYS.shifts, load(KEYS.shifts).filter(s => s.id !== id));
    },
    seedDefaults(companyId) {
      const defaults = [
        { name: 'กะเช้า',  startTime: '06:00', endTime: '14:00', color: '#F59E0B' },
        { name: 'กะบ่าย',  startTime: '14:00', endTime: '22:00', color: '#4F46E5' },
        { name: 'กะดึก',   startTime: '22:00', endTime: '06:00', color: '#6B7280' },
      ];
      defaults.forEach(d => Shifts.create({ ...d, companyId }));
    },
  };

  /* ── Schedules ─────────────────────────────── */
  const Schedules = {
    getWeek(companyId, weekStart) {
      return load(KEYS.schedules).filter(s =>
        s.companyId === companyId &&
        s.date >= weekStart &&
        s.date <= addDays(weekStart, 6)
      );
    },
    getUserWeek(userId, weekStart) {
      return load(KEYS.schedules).filter(s =>
        s.userId === userId &&
        s.date >= weekStart &&
        s.date <= addDays(weekStart, 6)
      );
    },
    set(userId, companyId, date, shiftId) {
      const schedules = load(KEYS.schedules);
      const idx = schedules.findIndex(s => s.userId === userId && s.date === date);
      if (idx !== -1) {
        if (shiftId === null) { schedules.splice(idx, 1); }
        else { schedules[idx] = { ...schedules[idx], shiftId }; }
      } else if (shiftId !== null) {
        schedules.push({ id: uid(), userId, companyId, date, shiftId, createdAt: now() });
      }
      save(KEYS.schedules, schedules);
    },
    getForUser(userId, month) {
      return load(KEYS.schedules).filter(s =>
        s.userId === userId && s.date.startsWith(month)
      );
    },
  };

  function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return localDate(d);
  }

  /* ── Meetings ──────────────────────────────── */
  const Meetings = {
    getByCompany(companyId) {
      return load(KEYS.meetings)
        .filter(m => m.companyId === companyId && !m.deletedAt)
        .sort((a,b) => a.date.localeCompare(b.date));
    },
    getForUser(userId) {
      const user = Users.get(userId);
      if (!user) return [];
      return Meetings.getByCompany(user.companyId).filter(m =>
        m.attendees.includes(userId) || m.createdBy === userId
      );
    },
    create(data) {
      const meetings = load(KEYS.meetings);
      const meeting = {
        id: uid(),
        companyId: data.companyId,
        title: data.title,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime || '',
        location: data.location || '',
        meetingLink: data.meetingLink || '',
        description: data.description || '',
        attendees: data.attendees || [],
        createdBy: data.createdBy,
        createdAt: now(),
      };
      meetings.push(meeting);
      save(KEYS.meetings, meetings);
      Notifications.notifyMeeting(meeting);
      return meeting;
    },
    update(id, data) {
      const meetings = load(KEYS.meetings);
      const idx = meetings.findIndex(m => m.id === id);
      if (idx === -1) return null;
      meetings[idx] = { ...meetings[idx], ...data, updatedAt: now() };
      save(KEYS.meetings, meetings);
      return meetings[idx];
    },
    delete(id) {
      const meetings = load(KEYS.meetings);
      const idx = meetings.findIndex(m => m.id === id);
      if (idx !== -1) { meetings[idx].deletedAt = now(); }
      save(KEYS.meetings, meetings);
    },
  };

  /* ── Announcements ─────────────────────────── */
  const Announcements = {
    getByCompany(companyId) {
      return load(KEYS.announcements)
        .filter(a => a.companyId === companyId && !a.deletedAt)
        .sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt.localeCompare(a.createdAt));
    },
    create(data) {
      const list = load(KEYS.announcements);
      const item = {
        id: uid(),
        companyId: data.companyId,
        title: data.title,
        content: data.content,
        audience: data.audience || 'all',
        pinned: data.pinned || false,
        createdBy: data.createdBy,
        createdAt: now(),
      };
      list.push(item);
      save(KEYS.announcements, list);
      Notifications.notifyAnnouncement(item);
      return item;
    },
    update(id, data) {
      const list = load(KEYS.announcements);
      const idx = list.findIndex(a => a.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...data };
      save(KEYS.announcements, list);
      return list[idx];
    },
    delete(id) {
      const list = load(KEYS.announcements);
      const idx = list.findIndex(a => a.id === id);
      if (idx !== -1) list[idx].deletedAt = now();
      save(KEYS.announcements, list);
    },
  };

  /* ── Notifications ─────────────────────────── */
  const Notifications = {
    getByUser(userId) {
      return load(KEYS.notifications)
        .filter(n => n.userId === userId)
        .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50);
    },
    getUnreadCount(userId) {
      return load(KEYS.notifications).filter(n => n.userId === userId && !n.readAt).length;
    },
    create(data) {
      const list = load(KEYS.notifications);
      const notif = {
        id: uid(),
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body || '',
        icon: data.icon || 'bell',
        color: data.color || '#4F46E5',
        link: data.link || '',
        readAt: null,
        createdAt: now(),
      };
      list.push(notif);
      save(KEYS.notifications, list);
      return notif;
    },
    markRead(id) {
      const list = load(KEYS.notifications);
      const idx = list.findIndex(n => n.id === id);
      if (idx !== -1) list[idx].readAt = now();
      save(KEYS.notifications, list);
    },
    markAllRead(userId) {
      const list = load(KEYS.notifications).map(n =>
        n.userId === userId && !n.readAt ? { ...n, readAt: now() } : n
      );
      save(KEYS.notifications, list);
    },
    notifyLeave(leave, action, actorName) {
      const user = Users.get(leave.userId);
      if (!user) return;
      const messages = {
        submitted: { title: 'ส่งคำขอลาแล้ว', body: `คำขอลาของคุณ ${leave.days} วัน รอการอนุมัติ`, color: '#F59E0B' },
        approved:  { title: 'คำขอลาได้รับการอนุมัติ ✓', body: `${actorName} อนุมัติการลา ${leave.days} วัน`, color: '#10B981' },
        rejected:  { title: 'คำขอลาถูกปฏิเสธ', body: `${actorName} ปฏิเสธคำขอลา`, color: '#EF4444' },
      };
      const msg = messages[action];
      if (!msg) return;
      Notifications.create({ userId: user.id, type: 'leave', title: msg.title, body: msg.body, color: msg.color, link: 'leave.html', icon: 'calendar' });
      if (action === 'submitted') {
        const admins = Users.getByCompany(user.companyId).filter(u => ['admin','hr','manager'].includes(u.role));
        admins.forEach(a => Notifications.create({ userId: a.id, type: 'leave', title: `${user.name} ขอลางาน`, body: `${leave.days} วัน — รอการอนุมัติ`, color: '#F59E0B', link: 'leave.html', icon: 'calendar' }));
      }
    },
    notifyMeeting(meeting) {
      meeting.attendees.forEach(uid => {
        Notifications.create({ userId: uid, type: 'meeting', title: `นัดประชุม: ${meeting.title}`, body: `${meeting.date} เวลา ${meeting.startTime}`, color: '#0EA5E9', link: 'meetings.html', icon: 'video' });
      });
    },
    notifyAnnouncement(ann) {
      const users = Users.getByCompany(ann.companyId);
      users.forEach(u => {
        if (u.id === ann.createdBy) return;
        Notifications.create({ userId: u.id, type: 'announcement', title: `ประกาศ: ${ann.title}`, body: ann.content.slice(0, 80), color: '#F59E0B', link: 'meetings.html', icon: 'megaphone' });
      });
    },
    notifyCheckIn(userId, status, lateMinutes) {
      const msg = status === 'late'
        ? { title: `เช็คอินสาย ${lateMinutes} นาที`, color: '#F59E0B' }
        : { title: 'เช็คอินสำเร็จ ✓', color: '#10B981' };
      Notifications.create({ userId, type: 'attendance', title: msg.title, body: `เวลา ${new Date().toTimeString().slice(0,5)} น.`, color: msg.color, link: 'checkin.html', icon: 'map-pin' });
    },
  };

  /* ── Payroll ───────────────────────────────── */
  const Payroll = {
    getByCompany(companyId, month) {
      return load('orbit-payroll').filter(p => p.companyId === companyId && p.month === month);
    },
    getByUser(userId, month) {
      return load('orbit-payroll').find(p => p.userId === userId && p.month === month) || null;
    },
    save(data) {
      const list  = load('orbit-payroll');
      const idx   = list.findIndex(p => p.userId === data.userId && p.month === data.month);
      const entry = {
        id:            idx >= 0 ? list[idx].id : uid(),
        companyId:     data.companyId,
        userId:        data.userId,
        month:         data.month,
        baseSalary:    data.baseSalary    || 0,
        overtimePay:   data.overtimePay   || 0,
        bonus:         data.bonus         || 0,
        deductions:    data.deductions    || 0,
        lateDeduction: data.lateDeduction || 0,
        netPay:        (data.baseSalary||0) + (data.overtimePay||0) + (data.bonus||0)
                       - (data.deductions||0) - (data.lateDeduction||0),
        status:        data.status || 'draft',
        note:          data.note || '',
        updatedAt:     now(),
        createdAt:     idx >= 0 ? list[idx].createdAt : now(),
      };
      if (idx >= 0) list[idx] = entry; else list.push(entry);
      save('orbit-payroll', list);
      return entry;
    },
    approve(companyId, month) {
      const list = load('orbit-payroll');
      list.forEach(p => {
        if (p.companyId === companyId && p.month === month) {
          p.status = 'approved'; p.approvedAt = now();
        }
      });
      save('orbit-payroll', list);
    },
    deleteMonth(companyId, month) {
      save('orbit-payroll', load('orbit-payroll').filter(p => !(p.companyId === companyId && p.month === month)));
    },
  };

  /* ── Trial Codes ────────────────────────────── */
  const TrialCodes = {
    LSKEY: 'orbit-trial-codes',
    getAll()  { try { return JSON.parse(localStorage.getItem('orbit-trial-codes') || '[]'); } catch { return []; } },
    _save(list){ localStorage.setItem('orbit-trial-codes', JSON.stringify(list)); },

    create(data) {
      const list  = TrialCodes.getAll();
      const code  = String(data.code || '').toUpperCase().trim();
      if (!code) return null;
      if (list.some(c => c.code === code)) return { error: 'โค้ดซ้ำ' };
      const entry = {
        id: uid(), code,
        durationDays: data.durationDays || 30,
        plan:    data.plan    || 'pro',
        maxUses: data.maxUses || 1,
        discount: data.discount || 0,
        note:    data.note    || '',
        active:  true,
        usedCount: 0,
        usedBy: [],
        createdAt: now(),
      };
      list.push(entry);
      TrialCodes._save(list);
      return entry;
    },

    validate(code) {
      if (!code) return { valid: false, error: '' };
      const entry = TrialCodes.getAll().find(c => c.code === code.toUpperCase().trim());
      if (!entry)          return { valid: false, error: 'ไม่พบโค้ดนี้' };
      if (!entry.active)   return { valid: false, error: 'โค้ดนี้ถูกปิดใช้งาน' };
      if (entry.maxUses > 0 && entry.usedCount >= entry.maxUses)
                           return { valid: false, error: 'โค้ดถูกใช้ครบแล้ว' };
      return { valid: true, entry };
    },

    redeem(code, companyId, companyName) {
      const list = TrialCodes.getAll();
      const idx  = list.findIndex(c => c.code === code.toUpperCase().trim());
      if (idx === -1) return null;
      list[idx].usedCount++;
      list[idx].usedBy.push({ companyId, companyName, usedAt: now() });
      if (list[idx].maxUses > 0 && list[idx].usedCount >= list[idx].maxUses)
        list[idx].active = false;
      TrialCodes._save(list);
      return list[idx];
    },

    toggle(id) {
      const list = TrialCodes.getAll();
      const idx  = list.findIndex(c => c.id === id);
      if (idx !== -1) { list[idx].active = !list[idx].active; TrialCodes._save(list); }
    },

    delete(id) {
      TrialCodes._save(TrialCodes.getAll().filter(c => c.id !== id));
    },
  };

  /* ── Email Leads ─────────────────────────────── */
  const Emails = {
    getAll() { try { return JSON.parse(localStorage.getItem('orbit-emails') || '[]'); } catch { return []; } },
    _save(list){ localStorage.setItem('orbit-emails', JSON.stringify(list)); },

    collect(email, name = '', source = 'landing') {
      if (!email) return false;
      const list = Emails.getAll();
      if (list.some(e => e.email.toLowerCase() === email.toLowerCase())) return 'dup';
      list.push({ id: uid(), email: email.toLowerCase(), name, source, createdAt: now() });
      Emails._save(list);
      return true;
    },

    delete(id) {
      Emails._save(Emails.getAll().filter(e => e.id !== id));
    },
  };

  /* ── Owner Settings ──────────────────────────── */
  const OwnerSettings = {
    get() { try { return JSON.parse(localStorage.getItem('orbit-owner-settings') || '{}'); } catch { return {}; } },
    save(data) { localStorage.setItem('orbit-owner-settings', JSON.stringify({ ...OwnerSettings.get(), ...data })); },
    reset()    { localStorage.removeItem('orbit-owner-settings'); },
  };

  /* ── Demo Seed ─────────────────────────────── */
  function seedDemo() {
    localStorage.clear();
    const company = Companies.create({
      name: 'Demo Hotel Bangkok',
      industry: 'โรงแรม / บริการ',
      workStart: '08:00',
      workEnd: '17:00',
      checkInRadius: 300,
      locations: [{ id: uid(), name: 'โรงแรมหลัก', lat: 13.7563, lng: 100.5018, radius: 300 }],
    });

    const admin = Users.create({ companyId: company.id, name: 'คุณสมชาย ผู้จัดการ', email: 'admin@demo.com', password: 'demo1234', role: 'admin', department: 'บริหาร', position: 'ผู้จัดการทั่วไป', salary: 55000, bankName: 'กสิกรไทย', bankAccount: '123-4-56789-0' });
    const hr    = Users.create({ companyId: company.id, name: 'คุณมาลี HR',         email: 'hr@demo.com',    password: 'demo1234', role: 'hr',    department: 'ทรัพยากรบุคคล', position: 'เจ้าหน้าที่ HR', salary: 35000, bankName: 'ไทยพาณิชย์', bankAccount: '456-7-89012-3' });
    const emp1  = Users.create({ companyId: company.id, name: 'คุณปริม แผนกต้อนรับ', role: 'employee', department: 'แผนกต้อนรับ', position: 'พนักงานต้อนรับ', salary: 18000, bankName: 'กรุงไทย', bankAccount: '789-0-12345-6' });
    const emp2  = Users.create({ companyId: company.id, name: 'คุณธนา แผนกอาหาร',   role: 'employee', department: 'แผนกอาหาร',   position: 'พ่อครัว', salary: 22000, bankName: 'กสิกรไทย', bankAccount: '012-3-45678-9' });
    const emp3  = Users.create({ companyId: company.id, name: 'คุณนิดา แม่บ้าน',    role: 'employee', department: 'แผนกทำความสะอาด', position: 'แม่บ้าน', salary: 15000, bankName: 'กรุงเทพ', bankAccount: '345-6-78901-2' });

    LeaveTypes.seedDefaults(company.id);
    Shifts.seedDefaults(company.id);

    const types = LeaveTypes.getByCompany(company.id);
    const shifts = Shifts.getByCompany(company.id);

    // Sample leaves
    Leaves.create({ companyId: company.id, userId: emp1.id, leaveTypeId: types[0].id, startDate: '2026-06-10', endDate: '2026-06-12', reason: 'ไปพักผ่อนกับครอบครัว', days: 3 });
    Leaves.create({ companyId: company.id, userId: emp2.id, leaveTypeId: types[1].id, startDate: today(), endDate: today(), reason: 'ไม่สบาย มีไข้', days: 1 });
    const leave3 = Leaves.create({ companyId: company.id, userId: emp3.id, leaveTypeId: types[2].id, startDate: '2026-05-28', endDate: '2026-05-28', reason: 'ธุระส่วนตัว', days: 1 });
    Leaves.approve(leave3.id, admin.id, 'อนุมัติ');

    // Sample attendance
    const past3days = [-2,-1,0].map(d => {
      const dt = new Date(); dt.setDate(dt.getDate() + d);
      return dt.toISOString().slice(0,10);
    });
    [emp1, emp2, emp3].forEach((u, i) => {
      past3days.forEach(date => {
        const hrs = [7,58,8,5,8,12];
        const record = { id: uid(), companyId: company.id, userId: u.id, date, checkIn: `0${hrs[i*2]}:${String(hrs[i*2+1]).padStart(2,'0')}`, checkInFull: now(), checkOut: '17:00', checkOutFull: now(), shiftId: shifts[0].id, method: 'gps', lat: 13.7563, lng: 100.5018, locationName: 'โรงแรมหลัก', status: i===1?'late':'on_time', lateMinutes: i===1?5:0, overtimeMinutes: 0, createdAt: now() };
        const records = load(KEYS.attendance); records.push(record); save(KEYS.attendance, records);
      });
    });

    // Sample schedules (this week)
    const monday = getMonday(today());
    [emp1,emp2,emp3].forEach((u,i) => {
      for (let d=0;d<5;d++) {
        Schedules.set(u.id, company.id, addDays(monday, d), shifts[i % shifts.length].id);
      }
    });

    // Sample meeting
    Meetings.create({ companyId: company.id, title: 'ประชุมทีมประจำสัปดาห์', date: addDays(today(), 1), startTime: '10:00', endTime: '11:00', location: 'ห้องประชุมชั้น 2', attendees: [admin.id, hr.id, emp1.id, emp2.id, emp3.id], createdBy: admin.id });

    // Sample announcement
    Announcements.create({ companyId: company.id, title: 'ยินดีต้อนรับสู่ Orbit HR!', content: 'ระบบจัดการพนักงานออนไลน์ ลดกระดาษ เพิ่มประสิทธิภาพ ทีมงานทุกคนสามารถเช็คอิน ดูตาราง และขอลาได้จากมือถือ', pinned: true, audience: 'all', createdBy: admin.id });

    Session.set({ userId: admin.id, companyId: company.id, role: 'admin' });
    return { company, admin, hr, employees: [emp1, emp2, emp3] };
  }

  function getMonday(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return localDate(d);
  }

  return { Companies, Users, LeaveTypes, Leaves, Attendance, Shifts, Schedules, Meetings, Announcements, Notifications, Payroll, TrialCodes, Emails, OwnerSettings, Session, haversine, uid, today, addDays, getMonday, seedDemo };
})();
