const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

/* ---------- Language (EN in the HTML, VI from i18n.js) ---------- */
const textNodes = [...document.querySelectorAll('[data-i18n]')];
const attrNodes = [...document.querySelectorAll('[data-i18n-attr]')];
const original = new Map(textNodes.map((el) => [el, el.textContent]));
const originalAttr = new Map(
  attrNodes.map((el) => {
    const [attr] = el.dataset.i18nAttr.split(':');
    return [el, el.getAttribute(attr)];
  })
);
const titles = { en: document.title, vi: 'Mực · Giấy tờ tiếng Việt thành dữ liệu sạch' };
let lang = 'en';

function t(key) {
  const dict = (window.I18N || {})[lang];
  return (dict && dict[key]) || null;
}

function applyLanguage(next) {
  lang = next;
  textNodes.forEach((el) => {
    el.textContent = (lang === 'vi' && t(el.dataset.i18n)) || original.get(el);
  });
  attrNodes.forEach((el) => {
    const [attr, key] = el.dataset.i18nAttr.split(':');
    el.setAttribute(attr, (lang === 'vi' && t(key)) || originalAttr.get(el));
  });
  root.lang = lang;
  document.title = titles[lang];
  document.querySelectorAll('.lang [data-lang]').forEach((s) => s.classList.toggle('on', s.dataset.lang === lang));
  langButton.setAttribute('aria-label', t('lang.label') || 'EN / VI');
  splitKinetic();
  updateMarqueeButton();
  updateRangeText();
  if (formStatus) { formStatus.textContent = ''; formStatus.className = 'form-status'; }
  try { localStorage.setItem('lang', lang); } catch (_) { /* storage unavailable */ }
}

function initialLanguage() {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'en' || saved === 'vi') return saved;
  } catch (_) { /* storage unavailable */ }
  return (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

const langButton = document.querySelector('.lang');
langButton.addEventListener('click', () => applyLanguage(lang === 'en' ? 'vi' : 'en'));

/* ---------- Marquee pause (moving content must be stoppable) ---------- */
const marquee = document.querySelector('.marquee');
const marqueeButton = marquee.querySelector('.marquee-pause');
function updateMarqueeButton() {
  const paused = marquee.classList.contains('paused');
  marqueeButton.textContent = t(paused ? 'marquee.play' : 'marquee.pause');
  marqueeButton.setAttribute('aria-pressed', String(paused));
}
marqueeButton.addEventListener('click', () => {
  marquee.classList.toggle('paused');
  updateMarqueeButton();
});

/* ---------- Before / after slider ---------- */
const compare = document.querySelector('.compare');
const range = document.getElementById('compare-range');
function updateRangeText() {
  range.setAttribute('aria-valuetext', `${100 - Number(range.value)}${t('cmp.after')}`);
}
range.addEventListener('input', () => {
  compare.style.setProperty('--pos', `${range.value}%`);
  updateRangeText();
});

const form = document.querySelector('.cta-form');
const formStatus = form.querySelector('.form-status');

/* ---------- Kinetic headlines: each word rises in turn ---------- */
function splitKinetic() {
  document.querySelectorAll('.kinetic').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.textContent = '';
    words.forEach((word, i) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      outer.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.textContent = word;
      inner.style.setProperty('--i', i);
      outer.appendChild(inner);
      el.append(outer, ' ');
    });
  });
}

applyLanguage(initialLanguage());

/* ---------- Mobile menu ---------- */
const toggle = document.querySelector('.nav-toggle');
const links = document.getElementById('nav-links');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
links.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

/* ---------- Header shadow once the page scrolls ---------- */
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Reveal on scroll, count-up numbers ---------- */
function countUp(el) {
  const target = Number(el.dataset.to);
  if (reduceMotion || target === 0) { el.textContent = target; return; }
  el.textContent = '0';
  const start = performance.now();
  const duration = 1200;
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    entry.target.querySelectorAll('.count').forEach(countUp);
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.2 });
document.querySelectorAll('.reveal, .kinetic').forEach((el) => revealObserver.observe(el));

/* ---------- How it works: highlight the step in the middle of the screen ---------- */
const steps = [...document.querySelectorAll('.step')];
const meter = document.querySelector('.how-meter');
const stepObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const index = Number(entry.target.dataset.step);
    steps.forEach((s, i) => s.classList.toggle('active', i === index));
    meter.style.setProperty('--progress', (index + 1) / steps.length);
  });
}, { rootMargin: '-45% 0px -45% 0px' });
steps.forEach((s) => stepObserver.observe(s));

/* ---------- Hero demo: scan, fill the table, stamp; loops while visible ---------- */
const demo = document.querySelector('.demo');
if (reduceMotion) {
  demo.classList.add('done');
} else {
  let timer = null;
  const play = () => {
    demo.classList.remove('play');
    void demo.offsetWidth; // restart CSS animations
    demo.classList.add('play');
  };
  new IntersectionObserver(([entry]) => {
    clearInterval(timer);
    if (entry.isIntersecting) {
      play();
      timer = setInterval(play, 9000);
    }
  }, { threshold: 0.3 }).observe(demo);
}

/* ---------- Signup form (demo, nothing is sent) ---------- */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = form.elements.email;
  const valid = email.checkValidity();
  email.setAttribute('aria-invalid', String(!valid));
  // Clear first so screen readers announce the message again on a repeat error.
  formStatus.textContent = '';
  requestAnimationFrame(() => {
    formStatus.className = `form-status ${valid ? 'ok' : 'error'}`;
    formStatus.textContent = t(valid ? 'cta.ok' : 'cta.err');
  });
  if (valid) form.reset(); else email.focus();
});

window.mucReady = true;
