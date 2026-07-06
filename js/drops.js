// ===== Compteur "gouttes de soutien" =====
// Configurez ces deux valeurs après avoir créé votre projet Supabase
// (Project Settings > API > Project URL / anon public key) et exécuté
// sql/drops_counter.sql dans l'éditeur SQL du projet.
// Tant que ce n'est pas fait, le compteur fonctionne en mode local
// (stocké dans le navigateur), comme repli. Une goutte par email : la
// contrainte unique est posée côté base (table drop_supporters), le
// navigateur ne fait que se souvenir localement qu'il a déjà participé.
const SUPABASE_URL = 'https://ototpaizaesovtmvwmaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90b3RwYWl6YWVzb3Z0bXZ3bWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMzkxNjAsImV4cCI6MjA5ODkxNTE2MH0.BekO-tMBKClB9VYH7sZwtIcJVfnbhkw3MmUfTKr8xMA';

(() => {
  const CONFIGURED = SUPABASE_URL !== 'VOTRE_URL_SUPABASE' && SUPABASE_ANON_KEY !== 'VOTRE_CLE_ANON_SUPABASE';
  const LOCAL_COUNT_KEY = 'ep_drops_local_count';
  const LOCAL_EMAIL_KEY = 'ep_drops_email';
  const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];
  const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  const widget = document.querySelector('[data-drops-widget]');
  if (!widget) return;

  const els = {
    canvas: widget.querySelector('[data-drops-canvas]'),
    count: widget.querySelector('[data-drops-count]'),
    countLabel: widget.querySelector('[data-drops-count-label]'),
    progress: widget.querySelector('[data-drops-progress]'),
    mascotBtn: widget.querySelector('[data-drops-btn]'),
    share: widget.querySelector('[data-drops-share]'),
    toast: widget.querySelector('[data-drops-toast]'),
    form: widget.querySelector('[data-drops-email-form]'),
    input: widget.querySelector('[data-drops-email-input]'),
    note: widget.querySelector('[data-drops-email-note]'),
  };

  const jar = (typeof createDropsJar === 'function' && els.canvas) ? createDropsJar(els.canvas) : null;

  // Astuce de test locale : ouvrir la page avec ?resetdrops=1 remet le
  // compteur et l'email mémorisés (mode local uniquement) à zéro.
  // N'affecte pas le total partagé une fois Supabase configuré.
  if (new URLSearchParams(window.location.search).has('resetdrops')) {
    localStorage.removeItem(LOCAL_COUNT_KEY);
    localStorage.removeItem(LOCAL_EMAIL_KEY);
  }

  let count = 0;
  let contributed = !!localStorage.getItem(LOCAL_EMAIL_KEY);
  let busy = false;

  // PostgREST renvoie parfois le résultat d'une fonction scalaire sous forme
  // d'objet ou de tableau (ex: si la fonction en base n'a pas le bon type de
  // retour). On extrait systématiquement un nombre pour éviter d'afficher
  // "[object Object]" et de fausser le calcul du palier.
  const toCount = (value) => {
    let v = value;
    if (Array.isArray(v)) v = v[0];
    if (v && typeof v === 'object') v = Object.values(v)[0];
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const formatCount = (n) => n.toLocaleString('fr-FR');

  const nextMilestone = (n) => MILESTONES.find((m) => m > n) ?? MILESTONES[MILESTONES.length - 1];

  const renderCount = (n) => {
    els.count.textContent = formatCount(n);
    els.countLabel.textContent = n === 1 ? 'goutte de soutien' : 'gouttes de soutien';
    const next = nextMilestone(n);
    const remaining = next - n;
    els.progress.textContent = remaining > 0
      ? `Encore ${formatCount(remaining)} goutte${remaining > 1 ? 's' : ''} avant le palier des ${formatCount(next)}`
      : `Palier des ${formatCount(next)} atteint !`;
  };

  const showToast = (message) => {
    els.toast.textContent = message;
    els.toast.hidden = false;
    els.toast.classList.remove('is-visible');
    void els.toast.offsetWidth;
    els.toast.classList.add('is-visible');
  };

  const showNote = (message) => {
    els.note.textContent = message;
    els.note.hidden = false;
  };

  const SITE_URL = 'https://easy-peezy.fr/';
  const shareText = (n) => `${formatCount(n)} personne${n > 1 ? 's' : ''} ${n > 1 ? 'ont' : 'a'} déjà ajouté ${n > 1 ? 'leur' : 'sa'} goutte à Easy Peezy 💧 Rejoignez-nous : ${SITE_URL}`;

  els.share.addEventListener('click', async () => {
    const text = shareText(count);

    // 1) Partage natif avec image "story" générée à la volée (Instagram,
    // TikTok, Facebook récupèrent alors une vraie image, pas juste un lien).
    if (typeof generateShareImage === 'function' && navigator.canShare) {
      try {
        const blob = await generateShareImage(count);
        const file = new File([blob], 'easypeezy-soutien.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Easy Peezy', text });
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return; // partage annulé par l'utilisateur
        // sinon (image non générée, non supporté...) : on retente en texte simple ci-dessous
      }
    }

    // 2) Repli : partage natif texte seul
    if (navigator.share) {
      try {
        await navigator.share({ text, url: SITE_URL, title: 'Easy Peezy' });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    // 3) Repli : copie dans le presse-papiers
    try {
      await navigator.clipboard.writeText(text);
      const original = els.share.textContent;
      els.share.textContent = 'Copié !';
      setTimeout(() => { els.share.textContent = original; }, 1800);
    } catch {
      window.prompt('Copiez votre message :', text);
    }
  });

  const checkMilestones = (before, after) => {
    let crossed = null;
    for (const m of MILESTONES) {
      if (before < m && after >= m) crossed = m;
    }
    if (crossed === null) return;
    const message = after === crossed
      ? `Vous êtes la ${formatCount(crossed)}e goutte du mouvement ! Merci 💧`
      : `Le mouvement vient de franchir les ${formatCount(crossed)} gouttes de soutien, merci d'en faire partie !`;
    showToast(message);
    els.share.hidden = false;
  };

  const markContributed = () => {
    contributed = true;
    els.mascotBtn.disabled = true;
    els.form.hidden = true;
  };

  const remoteFetchCount = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_drops_count`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!res.ok) throw new Error('drops fetch failed');
    return toCount(await res.json());
  };

  const remoteAddDrop = async (email) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/add_drop`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_email: email }),
    });
    if (!res.ok) throw new Error('invalid_email');
    return toCount(await res.json());
  };

  const localAddDrop = (email) => {
    let stored = parseInt(localStorage.getItem(LOCAL_COUNT_KEY) || '0', 10);
    stored += 1;
    localStorage.setItem(LOCAL_COUNT_KEY, String(stored));
    return Promise.resolve(stored);
  };

  const init = async () => {
    if (CONFIGURED) {
      try {
        count = await remoteFetchCount();
      } catch {
        count = parseInt(localStorage.getItem(LOCAL_COUNT_KEY) || '0', 10);
      }
    } else {
      count = parseInt(localStorage.getItem(LOCAL_COUNT_KEY) || '0', 10);
    }
    renderCount(count);
    if (count > 0) els.share.hidden = false;
    jar?.addMany(count);
    if (contributed) {
      els.mascotBtn.disabled = true;
      els.form.hidden = true;
      showNote('Merci, votre goutte de soutien est déjà enregistrée 💧');
    }
  };

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy || contributed) return;
    const email = els.input.value.trim();
    if (!EMAIL_PATTERN.test(email)) {
      showNote('Merci d’entrer une adresse email valide.');
      els.input.focus();
      return;
    }

    busy = true;
    els.mascotBtn.disabled = true;
    const before = count;

    try {
      count = CONFIGURED ? await remoteAddDrop(email) : await localAddDrop(email);
      localStorage.setItem(LOCAL_EMAIL_KEY, email);
      renderCount(count);
      jar?.addDrop();
      checkMilestones(before, count);
      showNote('Merci, votre goutte de soutien est enregistrée 💧');
      markContributed();
    } catch {
      els.mascotBtn.disabled = false;
      showNote('Adresse email invalide, réessayez.');
    } finally {
      busy = false;
    }
  });

  init();
})();
