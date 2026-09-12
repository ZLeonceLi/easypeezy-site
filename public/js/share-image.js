// ===== Image de partage "story" pour #soutien =====
// Format story (1080×1920), fond en dégradé identique à celui du site
// (baby → cream → cream-2), mascotte en avant (plus grande) avec le produit
// en accent dans son coin, un mini interrupteur "Stress off / Peezy on"
// façon toggle iOS, le nom de la marque en lettrage vintage glamour, et un
// appel à l'action.

// Police "vintage glamour" pour le lettrage "Easy Peezy", auto-hébergée
// (cf. assets/fonts) et injectée une seule fois quelle que soit la page.
(() => {
  if (document.getElementById('share-image-fonts')) return;
  const style = document.createElement('style');
  style.id = 'share-image-fonts';
  style.textContent = `
    @font-face{
      font-family:"Playfair Display";
      font-style:italic;
      font-weight:900;
      src:url("assets/fonts/PlayfairDisplay-BlackItalic.woff2") format("woff2");
      font-display:swap;
    }
  `;
  document.head.appendChild(style);
})();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Reproduit un `linear-gradient(angleDeg, ...)` CSS dans un contexte canvas
// (repère x-droite / y-bas, identique entre CSS et canvas).
function cssLinearGradient(ctx, angleDeg, w, h, stops) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const r = Math.hypot(w, h) / 2;
  const cx = w / 2;
  const cy = h / 2;
  const grad = ctx.createLinearGradient(cx - dx * r, cy - dy * r, cx + dx * r, cy + dy * r);
  stops.forEach(([offset, color]) => grad.addColorStop(offset, color));
  return grad;
}

// Un interrupteur façon toggle iOS, seul (`on` détermine l'état et la
// couleur de la piste, `strike` barre le libellé pour marquer un "off").
function drawSwitch(ctx, cx, cy, { trackW, trackH, on, label, strike }) {
  const r = trackH / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(21,44,71,.26)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 9;
  ctx.fillStyle = on ? '#df0450' : '#d7e0ea';
  roundRectPath(ctx, cx - trackW / 2, cy - trackH / 2, trackW, trackH, r);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 5;
  ctx.strokeStyle = '#254368';
  roundRectPath(ctx, cx - trackW / 2, cy - trackH / 2, trackW, trackH, r);
  ctx.stroke();

  const knobR = r - 13;
  const knobX = on ? cx + trackW / 2 - r : cx - trackW / 2 + r;
  ctx.save();
  ctx.shadowColor = 'rgba(21,44,71,.4)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(knobX, cy, knobR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const labelY = cy - trackH / 2 - 26;
  ctx.font = '700 32px "HK Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = on ? '#254368' : '#94a2b3';
  ctx.fillText(label, cx, labelY);
  if (strike) {
    const w = ctx.measureText(label).width;
    ctx.strokeStyle = '#94a2b3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, labelY - 11);
    ctx.lineTo(cx + w / 2, labelY - 11);
    ctx.stroke();
  }
}

// Deux interrupteurs empilés : "STRESS" éteint au-dessus, "PEEZY" allumé
// en dessous.
function drawToggles(ctx, cx, cy) {
  const trackW = 280;
  const trackH = 108;
  const rowGap = 175;
  drawSwitch(ctx, cx, cy - rowGap / 2, { trackW, trackH, on: false, label: 'STRESS', strike: true });
  drawSwitch(ctx, cx, cy + rowGap / 2, { trackW, trackH, on: true, label: 'PEEZY', strike: false });
}

async function generateShareImage(dropCount) {
  // S'assure que les polices sont chargées avant de dessiner le texte :
  // sinon le canvas peut silencieusement retomber sur une police système si
  // l'appel arrive avant la fin du chargement des fontes.
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([
        document.fonts.load('italic 900 160px "Playfair Display"'),
        document.fonts.load('700 40px "HK Grotesk"'),
      ]);
    } catch {
      // tant pis, repli sur les polices système par défaut du canvas
    }
  }

  const [mascot, product] = await Promise.all([
    loadImage('assets/mascotte.png').catch(() => null),
    loadImage('assets/produit-picto.png').catch(() => null),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // Même dégradé que le fond du site (cf. body { background:
  // linear-gradient(160deg, baby 0%, cream 45%, cream-2 100%) }).
  ctx.fillStyle = cssLinearGradient(ctx, 160, canvas.width, canvas.height, [
    [0, '#bed7f2'],
    [0.45, '#fffdf3'],
    [1, '#fff7e6'],
  ]);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  let y = 280;

  // La mascotte est le visuel dominant (plus grande que le produit), le
  // produit vient en accent, légèrement penché, dans son coin bas-droit.
  // Ombre marquée sur les deux pour bien les détacher du fond dégradé.
  if (mascot) {
    const mw = 560;
    const mh = mw * (mascot.height / mascot.width);
    let bottom = y + mh;
    ctx.save();
    ctx.shadowColor = 'rgba(21,44,71,.4)';
    ctx.shadowBlur = 55;
    ctx.shadowOffsetY = 28;
    ctx.drawImage(mascot, centerX - mw / 2, y, mw, mh);
    ctx.restore();

    if (product) {
      const pw = mw * 0.42;
      const ph = pw * (product.height / product.width);
      const px = centerX + mw / 2 - pw * 0.62;
      const py = y + mh - ph * 0.85;
      ctx.save();
      ctx.shadowColor = 'rgba(21,44,71,.35)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 14;
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((8 * Math.PI) / 180);
      ctx.drawImage(product, -pw / 2, -ph / 2, pw, ph);
      ctx.restore();
      bottom = Math.max(bottom, py + ph);
    }

    y = bottom + 100;
  } else if (product) {
    const pw = 420;
    const ph = pw * (product.height / product.width);
    ctx.save();
    ctx.shadowColor = 'rgba(21,44,71,.35)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.drawImage(product, centerX - pw / 2, y, pw, ph);
    ctx.restore();
    y += ph + 90;
  }

  ctx.textAlign = 'center';

  // "Easy Peezy" en lettrage vintage glamour : serif italique très contrasté.
  ctx.fillStyle = '#df0450';
  ctx.font = 'italic 900 148px "Playfair Display", "Times New Roman", serif';
  ctx.fillText('Easy Peezy', centerX, y);
  y += 230;

  // Deux interrupteurs : "Stress" éteint, "Peezy" allumé.
  drawToggles(ctx, centerX, y);
  y += 210;

  ctx.textAlign = 'center';

  // Appel à l'action, dans les tons du site (navy sur fond clair).
  ctx.fillStyle = '#254368';
  ctx.font = '700 56px "HK Grotesk", sans-serif';
  ctx.fillText('Ajoute ta goutte !', centerX, y);
  y += 86;

  // Le numéro s'affiche pour toute goutte à partir de la 100e : au-delà de
  // ce jalon, chaque goutte devient un score qu'on a envie d'afficher.
  if (dropCount && dropCount >= 100) {
    ctx.fillStyle = '#df0450';
    ctx.font = '700 40px "HK Grotesk", sans-serif';
    ctx.fillText(`Goutte n°${dropCount}`, centerX, y);
    y += 66;
  }

  // Domaine bien visible : c'est la façon la plus fiable de ramener vers le
  // site depuis une story (Instagram/TikTok n'exposent pas de lien cliquable
  // automatique pour une image partagée via le Web Share API standard).
  ctx.fillStyle = '#df0450';
  ctx.font = '700 44px "HK Grotesk", sans-serif';
  ctx.fillText('→ easy-peezy.fr', centerX, y);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
