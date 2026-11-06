/* Áit prototype — one town, two kinds of account, everything on sample data in this browser. */
(function () {
'use strict';

// ---------- state ----------
const KEY = 'clann-proto-v1';
let S;
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.version === 2) { if (!s.outreach) s.outreach = []; return s; } } } catch (e) {}
  return window.CLANN_SEED();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function reset() { S = window.CLANN_SEED(); save(); R = { tab: 'home', seg: {}, sel: null }; render(); toast('Sample town restored'); }

let R = { tab: 'home', seg: {}, sel: null, month: null, view: 'phone', issueId: null, spread: 0 };
try { const r = localStorage.getItem(KEY + ':route'); if (r) R = Object.assign(R, JSON.parse(r)); } catch (e) {}
function saveRoute() { try { localStorage.setItem(KEY + ':route', JSON.stringify({ tab: R.tab, seg: R.seg, view: R.view })); } catch (e) {} }

// ---------- helpers ----------
const $ = (sel, el) => (el || document).querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => (p || 'x') + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
// the demo lives in the sample town's own week, so it looks right whenever someone opens it
const REAL_TODAY = (window.CLANN_SAMPLE_TODAY || isoOf(new Date())); let TODAY = REAL_TODAY;
try { const t = localStorage.getItem(KEY + ':today'); if (t) TODAY = t; } catch (e) {}
function dateOf(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmt(iso, withDow) { if (!iso) return ''; const d = dateOf(iso); return (withDow === false ? '' : DOW[d.getDay()] + ' ') + d.getDate() + ' ' + MON[d.getMonth()]; }
function fmtLong(iso) { const d = dateOf(iso); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH[d.getMonth()] + ' ' + d.getFullYear(); }
function monthName(ym) { const [y, m] = ym.split('-').map(Number); return MONTH[m - 1] + ' ' + y; }
function daysBetween(a, b) { return Math.round((dateOf(b) - dateOf(a)) / 86400000); }
function inDays(iso) { const n = daysBetween(TODAY, iso); if (n === 0) return 'today'; if (n === 1) return 'tomorrow'; if (n < 0) return (-n) + ' day' + (n === -1 ? '' : 's') + ' ago'; return 'in ' + n + ' days'; }
function waiting(iso) { const n = daysBetween(iso, TODAY); return n <= 0 ? 'today' : n === 1 ? '1 day' : n + ' days'; }
function addMonths(ym, k) { let [y, m] = ym.split('-').map(Number); m += k; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return y + '-' + pad(m); }
function eur(n) { return '€' + Number(n).toLocaleString('en-IE'); }
function fmtTime(t) { if (!t) return ''; const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; const hh = ((h + 11) % 12) + 1; return hh + (m ? ':' + pad(m) : '') + ap; }

const me = () => S.users.find(u => u.id === S.me);
const user = id => S.users.find(u => u.id === id);
const isC = () => me().role === 'committee';
const committee = () => S.users.filter(u => u.role === 'committee');
const locals = () => S.users.filter(u => u.role === 'local');
const first = id => { const u = user(id); return u ? u.name.split(' ')[0] : 'Someone'; };
const fullname = id => { const u = user(id); return u ? u.name : 'Someone'; };
function initials(n) { return n.split(' ').filter(Boolean).map(w => w[0].replace(/[^A-Za-zÁÉÍÓÚáéíóú]/g, '')).filter(Boolean).slice(0, 2).join('').toUpperCase(); }
function av(id, cls) { const u = user(id); if (!u) return '<span class="av ' + (cls || '') + '">?</span>'; return '<span class="av ' + (u.role === 'committee' ? 'c ' : '') + (cls || '') + '" title="' + esc(u.name) + '">' + initials(u.name) + '</span>'; }
const training = id => S.trainings.find(t => t.id === id);
const ev = id => S.events.find(e => e.id === id);
const hasTraining = (u, tid) => !!(u.training[tid] && u.training[tid].status === 'done');
const draftIssue = () => S.issues.find(i => i.status === 'draft');
const currentIssue = () => S.issues.filter(i => i.status === 'published').sort((a, b) => a.month < b.month ? 1 : -1)[0];
const viewIssue = () => (R.issueId && S.issues.find(i => i.id === R.issueId && i.status === 'published')) || currentIssue();
function issueNo(iss) { return S.issues.filter(i => i.status === 'published').sort((a, b) => a.month < b.month ? -1 : 1).findIndex(i => i.id === iss.id) + 1; }
function approvers() { const r = S.town.rules; if (r.newsletterApproval === 'subcommittee' && r.subcommittee.length) return r.subcommittee; return committee().map(c => c.id); }
function postApproved(p) {
  const ap = approvers(); const yes = ap.filter(id => p.approvals && p.approvals[id] === true).length;
  if (p.status === 'returned') return false;
  if (S.town.rules.newsletterApproval === 'majority') return yes > ap.length / 2;
  return yes === ap.length;
}
function nextMeeting() { return S.meetings.filter(m => m.date >= TODAY).sort((a, b) => a.date < b.date ? -1 : 1)[0]; }
function lastMeeting() { return S.meetings.filter(m => m.date < TODAY).sort((a, b) => a.date < b.date ? 1 : -1)[0]; }
function fundBalance(f) { return f.raised - f.spends.reduce((a, s) => a + s.amount, 0); }

// ---------- knotwork ----------
function braid(w, h, n) {
  n = n || 3; const period = h * 2.6, amp = h * 0.33, mid = h / 2, step = 3;
  const segs = [];
  for (let s = 0; s < n; s++) {
    const phase = s * 2 * Math.PI / n; let cur = null, curK = null;
    for (let x = -period; x <= w + period; x += step) {
      const th = 2 * Math.PI * x / period + phase; const k = Math.floor((th + Math.PI / 2) / Math.PI);
      const y = mid + amp * Math.sin(th);
      if (k !== curK) { if (cur) { cur.pts.push([x, y]); } cur = { s, k, pts: [[x, y]] }; segs.push(cur); curK = k; } else cur.pts.push([x, y]);
    }
  }
  segs.sort((a, b) => ((a.k + a.s) % 2) - ((b.k + b.s) % 2));
  let out = '';
  for (const g of segs) {
    const d = 'M' + g.pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
    out += '<path d="' + d + '" stroke="var(--ground)" stroke-width="7" fill="none"/><path d="' + d + '" stroke="var(--knot)" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  }
  return '<svg class="knotband" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' + out + '</svg>';
}
function trefoil(size) {
  const pts = []; for (let i = 0; i <= 240; i++) { const t = i / 240 * Math.PI * 2; pts.push([Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t)]); }
  const sc = size / 7, c = size / 2; const d = 'M' + pts.map(p => (c + p[0] * sc).toFixed(1) + ' ' + (c + p[1] * sc).toFixed(1)).join('L') + 'Z';
  return '<svg class="knot" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + (size / 26) + '" stroke-linejoin="round"/></svg>';
}

const ICONS = {
  // a thatched cottage, from the old drawing: hip roof, thatch, a chimney, a door and a window
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 13 9 6h6l6.4 7"/><path d="M2 13h20"/><path d="M4.5 13v6.6h15V13"/><path d="M8.6 19.6v-4h2.8v4"/><path d="M14 15.4h2.4v2.2H14z"/><path d="M16.3 7.2V3.8h2.3v5"/><path d="M17.4 3c-.9-.8.4-1.4-.5-2.2"/><path d="M6.2 12.6 8.4 8.4M9.6 12.6l1.1-5.2M13 12.6l.3-5.6M16 12.6l-.4-3.2M19.2 12.6l-1.6-3.6"/><path d="M1.5 20.8c2.5-.7 4.5.5 7 0s4.5-.6 7 0 4 .4 7-.3"/></svg>',
  // the triskele, bold, as on the kerbstone
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 12c0-3.2 2.4-5.6 5.4-5.6 2.4 0 4.1 1.7 4.1 3.9 0 1.6-1.2 2.9-2.8 2.9"/><path d="M12 12c2.8 1.6 3.7 4.9 2.2 7.5-1.2 2.1-3.5 2.8-5.4 1.7-1.4-.8-1.8-2.5-1-3.9"/><path d="M12 12c-2.8 1.6-6.1.7-7.6-1.9-1.2-2.1-.6-4.5 1.3-5.6 1.4-.8 3-.4 3.8 1"/></svg>',
  // the newsletter: a folded sheet
  news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 3.5h13v17h-13z"/><path d="M8 7h8"/><path d="M8 8.8h8"/><path d="M8 12h4.5M8 14.3h4.5M8 16.6h4.5"/><path d="M14.5 12h1.5v4.6h-1.5z"/></svg>',
  // a shamrock
  rota: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path id="kleaf" d="M12 11C9 9 8.4 5.6 10.2 4.4c.8-.5 1.5-.2 1.8.5.3-.7 1-1 1.8-.5C15.6 5.6 15 9 12 11z"/><use href="#kleaf" transform="rotate(120 12 11)"/><use href="#kleaf" transform="rotate(240 12 11)"/><path d="M12 11c.4 4 1.4 7.2 3 9.6"/></svg>',
  // a knot in a ring, like the badge
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10.4"/><path id="kloop" d="M12 12c-2.8-2.8-6.6-1.2-5.2 1.8 1.1 2.3 4.3 1.1 5.2-1.8z"/><use href="#kloop" transform="rotate(90 12 12)"/><use href="#kloop" transform="rotate(180 12 12)"/><use href="#kloop" transform="rotate(270 12 12)"/></svg>',
};
ICONS.desk = ICONS.home;
// the marks a town can put on its cover
const MARKS = {
  harp: '<svg viewBox="0 0 64 64" fill="currentColor"><path d="M14 58c-9-16-8-34 6-48 2-2 5-2 6 1l1 3c-11 10-12 25-5 41H14z"/><path d="M26 11c7-6 19-6 27 4 3 4 5 9 5 14 0 10-3 19-8 29h-7c4-9 7-18 7-28 0-6-2-11-6-14-5-4-12-4-18-1z"/><path d="M11 58h40v4H11z"/><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M28 18v38M33 16v40M38 17v39M43 20v36M48 25v31"/></g><path d="M22 10c2-5 7-7 11-5-3 1-5 3-6 6l-2 2z"/></svg>',
  currach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 13c3 2.6 16 2.6 19 0l-2.6 5.5H5.1z"/><path d="M6.5 12.6 4 7.5M12 12.6V5.5M17.5 12.6 20 7.5"/></svg>',
  shamrock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path id="mleaf" d="M12 11C9 9 8.4 5.6 10.2 4.4c.8-.5 1.5-.2 1.8.5.3-.7 1-1 1.8-.5C15.6 5.6 15 9 12 11z"/><use href="#mleaf" transform="rotate(120 12 11)"/><use href="#mleaf" transform="rotate(240 12 11)"/><path d="M12 11c.4 4 1.4 7.2 3 9.6"/></svg>',
  church: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V11l4-3 4 3v9"/><path d="M12 20V13l5-2.5 3 2V20"/><path d="M8 3v4M6.5 4.5h3"/><path d="M7 20v-4h2v4"/><path d="M2.5 20h19"/></svg>',
  tower: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20V8l3-5 3 5v12"/><path d="M11 20v-3h2v3"/><path d="M11.3 11h1.4"/><path d="M5 20h14"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v17"/><path d="M6 9h12"/><circle cx="12" cy="9" r="4"/><path d="M7 20h10"/></svg>',
  sheep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10c-2 0-3 1.5-2.3 3 .3.8 1 1.3 1.8 1.3h10.5c1.8 0 3-1.3 3-2.8 0-1.7-1.5-3-3.3-2.7C15.2 6.5 13.3 5.5 11.5 6c-1-1.2-3-1.3-4-.2C6.1 6.6 5.5 8.3 6 10z"/><path d="M7 14.3V19M10 14.3V19M14 14.3V19M17 14.3V19"/></svg>',
  lighthouse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 20 10.5 8h3l1 12"/><path d="M9.5 5.5h5V8h-5z"/><path d="M12 3v2.5"/><path d="M6 20h12"/><path d="M4 6.5l3 1M20 6.5l-3 1"/></svg>',
};
const MARKNAMES = { harp: 'Harp', currach: 'Currach', shamrock: 'Shamrock', church: 'Church', tower: 'Round tower', cross: 'High cross', sheep: 'Sheep', lighthouse: 'Lighthouse' };
function townMarks() { return (S.town.marks || []).filter(k => MARKS[k]).map(k => MARKS[k]); }
// little marks for what happens after the meeting
const AFTER = {
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 11h2a2 2 0 0 1 0 4h-2"/><path d="M7 5.5c0-1 1-1 1-2M11 5.5c0-1 1-1 1-2"/></svg>',
  talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
  sport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6c3 3 9 3 12 0M6 18c3-3 9-3 12 0"/></svg>',
  other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/></svg>',
};
function afterMark(text) { const t = text.toLowerCase(); if (/music|band|song|play|sing|carol|session|trad|céilí|ceili|dance/.test(t)) return 'music'; if (/tea|food|sandwich|brack|cake|supper|soup|pizza|bbq|barbecue|drink|bar/.test(t)) return 'food'; if (/talk|speak|photo|slides|history|story|tells|on the /.test(t)) return 'talk'; if (/match|game|sport|race|quiz|bingo|cards|hurl|football|run|walk/.test(t)) return 'sport'; return 'other'; }
function theme() { const t = (S.town.themes || []).find(x => x.id === S.town.themeId); return t || { accent: '#17703c', second: '#e2c45e' }; }
const chev = '<span class="chev">›</span>';

// a row of little printed suns, like a zine divider
function sunline(n, cls) {
  n = n || 7; let out = ''; const w = 400 / n;
  for (let i = 0; i < n; i++) { const cx = i * w + w / 2, cy = 22; for (let a = -80; a <= 80; a += 20) { const r = a % 40 === 0 ? 16 : 10; const x1 = cx + Math.sin(a * Math.PI / 180) * 5, y1 = cy - Math.cos(a * Math.PI / 180) * 5; out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + (cx + Math.sin(a * Math.PI / 180) * r).toFixed(1) + '" y2="' + (cy - Math.cos(a * Math.PI / 180) * r).toFixed(1) + '"/>'; } }
  return '<svg class="sun ' + (cls || '') + '" viewBox="0 0 400 26" preserveAspectRatio="none" aria-hidden="true"><g stroke="currentColor" stroke-width="1.4" stroke-linecap="round">' + out + '</g></svg>';
}

// ---------- shell ----------
function render() {
  const app = $('#app');
  const m = me(); const th = theme();
  document.documentElement.style.setProperty('--accent', th.accent); document.documentElement.style.setProperty('--second', th.second);
  const web = R.view === 'web'; document.body.classList.toggle('web', web);
  const tabs = [['home', isC() ? 'Desk' : 'Home', ICONS.home], ['calendar', 'Calendar', ICONS.calendar], ['news', 'Newsletter', ICONS.news], ['rota', 'Rota', ICONS.rota], ['me', 'Me', ICONS.me]];
  const badges = tabBadges();
  const scrollTop = $('main') ? $('main').scrollTop : 0; const readerTop = $('#reader') ? $('#reader').scrollTop : 0;
  const reels = R.tab === 'news' && segOf('news', 'issue') === 'issue' && !web;
  const inner = SCREENS[R.tab]();
  const wide = R.tab === 'home' || (R.tab === 'news' && segOf('news', 'issue') === 'issue');
  app.innerHTML = protoBar() +
    '<header class="top"' + (reels ? ' hidden' : '') + '><div class="town"><div class="name">' + esc(S.town.name) + '</div></div>' +
    '<button class="who" data-act="switch" aria-label="Switch person">' + av(m.id) + '</button></header>' +
    (reels ? '' : '<div class="rules"><div class="dbl"></div><div class="dateline"><span>' + fmtLong(TODAY) + '</span><span>' + esc(S.town.county) + '</span></div>' + sunline(7) + '</div>') +
    topbar(tabs, badges) +
    '<main id="main" class="' + (reels ? 'reels' : (!web ? 'snap' : '')) + '">' + (web && !wide ? '<div class="narrow">' + inner + '</div>' : inner) + '</main>' +
    '<nav class="tabs' + (reels ? ' over' : '') + '"><div class="pill"></div><div class="items">' + tabs.map(t => t[0] === 'news' ? '<span></span>'
      : '<button class="' + (R.tab === t[0] ? 'on' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + t[2] + '<span>' + t[1] + '</span>' + (badges[t[0]] ? '<span class="dot">' + badges[t[0]] + '</span>' : '') + '</button>').join('') + '</div>' +
    '<button class="centre ' + (R.tab === 'news' ? 'on' : '') + '" data-act="tab" data-tab="news" aria-label="Newsletter">' + ICONS.news + (badges.news ? '<span class="dot">' + badges.news + '</span>' : '') + '</button></nav>';
  if (R.keepScroll) { $('main').scrollTop = scrollTop; const rd = $('#reader'); if (rd) { rd.style.scrollBehavior = 'auto'; rd.scrollTop = readerTop; rd.style.scrollBehavior = ''; } R.keepScroll = false; }
  afterRender();
}
function protoBar() {
  const nmReal = S.meetings.filter(x => x.date >= REAL_TODAY).sort((a, b) => a.date < b.date ? -1 : 1)[0];
  const over = TODAY !== REAL_TODAY;
  return '<div class="protobar"><span class="lbl">Prototype</span><div class="grp"><button class="' + (R.view !== 'web' ? 'on' : '') + '" data-act="view" data-v="phone">Phone</button><button class="' + (R.view === 'web' ? 'on' : '') + '" data-act="view" data-v="web">Laptop</button></div>' +
    '<button class="plain" data-act="switch"><span class="long">' + esc(me().name) + ' · ' + (isC() ? 'committee' : 'local') + '</span><span class="short">' + esc(first(me().id)) + '</span></button>' +
    (nmReal ? '<div class="grp"><button class="' + (!over ? 'on' : '') + '" data-act="today" data-v="">Today</button><button class="' + (over ? 'on' : '') + '" data-act="today" data-v="' + nmReal.date + '">Meeting day</button></div>' : '') + '</div>';
}
function topbar(tabs, badges) {
  const m = me();
  return '<div class="topbar"><div class="name">' + esc(S.town.name) + '</div><div class="menu">' + tabs.map(t => '<button class="' + (R.tab === t[0] ? 'on' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + t[2] + '<span>' + t[1] + '</span>' + (badges[t[0]] ? '<span class="dot">' + badges[t[0]] + '</span>' : '') + '</button>').join('') + '</div>' +
    '<div class="right"><span class="eyebrow">' + fmtLong(TODAY) + '</span><button class="who" data-act="switch" aria-label="Switch person">' + av(m.id) + '</button></div></div>';
}
function go(tab, seg) { R.tab = tab; if (seg) R.seg[tab] = seg; saveRoute(); closeSheet(); render(); $('main').scrollTop = 0; }
function rerender() { R.keepScroll = true; render(); }

// sheets + toasts
let camStop = null;
function sheet(html) { closeSheet(); const d = document.createElement('div'); d.className = 'scrim'; d.id = 'scrim'; d.innerHTML = '<div class="sheet" role="dialog">' + sunline(9) + html + '</div>'; d.addEventListener('click', e => { if (e.target === d) closeSheet(); }); document.body.appendChild(d); afterRender(); }
function closeSheet() { const s = $('#scrim'); if (s) s.remove(); if (camStop) { camStop(); camStop = null; } }
function toast(msg) { const old = $('.toast'); if (old) old.remove(); const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
function val(id) { const el = $('#' + id); return el ? el.value.trim() : ''; }
function need(id, msg) { const v = val(id); const e = $('#' + id + '-err'); if (!v) { if (e) e.textContent = msg || 'Needed'; const el = $('#' + id); if (el) el.focus(); return null; } if (e) e.textContent = ''; return v; }
function field(id, label, type, value, extra) {
  const o = extra || {};
  let input;
  if (type === 'textarea') input = '<textarea id="' + id + '" placeholder="' + esc(o.placeholder || '') + '">' + esc(value || '') + '</textarea>';
  else if (type === 'select') input = '<select id="' + id + '">' + o.options.map(x => '<option value="' + esc(x[0]) + '"' + (x[0] === value ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select>';
  else input = '<input id="' + id + '" type="' + type + '" value="' + esc(value || '') + '" placeholder="' + esc(o.placeholder || '') + '"' + (o.min ? ' min="' + o.min + '"' : '') + '>';
  return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' + input + (o.hint ? '<div class="hint">' + esc(o.hint) + '</div>' : '') + '<div class="err" id="' + id + '-err"></div></div>';
}
function seg(tab, items, float) {
  const cur = R.seg[tab] || items[0][0];
  return '<div class="seg' + (float ? ' float' : '') + '">' + items.map(i => '<button class="' + (cur === i[0] ? 'on' : '') + '" data-act="seg" data-tab="' + tab + '" data-seg="' + i[0] + '">' + esc(i[1]) + (i[2] ? '<span class="n">' + i[2] + '</span>' : '') + '</button>').join('') + '</div>';
}
function segOf(tab, dflt) { return R.seg[tab] || dflt; }
function dateBlock(e) { const d = dateOf(e.date); return '<div class="date ' + e.kind + '"><div class="d">' + d.getDate() + '</div><div class="m">' + MON[d.getMonth()] + '</div></div>'; }
function kindPill(kind) { return { meeting: '<span class="pill ink">Meeting</span>', event: '<span class="pill moss">Event</span>', 'training-open': '<span class="pill gorse">Training · open to all</span>', 'training-private': '<span class="pill gorse">Your training</span>' }[kind] || ''; }
function blk(html) { return html ? '<div class="blk">' + html + '</div>' : ''; }
// sample numbers are masked so the demo never shows or dials a real person's phone
function phoneShown(p) { return String(p).slice(0, 3) + ' ··· ··' + String(p).slice(-2); }
function empty(t) { return '<div class="empty">' + esc(t) + '</div>'; }
function section(title, inner, right) { return '<section><div class="section-head"><h2>' + esc(title) + '</h2>' + (right || '') + '</div>' + inner + '</section>'; }

// ---------- what needs whom ----------
function myInbox() {
  const m = me(), out = [];
  S.tasks.filter(t => t.assignee === m.id && t.status === 'offered').forEach(t => out.push({ kind: 'task-offer', t }));
  S.tasks.filter(t => t.assignee === m.id && t.status === 'accepted' && t.trainingId && !hasTraining(m, t.trainingId)).forEach(t => out.push({ kind: 'needs-training', t }));
  S.requests.filter(r => r.by === m.id && (r.status === 'approved_edited' || r.status === 'denied')).forEach(r => out.push({ kind: 'decision', r }));
  const d = draftIssue(); if (d) d.posts.filter(p => p.submittedBy === m.id && p.status === 'returned').forEach(p => out.push({ kind: 'post-returned', p }));
  const cur = currentIssue(); if (cur) { const asks = cur.posts.map((p, i) => ({ p, i })).filter(x => ['help', 'poll', 'vote'].includes(x.p.type) && !(x.p.responses || []).some(r => r.by === m.id)); if (asks.length) out.push({ kind: 'asks', asks, iss: cur }); }
  return out;
}
function deskQueue() {
  const m = me();
  return {
    join: S.joinRequests.filter(j => j.status === 'pending'),
    requests: S.requests.filter(r => r.status === 'pending'),
    declined: S.tasks.filter(t => t.status === 'declined'),
    submitted: S.tasks.filter(t => t.status === 'submitted'),
    unassigned: S.tasks.filter(t => t.status === 'unassigned'),
    verify: S.users.flatMap(u => Object.entries(u.training).filter(([k, v]) => v.status === 'pending_verify').map(([k, v]) => ({ u, tid: k, v }))),
    myVotes: (draftIssue() ? draftIssue().posts : []).filter(p => p.status !== 'returned' && approvers().includes(m.id) && !(p.approvals && m.id in p.approvals)),
    returned: (draftIssue() ? draftIssue().posts : []).filter(p => p.status === 'returned'),
  };
}
function tabBadges() {
  const b = {};
  if (isC()) { const q = deskQueue(); b.home = q.join.length + q.requests.length + q.declined.length + q.submitted.length + q.verify.length; b.news = q.myVotes.length; b.rota = q.declined.length + q.submitted.length + q.unassigned.length; }
  else { const inb = myInbox(); b.home = inb.filter(i => i.kind !== 'asks').length; const cur = currentIssue(); if (cur) b.news = cur.posts.filter(p => ['help', 'poll', 'vote'].includes(p.type) && !(p.responses || []).some(r => r.by === S.me)).length; b.rota = inb.filter(i => i.kind === 'task-offer').length; }
  Object.keys(b).forEach(k => { if (!b[k]) delete b[k]; });
  return b;
}

const SCREENS = {};

// ---------- HOME (local) ----------
function fundCard(f, hero) {
  const pct = Math.min(100, Math.round(f.raised / f.goal * 100));
  return '<button class="card ' + (hero ? 'hero' : '') + ' tap" style="text-align:left;width:100%" data-act="fund" data-id="' + f.id + '">' +
    '<div class="eyebrow">Fund' + (f.status === 'closed' ? ' · closed' : '') + '</div><div class="row between" style="margin:4px 0 8px"><h3 class="h3">' + esc(f.title) + '</h3><span class="serif" style="font-size:24px">' + eur(f.raised) + '</span></div>' +
    '<div class="bar"><i style="width:' + pct + '%"></i></div><div class="row between small muted" style="margin-top:6px"><span>' + pct + '% of ' + eur(f.goal) + '</span><span>' + f.donors + ' people gave</span></div></button>';
}
function eventItem(e, opts) {
  const o = opts || {};
  return '<button class="item tap" data-act="event" data-id="' + e.id + '">' + dateBlock(e) + '<div class="col grow"><div class="t">' + esc(e.title) + '</div><div class="s">' + fmtTime(e.time) + (e.place ? ' · ' + esc(e.place) : '') + (o.rel ? ' · ' + inDays(e.date) : '') + '</div>' + (e.kind.startsWith('training') || e.editedAt ? '<div class="row wrap" style="gap:4px;margin-top:4px">' + (e.kind.startsWith('training') ? kindPill(e.kind) : '') + (e.editedAt ? '<span class="pill changed">Changed ' + fmt(e.editedAt) + '</span>' : '') + '</div>' : '') + '</div>' + chev + '</button>';
}
function visibleEvents() { return S.events.filter(e => e.kind !== 'training-private' || e.forUser === S.me || isC()); }

SCREENS.home = function () { return isC() ? desk() : homeLocal(); };

function homeLocal() {
  const inbox = myInbox(), nm = nextMeeting();
  const todo = inbox.map(todoCard).join('');
  const list = section('To do', todo || empty('Nothing waiting on you.'), inbox.length ? '<span class="countpill">' + inbox.length + '</span>' : '');
  const poster = nm ? posterCard(nm) : '';
  if (R.view === 'web') return '<div class="cols"><div class="col">' + poster + '</div><div class="col">' + list + '</div></div>';
  return blk(poster) + blk(list);
}
function todoCard(i) {
  const card = (eyebrow, title, meta, buttons) => '<article class="card"><div class="eyebrow">' + eyebrow + '</div><h3 class="h3" style="margin-top:6px">' + title + '</h3>' + (meta ? '<div class="mono muted" style="margin-top:5px">' + meta + '</div>' : '') + '<div class="btnrow" style="margin-top:14px">' + buttons + '</div></article>';
  if (i.kind === 'task-offer') return card('Rota · ' + esc(first(i.t.createdBy)) + ' asked you', esc(i.t.title), (i.t.due ? fmt(i.t.due) : '') + (i.t.place ? ' · ' + esc(i.t.place) : ''), '<button class="btn moss" data-act="task-accept" data-id="' + i.t.id + '">Accept</button><button class="btn secondary" data-act="task-decline-form" data-id="' + i.t.id + '">I can\'t</button><button class="btn secondary" style="flex:0 0 auto" data-act="task" data-id="' + i.t.id + '">Details</button>');
  if (i.kind === 'needs-training') return card('Training · needed for ' + esc(i.t.title), esc(training(i.t.trainingId).name), 'Book a session, do it online, or tell the committee you have it', '<button class="btn" data-act="book-form" data-tid="' + i.t.trainingId + '">Book a slot</button><button class="btn secondary" data-act="task" data-id="' + i.t.id + '">All the ways</button>');
  if (i.kind === 'decision') return card('Calendar · your request, ' + (i.r.status === 'denied' ? 'not approved' : 'changed'), esc(i.r.draft.title), esc(first(i.r.decidedBy)) + ': “' + esc(i.r.committeeNote) + '”', '<button class="btn" data-act="decision-accept" data-id="' + i.r.id + '">' + (i.r.status === 'denied' ? 'OK, understood' : 'That\'s fine') + '</button><button class="btn secondary" data-act="event-form" data-resubmit="' + i.r.id + '">Send it back</button>');
  if (i.kind === 'post-returned') return card('Newsletter · came back to you', esc(i.p.title), '“' + esc(i.p.returnNote) + '”', '<button class="btn" data-act="edit-post" data-id="' + i.p.id + '">Edit and send again</button>');
  if (i.kind === 'asks') return card('Newsletter · ' + monthName(i.iss.month), i.asks.length === 1 ? esc(i.asks[0].p.title) : i.asks.length + ' questions waiting for your answer', i.asks.length === 1 ? typeLabel(i.asks[0].p.type) : i.asks.map(a => typeLabel(a.p.type)).join(' · '), '<button class="btn" data-act="news-page" data-i="' + (i.asks[0].i + 1) + '">Answer in the newsletter</button>');
  return '';
}
function posterCard(mm, inSheet) {
  const e = ev(mm.eventId); if (!e) return ''; const p = mm.poster || {}; const today = mm.date === TODAY; const d = dateOf(mm.date);
  let html = '<div class="poster"><div class="eyebrow">Monthly meeting · ' + (today ? 'tonight' : inDays(mm.date)) + '</div>' +
    '<div class="when">' + DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH[d.getMonth()] + '</div><div class="where">' + fmtTime(e.time) + ' · ' + esc(e.place) + '</div>' +
    (p.headline ? '<div class="head">' + esc(p.headline) + '</div>' : '') + (p.line ? '<div class="line">' + esc(p.line) + '</div>' : '') +
    (p.after && p.after.length ? '<div class="after">' + p.after.map(a => '<div class="a">' + (AFTER[a.mark] || AFTER.other) + '<span>' + esc(a.text) + '</span></div>').join('') + '</div>' : '') +
    (p.image ? '<div class="pic"><img src="' + p.image + '" alt=""></div>' : '') + sunline(7) +
    (today ? (isC() ? '<button class="btn paper block" data-act="scan">At the door · scan people in</button>' : '<button class="btn paper block" data-act="attend">Mark my attendance</button>') : '') +
    '<div class="row between" style="margin-top:12px">' + (inSheet ? '<span></span>' : '<button class="linkish" style="color:var(--paper)" data-act="event" data-id="' + e.id + '">' + (mm.shared && mm.agenda.length ? 'The agenda' : 'Details') + '</button>') +
    (isC() ? '<button class="linkish" style="color:var(--paper)" data-act="poster-form" data-id="' + mm.id + '">Edit the poster</button>' : '<span class="foot">' + (today ? 'Show your code at the door' : 'Attendance opens on the day') + '</span>') + '</div></div>';
  return html;
}

// ---------- DESK (committee) ----------
function queueItems() {
  const q = deskQueue(); const items = [];
  q.join.forEach(j => items.push({ since: j.createdAt, html: '<button class="item tap" data-act="join" data-id="' + j.id + '"><span class="pill sky">Join</span><div class="col grow"><div class="t">' + esc(j.name) + '</div><div class="s">' + (j.manual ? 'Added by hand · needs every committee member' : esc(j.street) + ' · ' + esc(j.proof)) + '</div></div><div class="right tiny faint">' + waiting(j.createdAt) + '</div></button>' }));
  q.requests.forEach(r => items.push({ since: r.createdAt, html: '<button class="item tap" data-act="request" data-id="' + r.id + '"><span class="pill moss">Calendar</span><div class="col grow"><div class="t">' + { add: 'Add: ', change: 'Change: ', remove: 'Remove: ' }[r.type] + esc(r.draft.title) + '</div><div class="s">' + esc(first(r.by)) + (r.note ? ' · “' + esc(r.note) + '”' : '') + '</div></div><div class="right tiny faint">' + waiting(r.createdAt) + '</div></button>' }));
  q.declined.forEach(t => items.push({ since: t.due, html: '<button class="item tap" data-act="task" data-id="' + t.id + '"><span class="pill rust">Declined</span><div class="col grow"><div class="t">' + esc(t.title) + '</div><div class="s">' + esc(first(t.assignee)) + ': “' + esc(t.declineNote) + '”</div></div>' + chev + '</button>' }));
  q.submitted.forEach(t => items.push({ since: t.due, html: '<button class="item tap" data-act="task" data-id="' + t.id + '"><span class="pill moss">Done?</span><div class="col grow"><div class="t">' + esc(t.title) + '</div><div class="s">' + esc(first(t.assignee)) + ' says it is done' + (t.submitNote ? ': “' + esc(t.submitNote) + '”' : '') + '</div></div>' + chev + '</button>' }));
  q.verify.forEach(v => items.push({ since: v.v.date || TODAY, html: '<button class="item tap" data-act="verify" data-uid="' + v.u.id + '" data-tid="' + v.tid + '"><span class="pill gorse">Training</span><div class="col grow"><div class="t">' + esc(first(v.u.id)) + ' says they have done ' + esc(training(v.tid).name) + '</div><div class="s">' + esc(v.v.note || 'No note') + '</div></div>' + chev + '</button>' }));
  return items;
}
function meetingTools(nm) {
  const e = ev(nm.eventId);
  return '<div class="card"><div class="row between"><div><div class="t">The meeting · ' + fmt(nm.date) + '</div><div class="small muted">' + nm.agenda.length + ' on the agenda' + (nm.shared ? ', shared' : ', not shared yet') + ' · ' + nm.attendance.length + ' in the door</div></div></div>' +
    '<div class="btnrow" style="margin-top:12px"><button class="btn sm" data-act="prep" data-id="' + nm.id + '">Agenda</button><button class="btn sm secondary" data-act="poster-form" data-id="' + nm.id + '">Poster</button><button class="btn sm secondary" data-act="run" data-id="' + nm.id + '">Run it</button><button class="btn sm gorse" data-act="scan">Door</button></div></div>';
}
function desk() {
  if (R.view === 'web') return dashboard();
  const q = deskQueue(), nm = nextMeeting();
  const total = q.join.length + q.requests.length + q.declined.length + q.submitted.length + q.verify.length + q.myVotes.length;
  let html = '<div><div class="eyebrow">Committee desk</div><h1 class="h1" style="margin-top:4px">' + (total ? total + ' thing' + (total === 1 ? '' : 's') + ' need' + (total === 1 ? 's' : '') + ' the committee' : 'Nothing waiting') + '</h1></div>';
  const items = queueItems();
  if (items.length) html += section('In the queue', '<div class="card pad-0"><div class="list">' + items.map(i => i.html).join('') + '</div></div>');
  let votes = '';
  if (q.myVotes.length) votes = section('Newsletter: your yes is missing', '<div class="card pad-0"><div class="list">' + q.myVotes.map(p => '<button class="item tap" data-act="post-review" data-id="' + p.id + '"><div class="col grow"><div class="t">' + esc(p.title) + '</div><div class="s">' + typeLabel(p.type) + ' · ' + sourceLabel(p) + '</div></div>' + approvalDots(p) + '</button>').join('') + '</div></div>', '<button class="linkish" data-act="tab" data-tab="news">Next issue</button>');
  const meeting = nm ? section('Meeting', posterCard(nm) + meetingTools(nm)) : '';
  const open = S.fundraisers.filter(f => f.status === 'open');
  const fund = section('Fund', (open.length ? open.map(f => fundCard(f, true)).join('') : empty('No fund open.')), '<button class="linkish" data-act="new-fund">Start one</button>');
  const help = section('Supports and craic', '<div class="card pad-0"><div class="list"><button class="item tap" data-act="orgs" data-kind="support"><div class="col grow"><div class="t">Ask for support</div><div class="s">' + orgs().filter(o => o.kind === 'support').length + ' charities, services and public bodies</div></div>' + chev + '</button><button class="item tap" data-act="orgs" data-kind="craic"><div class="col grow"><div class="t">Book the craic</div><div class="s">' + orgs().filter(o => o.kind === 'craic').length + ' musicians, makers, tellers and shows</div></div>' + chev + '</button><button class="item tap" data-act="outreach-list"><div class="col grow"><div class="t">Who we have asked</div><div class="s">' + (S.outreach.length ? S.outreach.length + ' so far · ' + S.outreach.filter(o => o.status === 'sent').length + ' waiting' : 'Nobody yet') + '</div></div>' + chev + '</button></div></div>');
  return blk(html) + blk(votes) + blk(meeting) + blk(fund) + blk(help);
}
function dashboard() {
  const q = deskQueue(), nm = nextMeeting(), lm = lastMeeting(), d = draftIssue();
  const waitingN = q.join.length + q.requests.length + q.declined.length + q.submitted.length + q.verify.length;
  const open = S.fundraisers.filter(f => f.status === 'open');
  const approvedN = d ? d.posts.filter(postApproved).length : 0;
  let html = '<div class="row between" style="align-items:flex-end;flex-wrap:wrap;gap:14px"><div><div class="eyebrow">Committee · ' + esc(S.town.name) + '</div><h1 class="h1" style="margin-top:4px">' + (waitingN ? waitingN + ' thing' + (waitingN === 1 ? '' : 's') + ' need' + (waitingN === 1 ? 's' : '') + ' the committee' : 'Nothing waiting') + '</h1></div>' +
    '<div class="btnrow" style="flex:none"><button class="btn sm" data-act="event-form">Add to the calendar</button><button class="btn sm secondary" data-act="task-form">Give a task</button><button class="btn sm secondary" data-act="post-form">Write a post</button></div></div>';
  const tiles = [['In the queue', waitingN, 'queue', waitingN > 0], ['Days to the meeting', nm ? daysBetween(TODAY, nm.date) : '—', 'meeting', nm && daysBetween(TODAY, nm.date) <= 3], ['Next issue approved', d ? approvedN + ' of ' + d.posts.length : '—', 'news-draft', q.myVotes.length > 0], ['Tasks with nobody', q.unassigned.length, 'rota', q.unassigned.length > 0], ['Fund in hand', open.length ? eur(fundBalance(open[0])) : '—', 'fund', false]];
  html += '<div class="strip">' + tiles.map(t => '<button class="tile ' + (t[3] ? 'hot' : '') + '" data-act="desk-go" data-to="' + t[2] + '"><div class="count num">' + t[1] + '</div><div class="small muted" style="margin-top:2px">' + t[0] + '</div></button>').join('') + '</div>';
  // column one: the meeting
  let c1 = nm ? posterCard(nm) : '';
  if (nm) {
    c1 += '<div class="panel"><div class="ph"><h2>Agenda · ' + fmt(nm.date) + '</h2>' + (nm.shared ? '<span class="pill moss">Shared</span>' : '<span class="pill">Not shared</span>') + '</div>' +
      (nm.agenda.length ? '<ul class="agenda" style="padding:4px 16px">' + nm.agenda.map((a, i) => '<li>' + (i + 1) + '. ' + esc(a.text) + '</li>').join('') + '</ul>' : '<div class="empty">Nothing yet. Prepare builds it from the month.</div>') +
      '<div class="btnrow" style="padding:10px 16px 14px"><button class="btn sm" data-act="prep" data-id="' + nm.id + '">Prepare</button><button class="btn sm secondary" data-act="poster-form" data-id="' + nm.id + '">Poster</button><button class="btn sm secondary" data-act="run" data-id="' + nm.id + '">Run the meeting</button><button class="btn sm gorse" data-act="scan">Door · ' + nm.attendance.length + '</button></div></div>';
  }
  if (lm) c1 += '<div class="panel"><div class="ph"><h2>Last meeting</h2><span class="eyebrow">' + fmt(lm.date) + '</span></div><div style="padding:10px 16px 14px"><div class="small"><b>' + lm.attendance.length + ' came.</b> ' + esc(lm.minutes || 'No minutes written.') + '</div><div class="btnrow" style="margin-top:10px"><button class="btn sm secondary" data-act="prep" data-id="' + lm.id + '">Minutes and who came</button></div></div></div>';
  // column two: the queue and the newsletter
  const items = queueItems();
  let c2 = '<div class="panel"><div class="ph"><h2>The queue</h2><span class="eyebrow">' + items.length + ' waiting</span></div>' + (items.length ? '<div class="list">' + items.map(i => i.html).join('') + '</div>' : '<div class="empty">Nothing waiting on the committee.</div>') + '</div>';
  if (d) {
    const waitingP = d.posts.filter(p => !postApproved(p) && p.status !== 'returned');
    c2 += '<div class="panel"><div class="ph"><h2>Next issue · ' + monthName(d.month) + '</h2><span class="eyebrow">' + approvedN + ' of ' + d.posts.length + ' approved</span></div>' +
      (q.myVotes.length ? '<div class="list">' + q.myVotes.map(p => '<button class="item tap" data-act="post-review" data-id="' + p.id + '"><div class="col grow"><div class="t">' + esc(p.title) + '</div><div class="s">' + typeLabel(p.type) + ' · ' + sourceLabel(p) + ' · your yes is missing</div></div>' + approvalDots(p) + '</button>').join('') + '</div>' : '<div class="empty">' + (waitingP.length ? 'You have said yes to everything. ' + waitingP.length + ' still waiting on others.' : 'Everything approved.') + '</div>') +
      '<div class="btnrow" style="padding:10px 16px 14px"><button class="btn sm secondary" data-act="tab" data-tab="news">Open the draft</button><button class="btn sm secondary" data-act="suggest-posts">Suggest from the month</button></div></div>';
  }
  // column three: the rota board, the fund, the people
  const lanes = [['Nobody yet', S.tasks.filter(t => t.status === 'unassigned')], ['Asked', S.tasks.filter(t => t.status === 'offered')], ['Taken', S.tasks.filter(t => t.status === 'accepted')], ['Done?', S.tasks.filter(t => t.status === 'submitted')]];
  const declined = S.tasks.filter(t => t.status === 'declined');
  let c3 = '<div class="panel"><div class="ph"><h2>Rota</h2><button class="linkish" data-act="task-form">Give a task</button></div><div style="padding:10px 12px 12px"><div class="board">' + lanes.map(l => '<div class="lane"><div class="lh"><span>' + l[0] + '</span><span>' + l[1].length + '</span></div>' + l[1].map(t => '<button class="cardlet" data-act="task" data-id="' + t.id + '">' + esc(t.title) + '<div class="s">' + (t.assignee ? esc(first(t.assignee)) : '—') + (t.due ? ' · ' + fmt(t.due, false) : '') + '</div></button>').join('') + '</div>').join('') + '</div>' +
    (declined.length ? '<div class="small muted" style="margin-top:10px">' + declined.length + ' declined, in the queue above.</div>' : '') + '</div></div>';
  c3 += '<div class="panel"><div class="ph"><h2>Fund</h2><button class="linkish" data-act="new-fund">Start one</button></div><div style="padding:12px 12px 12px">' + (open.length ? open.map(f => fundCard(f, true)).join('') : '<div class="empty">No fund open.</div>') + '</div></div>';
  const pending = S.joinRequests.filter(j => j.status === 'pending').length;
  c3 += '<div class="panel"><div class="ph"><h2>The town</h2><span class="eyebrow">' + S.users.filter(u => u.role !== 'pending').length + ' on the page</span></div><div class="list"><button class="item tap" data-act="people"><div class="grow">Everyone, with their records</div>' + chev + '</button><button class="item tap" data-act="desk-go" data-to="join"><div class="grow">Waiting to join</div><span class="pill ' + (pending ? 'rust' : '') + '">' + pending + '</span></button><button class="item tap" data-act="orgs"><div class="grow">Supports and craic</div><span class="pill">' + orgs().length + '</span></button><button class="item tap" data-act="outreach-list"><div class="grow">Who we have asked</div><span class="pill ' + (S.outreach.filter(o => o.status === 'sent').length ? 'rust' : '') + '">' + S.outreach.length + '</span></button><button class="item tap" data-act="orgs"><div class="grow">Supports and craic · ask for help, book a night</div><span class="pill">' + orgs().length + '</span></button><button class="item tap" data-act="outreach-list"><div class="grow">Who we have asked</div><span class="pill ' + (S.outreach.filter(o => o.status === 'sent').length ? 'rust' : '') + '">' + S.outreach.length + '</span></button><button class="item tap" data-act="colours"><div class="grow">Our colours and marks</div>' + chev + '</button><button class="item tap" data-act="rules"><div class="grow">How the newsletter is approved</div>' + chev + '</button></div></div>';
  const rota = c3.slice(0, c3.indexOf('<div class="panel"><div class="ph"><h2>Fund</h2>'));
  const rest = c3.slice(c3.indexOf('<div class="panel"><div class="ph"><h2>Fund</h2>'));
  return html + '<div class="dash"><div class="col">' + c1 + '</div><div class="col">' + c2 + '</div><div class="col">' + rest + '</div></div>' + rota;
}
function ruleLabel() { const r = S.town.rules; if (r.newsletterApproval === 'majority') return 'A majority of the committee'; if (r.newsletterApproval === 'subcommittee') return 'Newsletter sub-committee: ' + r.subcommittee.map(first).join(', '); return 'Every committee member must say yes'; }
function shortLabel(t) { return { article: 'Story', help: 'Help', poll: 'Poll', vote: 'Vote', notice: 'Notice' }[t] || t; }
function typeLabel(t) { return { article: 'Article', help: 'Call for help', poll: 'Poll', vote: 'Vote', notice: 'Notice' }[t] || t; }
function sourceLabel(p) { return p.source === 'local' ? 'from ' + first(p.submittedBy) : p.source === 'auto' ? 'suggested by the app' : 'from ' + first(p.author); }
function approvalDots(p) {
  return '<div class="approvals">' + approvers().map(id => { const v = p.approvals ? p.approvals[id] : undefined; return '<span class="a ' + (v === true ? 'yes' : v === false ? 'no' : '') + (id === S.me ? ' me' : '') + '" title="' + esc(fullname(id)) + '">' + esc(initials(fullname(id))) + '</span>'; }).join('') + '</div>';
}

// ---------- CALENDAR ----------
SCREENS.calendar = function () {
  if (!R.month) R.month = TODAY.slice(0, 7);
  const [y, mo] = R.month.split('-').map(Number);
  const firstDay = new Date(y, mo - 1, 1); const startDow = (firstDay.getDay() + 6) % 7; // Monday first
  const daysIn = new Date(y, mo, 0).getDate();
  const evs = visibleEvents();
  const byDate = {}; evs.forEach(e => { (byDate[e.date] = byDate[e.date] || []).push(e); });
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div></div>';
  for (let d = 1; d <= daysIn; d++) {
    const iso = y + '-' + pad(mo) + '-' + pad(d); const list = byDate[iso] || [];
    cells += '<button class="day ' + (iso === TODAY ? 'today ' : '') + (R.sel === iso ? 'sel' : '') + '" data-act="selday" data-date="' + iso + '">' + d + '<span class="dots">' + list.slice(0, 3).map(e => '<i class="' + e.kind + '"></i>').join('') + '</span></button>';
  }
  const myReqs = S.requests.filter(r => r.by === S.me && !['closed', 'accepted'].includes(r.status));
  const pending = S.requests.filter(r => r.status === 'pending');
  let html = '<div class="row between"><h1 class="h2">' + MONTH[mo - 1] + ' ' + y + '</h1><div class="row" style="gap:4px"><button class="btn sm secondary" data-act="month" data-k="-1" aria-label="Previous month">‹</button><button class="btn sm secondary" data-act="month" data-k="1" aria-label="Next month">›</button></div></div>';
  html += '<div class="card"><div class="cal">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => '<div class="dow">' + d + '</div>').join('') + cells + '</div><div class="legend"><span><i style="background:var(--ink)"></i>Meeting</span><span><i style="background:var(--green)"></i>Event</span><span><i style="background:var(--gold)"></i>Training</span></div></div>';
  html += '<div class="btnrow">' + (isC() ? '<button class="btn" data-act="event-form">Add to the calendar</button>' : '<button class="btn" data-act="event-form">Suggest an event</button>') + (isC() && pending.length ? '<button class="btn gorse" data-act="desk-go" data-to="requests">' + pending.length + ' request' + (pending.length === 1 ? '' : 's') + ' waiting</button>' : '') + '</div>';

  let list; let html2 = '';
  if (R.sel) { list = evs.filter(e => e.date === R.sel); html2 += section(fmtLong(R.sel), list.length ? '<div class="card pad-0"><div class="list">' + list.map(e => eventItem(e)).join('') + '</div></div>' : empty('Nothing on this day.'), '<button class="linkish" data-act="selday" data-date="">Show all</button>'); }
  else { list = evs.filter(e => e.date.slice(0, 7) === R.month).sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1); html2 += section('This month', list.length ? '<div class="card pad-0"><div class="list">' + list.map(e => eventItem(e)).join('') + '</div></div>' : empty('Nothing on this month yet.')); }

  let html3 = '';
  if (!isC() && myReqs.length) html3 = section('Your requests', '<div class="card pad-0"><div class="list">' + myReqs.map(r => requestItem(r)).join('') + '</div></div>');
  return blk(html) + blk(html2) + blk(html3);
};
function requestItem(r) {
  const st = { pending: '<span class="pill">Waiting ' + waiting(r.createdAt) + '</span>', approved: '<span class="pill moss">Approved</span>', approved_edited: '<span class="pill moss">Approved with a change</span>', denied: '<span class="pill rust">Not approved</span>', resubmitted: '<span class="pill">Sent again</span>' }[r.status] || '';
  return '<button class="item tap" data-act="decision" data-id="' + r.id + '"><div class="col grow"><div class="t">' + { add: 'Add: ', change: 'Change: ', remove: 'Remove: ' }[r.type] + esc(r.draft.title) + '</div><div class="s">' + (r.committeeNote ? esc(first(r.decidedBy)) + ': ' + esc(r.committeeNote) : 'Sent ' + fmt(r.createdAt)) + '</div></div>' + st + '</button>';
}

function eventSheet(id) {
  const e = ev(id); if (!e) return;
  const m = nextMeeting(); const meeting = S.meetings.find(x => x.eventId === e.id);
  let html = '<div class="row between top"><div><div class="eyebrow">' + fmtLong(e.date) + ' · ' + fmtTime(e.time) + '</div><h2 style="margin-top:4px">' + esc(e.title) + '</h2></div>' + dateBlock(e) + '</div>';
  html += '<div class="row wrap">' + kindPill(e.kind) + (e.place ? '<span class="pill">' + esc(e.place) + '</span>' : '') + '</div>';
  if (e.desc) html += '<p>' + esc(e.desc) + '</p>';
  if (e.editedAt) html += '<div class="note">Changed ' + fmt(e.editedAt) + (e.editNote ? ': ' + esc(e.editNote) : '') + '</div>';
  if (e.kind === 'training-private') { const u = user(e.forUser); html += '<div class="note gorse">Booked for ' + esc(u ? u.name : '') + ' · ' + esc(training(e.trainingId).name) + '. Only they and the committee can see this.</div>'; if (isC()) html += '<button class="btn block moss" data-act="mark-trained" data-uid="' + e.forUser + '" data-tid="' + e.trainingId + '" data-evid="' + e.id + '">Mark ' + esc(first(e.forUser)) + ' as trained</button>'; }
  if (e.kind === 'training-open') {
    const coming = S.users.filter(u => u.training[e.trainingId] && u.training[e.trainingId].eventId === e.id);
    html += '<div class="card"><div class="row between"><div class="t">Coming (' + coming.length + ')</div>' + (coming.length ? '<div class="avs">' + coming.map(u => av(u.id, 'sm')).join('') + '</div>' : '') + '</div>' + (coming.length ? '<div class="small muted" style="margin-top:6px">' + coming.map(u => esc(u.name)).join(', ') + '</div>' : '') + '</div>';
    if (!isC()) { const mine = me().training[e.trainingId]; if (mine && mine.status === 'done') html += '<div class="note moss">You have already done this training.</div>'; else if (mine && mine.eventId === e.id) html += '<button class="btn block secondary" data-act="untrain-event" data-evid="' + e.id + '" data-tid="' + e.trainingId + '">Take my name off</button>'; else html += '<button class="btn block" data-act="join-training-event" data-evid="' + e.id + '" data-tid="' + e.trainingId + '">Put my name down</button>'; }
    else if (coming.length) html += '<button class="btn block moss" data-act="mark-all-trained" data-evid="' + e.id + '" data-tid="' + e.trainingId + '">Mark everyone who came as trained</button>';
  }
  if (meeting) {
    if (meeting.date >= TODAY) html += posterCard(meeting, true);
    const showAgenda = isC() || meeting.shared;
    html += '<div class="card"><div class="t">Agenda</div>' + (showAgenda && meeting.agenda.length ? '<ul class="agenda">' + meeting.agenda.map((a, i) => '<li>' + (i + 1) + '. ' + esc(a.text) + '</li>').join('') + '</ul>' : '<div class="small muted">' + (isC() ? 'Nothing yet. Prepare builds it from the month.' : 'The committee will share the agenda before the night.') + '</div>') + '</div>';
    if (meeting.date < TODAY) html += '<div class="card"><div class="t">' + meeting.attendance.length + ' came</div>' + (isC() ? '<div class="small muted">' + meeting.attendance.map(fullname).join(', ') + '</div>' : '') + (meeting.minutes ? '<div class="note" style="margin-top:8px;white-space:pre-line">' + esc(meeting.minutes) + '</div>' : '') + '</div>';
    if (isC()) html += '<div class="btnrow"><button class="btn" data-act="prep" data-id="' + meeting.id + '">' + (meeting.date < TODAY ? 'Minutes' : 'Prepare') + '</button>' + (meeting.date >= TODAY ? '<button class="btn secondary" data-act="poster-form" data-id="' + meeting.id + '">Poster</button><button class="btn secondary" data-act="run" data-id="' + meeting.id + '">Run it</button>' : '') + '</div>';
  }
  if (isC()) html += '<div class="btnrow"><button class="btn secondary" data-act="event-form" data-id="' + e.id + '">Edit</button><button class="btn danger" data-act="event-remove" data-id="' + e.id + '">Remove</button></div>';
  else if (!e.kind.startsWith('training') ) html += '<div class="btnrow"><button class="btn secondary" data-act="event-form" data-id="' + e.id + '" data-type="change">Ask for a change</button><button class="btn danger" data-act="event-form" data-id="' + e.id + '" data-type="remove">Ask to remove</button></div>';
  sheet(html);
}

function eventForm(id, type, resubmitOf) {
  const e = id ? ev(id) : null; const r = resubmitOf ? S.requests.find(x => x.id === resubmitOf) : null;
  const base = r ? (r.final || r.draft) : (e || {});
  const committeeEdit = isC();
  const kind = type || (e ? 'change' : 'add');
  let title = committeeEdit ? (e ? 'Edit this event' : 'Add to the calendar') : { add: 'Suggest an event', change: 'Ask for a change', remove: 'Ask to remove this' }[kind];
  if (r) title = 'Send it again';
  let html = '<h2>' + title + '</h2><div class="form">';
  if (kind === 'remove') html += '<div class="note">' + esc(e.title) + ' · ' + fmt(e.date) + '</div>';
  else {
    html += field('f-title', 'What', 'text', base.title) + '<div class="two">' + field('f-date', 'Date', 'date', base.date || R.sel || TODAY) + field('f-time', 'Time', 'time', base.time || '19:30') + '</div>' + field('f-place', 'Where', 'text', base.place) + field('f-desc', 'Details', 'textarea', base.desc, { placeholder: 'What people need to know.' });
    if (committeeEdit && !e) html += field('f-kind', 'Kind', 'select', 'event', { options: [['event', 'Event'], ['meeting', 'Monthly meeting'], ['training-open', 'Training, open to all']] });
    if (committeeEdit && e) html += field('f-editnote', 'What changed', 'text', '', { placeholder: 'Shown to everyone with the date, e.g. moved to half eight' });
  }
  if (!committeeEdit) html += field('f-note', r ? 'Note for the committee' : 'A note for the committee', 'textarea', '', { placeholder: r ? 'Say what you changed, or why you still want the original.' : 'Optional. Why, who, anything useful.' });
  html += '</div><div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn" data-act="event-save" data-id="' + (e ? e.id : '') + '" data-type="' + kind + '" data-resubmit="' + (r ? r.id : '') + '">' + (committeeEdit ? 'Save' : 'Send to the committee') + '</button></div>';
  if (!committeeEdit) html += '<div class="small faint">The committee answers every request. If they say no, they have to say why.</div>';
  sheet(html);
}
function eventSave(d) {
  const kind = d.type; let draft = {};
  if (kind !== 'remove') { const t = need('f-title', 'Give it a name'); if (!t) return; draft = { title: t, date: val('f-date'), time: val('f-time'), place: val('f-place'), desc: val('f-desc') }; if (!draft.date) { $('#f-date-err').textContent = 'Pick a date'; return; } }
  if (isC()) {
    if (d.id) { Object.assign(ev(d.id), draft, { editedAt: TODAY, editNote: val('f-editnote') }); toast('Saved. It shows as changed today.'); }
    else { S.events.push(Object.assign({ id: uid('ev'), kind: val('f-kind') || 'event' }, draft)); if ((val('f-kind') || 'event') === 'meeting') S.meetings.push({ id: uid('m'), eventId: S.events[S.events.length - 1].id, date: draft.date, attendance: [], agenda: [] }); toast('Added to the calendar'); }
    save(); closeSheet(); rerender(); return;
  }
  const note = val('f-note');
  if (d.resubmit) { const old = S.requests.find(r => r.id === d.resubmit); if (!note) { $('#f-note-err').textContent = 'Say what you changed or why.'; return; } old.status = 'closed'; S.requests.push({ id: uid('rq'), type: old.type, by: S.me, eventId: old.eventId, createdAt: TODAY, status: 'pending', draft, note, resubmitOf: old.id }); toast('Sent again'); }
  else { S.requests.push({ id: uid('rq'), type: kind, by: S.me, eventId: d.id || undefined, createdAt: TODAY, status: 'pending', draft: kind === 'remove' ? { title: ev(d.id).title } : draft, note }); toast('Sent to the committee'); }
  save(); closeSheet(); rerender();
}

// committee decides a request
function requestSheet(id, mode) {
  const r = S.requests.find(x => x.id === id); if (!r) return; const cur = r.eventId ? ev(r.eventId) : null;
  let html = '<div class="row"><span class="pill moss">' + { add: 'Add an event', change: 'Change an event', remove: 'Remove an event' }[r.type] + '</span><span class="small faint">from ' + esc(fullname(r.by)) + ' · ' + fmt(r.createdAt) + '</span></div><h2>' + esc(r.draft.title) + '</h2>';
  if (r.resubmitOf) { const o = S.requests.find(x => x.id === r.resubmitOf); if (o) html += '<div class="note">Sent again after ' + esc(first(o.decidedBy)) + ' changed it. Last note: “' + esc(o.committeeNote) + '”</div>'; }
  if (r.type !== 'remove') html += '<div class="kv"><b>When</b><span>' + fmtLong(r.draft.date) + ', ' + fmtTime(r.draft.time) + (cur && (cur.date !== r.draft.date || cur.time !== r.draft.time) ? ' <span class="pill gorse">was ' + fmt(cur.date) + ' ' + fmtTime(cur.time) + '</span>' : '') + '</span><b>Where</b><span>' + esc(r.draft.place || '—') + (cur && cur.place !== r.draft.place ? ' <span class="pill gorse">was ' + esc(cur.place) + '</span>' : '') + '</span><b>Details</b><span>' + esc(r.draft.desc || '—') + '</span></div>';
  else if (cur) html += '<div class="kv"><b>Event</b><span>' + esc(cur.title) + ', ' + fmt(cur.date) + '</span></div>';
  if (r.note) html += '<div class="note">“' + esc(r.note) + '”</div>';
  if (mode === 'edit') {
    html += '<div class="form">' + field('f-title', 'What', 'text', r.draft.title) + '<div class="two">' + field('f-date', 'Date', 'date', r.draft.date) + field('f-time', 'Time', 'time', r.draft.time) + '</div>' + field('f-place', 'Where', 'text', r.draft.place) + field('f-desc', 'Details', 'textarea', r.draft.desc) + field('f-why', 'What you changed and why', 'textarea', '', { placeholder: 'Goes to ' + first(r.by) + '. They can accept it or send it again.' }) + '</div>';
    html += '<div class="btnrow"><button class="btn secondary" data-act="request" data-id="' + r.id + '">Back</button><button class="btn moss" data-act="request-decide" data-id="' + r.id + '" data-what="edit">Approve with changes</button></div>';
  } else if (mode === 'deny') {
    html += '<div class="form">' + field('f-why', 'Why not', 'textarea', '', { placeholder: 'Required. ' + first(r.by) + ' will read this.' }) + '</div>';
    html += '<div class="btnrow"><button class="btn secondary" data-act="request" data-id="' + r.id + '">Back</button><button class="btn danger" data-act="request-decide" data-id="' + r.id + '" data-what="deny">Say no</button></div>';
  } else {
    html += '<div class="btnrow"><button class="btn moss" data-act="request-decide" data-id="' + r.id + '" data-what="approve">Approve</button>' + (r.type !== 'remove' ? '<button class="btn secondary" data-act="request" data-id="' + r.id + '" data-mode="edit">Edit, then approve</button>' : '') + '<button class="btn danger" data-act="request" data-id="' + r.id + '" data-mode="deny">No</button></div>';
  }
  sheet(html);
}
function requestDecide(d) {
  const r = S.requests.find(x => x.id === d.id); r.decidedBy = S.me; r.decidedAt = TODAY;
  if (d.what === 'deny') { const why = need('f-why', 'You have to say why.'); if (!why) return; r.status = 'denied'; r.committeeNote = why; toast('Sent to ' + first(r.by)); }
  else {
    let final = r.draft;
    if (d.what === 'edit') { const why = need('f-why', 'Say what you changed.'); if (!why) return; const t = need('f-title', 'Needs a name'); if (!t) return; final = { title: t, date: val('f-date'), time: val('f-time'), place: val('f-place'), desc: val('f-desc') }; r.final = final; r.committeeNote = why; r.status = 'approved_edited'; }
    else r.status = 'approved';
    if (r.type === 'add') { const e = Object.assign({ id: uid('ev'), kind: 'event' }, final); S.events.push(e); r.eventId = e.id; }
    else if (r.type === 'change') Object.assign(ev(r.eventId), final, { editedAt: TODAY, editNote: 'Asked for by ' + first(r.by) });
    else if (r.type === 'remove') { S.events = S.events.filter(e => e.id !== r.eventId); }
    toast(d.what === 'edit' ? 'Approved with your changes. ' + first(r.by) + ' will see them.' : 'Approved. Calendar updated.');
  }
  save(); closeSheet(); rerender();
}
// local reads a decision
function decisionSheet(id) {
  const r = S.requests.find(x => x.id === id); if (!r) return;
  let html = '<div class="row"><span class="pill ' + (r.status === 'denied' ? 'rust' : r.status === 'pending' ? '' : 'moss') + '">' + ({ denied: 'Not approved', approved_edited: 'Approved with a change', approved: 'Approved', pending: 'Waiting', accepted: 'Done', closed: 'Closed' }[r.status]) + '</span><span class="small faint">' + { add: 'Add', change: 'Change', remove: 'Remove' }[r.type] + ' · sent ' + fmt(r.createdAt) + '</span></div><h2>' + esc(r.draft.title) + '</h2>';
  if (r.note) html += '<div class="small muted">Your note: “' + esc(r.note) + '”</div>';
  if (r.status === 'pending') html += '<div class="note">The committee has not answered yet. Waiting ' + waiting(r.createdAt) + '.</div>';
  if (r.committeeNote) html += '<div class="note ' + (r.status === 'denied' ? 'rust' : 'gorse') + '"><b>' + esc(first(r.decidedBy)) + ' wrote:</b> ' + esc(r.committeeNote) + '</div>';
  if (r.status === 'approved_edited') {
    const f = r.final, d = r.draft;
    html += '<div class="kv">' + (f.date !== d.date || f.time !== d.time ? '<b>When</b><span><s class="faint">' + fmt(d.date) + ' ' + fmtTime(d.time) + '</s> → ' + fmt(f.date) + ' ' + fmtTime(f.time) + '</span>' : '') + (f.place !== d.place ? '<b>Where</b><span><s class="faint">' + esc(d.place) + '</s> → ' + esc(f.place) + '</span>' : '') + (f.title !== d.title ? '<b>What</b><span><s class="faint">' + esc(d.title) + '</s> → ' + esc(f.title) + '</span>' : '') + '</div>';
    html += '<div class="small muted">It is already on the calendar as the committee changed it. If you accept, that stands. If you send it again, you can add a note and they look at it once more.</div>';
    html += '<div class="btnrow"><button class="btn moss" data-act="decision-accept" data-id="' + r.id + '">Accept</button><button class="btn secondary" data-act="event-form" data-resubmit="' + r.id + '">Send again with a note</button></div>';
  } else if (r.status === 'denied') html += '<div class="btnrow"><button class="btn" data-act="decision-accept" data-id="' + r.id + '">OK, understood</button><button class="btn secondary" data-act="event-form" data-resubmit="' + r.id + '">Send again with a note</button></div>';
  sheet(html);
}

// ---------- ROTA + TRAINING ----------
function taskPill(t) {
  return { offered: '<span class="pill gorse">Asked</span>', accepted: '<span class="pill moss">Taken</span>', declined: '<span class="pill rust">Declined</span>', submitted: '<span class="pill moss">Done?</span>', done: '<span class="pill">Done</span>', unassigned: '<span class="pill rust">Nobody yet</span>' }[t.status] || '';
}
function taskItem(t, showWho) {
  const m = me(); const gate = t.trainingId && t.assignee && !hasTraining(user(t.assignee), t.trainingId);
  return '<button class="item tap" data-act="task" data-id="' + t.id + '">' + (showWho ? (t.assignee ? av(t.assignee, 'sm') : '<span class="av sm" style="background:var(--line-strong)">?</span>') : '') + '<div class="col grow"><div class="t">' + esc(t.title) + '</div><div class="s">' + (t.due ? 'By ' + fmt(t.due) : '') + (t.place ? ' · ' + esc(t.place) : '') + (showWho && t.assignee ? ' · ' + esc(first(t.assignee)) : '') + '</div>' + (gate ? '<div><span class="pill gorse">Needs ' + esc(training(t.trainingId).name) + '</span></div>' : '') + '</div><div class="right">' + taskPill(t) + '</div></button>';
}
SCREENS.rota = function () {
  const cur = segOf('rota', 'tasks');
  const q = isC() ? deskQueue() : null;
  let html = '<h1 class="h2">Rota</h1>' + seg('rota', [['tasks', 'Tasks', q ? (q.declined.length + q.submitted.length + q.unassigned.length) || '' : S.tasks.filter(t => t.assignee === S.me && t.status === 'offered').length || ''], ['training', 'Training', q ? q.verify.length || '' : '']]);
  if (cur === 'training') return blk(html + (isC() ? trainingCommittee() : trainingLocal()));
  if (isC()) {
    html += '<div class="btnrow"><button class="btn" data-act="task-form">Give someone a task</button></div>';
    const look = S.tasks.filter(t => ['declined', 'submitted', 'unassigned'].includes(t.status));
    if (look.length) html += section('Look at these', '<div class="card pad-0"><div class="list">' + look.map(t => taskItem(t, true)).join('') + '</div></div>');
    let projects = '';
    S.projects.forEach(p => { const ts = S.tasks.filter(t => t.project === p && !['declined', 'submitted', 'unassigned'].includes(t.status)); if (ts.length) projects += section(p, '<div class="card pad-0"><div class="list">' + ts.map(t => taskItem(t, true)).join('') + '</div></div>', '<span class="small faint">' + ts.filter(t => t.status === 'done').length + ' of ' + ts.length + ' done</span>'); });
    return blk(html) + blk(projects);
  }
  const mine = S.tasks.filter(t => t.assignee === S.me);
  const offered = mine.filter(t => t.status === 'offered'), open = mine.filter(t => ['accepted', 'submitted'].includes(t.status)), past = mine.filter(t => ['done', 'declined'].includes(t.status));
  if (offered.length) html += section('Will you take these?', '<div class="card pad-0"><div class="list">' + offered.map(t => taskItem(t)).join('') + '</div></div>');
  html += section('Your tasks', open.length ? '<div class="card pad-0"><div class="list">' + open.map(t => taskItem(t)).join('') + '</div></div>' : empty('No tasks on you right now.'));
  const earlier = past.length ? section('Earlier', '<div class="card pad-0"><div class="list">' + past.map(t => taskItem(t)).join('') + '</div></div>') : '';
  return blk(html) + blk(earlier);
};

function taskSheet(id) {
  const t = S.tasks.find(x => x.id === id); if (!t) return; const m = me(); const mine = t.assignee === m.id;
  const tr = t.trainingId ? training(t.trainingId) : null; const u = t.assignee ? user(t.assignee) : null; const gate = tr && u && !hasTraining(u, tr.id);
  let html = '<div class="row"><span class="pill">' + esc(t.project) + '</span>' + taskPill(t) + '</div><h2>' + esc(t.title) + '</h2>';
  html += '<div class="kv">' + (t.due ? '<b>By</b><span>' + fmtLong(t.due) + ' · ' + inDays(t.due) + '</span>' : '') + (t.place ? '<b>Where</b><span>' + esc(t.place) + '</span>' : '') + '<b>Who</b><span>' + (u ? esc(u.name) : 'Nobody yet') + '</span><b>From</b><span>' + esc(fullname(t.createdBy)) + '</span></div>';
  if (t.notes) html += '<div class="note">' + esc(t.notes) + '</div>';
  { const who = isC() ? u : user(t.createdBy); if (who && who.phone && who.id !== m.id) html += '<div class="row wrap"><button class="btn sm secondary" data-act="ring" data-id="' + who.id + '">Ring ' + esc(first(who.id)) + ' · ' + esc(phoneShown(who.phone)) + '</button><span class="small faint">The details get sorted on the phone or in person, not in here.</span></div>'; }
  if (t.declineNote) html += '<div class="note rust"><b>' + esc(first(t.assignee)) + ' declined:</b> ' + esc(t.declineNote) + '</div>';
  if (t.submitNote) html += '<div class="note moss"><b>' + esc(first(t.assignee)) + ':</b> ' + esc(t.submitNote) + '</div>';
  if (tr) {
    const st = u ? (u.training[tr.id] || {}) : {};
    html += '<div class="card ' + (gate ? 'warn' : '') + '"><div class="row between"><div><div class="t">Needs ' + esc(tr.name) + '</div><div class="small muted">' + (!u ? 'Whoever takes it must have it.' : st.status === 'done' ? esc(first(u.id)) + ' has it, done ' + fmt(st.date) : st.status === 'pending_verify' ? esc(first(u.id)) + ' says they have done it. Waiting on the committee.' : st.status === 'booked' ? esc(first(u.id)) + ' is booked in for ' + (st.slotId ? fmt(trainingSlot(st.slotId).date) : st.eventId ? fmt(ev(st.eventId).date) : '') : esc(first(u.id)) + ' has not done it yet.') + '</div></div></div>';
    if (mine && gate && t.status === 'accepted' && !st.status) html += '<div class="stack" style="margin-top:10px"><div class="small muted">Three ways to sort it:</div><div class="btnrow"><button class="btn secondary sm" data-act="verify-form" data-tid="' + tr.id + '">I have done it already</button>' + (tr.mode !== 'inperson' ? '<a class="btn secondary sm" href="' + esc(tr.link) + '" target="_blank" rel="noopener">Do it online</a>' : '') + '<button class="btn gorse sm" data-act="book-form" data-tid="' + tr.id + '">Book a session</button></div></div>';
    if (mine && st.status === 'booked') html += '<div class="small muted" style="margin-top:8px">It is on your calendar.</div>';
    html += '</div>';
  }
  if (mine && t.status === 'offered') html += '<div class="btnrow"><button class="btn moss" data-act="task-accept" data-id="' + t.id + '">Yes, I will do it</button><button class="btn danger" data-act="task-decline-form" data-id="' + t.id + '">I cannot</button></div>';
  if (mine && t.status === 'accepted') html += '<div class="form">' + field('f-done', 'How did it go? (optional)', 'textarea', '', { placeholder: 'Anything the committee should know.' }) + '</div><button class="btn block moss" data-act="task-submit" data-id="' + t.id + '">Mark as done</button>';
  if (isC()) {
    html += '<div class="btnrow">';
    if (t.status === 'submitted') html += '<button class="btn moss" data-act="task-confirm" data-id="' + t.id + '">Confirm done</button>';
    if (t.status === 'declined' || t.status === 'unassigned') html += '<button class="btn" data-act="task-form" data-id="' + t.id + '">Give it to someone else</button>';
    html += '<button class="btn secondary" data-act="task-form" data-id="' + t.id + '">Edit</button><button class="btn danger" data-act="task-remove" data-id="' + t.id + '">Remove</button></div>';
  }
  sheet(html);
}
function taskForm(id, prefill) {
  const t = id ? S.tasks.find(x => x.id === id) : (prefill || {});
  const people = S.users.filter(u => u.role !== 'pending').map(u => [u.id, u.name + (u.role === 'committee' ? ' (committee)' : '')]);
  let html = '<h2>' + (id ? 'Edit the task' : 'Give someone a task') + '</h2><div class="form">' + field('f-title', 'What needs doing', 'text', t.title) + field('f-who', 'Who', 'select', t.assignee || '', { options: [['', 'Nobody yet']].concat(people) }) + field('f-project', 'Project', 'select', t.project || S.projects[0], { options: S.projects.map(p => [p, p]).concat([['__new', 'New project…']]) }) + '<div class="two">' + field('f-due', 'By when', 'date', t.due) + field('f-place', 'Where', 'text', t.place) + '</div>' + field('f-notes', 'Notes', 'textarea', t.notes, { placeholder: 'Where to go, who to ask, what good looks like.' }) + field('f-training', 'Training needed', 'select', t.trainingId || '', { options: [['', 'None']].concat(S.trainings.map(x => [x.id, x.name])) }) + '</div>';
  html += '<div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn" data-act="task-save" data-id="' + (id || '') + '">' + (id ? 'Save' : 'Ask them') + '</button></div><div class="small faint">They are asked to accept it. If they decline they have to say why.</div>';
  sheet(html);
}
function taskSave(id) {
  const title = need('f-title', 'Say what needs doing'); if (!title) return;
  let project = val('f-project'); if (project === '__new') { project = 'New project'; S.projects.push(project); }
  const who = val('f-who') || null;
  const data = { title, assignee: who, project, due: val('f-due'), place: val('f-place'), notes: val('f-notes'), trainingId: val('f-training') || undefined };
  if (id) { const t = S.tasks.find(x => x.id === id); const changedWho = t.assignee !== who; Object.assign(t, data); if (changedWho) { t.status = who ? 'offered' : 'unassigned'; delete t.declineNote; delete t.submitNote; } }
  else S.tasks.push(Object.assign({ id: uid('t'), status: who ? 'offered' : 'unassigned', createdBy: S.me }, data));
  save(); closeSheet(); rerender(); toast(who ? first(who) + ' has been asked' : 'Saved with nobody on it yet');
}
function trainingSlot(id) { for (const t of S.trainings) { const s = t.slots.find(x => x.id === id); if (s) return s; } return {}; }

function trainingLocal() {
  const m = me();
  const needed = S.tasks.filter(t => t.assignee === m.id && t.trainingId && ['offered', 'accepted'].includes(t.status)).map(t => t.trainingId);
  let html = '';
  html += section('Your record', '<div class="card pad-0"><div class="list">' + S.trainings.map(tr => {
    const st = m.training[tr.id] || {}; const need = needed.includes(tr.id);
    const line = st.status === 'done' ? '<span class="pill moss">Done ' + fmt(st.date) + '</span>' : st.status === 'pending_verify' ? '<span class="pill gorse">Waiting on the committee</span>' : st.status === 'booked' ? '<span class="pill gorse">Booked ' + fmt(st.slotId ? trainingSlot(st.slotId).date : ev(st.eventId).date) + '</span>' : need ? '<span class="pill rust">Needed for a task</span>' : '<span class="pill">Not done</span>';
    return '<button class="item tap" data-act="training" data-id="' + tr.id + '"><div class="col grow"><div class="t">' + esc(tr.name) + '</div><div class="s">' + esc(tr.desc.slice(0, 70)) + '…</div><div>' + line + '</div></div>' + chev + '</button>';
  }).join('') + '</div></div>');
  const open = S.events.filter(e => e.kind === 'training-open' && e.date >= TODAY);
  if (open.length) html += section('Open sessions', '<div class="card pad-0"><div class="list">' + open.map(e => eventItem(e, { rel: true })).join('') + '</div></div>');
  return html;
}
function trainingSheet(id) {
  const tr = training(id); const m = me(); const st = m.training[id] || {};
  let html = '<span class="pill gorse">Training</span><h2>' + esc(tr.name) + '</h2><p>' + esc(tr.desc) + '</p>';
  html += '<div class="kv"><b>How</b><span>' + { online: 'Online', inperson: 'In person', both: 'Online, or in person' }[tr.mode] + '</span><b>Good for</b><span>' + tr.validYears + ' years</span></div>';
  if (tr.link) html += '<a class="btn block secondary" href="' + esc(tr.link) + '" target="_blank" rel="noopener">Open the online course</a>';
  if (isC()) { html += trainingMatrix(tr) + '<div class="btnrow"><button class="btn secondary" data-act="training-form" data-id="' + tr.id + '">Edit</button><button class="btn" data-act="slot-form" data-id="' + tr.id + '">Add a session time</button></div>'; }
  else {
    if (st.status === 'done') html += '<div class="note moss">You did this on ' + fmtLong(st.date) + '.</div>';
    else if (st.status === 'pending_verify') html += '<div class="note gorse">You told the committee you did this on ' + fmt(st.date) + '. Waiting for them to confirm.</div>';
    else if (st.status === 'booked') html += '<div class="note gorse">Booked. It is on your calendar.</div><button class="btn block secondary" data-act="unbook" data-tid="' + tr.id + '">Cancel the booking</button>';
    else html += '<div class="btnrow"><button class="btn secondary" data-act="verify-form" data-tid="' + tr.id + '">I have done it already</button><button class="btn gorse" data-act="book-form" data-tid="' + tr.id + '">Book a session</button></div>';
  }
  sheet(html);
}
function trainingMatrix(tr) {
  const need = {}; S.tasks.filter(t => t.trainingId === tr.id && t.assignee && !['done'].includes(t.status)).forEach(t => need[t.assignee] = t.title);
  const rows = S.users.filter(u => u.role !== 'pending' && (need[u.id] || u.training[tr.id])).map(u => { const st = u.training[tr.id] || {}; return '<div class="item"><div class="row grow">' + av(u.id, 'sm') + '<div class="col grow"><div class="t small">' + esc(u.name) + '</div>' + (need[u.id] ? '<div class="s tiny">for: ' + esc(need[u.id]) + '</div>' : '') + '</div></div><div class="right">' + (st.status === 'done' ? '<span class="pill moss">Done</span>' : st.status === 'pending_verify' ? '<button class="btn sm gorse" data-act="verify" data-uid="' + u.id + '" data-tid="' + tr.id + '">Confirm?</button>' : st.status === 'booked' ? '<span class="pill gorse">Booked</span>' : '<span class="pill rust">Needs it</span>') + '</div></div>'; });
  const slots = tr.slots.filter(s => s.date >= TODAY);
  return '<div class="card pad-0"><div class="list"><div class="item" style="background:var(--surface-2)"><div class="t small">Who has it, who needs it</div></div>' + (rows.length ? rows.join('') : '<div class="item small muted">Nobody needs this right now.</div>') + '</div></div>' +
    '<div class="card pad-0"><div class="list"><div class="item" style="background:var(--surface-2)"><div class="t small">Session times you have set</div></div>' + (slots.length ? slots.map(s => '<div class="item"><div class="col grow"><div class="t small">' + fmt(s.date) + ', ' + fmtTime(s.time) + '</div><div class="s tiny">' + esc(s.place) + (s.taken ? ' · ' + esc(first(s.taken)) : s.open ? ' · open to all, on the calendar' : ' · free') + '</div></div>' + (!s.taken && !s.open ? '<button class="btn sm secondary" data-act="slot-open" data-id="' + s.id + '" data-tid="' + tr.id + '">Open to all</button>' : '') + '</div>').join('') : '<div class="item small muted">No upcoming times.</div>') + '</div></div>';
}
function trainingCommittee() {
  const q = deskQueue();
  let html = '<div class="btnrow"><button class="btn" data-act="training-form">Create a training</button></div>';
  if (q.verify.length) html += section('Confirm these', '<div class="card pad-0"><div class="list">' + q.verify.map(v => '<button class="item tap" data-act="verify" data-uid="' + v.u.id + '" data-tid="' + v.tid + '">' + av(v.u.id, 'sm') + '<div class="col grow"><div class="t">' + esc(v.u.name) + '</div><div class="s">' + esc(training(v.tid).name) + ' · ' + fmt(v.v.date) + (v.v.note ? ' · “' + esc(v.v.note) + '”' : '') + '</div></div>' + chev + '</button>').join('') + '</div></div>');
  html += section('Trainings', '<div class="card pad-0"><div class="list">' + S.trainings.map(tr => {
    const done = S.users.filter(u => hasTraining(u, tr.id)).length; const needs = S.tasks.filter(t => t.trainingId === tr.id && t.assignee && t.status !== 'done' && !hasTraining(user(t.assignee), tr.id)).length;
    return '<button class="item tap" data-act="training" data-id="' + tr.id + '"><div class="col grow"><div class="t">' + esc(tr.name) + '</div><div class="s">' + done + ' trained' + (needs ? ' · <b style="color:var(--rust)">' + needs + ' need it</b>' : '') + ' · ' + tr.slots.filter(s => s.date >= TODAY).length + ' upcoming times</div></div>' + chev + '</button>';
  }).join('') + '</div></div>');
  return html;
}
function verifySheet(uid_, tid) {
  const u = user(uid_), tr = training(tid), st = u.training[tid];
  sheet('<span class="pill gorse">Training</span><h2>' + esc(u.name) + ' says they have done ' + esc(tr.name) + '</h2><div class="kv"><b>When</b><span>' + fmtLong(st.date) + '</span><b>Note</b><span>' + esc(st.note || '—') + '</span></div><div class="small muted">Confirm it if you have seen the certificate or trust the word. Otherwise ask them to do it again.</div><div class="btnrow"><button class="btn moss" data-act="verify-ok" data-uid="' + u.id + '" data-tid="' + tid + '">Confirm</button><button class="btn danger" data-act="verify-no" data-uid="' + u.id + '" data-tid="' + tid + '">Ask them to do it again</button></div>');
}
function verifyForm(tid) {
  const tr = training(tid);
  sheet('<h2>I have done ' + esc(tr.name) + '</h2><div class="form">' + field('f-date', 'When', 'date', '') + field('f-note', 'Where, or anything that helps', 'textarea', '', { placeholder: 'For example: did it online in March, certificate at home.' }) + '</div><div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn" data-act="verify-save" data-tid="' + tid + '">Tell the committee</button></div>');
}
function bookForm(tid) {
  const tr = training(tid); const slots = tr.slots.filter(s => s.date >= TODAY && !s.taken && !s.open);
  const open = S.events.filter(e => e.kind === 'training-open' && e.trainingId === tid && e.date >= TODAY);
  let html = '<h2>Book ' + esc(tr.name) + '</h2>';
  html += slots.length ? '<div class="card pad-0"><div class="list">' + slots.map(s => '<button class="item tap" data-act="book" data-slot="' + s.id + '" data-tid="' + tid + '"><div class="col grow"><div class="t">' + fmtLong(s.date) + ', ' + fmtTime(s.time) + '</div><div class="s">' + esc(s.place) + ' · just you</div></div>' + chev + '</button>').join('') + '</div></div>' : '<div class="note">No one-to-one times set yet. Ask the committee.</div>';
  if (open.length) html += '<div class="small muted">Or an open session:</div><div class="card pad-0"><div class="list">' + open.map(e => '<button class="item tap" data-act="join-training-event" data-evid="' + e.id + '" data-tid="' + tid + '">' + dateBlock(e) + '<div class="col grow"><div class="t">' + esc(e.title) + '</div><div class="s">' + fmtTime(e.time) + ' · ' + esc(e.place) + '</div></div>' + chev + '</button>').join('') + '</div></div>';
  sheet(html);
}
function trainingForm(id) {
  const tr = id ? training(id) : {};
  sheet('<h2>' + (id ? 'Edit the training' : 'Create a training') + '</h2><div class="form">' + field('f-name', 'Name', 'text', tr.name) + field('f-desc', 'What it is and who needs it', 'textarea', tr.desc) + field('f-mode', 'How it is done', 'select', tr.mode || 'both', { options: [['online', 'Online'], ['inperson', 'In person'], ['both', 'Either']] }) + field('f-link', 'Link to the online course or material', 'url', tr.link, { placeholder: 'https://' }) + field('f-years', 'Good for how many years', 'number', tr.validYears || 3) + '</div><div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn" data-act="training-save" data-id="' + (id || '') + '">Save</button></div><div class="small faint">Attach it to tasks from the task form. Add session times from the training page.</div>');
}
function slotForm(tid) {
  sheet('<h2>Add a session time</h2><div class="small muted">' + esc(training(tid).name) + '. One person can book it, or you can open it to everyone and it goes on the calendar.</div><div class="form"><div class="two">' + field('f-date', 'Date', 'date', '') + field('f-time', 'Time', 'time', '19:00') + '</div>' + field('f-place', 'Where', 'text', 'Community hall') + '</div><div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn" data-act="slot-save" data-tid="' + tid + '">Add</button></div>');
}

// ---------- NEWSLETTER ----------
SCREENS.news = function () {
  const q = isC() ? deskQueue() : null; const d = draftIssue();
  const myProps = d ? d.posts.filter(p => p.submittedBy === S.me).length : 0;
  const cur = segOf('news', 'issue');
  if (cur === 'issue' && R.view === 'web') return seg('news', isC() ? [['issue', 'This issue'], ['responses', 'Answers', responseCount() || ''], ['draft', 'Next issue', q.myVotes.length || '']] : [['issue', 'This issue'], ['draft', 'Next issue', myProps || '']], true) + spreadView();
  let html = (cur === 'issue' ? '' : '<h1 class="h2">Newsletter</h1>') + (isC()
    ? seg('news', [['issue', 'This issue'], ['responses', 'Answers', responseCount() || ''], ['draft', 'Next issue', q.myVotes.length || '']], cur === 'issue')
    : seg('news', [['issue', 'This issue'], ['draft', 'Next issue', myProps || '']], cur === 'issue'));
  if (cur === 'responses') return blk(html + responsesDash());
  if (cur === 'draft') return blk(html + (isC() ? draftCommittee() : draftLocal()));
  return html + issueView();
};
function responseCount() { const c = currentIssue(); return c ? c.posts.reduce((a, p) => a + (p.responses || []).length, 0) : 0; }

function issuePages(iss) {
  const n = iss.posts.length + 2;
  const pages = [coverPage(iss, n)];
  iss.posts.forEach((p, i) => pages.push(postView(p, iss, i + 2, n)));
  pages.push('<section class="page end">' + sunline(5) + '<h3 style="margin-top:14px">That is all for ' + monthName(iss.month).split(' ')[0] + '.</h3><div class="colophon">Put together by the committee and approved by every one of them. Your answers go to the committee only, and they bring them to the meeting' + (nextMeeting() ? ' on ' + fmt(nextMeeting().date) : '') + '.</div><div class="btnrow" style="margin-top:22px;justify-content:center"><button class="btn secondary" data-act="seg" data-tab="news" data-seg="draft">Send something in for next month</button><button class="btn secondary" data-act="back-issues">Back issues</button></div><div class="pageno">Page ' + n + ' of ' + n + '</div></section>');
  return pages;
}
function coverPage(iss, n) {
  const withPic = iss.posts.find(p => images(p).length);
  return '<section class="page cover"><div class="row between"><button class="back" data-act="back-issues" aria-label="Back issues">No. ' + issueNo(iss) + ' <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><span class="eyebrow">Page 1 of ' + n + '</span></div>' +
    '<div class="masthead">' + esc(S.town.name) + '<small>The monthly newsletter</small></div><div class="marks">' + townMarks().join('') + '</div>' + sunline(7, 'green') + '<div class="dbl"></div><div class="dateline"><span>' + monthName(iss.month) + '</span><span>Free to every house</span></div>' +
    (withPic ? '<figure class="figure"><div class="duo"><img src="' + images(withPic)[0].src + '" alt=""></div><figcaption>' + esc(withPic.title) + '. Page ' + (iss.posts.indexOf(withPic) + 2) + '.</figcaption></figure>' : '') +
    '<div class="contents">' + iss.posts.map((p, i) => '<button class="c" data-act="goto-page" data-i="' + (i + 1) + '"><span class="k">' + shortLabel(p.type) + '</span><span class="t">' + esc(p.title) + (p.addedAt && p.addedAt > iss.publishedAt ? '<span class="new">added ' + fmt(p.addedAt) + '</span>' : '') + '</span><span class="pg">' + (i + 2) + '</span></button>').join('') + '</div>' +
    '<div class="meta">Printed ' + fmt(iss.publishedAt) + ' · approved by the whole committee</div></section>';
}
function issueView() {
  const iss = viewIssue(); if (!iss) return empty('No issue published yet.');
  return '<div class="reader" id="reader">' + issuePages(iss).join('') + '</div>';
}
function spreadView() {
  const iss = viewIssue(); if (!iss) return empty('No issue published yet.');
  const pages = issuePages(iss); const n = pages.length; const k = Math.max(0, Math.min(R.spread || 0, Math.ceil(n / 2) - 1));
  const left = pages[2 * k], right = pages[2 * k + 1] || '<section class="page"></section>';
  return '<div class="spread">' + left + right + '</div><div class="spreadnav"><button class="turn" data-act="spread" data-k="-1" aria-label="Previous pages" ' + (k === 0 ? 'disabled' : '') + '><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><span>' + esc(S.town.name) + ' · No. ' + issueNo(iss) + ' · pages ' + (2 * k + 1) + (2 * k + 2 <= n ? '–' + (2 * k + 2) : '') + ' of ' + n + ' · <button class="linkish" data-act="back-issues">Back issues</button></span><button class="turn" data-act="spread" data-k="1" aria-label="Next pages" ' + (2 * k + 2 >= n ? 'disabled' : '') + '><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button></div>';
}
function backIssuesSheet() {
  const list = S.issues.filter(i => i.status === 'published').sort((a, b) => a.month < b.month ? 1 : -1); const cur = viewIssue();
  sheet('<h2>Back issues</h2><div class="small muted">Every issue the town has printed. Tap one to read it.</div><div class="card pad-0"><div class="list">' + list.map(i => '<button class="item tap" data-act="pick-issue" data-id="' + i.id + '"><div class="col grow"><div class="t">No. ' + issueNo(i) + ' · ' + monthName(i.month) + '</div><div class="s">' + i.posts.length + ' pages · printed ' + fmt(i.publishedAt) + '</div></div>' + (i.id === cur.id ? '<span class="pill moss">Open</span>' : chev) + '</button>').join('') + '</div></div>');
}
function byline(p) { const a = user(p.author); return '<div class="byline">' + (p.source === 'local' ? 'Sent in by ' + esc(fullname(p.submittedBy)) + ' <span>· put together by ' + esc(fullname(p.author)) + '</span>' : esc(fullname(p.author)) + (a && a.title ? '<span>, ' + esc(a.title) + '</span>' : '')) + '</div>'; }
function paragraphs(body) { return String(body || '').split(/\n\s*\n|\n/).filter(s => s.trim()).map(s => '<p>' + esc(s) + '</p>').join(''); }
function images(p) { const list = p.images && p.images.length ? p.images : (p.image ? [{ src: p.image, caption: p.imageCaption }] : []); return list; }
function figure(p, k) { const list = images(p); const pick = k === 'all' ? list : list.slice(0, 1); return pick.map(im => '<figure class="figure"><div class="duo"><img src="' + im.src + '" alt="' + esc(im.caption || p.title) + '"></div>' + (im.caption ? '<figcaption>' + esc(im.caption) + '</figcaption>' : '') + '</figure>').join(''); }
function isLong(p) { return (p.body || '').length > 420 || images(p).length > 1; }
function articleSheet(id) {
  const iss = viewIssue(); const p = iss.posts.find(x => x.id === id); if (!p) return;
  sheet('<div class="backbar"><button class="btn sm secondary" data-act="close">‹ Back to the pages</button><span class="mono faint">' + esc(S.town.name) + ' Newsletter</span></div><article class="page"><div class="kind"><span>' + typeLabel(p.type) + '</span></div><h3>' + esc(p.title) + '</h3>' + byline(p) + figure(p, 'all') + '<div class="body">' + paragraphs(p.body) + '</div></article>');
  $('.sheet').classList.add('full');
}
function postView(p, iss, pageNo, total) {
  const mine = (p.responses || []).find(r => r.by === S.me);
  const long = isLong(p); const paras = String(p.body || '').split(/\n\s*\n|\n/).filter(s => s.trim());
  const shown = long ? paras.slice(0, 2).map((s, i) => i === 1 && s.length > 220 ? s.slice(0, 200).replace(/\s+\S*$/, '') + '…' : s) : paras;
  let html = '<section class="page ' + p.type + '"><div class="kind"><span>' + typeLabel(p.type) + '</span><span class="pg">Page ' + pageNo + ' of ' + total + '</span></div><h3>' + esc(p.title) + '</h3>' + byline(p) + figure(p) + '<div class="body">' + shown.map(s => '<p>' + esc(s) + '</p>').join('') + '</div>' +
    (long ? '<div class="readon"><button class="btn secondary" data-act="article" data-id="' + p.id + '">Read the whole piece' + (images(p).length > 1 ? ' · ' + images(p).length + ' pictures' : '') + '</button></div>' : '');
  if (p.type === 'help') {
    html += '<div class="act">' + (isC() ? '<div class="row between"><span class="small muted">' + (p.responses || []).length + ' offered</span><button class="linkish" data-act="seg" data-tab="news" data-seg="responses">See who</button></div>'
      : mine ? '<div class="row between wrap"><span class="pill moss">You offered' + (mine.text ? ': “' + esc(mine.text) + '”' : '') + '</span><button class="linkish" data-act="unrespond" data-post="' + p.id + '">Take it back</button></div>'
      : '<div class="form">' + field('r-' + p.id, 'A line for the committee (optional)', 'text', '', { placeholder: 'Any day, can bring a van…' }) + '</div><button class="btn block moss" style="margin-top:10px" data-act="respond-help" data-post="' + p.id + '">I can help</button>') + '</div>';
  } else if (p.type === 'poll' || p.type === 'vote') {
    if (isC()) html += '<div class="act">' + tally(p) + (p.allowNotes ? '<div class="small faint" style="margin-top:6px">Notes are on for this one.</div>' : '') + '</div>';
    else {
      html += '<div class="act"><div class="opts">' + p.options.map((o, i) => '<button class="opt ' + (mine && mine.choice === i ? 'on' : '') + '" data-act="respond-choice" data-post="' + p.id + '" data-i="' + i + '"><span class="k">' + (mine && mine.choice === i ? '✓' : '') + '</span><span>' + esc(o) + '</span></button>').join('') + '</div>';
      if (p.allowNotes && mine) html += mine.text ? '<div class="row between" style="margin-top:10px"><div class="quote grow">' + esc(mine.text) + '</div><button class="linkish" data-act="respond-note-edit" data-post="' + p.id + '">Change</button></div>'
        : '<div class="form" style="margin-top:10px">' + field('n-' + p.id, 'Why, or any nuance (optional)', 'text', '', { placeholder: 'A line the committee will read with your answer.' }) + '</div><button class="btn block secondary sm" style="margin-top:8px" data-act="respond-note" data-post="' + p.id + '">Add the note</button>';
      html += '<div class="small faint" style="margin-top:8px">' + (mine ? 'Your answer went to the committee. Tap another to change it.' : 'Only the committee sees the result. They bring it to the meeting.') + '</div></div>';
    }
  }
  return html + '</section>';
}
function tally(p) {
  const n = (p.responses || []).length; const counts = p.options.map((o, i) => (p.responses || []).filter(r => r.choice === i).length);
  const notes = (p.responses || []).filter(r => r.text);
  return '<div class="result">' + p.options.map((o, i) => '<div class="r"><span>' + esc(o) + '</span><span class="num muted">' + counts[i] + '</span><div class="b"><i style="width:' + (n ? Math.round(counts[i] / n * 100) : 0) + '%"></i></div></div>').join('') + '</div><div class="small faint" style="margin-top:6px">' + n + ' of ' + S.users.filter(u => u.role !== 'pending').length + ' answered</div>' + (notes.length ? '<div class="stack" style="margin-top:8px">' + notes.map(r => '<div class="quote"><b style="font-style:normal">' + esc(first(r.by)) + ' (' + esc(p.options[r.choice]) + '):</b> ' + esc(r.text) + '</div>').join('') + '</div>' : '');
}

function responsesDash() {
  const iss = currentIssue(); if (!iss) return empty('Nothing published yet.');
  const f = R.seg['news-filter'] || 'all';
  const posts = iss.posts.filter(p => ['help', 'poll', 'vote'].includes(p.type)).filter(p => f === 'all' || (f === 'help' ? p.type === 'help' : p.type !== 'help'));
  const nm = nextMeeting();
  let html = '<div class="chips">' + [['all', 'Everything'], ['help', 'Offers of help'], ['votes', 'Votes and polls']].map(c => '<button class="chip ' + (f === c[0] ? 'on' : '') + '" data-act="filter" data-f="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>';
  html += '<div class="note small">Answers from the ' + monthName(iss.month) + ' issue. Turn an offer into a task, or put a result on the agenda for ' + (nm ? fmt(nm.date) : 'the next meeting') + '.</div>';
  html += posts.map(p => {
    const rs = p.responses || []; const onAgenda = nm && nm.agenda.some(a => a.postId === p.id);
    let inner = '<div class="row between top"><div><div class="eyebrow">' + typeLabel(p.type) + '</div><div class="t" style="font-size:17px">' + esc(p.title) + '</div></div><span class="count num">' + rs.length + '</span></div>';
    if (p.type === 'help') inner += rs.length ? '<div class="list" style="margin-top:8px">' + rs.map(r => '<div class="item" style="padding:8px 0">' + av(r.by, 'sm') + '<div class="col grow"><div class="t small">' + esc(fullname(r.by)) + '</div>' + (r.text ? '<div class="s tiny">“' + esc(r.text) + '”</div>' : '') + '</div><button class="btn sm secondary" data-act="task-from" data-post="' + p.id + '" data-uid="' + r.by + '">Make a task</button></div>').join('') + '</div>' : '<div class="small muted" style="margin-top:6px">Nobody yet.</div>';
    else inner += '<div style="margin-top:8px">' + tally(p) + '</div>' + (rs.length ? '<div class="avs" style="margin-top:8px">' + rs.map(r => av(r.by, 'sm')).join('') + '</div>' : '');
    inner += '<div class="btnrow" style="margin-top:10px">' + (onAgenda ? '<span class="pill moss">On the agenda</span>' : '<button class="btn sm" data-act="agenda-add-post" data-post="' + p.id + '">Put on the agenda</button>') + (p.type === 'help' && rs.length > 1 ? '<button class="btn sm secondary" data-act="task-from-all" data-post="' + p.id + '">Task for everyone who offered</button>' : '') + '</div>';
    return '<div class="card">' + inner + '</div>';
  }).join('');
  return html;
}

function draftLocal() {
  const d = draftIssue(); const mine = d ? d.posts.filter(p => p.submittedBy === S.me) : [];
  let html = '<div class="card"><div class="eyebrow">Next issue</div><h3 class="h3" style="margin:4px 0 6px">' + (d ? monthName(d.month) : '') + '</h3><div class="small muted">Comes out on the 1st, once every committee member has approved it. Send in an article, a notice, a question for a poll, or a call for help.</div><button class="btn block" style="margin-top:12px" data-act="post-form">Send something in</button></div>';
  html += section('Yours', mine.length ? '<div class="card pad-0"><div class="list">' + mine.map(p => '<button class="item tap" data-act="' + (p.status === 'returned' ? 'edit-post' : 'post-peek') + '" data-id="' + p.id + '"><div class="col grow"><div class="t">' + esc(p.title) + '</div><div class="s">' + typeLabel(p.type) + ' · ' + (p.status === 'returned' ? 'Came back: “' + esc(p.returnNote) + '”' : postApproved(p) ? 'Approved. In the next issue.' : 'With the committee · ' + Object.values(p.approvals || {}).filter(v => v).length + ' of ' + approvers().length + ' have said yes') + '</div></div>' + (p.status === 'returned' ? '<span class="pill rust">Returned</span>' : postApproved(p) ? '<span class="pill moss">In</span>' : '<span class="pill">Waiting</span>') + '</button>').join('') + '</div></div>' : empty('Nothing sent in yet.'));
  return html;
}
function draftCommittee() {
  const d = draftIssue(); if (!d) return empty('No draft.');
  const publishDate = d.month + '-01'; const days = daysBetween(TODAY, publishDate);
  const approved = d.posts.filter(p => postApproved(p)), waitingP = d.posts.filter(p => !postApproved(p) && p.status !== 'returned'), returned = d.posts.filter(p => p.status === 'returned');
  const missing = {}; waitingP.forEach(p => approvers().forEach(a => { if (!(p.approvals && a in p.approvals)) missing[a] = (missing[a] || 0) + 1; }));
  let html = '<div class="card ' + (waitingP.length ? 'warn' : '') + '"><div class="row between top"><div><div class="eyebrow">' + monthName(d.month) + ' issue</div><h3 class="h3" style="margin-top:3px">' + (days > 0 ? 'Publishes ' + fmt(publishDate) + ' · in ' + days + ' days' : 'Ready to publish') + '</h3></div><span class="count num">' + approved.length + '/' + d.posts.length + '</span></div>' +
    '<div class="small muted" style="margin-top:6px">' + ruleLabel() + '. ' + (waitingP.length ? waitingP.length + ' item' + (waitingP.length === 1 ? '' : 's') + ' not yet approved' + (Object.keys(missing).length ? ' · missing: ' + Object.entries(missing).map(e => first(e[0]) + ' (' + e[1] + ')').join(', ') : '') + '.' : 'Everything is approved.') + '</div>' +
    '<div class="btnrow" style="margin-top:10px">' + Object.keys(missing).filter(a => a !== S.me).map(a => '<button class="btn sm secondary" data-act="nudge" data-uid="' + a + '">Nudge ' + esc(first(a)) + '</button>').join('') + '<button class="btn sm moss" data-act="publish" ' + (approved.length ? '' : 'disabled') + '>Publish now' + (waitingP.length ? ' (' + waitingP.length + ' roll over)' : '') + '</button></div></div>';
  html += '<div class="btnrow"><button class="btn" data-act="post-form">Write a post</button><button class="btn secondary" data-act="suggest-posts">Suggest from the app</button></div>';
  const item = p => '<button class="item tap" data-act="post-review" data-id="' + p.id + '"><div class="col grow"><div class="t">' + esc(p.title) + '</div><div class="s">' + typeLabel(p.type) + ' · ' + sourceLabel(p) + (p.status === 'returned' ? ' · returned: “' + esc(p.returnNote) + '”' : '') + '</div></div>' + approvalDots(p) + '</button>';
  if (waitingP.length) html += section('Needs approval', '<div class="card pad-0"><div class="list">' + waitingP.map(item).join('') + '</div></div>');
  if (approved.length) html += section('Approved, going in', '<div class="card pad-0"><div class="list">' + approved.map(item).join('') + '</div></div>');
  if (returned.length) html += section('Sent back to the writer', '<div class="card pad-0"><div class="list">' + returned.map(item).join('') + '</div></div>');
  return html;
}
function postReview(id) {
  const d = draftIssue(); const p = d.posts.find(x => x.id === id); if (!p) return;
  const myVote = p.approvals ? p.approvals[S.me] : undefined; const amApprover = approvers().includes(S.me);
  let html = '<div class="row wrap"><span class="pill">' + typeLabel(p.type) + '</span><span class="small faint">' + sourceLabel(p) + (p.createdAt ? ' · ' + fmt(p.createdAt) : '') + '</span></div><h2>' + esc(p.title) + '</h2><p>' + esc(p.body) + '</p>';
  if (images(p).length) html += figure(p, 'all');
  if (p.options) html += '<div class="opts">' + p.options.map(o => '<div class="opt"><span class="k"></span>' + esc(o) + '</div>').join('') + '</div>' + (p.allowNotes ? '<div class="small faint">Notes are on: people can say why.</div>' : '');
  html += '<div class="card"><div class="row between"><div class="t small">Approval · ' + ruleLabel().toLowerCase() + '</div>' + approvalDots(p) + '</div>' + (postApproved(p) ? '<div class="small" style="color:var(--moss);margin-top:6px">Approved. It goes in the ' + monthName(d.month) + ' issue.</div>' : p.status === 'returned' ? '<div class="small muted" style="margin-top:6px">Returned to the writer: “' + esc(p.returnNote) + '”</div>' : '<div class="small muted" style="margin-top:6px">Not yet approved. It rolls to the month after if it is still waiting on publish day.</div>') + '</div>';
  if (amApprover && p.status !== 'returned') {
    if (myVote === true) html += '<div class="note moss">You said yes.</div>';
    html += '<div class="btnrow">' + (myVote !== true ? '<button class="btn moss" data-act="post-vote" data-id="' + p.id + '" data-v="yes">Yes, print it</button>' : '') + '<button class="btn secondary" data-act="edit-post" data-id="' + p.id + '">Edit</button><button class="btn danger" data-act="post-return-form" data-id="' + p.id + '">Send it back</button></div>';
    html += '<div class="small faint">Editing clears everyone’s yes so they see the new version. Sending it back needs a reason the writer will read.</div>';
  } else if (p.status === 'returned' && (p.submittedBy === S.me || p.author === S.me)) html += '<button class="btn block" data-act="edit-post" data-id="' + p.id + '">Edit and send again</button>';
  html += '<button class="btn block ghost" data-act="post-remove" data-id="' + p.id + '">Remove from the draft</button>';
  sheet(html);
}
function postReturnForm(id) {
  const p = draftIssue().posts.find(x => x.id === id);
  sheet('<h2>Send “' + esc(p.title) + '” back</h2><div class="form">' + field('f-why', 'Why, and what would make it printable', 'textarea', '', { placeholder: 'Required. ' + first(p.submittedBy || p.author) + ' will read this.' }) + '</div><div class="btnrow"><button class="btn secondary" data-act="post-review" data-id="' + id + '">Back</button><button class="btn danger" data-act="post-return" data-id="' + id + '">Send it back</button></div>');
}
function postForm(id) {
  const d = draftIssue(); const p = id ? d.posts.find(x => x.id === id) : {};
  R.pendingImages = images(p).slice(); R.allowNotes = !!p.allowNotes;
  const types = isC() ? [['article', 'Article'], ['notice', 'Notice'], ['help', 'Call for help'], ['poll', 'Poll (just a feel for it)'], ['vote', 'Vote (a decision)']] : [['article', 'Article or story'], ['notice', 'Notice'], ['help', 'Call for help'], ['poll', 'A question for everyone']];
  sheet('<h2>' + (id ? 'Edit the post' : isC() ? 'Write a post' : 'Send something in') + '</h2><div class="small muted">For the ' + monthName(d.month) + ' issue.' + (isC() ? '' : ' The committee reads it first. If they change it or send it back, you will see why.') + '</div><div class="form">' + field('f-type', 'What kind', 'select', p.type || 'article', { options: types }) + field('f-title', 'Title', 'text', p.title) + field('f-body', 'The post', 'textarea', p.body, { placeholder: 'Plain words. Say when and where if it matters. A blank line starts a new paragraph.' }) + field('f-opts', 'Choices, one per line (polls and votes)', 'textarea', (p.options || []).join('\n'), { placeholder: 'Yes\nNo' }) +
    (isC() ? '<button class="toggle ' + (R.allowNotes ? 'on' : '') + '" id="f-notes" data-act="toggle-notes"><span><b>Let people add a note to their answer</b><div class="small muted">Off unless you switch it on. For polls and votes.</div></span><span class="sw"></span></button>' : '') +
    (isC() ? '<div class="field"><label for="f-image">Pictures (they print in green, like the rest)</label><input id="f-image" type="file" accept="image/*" multiple><div class="hint">Optional. Photos from the town, a scan, a drawing. Add a caption to each below.</div></div><div id="f-image-preview">' + imagePreviews() + '</div>' : '') +
    '</div><div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn" data-act="post-save" data-id="' + (id || '') + '">' + (id ? 'Save' : isC() ? 'Add to the draft' : 'Send to the committee') + '</button></div>');
}
function imagePreviews() {
  return (R.pendingImages || []).map((im, i) => '<div class="row top" style="margin-bottom:8px"><div class="figure" style="margin:0;width:90px;flex:none"><div class="duo"><img src="' + im.src + '" alt=""></div></div><div class="col grow"><input class="well" id="f-cap-' + i + '" placeholder="Caption" value="' + esc(im.caption || '') + '"><button class="linkish" data-act="image-clear" data-i="' + i + '" style="align-self:flex-start">Take it out</button></div></div>').join('');
}
function readCaptions() { (R.pendingImages || []).forEach((im, i) => { const el = $('#f-cap-' + i); if (el) im.caption = el.value.trim(); }); }
function shrinkImage(file, cb) {
  const rd = new FileReader();
  rd.onload = () => { const img = new Image(); img.onload = () => { const max = 1000; const sc = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', .78)); }; img.src = rd.result; };
  rd.readAsDataURL(file);
}
function postSave(id) {
  const d = draftIssue(); const title = need('f-title', 'Give it a title'); if (!title) return; const body = need('f-body', 'Write something'); if (!body) return;
  const type = val('f-type'); const opts = val('f-opts').split('\n').map(s => s.trim()).filter(Boolean);
  if ((type === 'poll' || type === 'vote') && opts.length < 2) { $('#f-opts-err').textContent = 'Give at least two choices.'; return; }
  readCaptions();
  const extra = isC() ? { images: (R.pendingImages || []).slice(), allowNotes: !!R.allowNotes } : {};
  if (id) { const p = d.posts.find(x => x.id === id); Object.assign(p, { title, body, type, options: opts.length ? opts : undefined }, extra); if (isC()) { delete p.image; delete p.imageCaption; } p.approvals = {}; p.status = 'proposed'; delete p.returnNote; if (isC()) p.approvals[S.me] = true; toast(isC() ? 'Saved. Everyone needs to say yes again.' : 'Sent again'); }
  else { d.posts.push(Object.assign({ id: uid('d'), type, title, body, options: opts.length ? opts : undefined, author: isC() ? S.me : committee()[0].id, source: isC() ? 'committee' : 'local', submittedBy: isC() ? undefined : S.me, approvals: isC() ? { [S.me]: true } : {}, status: 'proposed', createdAt: TODAY }, extra)); toast(isC() ? 'In the draft' : 'Sent to the committee'); }
  save(); closeSheet(); rerender();
}
function suggestPosts() {
  const d = draftIssue(); let n = 0;
  const open = S.fundraisers.filter(f => f.status === 'open');
  open.forEach(f => { if (!d.posts.some(p => p.source === 'auto' && p.autoKey === 'fund-' + f.id)) { d.posts.push({ id: uid('d'), autoKey: 'fund-' + f.id, type: 'article', title: f.title + ': where the fund stands', body: eur(f.raised) + ' raised so far from ' + f.donors + ' people, towards ' + eur(f.goal) + '. Spent so far: ' + eur(f.raised - fundBalance(f)) + '. Every receipt is listed in the app.', author: S.me, source: 'auto', approvals: {}, status: 'proposed', createdAt: TODAY }); n++; } });
  const evs = S.events.filter(e => e.date.slice(0, 7) === d.month && e.kind !== 'training-private');
  if (evs.length && !d.posts.some(p => p.autoKey === 'cal-' + d.month)) { d.posts.push({ id: uid('d'), autoKey: 'cal-' + d.month, type: 'notice', title: monthName(d.month).split(' ')[0] + ' calendar', body: evs.map(e => e.title + ', ' + fmt(e.date) + ' at ' + fmtTime(e.time) + (e.place ? ' in ' + e.place : '')).join('. ') + '.', author: S.me, source: 'auto', approvals: {}, status: 'proposed', createdAt: TODAY }); n++; }
  const lm = lastMeeting();
  if (lm && lm.minutes && !d.posts.some(p => p.autoKey === 'min-' + lm.id)) { d.posts.push({ id: uid('d'), autoKey: 'min-' + lm.id, type: 'article', title: 'From the meeting on ' + fmt(lm.date), body: lm.minutes + ' ' + lm.attendance.length + ' people came.', author: S.me, source: 'auto', approvals: {}, status: 'proposed', createdAt: TODAY }); n++; }
  save(); rerender(); toast(n ? n + ' suggestion' + (n === 1 ? '' : 's') + ' added for the committee to approve' : 'Nothing new to suggest');
}
function publishIssue() {
  const d = draftIssue(); const approved = d.posts.filter(postApproved), rest = d.posts.filter(p => !postApproved(p));
  d.posts = approved; d.status = 'published'; d.publishedAt = TODAY;
  const nextMonth = addMonths(d.month, 1);
  S.issues.push({ id: 'iss-' + nextMonth, month: nextMonth, status: 'draft', posts: rest.map(p => Object.assign(p, { rolled: true })) });
  save(); R.seg.news = 'issue'; render(); toast('Published. ' + (rest.length ? rest.length + ' unapproved item' + (rest.length === 1 ? '' : 's') + ' moved to ' + monthName(nextMonth) : 'Nothing left over.'));
}

// ---------- MEETING PREP ----------
function prepSheet(id) {
  const m = S.meetings.find(x => x.id === id); const e = ev(m.eventId); const past = m.date < TODAY;
  const iss = currentIssue(); const q = deskQueue(); const lm = S.meetings.filter(x => x.date < m.date).sort((a, b) => a.date < b.date ? 1 : -1)[0];
  let html = '<div class="eyebrow">' + (past ? 'Meeting held' : 'Prepare the meeting') + '</div><h2>' + fmtLong(m.date) + ', ' + fmtTime(e.time) + '</h2>';
  if (!past) html += '<div class="btnrow"><button class="btn secondary" data-act="poster-form" data-id="' + m.id + '">The poster</button><button class="btn" data-act="run" data-id="' + m.id + '">Run the meeting</button></div>';
  html += '<div class="card"><div class="row between"><div class="t">Agenda' + (m.shared ? ' <span class="pill moss">Shared with the town</span>' : '') + '</div><span class="small faint">' + m.agenda.length + (m.agenda.length === 1 ? ' item' : ' items') + '</span></div>' + (m.agenda.length ? '<ul class="agenda">' + m.agenda.map((a, i) => '<li class="row between"><span>' + (i + 1) + '. ' + esc(a.text) + '</span><span class="row" style="gap:4px"><button class="btn sm ghost" data-act="task-form-text" data-text="' + esc(a.text) + '" title="Make a task">Delegate</button><button class="btn sm ghost" data-act="agenda-remove" data-mid="' + m.id + '" data-aid="' + a.id + '" aria-label="Remove">×</button></span></li>').join('') + '</ul>' : '<div class="small muted">Empty. Add from the suggestions below or write your own.</div>') +
    '<div class="form" style="margin-top:10px"><div class="row"><input id="f-agenda" placeholder="Add an item" style="flex:1;border:1px solid var(--line-strong);background:var(--surface);border-radius:10px;padding:9px 12px"><button class="btn sm" data-act="agenda-add" data-mid="' + m.id + '">Add</button></div></div>' + (!past && !m.shared ? '<button class="btn block secondary sm" style="margin-top:8px" data-act="agenda-share" data-mid="' + m.id + '">Share the agenda with everyone</button>' : '') + '</div>';
  if (!past) {
    const sug = [];
    if (lm) sug.push({ text: 'Last time: ' + lm.attendance.length + ' came. ' + (lm.minutes ? lm.minutes.slice(0, 60) + '…' : ''), key: 'last' });
    if (iss) iss.posts.filter(p => ['help', 'poll', 'vote'].includes(p.type)).forEach(p => { const n = (p.responses || []).length; if (p.type === 'help') sug.push({ text: p.title + ': ' + n + ' offered to help', key: p.id, postId: p.id }); else { const c = p.options.map((o, i) => o + ' ' + (p.responses || []).filter(r => r.choice === i).length); sug.push({ text: p.title + ' (' + c.join(', ') + ')', key: p.id, postId: p.id }); } });
    if (q.requests.length) sug.push({ text: q.requests.length + ' calendar request' + (q.requests.length === 1 ? '' : 's') + ' waiting: ' + q.requests.map(r => r.draft.title).join(', '), key: 'req' });
    if (q.declined.length || q.unassigned.length) sug.push({ text: 'Tasks with nobody on them: ' + q.declined.concat(q.unassigned).map(t => t.title).join('; '), key: 'tasks' });
    S.fundraisers.filter(f => f.status === 'open').forEach(f => sug.push({ text: f.title + ' fund: ' + eur(f.raised) + ' of ' + eur(f.goal) + ', ' + eur(fundBalance(f)) + ' in hand', key: 'fund-' + f.id }));
    if (q.join.length) sug.push({ text: 'New members to welcome: ' + q.join.map(j => j.name).join(', '), key: 'join' });
    const d = draftIssue(); if (d) { const w = d.posts.filter(p => !postApproved(p) && p.status !== 'returned'); if (w.length) sug.push({ text: 'Newsletter items still waiting for approval: ' + w.map(p => p.title).join('; '), key: 'news' }); }
    const left = sug.filter(s => !m.agenda.some(a => a.key === s.key));
    html += '<div class="card"><div class="t">Suggested from the month</div><div class="small muted">Built from the newsletter answers, the calendar queue, the rota and the fund.</div>' + (left.length ? '<div class="list" style="margin-top:8px">' + left.map(s => '<div class="item" style="padding:8px 0"><div class="col grow small">' + esc(s.text) + '</div><button class="btn sm secondary" data-act="agenda-add-sug" data-mid="' + m.id + '" data-key="' + esc(s.key) + '" data-post="' + (s.postId || '') + '" data-text="' + esc(s.text) + '">Add</button></div>').join('') + '</div>' : '<div class="small muted" style="margin-top:8px">Everything is on the agenda.</div>') + '</div>';
    html += '<div class="card"><div class="row between"><div><div class="t">At the door</div><div class="small muted">' + m.attendance.length + ' scanned in so far</div></div><button class="btn sm gorse" data-act="scan">Scan</button></div></div>';
  } else {
    html += '<div class="card"><div class="t">' + m.attendance.length + ' came</div><div class="small muted">' + (m.attendance.length ? m.attendance.map(fullname).join(', ') : 'Nobody was scanned in.') + '</div></div>';
    html += '<div class="card"><div class="form">' + field('f-minutes', 'The minutes', 'textarea', m.minutes, { placeholder: 'What was decided. Run the meeting writes these for you from the agenda.' }) + '</div><button class="btn block" style="margin-top:8px" data-act="minutes-save" data-mid="' + m.id + '">Save</button></div>';
  }
  sheet(html);
}

// ---------- ME ----------
SCREENS.me = function () {
  const m = me(); const meetings = S.meetings.filter(x => x.date < TODAY).sort((a, b) => a.date < b.date ? 1 : -1);
  const came = meetings.filter(x => x.attendance.includes(m.id)).length;
  let html = '<div class="row" style="gap:14px">' + av(m.id, 'lg ring') + '<div class="col grow" style="gap:2px"><h1 class="h2">' + esc(m.name) + '</h1><div class="small muted">' + esc(m.street) + ', ' + esc(S.town.name) + ' · ' + esc(m.eircode) + (m.phone ? ' · ' + esc(phoneShown(m.phone)) : '') + '</div><div class="row wrap" style="margin-top:4px">' + (m.role === 'committee' ? '<span class="pill bog">Committee' + (m.title ? ' · ' + esc(m.title) : '') + '</span>' : '<span class="pill moss">Local</span>') + '<span class="pill">Since ' + monthName(m.since) + '</span></div></div></div>';
  html += section('Meetings', '<div class="card"><div class="row between"><div class="t">Came to ' + came + ' of ' + meetings.length + '</div></div>' + (meetings.length ? '<div class="list" style="margin-top:6px">' + meetings.map(x => '<div class="item" style="padding:8px 0"><div class="grow small">' + fmtLong(x.date) + '</div>' + (x.attendance.includes(m.id) ? '<span class="pill moss">Came</span>' : '<span class="pill">—</span>') + '</div>').join('') + '</div>' : '') + '</div>');
  let b2 = section('Training', '<div class="card pad-0"><div class="list">' + S.trainings.map(tr => { const st = m.training[tr.id] || {}; return '<button class="item tap" data-act="training" data-id="' + tr.id + '"><div class="col grow"><div class="t small">' + esc(tr.name) + '</div></div>' + (st.status === 'done' ? '<span class="pill moss">Done ' + fmt(st.date) + '</span>' : st.status === 'pending_verify' ? '<span class="pill gorse">Waiting</span>' : st.status === 'booked' ? '<span class="pill gorse">Booked</span>' : '<span class="pill">Not done</span>') + '</button>'; }).join('') + '</div></div>');
  b2 += section('The people of ' + S.town.name, '<div class="card pad-0"><div class="list"><button class="item tap" data-act="people"><div class="avs">' + S.users.filter(u => u.role !== 'pending').slice(0, 5).map(u => av(u.id, 'sm')).join('') + '</div><div class="col grow"><div class="t small">Everyone on the page</div><div class="s tiny">' + S.users.filter(u => u.role !== 'pending').length + ' people · names and streets' + (isC() ? ', and their records' : '') + '</div></div>' + chev + '</button></div></div>');
  let b3 = section('Your pages', '<div class="card"><div class="row between"><div><div class="t">' + esc(S.town.name) + '</div><div class="small muted">1 of 2. You can belong to two places at most.</div></div><button class="btn sm secondary" data-act="join-another">Join another</button></div></div>');
  b3 += section('The committee', '<div class="card pad-0"><div class="list">' + committee().map(c => '<button class="item tap" data-act="person" data-id="' + c.id + '">' + av(c.id, 'sm') + '<div class="col grow"><div class="t small">' + esc(c.name) + '</div><div class="s tiny">' + (c.title ? esc(c.title) + ' · ' : '') + 'since ' + monthName(c.since) + '</div></div>' + chev + '</button>').join('') + '</div></div><div class="small faint" style="margin-top:6px">The committee runs this page. Áit staff only step in if the guidelines are broken.</div>');
  let b4 = ''; if (isC()) b4 += section('Committee tools', '<div class="card pad-0"><div class="list"><button class="item tap" data-act="desk-go" data-to="join"><div class="grow">People waiting to join</div><span class="pill ' + (S.joinRequests.filter(j => j.status === 'pending').length ? 'rust' : '') + '">' + S.joinRequests.filter(j => j.status === 'pending').length + '</span></button><button class="item tap" data-act="add-local"><div class="grow">Add a local by hand</div>' + chev + '</button><button class="item tap" data-act="rules"><div class="grow">How the newsletter gets approved</div>' + chev + '</button><button class="item tap" data-act="colours"><div class="grow">Our colours and marks</div>' + chev + '</button><button class="item tap" data-act="scan"><div class="grow">Scan at the door</div>' + chev + '</button></div></div>');
  b4 += section('Prototype', '<div class="card pad-0"><div class="list"><button class="item tap" data-act="switch"><div class="grow">Be someone else</div>' + chev + '</button><button class="item tap" data-act="reset"><div class="grow">Put the sample town back the way it was</div>' + chev + '</button></div></div><div class="small faint" style="margin-top:6px">Everything you do is saved on this phone only. Nothing leaves it.</div>');
  return blk(html) + blk(b2) + blk(b3) + blk(b4);
};
function activityOf(u) {
  const out = [];
  S.tasks.filter(t => t.assignee === u.id && t.status === 'done').forEach(t => out.push({ k: 'Task done', t: t.title, d: t.due }));
  Object.entries(u.training).filter(([k, v]) => v.status === 'done').forEach(([k, v]) => out.push({ k: 'Trained', t: training(k) ? training(k).name : k, d: v.date }));
  S.requests.filter(r => r.by === u.id && ['approved', 'approved_edited', 'accepted'].includes(r.status)).forEach(r => out.push({ k: 'On the calendar', t: (r.final || r.draft).title, d: r.decidedAt }));
  S.issues.filter(i => i.status === 'published').forEach(i => i.posts.filter(p => p.submittedBy === u.id).forEach(p => out.push({ k: 'Printed', t: p.title + ' (' + monthName(i.month) + ')', d: i.publishedAt })));
  S.meetings.filter(mm => mm.date < TODAY && mm.attendance.includes(u.id)).forEach(mm => out.push({ k: 'Came to the meeting', t: fmtLong(mm.date), d: mm.date }));
  return out.sort((a, b) => (a.d || '') < (b.d || '') ? 1 : -1);
}
function peopleSheet(q) {
  const people = S.users.filter(u => u.role !== 'pending').sort((a, b) => (a.role === 'committee' ? 0 : 1) - (b.role === 'committee' ? 0 : 1) || a.name.localeCompare(b.name));
  const list = q ? people.filter(u => (u.name + ' ' + u.street).toLowerCase().includes(q.toLowerCase())) : people;
  sheet('<h2>The people of ' + esc(S.town.name) + '</h2><div class="small muted">' + people.length + ' on the page in this sample town. Everyone here lives here; the committee checked each address.' + (isC() ? ' Only the committee sees what people have done.' : '') + '</div><input class="well" id="f-q" placeholder="Find a name or a street" value="' + esc(q || '') + '" data-live="people">' +
    '<div class="card pad-0"><div class="list">' + (list.length ? list.map(u => '<button class="item tap" data-act="person" data-id="' + u.id + '">' + av(u.id, 'sm') + '<div class="col grow"><div class="t small">' + esc(u.name) + '</div><div class="s tiny">' + esc(u.street) + (u.role === 'committee' ? ' · Committee' + (u.title ? ', ' + esc(u.title) : '') : '') + '</div></div>' + chev + '</button>').join('') : '<div class="item small muted">Nobody by that name.</div>') + '</div></div>');
  if (q) { const el = $('#f-q'); el.focus(); el.setSelectionRange(q.length, q.length); }
}
function personSheet(id) {
  const u = user(id); if (!u) return; const self = u.id === S.me; const acts = activityOf(u);
  const meetings = S.meetings.filter(mm => mm.date < TODAY); const came = meetings.filter(mm => mm.attendance.includes(u.id)).length;
  let html = '<div class="row" style="gap:14px">' + av(u.id, 'lg') + '<div class="col grow" style="gap:2px"><h2 style="font-size:28px">' + esc(u.name) + '</h2><div class="small muted">' + esc(u.street) + ', ' + esc(S.town.name) + '</div><div class="row wrap" style="margin-top:4px">' + (u.role === 'committee' ? '<span class="pill bog">Committee' + (u.title ? ' · ' + esc(u.title) : '') + '</span>' : '<span class="pill moss">Local</span>') + '<span class="pill">Since ' + monthName(u.since) + '</span></div></div></div>';
  if (u.phone && (isC() || u.role === 'committee') && !self) html += '<button class="btn block secondary" data-act="ring" data-id="' + u.id + '">Ring ' + esc(first(u.id)) + ' · ' + esc(phoneShown(u.phone)) + '</button>';
  if (isC()) {
    html += '<div class="card"><div class="row between"><div class="t">' + (self ? 'Your record' : esc(first(u.id)) + '’s record') + '</div><span class="mono faint">committee only</span></div>' +
      (acts.length ? '<div class="list" style="margin-top:8px">' + acts.map(a => '<div class="item" style="padding:8px 0"><div class="col grow"><div class="t small">' + esc(a.t) + '</div><div class="s tiny"><span class="green">' + esc(a.k) + '</span>' + (a.d ? ' · ' + fmt(a.d) : '') + '</div></div></div>').join('') + '</div>' : '<div class="small muted" style="margin-top:8px">Nothing confirmed yet.</div>') + '</div>';
    html += '<div class="tiles"><div class="tile"><div class="count num">' + came + '/' + meetings.length + '</div><div class="small muted">meetings</div></div><div class="tile"><div class="count num">' + acts.filter(a => a.k === 'Task done').length + '</div><div class="small muted">tasks done</div></div></div>';
    html += '<div class="small faint">Only the committee sees records. ' + (self ? 'Yours included.' : esc(first(u.id)) + ' cannot see this page about themselves.') + '</div>';
  }
  html += '<div class="btnrow"><button class="btn secondary" data-act="people">All the people</button></div>';
  sheet(html);
}
function switchSheet() {
  sheet('<h2>Who are you?</h2><div class="small muted">Prototype only. In the real app you are one person, verified by address.</div><div class="card pad-0"><div class="list">' + S.users.map(u => '<button class="item tap" data-act="be" data-id="' + u.id + '">' + av(u.id, 'sm') + '<div class="col grow"><div class="t small">' + esc(u.name) + '</div><div class="s tiny">' + (u.role === 'committee' ? 'Committee' + (u.title ? ' · ' + u.title : '') : 'Local') + ' · ' + esc(u.street) + '</div></div>' + (u.id === S.me ? '<span class="pill moss">You</span>' : '') + '</button>').join('') + '</div></div>');
}

// ---------- QR + SCANNER ----------
function qrToken(uid_) { return 'clann:' + S.town.name.toLowerCase() + ':' + uid_ + ':' + Math.floor(Date.now() / 30000); }
function qrShort(uid_) { return (uid_.slice(0, 3).toUpperCase()) + '-' + String(Math.floor(Date.now() / 30000) % 1000).padStart(3, '0'); }
function qrSheet() {
  const m = me(); const nm = nextMeeting();
  sheet('<h2 style="text-align:center">' + esc(m.name) + '</h2><div class="qrwrap"><div class="qr" id="qr"></div><div class="code num">' + qrShort(m.id) + '</div><div class="small muted" style="margin-top:4px">' + (nm ? 'For the meeting on ' + fmt(nm.date) : 'No meeting coming up') + '. Show this to a committee member at the door and you are marked in.</div></div><div class="note small">The code changes every 30 seconds, so a photo of it will not work later.</div>');
  drawQR();
  R.qrTimer = setInterval(() => { if (!$('#qr')) { clearInterval(R.qrTimer); return; } drawQR(); const c = $('.qrwrap .code'); if (c) c.textContent = qrShort(me().id); }, 30000);
}
function drawQR() {
  const el = $('#qr'); if (!el) return; el.innerHTML = '';
  if (window.QRCode) new window.QRCode(el, { text: qrToken(me().id), width: 200, height: 200, colorDark: '#17352a', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
  else el.innerHTML = '<div class="small muted" style="width:200px;text-align:center">QR drawing needs the internet. Use the code below.</div>';
}
function scanSheet() {
  const nm = nextMeeting(); if (!nm) { toast('No meeting coming up'); return; }
  const here = nm.attendance;
  let html = '<h2>At the door</h2><div class="small muted">' + fmtLong(nm.date) + ' · ' + here.length + ' in so far</div>';
  html += '<div class="scanner" id="scanner"><video id="cam" playsinline muted></video><div class="frame"></div><div class="nocam" id="nocam">Starting the camera…</div></div>';
  html += '<div class="row"><input id="f-code" placeholder="Or type the code, e.g. TOM-421" style="flex:1;border:1px solid var(--line-strong);background:var(--surface);border-radius:10px;padding:9px 12px;text-transform:uppercase"><button class="btn sm" data-act="scan-code">Check in</button></div>';
  html += '<div class="card pad-0"><div class="list"><div class="item" style="background:var(--surface-2)"><div class="t small">Tap a name to check them in by hand</div></div>' + S.users.filter(u => u.role !== 'pending').map(u => '<button class="item tap" data-act="scan-tap" data-id="' + u.id + '">' + av(u.id, 'sm') + '<div class="grow small">' + esc(u.name) + '</div>' + (here.includes(u.id) ? '<span class="pill moss">In</span>' : '') + '</button>').join('') + '</div></div>';
  sheet(html);
  startCam();
}
function startCam() {
  const video = $('#cam'), nocam = $('#nocam'); if (!video) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { nocam.textContent = 'No camera here. Type the code or tap a name.'; return; }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(stream => {
    video.srcObject = stream; video.play(); nocam.hidden = true;
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); let live = true, last = '';
    camStop = () => { live = false; stream.getTracks().forEach(t => t.stop()); };
    const tick = () => { if (!live) return; if (video.readyState === 4 && window.jsQR) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; ctx.drawImage(video, 0, 0); const img = ctx.getImageData(0, 0, canvas.width, canvas.height); const r = window.jsQR(img.data, img.width, img.height); if (r && r.data && r.data !== last) { last = r.data; checkInToken(r.data); setTimeout(() => { last = ''; }, 3000); } } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }).catch(() => { nocam.textContent = 'The camera is not allowed here. Type the code or tap a name.'; });
}
function checkInToken(txt) {
  const parts = String(txt).split(':'); if (parts[0] !== 'clann' || parts.length < 4) { toast('Not an Áit code'); return; }
  const u = user(parts[2]); if (!u) { toast('Unknown person'); return; }
  const win = Number(parts[3]); if (Math.abs(Math.floor(Date.now() / 30000) - win) > 2) { toast('That code is out of date. Ask them to open it again.'); return; }
  checkIn(u.id);
}
function checkIn(id) {
  const nm = nextMeeting(); if (!nm) return;
  if (nm.attendance.includes(id)) { toast(first(id) + ' is already in'); return; }
  nm.attendance.push(id); save(); toast(first(id) + ' checked in'); scanSheet();
}

// ---------- FUND ----------
function fundSheet(id) {
  const f = S.fundraisers.find(x => x.id === id); const spent = f.raised - fundBalance(f); const pct = Math.min(100, Math.round(f.raised / f.goal * 100));
  let html = '<div class="eyebrow">Fund' + (f.status === 'closed' ? ' · closed' : ' · open since ' + fmt(f.opened)) + '</div><h2>' + esc(f.title) + '</h2><p class="small muted">' + esc(f.why) + '</p>';
  html += '<div class="card"><div class="row between"><span class="count num">' + eur(f.raised) + '</span><span class="small muted">of ' + eur(f.goal) + '</span></div><div class="bar" style="margin:8px 0"><i style="width:' + pct + '%"></i></div><div class="row between small muted"><span>' + f.donors + ' people gave</span><span>' + pct + '%</span></div></div>';
  html += '<div class="tiles"><div class="tile"><div class="count num">' + eur(spent) + '</div><div class="small muted">spent, with receipts</div></div><div class="tile"><div class="count num">' + eur(fundBalance(f)) + '</div><div class="small muted">in hand</div></div></div>';
  html += '<div class="card"><div class="t">Every spend</div><div class="ledger" style="margin-top:6px">' + (f.spends.length ? f.spends.map(s => '<div class="r"><span>' + esc(s.desc) + '</span><span class="num">' + eur(s.amount) + '</span><span class="rc">' + fmt(s.date) + ' · ' + esc(s.receipt) + ' · entered by ' + esc(first(s.by)) + '</span></div>').join('') : '<div class="small muted">Nothing spent yet.</div>') + '</div></div>';
  if (f.status === 'open') html += '<div class="btnrow"><button class="btn gorse" data-act="give-form" data-id="' + f.id + '">Give</button>' + (isC() ? '<button class="btn secondary" data-act="spend-form" data-id="' + f.id + '">Record a spend</button><button class="btn ghost" data-act="fund-close" data-id="' + f.id + '">Close</button>' : '') + '</div>';
  html += '<div class="small faint">Everyone sees the total and every spend. Nobody sees who gave what.</div>';
  sheet(html);
}
function giveForm(id) {
  sheet('<h2>Give to the ' + esc(S.fundraisers.find(x => x.id === id).title.toLowerCase()) + '</h2><div class="small muted">Prototype: no real money moves. In the real app this goes through a card payment and the committee never sees your card.</div><div class="chips">' + [5, 10, 20, 50].map(n => '<button class="chip" data-act="give-pick" data-n="' + n + '">€' + n + '</button>').join('') + '</div><div class="field"><label for="f-amount">Euro</label><div class="stepper"><button data-act="give-step" data-k="-5" aria-label="Less">−</button><input id="f-amount" type="number" min="1" value="20"><button data-act="give-step" data-k="5" aria-label="More">+</button></div><div class="err" id="f-amount-err"></div></div><div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn moss" data-act="give" data-id="' + id + '">Give</button></div>');
}
function spendForm(id) {
  sheet('<h2>Record a spend</h2><div class="form">' + field('f-desc', 'What', 'text', '') + '<div class="two">' + field('f-amount', 'Euro', 'number', '', { min: 0 }) + field('f-date', 'Date', 'date', TODAY) + '</div>' + field('f-receipt', 'Receipt or invoice', 'text', '', { placeholder: 'Number and who from. Everyone will see this.' }) + '</div><div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn" data-act="spend-save" data-id="' + id + '">Record it</button></div>');
}
function fundForm() {
  sheet('<h2>Start a fund</h2><div class="form">' + field('f-title', 'For what', 'text', '') + field('f-goal', 'Target in euro', 'number', '', { min: 1 }) + field('f-why', 'Why, in plain words', 'textarea', '', { placeholder: 'What the money does and what happens if you go over.' }) + '</div><div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn" data-act="fund-save">Open it</button></div>');
}

// ---------- JOINING + RULES ----------
function joinSheet(id) {
  const j = S.joinRequests.find(x => x.id === id); const cs = committee();
  let html = '<span class="pill sky">' + (j.manual ? 'Added by hand' : 'Wants to join') + '</span><h2>' + esc(j.name) + '</h2><div class="kv"><b>Address</b><span>' + esc(j.street) + (j.eircode ? ', ' + esc(j.eircode) : '') + '</span><b>Proof</b><span>' + (j.proof ? esc(j.proof) + ' <span class="pill moss">photo attached</span>' : 'None. Proposed by ' + esc(first(j.proposedBy))) + '</span><b>Asked</b><span>' + fmt(j.createdAt) + '</span></div>';
  if (j.manual) {
    html += '<div class="card"><div class="t small">Every committee member has to say yes</div><div class="approvals" style="margin-top:6px">' + cs.map(c => '<span class="a ' + (j.votes[c.id] ? 'yes' : '') + (c.id === S.me ? ' me' : '') + '">' + initials(c.name) + '</span>').join('') + '</div><div class="small muted" style="margin-top:6px">' + Object.keys(j.votes).length + ' of ' + cs.length + ' so far. They are let in the moment the last yes lands.</div></div>';
    html += '<div class="btnrow">' + (j.votes[S.me] ? '<span class="pill moss">You said yes</span>' : '<button class="btn moss" data-act="join-vote" data-id="' + j.id + '">Yes, let them in</button>') + '<button class="btn danger" data-act="join-decline" data-id="' + j.id + '">No</button></div>';
  } else html += '<div class="btnrow"><button class="btn moss" data-act="join-ok" data-id="' + j.id + '">Let them in</button><button class="btn danger" data-act="join-decline" data-id="' + j.id + '">No</button></div><div class="small faint">Check the proof matches the address. One member can let a verified person in.</div>';
  sheet(html);
}
function joinList() {
  const js = S.joinRequests.filter(j => j.status === 'pending');
  sheet('<h2>Waiting to join</h2>' + (js.length ? '<div class="card pad-0"><div class="list">' + js.map(j => '<button class="item tap" data-act="join" data-id="' + j.id + '"><div class="col grow"><div class="t">' + esc(j.name) + '</div><div class="s">' + (j.manual ? 'By hand · ' + Object.keys(j.votes).length + ' of ' + committee().length + ' yes' : esc(j.street) + ' · ' + esc(j.proof)) + '</div></div>' + chev + '</button>').join('') + '</div></div>' : empty('Nobody waiting.')) + '<button class="btn block secondary" data-act="add-local">Add a local by hand</button>');
}
function addLocalForm() {
  sheet('<h2>Add a local by hand</h2><div class="small muted">For someone with no bill in their name, or no post. Every committee member has to say yes before they are in.</div><div class="form">' + field('f-name', 'Name', 'text', '') + field('f-street', 'Where they live', 'text', '') + field('f-why', 'Why there is no proof', 'textarea', '') + '</div><div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn" data-act="add-local-save">Propose them</button></div>');
}
function rulesSheet() {
  const r = S.town.rules; const cs = committee();
  sheet('<h2>How the newsletter gets approved</h2><div class="radios">' + [['all', 'Every committee member must say yes', 'Slowest, safest. One quiet member holds everything.'], ['majority', 'A majority of the committee', 'Still needs most of you. Nothing goes out on one person’s say-so.'], ['subcommittee', 'A newsletter sub-committee', 'Pick who. Every one of them must say yes.']].map(o => '<button class="radio ' + (r.newsletterApproval === o[0] ? 'on' : '') + '" data-act="rule-pick" data-v="' + o[0] + '"><span class="mark"></span><span><b>' + o[1] + '</b><div class="small muted">' + o[2] + '</div></span></button>').join('') + '</div>' +
    (r.newsletterApproval === 'subcommittee' ? '<div class="card"><div class="t small">Who is on it</div><div class="chips" style="margin-top:6px">' + cs.map(c => '<button class="chip ' + (r.subcommittee.includes(c.id) ? 'on' : '') + '" data-act="sub-toggle" data-id="' + c.id + '">' + esc(first(c.id)) + '</button>').join('') + '</div></div>' : '') +
    '<div class="small faint">Publish day is always the 1st. Whatever is not approved by then waits for the month after. Nothing goes out half-approved.</div>');
}


// ---------- THE POSTER ----------
function posterForm(id) {
  const m = S.meetings.find(x => x.id === id); const e = ev(m.eventId); const p = m.poster || { after: [] };
  R.posterImage = p.image || null;
  sheet('<div class="eyebrow">The meeting on ' + fmt(m.date) + '</div><h2>The poster</h2><div class="small muted">What locals see first. Make them want to come. The time and place come from the calendar.</div><div class="form">' +
    field('f-headline', 'Headline', 'text', p.headline, { placeholder: 'What this night is' }) + field('f-line', 'A line under it', 'text', p.line) +
    field('f-after', 'After the business, one per line', 'textarea', (p.after || []).map(a => a.text).join('\n'), { placeholder: 'Music from…\nTea and sandwiches\nA talk by…', hint: 'Each line gets a little mark: music, food, a talk, a game. The app picks it from the words.' }) +
    '<div class="field"><label for="f-poster-image">A picture</label><input id="f-poster-image" type="file" accept="image/*"><div class="hint">Optional. Prints in the town colour.</div></div><div id="f-poster-preview">' + (R.posterImage ? '<div class="poster" style="padding:0"><div class="pic" style="margin:0;border:0"><img src="' + R.posterImage + '" alt=""></div></div><button class="linkish" data-act="poster-image-clear">Take it out</button>' : '') + '</div>' +
    '</div><div class="btnrow"><button class="btn secondary" data-act="close">Cancel</button><button class="btn" data-act="poster-save" data-id="' + m.id + '">Save the poster</button></div>');
}
function posterSave(id) {
  const m = S.meetings.find(x => x.id === id);
  const after = val('f-after').split('\n').map(x => x.trim()).filter(Boolean).map(text => ({ mark: afterMark(text), text }));
  m.poster = { headline: val('f-headline'), line: val('f-line'), after, image: R.posterImage || undefined, by: S.me, at: TODAY };
  save(); closeSheet(); rerender(); toast('Poster saved. Everyone sees it.');
}

// ---------- RUN THE MEETING ----------
function runSheet(id) {
  const m = S.meetings.find(x => x.id === id); m.run = m.run || { startedAt: TODAY, items: {} };
  let html = '<div class="row between"><div><div class="eyebrow">Running the meeting</div><h2>' + fmtLong(m.date) + '</h2></div><button class="btn sm gorse" data-act="scan">Door · ' + m.attendance.length + ' in</button></div>';
  html += '<div class="small muted">Tick each item as you get through it and write what was decided underneath. Finish turns it into the minutes.</div>';
  html += '<div>' + (m.agenda.length ? m.agenda.map((a, i) => { const r = m.run.items[a.id] || {}; return '<div class="runitem ' + (r.done ? 'done' : '') + '"><div class="head"><button class="tick" data-act="run-tick" data-mid="' + m.id + '" data-aid="' + a.id + '" aria-label="Done">' + (r.done ? '✓' : (i + 1)) + '</button><div class="grow"><div class="t">' + esc(a.text) + '</div><textarea id="run-' + a.id + '" placeholder="What was decided, who does what">' + esc(r.note || '') + '</textarea><div class="row" style="margin-top:6px"><button class="btn sm secondary" data-act="run-task" data-mid="' + m.id + '" data-aid="' + a.id + '">Make it a task</button></div></div></div></div>'; }).join('') : empty('No agenda yet. Add items in Prepare.')) + '</div>';
  html += '<div class="form"><div class="row"><input id="f-agenda" class="well" placeholder="Something that came up"><button class="btn sm" data-act="run-add" data-mid="' + m.id + '">Add</button></div></div>';
  html += '<div class="btnrow"><button class="btn secondary" data-act="prep" data-id="' + m.id + '">Prepare</button><button class="btn moss" data-act="run-finish" data-mid="' + m.id + '">Finish · write the minutes</button></div>';
  sheet(html); $('.sheet').classList.add('wide');
}
function readRun(m) { m.run = m.run || { startedAt: TODAY, items: {} }; m.agenda.forEach(a => { const el = $('#run-' + a.id); if (el) { m.run.items[a.id] = m.run.items[a.id] || {}; m.run.items[a.id].note = el.value.trim(); } }); }

// ---------- OUR COLOURS AND MARKS ----------
function coloursSheet() {
  const t = S.town; const cur = theme();
  let html = '<h2>Our colours and marks</h2><div class="small muted">The whole town sees these. Green and gold is the default. Add your own pairs and give them names: the club colours, Christmas, the regatta.</div>';
  html += '<div class="schemes">' + t.themes.map(x => '<button class="swb ' + (x.id === t.themeId ? 'on' : '') + '" data-act="theme-use" data-id="' + x.id + '"><span class="pair"><i style="background:' + esc(x.accent) + '"></i><i style="background:' + esc(x.second) + '"></i></span><span>' + esc(x.name) + (x.fixed ? '<br>default' : '') + '</span></button>').join('') + (t.themes.length < 6 ? '<button class="swb add" data-act="theme-form" aria-label="Add a colour pair">+</button>' : '') + '</div>';
  if (!cur.fixed) html += '<div class="row between"><span class="small muted">Using ' + esc(cur.name) + (t.themeBy ? ', chosen by ' + esc(first(t.themeBy)) + ' on ' + fmt(t.themeAt) : '') + '.</span><button class="linkish" data-act="theme-remove" data-id="' + cur.id + '">Remove this pair</button></div>';
  html += '<div class="section-head" style="margin-top:18px"><h2>Marks on the cover</h2><span class="eyebrow">up to three</span></div><div class="markgrid">' + Object.keys(MARKS).map(k => '<button class="mk ' + (t.marks.includes(k) ? 'on' : '') + '" data-act="mark-toggle" data-k="' + k + '" aria-label="' + MARKNAMES[k] + '" aria-pressed="' + t.marks.includes(k) + '">' + MARKS[k] + '</button>').join('') + '</div><div class="small faint">They print under the nameplate on every cover. Send us a drawing of your own and we will cut it as a mark.</div>';
  sheet(html);
}
function themeForm() {
  sheet('<h2>A colour pair of our own</h2><div class="form">' + field('f-name', 'Call it', 'text', '', { placeholder: 'Christmas, the club colours, the regatta…' }) + '<div class="two">' + field('f-accent', 'Main colour', 'color', '#7a1f2b') + field('f-second', 'Second colour', 'color', '#e2c45e') + '</div></div><div class="small muted">The main colour goes on buttons, links and the newsletter button, with white writing on it, so keep it dark. The second goes on the newsletter mark and the small flourishes.</div><div class="btnrow"><button class="btn secondary" data-act="colours">Back</button><button class="btn" data-act="theme-save">Save the pair</button></div>');
}
function tooLight(hex) { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.45; }


// ---------- SUPPORTS AND CRAIC: who the committee can call on ----------
function orgs() { return window.ORGS || []; }
const COST = { free: 'Free', grant: 'They fund', low: 'Under €200', mid: '€200 to €1,000', high: 'Over €1,000', ask: 'Ask' };
const COST_CLS = { free: 'moss', grant: 'gorse', low: '', mid: '', high: 'bog', ask: 'sky' };
function orgState() { if (!R.orgs) R.orgs = { kind: 'support', q: '', cat: '', cost: '', near: false }; return R.orgs; }
function townCounty() { return (S.town.county || '').replace(/^Co\.\s*/, ''); }
function orgMatches(o, st) {
  if (o.kind !== st.kind) return false;
  if (st.cat && o.category !== st.cat) return false;
  if (st.cost && o.cost !== st.cost) return false;
  if (st.near && !(o.reach === 'national' || o.based === townCounty() || (o.counties || []).includes(townCounty()))) return false;
  if (st.q) { const q = st.q.toLowerCase(); const hay = [o.name, o.category, o.offers, o.good_for, o.how, o.based, (o.tags || []).join(' '), (o.counties || []).join(' ')].join(' ').toLowerCase(); if (!q.split(/\s+/).every(w => hay.includes(w))) return false; }
  return true;
}
function orgsSheet() {
  const st = orgState(); const all = orgs().filter(o => o.kind === st.kind);
  const cats = [...new Set(all.map(o => o.category))].sort();
  const list = orgs().filter(o => orgMatches(o, st)).sort((a, b) => a.name.localeCompare(b.name));
  let html = '<h2>' + (st.kind === 'support' ? 'Ask for support' : 'Book the craic') + '</h2><div class="small muted">' + (st.kind === 'support' ? 'Charities, services and public bodies a place can call on. Nothing here costs the town unless it says so.' : 'People and groups who bring a night: music, tellers, shows, classes, walks. Prices are a guide; ask them.') + '</div>';
  html += '<div class="seg"><button class="' + (st.kind === 'support' ? 'on' : '') + '" data-act="orgs-kind" data-kind="support">Supports <span class="n">' + orgs().filter(o => o.kind === 'support').length + '</span></button><button class="' + (st.kind === 'craic' ? 'on' : '') + '" data-act="orgs-kind" data-kind="craic">Craic <span class="n">' + orgs().filter(o => o.kind === 'craic').length + '</span></button></div>';
  html += '<input class="well" id="f-orgq" placeholder="' + (st.kind === 'support' ? 'Try: loneliness, grant, first aid, water…' : 'Try: music, kids, storyteller, film, walk…') + '" value="' + esc(st.q) + '" data-live="orgs">';
  html += '<div class="field"><label for="f-cat">Kind of thing</label><select id="f-cat" data-change="orgs-cat"><option value="">Everything</option>' + cats.map(c => '<option value="' + esc(c) + '"' + (st.cat === c ? ' selected' : '') + '>' + esc(c) + ' (' + all.filter(o => o.category === c).length + ')</option>').join('') + '</select></div>';
  html += '<div class="chips">' + Object.keys(COST).map(k => '<button class="chip ' + (st.cost === k ? 'on' : '') + '" data-act="orgs-cost" data-cost="' + k + '">' + COST[k] + '</button>').join('') + '<button class="chip ' + (st.near ? 'on' : '') + '" data-act="orgs-near">Covers ' + esc(townCounty()) + '</button></div>';
  html += '<div class="row between"><span class="eyebrow">' + list.length + ' of ' + all.length + '</span>' + (st.q || st.cat || st.cost || st.near ? '<button class="linkish" data-act="orgs-clear">Clear</button>' : '') + '</div>';
  html += '<div class="card pad-0"><div class="list">' + (list.length ? list.slice(0, 60).map(o => '<button class="item tap" data-act="org" data-id="' + o.id + '"><div class="col grow"><div class="t">' + esc(o.name) + '</div><div class="s">' + esc(o.category) + ' · ' + (o.reach === 'national' ? 'all Ireland' : esc(o.based)) + '</div><div class="small muted" style="font-family:var(--serif);margin-top:3px">' + esc(o.offers.length > 110 ? o.offers.slice(0, 108).replace(/\s+\S*$/, '') + '…' : o.offers) + '</div></div><div class="right"><span class="pill ' + (COST_CLS[o.cost] || '') + '">' + COST[o.cost] + '</span></div></button>').join('') + (list.length > 60 ? '<div class="item small muted">Showing 60. Narrow it down.</div>' : '') : '<div class="item small muted">Nothing matches. Try fewer words.</div>') + '</div></div>';
  html += '<div class="small faint">' + orgs().length + ' organisations, all real, checked by machine on ' + esc((window.ORGS_CHECKED || '')) + 'the day the list was built. Confirm details with them before relying on this.</div>';
  sheet(html); $('.sheet').classList.add('wide');
  if (R.orgsFocus) { const el = $('#f-orgq'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } R.orgsFocus = false; }
}
function orgSheet(id) {
  const o = orgs().find(x => x.id === id); if (!o) return; const st = orgState();
  const prior = S.outreach.filter(x => x.orgId === o.id).sort((a, b) => a.at < b.at ? 1 : -1);
  let html = '<div class="row wrap"><span class="pill ' + (o.kind === 'support' ? 'bog' : 'moss') + '">' + (o.kind === 'support' ? 'Support' : 'Craic') + '</span><span class="pill">' + esc(o.category) + '</span><span class="pill ' + (COST_CLS[o.cost] || '') + '">' + COST[o.cost] + '</span></div><h2>' + esc(o.name) + '</h2><p>' + esc(o.offers) + '</p>';
  html += '<div class="kv">' + (o.good_for ? '<b>Good for</b><span>' + esc(o.good_for) + '</span>' : '') + '<b>How</b><span>' + esc(o.how) + '</span><b>Cost</b><span>' + COST[o.cost] + (o.cost_note ? ' · ' + esc(o.cost_note) : '') + '</span><b>Where</b><span>' + (o.reach === 'national' ? 'All of Ireland' : 'Based in ' + esc(o.based) + ((o.counties || []).length ? ' · ' + esc(o.counties.join(', ')) : '')) + '</span>' +
    (o.kind === 'craic' ? '<b>Crowd</b><span>' + { small: 'Small, under 40', medium: 'Medium, 40 to 200', any: 'Any size' }[o.crowd] + ' · ' + { indoor: 'indoors', outdoor: 'outdoors', either: 'indoors or out' }[o.setting] + '</span>' : '') +
    '<b>Lead time</b><span>' + { days: 'Days', weeks: 'A few weeks', months: 'Months. Plan ahead.' }[o.lead_time] + '</span>' + (o.irish ? '<b>Irish</b><span>Works through Irish</span>' : '') + (o.phone ? '<b>Phone</b><span class="tel">' + esc(o.phone) + '</span>' : '') + '</div>';
  if (o.note) html += '<div class="note gorse">' + esc(o.note) + '</div>';
  html += '<div class="btnrow"><a class="btn secondary" href="' + esc(o.website) + '" target="_blank" rel="noopener">Their website ↗</a><button class="btn moss" data-act="outreach-form" data-id="' + o.id + '">' + (o.kind === 'support' ? 'Ask for support' : 'Ask about a booking') + '</button></div>';
  if (prior.length) html += '<div class="card"><div class="t small">We have asked them before</div><div class="list" style="margin-top:6px">' + prior.map(x => '<div class="item" style="padding:8px 0"><div class="col grow"><div class="t small">' + esc(x.what) + '</div><div class="s tiny">' + esc(first(x.by)) + ' · ' + fmt(x.at) + (x.when ? ' · for ' + fmt(x.when) : '') + '</div></div><span class="pill ' + outreachCls(x.status) + '">' + outreachLabel(x.status) + '</span></div>').join('') + '</div></div>';
  html += '<div class="small faint">' + (o.web === 'ok' ? 'Website answered when checked.' : o.web === 'blocked' ? 'Website exists but refuses robots; open it yourself.' : 'Website did not answer when checked; confirm the address.') + ' Nobody has confirmed these details with them yet.</div>';
  html += '<div class="btnrow"><button class="btn secondary" data-act="orgs">Back to the list</button></div>';
  sheet(html);
}
function outreachLabel(st) { return { sent: 'Asked', replied: 'They replied', booked: 'Booked', done: 'Done', no: 'No' }[st] || st; }
function outreachCls(st) { return { sent: 'gorse', replied: '', booked: 'moss', done: 'moss', no: 'rust' }[st] || ''; }
function outreachForm(id) {
  const o = orgs().find(x => x.id === id);
  sheet('<div class="eyebrow">' + esc(o.name) + '</div><h2>' + (o.kind === 'support' ? 'Ask for support' : 'Ask about a booking') + '</h2><div class="form">' + field('f-what', o.kind === 'support' ? 'What we need' : 'What we have in mind', 'text', '', { placeholder: o.kind === 'support' ? 'A talk at the meeting, a grant for the hall…' : 'A session after the November meeting…' }) + field('f-when', 'For when (optional)', 'date', '') + field('f-note', 'The ask, in your own words', 'textarea', '', { placeholder: 'Who you are, where, how many people, what you can offer. Plain and short.' }) + '</div><div class="btnrow"><button class="btn secondary" data-act="org" data-id="' + o.id + '">Back</button><button class="btn moss" data-act="outreach-save" data-id="' + o.id + '">Send through Áit</button></div><div class="small faint">In the real app this goes to them with the town’s page attached, and their reply comes back here. In this prototype it is logged on this phone only.</div>');
}
function outreachList() {
  const list = S.outreach.slice().sort((a, b) => a.at < b.at ? 1 : -1);
  sheet('<h2>Who we have asked</h2><div class="small muted">Every ask the committee has sent, and where it stands. Tap one to move it on.</div>' + (list.length ? '<div class="card pad-0"><div class="list">' + list.map(x => { const o = orgs().find(y => y.id === x.orgId) || { name: x.orgId }; return '<button class="item tap" data-act="outreach-status" data-id="' + x.id + '"><div class="col grow"><div class="t">' + esc(o.name) + '</div><div class="s">' + esc(x.what) + ' · ' + esc(first(x.by)) + ', ' + fmt(x.at) + (x.when ? ' · for ' + fmt(x.when) : '') + '</div></div><span class="pill ' + outreachCls(x.status) + '">' + outreachLabel(x.status) + '</span></button>'; }).join('') + '</div></div>' : empty('Nobody asked yet.')) + '<div class="btnrow"><button class="btn secondary" data-act="orgs">Find someone to ask</button></div>');
}
function outreachStatus(id) {
  const x = S.outreach.find(y => y.id === id); const o = orgs().find(y => y.id === x.orgId) || { name: x.orgId };
  sheet('<div class="eyebrow">' + esc(o.name) + '</div><h2>' + esc(x.what) + '</h2>' + (x.note ? '<div class="note">' + esc(x.note) + '</div>' : '') + '<div class="small muted">Asked by ' + esc(first(x.by)) + ' on ' + fmtLong(x.at) + '.</div><div class="radios">' + ['sent', 'replied', 'booked', 'done', 'no'].map(st => '<button class="radio ' + (x.status === st ? 'on' : '') + '" data-act="outreach-set" data-id="' + x.id + '" data-st="' + st + '"><span class="mark"></span><span><b>' + outreachLabel(st) + '</b></span></button>').join('') + '</div><div class="btnrow"><button class="btn secondary" data-act="outreach-list">Back</button><button class="btn danger" data-act="outreach-remove" data-id="' + x.id + '">Remove</button></div>');
}

// ---------- ACTIONS ----------
function act(a, d, el) {
  const m = me();
  switch (a) {
    case 'tab': go(d.tab); break;
    case 'seg': R.seg[d.tab] = d.seg; saveRoute(); closeSheet(); rerender(); break;
    case 'filter': R.seg['news-filter'] = d.f; rerender(); break;
    case 'close': closeSheet(); break;
    case 'switch': switchSheet(); break;
    case 'people': peopleSheet(''); break;
    case 'person': personSheet(d.id); break;
    case 'view': R.view = d.v; saveRoute(); closeSheet(); render(); break;
    case 'today': TODAY = d.v || REAL_TODAY; try { if (d.v) localStorage.setItem(KEY + ':today', d.v); else localStorage.removeItem(KEY + ':today'); } catch (e) {} R.month = TODAY.slice(0, 7); R.sel = null; closeSheet(); render(); toast(d.v ? 'Pretending it is ' + fmtLong(TODAY) : 'Back to today'); break;
    case 'attend': qrSheet(); break;
    case 'ring': toast('In the real app this rings ' + first(d.id) + '. Sample numbers do not dial.'); break;
    case 'news-page': go('news', 'issue'); setTimeout(() => act('goto-page', { i: d.i }), 60); break;
    case 'poster-form': posterForm(d.id); break;
    case 'poster-save': posterSave(d.id); break;
    case 'poster-image-clear': R.posterImage = null; $('#f-poster-preview').innerHTML = ''; break;
    case 'run': runSheet(d.id); break;
    case 'run-tick': { const mm = S.meetings.find(x => x.id === d.mid); readRun(mm); const r = mm.run.items[d.aid] = mm.run.items[d.aid] || {}; r.done = !r.done; save(); runSheet(mm.id); break; }
    case 'run-add': { const mm = S.meetings.find(x => x.id === d.mid); const t = val('f-agenda'); if (!t) return; readRun(mm); mm.agenda.push({ id: uid('a'), text: t, from: m.id }); save(); runSheet(mm.id); break; }
    case 'run-task': { const mm = S.meetings.find(x => x.id === d.mid); readRun(mm); save(); const a = mm.agenda.find(x => x.id === d.aid); const r = mm.run.items[a.id] || {}; taskForm(null, { title: a.text, notes: r.note ? 'From the meeting on ' + fmt(mm.date) + ': ' + r.note : 'From the meeting on ' + fmt(mm.date) }); break; }
    case 'run-finish': { const mm = S.meetings.find(x => x.id === d.mid); readRun(mm); mm.minutes = mm.agenda.map((a, i) => { const r = mm.run.items[a.id] || {}; return (i + 1) + '. ' + a.text + (r.note ? ' — ' + r.note : '') + (r.done || r.note ? '' : ' (not reached)'); }).join('\n'); mm.finishedAt = TODAY; save(); closeSheet(); rerender(); toast('Minutes written. ' + mm.attendance.length + ' came. Suggest them for the newsletter from the draft.'); break; }
    case 'back-issues': backIssuesSheet(); break;
    case 'pick-issue': R.issueId = d.id; R.spread = 0; closeSheet(); render(); { const rd = $('#reader'); if (rd) rd.scrollTop = 0; } break;
    case 'spread': R.spread = Math.max(0, (R.spread || 0) + Number(d.k)); rerender(); break;
    case 'colours': coloursSheet(); break;
    case 'orgs': { const st = orgState(); if (d.kind) st.kind = d.kind; orgsSheet(); break; }
    case 'orgs-kind': { const st = orgState(); st.kind = d.kind; st.cat = ''; orgsSheet(); break; }
    case 'orgs-cost': { const st = orgState(); st.cost = st.cost === d.cost ? '' : d.cost; orgsSheet(); break; }
    case 'orgs-near': { const st = orgState(); st.near = !st.near; orgsSheet(); break; }
    case 'orgs-clear': { const st = orgState(); st.q = ''; st.cat = ''; st.cost = ''; st.near = false; orgsSheet(); break; }
    case 'org': orgSheet(d.id); break;
    case 'outreach-form': outreachForm(d.id); break;
    case 'outreach-save': { const what = need('f-what', 'Say what you need'); if (!what) return; S.outreach.push({ id: uid('o'), orgId: d.id, by: m.id, at: TODAY, what, when: val('f-when') || '', note: val('f-note'), status: 'sent' }); save(); orgSheet(d.id); rerender(); toast('Logged. In the real app this is on its way to them.'); break; }
    case 'outreach-list': outreachList(); break;
    case 'outreach-status': outreachStatus(d.id); break;
    case 'outreach-set': { const x = S.outreach.find(y => y.id === d.id); x.status = d.st; save(); outreachStatus(x.id); rerender(); break; }
    case 'outreach-remove': S.outreach = S.outreach.filter(y => y.id !== d.id); save(); outreachList(); rerender(); break;
    case 'theme-form': themeForm(); break;
    case 'theme-save': { const n = need('f-name', 'Give the pair a name'); if (!n) return; const a = val('f-accent'), b = val('f-second'); if (tooLight(a)) { $('#f-accent-err').textContent = 'Too light for white writing. Pick a darker main colour.'; return; } const t = { id: uid('th'), name: n, accent: a, second: b }; S.town.themes.push(t); S.town.themeId = t.id; S.town.themeBy = m.id; S.town.themeAt = TODAY; save(); render(); coloursSheet(); toast('The town is in ' + n + ' now'); break; }
    case 'theme-use': S.town.themeId = d.id; S.town.themeBy = m.id; S.town.themeAt = TODAY; save(); render(); coloursSheet(); break;
    case 'theme-remove': S.town.themes = S.town.themes.filter(t => t.id !== d.id || t.fixed); S.town.themeId = 'default'; save(); render(); coloursSheet(); toast('Back to green and gold'); break;
    case 'mark-toggle': { const ms = S.town.marks; const i = ms.indexOf(d.k); if (i >= 0) ms.splice(i, 1); else if (ms.length < 3) ms.push(d.k); else { toast('Three marks at most. Take one off first.'); return; } save(); coloursSheet(); break; }
    case 'be': S.me = d.id; save(); R.tab = 'home'; closeSheet(); render(); toast('You are now ' + first(d.id)); break;
    case 'reset': reset(); break;
    case 'desk-go': ({ queue: () => { go('home'); }, meeting: () => { const nm = nextMeeting(); if (nm) prepSheet(nm.id); }, fund: () => { const f = S.fundraisers.find(x => x.status === 'open'); if (f) fundSheet(f.id); }, requests: () => { go('calendar'); setTimeout(() => { const r = S.requests.find(x => x.status === 'pending'); if (r) requestSheet(r.id); }, 50); }, 'news-draft': () => go('news', 'draft'), rota: () => go('rota', 'tasks'), join: () => { joinList(); }, training: () => go('rota', 'training') }[d.to] || (() => {}))(); break;
    // calendar
    case 'month': R.month = addMonths(R.month, Number(d.k)); R.sel = null; rerender(); break;
    case 'selday': R.sel = d.date || null; rerender(); break;
    case 'event': eventSheet(d.id); break;
    case 'event-form': eventForm(d.id, d.type, d.resubmit); break;
    case 'event-save': eventSave(d); break;
    case 'event-remove': S.events = S.events.filter(e => e.id !== d.id); S.meetings = S.meetings.filter(x => x.eventId !== d.id); save(); closeSheet(); rerender(); toast('Removed'); break;
    case 'request': requestSheet(d.id, d.mode); break;
    case 'request-decide': requestDecide(d); break;
    case 'decision': decisionSheet(d.id); break;
    case 'decision-accept': { const r = S.requests.find(x => x.id === d.id); r.status = r.status === 'denied' ? 'closed' : 'accepted'; save(); closeSheet(); rerender(); toast(r.status === 'closed' ? 'Closed' : 'Accepted'); break; }
    // tasks
    case 'task': taskSheet(d.id); break;
    case 'task-form': taskForm(d.id); break;
    case 'task-form-text': taskForm(null, { title: d.text }); break;
    case 'task-from': { const p = viewIssue().posts.find(x => x.id === d.post); taskForm(null, { title: p.title.replace(/:.*$/, ''), assignee: d.uid, notes: 'From the newsletter: ' + p.title }); break; }
    case 'task-from-all': { const p = viewIssue().posts.find(x => x.id === d.post); let n = 0; (p.responses || []).forEach(r => { if (!S.tasks.some(t => t.fromPost === p.id && t.assignee === r.by)) { S.tasks.push({ id: uid('t'), title: p.title.replace(/:.*$/, ''), notes: 'From the newsletter: ' + p.title + (r.text ? '. They said: “' + r.text + '”' : ''), place: '', due: '', assignee: r.by, project: S.projects[0], status: 'offered', createdBy: S.me, fromPost: p.id }); n++; } }); save(); rerender(); toast(n + ' people asked'); break; }
    case 'task-save': taskSave(d.id); break;
    case 'task-accept': { const t = S.tasks.find(x => x.id === d.id); t.status = 'accepted'; save(); closeSheet(); rerender(); toast(t.trainingId && !hasTraining(m, t.trainingId) ? 'Taken. It needs ' + training(t.trainingId).name + ' first.' : 'Taken'); if (t.trainingId && !hasTraining(m, t.trainingId)) taskSheet(t.id); break; }
    case 'task-decline-form': { const t = S.tasks.find(x => x.id === d.id); sheet('<h2>I cannot do this one</h2><div class="small muted">' + esc(t.title) + '</div><div class="form">' + field('f-why', 'Why not', 'textarea', '', { placeholder: 'Required. The committee reads this and finds someone else.' }) + '</div><div class="btnrow"><button class="btn secondary" data-act="task" data-id="' + t.id + '">Back</button><button class="btn danger" data-act="task-decline" data-id="' + t.id + '">Send</button></div>'); break; }
    case 'task-decline': { const why = need('f-why', 'You have to say why.'); if (!why) return; const t = S.tasks.find(x => x.id === d.id); t.status = 'declined'; t.declineNote = why; save(); closeSheet(); rerender(); toast('Sent to the committee'); break; }
    case 'task-submit': { const t = S.tasks.find(x => x.id === d.id); t.status = 'submitted'; t.submitNote = val('f-done'); save(); closeSheet(); rerender(); toast('Marked done. The committee will confirm.'); break; }
    case 'task-confirm': { const t = S.tasks.find(x => x.id === d.id); t.status = 'done'; save(); closeSheet(); rerender(); toast('Done'); break; }
    case 'task-remove': S.tasks = S.tasks.filter(t => t.id !== d.id); save(); closeSheet(); rerender(); toast('Removed'); break;
    // training
    case 'training': trainingSheet(d.id); break;
    case 'training-form': trainingForm(d.id); break;
    case 'training-save': { const name = need('f-name', 'Needs a name'); if (!name) return; const data = { name, desc: val('f-desc'), mode: val('f-mode'), link: val('f-link'), validYears: Number(val('f-years')) || 3 }; if (d.id) Object.assign(training(d.id), data); else S.trainings.push(Object.assign({ id: uid('tr'), slots: [] }, data)); save(); closeSheet(); rerender(); toast('Saved'); break; }
    case 'slot-form': slotForm(d.id); break;
    case 'slot-save': { const date = need('f-date', 'Pick a date'); if (!date) return; training(d.tid).slots.push({ id: uid('slot'), date, time: val('f-time'), place: val('f-place'), taken: null }); save(); trainingSheet(d.tid); toast('Time added'); break; }
    case 'slot-open': { const s = trainingSlot(d.id); s.open = true; const tr = training(d.tid); S.events.push({ id: uid('ev'), title: tr.name + ' (open session)', date: s.date, time: s.time, place: s.place, kind: 'training-open', trainingId: tr.id, desc: 'Open to anyone who wants it.' }); save(); trainingSheet(d.tid); toast('On the calendar for everyone'); break; }
    case 'verify': verifySheet(d.uid, d.tid); break;
    case 'verify-form': verifyForm(d.tid); break;
    case 'verify-save': { const date = need('f-date', 'When was it?'); if (!date) return; m.training[d.tid] = { status: 'pending_verify', date, note: val('f-note') }; save(); closeSheet(); rerender(); toast('Told the committee'); break; }
    case 'verify-ok': { const u = user(d.uid); u.training[d.tid] = { status: 'done', date: u.training[d.tid].date }; save(); closeSheet(); rerender(); toast(first(u.id) + ' marked as trained'); break; }
    case 'verify-no': { const u = user(d.uid); delete u.training[d.tid]; save(); closeSheet(); rerender(); toast('Asked ' + first(u.id) + ' to do it again'); break; }
    case 'book-form': bookForm(d.tid); break;
    case 'book': { const s = trainingSlot(d.slot); const tr = training(d.tid); s.taken = m.id; const e = { id: uid('ev'), title: 'Your training: ' + tr.name, date: s.date, time: s.time, place: s.place, kind: 'training-private', forUser: m.id, trainingId: tr.id, slotId: s.id }; S.events.push(e); m.training[d.tid] = { status: 'booked', slotId: s.id, eventId: e.id }; save(); closeSheet(); rerender(); toast('Booked. It is on your calendar.'); break; }
    case 'unbook': { const st = m.training[d.tid]; if (st.slotId) trainingSlot(st.slotId).taken = null; S.events = S.events.filter(e => e.id !== st.eventId || e.kind !== 'training-private'); delete m.training[d.tid]; save(); closeSheet(); rerender(); toast('Booking cancelled'); break; }
    case 'join-training-event': m.training[d.tid] = { status: 'booked', eventId: d.evid }; save(); closeSheet(); rerender(); toast('Your name is down'); break;
    case 'untrain-event': delete m.training[d.tid]; save(); closeSheet(); rerender(); toast('Taken off'); break;
    case 'mark-trained': { const u = user(d.uid); u.training[d.tid] = { status: 'done', date: TODAY }; S.events = S.events.filter(e => e.id !== d.evid); save(); closeSheet(); rerender(); toast(first(u.id) + ' is trained'); break; }
    case 'mark-all-trained': { let n = 0; S.users.forEach(u => { const st = u.training[d.tid]; if (st && st.eventId === d.evid && st.status !== 'done') { u.training[d.tid] = { status: 'done', date: TODAY }; n++; } }); save(); closeSheet(); rerender(); toast(n + ' marked as trained'); break; }
    // newsletter
    case 'respond-help': { const p = viewIssue().posts.find(x => x.id === d.post); p.responses = (p.responses || []).filter(r => r.by !== m.id); p.responses.push({ by: m.id, at: TODAY, text: val('r-' + p.id) }); save(); rerender(); toast('Sent to the committee'); break; }
    case 'respond-choice': { const p = viewIssue().posts.find(x => x.id === d.post); const old = (p.responses || []).find(r => r.by === m.id); p.responses = (p.responses || []).filter(r => r.by !== m.id); p.responses.push({ by: m.id, at: TODAY, choice: Number(d.i), text: old ? old.text : undefined }); save(); rerender(); toast('Sent to the committee'); break; }
    case 'unrespond': { const p = viewIssue().posts.find(x => x.id === d.post); p.responses = (p.responses || []).filter(r => r.by !== m.id); save(); rerender(); toast('Taken back'); break; }
    case 'post-form': postForm(d.id); break;
    case 'edit-post': postForm(d.id); break;
    case 'post-save': postSave(d.id); break;
    case 'post-peek': { const p = draftIssue().posts.find(x => x.id === d.id); sheet('<span class="pill">' + typeLabel(p.type) + '</span><h2>' + esc(p.title) + '</h2><p>' + esc(p.body) + '</p><div class="card"><div class="row between"><div class="t small">With the committee</div>' + approvalDots(p) + '</div></div><button class="btn block secondary" data-act="edit-post" data-id="' + p.id + '">Edit</button><div class="small faint">Editing means they all look at it again.</div>'); break; }
    case 'post-review': postReview(d.id); break;
    case 'post-vote': { const p = draftIssue().posts.find(x => x.id === d.id); p.approvals = p.approvals || {}; p.approvals[m.id] = true; save(); closeSheet(); rerender(); toast(postApproved(p) ? 'Approved by everyone it needs. It is in.' : 'Your yes is in'); break; }
    case 'post-return-form': postReturnForm(d.id); break;
    case 'post-return': { const why = need('f-why', 'Say why.'); if (!why) return; const p = draftIssue().posts.find(x => x.id === d.id); p.status = 'returned'; p.returnNote = why; p.approvals = {}; save(); closeSheet(); rerender(); toast('Sent back to ' + first(p.submittedBy || p.author)); break; }
    case 'post-remove': { const dd = draftIssue(); dd.posts = dd.posts.filter(p => p.id !== d.id); save(); closeSheet(); rerender(); toast('Removed from the draft'); break; }
    case 'suggest-posts': suggestPosts(); break;
    case 'nudge': toast('Nudged ' + first(d.uid) + '. In the real app this is a notification.'); break;
    case 'publish': publishIssue(); break;
    // meeting
    case 'prep': prepSheet(d.id); break;
    case 'agenda-add': { const mm = S.meetings.find(x => x.id === d.mid); const t = val('f-agenda'); if (!t) return; mm.agenda.push({ id: uid('a'), text: t, from: m.id }); save(); prepSheet(mm.id); break; }
    case 'agenda-add-sug': { const mm = S.meetings.find(x => x.id === d.mid); mm.agenda.push({ id: uid('a'), text: d.text, from: m.id, key: d.key, postId: d.post || undefined }); save(); prepSheet(mm.id); break; }
    case 'agenda-add-post': { const nm = nextMeeting(); const p = viewIssue().posts.find(x => x.id === d.post); const n = (p.responses || []).length; const text = p.type === 'help' ? p.title + ': ' + n + ' offered to help' : p.title + ' (' + p.options.map((o, i) => o + ' ' + (p.responses || []).filter(r => r.choice === i).length).join(', ') + ')'; nm.agenda.push({ id: uid('a'), text, from: m.id, key: p.id, postId: p.id }); save(); rerender(); toast('On the agenda for ' + fmt(nm.date)); break; }
    case 'agenda-remove': { const mm = S.meetings.find(x => x.id === d.mid); mm.agenda = mm.agenda.filter(a => a.id !== d.aid); save(); prepSheet(mm.id); break; }
    case 'agenda-share': { const mm = S.meetings.find(x => x.id === d.mid); mm.shared = true; save(); prepSheet(mm.id); toast('Everyone can see the agenda now'); break; }
    case 'minutes-save': { const mm = S.meetings.find(x => x.id === d.mid); mm.minutes = val('f-minutes'); save(); closeSheet(); rerender(); toast('Saved. Suggest it for the next newsletter from the draft.'); break; }
    case 'qr': qrSheet(); break;
    case 'scan': scanSheet(); break;
    case 'scan-tap': checkIn(d.id); break;
    case 'scan-code': { const c = val('f-code').toUpperCase(); const u = S.users.find(x => c.startsWith(x.id.slice(0, 3).toUpperCase() + '-')); if (!u) { toast('No one with that code'); return; } checkIn(u.id); break; }
    // fund
    case 'fund': fundSheet(d.id); break;
    case 'give-form': giveForm(d.id); break;
    case 'give-pick': $('#f-amount').value = d.n; break;
    case 'give-step': { const el = $('#f-amount'); el.value = Math.max(1, (Number(el.value) || 0) + Number(d.k)); break; }
    case 'toggle-notes': R.allowNotes = !R.allowNotes; el.classList.toggle('on', R.allowNotes); break;
    case 'image-clear': readCaptions(); R.pendingImages.splice(Number(d.i), 1); $('#f-image-preview').innerHTML = imagePreviews(); break;
    case 'article': articleSheet(d.id); break;
    case 'goto-page': { if (R.view === 'web') { R.spread = Math.floor(Number(d.i) / 2); rerender(); break; } const rd = $('#reader'); if (rd) rd.scrollTo({ top: rd.clientHeight * Number(d.i), behavior: 'smooth' }); break; }
    case 'respond-note': { const p = viewIssue().posts.find(x => x.id === d.post); const r = (p.responses || []).find(x => x.by === m.id); if (!r) return; r.text = val('n-' + p.id); save(); rerender(); toast('Note sent with your answer'); break; }
    case 'respond-note-edit': { const p = viewIssue().posts.find(x => x.id === d.post); const r = (p.responses || []).find(x => x.by === m.id); if (r) { r.text = ''; save(); rerender(); } break; }
    case 'give': { const n = Number(val('f-amount')); if (!n || n < 1) { $('#f-amount-err').textContent = 'Enter an amount'; return; } const f = S.fundraisers.find(x => x.id === d.id); f.raised += n; f.donors += 1; save(); fundSheet(f.id); toast('Thank you. Only the total is shown.'); break; }
    case 'spend-form': spendForm(d.id); break;
    case 'spend-save': { const desc = need('f-desc', 'What was it for?'); if (!desc) return; const n = Number(val('f-amount')); if (!n) { $('#f-amount-err').textContent = 'How much?'; return; } const rc = need('f-receipt', 'A receipt reference is required.'); if (!rc) return; const f = S.fundraisers.find(x => x.id === d.id); f.spends.push({ id: uid('s'), desc, amount: n, date: val('f-date') || TODAY, receipt: rc, by: m.id }); save(); fundSheet(f.id); toast('Recorded for everyone to see'); break; }
    case 'new-fund': fundForm(); break;
    case 'fund-save': { const t = need('f-title', 'What is it for?'); if (!t) return; const g = Number(val('f-goal')); if (!g) { $('#f-goal-err').textContent = 'Set a target'; return; } S.fundraisers.unshift({ id: uid('f'), title: t, goal: g, raised: 0, donors: 0, status: 'open', opened: TODAY, why: val('f-why'), spends: [] }); save(); closeSheet(); rerender(); toast('Fund open'); break; }
    case 'fund-close': { const f = S.fundraisers.find(x => x.id === d.id); f.status = 'closed'; save(); closeSheet(); rerender(); toast('Closed. The ledger stays visible.'); break; }
    // joining
    case 'join': joinSheet(d.id); break;
    case 'join-ok': { const j = S.joinRequests.find(x => x.id === d.id); admit(j); break; }
    case 'join-vote': { const j = S.joinRequests.find(x => x.id === d.id); j.votes[m.id] = true; if (committee().every(c => j.votes[c.id])) admit(j); else { save(); joinSheet(j.id); toast('Your yes is in'); } break; }
    case 'join-decline': { const j = S.joinRequests.find(x => x.id === d.id); j.status = 'declined'; save(); closeSheet(); rerender(); toast('Declined'); break; }
    case 'add-local': addLocalForm(); break;
    case 'add-local-save': { const n = need('f-name', 'Name needed'); if (!n) return; S.joinRequests.push({ id: uid('jr'), name: n, street: val('f-street'), eircode: '', proof: '', createdAt: TODAY, status: 'pending', manual: true, proposedBy: m.id, votes: { [m.id]: true } }); save(); closeSheet(); rerender(); toast('Proposed. The rest of the committee have to say yes.'); break; }
    case 'join-another': toast('In the real app you search for your other place and ask its committee.'); break;
    case 'rules': rulesSheet(); break;
    case 'rule-pick': S.town.rules.newsletterApproval = d.v; if (d.v === 'subcommittee' && !S.town.rules.subcommittee.length) S.town.rules.subcommittee = [m.id]; save(); rulesSheet(); rerender(); break;
    case 'sub-toggle': { const s = S.town.rules.subcommittee; const i = s.indexOf(d.id); if (i >= 0) { if (s.length > 1) s.splice(i, 1); } else s.push(d.id); save(); rulesSheet(); rerender(); break; }
    default: break;
  }
}
function admit(j) {
  j.status = 'approved';
  S.users.push({ id: uid('u'), name: j.name, role: 'local', since: TODAY.slice(0, 7), street: j.street, eircode: j.eircode || '—', training: {} });
  S.town.members += 1; save(); closeSheet(); rerender(); toast(j.name.split(' ')[0] + ' is in');
}

function afterRender() {}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.tagName === 'A') return;
  e.preventDefault(); act(el.dataset.act, el.dataset, el);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
document.addEventListener('input', e => { if (e.target && e.target.dataset.live === 'people') peopleSheet(e.target.value); if (e.target && e.target.dataset.live === 'orgs') { orgState().q = e.target.value; R.orgsFocus = true; orgsSheet(); } });
document.addEventListener('change', e => {
  if (e.target && e.target.dataset.change === 'orgs-cat') { orgState().cat = e.target.value; orgsSheet(); return; }
  if (e.target && e.target.id === 'f-poster-image' && e.target.files && e.target.files.length) { shrinkImage(e.target.files[0], url => { R.posterImage = url; const pv = $('#f-poster-preview'); if (pv) pv.innerHTML = '<div class="poster" style="padding:0"><div class="pic" style="margin:0;border:0"><img src="' + url + '" alt=""></div></div><button class="linkish" data-act="poster-image-clear">Take it out</button>'; }); return; }
  if (e.target && e.target.id === 'f-image' && e.target.files && e.target.files.length) { readCaptions(); Array.from(e.target.files).forEach(f => shrinkImage(f, url => { R.pendingImages.push({ src: url, caption: '' }); const pv = $('#f-image-preview'); if (pv) pv.innerHTML = imagePreviews(); })); }
});

// boot
S = load();
if (!S.users.find(u => u.id === S.me)) S.me = S.users[0].id;
if (!R.view) R.view = 'phone';
render();
})();
