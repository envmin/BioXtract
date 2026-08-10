const TEAM_CSV    = 'content/team.csv';
const PHOTO_DIR   = 'assets/images/team/';
const DEFAULT_IMG = 'assets/images/team/default.svg';

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1)
    .filter(r => r.some(c => c.trim() !== ''))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = (r[i] || '').trim());
      return obj;
    });
}

// team.csv is edited in Excel by non-developers, so treat every field as untrusted
// text: an unescaped "&" (e.g. "CEO/CSO & Founder") or quote would corrupt the markup.
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function teamCard(m, i) {
  const hasPhoto = m.photo && m.photo.toLowerCase() !== 'x';
  const src = esc(hasPhoto ? PHOTO_DIR + m.photo : DEFAULT_IMG);
  const name = esc(m.name || 'Unknown');
  const bio = esc((m.bio || '').trim() || "Contributing to BioXtract's interdisciplinary research program.");
  const fallback = `this.onerror=null;this.src='${DEFAULT_IMG}'`;
  // Optional profile link (the "link" CSV column). Only http(s) URLs are honored.
  const link = /^https?:\/\//i.test((m.link || '').trim()) ? esc(m.link.trim()) : '';
  const nameHtml = link
    ? `<a class="team-name-link" href="${link}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" aria-label="${name}, profile page">${name}</a>`
    : name;

  return `
      <article class="team-card fade-up" style="transition-delay:${(i % 4) * 60}ms" role="listitem"
               aria-label="${name}, click to learn more">
        <div class="card-inner">
          <div class="card-face card-front">
            <div class="team-photo-wrap">
              <img src="${src}" alt="Portrait of ${name}" class="team-photo"
                   width="400" height="400" loading="lazy" decoding="async" onerror="${fallback}">
            </div>
            <h4 class="team-name">${nameHtml}</h4>
            ${m.role ? `<span class="team-role">${esc(m.role)}</span>` : ''}
            ${m.affiliation ? `<p class="team-affiliation">${esc(m.affiliation)}</p>` : ''}
            ${m.country ? `<p class="team-country">${esc(m.country)}</p>` : ''}
            ${m.email ? `<a class="team-email" href="mailto:${esc(m.email)}" onclick="event.stopPropagation()">${esc(m.email)}</a>` : ''}
            <span class="flip-hint" aria-hidden="true">↻ flip</span>
          </div>
          <div class="card-face card-back" aria-hidden="true">
            <div class="back-avatar">
              <img src="${src}" alt="" width="400" height="400" loading="lazy" decoding="async" onerror="${fallback}">
            </div>
            <p class="back-name">${name}</p>
            ${m.affiliation ? `<p class="back-affil">${esc(m.affiliation)}</p>` : ''}
            ${m.country ? `<p class="back-country">${esc(m.country)}</p>` : ''}
            <p class="back-bio">${bio}</p>
            <span class="flip-hint back-flip-hint" aria-hidden="true">↺ flip back</span>
          </div>
        </div>
      </article>`;
}

function renderTeam(members) {
  const grid = document.getElementById('team-root');
  if (!grid) return;

  // The home page shows only the working team (everything that is NOT a board);
  // the full Team page (data-team-scope="all") shows everyone. "Board" groups are
  // detected by name so the split keeps working straight from the CSV.
  const scope = grid.getAttribute('data-team-scope') || 'all';
  if (scope === 'home') {
    members = members.filter(m => !/board/i.test(m.group || ''));
  }

  // Group in the order the groups first appear in the CSV, so reordering rows in
  // the spreadsheet reorders the sections on the page.
  const order = [];
  const groups = new Map();
  members.forEach(m => {
    const key = (m.group || '').trim();
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key).push(m);
  });

  // A CSV with no group column renders as one plain grid, exactly as before.
  const unGrouped = order.length === 1 && order[0] === '';

  grid.innerHTML = order.map(key => {
    const cards = groups.get(key).map(teamCard).join('');
    if (unGrouped) return `<div class="team-grid" role="list" aria-label="Team members">${cards}</div>`;
    const label = esc(key || 'Team');
    return `
      <section class="team-group">
        <h3 class="team-group-title">${label}</h3>
        <div class="team-grid" role="list" aria-label="${label}">${cards}</div>
      </section>`;
  }).join('');

  grid.querySelectorAll('.team-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
      const back = card.querySelector('.card-back');
      if (back) back.setAttribute('aria-hidden', card.classList.contains('flipped') ? 'false' : 'true');
    });
  });

  observeFadeUps(grid);
}

// If the page was opened with a #hash (e.g. #team), re-apply the jump once the
// team cards have rendered; the initial browser jump happens before they exist.
function restoreHashScroll() {
  if (window.scrollY > 0) return;            // user or browser already positioned the page
  const hash = location.hash;
  if (!hash || hash.length < 2) return;
  let target;
  try { target = document.querySelector(hash); } catch (e) { return; }
  if (!target) return;
  // Force an instant jump (override CSS scroll-behavior: smooth) so the reveal
  // below measures final positions, not a mid-animation scroll.
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 64);
  html.style.scrollBehavior = prev;
  revealVisibleFadeUps();
}

function loadTeam() {
  const grid = document.getElementById('team-root');
  fetch(TEAM_CSV, { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(text => { renderTeam(parseCSV(text)); restoreHashScroll(); })
    .catch(err => {
      console.error('Could not load team.csv:', err);
      if (grid) grid.innerHTML =
        '<p class="team-error">The team list could not be loaded. ' +
        'If you are opening this file directly, run it through a local server.</p>';
    });
}

function initBackToTop() {
  const btn = document.getElementById('back-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 360);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initNav() {
  const header = document.getElementById('nav-header');
  const toggle = document.getElementById('nav-toggle');
  const menu   = document.getElementById('nav-menu');
  if (!header) return;

  let ticking = false;
  // Pages without a dark hero (Team, Partner, FAQ) have light content directly
  // under the nav, so the nav stays solid from the top instead of transparent.
  const hasHero = !!document.querySelector('.hero');

  function updateHeader() {
    const y = window.scrollY;
    header.classList.toggle('nav-header--scrolled', !hasHero || y > 24);
    ticking = false;
  }

  updateHeader();
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('nav-menu--open');
      toggle.classList.toggle('nav-toggle--open', open);
      toggle.setAttribute('aria-expanded', open);
      header.classList.toggle('nav-header--menu-open', open);
    });
    menu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        menu.classList.remove('nav-menu--open');
        toggle.classList.remove('nav-toggle--open');
        toggle.setAttribute('aria-expanded', 'false');
        header.classList.remove('nav-header--menu-open');
      }));
  }
}

function initScrollSpy() {
  const links = [...document.querySelectorAll('.nav-link')];
  const sections = links
    .map(l => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length) return;

  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.remove('nav-link--active'));
      const active = document.querySelector(`.nav-link[href="#${e.target.id}"]`);
      if (active) active.classList.add('nav-link--active');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => spy.observe(s));
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

let fadeObserver;
function revealVisibleFadeUps() {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  document.querySelectorAll('.fade-up:not(.visible)').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) el.classList.add('visible');
  });
}
function observeFadeUps(scope = document) {
  const els = [...scope.querySelectorAll('.fade-up:not(.visible)')];
  if (!els.length) return;

  // No IntersectionObserver (very old browser) → just show everything.
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('visible')); return; }

  if (!fadeObserver) {
    fadeObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); fadeObserver.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  }
  els.forEach(el => fadeObserver.observe(el));

  // Failsafe: if the observer doesn't fire, reveal whatever is already on-screen
  // (e.g. dynamically-added team cards). Below-the-fold items still animate on scroll.
  setTimeout(revealVisibleFadeUps, 700);
}

// Backstop: reveal on-screen content on every scroll/resize, independent of the
// IntersectionObserver. This guarantees nothing stays invisible if the observer
// misfires (the cause of blank sections on some browsers).
function initFadeReveal() {
  let scheduled = false;
  const onScroll = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; revealVisibleFadeUps(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  revealVisibleFadeUps();
}

// Partner page contact form. Progressive enhancement over a standard Web3Forms
// form: without JS it still posts and Web3Forms shows its own success page; with
// JS we submit in the background and swap in an inline thank-you. Web3Forms works
// on a static host (GitHub Pages); the recipient is set on web3forms.com.
function initPartnerForm() {
  const form = document.getElementById('partner-form');
  if (!form) return;
  const status = document.getElementById('form-status');
  const card   = form.closest('.form-card');

  function showStatus(type, msg) {
    if (!status) return;
    status.textContent = msg;
    status.className = 'form-status is-visible is-' + type;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();

    // hCaptcha is required server-side; hCaptcha injects h-captcha-response when solved.
    const captcha = form.querySelector('textarea[name="h-captcha-response"]');
    if (!captcha || !captcha.value) {
      showStatus('error', 'Please complete the "I am human" check before sending.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.textContent = 'Sending...'; }

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) throw new Error(data.message || 'failed');
        if (card) card.classList.add('is-sent');
        showStatus('success', 'Thank you! Your message has been sent. We will be in touch soon.');
      })
      .catch(() => {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Send message'; }
        showStatus('error', 'Sorry, something went wrong. Please try again, or reach us on LinkedIn.');
      });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollSpy();
  initSmoothScroll();
  initBackToTop();
  initFadeReveal();
  observeFadeUps();
  initPartnerForm();
  loadTeam();
});
