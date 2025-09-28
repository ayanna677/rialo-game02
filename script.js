// Rialo Space Shooter - polished version with animations and working controls
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const statusTitle = document.getElementById('statusTitle');
  const statusText = document.getElementById('statusText');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const shootBtn = document.getElementById('shootBtn');

  let W = 1280, H = 720;
  let scale = 1;
  let player, bullets = [], enemies = [], particles = [], stars = [];
  let lastTime = 0, spawnTimer = 0;
  let score = 0, lives = 3;
  let keys = { left: false, right: false, shoot: false };
  let isRunning = false;

  // Setup stars for background
  for (let i=0;i<160;i++) {
    stars.push({ x: Math.random()*W, y: Math.random()*H, s: Math.random()*1.8+0.2, t: Math.random()*10000 });
  }

  function fitCanvas() {
    const wrap = document.getElementById('game-wrap');
    const rect = wrap.getBoundingClientRect();
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    scale = rect.width / W;
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  function rand(a,b){ return Math.random()*(b-a)+a; }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

  function createPlayer(){ return { x: W/2, y: H-110, w: 64, h: 64, vx:0, speed:520, cooldown:0, aura:0 }; }

  function drawPlayer(p){
    ctx.save(); ctx.translate(p.x, p.y);
    // pulsating aura
    p.aura += 0.08;
    const auraSize = 36 + Math.sin(p.aura)*8;
    const grd = ctx.createRadialGradient(0,0,auraSize*0.1,0,0,auraSize);
    grd.addColorStop(0, 'rgba(255,92,158,0.25)');
    grd.addColorStop(1, 'rgba(255,92,158,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(0, 8, auraSize, auraSize*0.5, 0, 0, Math.PI*2);
    ctx.fill();

    // ship body
    ctx.fillStyle = '#ff5c9e';
    ctx.beginPath();
    ctx.moveTo(0, -p.h*0.5);
    ctx.lineTo(p.w*0.5, p.h*0.5);
    ctx.lineTo(0, p.h*0.2);
    ctx.lineTo(-p.w*0.5, p.h*0.5);
    ctx.closePath();
    ctx.fill();

    // cockpit
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, -p.h*0.12, p.w*0.18, p.h*0.12, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  function spawnEnemy(){
    const r = rand(22,46);
    enemies.push({
      x: rand(r, W-r),
      y: -r - 20,
      r: r,
      vx: rand(-60,60),
      vy: rand(80, 220),
      rot: Math.random()*Math.PI*2,
      rotSpeed: rand(-1.2,1.2),
      hp: Math.random()>0.65?2:1
    });
  }

  function fireBullet(){
    if (!player) return;
    if (player.cooldown > 0) return;
    player.cooldown = 10; // frames cooldown
    bullets.push({ x: player.x, y: player.y - 36, vx: rand(-30,30), vy: -820, r:6, trail: [] });
  }

  // Input handlers
  window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.code === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.code === 'Space') keys.shoot = true;
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.code === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.code === 'Space') keys.shoot = false;
  });

  // touch controls
  leftBtn.addEventListener('touchstart', e => { e.preventDefault(); keys.left = true; });
  leftBtn.addEventListener('touchend', e => { e.preventDefault(); keys.left = false; });
  rightBtn.addEventListener('touchstart', e => { e.preventDefault(); keys.right = true; });
  rightBtn.addEventListener('touchend', e => { e.preventDefault(); keys.right = false; });
  shootBtn.addEventListener('touchstart', e => { e.preventDefault(); keys.shoot = true; });
  shootBtn.addEventListener('touchend', e => { e.preventDefault(); keys.shoot = false; });

  // start overlay
  startBtn.addEventListener('click', () => { startGame(); overlay.style.display = 'none'; });
  overlay.addEventListener('click', () => { startGame(); overlay.style.display = 'none'; });

  function startGame(){
    player = createPlayer();
    bullets = []; enemies = []; particles = [];
    score = 0; lives = 3;
    scoreEl.textContent = score; livesEl.textContent = lives;
    isRunning = true; spawnTimer = 0; lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function spawnParticles(x,y,color,count=14){
    for(let i=0;i<count;i++){
      particles.push({ x, y, vx: rand(-260,260), vy: rand(-220,220), life: rand(0.4,1.0), t:0, color });
    }
  }

  function loop(t){
    const dt = Math.min((t-lastTime)/1000, 0.033);
    lastTime = t;
    if (!isRunning) return;

    // spawn enemies
    spawnTimer += dt;
    if (spawnTimer > 0.7) { spawnTimer = 0; spawnEnemy(); }

    // clear background
    ctx.fillStyle = '#001028';
    ctx.fillRect(0,0,W,H);

    // draw stars (parallax)
    ctx.save();
    for (let s of stars){
      const sy = (s.y + Math.sin((t + s.t)/1200) * 6) | 0;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.06 + s.s*0.18) + ')';
      ctx.fillRect(s.x, sy, s.s, s.s);
    }
    ctx.restore();

    // update player
    if (player.cooldown > 0) player.cooldown--;
    if (keys.left) player.x -= player.speed * dt;
    if (keys.right) player.x += player.speed * dt;
    player.x = clamp(player.x, player.w/2, W - player.w/2);
    if (keys.shoot) fireBullet();

    // draw player
    drawPlayer(player);

    // update bullets
    for (let i=bullets.length-1;i>=0;i--){
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // trail store
      b.trail.unshift({ x: b.x, y: b.y, a: 1 });
      if (b.trail.length > 8) b.trail.pop();
      // draw trail
      for (let k=0;k<b.trail.length;k++){
        const tt = b.trail[k];
        const alpha = (1 - k/b.trail.length) * 0.8;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,230,100,' + alpha + ')';
        ctx.ellipse(tt.x, tt.y, 4*(1 - k/b.trail.length) + 1, 3*(1 - k/b.trail.length) + 1, 0,0,Math.PI*2);
        ctx.fill();
      }
      // draw bullet
      ctx.beginPath();
      const g = ctx.createRadialGradient(b.x-2,b.y-2,1,b.x,b.y,12);
      g.addColorStop(0,'#fff');
      g.addColorStop(1,'#ffd34d');
      ctx.fillStyle = g;
      ctx.ellipse(b.x,b.y,b.r,b.r*0.7,0,0,Math.PI*2);
      ctx.fill();
      if (b.y < -20) bullets.splice(i,1);
    }

    // update enemies
    for (let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rot += e.rotSpeed * dt;
      // draw rotating enemy
      ctx.save();
      ctx.translate(e.x,e.y);
      ctx.rotate(e.rot);
      // body
      ctx.fillStyle = '#4dd0ff';
      ctx.beginPath();
      ctx.ellipse(0,0,e.r, e.r*0.8,0,0,Math.PI*2);
      ctx.fill();
      // inner core
      ctx.fillStyle = '#003b7a';
      ctx.beginPath();
      ctx.ellipse(0,0,e.r*0.4,e.r*0.32,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();

      // collision with player
      if (rectCircleCollide(player.x,player.y,player.w,player.h,e.x,e.y,e.r)){
        spawnParticles(e.x,e.y,'#ffb38a');
        enemies.splice(i,1);
        lives--;
        livesEl.textContent = lives;
        if (lives <= 0) endGame();
        continue;
      }

      // bullets vs enemy
      for (let j=bullets.length-1;j>=0;j--){
        const b = bullets[j];
        const dx = b.x - e.x, dy = b.y - e.y;
        if (dx*dx + dy*dy < (b.r + e.r)*(b.r + e.r)){
          bullets.splice(j,1);
          e.hp -= 1;
          spawnParticles(b.x,b.y,'#ffd966',8);
          if (e.hp <= 0){
            spawnParticles(e.x,e.y,'#84ffff',18);
            enemies.splice(i,1);
            score += 10;
            scoreEl.textContent = score;
          } else {
            score += 5;
            scoreEl.textContent = score;
          }
          break;
        }
      }

      if (e.y > H + 80) enemies.splice(i,1);
    }

    // particles
    for (let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const life = p.life; const alpha = Math.max(0, 1 - p.t / life);
      ctx.beginPath();
      ctx.fillStyle = hexToRgba(p.color, alpha);
      ctx.ellipse(p.x, p.y, 4*(1-alpha)+1, 4*(1-alpha)+1, 0,0,Math.PI*2);
      ctx.fill();
      if (p.t > life) particles.splice(i,1);
    }

    requestAnimationFrame(loop);
  }

  function endGame(){
    isRunning = false;
    overlay.style.display = 'flex';
    statusTitle.textContent = 'Game Over';
    statusText.textContent = `Score: ${score}`;
    startBtn.textContent = 'Play Again';
  }

  function rectCircleCollide(px,py,pw,ph,cx,cy,cr){
    const closestX = clamp(cx, px - pw/2, px + pw/2);
    const closestY = clamp(cy, py - ph/2, py + ph/2);
    const dx = cx - closestX; const dy = cy - closestY;
    return dx*dx + dy*dy <= cr*cr;
  }

  function hexToRgba(hex,a){
    const c = hex.replace('#',''); const r = parseInt(c.substr(0,2),16); const g = parseInt(c.substr(2,2),16); const b = parseInt(c.substr(4,2),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // initial overlay
  overlay.style.display = 'flex';
  statusTitle.textContent = 'Rialo Space Shooter';
  statusText.textContent = 'Click / Tap to start. Move with arrows or touch buttons.';

  // Expose start for external use if needed
  window.rialoStart = startGame;
})();
