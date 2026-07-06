// ===== Image de partage "story" (1080×1920) pour #soutien =====
// Générée à la volée pour que le partage natif (Instagram/TikTok/Facebook)
// récupère une vraie image prête à poster, pas juste un lien texte.
function drawTeardrop(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.bezierCurveTo(
    cx + size * 0.75, cy - size * 0.2,
    cx + size * 0.75, cy + size * 0.6,
    cx, cy + size * 0.8
  );
  ctx.bezierCurveTo(
    cx - size * 0.75, cy + size * 0.6,
    cx - size * 0.75, cy - size * 0.2,
    cx, cy - size
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

async function generateShareImage(dropCount) {
  // S'assure que HK Grotesk est chargée avant de dessiner le texte : sinon
  // le canvas peut silencieusement retomber sur une police système si
  // l'appel arrive avant la fin du chargement de la fonte.
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([
        document.fonts.load('500 100px "HK Grotesk"'),
        document.fonts.load('400 34px "HK Grotesk"'),
      ]);
    } catch {
      // tant pis, repli sur la police système par défaut du canvas
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#254368';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawTeardrop(ctx, canvas.width / 2, 620, 280, '#df0450');

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 480);
  ctx.quadraticCurveTo(canvas.width / 2 - 60, 560, canvas.width / 2, 640);
  ctx.quadraticCurveTo(canvas.width / 2 + 60, 720, canvas.width / 2, 800);
  ctx.strokeStyle = '#bed7f2';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#bed7f2';
  ctx.font = '500 44px "HK Grotesk", sans-serif';
  ctx.fillText('JE SOUTIENS', canvas.width / 2, 1050);

  ctx.fillStyle = '#fff8ba';
  ctx.font = '500 100px "HK Grotesk", sans-serif';
  ctx.fillText('EASY PEEZY', canvas.width / 2, 1160);

  if (dropCount) {
    ctx.fillStyle = '#df0450';
    ctx.font = '500 56px "HK Grotesk", sans-serif';
    ctx.fillText(`Goutte n°${dropCount}`, canvas.width / 2, 1280);
  }

  ctx.fillStyle = '#bed7f2';
  ctx.font = '400 34px "HK Grotesk", sans-serif';
  ctx.fillText('rejoins le mouvement', canvas.width / 2, 1720);
  ctx.font = '500 34px "HK Grotesk", sans-serif';
  ctx.fillStyle = '#fff8ba';
  ctx.fillText('easy-peezy.fr', canvas.width / 2, 1770);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
