/* ================================================
   ORBIT HR — Shared UI, Helpers, Components
   ================================================ */

/* ── Toast ─────────────────────────────────────── */
const Toast = (() => {
  let container;
  function init() {
    if (document.getElementById('toast-container')) return;
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  function show(message, type = 'info', duration = 3500) {
    init();
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]||icons.info}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }
  return {
    success: m => show(m,'success'),
    error:   m => show(m,'error'),
    warning: m => show(m,'warning'),
    info:    m => show(m,'info'),
  };
})();

/* ── Modal ─────────────────────────────────────── */
const Modal = (() => {
  function open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
  }
  function closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) closeAll();
  });
  return { open, close, closeAll };
})();

/* ── Avatar ─────────────────────────────────────── */
function renderAvatar(user, size = 'md') {
  const cls = `avatar avatar-${size}`;
  if (user?.avatar) {
    return `<div class="${cls}"><img src="${user.avatar}" alt="${user.name}" style="width:100%;height:100%;object-fit:cover"></div>`;
  }
  const initials = (user?.name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  const colors = ['#4F46E5','#10B981','#F59E0B','#EF4444','#0EA5E9','#8B5CF6','#EC4899','#14B8A6'];
  const color = colors[(user?.name?.charCodeAt(0) || 0) % colors.length];
  return `<div class="${cls}" style="background:${color};color:#fff">${initials}</div>`;
}

/* ── Notification Badge ─────────────────────────── */
function updateNotifBadge() {
  const user = Auth.currentUser();
  if (!user) return;
  const count = DB.Notifications.getUnreadCount(user.id);
  document.querySelectorAll('.header-notif-dot').forEach(el => {
    el.style.display = count > 0 ? 'block' : 'none';
  });
  document.querySelectorAll('.bnav-badge').forEach(el => {
    el.textContent = count > 9 ? '9+' : count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

/* ── Sidebar Builder ────────────────────────────── */
function buildSidebar(activePage) {
  const user = Auth.currentUser();
  if (!user) return;
  const collapsed = localStorage.getItem('orbit-sidebar-collapsed') === 'true';
  const isAdminOrHR = ['admin','hr'].includes(user.role);

  const mainNav = [
    { page: 'dashboard', href: 'dashboard.html', icon: 'grid',     label: 'หน้าหลัก' },
    { page: 'checkin',   href: 'checkin.html',   icon: 'map-pin',  label: 'เช็คอิน' },
    { page: 'leave',     href: 'leave.html',     icon: 'calendar', label: 'การลา' },
    { page: 'schedule',  href: 'schedule.html',  icon: 'clock',    label: 'ตารางงาน' },
    { page: 'meetings',  href: 'meetings.html',  icon: 'video',    label: 'ประชุม' },
  ];

  const adminNav = isAdminOrHR ? [
    { page: 'employees', href: 'employees.html', icon: 'users',     label: 'พนักงาน' },
    { page: 'reports',   href: 'reports.html',   icon: 'bar-chart', label: 'รายงาน' },
    { page: 'settings',  href: 'settings.html',  icon: 'settings',  label: 'ตั้งค่า' },
  ] : [];

  const notifCount = DB.Notifications.getUnreadCount(user.id);

  const sidebarEl = document.getElementById('sidebar');
  if (!sidebarEl) return;

  if (collapsed) sidebarEl.classList.add('collapsed');

  const navItem = n => {
    const badge = n.page === 'meetings' && notifCount > 0
      ? `<span class="nav-badge">${notifCount > 9 ? '9+' : notifCount}</span>` : '';
    return `
      <a href="${n.href}" class="nav-item${activePage === n.page ? ' active' : ''}" data-label="${n.label}">
        <span class="nav-icon">${iconSVG(n.icon, '17')}</span>
        <span class="nav-label">${n.label}</span>
        ${badge}
      </a>`;
  };

  sidebarEl.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="logo-icon">O</div>
        <div class="logo-text">Orbit HR</div>
      </div>
      <button class="sidebar-toggle" onclick="toggleSidebar()" title="ย่อ/ขยาย">
        ${iconSVG('chevron-left', '15')}
      </button>
    </div>

    <div class="sidebar-nav">
      <div class="nav-group">
        <div class="nav-group-title">เมนูหลัก</div>
        ${mainNav.map(navItem).join('')}
      </div>
      ${adminNav.length ? `
        <div class="nav-group">
          <div class="nav-group-title">จัดการ</div>
          ${adminNav.map(navItem).join('')}
        </div>
      ` : ''}
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-user" onclick="window.location='profile.html'"
           style="cursor:pointer" title="${user.name}">
        ${renderAvatar(user, 'sm')}
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user.name}</div>
          <div class="sidebar-user-role">${roleLabel(user.role)}</div>
        </div>
        <button class="sidebar-logout"
                onclick="event.stopPropagation();Auth.logout()"
                title="ออกจากระบบ">
          ${iconSVG('log-out', '14')}
        </button>
      </div>
    </div>
  `;
}

/* ── Sidebar Toggle ─────────────────────────────── */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  localStorage.setItem('orbit-sidebar-collapsed', sidebar.classList.contains('collapsed'));
}

/* ── Bottom Nav Builder ─────────────────────────── */
function buildBottomNav(activePage) {
  const user = Auth.currentUser();
  if (!user) return;
  const notifCount = DB.Notifications.getUnreadCount(user.id);
  const el = document.getElementById('bottom-nav');
  if (!el) return;

  el.innerHTML = `
    <div class="bottom-nav-items">
      <a href="dashboard.html" class="bottom-nav-item ${activePage==='dashboard'?'active':''}">
        ${iconSVG('grid','20')}<span>หน้าหลัก</span>
      </a>
      <a href="leave.html" class="bottom-nav-item ${activePage==='leave'?'active':''}">
        ${iconSVG('calendar','20')}<span>การลา</span>
      </a>
      <a href="checkin.html" class="bottom-nav-checkin">
        ${iconSVG('map-pin','22')}
      </a>
      <a href="schedule.html" class="bottom-nav-item ${activePage==='schedule'?'active':''}">
        ${iconSVG('clock','20')}<span>ตาราง</span>
      </a>
      <a href="meetings.html" class="bottom-nav-item ${activePage==='meetings'?'active':''}">
        ${iconSVG('bell','20')}
        ${notifCount > 0 ? `<span class="bnav-badge">${notifCount > 9 ? '9+' : notifCount}</span>` : ''}
        <span>แจ้งเตือน</span>
      </a>
    </div>
  `;
}

/* ── Page Header ────────────────────────────────── */
function buildHeader(title, actions = '') {
  const user = Auth.currentUser();
  const notifCount = DB.Notifications.getUnreadCount(user?.id || '');
  const el = document.getElementById('page-header');
  if (!el) return;

  el.innerHTML = `
    <div class="header-title">${title}</div>
    <div class="header-search">
      <span class="header-search-icon">${iconSVG('search', '14')}</span>
      <input class="header-search-input" type="text" placeholder="ค้นหา..."
             onkeydown="if(event.key==='Escape')this.blur()">
    </div>
    <div class="header-actions">
      ${actions}
      ${actions ? '<div class="header-divider"></div>' : ''}
      <div style="position:relative" id="notif-dropdown">
        <button class="header-icon-btn" onclick="toggleNotifPanel()" title="การแจ้งเตือน">
          ${iconSVG('bell','16')}
          <span class="header-notif-dot" style="display:${notifCount>0?'block':'none'}"></span>
        </button>
        <div class="notif-panel" id="notif-panel"></div>
      </div>
    </div>
  `;
  loadNotifPanel();
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) loadNotifPanel();
}

function loadNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const user = Auth.currentUser();
  if (!user) return;
  const notifs = DB.Notifications.getByUser(user.id);
  const unread = notifs.filter(n => !n.readAt).length;

  const iconMap = {
    calendar: iconSVG('calendar','14'), 'map-pin': iconSVG('map-pin','14'),
    video: iconSVG('video','14'), megaphone: iconSVG('megaphone','14'), bell: iconSVG('bell','14'),
  };

  panel.innerHTML = `
    <div class="notif-panel-header">
      <h4>การแจ้งเตือน${unread > 0 ? ` <span class="badge badge-primary" style="margin-left:6px">${unread}</span>` : ''}</h4>
      ${unread > 0 ? `<button class="btn btn-ghost btn-sm" onclick="markAllRead()">อ่านทั้งหมด</button>` : ''}
    </div>
    <div class="notif-list">
      ${notifs.length === 0
        ? '<div class="notif-empty">ไม่มีการแจ้งเตือน</div>'
        : notifs.slice(0,10).map(n => `
          <div class="notif-item ${!n.readAt ? 'unread' : ''}"
               onclick="readNotif('${n.id}','${n.link||''}')">
            <div class="notif-icon" style="background:${n.color}22;color:${n.color}">
              ${iconMap[n.icon] || iconSVG('bell','14')}
            </div>
            <div style="flex:1;min-width:0">
              <div class="notif-title">${n.title}</div>
              ${n.body ? `<div class="notif-body">${n.body}</div>` : ''}
              <div class="notif-time">${timeAgo(n.createdAt)}</div>
            </div>
            ${!n.readAt ? '<div class="notif-dot"></div>' : ''}
          </div>
        `).join('')}
    </div>
  `;
}

function readNotif(id, link) {
  DB.Notifications.markRead(id);
  updateNotifBadge();
  loadNotifPanel();
  if (link) window.location.href = link;
}

function markAllRead() {
  const user = Auth.currentUser();
  if (user) DB.Notifications.markAllRead(user.id);
  updateNotifBadge();
  loadNotifPanel();
}

document.addEventListener('click', e => {
  const dropdown = document.getElementById('notif-dropdown');
  const panel    = document.getElementById('notif-panel');
  if (dropdown && panel && !dropdown.contains(e.target)) panel.classList.remove('open');
});

/* ── Role Labels ────────────────────────────────── */
function roleLabel(role) {
  const map = { admin: 'ผู้ดูแลระบบ', hr: 'HR', manager: 'ผู้จัดการ', employee: 'พนักงาน' };
  return map[role] || role;
}

/* ── Status Badge Helpers ───────────────────────── */
function leaveStatusBadge(status) {
  const map = {
    pending:   { label: 'รอการอนุมัติ', cls: 'badge-warning' },
    approved:  { label: 'อนุมัติแล้ว',   cls: 'badge-success' },
    rejected:  { label: 'ถูกปฏิเสธ',    cls: 'badge-danger'  },
    cancelled: { label: 'ยกเลิกแล้ว',   cls: 'badge-neutral' },
  };
  const s = map[status] || { label: status, cls: 'badge-neutral' };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

function attendanceStatusBadge(status) {
  const map = {
    on_time: { label: 'ตรงเวลา', cls: 'badge-success' },
    late:    { label: 'สาย',     cls: 'badge-warning' },
    absent:  { label: 'ขาดงาน', cls: 'badge-danger'  },
    ot:      { label: 'โอที',    cls: 'badge-info'    },
  };
  const s = map[status] || { label: status, cls: 'badge-neutral' };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

/* ── Date Helpers ───────────────────────────────── */
function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric', ...opts });
  } catch { return dateStr; }
}

function formatDateShort(dateStr) {
  return formatDate(dateStr, { year:'numeric', month:'short', day:'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  return timeStr.slice(0,5) + ' น.';
}

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'เมื่อกี้';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days} วันที่แล้ว`;
  return formatDateShort(isoStr);
}

function getDaysThai(dateStr) {
  return ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'][new Date(dateStr).getDay()];
}

function getWeekDays(mondayStr) {
  return Array.from({length:7}, (_,i) => DB.addDays(mondayStr, i));
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days  = [];
  let startDay = first.getDay() || 7;
  for (let i = startDay - 1; i > 0; i--) {
    days.push({ date: new Date(year, month, 1 - i).toISOString().slice(0,10), current: false });
  }
  for (let i = 1; i <= last.getDate(); i++) {
    days.push({ date: new Date(year, month, i).toISOString().slice(0,10), current: true });
  }
  for (let i = 1; i <= 42 - days.length; i++) {
    days.push({ date: new Date(year, month + 1, i).toISOString().slice(0,10), current: false });
  }
  return days;
}

/* ── SVG Icons (Lucide-style) ───────────────────── */
function iconSVG(name, size = '16') {
  const s = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    'grid':         `<svg ${s}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    'map-pin':      `<svg ${s}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    'calendar':     `<svg ${s}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    'clock':        `<svg ${s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    'video':        `<svg ${s}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    'users':        `<svg ${s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'bar-chart':    `<svg ${s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
    'settings':     `<svg ${s}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 0-14.14 0"/><path d="M4 12H2"/><path d="M22 12h-2"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M4.93 4.93l1.41 1.41"/></svg>`,
    'bell':         `<svg ${s}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    'log-out':      `<svg ${s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    'plus':         `<svg ${s}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    'check':        `<svg ${s}><polyline points="20 6 9 17 4 12"/></svg>`,
    'x':            `<svg ${s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    'edit':         `<svg ${s}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    'trash':        `<svg ${s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    'download':     `<svg ${s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    'search':       `<svg ${s}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    'filter':       `<svg ${s}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
    'chevron-left': `<svg ${s}><polyline points="15 18 9 12 15 6"/></svg>`,
    'chevron-right':`<svg ${s}><polyline points="9 18 15 12 9 6"/></svg>`,
    'chevron-down': `<svg ${s}><polyline points="6 9 12 15 18 9"/></svg>`,
    'user':         `<svg ${s}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    'phone':        `<svg ${s}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.5 6.5l.96-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    'mail':         `<svg ${s}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    'building':     `<svg ${s}><rect x="4" y="2" width="16" height="20"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>`,
    'alert':        `<svg ${s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    'megaphone':    `<svg ${s}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    'pin':          `<svg ${s}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    'more':         `<svg ${s}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
    'copy':         `<svg ${s}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    'briefcase':    `<svg ${s}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    'trending-up':  `<svg ${s}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    'trending-down':`<svg ${s}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
    'key':          `<svg ${s}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
    'link':         `<svg ${s}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    'refresh':      `<svg ${s}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
    'save':         `<svg ${s}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    'swap':         `<svg ${s}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
    'arrow-up':     `<svg ${s}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
    'arrow-down':   `<svg ${s}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`,
    'zap':          `<svg ${s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  };
  return icons[name] || icons['bell'];
}

/* ── CSV Download ───────────────────────────────── */
function downloadCSV(content, filename) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Number format ──────────────────────────────── */
function fmt(n)          { return Number(n || 0).toLocaleString('th-TH'); }
function pct(n, total)   { return total ? Math.round((n / total) * 100) : 0; }

/* ── Skeleton Loaders ───────────────────────────── */
const Skeleton = {
  rows(count = 3) {
    return Array.from({ length: count }, () =>
      `<div class="activity-item">
        <div class="skeleton skeleton-avatar"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px">
          <div class="skeleton skeleton-text" style="width:55%"></div>
          <div class="skeleton skeleton-text" style="width:35%"></div>
        </div>
      </div>`
    ).join('');
  },
  kpiCards(count = 4) {
    return `<div class="grid grid-${Math.min(count,4)}" style="margin-bottom:var(--s6)">
      ${Array.from({ length: count }, () =>
        `<div class="skeleton-card">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px">
            <div class="skeleton skeleton-text" style="width:50%"></div>
            <div class="skeleton skeleton-icon"></div>
          </div>
          <div class="skeleton skeleton-title" style="width:40%;margin-bottom:8px"></div>
          <div class="skeleton skeleton-text" style="width:65%"></div>
        </div>`
      ).join('')}
    </div>`;
  },
};

/* ── Confirm Dialog ─────────────────────────────── */
function confirmDialog(message, onConfirm, danger = true) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog" style="text-align:center">
      <div style="width:48px;height:48px;border-radius:50%;background:${danger?'var(--danger-bg)':'var(--primary-light)'};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:${danger?'var(--danger)':'var(--primary)'}">
        ${iconSVG('alert','22')}
      </div>
      <p style="font-size:14px;color:var(--text-primary);margin:0 0 20px;line-height:1.6">${message}</p>
      <div class="btn-group" style="justify-content:center">
        <button class="btn btn-secondary" id="confirm-cancel">ยกเลิก</button>
        <button class="btn ${danger?'btn-danger':'btn-primary'}" id="confirm-ok">${danger?'ยืนยัน':'ตกลง'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); onConfirm(); };
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

/* ── Copy to clipboard ──────────────────────────── */
function copyToClipboard(text, label = 'คัดลอกแล้ว') {
  navigator.clipboard.writeText(text)
    .then(() => Toast.success(label))
    .catch(() => Toast.error('ไม่สามารถคัดลอกได้'));
}

/* ── Page init helper ───────────────────────────── */
function initPage(pageId, title, headerActions = '') {
  const user = Auth.requireAuth();
  if (!user) return null;
  buildSidebar(pageId);
  buildBottomNav(pageId);
  buildHeader(title, headerActions);
  updateNotifBadge();
  return user;
}
