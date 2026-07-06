// ===== Image de partage "sticker" pour #soutien =====
// Format story (1080×1920), fond entièrement transparent : juste la
// mascotte, le nom de la marque en lettrage vintage glamour et un appel à
// l'action, sans cadre ni carte — pensé pour flotter sur la photo/vidéo de
// la story de la personne qui partage, comme un vrai sticker.

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

  let mascot = null;
  try {
    mascot = await loadImage('assets/mascotte.png');
  } catch {
    // pas bloquant : le sticker se dessine sans la mascotte si l'image manque
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  // Rien n'est peint en fond : le canvas reste 100% transparent (alpha).

  const centerX = canvas.width / 2;
  let y = canvas.height / 2 - 260;

  // Mascotte seule, avec une ombre douce pour rester lisible sur n'importe
  // quel fond de story (plus de carte derrière pour la détacher).
  if (mascot) {
    const mw = 460;
    const mh = mw * (mascot.height / mascot.width);
    ctx.save();
    ctx.shadowColor = 'rgba(21,44,71,.45)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    ctx.drawImage(mascot, centerX - mw / 2, y, mw, mh);
    ctx.restore();
    y += mh + 80;
  }

  ctx.textAlign = 'center';

  // "Easy Peezy" en lettrage vintage glamour : serif italique très contrasté,
  // couleur crimson avec une ombre navy douce pour le détacher du fond.
  ctx.save();
  ctx.shadowColor = 'rgba(21,44,71,.5)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#df0450';
  ctx.font = 'italic 900 148px "Playfair Display", "Times New Roman", serif';
  ctx.fillText('Easy Peezy', centerX, y);
  ctx.restore();
  y += 130;

  // Appel à l'action
  ctx.save();
  ctx.shadowColor = 'rgba(21,44,71,.5)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 56px "HK Grotesk", sans-serif';
  ctx.fillText('Ajoute ta goutte !', centerX, y);
  ctx.restore();
  y += 90;

  // Le numéro n'est affiché que pour une goutte "ronde" (100e, 200e, ...) :
  // un vrai jalon à afficher fièrement, pas un numéro de série pour tout le monde.
  if (dropCount && dropCount % 100 === 0) {
    ctx.fillStyle = '#df0450';
    ctx.font = '700 40px "HK Grotesk", sans-serif';
    ctx.fillText(`Goutte n°${dropCount}`, centerX, y);
    y += 70;
  }

  // Domaine bien visible : c'est la seule façon fiable de ramener vers le
  // site depuis une story (Instagram/TikTok n'exposent pas de lien cliquable
  // automatique pour une image partagée via le Web Share API standard).
  ctx.fillStyle = '#fff8ba';
  ctx.font = '700 44px "HK Grotesk", sans-serif';
  ctx.fillText('→ easy-peezy.fr', centerX, y);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
