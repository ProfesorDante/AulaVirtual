'use strict';

/*
  REY DE LA COLINA · FASE 7
  Idea original: Pipe
  Motor limpio: mapa superior de 360°, tronco irregular, dos anillos y corazón central.
*/

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const screens = {
  cover: $('#coverScreen'), mode: $('#modeScreen'), character: $('#characterScreen'),
  ally: $('#allyScreen'), ready: $('#readyScreen'), game: $('#gameScreen'), rival: $('#rivalScreen'), victory: $('#victoryScreen')
};
const ui = {
  coverStart: $('#coverStart'), coverFrame: $('#coverFrame'), teamSummary: $('#teamSummary'),
  startLevel: $('#startLevel'), score: $('#scoreLabel'), rivalScore: $('#rivalScoreLabel'), flagIcon: $('#flagStateIcon'),
  flagLabel: $('#flagStateLabel'), pause: $('#pauseButton'), playAgain: $('#playAgain'),
  changeChoices: $('#changeChoices'), victoryTeam: $('#victoryTeam'), hint: $('#controlHint'),
  gameShell: $('#gameShell'), hearts: $('#heartsLabel')
};
const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d');

const CONFIG = Object.freeze({
  width: 1600, height: 900, cx: 800, cy: 455,
  playerRadius: 25, speed: 265, jumpDuration: .46, jumpCooldown: .08,
  flagPassDistance: 63, flagPassCooldown: .72, aiFollowDistance: 96,
  targetScore: 20, scoreEvery: .7, centerRadius: 92,
  maxHearts: 3, hitInvulnerability: 1.15, gorillaRadius: 30,
  itemPickupRadius: 48, bootsDuration: 8, parrotDeliveryEvery: 8, bearThrowEvery: 12, ballSpeed: 600
});

const CHARACTERS = Object.freeze({
  tina: { name: 'Tina', emoji: '🐒', color: '#f47fb2' },
  nito: { name: 'Nito', emoji: '🐵', color: '#58a8ed' }
});
const ALLIES = Object.freeze({
  loro: { name: 'Loro', emoji: '🦜' },
  perezoso: { name: 'Perezoso', emoji: '🦥' },
  cocodrilo: { name: 'Cocodrilo', emoji: '🐊' }
});

const state = {
  mode: 'solo', selectedCharacter: 'tina', selectedAlly: 'loro', rivalStyle: 'todoterreno', running: false,
  paused: false, score: 0, rivalScore: 0, scoreClock: 0, rivalScoreClock: 0, lastTime: 0, players: [], rivals: [], flag: null, rivalFlag: null,
  ally: null, particles: [], keys: new Set(), touch: new Set(), winner: false,
  flagPassCooldown: 0, flagPassArmed: true, guardians: [], items: [],
  rivalFlags: [], toastTimer: 0, fauna: [], balls: [], bearThrowClock: 12
};

const map = {
  outer: { rx: 650, ry: 385 },
  ridges: [
    { rx: 430, ry: 270, thickness: 22, gaps: [[-.30,.23],[1.16,1.72],[2.55,3.02],[-2.30,-1.86]] },
    { rx: 245, ry: 155, thickness: 20, gaps: [[-.03,.39],[1.78,2.25],[-2.72,-2.30]] }
  ],
  cracks: [
    { x1: 1140, y1: 240, x2: 1245, y2: 168 },
    { x1: 530, y1: 690, x2: 400, y2: 760 },
    { x1: 690, y1: 248, x2: 635, y2: 145 }
  ]
};

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove('is-active'));
  screens[name].classList.add('is-active');
}

function teamMarkup() {
  const first = CHARACTERS[state.selectedCharacter];
  const secondKey = state.selectedCharacter === 'tina' ? 'nito' : 'tina';
  const second = CHARACTERS[secondKey];
  const ally = ALLIES[state.selectedAlly];
  return `<div class="summary-chip"><span>${first.emoji}</span>${first.name}${state.mode === 'solo' ? ' · Vos' : ' · J1'}</div>
    <div class="summary-chip"><span>${second.emoji}</span>${second.name}${state.mode === 'solo' ? ' · IA' : ' · J2'}</div>
    <div class="summary-chip"><span>${ally.emoji}</span>${ally.name}</div>`;
}

function bindMenus() {
  ui.coverStart.addEventListener('click', () => {
    ui.coverFrame.classList.add('is-leaving');
    setTimeout(() => showScreen('mode'), 380);
  });
  $$('[data-mode]').forEach((button) => button.addEventListener('click', () => {
    state.mode = button.dataset.mode; showScreen('character');
  }));
  $$('[data-character]').forEach((button) => button.addEventListener('click', () => {
    state.selectedCharacter = button.dataset.character; showScreen('ally');
  }));
  $$('[data-ally]').forEach((button) => button.addEventListener('click', () => {
    state.selectedAlly = button.dataset.ally; showScreen('rival');
  }));
  $$('[data-rival-style]').forEach((button) => button.addEventListener('click', () => {
    state.rivalStyle = button.dataset.rivalStyle; ui.teamSummary.innerHTML = teamMarkup(); showScreen('ready');
  }));
  $$('[data-back]').forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.back)));
  ui.startLevel.addEventListener('click', startLevel);
  ui.playAgain.addEventListener('click', startLevel);
  ui.changeChoices.addEventListener('click', () => showScreen('mode'));
  ui.pause.addEventListener('click', togglePause);
}

function makePlayer(id, character, x, y, control, ai, team='red') {
  return { id, character, x, y, spawnX: x, spawnY: y, vx: 0, vy: 0, control, ai, team, facing: 1,
    carryingFlag: false, jump: 0, jumpLock: false, trailClock: 0, hearts: CONFIG.maxHearts,
    invulnerable: 0, stun: 0, boots: 0, shield: 0, heldBall: 0, aiClock: 0,
    navLastX: x, navLastY: y, navStuckClock: 0, navEscapeClock: 0, navEscapeAngle: 0, navBias: Math.random()<.5?-1:1 };
}

function resetWorld() {
  state.score = 0; state.rivalScore = 0; state.scoreClock = 0; state.rivalScoreClock = 0; state.winner = false; state.paused = false;
  state.particles = []; state.keys.clear(); state.touch.clear();
  state.flagPassCooldown = 0; state.flagPassArmed = true;
  const other = state.selectedCharacter === 'tina' ? 'nito' : 'tina';
  state.players = [
    makePlayer('p1', state.selectedCharacter, 620, 760, 'p1', false),
    makePlayer('p2', other, 720, 785, 'p2', state.mode === 'solo')
  ];
  state.rivals = [
    makePlayer('b1', 'tina', 980, 165, 'bot', true, 'blue'),
    makePlayer('b2', 'nito', 1080, 205, 'bot', true, 'blue')
  ];
  state.flag = { x: 800, y: 775, carrier: null, bob: 0, vx: 0, vy: 0, team:'red' };
  state.rivalFlag = { x: 800, y: 145, carrier: null, bob: 2, vx: 0, vy: 0, team:'blue' };
  state.ally = { type: state.selectedAlly, angle: 1.9, radius: 115, phase: 0, deliveryClock: CONFIG.parrotDeliveryEvery, task: null, carryingItem: null, targetPlayerId: 'p1', retargetClock: 0 };
  state.guardians = [
    makeGorilla('g1', 1290, 300, 0),
    makeGorilla('g2', 310, 635, Math.PI)
  ];
  state.items = [
    makeItem('boots', 1185, 615),
    makeItem('shield', 445, 330)
  ];
  state.rivalFlags = [state.rivalFlag]; state.balls = []; state.bearThrowClock = CONFIG.bearThrowEvery;
  state.fauna = [{ type:'bear', x:145, y:175, angle:.2, speed:34, turnClock:3.2, bob:0, throwPose:0 }];
  ui.score.textContent = '0'; if (ui.rivalScore) ui.rivalScore.textContent='0'; updateFlagHud(); updateHeartsHud();
  ui.gameShell.classList.toggle('is-coop', state.mode === 'coop');
  ui.hint.textContent = state.mode === 'coop' ? 'WASD + E / ESPACIO   ·   FLECHAS + ENTER' : 'WASD + E / ESPACIO';
  ui.hint.classList.remove('is-hidden'); setTimeout(() => ui.hint.classList.add('is-hidden'), 3500);
}

function startLevel() {
  resetWorld(); showScreen('game'); state.running = true;
  state.lastTime = performance.now(); requestAnimationFrame(loop);
}
function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused; ui.pause.textContent = state.paused ? '▶' : 'Ⅱ';
  if (!state.paused) { state.lastTime = performance.now(); requestAnimationFrame(loop); }
}
function loop(now) {
  if (!state.running || state.paused) return;
  const dt = Math.min((now - state.lastTime) / 1000, .033); state.lastTime = now;
  update(dt); draw(); requestAnimationFrame(loop);
}

function update(dt) {
  state.players.forEach((player) => updatePlayer(player, dt));
  state.rivals.forEach((player) => updatePlayer(player, dt));
  updateFlagObject(state.flag, state.players, dt); updateFlagObject(state.rivalFlag, state.rivals, dt); updateAutomaticFlagPass(dt); updateItems(dt); updateBalls(dt); updateGuardians(dt);
  updateAlly(dt); updateFauna(dt); updateBearThrows(dt); updateScoring(dt); updateParticles(dt); updateToast(dt);
}

function inputFor(player) {
  if (player.ai) return aiInput(player);
  if (player.control === 'p1') return {
    left: state.keys.has('KeyA') || state.touch.has('p1-left'),
    right: state.keys.has('KeyD') || state.touch.has('p1-right'),
    up: state.keys.has('KeyW') || state.touch.has('p1-up'),
    down: state.keys.has('KeyS') || state.touch.has('p1-down'),
    action: state.keys.has('KeyE') || state.keys.has('Space') || state.touch.has('p1-action')
  };
  return {
    left: state.keys.has('ArrowLeft') || state.touch.has('p2-left'),
    right: state.keys.has('ArrowRight') || state.touch.has('p2-right'),
    up: state.keys.has('ArrowUp') || state.touch.has('p2-up'),
    down: state.keys.has('ArrowDown') || state.touch.has('p2-down'),
    action: state.keys.has('Enter') || state.touch.has('p2-action')
  };
}

function aiInput(player) {
  if (player.team === 'blue') return rivalAiInput(player);
  const human = state.players.find((p) => !p.ai) || state.players[0];
  const carrier = getCarrier();
  let target;

  if (carrier?.id === player.id) {
    // La IA no intenta ganar sola: lleva la bandera hasta el jugador humano.
    target = human;
  } else if (carrier?.id === human.id) {
    // Se adelanta hacia el corazón del árbol, pero permanece cerca para apoyar.
    const toCenterX = CONFIG.cx - human.x;
    const toCenterY = CONFIG.cy - human.y;
    const len = Math.hypot(toCenterX, toCenterY) || 1;
    target = {
      x: human.x + (toCenterX / len) * CONFIG.aiFollowDistance,
      y: human.y + (toCenterY / len) * CONFIG.aiFollowDistance
    };
  } else if (!carrier) {
    // Recupera la bandera para acercársela al jugador.
    target = state.flag;
  } else {
    target = human;
  }

  // La navegación compartida evita que el compañero vuelva a quedarse empujando un anillo.
  const deadZone = carrier?.id === human.id ? 28 : 14;
  return smartAiDirections(player, target, deadZone);
}

function updatePlayer(player, dt) {
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.stun = Math.max(0, player.stun - dt);
  player.boots = Math.max(0, player.boots - dt);
  const input = player.stun > 0 ? {left:false,right:false,up:false,down:false,action:false} : inputFor(player);
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(dx, dy) || 1; dx /= length; dy /= length;
  const moveSpeed = CONFIG.speed * (player.boots > 0 ? 1.34 : 1);
  const targetVx = dx * moveSpeed, targetVy = dy * moveSpeed;
  player.vx = approach(player.vx, targetVx, 1300 * dt);
  player.vy = approach(player.vy, targetVy, 1300 * dt);
  if (!dx) player.vx = approach(player.vx, 0, 1600 * dt);
  if (!dy) player.vy = approach(player.vy, 0, 1600 * dt);
  if (Math.abs(player.vx) > 8) player.facing = Math.sign(player.vx);

  if (input.action && !player.jumpLock && player.jump <= 0) {
    const teammate = state.players.find((p) => p.id !== player.id);
    if (player.heldBall > 0) throwBall(player);
    else if (player.carryingFlag && teammate && distance(player, teammate) < 105) passFlag(player, teammate);
    else player.jump = CONFIG.jumpDuration;
    player.jumpLock = true;
  }
  if (!input.action) player.jumpLock = false;
  player.jump = Math.max(0, player.jump - dt);

  movePlayer(player, player.vx * dt, player.vy * dt);
  player.trailClock -= dt;
  if ((Math.abs(player.vx) + Math.abs(player.vy)) > 120 && player.trailClock <= 0) {
    state.particles.push({ x: player.x, y: player.y + 20, vx: -player.vx * .08, vy: -player.vy * .08, life: .35, type: 'dust' });
    player.trailClock = .08;
  }
}

function movePlayer(player, dx, dy) {
  const oldX = player.x, oldY = player.y;
  player.x += dx; player.y += dy;
  if (!insideTrunk(player.x, player.y) || (!player.jump && ridgeCollision(player.x, player.y))) {
    player.x = oldX; player.y = oldY;
    if (dx && !dy) player.vx = 0;
    if (dy && !dx) player.vy = 0;
    if (dx && dy) {
      player.x = oldX + dx;
      if (!insideTrunk(player.x, player.y) || (!player.jump && ridgeCollision(player.x, player.y))) player.x = oldX;
      player.y = oldY + dy;
      if (!insideTrunk(player.x, player.y) || (!player.jump && ridgeCollision(player.x, player.y))) player.y = oldY;
    }
  }
}

function irregularScale(angle, seed = 0) {
  return 1 + .055 * Math.sin(angle * 3 + seed) + .035 * Math.sin(angle * 7 - seed * .7) + .018 * Math.cos(angle * 11 + seed);
}
function ellipseRadius(x, y, rx, ry) {
  const nx = (x - CONFIG.cx) / rx, ny = (y - CONFIG.cy) / ry;
  return Math.hypot(nx, ny);
}
function insideTrunk(x, y) {
  const angle = Math.atan2(y - CONFIG.cy, x - CONFIG.cx);
  return ellipseRadius(x, y, map.outer.rx * irregularScale(angle, .4), map.outer.ry * irregularScale(angle, .4)) < .985;
}
function angleInGap(angle, gaps) {
  return gaps.some(([a,b]) => {
    const norm = (v) => Math.atan2(Math.sin(v), Math.cos(v));
    const aa = norm(a), bb = norm(b), t = norm(angle);
    if (aa <= bb) return t >= aa && t <= bb;
    return t >= aa || t <= bb;
  });
}
function ridgeCollision(x, y) {
  const angle = Math.atan2(y - CONFIG.cy, x - CONFIG.cx);
  return map.ridges.some((ridge, index) => {
    if (angleInGap(angle, ridge.gaps)) return false;
    const scale = irregularScale(angle, 1.3 + index);
    const normalized = ellipseRadius(x, y, ridge.rx * scale, ridge.ry * scale);
    const band = ridge.thickness / Math.min(ridge.rx, ridge.ry);
    return Math.abs(normalized - 1) < band;
  });
}

function updateFlagObject(flag, teamPlayers, dt) {
  flag.bob += dt * 4;
  if (!flag.carrier && (Math.abs(flag.vx) + Math.abs(flag.vy) > 1)) {
    const oldX = flag.x, oldY = flag.y;
    flag.x += flag.vx * dt; flag.y += flag.vy * dt;
    if (!insideTrunk(flag.x, flag.y)) { flag.x = oldX; flag.y = oldY; flag.vx *= -.45; flag.vy *= -.45; }
    flag.vx *= Math.pow(.07, dt); flag.vy *= Math.pow(.07, dt);
  }
  const carrier = getCarrier(flag, teamPlayers);
  if (carrier) {
    flag.x = carrier.x + 25 * carrier.facing;
    flag.y = carrier.y - 38 - jumpHeight(carrier) * .5;
    return;
  }
  for (const player of teamPlayers) {
    if (distance(player, flag) < 54) {
      flag.carrier = player.id; player.carryingFlag = true; flag.vx = 0; flag.vy = 0;
      burst(flag.x, flag.y, 14); if(flag===state.flag) updateFlagHud(); break;
    }
  }
}
function passFlag(from, to) {
  if (!from || !to || !from.carryingFlag || from.id === to.id) return;
  from.carryingFlag = false;
  to.carryingFlag = true;
  const flag = from.team==='blue' ? state.rivalFlag : state.flag; flag.carrier = to.id;
  state.flagPassCooldown = CONFIG.flagPassCooldown;
  state.flagPassArmed = false;
  burst((from.x + to.x) / 2, (from.y + to.y) / 2, 10);
  updateFlagHud();
}

function updateAutomaticFlagPass(dt) {
  state.flagPassCooldown = Math.max(0, state.flagPassCooldown - dt);
  if (state.players.length < 2) return;

  const [first, second] = state.players;
  const touching = distance(first, second) <= CONFIG.flagPassDistance;

  // Para volver a pasarla, primero deben separarse. Así la bandera no rebota
  // muchas veces mientras los personajes permanecen superpuestos.
  if (!touching) {
    if (state.flagPassCooldown <= 0) state.flagPassArmed = true;
    return;
  }

  if (!state.flagPassArmed || state.flagPassCooldown > 0) return;
  const carrier = getCarrier();
  if (!carrier) return;
  const teammate = carrier.id === first.id ? second : first;
  passFlag(carrier, teammate);
}
function getCarrier(flag=state.flag, roster=state.players) { return roster.find((p) => p.id === flag.carrier) || null; }
function updateFlagHud() {
  const carrier = getCarrier(state.flag,state.players);
  ui.flagIcon.textContent = carrier ? CHARACTERS[carrier.character].emoji : '🚩';
  ui.flagLabel.textContent = carrier ? CHARACTERS[carrier.character].name.toUpperCase() : 'LIBRE';
}

function chooseAllyTarget() {
  const humans = state.players.filter((p) => !p.ai);
  if (!humans.length) return state.players[0];
  if (humans.length === 1) return humans[0];

  const carrier = getCarrier();
  if (carrier && humans.includes(carrier)) return carrier;

  // En cooperativo, el compañero puede ayudar a cualquiera de los dos.
  // Si uno está más cerca de un peligro o del centro, lo prioriza; si no,
  // alterna de manera suave para no quedarse pegado siempre al J1.
  const centerDist = (p) => Math.hypot(p.x-CONFIG.cx,p.y-CONFIG.cy);
  const threatened = humans.find((p) => state.guardians.some((g) => distance(g,p) < 185));
  if (threatened) return threatened;
  return humans.slice().sort((a,b)=>centerDist(a)-centerDist(b))[0];
}

function updateAlly(dt) {
  state.ally.phase += dt;
  state.ally.retargetClock -= dt;
  if (state.ally.retargetClock <= 0) {
    const chosen = chooseAllyTarget();
    state.ally.targetPlayerId = chosen?.id || 'p1';
    state.ally.retargetClock = 1.35;
  }
  const targetPlayer = state.players.find((p)=>p.id===state.ally.targetPlayerId) || state.players[0];
  if (state.ally.type !== 'loro') {
    state.ally.angle += dt * .8;
    state.ally.x = targetPlayer.x + Math.cos(state.ally.angle) * state.ally.radius;
    state.ally.y = targetPlayer.y + Math.sin(state.ally.angle) * state.ally.radius * .55;
    return;
  }
  updateParrotAlly(dt, targetPlayer);
}


function makeGorilla(id, x, y, angle) {
  return { id, type: 'gorilla', x, y, spawnX: x, spawnY: y, angle, patrolAngle: angle,
    radius: CONFIG.gorillaRadius, speed: 122, rage: 0, jump: null, jumpCooldown: 1 + Math.random(),
    hitCooldown: 0, flagCooldown: 0, targetId: null, retargetClock: 0, chaseClock: 0 };
}
function makeItem(type, x, y) {
  return { id: `${type}-${Math.random().toString(36).slice(2)}`, type, x, y, active: true, bob: Math.random()*6 };
}
function updateHeartsHud() {
  ui.hearts.textContent = state.players.map((p) => '❤️'.repeat(Math.max(0,p.hearts)) || '💔').join(' · ');
}
function showToast(text) {
  let toast = document.querySelector('.event-toast');
  if (!toast) { toast = document.createElement('div'); toast.className='event-toast'; ui.gameShell.appendChild(toast); }
  toast.textContent = text; toast.classList.add('is-visible'); state.toastTimer = 1.45;
}
function updateToast(dt) {
  if (state.toastTimer <= 0) return;
  state.toastTimer -= dt;
  if (state.toastTimer <= 0) document.querySelector('.event-toast')?.classList.remove('is-visible');
}
function updateItems(dt) {
  for (const item of state.items) {
    item.bob += dt*3;
    if (!item.active) continue;
    for (const player of [...state.players, ...state.rivals]) {
      if (distance(player,item) > CONFIG.itemPickupRadius) continue;
      item.active = false;
      if (item.type === 'boots') { player.boots = CONFIG.bootsDuration; showToast(`${CHARACTERS[player.character].emoji} ¡Más velocidad!`); }
      if (item.type === 'shield') { player.shield = 1; showToast(`${CHARACTERS[player.character].emoji} ¡Escudo listo!`); }
      if (item.type === 'ball') { player.heldBall = 1; showToast(`${CHARACTERS[player.character].emoji} ¡Pelota lista!`); }
      burst(item.x,item.y,12);
      break;
    }
  }
}
function dropFlagFrom(player, source, strength=390) {
  if (!player.carryingFlag) return;
  player.carryingFlag = false; const flag=player.team==='blue'?state.rivalFlag:state.flag; flag.carrier = null;
  const a = Math.atan2(player.y-source.y, player.x-source.x) + (Math.random()-.5)*.35;
  flag.x = player.x; flag.y = player.y-18;
  flag.vx = Math.cos(a)*strength; flag.vy = Math.sin(a)*strength;
  state.flagPassArmed = false; state.flagPassCooldown = .55; updateFlagHud();
}
function hitPlayerByGorilla(player, gorilla) {
  if (player.invulnerable>0 || player.jump>0 || gorilla.hitCooldown>0) return;
  gorilla.hitCooldown=.7;
  if (player.shield>0) { player.shield=0; player.invulnerable=.65; burst(player.x,player.y,15); showToast('🛡️ ¡El escudo resistió!'); return; }
  dropFlagFrom(player,gorilla,440);
  player.hearts -= 1; player.invulnerable = CONFIG.hitInvulnerability; player.stun=.28;
  const a=Math.atan2(player.y-gorilla.y,player.x-gorilla.x); player.vx=Math.cos(a)*430; player.vy=Math.sin(a)*430;
  burst(player.x,player.y,16); updateHeartsHud();
  if (player.hearts<=0) {
    player.hearts=CONFIG.maxHearts; player.x=player.spawnX; player.y=player.spawnY; player.vx=0; player.vy=0; player.invulnerable=1.8;
    showToast(`${CHARACTERS[player.character].emoji} volvió al borde`); updateHeartsHud();
  }
}
function chooseGuardianTarget(g) {
  const carrier = getCarrier();
  if (carrier) return carrier;
  return [...state.players,...state.rivals].reduce((best,p)=>!best || distance(g,p)<distance(g,best)?p:best,null);
}
function updateGuardians(dt) {
  for (const g of state.guardians) {
    g.hitCooldown=Math.max(0,g.hitCooldown-dt); g.jumpCooldown=Math.max(0,g.jumpCooldown-dt); g.flagCooldown=Math.max(0,g.flagCooldown-dt);
    g.retargetClock-=dt; g.chaseClock=Math.max(0,g.chaseClock-dt); g.rage=Math.max(0,g.rage-dt);

    if (g.retargetClock<=0) {
      const candidate=chooseGuardianTarget(g);
      const current=[...state.players,...state.rivals].find((p)=>p.id===g.targetId);
      // Mantiene una presa durante un instante, salvo que aparezca alguien con bandera.
      if (!current || candidate?.carryingFlag || g.chaseClock<=0) {
        g.targetId=candidate?.id || null;
        g.chaseClock=.9+Math.random()*.7;
      }
      g.retargetClock=.35+Math.random()*.25;
    }

    const target=[...state.players,...state.rivals].find((p)=>p.id===g.targetId);
    const canChase=target && (target.carryingFlag || distance(g,target)<360);
    if (canChase) {
      if (target.carryingFlag || distance(g,target)<170) g.rage=Math.max(g.rage,.45);
      const d=distance(g,target);
      if (g.jump) updateGorillaJump(g,dt);
      else if (g.jumpCooldown<=0 && d>105 && d<310) startGorillaJump(g,target);
      else moveGorillaToward(g,target.x,target.y,dt,g.rage>0?1.33:1);
    } else {
      // Patrullan por fuera del anillo exterior: el centro queda reservado para el quilombo.
      g.patrolAngle += dt*(g.id==='g1'?.28:-.25);
      const rx=535,ry=318;
      const tx=CONFIG.cx+Math.cos(g.patrolAngle)*rx*irregularScale(g.patrolAngle,1.1);
      const ty=CONFIG.cy+Math.sin(g.patrolAngle)*ry*irregularScale(g.patrolAngle,1.1);
      moveGorillaToward(g,tx,ty,dt,.72);
    }
    if (!g.jump) for (const p of [...state.players,...state.rivals]) if (distance(g,p)<g.radius+CONFIG.playerRadius+3) hitPlayerByGorilla(p,g);
    for (const looseFlag of [state.flag,state.rivalFlag]) {
      if (!looseFlag?.carrier && g.flagCooldown<=0 && distance(g,looseFlag)<g.radius+35) {
        const a=Math.atan2(looseFlag.y-CONFIG.cy,looseFlag.x-CONFIG.cx)+(Math.random()-.5)*1.1;
        looseFlag.vx=Math.cos(a)*520; looseFlag.vy=Math.sin(a)*520; g.flagCooldown=2.2;
        burst(looseFlag.x,looseFlag.y,12); showToast('🦍 ¡El gorila agarró la bandera!');
        break;
      }
    }
  }
}
function moveGorillaToward(g,tx,ty,dt,mult=1) {
  const dx=tx-g.x,dy=ty-g.y,l=Math.hypot(dx,dy)||1;
  const oldX=g.x,oldY=g.y; g.x+=dx/l*g.speed*mult*dt; g.y+=dy/l*g.speed*mult*dt;
  if (!insideTrunk(g.x,g.y)) {g.x=oldX;g.y=oldY;g.patrolAngle+=.5;}
}
function startGorillaJump(g,target) {
  const dx=target.x-g.x,dy=target.y-g.y,l=Math.hypot(dx,dy)||1;
  const dist=Math.min(215,l*.78); const ex=g.x+dx/l*dist,ey=g.y+dy/l*dist;
  g.jump={sx:g.x,sy:g.y,ex,ey,time:0,duration:.38,height:0}; g.jumpCooldown=2.1+Math.random()*.7; g.rage=.8;
}
function updateGorillaJump(g,dt) {
  const j=g.jump;j.time+=dt;const t=Math.min(1,j.time/j.duration);g.x=j.sx+(j.ex-j.sx)*t;g.y=j.sy+(j.ey-j.sy)*t;j.height=Math.sin(Math.PI*t)*54;
  if(t>=1){g.jump=null; for(const p of [...state.players,...state.rivals])if(distance(g,p)<g.radius+CONFIG.playerRadius+18)hitPlayerByGorilla(p,g);}
}
function updateParrotAlly(dt,human) {
  const a=state.ally;
  a.deliveryClock-=dt;
  if (!a.task && a.deliveryClock<=0) {
    let item=state.items.find((it)=>it.active && !it.reserved);
    if (!item) { const ang=Math.random()*Math.PI*2,rad=210+Math.random()*230; item=makeItem(Math.random()<.5?'boots':'shield',CONFIG.cx+Math.cos(ang)*rad,CONFIG.cy+Math.sin(ang)*rad*.62); state.items.push(item); }
    item.reserved=true; a.task='pickup'; a.target=item; a.deliveryClock=CONFIG.parrotDeliveryEvery;
  }
  // Preparado para la fase con rivales: aleja cualquier bandera enemiga suelta.
  const rival=state.rivalFlags.find((f)=>!f.carrier && distance(a,f)<155);
  if (rival) { const ang=Math.atan2(rival.y-CONFIG.cy,rival.x-CONFIG.cx); rival.x+=Math.cos(ang)*150*dt;rival.y+=Math.sin(ang)*150*dt; }
  if (a.task==='pickup' && a.target?.active) {
    moveAllyToward(a,a.target.x,a.target.y,dt,390);
    if(distance(a,a.target)<34){a.target.active=false;a.carryingItem=a.target.type;a.target.reserved=false;a.task='deliver';burst(a.x,a.y,8);}
  } else if (a.task==='deliver') {
    moveAllyToward(a,human.x,human.y-75,dt,430);
    if(distance(a,human)<80){const item=makeItem(a.carryingItem,human.x+45,human.y-20);state.items.push(item);a.carryingItem=null;a.task=null;showToast('🦜 ¡Traje algo!');burst(item.x,item.y,10);}
  } else {
    a.angle+=dt*1.05; const tx=human.x+Math.cos(a.angle)*105,ty=human.y+Math.sin(a.angle)*58-18; moveAllyToward(a,tx,ty,dt,300);
  }
}
function moveAllyToward(a,tx,ty,dt,speed){const dx=tx-(a.x??tx),dy=ty-(a.y??ty),l=Math.hypot(dx,dy)||1;a.x=(a.x??tx)+dx/l*speed*dt;a.y=(a.y??ty)+dy/l*speed*dt;}

function updateFauna(dt) {
  for (const animal of state.fauna) {
    animal.bob += dt*3;
    animal.turnClock -= dt;
    if (animal.turnClock <= 0) {
      animal.angle += (Math.random()-.5)*1.5;
      animal.turnClock = 2.5 + Math.random()*3;
    }
    animal.x += Math.cos(animal.angle)*animal.speed*dt;
    animal.y += Math.sin(animal.angle)*animal.speed*.65*dt;
    // La osita vive en el bosque: si se acerca demasiado al tronco o al borde, gira.
    if (insideTrunk(animal.x,animal.y) || animal.x<70 || animal.x>1530 || animal.y<70 || animal.y>830) {
      animal.angle += Math.PI*.75 + Math.random()*1.2;
      animal.x += Math.cos(animal.angle)*18;
      animal.y += Math.sin(animal.angle)*12;
    }
  }
}
function drawFauna() {
  for (const animal of state.fauna) {
    ctx.save();ctx.translate(animal.x,animal.y+Math.sin(animal.bob)*3);
    ctx.globalAlpha=.18;ctx.fillStyle='#1d120d';ctx.beginPath();ctx.ellipse(0,20,22,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.font='43px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🐻',0,0);ctx.restore();
  }
}

function drawItems(){for(const item of state.items){if(!item.active)continue;ctx.save();ctx.translate(item.x,item.y+Math.sin(item.bob)*5);ctx.font='42px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.type==='boots'?'👟':item.type==='shield'?'🛡️':'⚽',0,0);ctx.restore();}}
function drawGuardians(){for(const g of state.guardians){const h=g.jump?.height||0;ctx.save();ctx.globalAlpha=1;ctx.translate(g.x,g.y-h);ctx.fillStyle='rgba(36,19,13,.28)';ctx.beginPath();ctx.ellipse(0,26+h,30,10,0,0,Math.PI*2);ctx.fill();if(g.rage>0){ctx.fillStyle='rgba(255,70,55,.25)';ctx.beginPath();ctx.arc(0,4,43,0,Math.PI*2);ctx.fill();ctx.font='21px serif';ctx.fillText('😡',0,-42);}ctx.font='57px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🦍',0,0);ctx.restore();}}


function rivalAiInput(player) {
  const ownCarrier=getCarrier(state.rivalFlag,state.rivals);
  const enemyCarrier=getCarrier(state.flag,state.players);
  let target=state.rivalFlag;
  if(player.heldBall>0 && enemyCarrier && distance(player,enemyCarrier)<390){ throwBall(player,enemyCarrier); }
  if(ownCarrier?.id===player.id) target={x:CONFIG.cx,y:CONFIG.cy};
  else if(state.rivalStyle==='defensivo' && enemyCarrier) target=enemyCarrier;
  else if(state.rivalStyle==='ofensivo') target=ownCarrier?{x:CONFIG.cx,y:CONFIG.cy}:state.rivalFlag;
  else if(state.rivalStyle==='tactico') {
    if(!ownCarrier) target=state.rivalFlag;
    else if(enemyCarrier) {
      const dx=CONFIG.cx-enemyCarrier.x,dy=CONFIG.cy-enemyCarrier.y,l=Math.hypot(dx,dy)||1;
      target={x:enemyCarrier.x+dx/l*150,y:enemyCarrier.y+dy/l*150};
    } else target={x:CONFIG.cx+Math.cos(performance.now()/1200+player.id.length)*170,y:CONFIG.cy+Math.sin(performance.now()/1200+player.id.length)*110};
  } else {
    if(ownCarrier?.id===player.id) target={x:CONFIG.cx,y:CONFIG.cy};
    else if(enemyCarrier && distance(player,enemyCarrier)<330) target=enemyCarrier;
    else target=state.rivalFlag;
  }
  return smartAiDirections(player, target, 18);
}

function pointIsWalkable(x,y){
  return insideTrunk(x,y) && !ridgeCollision(x,y);
}
function smartAiDirections(player,target,dead=18){
  const nowStep=44;
  let dx=target.x-player.x, dy=target.y-player.y;
  const dist=Math.hypot(dx,dy)||1;
  let angle=Math.atan2(dy,dx);

  // Si la línea directa termina contra un anillo, prueba ambos costados y elige
  // el que más se acerca al objetivo. No usa pathfinding pesado: funciona bien en celular.
  const ahead=(a,d=nowStep)=>pointIsWalkable(player.x+Math.cos(a)*d,player.y+Math.sin(a)*d);
  if(!ahead(angle)){
    const left=angle+Math.PI/2, right=angle-Math.PI/2;
    const leftOk=ahead(left), rightOk=ahead(right);
    if(leftOk&&rightOk){
      const lx=player.x+Math.cos(left)*nowStep,ly=player.y+Math.sin(left)*nowStep;
      const rx=player.x+Math.cos(right)*nowStep,ry=player.y+Math.sin(right)*nowStep;
      angle=Math.hypot(target.x-lx,target.y-ly)<=Math.hypot(target.x-rx,target.y-ry)?left:right;
    }else if(leftOk) angle=left;
    else if(rightOk) angle=right;
    else angle+=Math.PI*.72*player.navBias;
  }

  // El reloj anti-atascos se actualiza aquí porque esta función se llama cada cuadro.
  const moved=Math.hypot(player.x-player.navLastX,player.y-player.navLastY);
  player.aiClock+=1/60;
  if(player.aiClock>=.28){
    if(moved<7 && dist>70) player.navStuckClock+=.28; else player.navStuckClock=Math.max(0,player.navStuckClock-.42);
    player.navLastX=player.x; player.navLastY=player.y; player.aiClock=0;
  }
  if(player.navStuckClock>.72 && player.navEscapeClock<=0){
    player.navEscapeClock=.68+Math.random()*.35;
    player.navEscapeAngle=angle+(Math.PI*.58+Math.random()*.55)*player.navBias;
    player.navBias*=-1; player.navStuckClock=0;
  }
  if(player.navEscapeClock>0){
    angle=player.navEscapeAngle;
    // updatePlayer descuenta el tiempo real aproximado con el frame cap del juego.
    player.navEscapeClock=Math.max(0,player.navEscapeClock-1/60);
  }

  const mx=Math.cos(angle), my=Math.sin(angle);
  if(dist<=dead) return {left:false,right:false,up:false,down:false,action:false};
  return {left:mx<-.22,right:mx>.22,up:my<-.22,down:my>.22,action:false};
}
function throwBall(player, forcedTarget=null){
  if(player.heldBall<=0)return;
  const opponents=player.team==='blue'?state.players:state.rivals;
  const target=forcedTarget||opponents.reduce((best,p)=>!best||distance(player,p)<distance(player,best)?p:best,null);
  const a=target?Math.atan2(target.y-player.y,target.x-player.x):player.facing>0?0:Math.PI;
  state.balls.push({x:player.x,y:player.y-10,vx:Math.cos(a)*CONFIG.ballSpeed,vy:Math.sin(a)*CONFIG.ballSpeed,life:2.2,ownerTeam:player.team,bounces:2});
  player.heldBall=0; burst(player.x,player.y,7);
}
function updateBalls(dt){
  for(const ball of state.balls){
    const ox=ball.x,oy=ball.y;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=Math.pow(.78,dt);ball.vy*=Math.pow(.78,dt);ball.life-=dt;
    if(!insideTrunk(ball.x,ball.y)){ball.x=ox;ball.y=oy;ball.vx*=-.65;ball.vy*=-.65;ball.bounces--;}
    for(const p of [...state.players,...state.rivals]){
      if(p.team===ball.ownerTeam||p.invulnerable>0||distance(ball,p)>38)continue;
      dropFlagFrom(p,ball,470);p.stun=.35;p.invulnerable=.7;const a=Math.atan2(p.y-ball.y,p.x-ball.x);p.vx=Math.cos(a)*430;p.vy=Math.sin(a)*430;ball.life=0;burst(p.x,p.y,15);showToast('⚽ ¡Pelotazo!');break;
    }
  }
  state.balls=state.balls.filter(b=>b.life>0&&b.bounces>=0);
}
function drawBalls(){for(const b of state.balls){ctx.save();ctx.translate(b.x,b.y);ctx.font='34px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚽',0,0);ctx.restore();}}
function updateBearThrows(dt){
  state.bearThrowClock-=dt;const bear=state.fauna.find(a=>a.type==='bear');if(!bear)return;
  bear.throwPose=Math.max(0,bear.throwPose-dt);
  if(state.bearThrowClock>0)return;
  state.bearThrowClock=CONFIG.bearThrowEvery;bear.throwPose=.8;
  const types=['boots','shield','ball','ball'];const type=types[Math.floor(Math.random()*types.length)];
  const a=Math.atan2(CONFIG.cy-bear.y,CONFIG.cx-bear.x)+(Math.random()-.5)*.6;
  const landing={x:CONFIG.cx+Math.cos(a)*260,y:CONFIG.cy+Math.sin(a)*170};
  state.items.push(makeItem(type,landing.x,landing.y));showToast(`🐻 ¡La osita lanzó ${type==='ball'?'una pelota':'un objeto'}!`);burst(landing.x,landing.y,12);
}
function updateScoring(dt) {
  scoreTeam(state.flag, state.players, 'red', dt);
  scoreTeam(state.rivalFlag, state.rivals, 'blue', dt);
}
function scoreTeam(flag, roster, team, dt) {
  const carrier=getCarrier(flag,roster);
  const inCenter=carrier && Math.hypot(carrier.x-CONFIG.cx,carrier.y-CONFIG.cy)<CONFIG.centerRadius;
  const clockKey=team==='red'?'scoreClock':'rivalScoreClock';
  if(!inCenter){state[clockKey]=0;return;}
  state[clockKey]+=dt;
  if(state[clockKey]>=CONFIG.scoreEvery){
    state[clockKey]-=CONFIG.scoreEvery;
    if(team==='red'){state.score++;ui.score.textContent=String(state.score);if(state.score>=CONFIG.targetScore)winLevel('red');}
    else{state.rivalScore++;if(ui.rivalScore)ui.rivalScore.textContent=String(state.rivalScore);if(state.rivalScore>=CONFIG.targetScore)winLevel('blue');}
    burst(CONFIG.cx+(Math.random()-.5)*90,CONFIG.cy+(Math.random()-.5)*70,9);
  }
}
function winLevel(team='red') {
  if (state.winner) return; state.winner = true; state.running = false;
  ui.victoryTeam.innerHTML = team==='red' ? teamMarkup() : '<div class="summary-chip"><span>🔵</span>GANARON LOS BOTS</div>'; setTimeout(() => showScreen('victory'), 350);
}

function burst(x, y, amount) {
  for (let i=0;i<amount;i++) {
    const a = Math.random()*Math.PI*2, s = 45 + Math.random()*130;
    state.particles.push({ x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.55+Math.random()*.45,type:'star' });
  }
}
function updateParticles(dt) {
  state.particles.forEach((p) => { p.x += p.vx*dt; p.y += p.vy*dt; p.vx *= .97; p.vy *= .97; p.life -= dt; });
  state.particles = state.particles.filter((p) => p.life > 0);
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height); drawForest(); drawTrunk(); drawCenter();
  drawFauna(); drawItems(); drawBalls(); drawFlag(state.flag); drawFlag(state.rivalFlag); drawGuardians(); drawAlly(); [...state.players,...state.rivals].forEach(drawPlayer); drawParticles();
}
function drawForest() {
  const g = ctx.createRadialGradient(CONFIG.cx,CONFIG.cy,210,CONFIG.cx,CONFIG.cy,780);
  g.addColorStop(0,'#397c35'); g.addColorStop(1,'#143e22'); ctx.fillStyle=g; ctx.fillRect(0,0,CONFIG.width,CONFIG.height);
  ctx.globalAlpha=.22; ctx.font='54px serif';
  for (let y=20;y<900;y+=75) for (let x=10;x<1600;x+=82) if (!insideTrunk(x,y)) ctx.fillText((x+y)%3?'🌿':'🌳',x,y);
  ctx.globalAlpha=1;
}
function irregularEllipsePath(rx, ry, seed, points=150) {
  ctx.beginPath();
  for (let i=0;i<=points;i++) {
    const a = i/points*Math.PI*2, s = irregularScale(a,seed);
    const x = CONFIG.cx + Math.cos(a)*rx*s, y = CONFIG.cy + Math.sin(a)*ry*s;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath();
}
function drawTrunk() {
  ctx.save(); ctx.shadowColor='rgba(0,0,0,.36)'; ctx.shadowBlur=35; ctx.shadowOffsetY=18;
  irregularEllipsePath(map.outer.rx,map.outer.ry,.4); ctx.fillStyle='#9b5b2d'; ctx.fill(); ctx.restore();
  irregularEllipsePath(map.outer.rx-18,map.outer.ry-17,.55); ctx.fillStyle='#c98645'; ctx.fill();
  const grain = ctx.createRadialGradient(CONFIG.cx-80,CONFIG.cy-70,30,CONFIG.cx,CONFIG.cy,610);
  grain.addColorStop(0,'rgba(255,217,140,.38)'); grain.addColorStop(.7,'rgba(126,64,28,.08)'); grain.addColorStop(1,'rgba(74,35,17,.32)');
  irregularEllipsePath(map.outer.rx-20,map.outer.ry-20,.55); ctx.fillStyle=grain; ctx.fill();
  map.ridges.forEach((ridge,index)=>drawRidge(ridge,index));
  ctx.strokeStyle='rgba(78,34,18,.55)'; ctx.lineWidth=9; ctx.lineCap='round';
  map.cracks.forEach((c)=>{ctx.beginPath();ctx.moveTo(c.x1,c.y1);ctx.lineTo((c.x1+c.x2)/2+18,(c.y1+c.y2)/2-7);ctx.lineTo(c.x2,c.y2);ctx.stroke();});
}
function drawRidge(ridge,index) {
  const segments=190; ctx.lineWidth=ridge.thickness; ctx.lineCap='round'; ctx.strokeStyle=index===0?'rgba(103,49,22,.64)':'rgba(118,57,25,.68)';
  let drawing=false;
  for(let i=0;i<=segments;i++){
    const a=-Math.PI+i/segments*Math.PI*2;
    if(angleInGap(a,ridge.gaps)){drawing=false;continue;}
    const s=irregularScale(a,1.3+index),x=CONFIG.cx+Math.cos(a)*ridge.rx*s,y=CONFIG.cy+Math.sin(a)*ridge.ry*s;
    if(!drawing){ctx.beginPath();ctx.moveTo(x,y);drawing=true;}else ctx.lineTo(x,y);
    const next=-Math.PI+(i+1)/segments*Math.PI*2;
    if(i===segments||angleInGap(next,ridge.gaps)){ctx.stroke();drawing=false;}
  }
  ctx.lineWidth=3;ctx.strokeStyle='rgba(255,210,126,.34)';
  drawing=false;
  for(let i=0;i<=segments;i++){
    const a=-Math.PI+i/segments*Math.PI*2;if(angleInGap(a,ridge.gaps)){drawing=false;continue;}
    const s=irregularScale(a,1.3+index),x=CONFIG.cx+Math.cos(a)*ridge.rx*s,y=CONFIG.cy+Math.sin(a)*ridge.ry*s;
    if(!drawing){ctx.beginPath();ctx.moveTo(x,y);drawing=true;}else ctx.lineTo(x,y);
    const next=-Math.PI+(i+1)/segments*Math.PI*2;if(i===segments||angleInGap(next,ridge.gaps)){ctx.stroke();drawing=false;}
  }
}
function drawCenter() {
  const pulse=1+Math.sin(performance.now()/260)*.035;
  ctx.save();ctx.translate(CONFIG.cx,CONFIG.cy);ctx.scale(pulse,pulse);
  ctx.beginPath();ctx.ellipse(0,0,104,79,.1,0,Math.PI*2);ctx.fillStyle='rgba(255,211,45,.22)';ctx.fill();
  ctx.lineWidth=8;ctx.strokeStyle='rgba(255,225,74,.75)';ctx.stroke();
  ctx.font='64px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('👑',0,0);ctx.restore();
}
function drawFlag(flag) {
  if (!flag) return; const y=flag.y+Math.sin(flag.bob)*3;
  ctx.save();ctx.translate(flag.x,flag.carrier?y:y-8);
  ctx.strokeStyle='#3a2619';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-12,23);ctx.lineTo(-12,-26);ctx.stroke();
  ctx.fillStyle=flag.team==='blue'?'#3697ff':'#ef3f4c';ctx.beginPath();ctx.moveTo(-10,-25);ctx.lineTo(25,-13);ctx.lineTo(-10,1);ctx.closePath();ctx.fill();
  ctx.restore();
}
function jumpHeight(player) {
  if (!player.jump) return 0; const t=1-player.jump/CONFIG.jumpDuration; return Math.sin(t*Math.PI)*38;
}
function drawPlayer(player) {
  const data=CHARACTERS[player.character], h=jumpHeight(player);
  const moving=Math.hypot(player.vx,player.vy)>45;
  const mood=player.stun>0?'stunned':player.carryingFlag?'happy':player.jump>0?'surprised':moving?'focused':'idle';
  ctx.save();ctx.translate(player.x,player.y-h);
  const blink = player.invulnerable>0 && Math.floor(performance.now()/90)%2===0;
  ctx.globalAlpha=blink?.38:1;

  // Sombra y ficha gruesa, como en Tina Toma la Bandera.
  ctx.fillStyle='rgba(44,22,13,.25)';ctx.beginPath();ctx.ellipse(0,27+h,29,10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=data.color;ctx.beginPath();ctx.arc(0,5,31,0,Math.PI*2);ctx.fill();
  ctx.lineWidth=5;ctx.strokeStyle=player.team==='blue'?'#1676d2':'#d83448';ctx.stroke();
  ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,.72)';ctx.beginPath();ctx.arc(0,5,25,0,Math.PI*2);ctx.stroke();

  // Cara de monito dibujada: se mantiene legible incluso en pantallas pequeñas.
  ctx.fillStyle='#8b4e2d';ctx.beginPath();ctx.arc(0,3,18,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#dca36f';ctx.beginPath();ctx.ellipse(0,8,14,12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8b4e2d';ctx.beginPath();ctx.arc(-17,2,6,0,Math.PI*2);ctx.arc(17,2,6,0,Math.PI*2);ctx.fill();

  let eyeY=0, look=player.facing*2.2;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-6,eyeY,4.4,5.2,0,0,Math.PI*2);ctx.ellipse(6,eyeY,4.4,5.2,0,0,Math.PI*2);ctx.fill();
  if(mood==='stunned'){
    ctx.strokeStyle='#382018';ctx.lineWidth=2;[-6,6].forEach(x=>{ctx.beginPath();ctx.moveTo(x-3,-3);ctx.lineTo(x+3,3);ctx.moveTo(x+3,-3);ctx.lineTo(x-3,3);ctx.stroke();});
  }else{
    ctx.fillStyle='#302019';ctx.beginPath();ctx.arc(-6+look,eyeY,2.1,0,Math.PI*2);ctx.arc(6+look,eyeY,2.1,0,Math.PI*2);ctx.fill();
  }
  ctx.strokeStyle='#4b241c';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();
  if(mood==='happy'){ctx.arc(0,7,7,0.12*Math.PI,.88*Math.PI);}
  else if(mood==='surprised'||mood==='stunned'){ctx.arc(0,10,3.5,0,Math.PI*2);}
  else if(mood==='focused'){ctx.moveTo(-6,12);ctx.quadraticCurveTo(0,9,6,12);}
  else {ctx.arc(0,7,5,.15*Math.PI,.85*Math.PI);}
  ctx.stroke();

  if(player.jump){ctx.font='22px serif';ctx.fillText('✨',player.facing*31,-29);}
  if(player.boots>0){ctx.font='18px serif';ctx.fillText('👟',-25,32);}
  if(player.heldBall>0){ctx.font='19px serif';ctx.fillText('⚽',25,32);}
  if(player.shield>0){ctx.strokeStyle='rgba(119,222,255,.95)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,5,39,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
function drawAlly() {
  const ally=ALLIES[state.ally.type]; ctx.save();ctx.translate(state.ally.x,state.ally.y+Math.sin(state.ally.phase*4)*7);
  ctx.globalAlpha=.22;ctx.fillStyle='#24130d';ctx.beginPath();ctx.ellipse(0,22,24,8,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.font='47px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ally.emoji,0,0);ctx.restore();
}
function drawParticles() {
  ctx.textAlign='center';ctx.textBaseline='middle';
  state.particles.forEach((p)=>{ctx.globalAlpha=Math.max(0,p.life*1.8);ctx.font=p.type==='dust'?'17px serif':'22px serif';ctx.fillText(p.type==='dust'?'·':'✨',p.x,p.y);});ctx.globalAlpha=1;
}

function approach(value,target,amount){return value<target?Math.min(value+amount,target):Math.max(value-amount,target)}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}

window.addEventListener('keydown',(event)=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();
  state.keys.add(event.code); if(event.code==='Escape')togglePause();
},{passive:false});
window.addEventListener('keyup',(event)=>state.keys.delete(event.code));
$$('[data-touch]').forEach((button)=>{
  const key=button.dataset.touch;
  const on=(event)=>{event.preventDefault();state.touch.add(key);};
  const off=(event)=>{event.preventDefault();state.touch.delete(key);};
  button.addEventListener('pointerdown',on);button.addEventListener('pointerup',off);button.addEventListener('pointercancel',off);button.addEventListener('pointerleave',off);
});
window.addEventListener('blur',()=>{state.keys.clear();state.touch.clear();});

bindMenus();
