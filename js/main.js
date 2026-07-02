// ===== Nav: shadow on scroll + mobile menu =====
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

burger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  burger.classList.toggle('open');
});
navLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    navLinks.classList.remove('open');
    burger.classList.remove('open');
  }
});

// ===== Scroll reveal =====
const revealEls = document.querySelectorAll('.reveal');
const revObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 80}ms`;
  revObserver.observe(el);
});

// ===== Animated stat counters =====
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const stats = document.querySelectorAll('.stat__num');
const animateStat = (el) => {
  const target = parseFloat(el.dataset.target);
  const prefix0 = el.dataset.prefix || '';
  const suffix0 = el.dataset.suffix || '';
  if (reduceMotion) { el.textContent = `${prefix0}${target}${suffix0}`; return; }
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const dur = 1400;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = Math.round(target * eased);
    el.textContent = `${prefix}${val}${suffix}`;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = `${prefix}${target}${suffix}`;
  };
  requestAnimationFrame(step);
};
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animateStat(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.6 });
stats.forEach((s) => statObserver.observe(s));

// ===== Contact form -> Web3Forms (avec repli mailto) =====
const form = document.getElementById('contactForm');
const btn = form.querySelector('button[type="submit"]');
const KEY_PLACEHOLDER = 'VOTRE_CLE_WEB3FORMS';

const mailtoFallback = (f) => {
  const subject = encodeURIComponent(`Demande de devis — ${f.name.value}`);
  const body = encodeURIComponent(
    `Nom / structure : ${f.name.value}\n` +
    `Email : ${f.email.value}\n` +
    `Événement : ${f.event.value}\n` +
    `Affluence attendue : ${f.affluence.value}\n\n` +
    `Message :\n${f.message.value}`
  );
  window.location.href = `mailto:easypeezy.ep@gmail.com?subject=${subject}&body=${body}`;
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = form.elements;
  if (!f.name.value.trim() || !f.email.value.trim()) {
    form.reportValidity();
    return;
  }

  // Tant que la clé Web3Forms n'est pas renseignée : repli mailto
  if (!f.access_key || f.access_key.value === KEY_PLACEHOLDER) {
    mailtoFallback(f);
    form.classList.add('sent');
    btn.textContent = 'Merci ! Votre client mail va s\'ouvrir';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Envoi…';
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form),
    });
    const data = await res.json();
    if (data.success) {
      form.classList.add('sent');
      btn.textContent = 'Merci ! Votre demande est bien envoyée';
    } else {
      throw new Error(data.message || 'Erreur');
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Erreur, réessayez ou écrivez-nous';
    mailtoFallback(f);
  }
});
