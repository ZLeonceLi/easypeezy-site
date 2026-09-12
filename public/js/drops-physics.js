// ===== Bac à gouttes physique (matter.js) =====
// Simule un bac transparent aux parois invisibles dans lequel les gouttes
// tombent, rebondissent puis s'accumulent en tas irrégulier (comme du sable).
// Rendu en Canvas 2D natif : chaque corps est dessiné à la main (pas de
// Matter.Render) pour garder un contrôle total sur les couleurs et le fond
// transparent.
//
// Le bac est "infini" : rien ne limite le nombre de gouttes qu'on peut y
// ajouter. Pour que ça reste fluide même après des milliers de gouttes, on
// ne garde en simulation physique que les plus récentes (celles encore
// susceptibles de bouger) ; dès qu'une goutte s'endort (immobile) et qu'on
// dépasse ce quota, elle est "figée" une bonne fois pour toutes en la
// peignant sur un calque de sédiment permanent, puis retirée du monde
// physique. Elle reste visible à l'identique, juste plus simulée.
function createDropsJar(canvas, options = {}) {
  const { Engine, Composite, Bodies } = Matter;

  const COLORS = ['#df0450', '#254368', '#bed7f2', '#fff8ba'];
  // Tant qu'on est sous ce seuil, toutes les gouttes restent en simulation
  // physique complète (rien n'est figé) : le calque de sédiment ne prend le
  // relais que lorsque le tas devient vraiment conséquent.
  const LIVE_CAP = options.liveCap ?? 400;
  const HARD_CAP = LIVE_CAP * 2;
  const WALL = 40;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = canvas.clientWidth;
  let height = canvas.clientHeight;
  const ctx = canvas.getContext('2d');

  // Calque de sédiment : les gouttes figées y sont peintes une fois pour
  // toutes et n'en bougent plus jamais.
  const sediment = document.createElement('canvas');
  const sedimentCtx = sediment.getContext('2d');

  const engine = Engine.create();
  engine.gravity.y = 1;
  engine.enableSleeping = true;

  const wallOptions = { isStatic: true, friction: 0.6, restitution: 0.1, label: 'jarWall' };
  let walls = [];
  let initialized = false;

  const buildWalls = () => {
    if (walls.length) Composite.remove(engine.world, walls);
    walls = [
      Bodies.rectangle(width / 2, height + WALL / 2, width + WALL * 2, WALL, wallOptions),
      Bodies.rectangle(-WALL / 2, height / 2, WALL, height * 3, wallOptions),
      Bodies.rectangle(width + WALL / 2, height / 2, WALL, height * 3, wallOptions),
    ];
    Composite.add(engine.world, walls);
  };

  // (Re)dimensionne les deux canvas (bac + sédiment) à la taille CSS actuelle
  // du parent, en conservant le contenu déjà peint (redessiné à l'échelle) et
  // en repositionnant les murs matter.js en conséquence. Appelé au chargement
  // puis à chaque resize de la fenêtre.
  const resize = () => {
    const newWidth = canvas.clientWidth;
    const newHeight = canvas.clientHeight;
    if (newWidth === 0 || newHeight === 0) return;
    const alreadySized = canvas.width === Math.round(newWidth * dpr) && canvas.height === Math.round(newHeight * dpr);
    if (initialized && alreadySized) return;
    initialized = true;

    const scaleX = width > 0 ? newWidth / width : 1;
    const scaleY = height > 0 ? newHeight / height : 1;

    // Reporte le sédiment déjà peint sur un canvas temporaire à l'ancienne
    // taille, pour pouvoir le redessiner à l'échelle une fois le canvas
    // redimensionné (sinon le redimensionnement l'effacerait).
    const oldSediment = document.createElement('canvas');
    oldSediment.width = sediment.width;
    oldSediment.height = sediment.height;
    if (sediment.width > 0 && sediment.height > 0) {
      oldSediment.getContext('2d').drawImage(sediment, 0, 0);
    }

    canvas.width = newWidth * dpr;
    canvas.height = newHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    sediment.width = newWidth * dpr;
    sediment.height = newHeight * dpr;
    sedimentCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (oldSediment.width > 0 && oldSediment.height > 0) {
      sedimentCtx.drawImage(oldSediment, 0, 0, oldSediment.width, oldSediment.height, 0, 0, newWidth, newHeight);
    }

    // Les gouttes encore en simulation physique sont repositionnées/
    // redimensionnées à la même échelle pour rester cohérentes avec le
    // nouveau bac (sinon elles se retrouveraient mal placées ou hors les murs).
    for (const body of live) {
      Matter.Body.setPosition(body, { x: body.position.x * scaleX, y: body.position.y * scaleY });
      const radiusScale = (scaleX + scaleY) / 2;
      if (radiusScale !== 1) {
        Matter.Body.scale(body, radiusScale, radiusScale);
        body.customRadius *= radiusScale;
      }
    }

    width = newWidth;
    height = newHeight;
    buildWalls();
  };

  const paintCircle = (targetCtx, x, y, radius, color) => {
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius, 0, Math.PI * 2);
    targetCtx.fillStyle = color;
    targetCtx.fill();
  };

  const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

  let live = [];
  let totalSettled = 0; // nombre de gouttes déjà figées dans le sédiment

  resize();

  const bake = (body) => {
    paintCircle(sedimentCtx, body.position.x, body.position.y, body.customRadius, body.customColor);
    Composite.remove(engine.world, body);
    totalSettled += 1;
  };

  const bakeOldest = (onlyAsleep) => {
    for (let i = 0; i < live.length; i++) {
      const body = live[i];
      if (onlyAsleep && !body.isSleeping) continue;
      bake(body);
      live.splice(i, 1);
      return true;
    }
    return false;
  };

  const enforceCap = () => {
    while (live.length > LIVE_CAP) {
      if (!bakeOldest(true)) break;
    }
    while (live.length > HARD_CAP) {
      if (!bakeOldest(false)) break;
    }
  };

  const spawnOne = (x, y, radius, color) => {
    const body = Bodies.circle(x, y, radius, {
      restitution: 0.42,
      friction: 0.55,
      frictionAir: 0.018,
      density: 0.0018,
      label: 'drop',
    });
    body.customColor = color;
    body.customRadius = radius;
    Composite.add(engine.world, body);
    live.push(body);
    return body;
  };

  // Toutes les gouttes sortent du même point : le bout de l'entonnoir,
  // aligné avec le centre du bac. Un tout petit jitter évite juste que deux
  // gouttes nées la même frame se superposent pixel pour pixel.
  const SPOUT_JITTER = 5;

  const addDrop = () => {
    const radius = 7 + Math.random() * 5;
    const x = width / 2 + (Math.random() - 0.5) * SPOUT_JITTER;
    const y = -14 - Math.random() * 10;
    spawnOne(x, y, radius, randomColor());
  };

  // Remplit directement le sédiment avec un tas déjà formé (utilisé au
  // chargement pour rejouer un total existant sans relancer une simulation
  // physique complète sur des milliers de corps). Empile ligne par ligne, du
  // fond vers le haut, avec un peu de jitter pour un rendu organique.
  const fillSedimentInstant = (n) => {
    const radius = 9;
    const rowHeight = radius * 1.7;
    let placed = 0;
    let y = height - radius * 0.6;
    while (placed < n && y > radius * 0.4) {
      const cols = Math.max(1, Math.floor(width / (radius * 1.9)));
      const rowOffset = (Math.random() - 0.5) * radius * 0.4;
      for (let c = 0; c < cols && placed < n; c++) {
        const x = radius + c * ((width - radius * 2) / Math.max(cols - 1, 1)) + rowOffset + (Math.random() - 0.5) * 4;
        const jy = y + (Math.random() - 0.5) * 3;
        paintCircle(sedimentCtx, Math.min(Math.max(x, radius), width - radius), jy, radius * (0.85 + Math.random() * 0.3), randomColor());
        placed++;
      }
      y -= rowHeight;
    }
    totalSettled += placed;
  };

  // Ajoute plusieurs gouttes d'un coup (ex : au chargement, pour rejouer le
  // total déjà accumulé). Les plus anciennes sont peintes directement dans
  // le sédiment (instantané, quel que soit leur nombre) ; seules les plus
  // récentes tombent réellement en physique pour l'effet visuel.
  const addMany = (n) => {
    if (n <= 0) return;
    const recent = Math.min(n, LIVE_CAP);
    const bulk = n - recent;
    if (bulk > 0) fillSedimentInstant(bulk);

    let remaining = recent;
    const step = () => {
      if (remaining <= 0) return;
      const batch = Math.min(6, remaining);
      for (let i = 0; i < batch; i++) addDrop();
      remaining -= batch;
      if (remaining > 0) requestAnimationFrame(step);
    };
    step();
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sediment, 0, 0, width, height);
    for (const body of live) {
      paintCircle(ctx, body.position.x, body.position.y, body.customRadius, body.customColor);
    }
  };

  let running = true;
  let lastTime = performance.now();

  const tick = (time) => {
    if (!running) return;
    const delta = Math.min(time - lastTime, 1000 / 30);
    lastTime = time;
    Engine.update(engine, delta);
    enforceCap();
    draw();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) {
      lastTime = performance.now();
      requestAnimationFrame(tick);
    }
  });

  // Le bac suit la largeur fluide de son conteneur (voir CSS) : à chaque
  // resize de fenêtre on redimensionne réellement les canvas et on
  // recalcule les murs, en attendant un peu que le redimensionnement se
  // stabilise (évite de relancer le recalcul à chaque pixel pendant un
  // drag de fenêtre).
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 150);
  });

  return { addDrop, addMany };
}
