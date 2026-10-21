// Mobile menu
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

// Menu tabs with arrow-key support
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  tabs.forEach((t) => {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
  });
  tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') selectTab(tabs[(i + 1) % tabs.length]);
    if (e.key === 'ArrowLeft') selectTab(tabs[(i - 1 + tabs.length) % tabs.length]);
  });
});

// Order form: client-side validation. A real site would POST to a backend,
// Formspree, or a Google Apps Script web app here.
const form = document.querySelector('.order-form');
const status = form.querySelector('.form-status');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const invalid = [...form.elements].filter((el) => {
    if (!el.name) return false;
    const valid = el.checkValidity();
    el.setAttribute('aria-invalid', String(!valid));
    return !valid;
  });
  if (invalid.length) {
    const names = invalid.map((el) => el.closest('label').firstChild.textContent.trim());
    status.textContent = `Please check: ${names.join(', ')}.`;
    status.className = 'form-status error';
    invalid[0].focus();
    return;
  }
  status.textContent = `Thanks, ${form.elements.name.value.trim()}! (Demo: no order was sent.)`;
  status.className = 'form-status ok';
  form.reset();
});
