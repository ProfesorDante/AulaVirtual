'use strict';

/*
  REY DE LA COLINA · ALPHA 6.5 · INSTINTO TERRITORIAL
  Idea original: Pipe
  PvP con empujones, gorilas territoriales, compañero IA corregido y cocodrilo ofensivo.
*/

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const screens = {
  cover: $('#coverScreen'), mode: $('#modeScreen'), character: $('#characterScreen'),
  color: $('#colorScreen'), ally: $('#allyScreen'), ready: $('#readyScreen'), game: $('#gameScreen'), victory: $('#victoryScreen')
};
const ui = {
  coverStart: $('#coverStart'), coverFrame: $('#coverFrame'), teamSummary: $('#teamSummary'),
  startLevel: $('#startLevel'), score: $('#scoreLabel'), rivalScore: $('#rivalScoreLabel'), flagIcon: $('#flagStateIcon'),
  flagLabel: $('#flagStateLabel'), pause: $('#pauseButton'), playAgain: $('#playAgain'),
  changeChoices: $('#changeChoices'), nextLevel: $('#nextLevel'), victoryTeam: $('#victoryTeam'), hint: $('#controlHint'),
  readyLevelLabel: $('#readyLevelLabel'), victoryLevelLabel: $('#victoryLevelLabel'), victoryTitle: $('#victoryTitle'),
  gameShell: $('#gameShell'), hearts: $('#heartsLabel'), rival2Score: $('#rival2ScoreLabel'), humanDot: $('#humanTeamDot'), rivalDot: $('#rivalTeamDot'), rival2Dot: $('#rival2TeamDot')
};
const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d');

const CONFIG = Object.freeze({
  width: 2000, height: 1125, cx: 1000, cy: 570,
  playerRadius: 25, speed: 265, jumpDuration: .46, jumpCooldown: .08,
  flagPassDistance: 63, flagPassCooldown: .72, aiFollowDistance: 96,
  targetScore: 20, scoreEvery: .7, centerRadius: 112, guardianSafeRadius: 205,
  maxHearts: 3, hitInvulnerability: 1.15, gorillaRadius: 30,
  itemPickupRadius: 48, bootsDuration: 8, parrotDeliveryEvery: 8, bearThrowEvery: 12, ballSpeed: 600, eggChance: .20, eggFlightSeconds: 3, demonChickSeconds: 15,
  playerCollisionRadius: 29, pvpPush: 155, baseSafeNormalized: .76, guardianChaseSeconds: 1.25,
  tauntWindow: 1.15, tauntAlternations: 6, tauntRange: 330, gorillaWildSeconds: 8.5,
  penguinSpeed: 820, penguinChargeMin: 1.05, penguinChargeMax: 3.6, penguinRest: 3.0,
  bananaJumpDuration: 8, bananaJumpMultiplier: 1.55, penguinPerfectWindow: .20,
  gorillaVisionRange: 455, gorillaVisionHalfAngle: .82, gorillaHearingRange: 235, gorillaSearchSeconds: 3.8
});

const CHARACTERS = Object.freeze({
  tina: { name: 'Tina', emoji: '🐒', color: '#f47fb2' },
  nito: { name: 'Nito', emoji: '🐵', color: '#58a8ed' }
});
const ALLIES = Object.freeze({
  loro: { name: 'Loro', emoji: '🦜' },
  perro: { name: 'Perro', emoji: '🐕' },
  gallo: { name: 'Gallo', emoji: '🐓' },
  gato: { name: 'Gato', emoji: '🐈' }
});

const TEAM_COLORS = Object.freeze({
  red:{hex:'#ef3f4c',emoji:'🔴',name:'ROJO'}, blue:{hex:'#3697ff',emoji:'🔵',name:'AZUL'},
  green:{hex:'#3fbf63',emoji:'🟢',name:'VERDE'}, gold:{hex:'#f6c945',emoji:'🟡',name:'AMARILLO'},
  purple:{hex:'#9c68df',emoji:'🟣',name:'VIOLETA'}, orange:{hex:'#f08a37',emoji:'🟠',name:'NARANJA'}
});
const AI_STYLES = Object.freeze(['ofensivo','defensivo','todoterreno','tactico','troll','caotico']);
function allPlayers(){ return [...state.players,...state.rivals,...state.rivals2]; }
function rosterForTeam(team){ return team===state.humanTeam?state.players:team===state.rivalTeam?state.rivals:state.rivals2; }
function flagForTeam(team){ return state.flags[team]; }
function randomStyle(){ return AI_STYLES[Math.floor(Math.random()*AI_STYLES.length)]; }


const state = {
  level: 1, mode: 'solo', selectedCharacter: 'tina', selectedAlly: 'loro', selectedColor: 'red', humanTeam:'red', rivalTeam:'blue', rival2Team:'green', running: false,
  paused: false, score: 0, rivalScore: 0, rival2Score: 0, scoreClock: 0, rivalScoreClock: 0, rival2ScoreClock: 0, lastTime: 0, players: [], rivals: [], rivals2: [], flags:{}, flag: null, rivalFlag: null, rival2Flag:null,
  ally: null, particles: [], keys: new Set(), touch: new Set(), winner: false,
  flagPassCooldown: 0, flagPassArmed: true, guardians: [], items: [],
  rivalFlags: [], toastTimer: 0, fauna: [], balls: [], eggs: [], chicks: [], bearThrowClock: 12, staticMap: null, eventFeed: []
};

const map = {
  outer: { rx: 880, ry: 505 },
  ridges: [
    { rx: 650, ry: 385, thickness: 24, gaps: [[-.42,.03],[.72,1.14],[1.65,2.08],[2.72,3.08],[-2.56,-2.12],[-1.42,-1.02]] },
    { rx: 455, ry: 275, thickness: 22, gaps: [[-.12,.34],[.98,1.43],[2.20,2.62],[-2.82,-2.40],[-1.72,-1.28]] },
    { rx: 270, ry: 168, thickness: 20, gaps: [[.15,.58],[1.68,2.12],[-2.65,-2.20],[-1.12,-.68]] }
  ],
  cracks: [
    { x1: 1510, y1: 305, x2: 1690, y2: 205 },
    { x1: 665, y1: 875, x2: 475, y2: 980 },
    { x1: 865, y1: 310, x2: 785, y2: 175 },
    { x1: 1320, y1: 810, x2: 1475, y2: 930 },
    { x1: 435, y1: 470, x2: 285, y2: 430 }
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
  const c=TEAM_COLORS[state.selectedColor];
  return `<div class="summary-chip"><span>${first.emoji}</span>${first.name}${state.mode === 'solo' ? ' · Vos' : ' · J1'} · ${c.emoji}</div>
    <div class="summary-chip"><span>${second.emoji}</span>${second.name}${state.mode === 'solo' ? ' · Tails' : ' · J2'} · ${c.emoji}</div>
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
    state.selectedCharacter = button.dataset.character; showScreen('color');
  }));
  $$('[data-team-color]').forEach((button) => button.addEventListener('click', () => {
    state.selectedColor = button.dataset.teamColor; showScreen('ally');
  }));
  $$('[data-ally]').forEach((button) => button.addEventListener('click', () => {
    state.selectedAlly = button.dataset.ally; ui.teamSummary.innerHTML = teamMarkup(); ui.readyLevelLabel.textContent=`NIVEL ${state.level}`; showScreen('ready');
  }));
  $$('[data-back]').forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.back)));
  ui.startLevel.addEventListener('click', startLevel);
  ui.playAgain.addEventListener('click', startLevel);
  ui.nextLevel.addEventListener('click', () => { state.level = Math.min(3, state.level + 1); startLevel(); });
  ui.changeChoices.addEventListener('click', () => showScreen('mode'));
  ui.pause.addEventListener('click', togglePause);
}

function makePlayer(id, character, x, y, control, ai, team='red') {
  return { id, character, x, y, spawnX: x, spawnY: y, vx: 0, vy: 0, control, ai, team, facing: 1,
    carryingFlag: false, jump: 0, jumpLock: false, trailClock: 0, hearts: CONFIG.maxHearts,
    invulnerable: 0, stun: 0, boots: 0, shield: 0, heldBall: 0, aiClock: 0,
    navLastX: x, navLastY: y, navStuckClock: 0, navEscapeClock: 0, navEscapeAngle: 0, navBias: Math.random()<.5?-1:1,
    flagPickupCooldown: 0, aiSupportMode: 'recover', aiSupportClock: 0, aiJumpCooldown: 0,
    tauntHistory: [], tauntLastAxis: '', tauntCooldown: 0, aiStyle: randomStyle(), outline: id.endsWith('1')||id==='p1'?'black':'white', bananaBoost:0, launched:0, launchPower:0, perfectDodge:0, stompCooldown:0, prevJumpHeight:0,
    aiDecisionClock:0, aiTargetX:x, aiTargetY:y, aiTargetId:null, aiRole:null };
}

function resetWorld() {
  state.score=0;state.rivalScore=0;state.rival2Score=0;state.scoreClock=0;state.rivalScoreClock=0;state.rival2ScoreClock=0;state.winner=false;state.paused=false;
  state.particles=[];state.keys.clear();state.touch.clear();state.flagPassCooldown=0;state.flagPassArmed=true;
  const colors=Object.keys(TEAM_COLORS); state.humanTeam=state.selectedColor;
  const remaining=colors.filter(c=>c!==state.humanTeam); state.rivalTeam=remaining[0]; state.rival2Team=remaining[1];
  const other=state.selectedCharacter==='tina'?'nito':'tina';
  state.players=[makePlayer('p1',state.selectedCharacter,760,1010,'p1',false,state.humanTeam),makePlayer('p2',other,900,1040,'p2',state.mode==='solo',state.humanTeam)];
  state.rivals=[makePlayer('b1','tina',1090,105,'bot',true,state.rivalTeam),makePlayer('b2','nito',1260,145,'bot',true,state.rivalTeam)];
  state.rivals2=[makePlayer('c1','tina',260,245,'bot',true,state.rival2Team),makePlayer('c2','nito',360,330,'bot',true,state.rival2Team)];
  state.flags={};
  state.flags[state.humanTeam]={x:1000,y:1030,carrier:null,bob:0,vx:0,vy:0,team:state.humanTeam};
  state.flags[state.rivalTeam]={x:1000,y:110,carrier:null,bob:2,vx:0,vy:0,team:state.rivalTeam};
  state.flags[state.rival2Team]={x:225,y:485,carrier:null,bob:4,vx:0,vy:0,team:state.rival2Team};
  state.flag=state.flags[state.humanTeam];state.rivalFlag=state.flags[state.rivalTeam];state.rival2Flag=state.flags[state.rival2Team];
  state.ally={id:'ally-1',type:state.selectedAlly,x:820,y:980,angle:1.9,radius:25,phase:0,deliveryClock:CONFIG.parrotDeliveryEvery,task:null,carryingItem:null,targetPlayerId:'p1',retargetClock:0,attackCooldown:0,targetGuardianId:null,decisionClock:0,flagCarry:false,vx:0,vy:0,stun:0,launched:0,invulnerable:0,team:state.humanTeam};
  state.guardians=guardianSetForLevel(state.level);
  state.items=[makeItem('boots',1540,790),makeItem('shield',485,390),makeItem('banana',650,650),makeItem('banana',1320,520),makeItem('banana',1020,835)];
  state.rivalFlags=[state.rivalFlag,state.rival2Flag];state.balls=[];state.eggs=[];state.chicks=[];state.eventFeed=[];document.querySelector('.event-feed')?.remove();state.bearThrowClock=CONFIG.bearThrowEvery;
  state.fauna=[{type:'bear',x:150,y:160,angle:.2,speed:34,turnClock:3.2,bob:0,throwPose:0}];
  ui.score.textContent='0';ui.rivalScore.textContent='0';ui.rival2Score.textContent='0';
  ui.humanDot.textContent=TEAM_COLORS[state.humanTeam].emoji;ui.rivalDot.textContent=TEAM_COLORS[state.rivalTeam].emoji;ui.rival2Dot.textContent=TEAM_COLORS[state.rival2Team].emoji;
  updateFlagHud();updateHeartsHud();ui.gameShell.classList.toggle('is-coop',state.mode==='coop');
  ui.hint.textContent=state.mode==='coop'?'WASD + E / ESPACIO   ·   FLECHAS + ENTER':'WASD + E / ESPACIO';ui.hint.classList.remove('is-hidden');setTimeout(()=>ui.hint.classList.add('is-hidden'),3500);
  showToast(`IA: ${state.rivals.concat(state.rivals2).map(p=>p.aiStyle.toUpperCase()).join(' · ')}`);
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
  state.rivals.forEach((player)=>updatePlayer(player,dt)); state.rivals2.forEach((player)=>updatePlayer(player,dt));
  resolvePlayerCollisions(dt);
  updateSoloCompanion(dt);
  updateTaunts(dt);
  updateFlagObject(state.flag,state.players,dt);updateFlagObject(state.rivalFlag,state.rivals,dt);updateFlagObject(state.rival2Flag,state.rivals2,dt); updateAutomaticFlagPass(dt); updateItems(dt); updateBalls(dt); updateGuardians(dt);
  updateAlly(dt); updateAllyPhysics(dt); updateFauna(dt); updateBearThrows(dt); updateEggsAndChicks(dt); updateScoring(dt); updateParticles(dt); updateToast(dt);
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
  if(player.team!==state.humanTeam)return rivalAiInput(player);
  const human=state.players.find(p=>!p.ai)||state.players[0];const carrier=getCarrier();
  player.aiDecisionClock-=1/60;
  if(carrier?.id===player.id){player.aiTargetX=human.x;player.aiTargetY=human.y;player.aiRole='deliver';player.aiDecisionClock=.18;}
  else if(player.aiDecisionClock<=0){
    let goal;
    if(carrier?.id===human.id){
      const dx=CONFIG.cx-human.x,dy=CONFIG.cy-human.y,l=Math.hypot(dx,dy)||1;
      goal={x:human.x+dx/l*170+(-dy/l)*100*player.navBias,y:human.y+dy/l*170+(dx/l)*100*player.navBias,role:'escort'};
    }else if(!carrier&&player.flagPickupCooldown<=0)goal={x:state.flag.x,y:state.flag.y,role:'recover'};
    else{
      const danger=mostDangerousEnemy(player);
      if(player.aiStyle==='caotico')goal=chooseStableAiTarget(player);
      else if(player.aiStyle==='troll'&&danger)goal={x:danger.x,y:danger.y,role:'harass'};
      else if(danger)goal={x:(danger.x+human.x)/2,y:(danger.y+human.y)/2,role:'support'};
      else goal={x:human.x+150*player.navBias,y:human.y-110,role:'support'};
    }
    player.aiTargetX=goal.x;player.aiTargetY=goal.y;player.aiRole=goal.role;player.aiDecisionClock=.34+Math.random()*.2;
  }
  return smartAiDirections(player,{x:player.aiTargetX,y:player.aiTargetY},player.aiRole==='escort'?65:20);
}

function updateSoloCompanion(dt) {
  if (state.mode !== 'solo') return;
  const bot = state.players.find((p)=>p.ai && p.team===state.humanTeam);
  const human = state.players.find((p)=>!p.ai && p.team===state.humanTeam);
  if (!bot || !human) return;
  if (bot.carryingFlag && distance(bot,human) < 102) {
    passFlag(bot,human);
    bot.flagPickupCooldown = 4.2;
    bot.aiSupportClock = 2.2;
    bot.navBias *= -1;
    // Separación inmediata para evitar el efecto "te la doy, te la saco".
    const dx=bot.x-human.x,dy=bot.y-human.y,l=Math.hypot(dx,dy)||1;
    bot.x += dx/l*72; bot.y += dy/l*72;
  }
}

function updatePlayer(player, dt) {
  player.prevJumpHeight=jumpHeight(player);
  player.stompCooldown=Math.max(0,player.stompCooldown-dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.stun = Math.max(0, player.stun - dt);
  player.boots=Math.max(0,player.boots-dt);player.bananaBoost=Math.max(0,player.bananaBoost-dt);player.perfectDodge=Math.max(0,player.perfectDodge-dt);
  player.flagPickupCooldown = Math.max(0, player.flagPickupCooldown - dt);
  player.aiSupportClock = Math.max(0, player.aiSupportClock - dt);
  player.aiJumpCooldown = Math.max(0, player.aiJumpCooldown - dt);
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
  player.jump=Math.max(0,player.jump-dt);
  if(player.launched>0){
    player.launched=Math.max(0,player.launched-dt);
    player.jump=Math.max(player.jump,.18);
    if(player.launchPower>=5&&player.launched<.35){
      player.x=player.spawnX;player.y=player.spawnY;player.vx=0;player.vy=0;player.invulnerable=1.6;player.launched=0;player.launchPower=0;
    }
  }

  movePlayer(player,player.vx*dt,player.vy*dt);
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

function resolvePlayerCollisions(dt) {
  const all=allPlayers();
  const minDist=CONFIG.playerCollisionRadius*2;
  for(let i=0;i<all.length;i++) for(let j=i+1;j<all.length;j++){
    const a=all[i],b=all[j];
    let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
    if(d>=minDist) continue;
    if(d<.01){dx=1;dy=0;d=1;}

    // Pisotón tipo Mario: el que está claramente en el aire cae sobre el que está abajo.
    const ah=jumpHeight(a),bh=jumpHeight(b);
    const aStomps=ah>22&&bh<10&&a.stompCooldown<=0;
    const bStomps=bh>22&&ah<10&&b.stompCooldown<=0;
    if(aStomps||bStomps){
      const top=aStomps?a:b, victim=aStomps?b:a;
      const sx=victim.x-top.x,sy=victim.y-top.y,sl=Math.hypot(sx,sy)||1;
      dropFlagFrom(victim,top,520);
      victim.vx=sx/sl*560; victim.vy=sy/sl*560; victim.stun=Math.max(victim.stun,.42);
      victim.invulnerable=Math.max(victim.invulnerable,.28);
      top.jump=Math.max(top.jump,CONFIG.jumpDuration*.62); top.stompCooldown=.55;
      victim.stompCooldown=.35;
      burst(victim.x,victim.y,8);
      continue;
    }

    if(a.jump>0||b.jump>0) continue;
    const nx=dx/d,ny=dy/d,overlap=minDist-d;
    const push=overlap*.52;
    const ax=a.x-nx*push,ay=a.y-ny*push,bx=b.x+nx*push,by=b.y+ny*push;
    if(pointIsWalkable(ax,ay)){a.x=ax;a.y=ay;}
    if(pointIsWalkable(bx,by)){b.x=bx;b.y=by;}
    if(a.team!==b.team){
      a.vx-=nx*CONFIG.pvpPush;a.vy-=ny*CONFIG.pvpPush;
      b.vx+=nx*CONFIG.pvpPush;b.vy+=ny*CONFIG.pvpPush;
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
    if (player.flagPickupCooldown <= 0 && distance(player, flag) < 54) {
      flag.carrier = player.id; player.carryingFlag = true; flag.vx = 0; flag.vy = 0;
      burst(flag.x, flag.y, 14); if(flag===state.flag) updateFlagHud(); break;
    }
  }
}
function passFlag(from, to) {
  if (!from || !to || !from.carryingFlag || from.id === to.id) return;
  from.carryingFlag = false;
  to.carryingFlag = true;
  const flag=flagForTeam(from.team);flag.carrier=to.id;
  state.flagPassCooldown = CONFIG.flagPassCooldown;
  state.flagPassArmed = false;
  burst((from.x + to.x) / 2, (from.y + to.y) / 2, 10);
  updateFlagHud();
}

function updateAutomaticFlagPass(dt) {
  state.flagPassCooldown = Math.max(0, state.flagPassCooldown - dt);
  if (state.players.length < 2) return;
  if (state.mode === 'solo' && state.players.some((p)=>p.ai)) return;

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
  if(state.ally.type==='perro'){updateDogAlly(dt,targetPlayer);return;}
  if(state.ally.type==='gallo'){updateRoosterAlly(dt,targetPlayer);return;}
  if(state.ally.type==='gato'){updateCatAlly(dt,targetPlayer);return;}
  updateParrotAlly(dt, targetPlayer);
}


function updateTaunts(dt){
  const humans=allPlayers().filter(p=>!p.ai);
  for(const p of humans){
    p.tauntCooldown=Math.max(0,p.tauntCooldown-dt);
    const L=p.control==='p1'?state.keys.has('KeyA'):state.keys.has('ArrowLeft'),R=p.control==='p1'?state.keys.has('KeyD'):state.keys.has('ArrowRight');
    const U=p.control==='p1'?state.keys.has('KeyW'):state.keys.has('ArrowUp'),D=p.control==='p1'?state.keys.has('KeyS'):state.keys.has('ArrowDown');
    let token='';if(L&&!R)token='L';else if(R&&!L)token='R';else if(U&&!D)token='U';else if(D&&!U)token='D';
    if(token&&token!==p.tauntLastAxis){p.tauntLastAxis=token;p.tauntHistory.push({axis:token,time:performance.now()/1000});}
    const now=performance.now()/1000;p.tauntHistory=p.tauntHistory.filter(e=>now-e.time<=CONFIG.tauntWindow);
    if(p.tauntCooldown<=0&&p.tauntHistory.length>=CONFIG.tauntAlternations){
      const ok=p.tauntHistory.every((e,i,a)=>i===0||((e.axis==='L'&&a[i-1].axis==='R')||(e.axis==='R'&&a[i-1].axis==='L')||(e.axis==='U'&&a[i-1].axis==='D')||(e.axis==='D'&&a[i-1].axis==='U')));
      if(ok){const g=state.guardians.filter(x=>x.type==='gorilla'&&distance(x,p)<=CONFIG.tauntRange).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(g){provokeGorilla(g,p,now);p.tauntCooldown=2.4;p.tauntHistory=[];}}
    }
  }
}

function provokeGorilla(g,p,now){
  g.taunters.set(p.id,now);
  for(const [id,t] of g.taunters) if(now-t>1.8) g.taunters.delete(id);
  g.wildClock=CONFIG.gorillaWildSeconds; g.rage=g.wildClock; g.targetId=null;
  g.wildAngle=Math.atan2(g.y-p.y,g.x-p.x)+(Math.random()-.5)*1.4;g.alertState='furious';g.lastSeenX=p.x;g.lastSeenY=p.y;
  if(g.taunters.size>=2){
    g.personalTargetId=p.id; g.targetId=p.id; g.chaseClock=CONFIG.gorillaWildSeconds;
    showToast('🦍💢 ¡Ahora sí se lo tomó personal!');
  }else{
    g.personalTargetId=null;
    showToast('🦍💢 ¡Provocaron al gorila!');
  }
  burst(g.x,g.y,10);
}


function guardianSetForLevel(level){
  const penguin=makePenguin('penguin-1',1735,755);
  if(level===1)return [penguin,makeSloth('sloth-1',510,620)];
  if(level===2)return [penguin,makeGorilla('g1',1665,320,0),makeGorilla('g2',335,820,Math.PI),makeSloth('sloth-1',1010,860)];
  return [penguin,makeGorilla('g1',1665,320,0),makeGorilla('g2',335,820,Math.PI),makeAnt('ant-1',220,560)];
}
function makeSloth(id,x,y){return{id,type:'sloth',x,y,radius:28,angle:Math.random()*Math.PI*2,speed:28,turnClock:2.5,hugTargetId:null,hugClock:0,hugCooldown:new Map()};}
function makeAnt(id,x,y){return{id,type:'ant',x,y,radius:18,angle:0,speed:92,turnClock:2.2,carry:null,carryClock:0,throwCooldown:new Map()};}
function makeGorilla(id, x, y, angle) {
  return { id, type: 'gorilla', x, y, spawnX: x, spawnY: y, angle, facingAngle:angle, patrolAngle: angle,
    radius: CONFIG.gorillaRadius, speed: 154, rage: 0, jump: null, jumpCooldown: .65 + Math.random()*.55,
    hitCooldown: 0, flagCooldown: 0, targetId: null, retargetClock: 0, chaseClock: 0,
    side: id==='g1' ? 1 : -1, stunned: 0, allyHitCooldown: 0, wildClock: 0,
    personalTargetId: null, taunters: new Map(), wildAngle: angle,
    alertState:'patrol', searchClock:0, investigateX:x, investigateY:y, lastSeenX:x, lastSeenY:y };
}

function makePenguin(id,x,y){
  return {id,type:'penguin',x,y,spawnX:x,spawnY:y,radius:28,state:'wander',angle:Math.PI,
    speed:54,turnClock:2,observeClock:1.4,charge:0,chargeGoal:0,slideVx:0,slideVy:0,
    bouncesLeft:0,restClock:0,hitCooldown:new Map(),targetPoint:null,plannedBounces:0,
    launchX:x,launchY:y,bounceHistory:[],lastBounceX:x,lastBounceY:y,repeatBounce:0,slideAge:0};
}
function makeItem(type, x, y) {
  return { id: `${type}-${Math.random().toString(36).slice(2)}`, type, x, y, active: true, bob: Math.random()*6 };
}
function updateHeartsHud() {
  ui.hearts.textContent = state.players.map((p) => '❤️'.repeat(Math.max(0,p.hearts)) || '💔').join(' · ');
}
function showToast(text) {
  let feed=document.querySelector('.event-feed');
  if(!feed){feed=document.createElement('div');feed.className='event-feed';feed.innerHTML='<div class="event-feed-title">🌳 EVENTOS</div><div class="event-feed-list"></div>';ui.gameShell.appendChild(feed);}
  const list=feed.querySelector('.event-feed-list');
  const row=document.createElement('div');row.className='event-feed-row';row.textContent=text;list.prepend(row);
  while(list.children.length>5)list.lastElementChild.remove();
  setTimeout(()=>row.classList.add('is-fading'),2200);setTimeout(()=>row.remove(),3000);
}
function updateToast(dt) {}
function updateItems(dt) {
  for (const item of state.items) {
    item.bob += dt*3;
    if (!item.active) continue;
    for (const player of allPlayers()) {
      if (distance(player,item) > CONFIG.itemPickupRadius) continue;
      item.active = false;
      if (item.type === 'boots') { player.boots = CONFIG.bootsDuration; showToast(`${CHARACTERS[player.character].emoji} ¡Más velocidad!`); }
      if (item.type === 'shield') { player.shield = 1; showToast(`${CHARACTERS[player.character].emoji} ¡Escudo listo!`); }
      if(item.type==='ball'){player.heldBall=1;showToast(`${CHARACTERS[player.character].emoji} ¡Pelota lista!`);}
      if(item.type==='banana'){player.bananaBoost=CONFIG.bananaJumpDuration;showToast('🍌 ¡SUPER SALTO!  🦍: ¡ESA ERA MI BANANA!');const now=performance.now()/1000;state.guardians.filter(g=>g.type==='gorilla').forEach(g=>{g.taunters.set(player.id,now);g.personalTargetId=player.id;g.targetId=player.id;g.wildClock=CONFIG.gorillaWildSeconds;g.rage=g.wildClock;g.chaseClock=g.wildClock;g.alertState='furious';g.lastSeenX=player.x;g.lastSeenY=player.y;});}
      burst(item.x,item.y,12);
      break;
    }
  }
}
function dropFlagFrom(player, source, strength=390) {
  if (!player.carryingFlag) return;
  player.carryingFlag=false;const flag=flagForTeam(player.team);flag.carrier=null;
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
function guardianDistanceFromCenter(g) {
  return Math.hypot(g.x - CONFIG.cx, g.y - CONFIG.cy);
}
function trunkNormalized(x,y){ return ellipseRadius(x,y,map.outer.rx,map.outer.ry); }
function guardianPointAllowedFor(g,x,y) {
  if (!insideTrunk(x,y)) return false;
  if (g.wildClock>0) return true;
  if (Math.hypot(x-CONFIG.cx,y-CONFIG.cy)<CONFIG.guardianSafeRadius) return false;
  if (g.side<0 && x>CONFIG.cx-20) return false;
  if (g.side>0 && x<CONFIG.cx+20) return false;
  return true;
}
function guardianInterceptPoint(target,g) {
  const dx=target.x-CONFIG.cx,dy=target.y-CONFIG.cy,l=Math.hypot(dx,dy)||1;
  const radius=CONFIG.guardianSafeRadius+34;
  let x=CONFIG.cx+dx/l*radius,y=CONFIG.cy+dy/l*radius;
  if(g.side<0)x=Math.min(x,CONFIG.cx-28);else x=Math.max(x,CONFIG.cx+28);
  return {x,y};
}
function angleDelta(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
function inGorillaTerritory(g,p){
  const inSide=g.side<0?p.x<CONFIG.cx+45:p.x>CONFIG.cx-45;
  const n=trunkNormalized(p.x,p.y);
  return inSide&&n<.93&&Math.hypot(p.x-CONFIG.cx,p.y-CONFIG.cy)>=CONFIG.guardianSafeRadius-12;
}
function gorillaCanSee(g,p){
  if(!inGorillaTerritory(g,p))return false;
  const d=distance(g,p);if(d>CONFIG.gorillaVisionRange)return false;
  const a=Math.atan2(p.y-g.y,p.x-g.x);
  return Math.abs(angleDelta(a,g.facingAngle))<=CONFIG.gorillaVisionHalfAngle;
}
function gorillaCanHear(g,p){
  if(!inGorillaTerritory(g,p)||distance(g,p)>CONFIG.gorillaHearingRange)return false;
  const noisy=Math.hypot(p.vx,p.vy)>185||p.jump>0||p.stun>0||p.carryingFlag;
  return noisy;
}
function chooseVisibleTarget(g){
  return allPlayers().filter(p=>gorillaCanSee(g,p)).sort((a,b)=>{
    const af=(a.carryingFlag?180:0)-distance(g,a),bf=(b.carryingFlag?180:0)-distance(g,b);return bf-af;
  })[0]||null;
}
function chooseHeardTarget(g){
  return allPlayers().filter(p=>gorillaCanHear(g,p)).sort((a,b)=>distance(g,a)-distance(g,b))[0]||null;
}

function updateGuardians(dt) {
  for (const g of state.guardians) {
    if(g.type==='penguin'){ updatePenguin(g,dt); continue; }
    if(g.type==='sloth'){ updateSloth(g,dt); continue; }
    if(g.type==='ant'){ updateAnt(g,dt); continue; }
    g.wildClock=Math.max(0,g.wildClock-dt);
    g.hitCooldown=Math.max(0,g.hitCooldown-dt);g.jumpCooldown=Math.max(0,g.jumpCooldown-dt);
    g.flagCooldown=Math.max(0,g.flagCooldown-dt);g.stunned=Math.max(0,g.stunned-dt);
    g.retargetClock-=dt;g.chaseClock=Math.max(0,g.chaseClock-dt);g.rage=Math.max(0,g.rage-dt);
    g.searchClock=Math.max(0,g.searchClock-dt);
    if(g.stunned>0){g.jump=null;continue;}

    let target=allPlayers().find(p=>p.id===g.targetId)||null;
    if(g.wildClock>0&&g.personalTargetId){
      target=allPlayers().find(p=>p.id===g.personalTargetId)||null;
      g.targetId=target?.id||null;g.chaseClock=g.wildClock;g.alertState='furious';
    }else if(g.retargetClock<=0){
      const seen=chooseVisibleTarget(g);
      if(seen){
        target=seen;g.targetId=seen.id;g.lastSeenX=seen.x;g.lastSeenY=seen.y;
        g.chaseClock=2.5;g.searchClock=CONFIG.gorillaSearchSeconds;g.alertState='chase';g.rage=Math.max(g.rage,.8);
      }else{
        const heard=chooseHeardTarget(g);
        if(heard){
          g.investigateX=heard.x;g.investigateY=heard.y;g.searchClock=2.2;g.alertState='investigate';
          if(!target||!gorillaCanSee(g,target))g.targetId=null;
        }else if(target&&!gorillaCanSee(g,target)){
          g.lastSeenX=target.x;g.lastSeenY=target.y;g.targetId=null;target=null;g.alertState='search';g.searchClock=CONFIG.gorillaSearchSeconds;
        }
      }
      g.retargetClock=.16+Math.random()*.10;
    }

    target=allPlayers().find(p=>p.id===g.targetId)||null;
    if(target&&(g.wildClock>0||gorillaCanSee(g,target)||g.chaseClock>0)){
      g.lastSeenX=target.x;g.lastSeenY=target.y;g.alertState=g.wildClock>0?'furious':'chase';
      const d=distance(g,target);
      if(g.jump)updateGorillaJump(g,dt);
      else if(g.jumpCooldown<=0&&d>82&&d<345)startGorillaJump(g,target);
      else moveGorillaToward(g,target.x,target.y,dt,g.wildClock>0?1.48:1.22);
    }else if(g.searchClock>0){
      const tx=g.alertState==='investigate'?g.investigateX:g.lastSeenX;
      const ty=g.alertState==='investigate'?g.investigateY:g.lastSeenY;
      moveGorillaToward(g,tx,ty,dt,.98);
      if(distance(g,{x:tx,y:ty})<45){g.facingAngle+=dt*2.4*g.side;}
    }else{
      g.alertState='patrol';g.targetId=null;g.personalTargetId=null;
      g.patrolAngle+=dt*(g.side>0?.24:-.24);
      const rx=590,ry=350;
      let tx=CONFIG.cx+Math.cos(g.patrolAngle)*rx*irregularScale(g.patrolAngle,1.1);
      const ty=CONFIG.cy+Math.sin(g.patrolAngle)*ry*irregularScale(g.patrolAngle,1.1);
      tx=g.side<0?Math.min(tx,CONFIG.cx-80):Math.max(tx,CONFIG.cx+80);
      moveGorillaToward(g,tx,ty,dt,.82);
    }

    if(!g.jump)for(const p of allPlayers())if(distance(g,p)<g.radius+CONFIG.playerRadius+5)hitPlayerByGorilla(p,g);
    for(const looseFlag of Object.values(state.flags)){
      if(!looseFlag?.carrier&&g.flagCooldown<=0&&distance(g,looseFlag)<g.radius+35){
        const a=Math.atan2(looseFlag.y-CONFIG.cy,looseFlag.x-CONFIG.cx)+(Math.random()-.5)*1.1;
        looseFlag.vx=Math.cos(a)*520;looseFlag.vy=Math.sin(a)*520;g.flagCooldown=2.2;burst(looseFlag.x,looseFlag.y,10);break;
      }
    }
  }
}

function moveGorillaToward(g,tx,ty,dt,mult=1) {
  const dx=tx-g.x,dy=ty-g.y,l=Math.hypot(dx,dy)||1;
  if(l>5)g.facingAngle=Math.atan2(dy,dx);
  const oldX=g.x,oldY=g.y; g.x+=dx/l*g.speed*mult*dt; g.y+=dy/l*g.speed*mult*dt;
  if (!guardianPointAllowedFor(g,g.x,g.y)) {
    g.x=oldX; g.y=oldY; g.patrolAngle+=.42;
    const awayX=oldX-CONFIG.cx, awayY=oldY-CONFIG.cy, awayLen=Math.hypot(awayX,awayY)||1;
    g.x += awayX/awayLen*g.speed*.45*dt; g.y += awayY/awayLen*g.speed*.45*dt;
  }
}
function startGorillaJump(g,target) {
  const dx=target.x-g.x,dy=target.y-g.y,l=Math.hypot(dx,dy)||1;
  const dist=Math.min(215,l*.78); let ex=g.x+dx/l*dist,ey=g.y+dy/l*dist;
  if (!guardianPointAllowedFor(g,ex,ey)) { const safe=guardianInterceptPoint(target,g); ex=safe.x; ey=safe.y; }
  g.jump={sx:g.x,sy:g.y,ex,ey,time:0,duration:.38,height:0}; g.jumpCooldown=2.1+Math.random()*.7; g.rage=.8;
}
function updateGorillaJump(g,dt) {
  const j=g.jump;j.time+=dt;const t=Math.min(1,j.time/j.duration);g.x=j.sx+(j.ex-j.sx)*t;g.y=j.sy+(j.ey-j.sy)*t;j.height=Math.sin(Math.PI*t)*54;
  if(t>=1){g.jump=null; for(const p of allPlayers())if(distance(g,p)<g.radius+CONFIG.playerRadius+18)hitPlayerByGorilla(p,g);}
}
function updateCrocodileAlly(dt, human) {
  const a=state.ally;
  a.attackCooldown=Math.max(0,a.attackCooldown-dt);
  const threat=state.guardians
    .filter(g=>g.stunned<=0 && distance(g,human)<300)
    .sort((g1,g2)=>distance(g1,human)-distance(g2,human))[0];
  if (threat) {
    a.targetGuardianId=threat.id;
    moveAllyToward(a,threat.x,threat.y,dt,430);
    if (distance(a,threat)<62 && a.attackCooldown<=0) {
      const dx=threat.x-human.x,dy=threat.y-human.y,l=Math.hypot(dx,dy)||1;
      threat.x += dx/l*95; threat.y += dy/l*95;
      threat.stunned=1.05; threat.rage=0; threat.targetId=null; threat.chaseClock=0;
      a.attackCooldown=2.2;
      burst(threat.x,threat.y,12); showToast('🐊 ¡El cocodrilo frenó al gorila!');
    }
    return;
  }
  a.targetGuardianId=null;
  a.angle+=dt*.9;
  const tx=human.x+Math.cos(a.angle)*118,ty=human.y+Math.sin(a.angle)*66;
  moveAllyToward(a,tx,ty,dt,320);
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
function moveAllyToward(a,tx,ty,dt,speed){if(a.stun>0||a.launched>0)return;const dx=tx-a.x,dy=ty-a.y,l=Math.hypot(dx,dy)||1;a.vx=approach(a.vx,dx/l*speed,900*dt);a.vy=approach(a.vy,dy/l*speed,900*dt);const nx=a.x+a.vx*dt,ny=a.y+a.vy*dt;if(pointIsWalkable(nx,ny)){a.x=nx;a.y=ny}else{a.vx*=-.35;a.vy*=-.35;}}
function hitAlly(source,power=430){const a=state.ally;if(!a||a.invulnerable>0)return;const ang=Math.atan2(a.y-source.y,a.x-source.x);a.vx=Math.cos(ang)*power;a.vy=Math.sin(ang)*power;a.stun=.5;a.launched=.65;a.invulnerable=.8;burst(a.x,a.y,8);}
function updateAllyPhysics(dt){const a=state.ally;if(!a)return;a.stun=Math.max(0,a.stun-dt);a.launched=Math.max(0,a.launched-dt);a.invulnerable=Math.max(0,a.invulnerable-dt);if(a.stun>0||a.launched>0){const ox=a.x,oy=a.y;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vx*=Math.pow(.18,dt);a.vy*=Math.pow(.18,dt);if(!insideTrunk(a.x,a.y)){a.x=ox;a.y=oy;a.vx*=-.55;a.vy*=-.55;}}const rival=allPlayers().find(p=>p.team!==state.humanTeam&&distance(a,p)<a.radius+CONFIG.playerRadius-3);if(rival&&a.invulnerable<=0){hitAlly(rival,340);rival.vx*=.7;rival.vy*=.7;showToast(`${CHARACTERS[rival.character].emoji} golpeó a ${ALLIES[a.type].emoji}`);}}


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
    if (insideTrunk(animal.x,animal.y) || animal.x<70 || animal.x>1930 || animal.y<70 || animal.y>1055) {
      animal.angle += Math.PI*.75 + Math.random()*1.2;
      animal.x += Math.cos(animal.angle)*18;
      animal.y += Math.sin(animal.angle)*12;
    }
  }
}
function crowdTargetForPenguin(p){
  const all=allPlayers();
  let best=null;
  for(const anchor of all){
    const near=all.filter(q=>distance(anchor,q)<210);
    if(near.length<2) continue;
    const x=near.reduce((s,q)=>s+q.x,0)/near.length;
    const y=near.reduce((s,q)=>s+q.y,0)/near.length;
    const centerBonus=Math.max(0,1-Math.hypot(x-CONFIG.cx,y-CONFIG.cy)/520)*1.4;
    const score=near.length+centerBonus;
    if(!best||score>best.score) best={x,y,count:near.length,score};
  }
  return best;
}
function choosePenguinShot(p,target,bounces){
  let best={angle:Math.atan2(target.y-p.y,target.x-p.x),score:Infinity};
  for(let i=-10;i<=10;i++){
    const a=best.angle+i*.095; let x=p.x,y=p.y,vx=Math.cos(a),vy=Math.sin(a),left=bounces;
    for(let step=0;step<170;step++){
      const nx=x+vx*18,ny=y+vy*18;
      if(!insideTrunk(nx,ny)||ridgeCollision(nx,ny)){
        const xOk=insideTrunk(x+vx*18,y)&&!ridgeCollision(x+vx*18,y);
        const yOk=insideTrunk(x,y+vy*18)&&!ridgeCollision(x,y+vy*18);
        if(!xOk)vx*=-1;if(!yOk)vy*=-1;if(xOk&&yOk){vx*=-1;vy*=-1;}
        left--; if(left<0)break;
      }else{x=nx;y=ny;}
    }
    const score=Math.hypot(target.x-x,target.y-y);
    if(score<best.score) best={angle:a,score};
  }
  return best.angle;
}
function updatePenguin(p,dt){
  for(const [id,t] of p.hitCooldown) { const n=t-dt; if(n<=0)p.hitCooldown.delete(id); else p.hitCooldown.set(id,n); }
  if(p.state==='rest'){p.restClock-=dt;if(p.restClock<=0){p.state='wander';p.observeClock=.7;}return;}
  if(p.state==='slide'){updatePenguinSlide(p,dt);return;}
  const target=crowdTargetForPenguin(p);
  if(p.state==='charge'){
    p.charge+=dt;
    if(target) p.targetPoint={x:target.x,y:target.y,count:target.count};
    if(!target && p.charge<.65){p.state='wander';p.charge=0;return;}
    if(p.charge>=p.chargeGoal){
      const aim=p.targetPoint||{x:CONFIG.cx,y:CONFIG.cy};
      const angle=choosePenguinShot(p,aim,p.plannedBounces);
      p.slideVx=Math.cos(angle)*CONFIG.penguinSpeed;p.slideVy=Math.sin(angle)*CONFIG.penguinSpeed;
      p.angle=angle;p.bouncesLeft=p.plannedBounces;p.state='slide';p.charge=0;
      p.launchX=p.x;p.launchY=p.y;p.bounceHistory=[];p.lastBounceX=p.x;p.lastBounceY=p.y;p.repeatBounce=0;p.slideAge=0;
      showToast(`🐧 ${['CHASQUIBOOM','FUEGUITO ARTIFICIAL','COHETE','BOMBA','PAL LOBBY'][Math.max(0,(p.chargeLevel||1)-1)]} · ${p.plannedBounces} rebotes`);burst(p.x,p.y,10);return;
    }
    return;
  }
  p.observeClock-=dt;
  if(target && (target.count>=3 || (target.count>=2&&p.observeClock<=0))){
    const d=Math.hypot(target.x-p.x,target.y-p.y);
    const levels=[8,10,12,14,15];
    let tier=Math.min(4,Math.max(0,target.count-2));
    if(d>850) tier=Math.min(4,tier+1);
    if(Math.hypot(target.x-CONFIG.cx,target.y-CONFIG.cy)<230) tier=Math.min(4,tier+1);
    p.chargeLevel=tier+1;p.plannedBounces=levels[tier];
    p.chargeGoal=Math.min(CONFIG.penguinChargeMax,CONFIG.penguinChargeMin+p.plannedBounces*.14+d/1800);
    p.targetPoint={x:target.x,y:target.y,count:target.count};p.state='charge';p.charge=0;return;
  }
  p.turnClock-=dt;if(p.turnClock<=0){p.angle+=(Math.random()-.5)*1.7;p.turnClock=1.5+Math.random()*2.5;}
  const nx=p.x+Math.cos(p.angle)*p.speed*dt,ny=p.y+Math.sin(p.angle)*p.speed*dt;
  if(pointIsWalkable(nx,ny)){p.x=nx;p.y=ny;}else p.angle+=Math.PI*.65;
  if(!target)p.observeClock=Math.min(1.8,p.observeClock+dt*.35);
}
function updatePenguinSlide(p,dt){
  p.slideAge+=dt;
  const speed=Math.hypot(p.slideVx,p.slideVy)||CONFIG.penguinSpeed;
  const step=Math.min(14,speed*dt);
  const parts=Math.max(1,Math.ceil(speed*dt/step));
  const sub=dt/parts;
  for(let s=0;s<parts;s++){
    const nx=p.x+p.slideVx*sub,ny=p.y+p.slideVy*sub;
    if(!insideTrunk(nx,ny)||ridgeCollision(nx,ny)){
      const sx=Math.sign(p.slideVx)||1, sy=Math.sign(p.slideVy)||1;
      const probe=18;
      const xBlocked=!insideTrunk(p.x+sx*probe,p.y)||ridgeCollision(p.x+sx*probe,p.y);
      const yBlocked=!insideTrunk(p.x,p.y+sy*probe)||ridgeCollision(p.x,p.y+sy*probe);
      let angle=Math.atan2(p.slideVy,p.slideVx);
      if(xBlocked) p.slideVx*=-1;
      if(yBlocked) p.slideVy*=-1;
      if(!xBlocked&&!yBlocked){p.slideVx*=-1;p.slideVy*=-1;}

      // Física tramposa: jamás devuelve exactamente el mismo ángulo.
      angle=Math.atan2(p.slideVy,p.slideVx)+(Math.random()-.5)*.34;
      const bounceDist=Math.hypot(p.x-p.lastBounceX,p.y-p.lastBounceY);
      p.repeatBounce=bounceDist<105?p.repeatBounce+1:0;
      p.lastBounceX=p.x;p.lastBounceY=p.y;
      p.bounceHistory.push({x:p.x,y:p.y});
      if(p.bounceHistory.length>6)p.bounceHistory.shift();

      const nearLaunch=Math.hypot(p.x-p.launchX,p.y-p.launchY)<230 && p.slideAge>1.2;
      const loopDetected=p.repeatBounce>=2 || p.bounceHistory.some((b,i,a)=>i<a.length-2&&Math.hypot(b.x-p.x,b.y-p.y)<75);
      if(loopDetected||nearLaunch){
        // Rebote salvaje: rompe el ping-pong y favorece atravesar el centro.
        const toCenter=Math.atan2(CONFIG.cy-p.y,CONFIG.cx-p.x);
        angle=toCenter+(Math.random()-.5)*1.25;
        p.repeatBounce=0;p.bounceHistory=[];
        showToast('🐧💥 ¡REBOTE SALVAJE!');
      }else if(p.bouncesLeft%3===0){
        // Cada pocos impactos recibe una leve ayuda para cruzar zonas nuevas.
        const toCenter=Math.atan2(CONFIG.cy-p.y,CONFIG.cx-p.x);
        angle=angle*.72+toCenter*.28+(Math.random()-.5)*.18;
      }
      const boosted=Math.min(CONFIG.penguinSpeed*1.22,Math.max(CONFIG.penguinSpeed*.96,speed*1.025));
      p.slideVx=Math.cos(angle)*boosted;p.slideVy=Math.sin(angle)*boosted;
      p.bouncesLeft--;burst(p.x,p.y,7);
      // Lo despega de la pared para impedir múltiples rebotes en el mismo cuadro.
      p.x+=Math.cos(angle)*16;p.y+=Math.sin(angle)*16;
      if(p.bouncesLeft<0){p.state='rest';p.restClock=CONFIG.penguinRest;p.slideVx=p.slideVy=0;return;}
    }else{p.x=nx;p.y=ny;}
  }
  p.angle=Math.atan2(p.slideVy,p.slideVx);
  for(const thing of [...allPlayers(),...state.guardians.filter(g=>g!==p),state.ally].filter(Boolean)){
    if(p.hitCooldown.has(thing.id)||distance(p,thing)>p.radius+(thing.radius||CONFIG.playerRadius)+8)continue;
    const a=Math.atan2(thing.y-p.y,thing.x-p.x);
    if(thing.type==='sloth'){p.hitCooldown.set(thing.id,.65);throwCreatureByAnt(thing,p);showToast('🐧💥🦥 ¡El perezoso salió volando!');continue;}
    if(thing.id==='ally-1'){p.hitCooldown.set(thing.id,.65);hitAlly(p,680);showToast(`🐧💥 ${ALLIES[thing.type].emoji} ¡Compañero volando!`);continue;}
    if(thing.type==='gorilla'){p.hitCooldown.set(thing.id,.65);thing.stunned=.8;thing.targetId=null;thing.x+=Math.cos(a)*75;thing.y+=Math.sin(a)*75;burst(thing.x,thing.y,10);continue;}
    if(thing.jump>0&&jumpHeight(thing)>16){p.hitCooldown.set(thing.id,.35);thing.perfectDodge=.55;showToast('✨ ¡ESQUIVE PERFECTO!');burst(thing.x,thing.y,7);continue;}
    p.hitCooldown.set(thing.id,.65);dropFlagFrom(thing,p,520);thing.stun=.42;thing.invulnerable=.8;
    const level=p.chargeLevel||1;const force=[420,520,620,780,980][level-1];thing.vx=Math.cos(a)*force;thing.vy=Math.sin(a)*force;
    if(level>=3){thing.launched=.7+level*.16;thing.launchPower=level;if(level===5)showToast('🚀 ¡PAL LOBBY!');}
    burst(thing.x,thing.y,10);
  }
}


function updateDogAlly(dt,human){const a=state.ally;const enemies=allPlayers().filter(p=>p.team!==state.humanTeam);const near=enemies.sort((x,y)=>distance(human,x)-distance(human,y))[0];const target=near&&distance(human,near)<220?near:{x:human.x-85*human.facing,y:human.y+55};moveAllyToward(a,target.x,target.y,dt,near?360:295);a.attackCooldown=Math.max(0,a.attackCooldown-dt);if(near&&distance(a,near)<58&&a.attackCooldown<=0){pushCreature(near,a,330);a.attackCooldown=1.15;showToast('🐕 ¡Fuera de acá!');}}
function updateRoosterAlly(dt,human){const a=state.ally;const enemies=allPlayers().filter(p=>p.team!==state.humanTeam);const target=enemies.sort((x,y)=>distance(a,x)-distance(a,y))[0];if(target&&distance(target,human)<520)moveAllyToward(a,target.x,target.y,dt,380);else moveAllyToward(a,human.x+90,human.y-60,dt,300);a.attackCooldown=Math.max(0,a.attackCooldown-dt);if(target&&distance(a,target)<52&&a.attackCooldown<=0){pushCreature(target,a,235);target.stun=Math.max(target.stun,.16);a.attackCooldown=1.65;showToast('🐓 ¡PICOTAZO!');}}
function updateCatAlly(dt,human){const a=state.ally,flag=state.flag,carrier=getCarrier();let target;if(carrier){target={x:carrier.x+95*a.radius/115*Math.cos(a.angle),y:carrier.y+58*Math.sin(a.angle)};a.angle+=dt*.7;}else target={x:flag.x+55*Math.cos(a.angle),y:flag.y+35*Math.sin(a.angle)};moveAllyToward(a,target.x,target.y,dt,345);const enemies=allPlayers().filter(p=>p.team!==state.humanTeam&&distance(p,flag)<130);if(!carrier&&enemies.length&&distance(a,flag)<50){const humans=state.players.slice().sort((x,y)=>distance(x,enemies[0])-distance(y,enemies[0]));const safest=humans[humans.length-1];flag.x=safest.x+35;flag.y=safest.y;showToast('🐈 Te salvé. No era tan difícil.');burst(flag.x,flag.y,8);}}
function pushCreature(target,source,power){const ang=Math.atan2(target.y-source.y,target.x-source.x);target.vx=(target.vx||0)+Math.cos(ang)*power;target.vy=(target.vy||0)+Math.sin(ang)*power;dropFlagFrom(target,source,power);}
function updateSloth(s,dt){for(const[id,t]of s.hugCooldown){const n=t-dt;n<=0?s.hugCooldown.delete(id):s.hugCooldown.set(id,n);}if(s.hugTargetId){const targets=[...allPlayers(),state.ally].filter(Boolean);const p=targets.find(x=>x.id===s.hugTargetId);s.hugClock-=dt;if(p&&s.hugClock>0){if(p.id==='ally-1'){p.stun=Math.max(p.stun,.12);p.vx=0;p.vy=0;}else{p.stun=Math.max(p.stun,.12);p.vx=0;p.vy=0;}p.x=s.x+30;p.y=s.y;return;}if(p)s.hugCooldown.set(p.id,6);s.hugTargetId=null;showToast('🦥 ...ya está.');}
  s.turnClock-=dt;if(s.turnClock<=0){s.angle+=(Math.random()-.5)*1.8;s.turnClock=2+Math.random()*3;}const nx=s.x+Math.cos(s.angle)*s.speed*dt,ny=s.y+Math.sin(s.angle)*s.speed*dt;if(pointIsWalkable(nx,ny)){s.x=nx;s.y=ny}else s.angle+=Math.PI*.7;const victim=[...allPlayers(),state.ally].filter(Boolean).find(p=>distance(s,p)<48&&!s.hugCooldown.has(p.id));if(victim){s.hugTargetId=victim.id;s.hugClock=4;showToast('🦥 Abrazo sorpresa...');}}
function creatureName(obj){if(obj.id==='ally-1')return ALLIES[obj.type].emoji+' al compañero';return obj.type==='penguin'?'al pingüino':obj.type==='gorilla'?'al gorila':obj.type==='sloth'?'al perezoso':'a un jugador';}
function throwCreatureByAnt(obj,ant){const ang=Math.atan2(obj.y-ant.y,obj.x-ant.x)+(Math.random()-.5)*1.25;const power=520+Math.random()*180;if(obj.id==='ally-1'){obj.vx=Math.cos(ang)*power;obj.vy=Math.sin(ang)*power;obj.stun=.65;obj.launched=1.0;obj.invulnerable=.8;}else if(obj.type==='penguin'){obj.x+=Math.cos(ang)*22;obj.y+=Math.sin(ang)*22;obj.slideVx=(obj.slideVx||0)+Math.cos(ang)*power*.65;obj.slideVy=(obj.slideVy||0)+Math.sin(ang)*power*.65;/* conserva carga, plan y rebotes */}else if('vx'in obj){obj.vx=Math.cos(ang)*power;obj.vy=Math.sin(ang)*power;obj.stun=Math.max(obj.stun||0,.55);obj.launched=Math.max(obj.launched||0,.9);}else{obj.throwVx=Math.cos(ang)*power;obj.throwVy=Math.sin(ang)*power;obj.throwClock=1.0;}showToast(`🐜 ¡La hormiga lanzó ${creatureName(obj)}!`);burst(obj.x,obj.y,8);}
function updateThrownGuardian(obj,dt){if(!obj.throwClock)return false;obj.throwClock=Math.max(0,obj.throwClock-dt);const ox=obj.x,oy=obj.y;obj.x+=obj.throwVx*dt;obj.y+=obj.throwVy*dt;obj.throwVx*=Math.pow(.22,dt);obj.throwVy*=Math.pow(.22,dt);if(!pointIsWalkable(obj.x,obj.y)){obj.x=ox;obj.y=oy;obj.throwVx*=-.55;obj.throwVy*=-.55;}return true;}
function updateAnt(a,dt){for(const[id,t]of a.throwCooldown){const n=t-dt;n<=0?a.throwCooldown.delete(id):a.throwCooldown.set(id,n);}a.turnClock-=dt;if(a.turnClock<=0){a.angle+=(Math.random()-.5)*1.3;a.turnClock=1.6+Math.random()*2.6;}const nx=a.x+Math.cos(a.angle)*a.speed*dt,ny=a.y+Math.sin(a.angle)*a.speed*dt;if(pointIsWalkable(nx,ny)){a.x=nx;a.y=ny}else a.angle+=Math.PI*(.55+Math.random()*.4);const candidates=[...allPlayers(),...state.guardians.filter(g=>g!==a&&g.type!=='ant'),state.ally].filter(Boolean);const hit=candidates.find(o=>distance(a,o)<a.radius+(o.radius||25)+5&&!a.throwCooldown.has(o.id));if(hit){a.throwCooldown.set(hit.id,4);throwCreatureByAnt(hit,a);a.angle+=Math.PI*.45;}}
function drawFauna() {
  for (const animal of state.fauna) {
    ctx.save();ctx.translate(animal.x,animal.y+Math.sin(animal.bob)*3);
    ctx.globalAlpha=.18;ctx.fillStyle='#1d120d';ctx.beginPath();ctx.ellipse(0,20,22,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.font='43px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🐻',0,0);ctx.restore();
  }
}

function drawItems(){for(const item of state.items){if(!item.active)continue;ctx.save();ctx.translate(item.x,item.y+Math.sin(item.bob)*5);ctx.font='42px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.type==='boots'?'👟':item.type==='shield'?'🛡️':item.type==='banana'?'🍌':'⚽',0,0);ctx.restore();}}
function drawGuardians(){for(const g of state.guardians){
  ctx.save();ctx.translate(g.x,g.y-(g.jump?.height||0));ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.globalAlpha=1;ctx.fillStyle='#23150f';ctx.beginPath();ctx.ellipse(0,27,32,10,0,0,Math.PI*2);ctx.fill();
  if(g.type==='penguin'){if(g.state==='charge'){const t=Math.min(1,g.charge/g.chargeGoal);ctx.strokeStyle='#54d6ff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,38,-Math.PI/2,-Math.PI/2+t*Math.PI*2);ctx.stroke();if((g.chargeLevel||1)>=3){ctx.font='27px serif';ctx.fillText('🪖',0,-25);}}if(g.state==='slide')ctx.rotate(g.angle+Math.PI/2);ctx.font='54px serif';ctx.fillText('🐧',0,0);ctx.restore();continue;}
  if(g.type==='sloth'){ctx.font='52px serif';ctx.fillText('🦥',0,0);if(g.hugTargetId){ctx.font='18px serif';ctx.fillText('🤗',0,-39);}ctx.restore();continue;}
  if(g.type==='ant'){ctx.fillStyle='#111';ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();ctx.font='42px serif';ctx.fillText('🐜',0,0);ctx.restore();continue;}
  /* Gorila completamente opaco: silueta sólida detrás del emoji. */
  ctx.fillStyle='#21130f';ctx.beginPath();ctx.arc(0,2,34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3a2118';ctx.beginPath();ctx.arc(0,2,29,0,Math.PI*2);ctx.fill();if(g.rage>0){ctx.font='22px serif';ctx.fillText(g.wildClock>0?'💢':'😡',0,-45);}ctx.font='58px serif';ctx.fillText('🦍',0,0);ctx.restore();}}



function teamScoreValue(team){return team===state.humanTeam?state.score:team===state.rivalTeam?state.rivalScore:state.rival2Score;}
function centerEnemiesFor(player){return allPlayers().filter(p=>p.team!==player.team&&Math.hypot(p.x-CONFIG.cx,p.y-CONFIG.cy)<CONFIG.centerRadius+65);}
function mostDangerousEnemy(player){
  return allPlayers().filter(p=>p.team!==player.team).sort((a,b)=>{
    const av=(a.carryingFlag?220:0)+(Math.hypot(a.x-CONFIG.cx,a.y-CONFIG.cy)<CONFIG.centerRadius?160:0)+teamScoreValue(a.team)*3-distance(player,a)*.12;
    const bv=(b.carryingFlag?220:0)+(Math.hypot(b.x-CONFIG.cx,b.y-CONFIG.cy)<CONFIG.centerRadius?160:0)+teamScoreValue(b.team)*3-distance(player,b)*.12;
    return bv-av;
  })[0]||null;
}
function chooseStableAiTarget(player){
  const ownFlag=flagForTeam(player.team),team=rosterForTeam(player.team),carrier=getCarrier(ownFlag,team);
  const mate=team.find(p=>p.id!==player.id);const enemy=mostDangerousEnemy(player);const centerEnemies=centerEnemiesFor(player);
  const style=player.aiStyle;
  if(carrier?.id===player.id)return {x:CONFIG.cx+player.navBias*30,y:CONFIG.cy-20,role:'score'};
  if(carrier){
    if(style==='defensivo')return enemy?{x:enemy.x,y:enemy.y,role:'intercept'}:{x:carrier.x+110*player.navBias,y:carrier.y+70,role:'escort'};
    if(style==='troll')return enemy?{x:enemy.x,y:enemy.y,role:'harass'}:{x:CONFIG.cx,y:CONFIG.cy,role:'contest'};
    return centerEnemies[0]?{x:centerEnemies[0].x,y:centerEnemies[0].y,role:'clear'}:{x:carrier.x+145*player.navBias,y:carrier.y-70,role:'escort'};
  }
  const teammateCloser=mate&&distance(mate,ownFlag)<distance(player,ownFlag)-40;
  if(style==='ofensivo')return teammateCloser?{x:CONFIG.cx,y:CONFIG.cy,role:'contest'}:{x:ownFlag.x,y:ownFlag.y,role:'recover'};
  if(style==='defensivo')return enemy?{x:enemy.x,y:enemy.y,role:'intercept'}:{x:ownFlag.x,y:ownFlag.y,role:'recover'};
  if(style==='tactico')return teammateCloser?(enemy?{x:enemy.x,y:enemy.y,role:'intercept'}:{x:CONFIG.cx,y:CONFIG.cy,role:'contest'}):{x:ownFlag.x,y:ownFlag.y,role:'recover'};
  if(style==='troll')return enemy?{x:enemy.x,y:enemy.y,role:'harass'}:{x:CONFIG.cx,y:CONFIG.cy,role:'contest'};
  if(style==='caotico'){
    const choices=[];const banana=state.items.find(i=>i.active&&i.type==='banana');if(banana)choices.push(banana);
    const peng=state.guardians.find(g=>g.type==='penguin');if(peng)choices.push({x:peng.x+110*player.navBias,y:peng.y+60});
    if(enemy)choices.push(enemy);choices.push({x:CONFIG.cx+(Math.random()-.5)*220,y:CONFIG.cy+(Math.random()-.5)*160});
    const c=choices[Math.floor(Math.random()*choices.length)];return {x:c.x,y:c.y,role:'chaos'};
  }
  return teammateCloser?(enemy?{x:enemy.x,y:enemy.y,role:'support'}:{x:CONFIG.cx,y:CONFIG.cy,role:'contest'}):{x:ownFlag.x,y:ownFlag.y,role:'recover'};
}
function rivalAiInput(player){
  player.aiDecisionClock-=1/60;
  player.aiIdleWatch=(player.aiIdleWatch||0)+1/60;
  if(Math.hypot(player.vx,player.vy)>18)player.aiIdleWatch=0;
  if(player.aiIdleWatch>1.8){player.aiDecisionClock=0;player.navStuckClock=1;player.navEscapeClock=.8;player.navEscapeAngle=Math.random()*Math.PI*2;player.aiIdleWatch=0;}
  if(player.aiDecisionClock<=0||!Number.isFinite(player.aiTargetX)||distance(player,{x:player.aiTargetX,y:player.aiTargetY})<28){
    const goal=chooseStableAiTarget(player);player.aiTargetX=goal.x;player.aiTargetY=goal.y;player.aiRole=goal.role;
    player.aiDecisionClock=(player.aiStyle==='caotico'?1.0:.38)+Math.random()*.28;
  }
  const enemy=mostDangerousEnemy(player);
  if(player.heldBall>0&&enemy&&distance(player,enemy)<410)throwBall(player,enemy);
  return smartAiDirections(player,{x:player.aiTargetX,y:player.aiTargetY},player.aiRole==='escort'?55:20);
}

function pointIsWalkable(x,y){return insideTrunk(x,y)&&!ridgeCollision(x,y);}
function smartAiDirections(player,target,dead=18){
  if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))target={x:CONFIG.cx,y:CONFIG.cy};
  const step=46;let dx=target.x-player.x,dy=target.y-player.y;const dist=Math.hypot(dx,dy)||1;
  let angle=Math.atan2(dy,dx),directAngle=angle;const ahead=(a,d=step)=>pointIsWalkable(player.x+Math.cos(a)*d,player.y+Math.sin(a)*d);
  let directBlocked=!ahead(angle,54),shouldJump=false;
  if(directBlocked&&player.jump<=0&&player.aiJumpCooldown<=0){
    if(pointIsWalkable(player.x+Math.cos(angle)*92,player.y+Math.sin(angle)*92)){shouldJump=true;player.aiJumpCooldown=.82;}
  }
  if(directBlocked&&!shouldJump){
    const options=[angle+.72,angle-.72,angle+1.35,angle-1.35].filter(a=>ahead(a));
    if(options.length)angle=options.sort((a,b)=>Math.abs(angleDelta(a,directAngle))-Math.abs(angleDelta(b,directAngle)))[0];
    else angle+=Math.PI*.65*player.navBias;
  }
  const moved=Math.hypot(player.x-player.navLastX,player.y-player.navLastY);player.aiClock+=1/60;
  if(player.aiClock>=.26){
    if(moved<6&&dist>65)player.navStuckClock+=.26;else player.navStuckClock=Math.max(0,player.navStuckClock-.35);
    player.navLastX=player.x;player.navLastY=player.y;player.aiClock=0;
  }
  if(player.navStuckClock>.55){
    shouldJump=player.jump<=0&&player.aiJumpCooldown<=0;player.aiJumpCooldown=.9;
    player.navEscapeClock=.72;player.navEscapeAngle=angle+(1.15+Math.random()*.7)*player.navBias;player.navBias*=-1;player.navStuckClock=0;
  }
  if(player.navEscapeClock>0){angle=player.navEscapeAngle;player.navEscapeClock=Math.max(0,player.navEscapeClock-1/60);}
  const penguin=state.guardians.find(g=>g.type==='penguin'&&(g.state==='charge'||g.state==='slide'));
  if(penguin&&distance(player,penguin)<560){
    angle=Math.atan2(player.y-penguin.y,player.x-penguin.x)+player.navBias*.36;
    if(penguin.state==='slide'&&distance(player,penguin)<150&&player.jump<=0&&player.aiJumpCooldown<=0){shouldJump=true;player.aiJumpCooldown=.75;}
  }
  const mx=Math.cos(angle),my=Math.sin(angle);
  if(dist<=dead&&!penguin)return {left:false,right:false,up:false,down:false,action:false};
  return {left:mx<-.22,right:mx>.22,up:my<-.22,down:my>.22,action:shouldJump};
}

function throwBall(player, forcedTarget=null){
  if(player.heldBall<=0)return;
  const opponents=allPlayers().filter(p=>p.team!==player.team);
  const target=forcedTarget||opponents.reduce((best,p)=>!best||distance(player,p)<distance(player,best)?p:best,null);
  const a=target?Math.atan2(target.y-player.y,target.x-player.x):player.facing>0?0:Math.PI;
  state.balls.push({x:player.x,y:player.y-10,vx:Math.cos(a)*CONFIG.ballSpeed,vy:Math.sin(a)*CONFIG.ballSpeed,life:2.2,ownerTeam:player.team,bounces:2});
  player.heldBall=0; burst(player.x,player.y,7);
}
function updateBalls(dt){
  for(const ball of state.balls){
    const ox=ball.x,oy=ball.y;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=Math.pow(.78,dt);ball.vy*=Math.pow(.78,dt);ball.life-=dt;
    if(!insideTrunk(ball.x,ball.y)){ball.x=ox;ball.y=oy;ball.vx*=-.65;ball.vy*=-.65;ball.bounces--;}
    for(const sloth of state.guardians.filter(g=>g.type==='sloth')){if(distance(ball,sloth)<42){const a=Math.atan2(sloth.y-ball.y,sloth.x-ball.x);sloth.x+=Math.cos(a)*85;sloth.y+=Math.sin(a)*85;ball.life=0;showToast('⚽🦥 ¡Movieron al perezoso!');break;}}
    if(ball.life<=0)continue;
    if(state.ally&&distance(ball,state.ally)<38){hitAlly(ball,470);ball.life=0;showToast('⚽ ¡Pelotazo al compañero!');}
    if(ball.life<=0)continue;
    for(const p of allPlayers()){
      if(p.team===ball.ownerTeam||p.invulnerable>0||distance(ball,p)>38)continue;
      dropFlagFrom(p,ball,470);p.stun=.35;p.invulnerable=.7;const a=Math.atan2(p.y-ball.y,p.x-ball.x);p.vx=Math.cos(a)*430;p.vy=Math.sin(a)*430;ball.life=0;burst(p.x,p.y,15);showToast('⚽ ¡Pelotazo!');break;
    }
  }
  state.balls=state.balls.filter(b=>b.life>0&&b.bounces>=0);
}
function drawBalls(){for(const b of state.balls){ctx.save();ctx.translate(b.x,b.y);ctx.font='34px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚽',0,0);ctx.restore();}}
function updateBearThrows(dt){
  state.bearThrowClock-=dt;const bear=state.fauna.find(a=>a.type==='bear');if(!bear)return;
  bear.throwPose=Math.max(0,bear.throwPose-dt);if(state.bearThrowClock>0)return;
  state.bearThrowClock=CONFIG.bearThrowEvery;bear.throwPose=.8;
  const angle=Math.atan2(CONFIG.cy-bear.y,CONFIG.cx-bear.x)+(Math.random()-.5)*.6;
  const landing={x:CONFIG.cx+Math.cos(angle)*260,y:CONFIG.cy+Math.sin(angle)*170};
  if(Math.random()<CONFIG.eggChance){state.eggs.push({id:'egg-'+Math.random().toString(36).slice(2),x:bear.x,y:bear.y,sx:bear.x,sy:bear.y,tx:landing.x,ty:landing.y,flight:CONFIG.eggFlightSeconds,age:0,stage:'flight'});showToast('🐻🥚 ¡LA OSA TIRÓ UN HUEVO!');return;}
  const types=['boots','shield','ball','ball'];const type=types[Math.floor(Math.random()*types.length)];state.items.push(makeItem(type,landing.x,landing.y));showToast(`🐻 ¡La osita lanzó ${type==='ball'?'una pelota':'un objeto'}!`);burst(landing.x,landing.y,8);
}
function updateEggsAndChicks(dt){
  for(const egg of state.eggs){egg.age+=dt;if(egg.stage==='flight'){const t=Math.min(1,egg.age/CONFIG.eggFlightSeconds);egg.x=egg.sx+(egg.tx-egg.sx)*t;egg.y=egg.sy+(egg.ty-egg.sy)*t-Math.sin(Math.PI*t)*145;if(t>=1){egg.stage='egg';egg.age=0;egg.x=egg.tx;egg.y=egg.ty;burst(egg.x,egg.y,6);}}else if(egg.stage==='egg'&&egg.age>1){egg.stage='crack';egg.age=0;}else if(egg.stage==='crack'&&egg.age>1){egg.stage='baby';egg.age=0;}else if(egg.stage==='baby'&&egg.age>1){state.chicks.push({id:'chick-'+Math.random().toString(36).slice(2),x:egg.x,y:egg.y,vx:0,vy:0,life:CONFIG.demonChickSeconds,attackCooldown:0,phase:0,exiting:false});egg.dead=true;showToast('🐤😈 ¡NACIÓ EL POLLITO DEMONIO!');}}
  state.eggs=state.eggs.filter(e=>!e.dead);
  for(const c of state.chicks){c.phase+=dt;c.attackCooldown=Math.max(0,c.attackCooldown-dt);if(!c.exiting){c.life-=dt;const targets=allPlayers();const target=targets.sort((a,b)=>distance(c,a)-distance(c,b))[0];if(target){const ang=Math.atan2(target.y-c.y,target.x-c.x);c.vx=approach(c.vx,Math.cos(ang)*420,1100*dt);c.vy=approach(c.vy,Math.sin(ang)*420,1100*dt);if(distance(c,target)<45&&c.attackCooldown<=0){pushCreature(target,c,255);target.stun=Math.max(target.stun,.12);c.attackCooldown=.48;showToast('🐤 ¡PICOTAZO DEMONÍACO!');}}if(c.life<=0){c.exiting=true;const ang=Math.atan2(c.y-CONFIG.cy,c.x-CONFIG.cx);c.vx=Math.cos(ang)*560;c.vy=Math.sin(ang)*560;showToast('🐤💨 ¡El demonio volvió al bosque!');}}else{c.life-=dt;if(c.life<-2)c.dead=true;}c.x+=c.vx*dt;c.y+=c.vy*dt;if(!c.exiting&&!insideTrunk(c.x,c.y)){c.vx*=-.6;c.vy*=-.6;c.x=Math.max(95,Math.min(1905,c.x));c.y=Math.max(80,Math.min(1045,c.y));}}
  state.chicks=state.chicks.filter(c=>!c.dead);
}
function drawEggsAndChicks(){for(const e of state.eggs){ctx.save();ctx.translate(e.x,e.y);ctx.font='38px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.stage==='flight'||e.stage==='egg'?'🥚':e.stage==='crack'?'🐣':'🐥',0,0);ctx.restore();}for(const c of state.chicks){ctx.save();ctx.translate(c.x,c.y+Math.sin(c.phase*16)*10);ctx.rotate(Math.sin(c.phase*10)*.22);ctx.font='40px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🐤',0,0);ctx.font='14px serif';ctx.fillText('😈',14,-18);ctx.restore();}}
function updateScoring(dt){scoreTeam(state.flag,state.players,state.humanTeam,dt);scoreTeam(state.rivalFlag,state.rivals,state.rivalTeam,dt);scoreTeam(state.rival2Flag,state.rivals2,state.rival2Team,dt);}
function contestedScoreInterval(team){
  const occupants=allPlayers().filter(p=>Math.hypot(p.x-CONFIG.cx,p.y-CONFIG.cy)<CONFIG.centerRadius+8);
  const opponents=occupants.filter(p=>p.team!==team).length;
  if(opponents<=0)return CONFIG.scoreEvery;
  if(opponents===1)return 1.30;
  if(opponents===2)return 2.00;
  return 3.00;
}
function scoreTeam(flag,roster,team,dt){
  const carrier=getCarrier(flag,roster),inCenter=carrier&&Math.hypot(carrier.x-CONFIG.cx,carrier.y-CONFIG.cy)<CONFIG.centerRadius;
  const isHuman=team===state.humanTeam,isR1=team===state.rivalTeam;const clockKey=isHuman?'scoreClock':isR1?'rivalScoreClock':'rival2ScoreClock';
  if(!inCenter){state[clockKey]=0;return;}
  const interval=contestedScoreInterval(team);state[clockKey]+=dt;
  if(state[clockKey]>=interval){state[clockKey]-=interval;
    if(isHuman){state.score++;ui.score.textContent=String(state.score);if(state.score>=CONFIG.targetScore)winLevel(team);}
    else if(isR1){state.rivalScore++;ui.rivalScore.textContent=String(state.rivalScore);if(state.rivalScore>=CONFIG.targetScore)winLevel(team);}
    else{state.rival2Score++;ui.rival2Score.textContent=String(state.rival2Score);if(state.rival2Score>=CONFIG.targetScore)winLevel(team);}
    burst(CONFIG.cx+(Math.random()-.5)*90,CONFIG.cy+(Math.random()-.5)*70,7);
  }
}

function winLevel(team='red') {
  if (state.winner) return; state.winner = true; state.running = false;
  ui.victoryLevelLabel.textContent=`NIVEL ${state.level}`;ui.nextLevel.hidden=team!==state.humanTeam||state.level>=3;ui.victoryTitle.textContent=team===state.humanTeam?(state.level>=3?'¡DOMINARON EL BOSQUE!':'¡EL CORAZÓN ES SUYO!'):'¡OTRO EQUIPO REINÓ!';
  ui.victoryTeam.innerHTML=team===state.humanTeam?teamMarkup():`<div class="summary-chip"><span>${TEAM_COLORS[team].emoji}</span>GANÓ EL EQUIPO ${TEAM_COLORS[team].name}</div>`; setTimeout(() => showScreen('victory'), 350);
}

function burst(x, y, amount) {
  amount=Math.min(amount,10);
  for (let i=0;i<amount;i++) {
    const a = Math.random()*Math.PI*2, s = 45 + Math.random()*130;
    state.particles.push({ x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.55+Math.random()*.45,type:'star' });
  }
}
function updateParticles(dt) {
  state.particles.forEach((p) => { p.x += p.vx*dt; p.y += p.vy*dt; p.vx *= .97; p.vy *= .97; p.life -= dt; });
  state.particles = state.particles.filter((p) => p.life > 0);
}

function buildStaticMap() {
  if(state.staticMap) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawForest(); drawTrunk();
  const layer=document.createElement('canvas');layer.width=canvas.width;layer.height=canvas.height;
  layer.getContext('2d').drawImage(canvas,0,0);
  state.staticMap=layer;
}

function draw() {
  if(!state.staticMap) buildStaticMap();
  ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(state.staticMap,0,0); drawCenter();
  drawFauna(); drawItems(); drawBalls(); drawEggsAndChicks(); drawFlag(state.flag);drawFlag(state.rivalFlag);drawFlag(state.rival2Flag); drawGuardians(); drawAlly(); allPlayers().forEach(drawPlayer); drawParticles();
}
function drawForest() {
  const g = ctx.createRadialGradient(CONFIG.cx,CONFIG.cy,210,CONFIG.cx,CONFIG.cy,1040);
  g.addColorStop(0,'#397c35'); g.addColorStop(1,'#143e22'); ctx.fillStyle=g; ctx.fillRect(0,0,CONFIG.width,CONFIG.height);
  ctx.globalAlpha=.22; ctx.font='54px serif';
  for (let y=20;y<CONFIG.height;y+=75) for (let x=10;x<CONFIG.width;x+=82) if (!insideTrunk(x,y)) ctx.fillText((x+y)%3?'🌿':'🌳',x,y);
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
  const grain = ctx.createRadialGradient(CONFIG.cx-80,CONFIG.cy-70,30,CONFIG.cx,CONFIG.cy,840);
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
  ctx.beginPath();ctx.ellipse(0,0,130,98,.1,0,Math.PI*2);ctx.fillStyle='rgba(255,211,45,.22)';ctx.fill();
  ctx.lineWidth=8;ctx.strokeStyle='rgba(255,225,74,.75)';ctx.stroke();
  ctx.font='76px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('👑',0,0);ctx.restore();
}
function drawFlag(flag) {
  if (!flag) return; const y=flag.y+Math.sin(flag.bob)*3;
  ctx.save();ctx.translate(flag.x,flag.carrier?y:y-8);
  ctx.strokeStyle='#3a2619';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-12,23);ctx.lineTo(-12,-26);ctx.stroke();
  ctx.fillStyle=TEAM_COLORS[flag.team]?.hex||'#ef3f4c';ctx.beginPath();ctx.moveTo(-10,-25);ctx.lineTo(25,-13);ctx.lineTo(-10,1);ctx.closePath();ctx.fill();
  ctx.restore();
}
function jumpHeight(player){if(!player.jump)return 0;const t=1-player.jump/CONFIG.jumpDuration;return Math.sin(t*Math.PI)*38*(player.bananaBoost>0?CONFIG.bananaJumpMultiplier:1);}
function drawPlayer(player) {
  const data=CHARACTERS[player.character], h=jumpHeight(player);
  const moving=Math.hypot(player.vx,player.vy)>45;
  const mood=player.stun>0?'stunned':player.carryingFlag?'happy':player.jump>0?'surprised':moving?'focused':'idle';
  ctx.save();ctx.translate(player.x,player.y-h);
  const blink = player.invulnerable>0 && Math.floor(performance.now()/90)%2===0;
  ctx.globalAlpha=blink?.38:1;

  // Sombra y ficha gruesa, como en Tina Toma la Bandera.
  ctx.fillStyle='rgba(44,22,13,.25)';ctx.beginPath();ctx.ellipse(0,27+h,29,10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=TEAM_COLORS[player.team]?.hex||data.color;ctx.beginPath();ctx.arc(0,5,31,0,Math.PI*2);ctx.fill();
  ctx.lineWidth=6;ctx.strokeStyle=player.outline==='white'?'#fff':'#111';ctx.stroke();
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

  if(player.jump){ctx.font='22px serif';ctx.fillText('✨',player.facing*31,-29);}if(player.perfectDodge>0){ctx.font='18px sans-serif';ctx.fillStyle='#fff';ctx.fillText('¡PERFECTO!',0,-49);}
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
