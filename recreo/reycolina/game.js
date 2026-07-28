'use strict';

/*
  REY DE LA COLINA · ALPHA 13.2 · PATRULLA Y PELOTAS PERSISTENTES · BASE ESTABLE
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
  gameShell: $('#gameShell'), hearts: $('#heartsLabel'), rival2Score: $('#rival2ScoreLabel'), humanDot: $('#humanTeamDot'), rivalDot: $('#rivalTeamDot'), rival2Dot: $('#rival2TeamDot'), levelSelect: $('#levelSelect')
};
const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d');

const CONFIG = Object.freeze({
  width: 2000, height: 1125, cx: 1000, cy: 570,
  playerRadius: 25, speed: 265, jumpDuration: .46, jumpCooldown: .08,
  flagPassDistance: 63, flagPassCooldown: .72, aiFollowDistance: 96,
  targetScore: 20, scoreEvery: .7, centerRadius: 112, guardianSafeRadius: 205,
  maxHearts: 3, hitInvulnerability: 1.15, gorillaRadius: 30,
  elephantRadius: 43, elephantWalkSpeed: 112, elephantChargeSpeed: 720, elephantCalmSeconds: 3,
  itemPickupRadius: 48, bootsDuration: 8, parrotDeliveryEvery: 8, bearThrowEvery: 6, ballSpeed: 600, eggChance: .20, eggFlightSeconds: 3, demonChickSeconds: 15,
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
  gato: { name: 'Gato', emoji: '🐈' },
  none: { name: 'Sin acompañante', emoji: '💀' }
});

const TEAM_COLORS = Object.freeze({
  red:{hex:'#ef3f4c',emoji:'🔴',name:'ROJO'}, blue:{hex:'#3697ff',emoji:'🔵',name:'AZUL'},
  green:{hex:'#3fbf63',emoji:'🟢',name:'VERDE'}, gold:{hex:'#f6c945',emoji:'🟡',name:'AMARILLO'},
  purple:{hex:'#9c68df',emoji:'🟣',name:'VIOLETA'}, orange:{hex:'#f08a37',emoji:'🟠',name:'NARANJA'}
});
const AI_STYLES = Object.freeze(['ofensivo','defensivo','todoterreno','tactico','troll','caotico']);
const WINNER_STYLES = Object.freeze(['ofensivo','todoterreno','tactico']);
const SUPPORT_STYLES = Object.freeze(['defensivo','tactico','troll']);
function allPlayers(){ return [...state.players,...state.rivals,...state.rivals2]; }
function rosterForTeam(team){ return team===state.humanTeam?state.players:team===state.rivalTeam?state.rivals:state.rivals2; }
function flagForTeam(team){ return state.flags[team]; }
function randomStyle(){ return AI_STYLES[Math.floor(Math.random()*AI_STYLES.length)]; }

// Afinidades simples: cada contenido declara a qué personalidad de IA atrae.
const ITEM_PROFILES = Object.freeze({
  ball:{ofensivo:3,defensivo:1,todoterreno:2,tactico:1,troll:2,caotico:2},
  heavyball:{ofensivo:3,defensivo:1,todoterreno:2,tactico:1,troll:2,caotico:2},
  bouncyball:{ofensivo:2,defensivo:0,todoterreno:2,tactico:2,troll:3,caotico:3},
  shield:{ofensivo:1,defensivo:3,todoterreno:2,tactico:2,troll:1,caotico:1},
  honey:{ofensivo:0,defensivo:2,todoterreno:2,tactico:3,troll:3,caotico:2},
  mirror:{ofensivo:1,defensivo:1,todoterreno:2,tactico:3,troll:3,caotico:3},
  boomerang:{ofensivo:2,defensivo:0,todoterreno:2,tactico:2,troll:3,caotico:2},
  snowman:{ofensivo:0,defensivo:2,todoterreno:2,tactico:3,troll:2,caotico:2},
  sunglasses:{ofensivo:1,defensivo:0,todoterreno:2,tactico:2,troll:3,caotico:2},
  campfire:{ofensivo:2,defensivo:2,todoterreno:2,tactico:2,troll:2,caotico:3},
  hammer:{ofensivo:3,defensivo:1,todoterreno:2,tactico:2,troll:2,caotico:2},
  clownmask:{ofensivo:1,defensivo:0,todoterreno:2,tactico:2,troll:3,caotico:3},
  boots:{ofensivo:2,defensivo:1,todoterreno:2,tactico:1,troll:1,caotico:1},
  banana:{ofensivo:1,defensivo:0,todoterreno:2,tactico:1,troll:2,caotico:3}
});
const GUARDIAN_PROFILES = Object.freeze({
  gorilla:{ofensivo:2,defensivo:0,todoterreno:2,tactico:3,troll:2,caotico:2},
  penguin:{ofensivo:2,defensivo:0,todoterreno:2,tactico:1,troll:2,caotico:3},
  sloth:{ofensivo:0,defensivo:1,todoterreno:2,tactico:3,troll:2,caotico:1},
  ant:{ofensivo:2,defensivo:0,todoterreno:2,tactico:3,troll:3,caotico:3},
  monkey:{ofensivo:1,defensivo:0,todoterreno:2,tactico:3,troll:3,caotico:3},
  crocodile:{ofensivo:2,defensivo:2,todoterreno:2,tactico:2,troll:2,caotico:2},
  elephant:{ofensivo:3,defensivo:0,todoterreno:2,tactico:3,troll:1,caotico:3}
});
const HOLDABLE_ITEMS=new Set(['ball','heavyball','bouncyball','shield','honey','mirror','boomerang','snowman','sunglasses','campfire','hammer','clownmask','acorn','sunscreen','goldleaf']);
const ITEM_ICONS={boots:'👟',shield:'🛡️',banana:'🍌',ball:'⚽',heavyball:'🏐',bouncyball:'🏀',watermelon:'🍉',juice:'🧃',sunscreen:'🧴',acorn:'🌰',mushroom:'🍄',goldleaf:'🍁',flower:'🌸',honey:'🍯',berry:'🫐',peanut:'🥜',mirror:'🪞',boomerang:'🪃',snowman:'⛄',sunglasses:'🕶️',campfire:'🔥',hammer:'🔨',clownmask:'🤡'};
function itemAffinity(type,style){return ITEM_PROFILES[type]?.[style]??(style==='todoterreno'?2:1);}



const state = {
  level: 1, mode: 'solo', selectedCharacter: 'tina', selectedAlly: 'loro', selectedColor: 'red', humanTeam:'red', rivalTeam:'blue', rival2Team:'green', running: false,
  paused: false, score: 0, rivalScore: 0, rival2Score: 0, scoreClock: 0, rivalScoreClock: 0, rival2ScoreClock: 0, lastTime: 0, players: [], rivals: [], rivals2: [], flags:{}, flag: null, rivalFlag: null, rival2Flag:null,
  ally: null, particles: [], keys: new Set(), touch: new Set(), winner: false,
  flagPassCooldown: 0, flagPassArmed: true, guardians: [], items: [],
  rivalFlags: [], toastTimer: 0, fauna: [], balls: [], eggs: [], chicks: [], bearThrowClock: 12, staticMap: null, eventFeed: [],
  joysticks: { p1:{x:0,y:0}, p2:{x:0,y:0} }, puddles: [], season: 'summer', cameraShake: 0, hazards: [], boomerangs: []
};


function seasonForLevel(level){
  if(level<=3)return 'summer';
  if(level<=6)return 'autumn';
  if(level<=9)return 'winter';
  return 'spring';
}
function seasonName(season){return {summer:'VERANO',autumn:'OTOÑO',winter:'INVIERNO',spring:'PRIMAVERA'}[season];}
const SEASON_RULES = Object.freeze({
  summer:{peanuts:3,bearPeanutChance:.15,eggChance:.42,hatchStep:.62,chickLife:18,chickPower:1.20},
  autumn:{peanuts:2,bearPeanutChance:.12,eggChance:.16,hatchStep:1.35,chickLife:13,chickPower:.92},
  winter:{peanuts:1,bearPeanutChance:.09,eggChance:.07,hatchStep:1.78,chickLife:9.5,chickPower:.78},
  spring:{peanuts:2,bearPeanutChance:.12,eggChance:.26,hatchStep:1.02,chickLife:15,chickPower:1.04}
});
function seasonRules(){return SEASON_RULES[state.season]||SEASON_RULES.summer;}
function chickRules(){const r=seasonRules();return {hatchStep:r.hatchStep,life:r.chickLife,power:r.chickPower};}
function isWinter(){return state.season==='winter';}

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
  ui.nextLevel.addEventListener('click', () => { state.level = Math.min(12, state.level + 1); startLevel(); });
  ui.levelSelect?.addEventListener('change', () => { state.level = Math.max(1, Math.min(12, Number(ui.levelSelect.value)||1)); ui.readyLevelLabel.textContent=`NIVEL ${state.level} · ${seasonName(seasonForLevel(state.level))}`; });
  ui.changeChoices.addEventListener('click', () => showScreen('mode'));
  ui.pause.addEventListener('click', togglePause);
}

function makePlayer(id, character, x, y, control, ai, team='red') {
  return { id, character, x, y, spawnX: x, spawnY: y, vx: 0, vy: 0, control, ai, team, facing: 1,
    carryingFlag: false, jump: 0, jumpLock: false, trailClock: 0, hearts: CONFIG.maxHearts,
    invulnerable: 0, stun: 0, boots: 0, shield: 0, heldBall: 0, heldItem: null, shieldActive:0, parryWindow:0, darkVision:0, confused:0, clownTaunt:0, burning:0, aiClock: 0,
    navLastX: x, navLastY: y, navStuckClock: 0, navEscapeClock: 0, navEscapeAngle: 0, navBias: Math.random()<.5?-1:1,
    flagPickupCooldown: 0, aiSupportMode: 'recover', aiSupportClock: 0, aiJumpCooldown: 0,
    tauntHistory: [], tauntLastAxis: '', tauntCooldown: 0, aiStyle: randomStyle(), outline: id.endsWith('1')||id==='p1'?'black':'white', bananaBoost:0, launched:0, launchPower:0, perfectDodge:0, stompCooldown:0, prevJumpHeight:0,
    aiDecisionClock:0, aiTargetX:x, aiTargetY:y, aiTargetId:null, aiRole:null, aiTeamRole:null };
}

function safeSpawnPoint(angle, radiusX=405, radiusY=245) {
  for (let tries=0; tries<18; tries++) {
    const a=angle+(Math.random()-.5)*.34;
    const scale=.88+Math.random()*.18;
    const x=CONFIG.cx+Math.cos(a)*radiusX*scale;
    const y=CONFIG.cy+Math.sin(a)*radiusY*scale;
    if(pointIsWalkable(x,y)) return {x,y};
  }
  return {x:CONFIG.cx+Math.cos(angle)*350,y:CONFIG.cy+Math.sin(angle)*210};
}
function teamSpawnPair(flag) {
  const flagAngle=Math.atan2(flag.y-CONFIG.cy,flag.x-CONFIG.cx);
  const base=flagAngle+Math.PI+(Math.random()-.5)*.38;
  const center=safeSpawnPoint(base);
  const tangent=base+Math.PI/2;
  const separation=55+Math.random()*18;
  const candidates=[
    {x:center.x+Math.cos(tangent)*separation,y:center.y+Math.sin(tangent)*separation},
    {x:center.x-Math.cos(tangent)*separation,y:center.y-Math.sin(tangent)*separation}
  ];
  return candidates.map((pt,i)=>pointIsWalkable(pt.x,pt.y)?pt:safeSpawnPoint(base+(i?-.12:.12)));
}
function pickStyle(pool){return pool[Math.floor(Math.random()*pool.length)];}
function assignTeamAiRoles(team){
  const bots=team.filter(p=>p.ai);
  if(!bots.length)return;
  if(bots.length===1){
    const p=bots[0];
    if(p.aiStyle==='tactico')p.aiTeamRole=Math.random()<.5?'support':'winner';
    else p.aiTeamRole=SUPPORT_STYLES.includes(p.aiStyle)?'support':'winner';
    return;
  }
  // Nunca hay dos apoyos: o dos ganadores, o un apoyo y un ganador.
  if(Math.random()<.5){
    bots.forEach(p=>{p.aiTeamRole='winner';if(!WINNER_STYLES.includes(p.aiStyle))p.aiStyle=pickStyle(WINNER_STYLES);});
  }else{
    const supportIndex=Math.random()<.5?0:1;
    bots.forEach((p,i)=>{
      p.aiTeamRole=i===supportIndex?'support':'winner';
      const pool=p.aiTeamRole==='support'?SUPPORT_STYLES:WINNER_STYLES;
      if(!pool.includes(p.aiStyle))p.aiStyle=pickStyle(pool);
    });
  }
}
function syncLevelSelector(){if(ui.levelSelect)ui.levelSelect.value=String(state.level);}
function teamWinner(team,excludeId=null){
  const flag=flagForTeam(team);
  return rosterForTeam(team).filter(p=>p.id!==excludeId&&p.aiTeamRole==='winner').sort((a,b)=>distance(a,flag)-distance(b,flag))[0]||null;
}
function designatedWinnerSeeker(player,flag,team){
  const winners=team.filter(p=>p.aiTeamRole==='winner');
  return winners.length>0&&winners.slice().sort((a,b)=>distance(a,flag)-distance(b,flag))[0]?.id===player.id;
}

function resetWorld() {
  state.season=seasonForLevel(state.level); state.staticMap=null; state.puddles=[]; state.cameraShake=0;
  state.score=0;state.rivalScore=0;state.rival2Score=0;state.scoreClock=0;state.rivalScoreClock=0;state.rival2ScoreClock=0;state.winner=false;state.paused=false;
  state.particles=[];state.keys.clear();state.touch.clear();state.joysticks.p1={x:0,y:0};state.joysticks.p2={x:0,y:0};state.flagPassCooldown=0;state.flagPassArmed=true;
  const colors=Object.keys(TEAM_COLORS); state.humanTeam=state.selectedColor;
  const remaining=colors.filter(c=>c!==state.humanTeam); state.rivalTeam=remaining[0]; state.rival2Team=remaining[1];
  const other=state.selectedCharacter==='tina'?'nito':'tina';
  state.flags={};
  state.flags[state.humanTeam]={x:1000,y:1030,carrier:null,bob:0,vx:0,vy:0,team:state.humanTeam};
  state.flags[state.rivalTeam]={x:1000,y:110,carrier:null,bob:2,vx:0,vy:0,team:state.rivalTeam};
  state.flags[state.rival2Team]={x:225,y:485,carrier:null,bob:4,vx:0,vy:0,team:state.rival2Team};
  state.flag=state.flags[state.humanTeam];state.rivalFlag=state.flags[state.rivalTeam];state.rival2Flag=state.flags[state.rival2Team];
  // Cada equipo nace en el anillo previo a la colina y en el lado opuesto a su bandera.
  // Los dos integrantes comparten sector, pero aparecen separados para evitar choques iniciales.
  const humanSpawn=teamSpawnPair(state.flag), rivalSpawn=teamSpawnPair(state.rivalFlag), rival2Spawn=teamSpawnPair(state.rival2Flag);
  state.players=[makePlayer('p1',state.selectedCharacter,humanSpawn[0].x,humanSpawn[0].y,'p1',false,state.humanTeam),makePlayer('p2',other,humanSpawn[1].x,humanSpawn[1].y,'p2',state.mode==='solo',state.humanTeam)];
  state.rivals=[makePlayer('b1','tina',rivalSpawn[0].x,rivalSpawn[0].y,'bot',true,state.rivalTeam),makePlayer('b2','nito',rivalSpawn[1].x,rivalSpawn[1].y,'bot',true,state.rivalTeam)];
  state.rivals2=[makePlayer('c1','tina',rival2Spawn[0].x,rival2Spawn[0].y,'bot',true,state.rival2Team),makePlayer('c2','nito',rival2Spawn[1].x,rival2Spawn[1].y,'bot',true,state.rival2Team)];
  assignTeamAiRoles(state.players);assignTeamAiRoles(state.rivals);assignTeamAiRoles(state.rivals2);
  state.ally=state.selectedAlly==='none'?null:{id:'ally-1',type:state.selectedAlly,x:humanSpawn[0].x+36,y:humanSpawn[0].y+48,angle:1.9,radius:25,phase:0,deliveryClock:CONFIG.parrotDeliveryEvery,task:null,carryingItem:null,targetPlayerId:'p1',retargetClock:0,attackCooldown:0,targetGuardianId:null,decisionClock:0,idleClock:0,idleAngle:Math.random()*Math.PI*2,flagCarry:false,vx:0,vy:0,stun:0,launched:0,invulnerable:0,team:state.humanTeam};
  state.guardians=guardianSetForLevel(state.level);
  if(isWinter()) state.puddles=makePuddles();
  state.items=[makeItem('boots',1540,790),makeItem('shield',485,390),makeItem('banana',650,650),makeItem('banana',1320,520),makeItem('banana',1020,835),...seasonalStartItems(),...makeInitialPeanuts()];
  state.rivalFlags=[state.rivalFlag,state.rival2Flag];state.balls=[];state.boomerangs=[];state.hazards=[];state.eggs=[];state.chicks=[];state.eventFeed=[];document.querySelector('.event-feed')?.remove();state.bearThrowClock=CONFIG.bearThrowEvery;
  state.fauna=[{type:'bear',x:150,y:160,angle:.2,speed:34,turnClock:3.2,bob:0,throwPose:0}];
  ui.score.textContent='0';ui.rivalScore.textContent='0';ui.rival2Score.textContent='0';
  ui.humanDot.textContent=TEAM_COLORS[state.humanTeam].emoji;ui.rivalDot.textContent=TEAM_COLORS[state.rivalTeam].emoji;ui.rival2Dot.textContent=TEAM_COLORS[state.rival2Team].emoji;
  updateFlagHud();updateHeartsHud();ui.gameShell.classList.toggle('is-coop',state.mode==='coop');
  ui.hint.textContent=state.mode==='coop'?'WASD + E / ESPACIO   ·   FLECHAS + ENTER':'WASD + E / ESPACIO';ui.hint.classList.remove('is-hidden');setTimeout(()=>ui.hint.classList.add('is-hidden'),3500);
  showToast(`${seasonEmoji()} ${seasonName(state.season)} · NIVEL ${state.level}`);
  showToast(`IA: ${state.rivals.concat(state.rivals2).map(p=>p.aiStyle.toUpperCase()).join(' · ')}`);
}

function startLevel() {
  syncLevelSelector();
  resetWorld(); ui.readyLevelLabel.textContent=`NIVEL ${state.level} · ${seasonName(state.season)}`; showScreen('game'); state.running = true;
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
  updateAiFlagTransfers();
  updateTaunts(dt);
  updateFlagObject(state.flag,state.players,dt);updateFlagObject(state.rivalFlag,state.rivals,dt);updateFlagObject(state.rival2Flag,state.rivals2,dt); updateAutomaticFlagPass(dt); updateItems(dt); updateHazards(dt); updateBoomerangs(dt); updateBalls(dt); updateGuardians(dt);
  updateAlly(dt); updateAllyPhysics(dt); updateFauna(dt); updateBearThrows(dt); updateEggsAndChicks(dt); updateScoring(dt); updateParticles(dt); updateToast(dt); state.cameraShake=Math.max(0,state.cameraShake-dt);
}

function inputFor(player) {
  if (player.ai) return aiInput(player);
  if (player.control === 'p1') return {
    left: state.keys.has('KeyA'), right: state.keys.has('KeyD'), up: state.keys.has('KeyW'), down: state.keys.has('KeyS'),
    axisX: state.joysticks.p1.x, axisY: state.joysticks.p1.y,
    action: state.keys.has('KeyE') || state.keys.has('Space') || state.touch.has('p1-action')
  };
  return {
    left: state.keys.has('ArrowLeft'), right: state.keys.has('ArrowRight'), up: state.keys.has('ArrowUp'), down: state.keys.has('ArrowDown'),
    axisX: state.joysticks.p2.x, axisY: state.joysticks.p2.y,
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
    if(player.aiTeamRole==='support'&&!carrier&&player.flagPickupCooldown<=0)goal={x:state.flag.x,y:state.flag.y,role:'recover'};
    else if(carrier?.id===human.id)goal=nonFlagStyleGoal(player,human);
    else goal=nonFlagStyleGoal(player,carrier);
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

function updateAiFlagTransfers(){
  for(const team of [state.rivals,state.rivals2]){
    const support=team.find(p=>p.aiTeamRole==='support'&&p.carryingFlag);
    const winner=team.find(p=>p.aiTeamRole==='winner');
    if(support&&winner&&distance(support,winner)<102&&state.flagPassCooldown<=0){
      passFlag(support,winner);support.flagPickupCooldown=3.5;support.navBias*=-1;
      const dx=support.x-winner.x,dy=support.y-winner.y,l=Math.hypot(dx,dy)||1;
      support.x+=dx/l*68;support.y+=dy/l*68;
    }
  }
}

function updatePlayer(player, dt) {
  player.prevJumpHeight=jumpHeight(player);
  player.stompCooldown=Math.max(0,player.stompCooldown-dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.stun = Math.max(0, player.stun - dt);
  player.boots=Math.max(0,player.boots-dt);player.bananaBoost=Math.max(0,player.bananaBoost-dt);player.perfectDodge=Math.max(0,player.perfectDodge-dt);player.shieldActive=Math.max(0,player.shieldActive-dt);player.parryWindow=Math.max(0,player.parryWindow-dt);player.darkVision=Math.max(0,player.darkVision-dt);player.confused=Math.max(0,player.confused-dt);player.clownTaunt=Math.max(0,player.clownTaunt-dt);player.burning=Math.max(0,player.burning-dt);
  player.flagPickupCooldown = Math.max(0, player.flagPickupCooldown - dt);
  player.aiSupportClock = Math.max(0, player.aiSupportClock - dt);
  player.aiJumpCooldown = Math.max(0, player.aiJumpCooldown - dt);
  const input = player.stun > 0 ? {left:false,right:false,up:false,down:false,action:false} : inputFor(player);
  let dx = Math.abs(input.axisX||0)>.08 ? input.axisX : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = Math.abs(input.axisY||0)>.08 ? input.axisY : (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if(player.confused>0){dx*=-1;dy*=-1;}
  const length = Math.hypot(dx, dy) || 1; dx /= length; dy /= length;
  const moveSpeed = CONFIG.speed * (player.boots > 0 ? 1.34 : 1);
  const targetVx = dx * moveSpeed, targetVy = dy * moveSpeed;
  const accel=isWinter()?620:1300, brake=isWinter()?240:1600;
  player.vx = approach(player.vx, targetVx, accel * dt);
  player.vy = approach(player.vy, targetVy, accel * dt);
  if (!dx) player.vx = approach(player.vx, 0, brake * dt);
  if (!dy) player.vy = approach(player.vy, 0, brake * dt);
  if (Math.abs(player.vx) > 8) player.facing = Math.sign(player.vx);

  if (input.action && !player.jumpLock && player.jump <= 0) {
    const teammate = state.players.find((p) => p.id !== player.id);
    if (player.heldItem) useHeldItem(player);
    else if (player.heldBall > 0) throwBall(player);
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
  if(!state.ally) return;
  state.ally.phase += dt;
  state.ally.idleClock=(state.ally.idleClock||0)-dt;
  if(state.ally.idleClock<=0){state.ally.idleClock=.8+Math.random()*1.4;state.ally.idleAngle+=(Math.random()-.5)*1.7;}
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
  let list=level===1?[penguin,makeSloth('sloth-1',510,620)]:level===2?[penguin,makeGorilla('g1',1665,320,0),makeGorilla('g2',335,820,Math.PI),makeSloth('sloth-1',1010,860)]:[penguin,makeGorilla('g1',1665,320,0),makeGorilla('g2',335,820,Math.PI),makeAnt('ant-1',220,560)];
  if(state.season==='autumn') list.push(makeMonkeyGuardian('monkey-guardian',760,250));
  if(state.season==='winter') list.push(makeCrocodileGuardian('croc-1',1000,760));
  list.push(makeElephantGuardian('elephant-1',1080,900));
  return list;
}
function makePuddles(){return [{id:'puddle-1',x:720,y:410,rx:105,ry:55},{id:'puddle-2',x:1270,y:690,rx:125,ry:62},{id:'puddle-3',x:1040,y:300,rx:92,ry:48}];}
function makeCrocodileGuardian(id,x,y){return{id,type:'crocodile',x,y,radius:34,homePuddleId:'puddle-1',speed:245,attackCooldown:0,stunned:0,vx:0,vy:0};}
function makeMonkeyGuardian(id,x,y){return{id,type:'monkey',x,y,radius:28,speed:225,state:'search',targetFlag:null,thinkClock:0,carryClock:0,helpGorillaId:null,accuseId:null,stunned:0,vx:0,vy:0,heldItem:null,itemUseClock:0,escapeClock:0,shieldActive:0,parryWindow:0,facing:1,team:'monkey',stuckClock:0,navBias:Math.random()<.5?-1:1,tx:x,ty:y,patrolClock:0,patrolIndex:Math.floor(Math.random()*8),hopClock:0,hopCooldown:0,hopHeight:0};}

function makeElephantGuardian(id,x,y){
  return {id,type:'elephant',x,y,spawnX:x,spawnY:y,radius:CONFIG.elephantRadius,state:'seek',targetPeanutId:null,
    calmClock:0,trumpetClock:0,chargeClock:0,restClock:0,angle:-Math.PI/2,vx:0,vy:0,hitCooldown:new Map(),
    lastX:x,lastY:y,interrupted:false,stuckClock:0,navBias:Math.random()<.5?-1:1,seekClock:0,failedPeanuts:new Map(),hopClock:0,hopCooldown:0,hopHeight:0};
}
function makeInitialPeanuts(){
  const count=seasonRules().peanuts, spots=[];
  for(let i=0;i<count;i++){
    const base=-2.35+i*(4.7/Math.max(1,count-1));
    for(let tries=0;tries<20;tries++){
      const a=base+(Math.random()-.5)*.55,r=310+Math.random()*360;
      const x=CONFIG.cx+Math.cos(a)*r,y=CONFIG.cy+Math.sin(a)*r*.62;
      if(pointIsWalkable(x,y)&&spots.every(q=>Math.hypot(q.x-x,q.y-y)>230)){spots.push(makeItem('peanut',x,y));break;}
    }
  }
  return spots;
}
function angerElephant(e,reason=''){
  if(e.state==='charge'||e.state==='trumpet')return;
  e.state='trumpet';e.trumpetClock=.72;e.targetPeanutId=null;e.interrupted=true;
  showToast(reason||'🐘📯 ¡EL ELEFANTE ENTRÓ EN FURIA!');burst(e.x,e.y,12);
}
function densestChargeTarget(e){
  const candidates=[...allPlayers(),...state.guardians.filter(g=>g!==e),state.ally].filter(Boolean);
  if(!candidates.length)return {x:CONFIG.cx,y:CONFIG.cy};
  let best=candidates[0],bestScore=-Infinity;
  for(const c of candidates){
    const crowd=candidates.reduce((n,o)=>n+(o!==c&&distance(c,o)<185?1:0),0);
    const score=crowd*260-distance(e,c)*.22+(Math.hypot(c.x-CONFIG.cx,c.y-CONFIG.cy)<250?95:0);
    if(score>bestScore){bestScore=score;best=c;}
  }
  return best;
}
function startElephantCharge(e){
  const target=densestChargeTarget(e);e.angle=Math.atan2(target.y-e.y,target.x-e.x);
  e.vx=Math.cos(e.angle)*CONFIG.elephantChargeSpeed;e.vy=Math.sin(e.angle)*CONFIG.elephantChargeSpeed;
  e.chargeClock=1.7;e.state='charge';e.hitCooldown.clear();state.cameraShake=.45;
  showToast('🐘💨 ¡APÁRTENSE, VIENE COMO UN TREN!');
}
function pushGuardianByElephant(g,e){
  const force=560,ang=e.angle;g.x+=Math.cos(ang)*34;g.y+=Math.sin(ang)*34;
  if('stunned' in g)g.stunned=Math.max(g.stunned||0,.65);
  if(g.type==='penguin'){g.slideVx=(g.slideVx||0)+Math.cos(ang)*force;g.slideVy=(g.slideVy||0)+Math.sin(ang)*force;}
  else if('vx' in g){g.vx=(g.vx||0)+Math.cos(ang)*force;g.vy=(g.vy||0)+Math.sin(ang)*force;}
}
function updateElephant(e,dt){
  e.hopClock=Math.max(0,(e.hopClock||0)-dt);e.hopCooldown=Math.max(0,(e.hopCooldown||0)-dt);
  e.hopHeight=e.hopClock>0?Math.sin((1-e.hopClock/.48)*Math.PI)*42:0;
  for(const[id,t]of e.failedPeanuts||[]){const n=t-dt;n<=0?e.failedPeanuts.delete(id):e.failedPeanuts.set(id,n);}
  for(const[id,t]of e.hitCooldown){const n=t-dt;n<=0?e.hitCooldown.delete(id):e.hitCooldown.set(id,n);}
  if(e.state==='calm'){
    e.calmClock-=dt;
    if(e.calmClock<=0)angerElephant(e,'🐘📯 Se terminó la calma...');
    return;
  }
  if(e.state==='trumpet'){
    e.trumpetClock-=dt;state.cameraShake=Math.max(state.cameraShake,.12);
    if(e.trumpetClock<=0)startElephantCharge(e);
    return;
  }
  if(e.state==='recover'||e.state==='rest'){
    e.restClock-=dt;
    if(e.restClock<=0)e.state='seek';
    return;
  }
  if(e.state==='charge'){
    const ox=e.x,oy=e.y;
    const nx=e.x+e.vx*dt,ny=e.y+e.vy*dt;
    const ridgeAhead=ridgeCollision(nx,ny);
    if(ridgeAhead&&e.hopCooldown<=0){e.hopClock=.48;e.hopCooldown=1.0;}
    if(insideTrunk(nx,ny)&&(!ridgeAhead||e.hopClock>0)){e.x=nx;e.y=ny;}
    e.chargeClock-=dt;state.cameraShake=Math.max(state.cameraShake,.18);
    state.particles.push({x:e.x-Math.cos(e.angle)*35,y:e.y+25,vx:(Math.random()-.5)*90,vy:-30-Math.random()*60,life:.45,type:'dust'});
    for(const p of allPlayers())if(distance(e,p)<e.radius+CONFIG.playerRadius+9&&!e.hitCooldown.has(p.id)){
      e.hitCooldown.set(p.id,.9);dropFlagFrom(p,e,760);p.stun=Math.max(p.stun,.7);p.invulnerable=Math.max(p.invulnerable,.45);
      p.vx=Math.cos(e.angle)*820;p.vy=Math.sin(e.angle)*820;burst(p.x,p.y,14);
    }
    if(state.ally&&distance(e,state.ally)<e.radius+32&&!e.hitCooldown.has(state.ally.id)){e.hitCooldown.set(state.ally.id,.9);hitAlly(e,760);}
    for(const g of state.guardians.filter(g=>g!==e))if(distance(e,g)<e.radius+(g.radius||28)+7&&!e.hitCooldown.has(g.id)){e.hitCooldown.set(g.id,.9);pushGuardianByElephant(g,e);burst(g.x,g.y,8);}
    for(const f of Object.values(state.flags))if(!f.carrier&&distance(e,f)<65){f.vx=Math.cos(e.angle)*760;f.vy=Math.sin(e.angle)*760;}
    const chargeBlocked=!insideTrunk(e.x,e.y)||(ridgeCollision(e.x,e.y)&&e.hopClock<=0);
    const moved=Math.hypot(e.x-ox,e.y-oy);
    e.stuckClock=moved<1?e.stuckClock+dt:0;
    if(chargeBlocked||e.chargeClock<=0||e.stuckClock>.28){
      e.x=ox-Math.cos(e.angle)*22;e.y=oy-Math.sin(e.angle)*22;
      if(!pointIsWalkable(e.x,e.y)){e.x=ox;e.y=oy;}
      e.vx=0;e.vy=0;e.state='rest';e.restClock=1.0+Math.random()*.65;e.stuckClock=0;e.navBias*=-1;
      burst(e.x,e.y,16);
    }
    return;
  }
  let peanut=state.items.find(i=>i.id===e.targetPeanutId&&i.active&&!i.flying&&i.type==='peanut');
  if(!peanut){peanut=state.items.filter(i=>i.active&&!i.flying&&i.type==='peanut'&&!e.failedPeanuts?.has(i.id)).sort((a,b)=>distance(e,a)-distance(e,b))[0]||null;e.targetPeanutId=peanut?.id||null;e.seekClock=0;}
  if(!peanut){angerElephant(e,'🐘📯 ¡NO HAY MANÍES!');return;}
  e.seekClock=(e.seekClock||0)+dt;
  const dx=peanut.x-e.x,dy=peanut.y-e.y;e.angle=Math.atan2(dy,dx);
  const probeX=e.x+Math.cos(e.angle)*62,probeY=e.y+Math.sin(e.angle)*62;
  if(ridgeCollision(probeX,probeY)&&e.hopCooldown<=0){e.hopClock=.48;e.hopCooldown=.9;}
  const beforeX=e.x,beforeY=e.y;
  if(e.hopClock>0){const nx=e.x+Math.cos(e.angle)*CONFIG.elephantWalkSpeed*dt,ny=e.y+Math.sin(e.angle)*CONFIG.elephantWalkSpeed*dt;if(insideTrunk(nx,ny)){e.x=nx;e.y=ny;}}
  else moveGuardianNavigated(e,peanut.x,peanut.y,CONFIG.elephantWalkSpeed,dt,54);
  const moved=Math.hypot(e.x-beforeX,e.y-beforeY);
  e.stuckClock=moved<.7?e.stuckClock+dt:0;
  if(e.stuckClock>.58&&e.hopCooldown<=0){e.hopClock=.48;e.hopCooldown=.9;e.navBias*=-1;e.stuckClock=0;}
  if(e.seekClock>5.5){e.failedPeanuts.set(peanut.id,5);e.targetPeanutId=null;e.seekClock=0;e.navBias*=-1;showToast('🐘🤨 Ese maní no vale tanto esfuerzo...');return;}
  if(distance(e,peanut)<e.radius+24){peanut.active=false;e.targetPeanutId=null;e.seekClock=0;e.state='calm';e.calmClock=CONFIG.elephantCalmSeconds;e.interrupted=false;showToast('🐘🥜 Mmm... 3 segundos de paz.');burst(peanut.x,peanut.y,9);return;}
  const trouble=state.guardians.find(g=>g!==e&&['penguin','ant','gorilla','monkey'].includes(g.type)&&distance(e,g)<e.radius+(g.radius||28)+4);
  if(trouble)angerElephant(e,`🐘💢 ¡${trouble.type==='penguin'?'EL PINGÜINO':trouble.type==='ant'?'LA HORMIGA':trouble.type==='monkey'?'EL MONITO':'EL GORILA'} LE ARRUINÓ LA COMIDA!`);
}

function makeSloth(id,x,y){return{id,type:'sloth',x,y,radius:28,angle:Math.random()*Math.PI*2,speed:28,turnClock:2.5,hugTargetId:null,hugClock:0,hugCooldown:new Map()};}
function makeAnt(id,x,y){return{id,type:'ant',x,y,radius:18,angle:0,speed:92,turnClock:2.2,carry:null,carryClock:0,throwCooldown:new Map()};}
function makeGorilla(id, x, y, angle) {
  return { id, type: 'gorilla', x, y, spawnX: x, spawnY: y, angle, facingAngle:angle, patrolAngle: angle,
    radius: CONFIG.gorillaRadius, speed: 154, rage: 0, jump: null, jumpCooldown: .65 + Math.random()*.55,
    hitCooldown: 0, flagCooldown: 0, targetId: null, retargetClock: 0, chaseClock: 0,
    side: id==='g1' ? 1 : -1, stunned: 0, allyHitCooldown: 0, wildClock: 0,
    personalTargetId: null, taunters: new Map(), wildAngle: angle,
    alertState:'patrol', searchClock:0, investigateX:x, investigateY:y, lastSeenX:x, lastSeenY:y, bananaTargetId:null, eatingClock:0 };
}

function makePenguin(id,x,y){
  return {id,type:'penguin',x,y,spawnX:x,spawnY:y,radius:28,state:'wander',angle:Math.PI,
    speed:54,turnClock:2,observeClock:1.4,charge:0,chargeGoal:0,slideVx:0,slideVy:0,
    bouncesLeft:0,restClock:0,hitCooldown:new Map(),targetPoint:null,plannedBounces:0,
    launchX:x,launchY:y,bounceHistory:[],lastBounceX:x,lastBounceY:y,repeatBounce:0,slideAge:0};
}
function makeItem(type, x, y, options={}) {
  return {
    id: `${type}-${Math.random().toString(36).slice(2)}`, type, x, y,
    active: options.active ?? true, bob: Math.random()*6,
    flying: !!options.flying, sx: options.sx ?? x, sy: options.sy ?? y,
    tx: options.tx ?? x, ty: options.ty ?? y, flight: options.flight ?? 0,
    flightAge: 0, arcHeight: options.arcHeight ?? 145,
    thrownByBear: !!options.thrownByBear, reserved: false
  };
}

function updateHeartsHud() {
  ui.hearts.textContent = state.players.map((p) => '❤️'.repeat(Math.max(0,p.hearts)) || '💔').join(' · ');
}
function showToast(text) {
  // Alpha 13: los eventos siguen existiendo para depuración, pero no se crea
  // ningún registro visual que tape la pantalla en celular.
  if (window.REY_COLINA_DEBUG) console.debug('[Rey de la Colina]', text);
}
function updateToast(dt) {}
function updateItems(dt) {
  for (const item of state.items) {
    item.bob += dt*3;
    if(item.throwClock>0){
      item.throwClock=Math.max(0,item.throwClock-dt);
      const ox=item.x,oy=item.y;
      item.x+=(item.throwVx||0)*dt;item.y+=(item.throwVy||0)*dt;
      item.throwVx=(item.throwVx||0)*Math.pow(.18,dt);item.throwVy=(item.throwVy||0)*Math.pow(.18,dt);
      if(!pointIsWalkable(item.x,item.y)){item.x=ox;item.y=oy;item.throwVx*=-.45;item.throwVy*=-.45;}
      if(item.throwClock<=0){item.throwVx=0;item.throwVy=0;}
    }
    if (item.flying) {
      item.flightAge += dt; const t=Math.min(1,item.flightAge/Math.max(.01,item.flight));
      item.x=item.sx+(item.tx-item.sx)*t; item.y=item.sy+(item.ty-item.sy)*t-Math.sin(Math.PI*t)*item.arcHeight;
      if(t>=1){item.flying=false;item.active=true;item.x=item.tx;item.y=item.ty;burst(item.x,item.y,8);} continue;
    }
    if(!item.active||item.type==='peanut')continue;
    for(const player of allPlayers()){
      if(distance(player,item)>CONFIG.itemPickupRadius)continue;
      if(HOLDABLE_ITEMS.has(item.type)&&(player.heldItem||player.heldBall>0))continue;
      item.active=false;
      if(HOLDABLE_ITEMS.has(item.type)){
        player.heldItem=item.type; player.heldBall=0;
        showToast(`${ITEM_ICONS[item.type]||'🎁'} ¡Listo para reaccionar!`);
      }else if(item.type==='boots'){player.boots=CONFIG.bootsDuration;showToast('👟 ¡Más velocidad!');}
      else if(item.type==='watermelon'||item.type==='flower'){player.hearts=Math.min(CONFIG.maxHearts,player.hearts+1);updateHeartsHud();showToast('❤️ ¡Un corazón recuperado!');}
      else if(item.type==='juice'||item.type==='mushroom'){player.boots=Math.max(player.boots,6);showToast('💨 ¡Impulso!');}
      else if(item.type==='berry'){player.bananaBoost=Math.max(player.bananaBoost,5);showToast('🫐 ¡Salto mejorado!');}
      else if(item.type==='banana'){player.bananaBoost=CONFIG.bananaJumpDuration;showToast('🍌 ¡SUPER SALTO!');const now=performance.now()/1000;state.guardians.filter(g=>g.type==='gorilla').forEach(g=>{g.taunters.set(player.id,now);g.personalTargetId=player.id;g.targetId=player.id;g.wildClock=CONFIG.gorillaWildSeconds;g.rage=g.wildClock;g.chaseClock=g.wildClock;g.alertState='furious';});}
      burst(item.x,item.y,12);break;
    }
  }
}
function nearestOpponent(player){return allPlayers().filter(p=>p.team!==player.team).sort((a,b)=>distance(player,a)-distance(player,b))[0]||null;}
function activateGuardianTaunt(player,range=380){
  for(const g of state.guardians){if(distance(player,g)>range)continue;
    if(g.type==='gorilla'){g.personalTargetId=player.id;g.targetId=player.id;g.wildClock=CONFIG.gorillaWildSeconds;g.chaseClock=g.wildClock;g.rage=g.wildClock;g.alertState='furious';}
    else{g.tauntTargetId=player.id;g.tauntClock=3.5;g.stunned=0;}
  }
}
function useHeldItem(player){
  const type=player.heldItem;if(!type)return;player.heldItem=null;
  const enemy=nearestOpponent(player);const aim=enemy?Math.atan2(enemy.y-player.y,enemy.x-player.x):(player.facing>0?0:Math.PI);
  if(type==='shield'||type==='sunscreen'||type==='goldleaf'){player.shieldActive=1.05;player.parryWindow=.32;showToast('🛡️ ¡ESCUDO! Reaccioná al impacto.');return;}
  if(type==='ball'||type==='heavyball'||type==='bouncyball'||type==='acorn'){state.balls.push({x:player.x,y:player.y-10,vx:Math.cos(aim)*CONFIG.ballSpeed*(type==='heavyball'?.72:1),vy:Math.sin(aim)*CONFIG.ballSpeed*(type==='heavyball'?.72:1),life:2.5,ownerTeam:player.team,bounces:type==='bouncyball'?6:2,kind:type});burst(player.x,player.y,7);return;}
  if(type==='honey'){for(let i=0;i<6;i++)state.hazards.push({type:'honey',x:player.x-Math.cos(aim)*i*34,y:player.y-Math.sin(aim)*i*34,life:7,radius:34});showToast('🍯 ¡Rastro pegajoso!');return;}
  if(type==='mirror'){activateGuardianTaunt(player,520);showToast('🪞 ¡TAUNT INSTANTÁNEO!');return;}
  if(type==='boomerang'){state.boomerangs.push({x:player.x,y:player.y,vx:Math.cos(aim)*520,vy:Math.sin(aim)*520,life:2.4,ownerTeam:player.team,hits:new Set()});return;}
  if(type==='sunglasses'){if(enemy){enemy.darkVision=3;showToast('🕶️ ¡Visión oscurecida!');}return;}
  if(type==='snowman'){state.hazards.push({type:'snowman',x:player.x+Math.cos(aim)*65,y:player.y+Math.sin(aim)*65,life:10,radius:38});showToast('⛄ ¡Nuevo obstáculo!');return;}
  if(type==='campfire'){state.hazards.push({type:'campfire',x:player.x+Math.cos(aim)*60,y:player.y+Math.sin(aim)*60,life:8,radius:42});showToast('🔥 ¡Fogata lista!');return;}
  if(type==='hammer'){player.hammerStomp=1;player.jump=CONFIG.jumpDuration;showToast('🔨 ¡Caé con todo!');return;}
  if(type==='clownmask'){player.clownTaunt=4;activateGuardianTaunt(player,250);showToast('🤡 ¡Todos te miran!');return;}
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
  if (player.shieldActive>0) { const parry=player.parryWindow>0;player.shieldActive=0;player.parryWindow=0;player.invulnerable=.65;if(parry){gorilla.stunned=1.25;gorilla.targetId=null;showToast('🛡️✨ ¡PARRY AL GORILA!');}else showToast('🛡️ ¡El escudo resistió!');burst(player.x,player.y,15);return; }
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
    if(g.type==='crocodile'){ updateCrocodileGuardian(g,dt); continue; }
    if(g.type==='monkey'){ updateMonkeyGuardian(g,dt); continue; }
    if(g.type==='elephant'){ updateElephant(g,dt); continue; }
    g.wildClock=Math.max(0,g.wildClock-dt);
    g.hitCooldown=Math.max(0,g.hitCooldown-dt);g.jumpCooldown=Math.max(0,g.jumpCooldown-dt);
    g.flagCooldown=Math.max(0,g.flagCooldown-dt);g.stunned=Math.max(0,g.stunned-dt);
    g.retargetClock-=dt;g.chaseClock=Math.max(0,g.chaseClock-dt);g.rage=Math.max(0,g.rage-dt);
    g.searchClock=Math.max(0,g.searchClock-dt);
    if(g.stunned>0){g.jump=null;continue;}

    // Las bananas lanzadas por la osa atraen al gorila. Si llega primero,
    // se detiene a comerla; si un jugador la roba, la lógica normal de
    // updateItems lo enfurece inmediatamente.
    g.eatingClock=Math.max(0,(g.eatingClock||0)-dt);
    if(g.eatingClock>0){g.alertState='eating';g.rage=0;g.targetId=null;continue;}
    let banana=state.items.find(i=>i.id===g.bananaTargetId&&i.active&&!i.flying&&i.type==='banana');
    if(!banana){
      banana=state.items.filter(i=>i.active&&!i.flying&&i.type==='banana'&&i.thrownByBear&&distance(g,i)<360)
        .sort((a,b)=>distance(g,a)-distance(g,b))[0]||null;
      g.bananaTargetId=banana?.id||null;
    }
    if(banana&&g.wildClock<=0){
      g.alertState='banana';g.targetId=null;g.personalTargetId=null;
      moveGorillaToward(g,banana.x,banana.y,dt,1.08);
      if(distance(g,banana)<g.radius+28){
        banana.active=false;g.bananaTargetId=null;g.eatingClock=2;g.rage=0;g.wildClock=0;
        showToast('🦍🍌 ¡El gorila se comió la banana!');burst(banana.x,banana.y,10);
      }
      continue;
    }

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
      const rainBoost=isWinter()?2:1;p.slideVx=Math.cos(angle)*CONFIG.penguinSpeed*rainBoost;p.slideVy=Math.sin(angle)*CONFIG.penguinSpeed*rainBoost;
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
  const speed=Math.hypot(p.slideVx,p.slideVy)||CONFIG.penguinSpeed*(isWinter()?2:1);
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
      const basePenguin=CONFIG.penguinSpeed*(isWinter()?2:1); const boosted=Math.min(basePenguin*1.22,Math.max(basePenguin*.96,speed*1.025));
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
    if(thing.shieldActive>0){
      const rival=allPlayers().filter(x=>x.team!==thing.team&&x.id!==thing.id).sort((x,y)=>distance(thing,x)-distance(thing,y))[0];
      const deflect=rival?Math.atan2(rival.y-p.y,rival.x-p.x):Math.atan2(p.y-thing.y,p.x-thing.x);
      const sp=Math.max(CONFIG.penguinSpeed,Math.hypot(p.slideVx,p.slideVy));p.slideVx=Math.cos(deflect)*sp;p.slideVy=Math.sin(deflect)*sp;p.angle=deflect;
      const perfect=thing.parryWindow>0;thing.shieldActive=0;thing.parryWindow=0;thing.invulnerable=.55;p.hitCooldown.set(thing.id,.45);burst(thing.x,thing.y,18);showToast(perfect?'🛡️✨ ¡PARRY! ¡PINGÜINO DEVUELTO AL RIVAL!':'🛡️ ¡PINGÜINO DESVIADO!');continue;
    }
    if(thing.jump>0&&jumpHeight(thing)>16){p.hitCooldown.set(thing.id,.35);thing.perfectDodge=.55;showToast('✨ ¡ESQUIVE PERFECTO!');burst(thing.x,thing.y,7);continue;}
    p.hitCooldown.set(thing.id,.65);dropFlagFrom(thing,p,520);thing.stun=.42;thing.invulnerable=.8;
    const level=p.chargeLevel||1;const force=[420,520,620,780,980][level-1];thing.vx=Math.cos(a)*force;thing.vy=Math.sin(a)*force;
    if(level>=3){thing.launched=.7+level*.16;thing.launchPower=level;if(level===5)showToast('🚀 ¡PAL LOBBY!');}
    burst(thing.x,thing.y,10);
  }
}


function updateDogAlly(dt,human){const a=state.ally;const enemies=allPlayers().filter(p=>p.team!==state.humanTeam);const near=enemies.sort((x,y)=>distance(human,x)-distance(human,y))[0];const idle={x:human.x-85*human.facing+Math.cos(a.idleAngle)*48,y:human.y+55+Math.sin(a.idleAngle)*34};const target=near&&distance(human,near)<300?near:idle;moveAllyToward(a,target.x,target.y,dt,near?360:295);a.attackCooldown=Math.max(0,a.attackCooldown-dt);if(near&&distance(a,near)<58&&a.attackCooldown<=0){pushCreature(near,a,330);a.attackCooldown=1.15;showToast('🐕 ¡Fuera de acá!');}}
function updateRoosterAlly(dt,human){const a=state.ally;const enemies=allPlayers().filter(p=>p.team!==state.humanTeam);const target=enemies.sort((x,y)=>distance(a,x)-distance(a,y))[0];if(target&&distance(target,human)<520)moveAllyToward(a,target.x,target.y,dt,380);else moveAllyToward(a,human.x+90+Math.cos(a.idleAngle)*70,human.y-60+Math.sin(a.idleAngle)*42,dt,315);a.attackCooldown=Math.max(0,a.attackCooldown-dt);if(target&&distance(a,target)<52&&a.attackCooldown<=0){pushCreature(target,a,235);target.stun=Math.max(target.stun,.16);a.attackCooldown=1.65;showToast('🐓 ¡PICOTAZO!');}}
function updateCatAlly(dt,human){const a=state.ally,flag=state.flag,carrier=getCarrier();let target;if(carrier){target={x:carrier.x+95*a.radius/115*Math.cos(a.angle),y:carrier.y+58*Math.sin(a.angle)};a.angle+=dt*.7;}else target={x:flag.x+55*Math.cos(a.angle),y:flag.y+35*Math.sin(a.angle)};moveAllyToward(a,target.x,target.y,dt,345);const enemies=allPlayers().filter(p=>p.team!==state.humanTeam&&distance(p,flag)<130);if(!carrier&&enemies.length&&distance(a,flag)<50){const humans=state.players.slice().sort((x,y)=>distance(x,enemies[0])-distance(y,enemies[0]));const safest=humans[humans.length-1];flag.x=safest.x+35;flag.y=safest.y;showToast('🐈 Te salvé. No era tan difícil.');burst(flag.x,flag.y,8);}}
function pushCreature(target,source,power){const ang=Math.atan2(target.y-source.y,target.x-source.x);target.vx=(target.vx||0)+Math.cos(ang)*power;target.vy=(target.vy||0)+Math.sin(ang)*power;dropFlagFrom(target,source,power);}
function updateSloth(s,dt){for(const[id,t]of s.hugCooldown){const n=t-dt;n<=0?s.hugCooldown.delete(id):s.hugCooldown.set(id,n);}if(s.hugTargetId){const targets=[...allPlayers(),state.ally].filter(Boolean);const p=targets.find(x=>x.id===s.hugTargetId);s.hugClock-=dt;if(p&&s.hugClock>0){if(p.id==='ally-1'){p.stun=Math.max(p.stun,.12);p.vx=0;p.vy=0;}else{p.stun=Math.max(p.stun,.12);p.vx=0;p.vy=0;}p.x=s.x+30;p.y=s.y;return;}if(p)s.hugCooldown.set(p.id,6);s.hugTargetId=null;showToast('🦥 ...ya está.');}
  s.turnClock-=dt;if(s.turnClock<=0){s.angle+=(Math.random()-.5)*1.8;s.turnClock=2+Math.random()*3;}const nx=s.x+Math.cos(s.angle)*s.speed*dt,ny=s.y+Math.sin(s.angle)*s.speed*dt;if(pointIsWalkable(nx,ny)){s.x=nx;s.y=ny}else s.angle+=Math.PI*.7;const victim=[...allPlayers(),state.ally].filter(Boolean).find(p=>distance(s,p)<48&&!s.hugCooldown.has(p.id));if(victim){s.hugTargetId=victim.id;s.hugClock=4;showToast('🦥 Abrazo sorpresa...');}}
function creatureName(obj){
  if(obj.id==='ally-1')return ALLIES[obj.type].emoji+' al compañero';
  if(obj.team&&Object.values(state.flags).includes(obj))return 'una bandera';
  if(obj.active!==undefined&&obj.type)return `${ITEM_ICONS[obj.type]||'🎁'} un objeto`;
  return obj.type==='penguin'?'al pingüino':obj.type==='gorilla'?'al gorila':obj.type==='sloth'?'al perezoso':obj.type==='monkey'?'al monito':obj.type==='crocodile'?'al cocodrilo':'a un jugador';
}
function antObjectKey(obj){
  if(obj.id)return obj.id;
  if(obj.team&&Object.values(state.flags).includes(obj))return `flag-${obj.team}`;
  return `thing-${obj.type||'unknown'}-${Math.round(obj.x)}-${Math.round(obj.y)}`;
}
function throwCreatureByAnt(obj,ant){
  const ang=Math.atan2(obj.y-ant.y,obj.x-ant.x)+(Math.random()-.5)*1.25;
  const power=520+Math.random()*180;
  if(obj.team&&Object.values(state.flags).includes(obj)){
    obj.carrier=null;obj.vx=Math.cos(ang)*power;obj.vy=Math.sin(ang)*power;
  }else if(obj.active!==undefined&&obj.type){
    obj.flying=false;obj.active=true;obj.throwVx=Math.cos(ang)*power;obj.throwVy=Math.sin(ang)*power;obj.throwClock=1.0;
  }else if(obj.id==='ally-1'){
    obj.vx=Math.cos(ang)*power;obj.vy=Math.sin(ang)*power;obj.stun=.65;obj.launched=1.0;obj.invulnerable=.8;
  }else if(obj.type==='penguin'){
    obj.x+=Math.cos(ang)*22;obj.y+=Math.sin(ang)*22;obj.slideVx=(obj.slideVx||0)+Math.cos(ang)*power*.65;obj.slideVy=(obj.slideVy||0)+Math.sin(ang)*power*.65;
  }else if('vx'in obj){
    obj.vx=Math.cos(ang)*power;obj.vy=Math.sin(ang)*power;obj.stun=Math.max(obj.stun||0,.55);obj.launched=Math.max(obj.launched||0,.9);
  }else{
    obj.throwVx=Math.cos(ang)*power;obj.throwVy=Math.sin(ang)*power;obj.throwClock=1.0;
  }
  showToast(`🐜 ¡La hormiga lanzó ${creatureName(obj)}!`);burst(obj.x,obj.y,8);
}
function updateThrownGuardian(obj,dt){
  if(!obj.throwClock)return false;
  obj.throwClock=Math.max(0,obj.throwClock-dt);const ox=obj.x,oy=obj.y;
  obj.x+=obj.throwVx*dt;obj.y+=obj.throwVy*dt;obj.throwVx*=Math.pow(.22,dt);obj.throwVy*=Math.pow(.22,dt);
  if(!pointIsWalkable(obj.x,obj.y)){obj.x=ox;obj.y=oy;obj.throwVx*=-.55;obj.throwVy*=-.55;}return true;
}
function updateAnt(a,dt){
  for(const[id,t]of a.throwCooldown){const n=t-dt;n<=0?a.throwCooldown.delete(id):a.throwCooldown.set(id,n);}
  a.turnClock-=dt;if(a.turnClock<=0){a.angle+=(Math.random()-.5)*1.3;a.turnClock=1.6+Math.random()*2.6;}
  const nx=a.x+Math.cos(a.angle)*a.speed*dt,ny=a.y+Math.sin(a.angle)*a.speed*dt;
  if(pointIsWalkable(nx,ny)){a.x=nx;a.y=ny}else a.angle+=Math.PI*(.55+Math.random()*.4);
  const looseFlags=Object.values(state.flags).filter(f=>!f.carrier);
  const looseItems=state.items.filter(i=>i.active&&!i.flying&&!(i.throwClock>0));
  const candidates=[...allPlayers(),...state.guardians.filter(g=>g!==a&&g.type!=='ant'&&g.type!=='elephant'),state.ally,...looseFlags,...looseItems].filter(Boolean);
  const hit=candidates.find(o=>{
    const key=antObjectKey(o);return distance(a,o)<a.radius+(o.radius||25)+5&&!a.throwCooldown.has(key);
  });
  if(hit){const key=antObjectKey(hit);a.throwCooldown.set(key,4);throwCreatureByAnt(hit,a);a.angle+=Math.PI*.45;}
}

function seasonEmoji(){return {summer:'☀️',autumn:'🍂',winter:'🌧️',spring:'🌸'}[state.season];}
function seasonalStartItems(){
  const groups={summer:['watermelon','shield','sunglasses','campfire'],autumn:['boomerang','mirror','snowman','campfire'],spring:['flower','honey','clownmask','hammer'],winter:['shield','snowman','boomerang','heavyball']};
  return (groups[state.season]||[]).map((type,i)=>{const a=-1.1+i*1.1;return makeItem(type,CONFIG.cx+Math.cos(a)*520,CONFIG.cy+Math.sin(a)*300);});
}
function nearestPuddle(g){return state.puddles.slice().sort((a,b)=>distance(g,a)-distance(g,b))[0]||null;}
function updateCrocodileGuardian(g,dt){
  g.attackCooldown=Math.max(0,g.attackCooldown-dt);g.stunned=Math.max(0,(g.stunned||0)-dt);if(g.stunned>0)return;
  let home=state.puddles.find(p=>p.id===g.homePuddleId)||nearestPuddle(g);if(!home)return;
  if(distance(g,home)>Math.max(home.rx,home.ry)+75){home=nearestPuddle(g);g.homePuddleId=home.id;showToast('🐊 ¡Este charco es mi nuevo hogar!');}
  const intruder=allPlayers().filter(p=>Math.hypot((p.x-home.x)/home.rx,(p.y-home.y)/home.ry)<1.35).sort((a,b)=>distance(g,a)-distance(g,b))[0];
  const target=intruder||home; const dx=target.x-g.x,dy=target.y-g.y,l=Math.hypot(dx,dy)||1;
  const speed=intruder?g.speed:g.speed*.65;g.x+=dx/l*speed*dt;g.y+=dy/l*speed*dt;
  if(intruder&&distance(g,intruder)<58&&g.attackCooldown<=0){pushCreature(intruder,g,470);intruder.stun=Math.max(intruder.stun,.38);g.attackCooldown=1.1;showToast('🐊💢 ¡DEFENDIENDO MI CHARQUITO!');}
}
function monkeyNearestThreat(m,range=190){
  return allPlayers().filter(p=>distance(m,p)<range).sort((a,b)=>distance(m,a)-distance(m,b))[0]||null;
}
function monkeyBestItem(m){
  return state.items.filter(i=>i.active&&!i.flying&&i.type!=='peanut').sort((a,b)=>{
    const av=(ITEM_PROFILES[a.type]?.troll||1)*90-distance(m,a);
    const bv=(ITEM_PROFILES[b.type]?.troll||1)*90-distance(m,b);
    return bv-av;
  })[0]||null;
}
function monkeyUseItem(m){
  const type=m.heldItem;if(!type)return;m.heldItem=null;
  const target=allPlayers().sort((a,b)=>distance(m,a)-distance(m,b))[0]||null;
  const aim=target?Math.atan2(target.y-m.y,target.x-m.x):m.facing>0?0:Math.PI;
  if(type==='shield'||type==='sunscreen'||type==='goldleaf'){m.shieldActive=1.2;m.parryWindow=.28;return;}
  if(type==='ball'||type==='heavyball'||type==='bouncyball'||type==='acorn'){
    state.balls.push({x:m.x,y:m.y-10,vx:Math.cos(aim)*CONFIG.ballSpeed*(type==='heavyball'?.72:1),vy:Math.sin(aim)*CONFIG.ballSpeed*(type==='heavyball'?.72:1),life:2.5,ownerTeam:'monkey',bounces:type==='bouncyball'?6:2,kind:type});return;
  }
  if(type==='boomerang'){state.boomerangs.push({x:m.x,y:m.y,vx:Math.cos(aim)*520,vy:Math.sin(aim)*520,life:2.4,ownerTeam:'monkey',hits:new Set()});return;}
  if(type==='honey'){for(let i=0;i<6;i++)state.hazards.push({type:'honey',x:m.x-Math.cos(aim)*i*34,y:m.y-Math.sin(aim)*i*34,life:7,radius:34});return;}
  if(type==='mirror'||type==='clownmask'){activateGuardianTaunt(m,type==='mirror'?520:260);return;}
  if(type==='sunglasses'&&target){target.darkVision=3;return;}
  if(type==='snowman'||type==='campfire'){state.hazards.push({type,x:m.x+Math.cos(aim)*62,y:m.y+Math.sin(aim)*62,life:type==='snowman'?10:8,radius:type==='snowman'?38:42});return;}
  if(type==='hammer'&&target){pushCreature(target,m,560);target.stun=Math.max(target.stun,.45);return;}
  if(type==='boots'||type==='juice'||type==='mushroom'){m.speed=285;setTimeout(()=>{m.speed=225;},5000);return;}
  if(type==='banana'||type==='berry'){m.speed=270;setTimeout(()=>{m.speed=225;},4000);return;}
}
function updateMonkeyGuardian(m,dt){
  m.thinkClock=Math.max(0,(m.thinkClock||0)-dt);m.stunned=Math.max(0,(m.stunned||0)-dt);
  m.itemUseClock=Math.max(0,(m.itemUseClock||0)-dt);m.escapeClock=Math.max(0,(m.escapeClock||0)-dt);
  m.shieldActive=Math.max(0,(m.shieldActive||0)-dt);m.parryWindow=Math.max(0,(m.parryWindow||0)-dt);
  m.patrolClock=Math.max(0,(m.patrolClock||0)-dt);m.hopClock=Math.max(0,(m.hopClock||0)-dt);m.hopCooldown=Math.max(0,(m.hopCooldown||0)-dt);
  m.hopHeight=m.hopClock>0?Math.sin((1-m.hopClock/.42)*Math.PI)*34:0;
  if(m.stunned>0)return;
  const gorilla=state.guardians.filter(g=>g.type==='gorilla').sort((a,b)=>distance(m,a)-distance(m,b))[0]||null;
  if(m.helpGorillaId&&gorilla){
    const accused=allPlayers().find(p=>p.id===m.accuseId);const target=accused||gorilla;moveMonkey(m,target.x,target.y,dt);
    if(distance(m,gorilla)<70&&accused){gorilla.personalTargetId=accused.id;gorilla.targetId=accused.id;gorilla.wildClock=4.5;gorilla.chaseClock=4.5;m.helpGorillaId=null;showToast('🐵👉🦍 ¡Fue ese!');}
    return;
  }
  const threat=monkeyNearestThreat(m);
  if((threat||m.escapeClock>0)&&(m.heldItem||Object.values(state.flags).some(f=>f.carrier===m.id))&&gorilla){
    m.escapeClock=Math.max(m.escapeClock,1.2);moveMonkey(m,gorilla.x,gorilla.y,dt);
    if(m.heldItem&&m.itemUseClock<=0&&distance(m,threat||gorilla)<175){monkeyUseItem(m);m.itemUseClock=1.4;}
    return;
  }
  const carried=Object.values(state.flags).find(f=>f.carrier===m.id);
  if(carried){
    carried.x=m.x;carried.y=m.y-25;m.carryClock+=dt;moveMonkey(m,CONFIG.cx,CONFIG.cy,dt);
    if(m.carryClock>3.2){carried.carrier=null;const a=Math.random()*Math.PI*2;carried.vx=Math.cos(a)*650;carried.vy=Math.sin(a)*650;m.carryClock=0;showToast('🐵❓ ¡No me dio puntos! ¡A volar!');}
    return;
  }
  if(m.heldItem){
    if(m.itemUseClock<=0&&(threat||Math.random()<.012)){monkeyUseItem(m);m.itemUseClock=1.6;return;}
    if(gorilla)moveMonkey(m,gorilla.x+Math.cos(m.thinkClock*3)*78,gorilla.y+Math.sin(m.thinkClock*3)*58,dt);
    return;
  }
  const loose=Object.values(state.flags).filter(f=>!f.carrier).sort((a,b)=>distance(m,a)-distance(m,b))[0];
  if(loose){moveMonkey(m,loose.x,loose.y,dt);if(distance(m,loose)<48){loose.carrier=m.id;m.carryClock=0;m.escapeClock=1.5;showToast('🐵🚩 ¡Yo también soy jugador!');}return;}
  const item=monkeyBestItem(m);
  if(item){moveMonkey(m,item.x,item.y,dt);if(distance(m,item)<46){item.active=false;m.heldItem=item.type;m.itemUseClock=.55+Math.random()*.65;m.escapeClock=1.4;showToast(`🐵 ${ITEM_ICONS[item.type]||'🎁'} ¡Eso ahora es mío!`);}return;}
  if(m.patrolClock<=0||distance(m,{x:m.tx||m.x,y:m.ty||m.y})<58){
    const ring=[[-.90,.58],[-.25,.72],[.34,.64],[.92,.48],[2.22,.55],[2.82,.68],[-2.78,.54],[-1.95,.68]];
    m.patrolIndex=(m.patrolIndex+1+(Math.random()<.25?Math.floor(Math.random()*3):0))%ring.length;
    const [a,r]=ring[m.patrolIndex];m.tx=CONFIG.cx+Math.cos(a)*map.outer.rx*r;m.ty=CONFIG.cy+Math.sin(a)*map.outer.ry*r;
    if(!pointIsWalkable(m.tx,m.ty)){const p=safeSpawnPoint(a,520,310);m.tx=p.x;m.ty=p.y;}
    m.patrolClock=3.6+Math.random()*2.4;m.thinkClock=.5;
  }
  moveMonkey(m,m.tx||CONFIG.cx,m.ty||CONFIG.cy,dt);
}

function moveGuardianNavigated(entity,tx,ty,speed,dt,probe=42){
  const dx=tx-entity.x,dy=ty-entity.y;
  const direct=Math.atan2(dy,dx);
  const bias=entity.navBias||1;
  const angles=[direct,direct+bias*.48,direct-bias*.48,direct+bias*.92,direct-bias*.92,direct+Math.PI/2*bias,direct-Math.PI/2*bias];
  for(const angle of angles){
    const px=entity.x+Math.cos(angle)*probe,py=entity.y+Math.sin(angle)*probe;
    const nx=entity.x+Math.cos(angle)*speed*dt,ny=entity.y+Math.sin(angle)*speed*dt;
    if(pointIsWalkable(px,py)&&pointIsWalkable(nx,ny)){entity.x=nx;entity.y=ny;return true;}
  }
  entity.navBias=bias*-1;
  return false;
}
function moveMonkey(m,tx,ty,dt){
  const dx=tx-m.x,dy=ty-m.y;if(Math.abs(dx)>2)m.facing=Math.sign(dx);
  const angle=Math.atan2(dy,dx),ox=m.x,oy=m.y;
  const probeX=m.x+Math.cos(angle)*48,probeY=m.y+Math.sin(angle)*48;
  if(ridgeCollision(probeX,probeY)&&m.hopCooldown<=0){m.hopClock=.42;m.hopCooldown=.8;}
  let moved=false;
  if(m.hopClock>0){const nx=m.x+Math.cos(angle)*m.speed*dt,ny=m.y+Math.sin(angle)*m.speed*dt;if(insideTrunk(nx,ny)){m.x=nx;m.y=ny;moved=true;}}
  else moved=moveGuardianNavigated(m,tx,ty,m.speed,dt,38);
  m.stuckClock=moved&&Math.hypot(m.x-ox,m.y-oy)>.5?0:(m.stuckClock||0)+dt;
  if(m.stuckClock>.48&&m.hopCooldown<=0){m.hopClock=.42;m.hopCooldown=.85;m.navBias=(m.navBias||1)*-1;m.stuckClock=0;}
  if(m.stuckClock>1.1){m.navBias=(m.navBias||1)*-1;m.stuckClock=0;m.thinkClock=0;m.patrolClock=0;}
}
function drawPuddles(){for(const p of state.puddles){ctx.save();ctx.globalAlpha=.72;ctx.fillStyle='#4ca7c9';ctx.beginPath();ctx.ellipse(p.x,p.y,p.rx,p.ry,.08,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(210,245,255,.8)';ctx.lineWidth=5;ctx.stroke();ctx.restore();}}
function drawWeather(){if(!isWinter())return;ctx.save();ctx.strokeStyle='rgba(210,240,255,.48)';ctx.lineWidth=3;const t=performance.now()*.48;for(let i=0;i<95;i++){const x=(i*97+t)%2050-25,y=(i*61+t*1.7)%1180-30;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-13,y+29);ctx.stroke();}ctx.restore();}

function updateHazards(dt){
  for(const h of state.hazards){h.life-=dt;for(const p of allPlayers()){
    if(distance(p,h)>h.radius+CONFIG.playerRadius)continue;
    if(h.type==='honey'){p.vx*=.82;p.vy*=.82;}
    if(h.type==='campfire'){
      if(state.season==='summer'||state.season==='spring'){p.burning=Math.max(p.burning,3);p.stun=Math.max(p.stun,.18);p.vx+=(Math.random()-.5)*180;p.vy+=(Math.random()-.5)*180;}
      else{activateGuardianTaunt(p,210);}
    }
    if(h.type==='snowman'&&(state.season==='summer'||state.season==='spring')){p.vx*=1.08;p.vy*=1.08;}
  }}
  state.hazards=state.hazards.filter(h=>h.life>0);
  for(const p of allPlayers())if(p.hammerStomp&&p.prevJumpHeight>12&&jumpHeight(p)<=2){p.hammerStomp=0;for(const q of allPlayers())if(q.id!==p.id&&distance(p,q)<145){pushCreature(q,p,520);q.stun=.35;}burst(p.x,p.y,22);showToast('🔨💥 ¡MARTILLAZO!');}
}
function updateBoomerangs(dt){for(const b of state.boomerangs){b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(!insideTrunk(b.x,b.y)||ridgeCollision(b.x,b.y)){b.vx*=-1;b.vy*=-1;}for(const p of allPlayers()){if(p.team===b.ownerTeam||b.hits.has(p.id)||distance(p,b)>38)continue;b.hits.add(p.id);p.confused=Math.max(p.confused,3);p.stun=Math.max(p.stun,.12);b.vx*=-.88;b.vy*=-.88;showToast('🪃 ¡CONTROLES CONFUNDIDOS!');}}state.boomerangs=state.boomerangs.filter(b=>b.life>0);}
function drawHazards(){for(const h of state.hazards){ctx.save();ctx.translate(h.x,h.y);ctx.globalAlpha=Math.min(1,h.life);ctx.font=h.type==='honey'?'34px serif':'46px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(h.type==='honey'?'🍯':h.type==='snowman'?'⛄':'🔥',0,0);ctx.restore();}for(const b of state.boomerangs){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(performance.now()/80);ctx.font='36px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🪃',0,0);ctx.restore();}}

function drawFauna() {
  for (const animal of state.fauna) {
    ctx.save();ctx.translate(animal.x,animal.y+Math.sin(animal.bob)*3);
    ctx.globalAlpha=.18;ctx.fillStyle='#1d120d';ctx.beginPath();ctx.ellipse(0,20,22,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.rotate(animal.throwPose>0?-.22:0);ctx.font=animal.throwPose>0?'52px serif':'43px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🐻',0,animal.throwPose>0?-7:0);if(animal.throwPose>0){ctx.font='24px serif';ctx.fillText('💨',30,-24);}ctx.restore();
  }
}

function drawItems(){for(const item of state.items){if(!item.active)continue;ctx.save();ctx.translate(item.x,item.y+Math.sin(item.bob)*5);ctx.font='42px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ITEM_ICONS[item.type]||'❓',0,0);ctx.restore();}}
function drawGuardians(){for(const g of state.guardians){
  ctx.save();ctx.translate(g.x,g.y-(g.jump?.height||g.hopHeight||0));ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.globalAlpha=1;ctx.fillStyle='#23150f';ctx.beginPath();ctx.ellipse(0,27,32,10,0,0,Math.PI*2);ctx.fill();
  if(g.type==='penguin'){if(g.state==='charge'){const t=Math.min(1,g.charge/g.chargeGoal);ctx.strokeStyle='#54d6ff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,38,-Math.PI/2,-Math.PI/2+t*Math.PI*2);ctx.stroke();if((g.chargeLevel||1)>=3){ctx.font='27px serif';ctx.fillText('🪖',0,-25);}}if(g.state==='slide')ctx.rotate(g.angle+Math.PI/2);ctx.font='54px serif';ctx.fillText('🐧',0,0);ctx.restore();continue;}
  if(g.type==='sloth'){ctx.font='52px serif';ctx.fillText('🦥',0,0);if(g.hugTargetId){ctx.font='18px serif';ctx.fillText('🤗',0,-39);}ctx.restore();continue;}
  if(g.type==='ant'){ctx.fillStyle='#111';ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();ctx.font='42px serif';ctx.fillText('🐜',0,0);ctx.restore();continue;}
  if(g.type==='crocodile'){ctx.font='58px serif';ctx.fillText('🐊',0,0);ctx.restore();continue;}
  if(g.type==='monkey'){ctx.font='54px serif';ctx.fillText('🐒',0,0);if(g.heldItem){ctx.font='28px serif';ctx.fillText(ITEM_ICONS[g.heldItem]||'🎁',0,-43);}if(g.shieldActive>0){ctx.strokeStyle='#dff7ff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,42,-1.25,1.25);ctx.stroke();}ctx.restore();continue;}
  if(g.type==='elephant'){if(g.state==='trumpet'){ctx.font='24px serif';ctx.fillText('📯',34,-35);}if(g.state==='charge'){ctx.rotate(g.angle);ctx.font='24px serif';ctx.fillText('💨',-54,-4);ctx.rotate(-g.angle);}ctx.font='72px serif';ctx.fillText('🐘',0,-4);ctx.restore();continue;}
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
function nonFlagStyleGoal(player,carrier=null){
  const enemy=mostDangerousEnemy(player),centerEnemies=centerEnemiesFor(player),style=player.aiStyle;
  if(carrier){
    if(style==='defensivo')return enemy?{x:enemy.x,y:enemy.y,role:'intercept'}:{x:carrier.x+110*player.navBias,y:carrier.y+70,role:'escort'};
    if(style==='troll')return enemy?{x:enemy.x,y:enemy.y,role:'harass'}:{x:CONFIG.cx,y:CONFIG.cy,role:'contest'};
    if(style==='tactico')return centerEnemies[0]?{x:centerEnemies[0].x,y:centerEnemies[0].y,role:'clear'}:{x:carrier.x+130*player.navBias,y:carrier.y-55,role:'escort'};
    return centerEnemies[0]?{x:centerEnemies[0].x,y:centerEnemies[0].y,role:'clear'}:{x:CONFIG.cx,y:CONFIG.cy,role:'contest'};
  }
  if(style==='ofensivo')return enemy?{x:enemy.x,y:enemy.y,role:'attack'}:{x:CONFIG.cx,y:CONFIG.cy,role:'contest'};
  if(style==='defensivo')return enemy?{x:enemy.x,y:enemy.y,role:'intercept'}:{x:CONFIG.cx+player.navBias*95,y:CONFIG.cy+70,role:'guard'};
  if(style==='tactico')return enemy?{x:(enemy.x+CONFIG.cx)/2,y:(enemy.y+CONFIG.cy)/2,role:'setup'}:{x:CONFIG.cx+player.navBias*80,y:CONFIG.cy-55,role:'contest'};
  if(style==='troll')return enemy?{x:enemy.x,y:enemy.y,role:'harass'}:{x:CONFIG.cx+(Math.random()-.5)*180,y:CONFIG.cy+(Math.random()-.5)*130,role:'harass'};
  if(style==='caotico'){
    const choices=[];const banana=state.items.find(i=>i.active&&i.type==='banana');if(banana)choices.push(banana);
    const peng=state.guardians.find(g=>g.type==='penguin');if(peng)choices.push({x:peng.x+110*player.navBias,y:peng.y+60});
    if(enemy)choices.push(enemy);choices.push({x:CONFIG.cx+(Math.random()-.5)*220,y:CONFIG.cy+(Math.random()-.5)*160});
    const c=choices[Math.floor(Math.random()*choices.length)];return {x:c.x,y:c.y,role:'chaos'};
  }
  return enemy?{x:(enemy.x+CONFIG.cx)/2,y:(enemy.y+CONFIG.cy)/2,role:'support'}:{x:CONFIG.cx,y:CONFIG.cy,role:'contest'};
}
function chooseStableAiTarget(player){
  const ownFlag=flagForTeam(player.team),team=rosterForTeam(player.team),carrier=getCarrier(ownFlag,team);
  if(player.aiTeamRole==='support'){
    const winner=teamWinner(player.team,player.id);
    if(carrier?.id===player.id&&winner)return {x:winner.x,y:winner.y,role:'deliver'};
    if(!carrier&&player.flagPickupCooldown<=0)return {x:ownFlag.x,y:ownFlag.y,role:'recover'};
    return nonFlagStyleGoal(player,carrier);
  }
  if(carrier?.id===player.id)return {x:CONFIG.cx+player.navBias*30,y:CONFIG.cy-20,role:'score'};
  if(!carrier&&designatedWinnerSeeker(player,ownFlag,team)&&!team.some(p=>p.aiTeamRole==='support'))return {x:ownFlag.x,y:ownFlag.y,role:'recover'};
  return nonFlagStyleGoal(player,carrier);
}

function bestAiItemTarget(player){
  if(player.heldItem||player.heldBall>0)return null;
  const candidates=state.items.filter(i=>i.active&&!i.flying&&i.type!=='peanut');
  let best=null,bestScore=-1;
  for(const item of candidates){
    const affinity=itemAffinity(item.type,player.aiStyle);const d=distance(player,item);
    const score=affinity*110-d*.18;
    if(score>bestScore){bestScore=score;best=item;}
  }
  // El objetivo de la partida manda: sólo abandona su tarea por un ítem claramente útil y cercano.
  return bestScore>95?best:null;
}
function shouldAiUseHeldItem(player,enemy){
  if(!player.heldItem)return false;
  if(player.heldItem==='shield')return !!state.guardians.find(g=>g.type==='penguin'&&g.state==='slide'&&distance(player,g)<270)||!!enemy&&distance(player,enemy)<90;
  return !!enemy&&distance(player,enemy)<420;
}
function rivalAiInput(player){
  player.aiDecisionClock-=1/60;
  player.aiIdleWatch=(player.aiIdleWatch||0)+1/60;
  if(Math.hypot(player.vx,player.vy)>18)player.aiIdleWatch=0;
  if(player.aiIdleWatch>1.8){player.aiDecisionClock=0;player.navStuckClock=1;player.navEscapeClock=.8;player.navEscapeAngle=Math.random()*Math.PI*2;player.aiIdleWatch=0;}
  if(player.aiDecisionClock<=0||!Number.isFinite(player.aiTargetX)||distance(player,{x:player.aiTargetX,y:player.aiTargetY})<28){
    const usefulItem=bestAiItemTarget(player);const goal=usefulItem?{x:usefulItem.x,y:usefulItem.y,role:'item'}:chooseStableAiTarget(player);
    player.aiTargetX=goal.x;player.aiTargetY=goal.y;player.aiRole=goal.role;
    player.aiDecisionClock=(player.aiStyle==='caotico'?1.0:.38)+Math.random()*.28;
  }
  const enemy=mostDangerousEnemy(player);
  if(shouldAiUseHeldItem(player,enemy))useHeldItem(player);
  if(player.heldBall>0&&enemy&&distance(player,enemy)<410)throwBall(player,enemy);
  return smartAiDirections(player,{x:player.aiTargetX,y:player.aiTargetY},player.aiRole==='escort'?55:20);
}

function pointIsWalkable(x,y){return insideTrunk(x,y)&&!ridgeCollision(x,y);}
function smartAiDirections(player,target,dead=18){
  if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))target={x:CONFIG.cx,y:CONFIG.cy};
  const step=46;let dx=target.x-player.x,dy=target.y-player.y;const dist=Math.hypot(dx,dy)||1;
  let angle=Math.atan2(dy,dx),directAngle=angle;const ahead=(a,d=step)=>pointIsWalkable(player.x+Math.cos(a)*d,player.y+Math.sin(a)*d);
  let directBlocked=!ahead(angle,54),shouldJump=false;
  if(directBlocked&&!player.heldItem&&player.heldBall<=0&&player.jump<=0&&player.aiJumpCooldown<=0){
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
    shouldJump=!player.heldItem&&player.heldBall<=0&&player.jump<=0&&player.aiJumpCooldown<=0;player.aiJumpCooldown=.9;
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
  state.balls.push({x:player.x,y:player.y-10,vx:Math.cos(a)*CONFIG.ballSpeed,vy:Math.sin(a)*CONFIG.ballSpeed,life:2.2,ownerTeam:player.team,bounces:2,kind:'ball'});
  player.heldBall=0; burst(player.x,player.y,7);
}
function settleBall(ball){
  if(ball.settled)return;ball.settled=true;
  let x=ball.x,y=ball.y;if(!pointIsWalkable(x,y)){const a=Math.atan2(y-CONFIG.cy,x-CONFIG.cx);const p=safeSpawnPoint(a,520,310);x=p.x;y=p.y;}
  state.items.push(makeItem(ball.kind&&['heavyball','bouncyball'].includes(ball.kind)?ball.kind:'ball',x,y));
}
function updateBalls(dt){
  for(const ball of state.balls){
    const ox=ball.x,oy=ball.y;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=Math.pow(.78,dt);ball.vy*=Math.pow(.78,dt);ball.life-=dt;
    if(!insideTrunk(ball.x,ball.y)){ball.x=ox;ball.y=oy;ball.vx*=-.65;ball.vy*=-.65;ball.bounces--;}
    for(const sloth of state.guardians.filter(g=>g.type==='sloth')){if(distance(ball,sloth)<42){const a=Math.atan2(sloth.y-ball.y,sloth.x-ball.x);sloth.x+=Math.cos(a)*85;sloth.y+=Math.sin(a)*85;ball.life=0;showToast('⚽🦥 ¡Movieron al perezoso!');break;}}
    if(ball.life<=0)continue;
    if(state.ally&&distance(ball,state.ally)<38){hitAlly(ball,470);ball.life=0;showToast('⚽ ¡Pelotazo al compañero!');}
    if(ball.life<=0)continue;
    const monkey=state.guardians.find(g=>g.type==='monkey'&&distance(ball,g)<42);
    if(monkey){monkey.stunned=.5;const gorilla=state.guardians.find(g=>g.type==='gorilla');const accused=allPlayers().sort((a,b)=>distance(monkey,a)-distance(monkey,b))[0];if(gorilla&&accused){monkey.helpGorillaId=gorilla.id;monkey.accuseId=accused.id;showToast('🐵😭 ¡GORILA, AYUDAME!');}ball.life=0;burst(monkey.x,monkey.y,10);}
    if(ball.life<=0)continue;
    for(const p of allPlayers()){
      if(p.team===ball.ownerTeam||p.invulnerable>0||distance(ball,p)>38)continue;
      dropFlagFrom(p,ball,470);p.stun=.35;p.invulnerable=.7;const a=Math.atan2(p.y-ball.y,p.x-ball.x);p.vx=Math.cos(a)*430;p.vy=Math.sin(a)*430;ball.life=0;burst(p.x,p.y,15);showToast('⚽ ¡Pelotazo!');break;
    }
  }
  for(const b of state.balls)if((b.life<=0||b.bounces<0)&&!b.settled)settleBall(b);
  state.balls=state.balls.filter(b=>b.life>0&&b.bounces>=0);
}
function drawBalls(){for(const b of state.balls){ctx.save();ctx.translate(b.x,b.y);ctx.font='34px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚽',0,0);ctx.restore();}}
function updateBearThrows(dt){
  state.bearThrowClock-=dt;
  const bear=state.fauna.find(a=>a.type==='bear');
  if(!bear)return;
  bear.throwPose=Math.max(0,bear.throwPose-dt);
  if(state.bearThrowClock>0)return;
  state.bearThrowClock=CONFIG.bearThrowEvery;bear.throwPose=.85;
  let landing=null;
  for(let tries=0;tries<18&&!landing;tries++){
    const a=Math.random()*Math.PI*2,r=235+Math.random()*390;
    const x=CONFIG.cx+Math.cos(a)*r,y=CONFIG.cy+Math.sin(a)*r*.60;
    if(pointIsWalkable(x,y))landing={x,y};
  }
  landing ||= {x:CONFIG.cx,y:CONFIG.cy+260};
  const rules=seasonRules(),roll=Math.random();
  if(roll<rules.bearPeanutChance){
    state.items.push(makeItem('peanut',bear.x,bear.y,{active:false,flying:true,sx:bear.x,sy:bear.y,tx:landing.x,ty:landing.y,flight:1.2,arcHeight:170,thrownByBear:true}));
    showToast('🐻🥜 ¡La osa lanzó un maní!');burst(bear.x,bear.y,7);return;
  }
  if(roll<rules.bearPeanutChance+rules.eggChance){
    state.eggs.push({id:'egg-'+Math.random().toString(36).slice(2),x:bear.x,y:bear.y,sx:bear.x,sy:bear.y,tx:landing.x,ty:landing.y,flight:1.35,age:0,stage:'flight'});
    showToast(state.season==='summer'?'🐻🥚 ¡OTRO HUEVO DE VERANO!':'🐻🥚 ¡LA OSA TIRÓ UN HUEVO!');return;
  }
  const type=Math.random()<.5?'banana':'ball';
  state.items.push(makeItem(type,bear.x,bear.y,{active:false,flying:true,sx:bear.x,sy:bear.y,tx:landing.x,ty:landing.y,flight:1.25,arcHeight:175,thrownByBear:true}));
  showToast(type==='banana'?'🐻🍌 ¡La osa lanzó una banana!':'🐻⚽ ¡La osa lanzó una pelota!');burst(bear.x,bear.y,7);
}
function updateEggsAndChicks(dt){
  const rules=chickRules();
  for(const egg of state.eggs){egg.age+=dt;if(egg.stage==='flight'){const t=Math.min(1,egg.age/CONFIG.eggFlightSeconds);egg.x=egg.sx+(egg.tx-egg.sx)*t;egg.y=egg.sy+(egg.ty-egg.sy)*t-Math.sin(Math.PI*t)*145;if(t>=1){egg.stage='egg';egg.age=0;egg.x=egg.tx;egg.y=egg.ty;burst(egg.x,egg.y,6);}}else if(egg.stage==='egg'&&egg.age>rules.hatchStep){egg.stage='crack';egg.age=0;}else if(egg.stage==='crack'&&egg.age>rules.hatchStep){egg.stage='baby';egg.age=0;}else if(egg.stage==='baby'&&egg.age>rules.hatchStep){state.chicks.push({id:'chick-'+Math.random().toString(36).slice(2),x:egg.x,y:egg.y,vx:0,vy:0,life:rules.life,power:rules.power,attackCooldown:0,phase:0,exiting:false});egg.dead=true;showToast('🐤😈 ¡NACIÓ EL POLLITO DEMONIO!');}}
  state.eggs=state.eggs.filter(e=>!e.dead);
  for(const c of state.chicks){c.phase+=dt;c.attackCooldown=Math.max(0,c.attackCooldown-dt);if(!c.exiting){c.life-=dt;const targets=allPlayers();const target=targets.sort((a,b)=>distance(c,a)-distance(c,b))[0];if(target){const ang=Math.atan2(target.y-c.y,target.x-c.x);c.vx=approach(c.vx,Math.cos(ang)*420,1100*dt);c.vy=approach(c.vy,Math.sin(ang)*420,1100*dt);if(distance(c,target)<45&&c.attackCooldown<=0){pushCreature(target,c,255*(c.power||1));target.stun=Math.max(target.stun,.12);c.attackCooldown=.48;showToast('🐤 ¡PICOTAZO DEMONÍACO!');}}if(c.life<=0){c.exiting=true;const ang=Math.atan2(c.y-CONFIG.cy,c.x-CONFIG.cx);c.vx=Math.cos(ang)*560;c.vy=Math.sin(ang)*560;showToast('🐤💨 ¡El demonio volvió al bosque!');}}else{c.life-=dt;if(c.life<-2)c.dead=true;}c.x+=c.vx*dt;c.y+=c.vy*dt;if(!c.exiting&&!insideTrunk(c.x,c.y)){c.vx*=-.6;c.vy*=-.6;c.x=Math.max(95,Math.min(1905,c.x));c.y=Math.max(80,Math.min(1045,c.y));}}
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
  ui.victoryLevelLabel.textContent=`NIVEL ${state.level}`;ui.nextLevel.hidden=team!==state.humanTeam||state.level>=12;ui.victoryTitle.textContent=team===state.humanTeam?(state.level>=12?'¡DOMINARON LAS CUATRO ESTACIONES!':'¡EL CORAZÓN ES SUYO!'):'¡OTRO EQUIPO REINÓ!';
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
  ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(state.staticMap,0,0); drawCenter(); drawPuddles();
  drawFauna(); drawHazards(); drawItems(); drawBalls(); drawEggsAndChicks(); drawFlag(state.flag);drawFlag(state.rivalFlag);drawFlag(state.rival2Flag); drawGuardians(); drawAlly(); allPlayers().forEach(drawPlayer); drawParticles(); drawWeather();
}
function drawForest() {
  const g = ctx.createRadialGradient(CONFIG.cx,CONFIG.cy,210,CONFIG.cx,CONFIG.cy,1040);
  const palette=state.season==='autumn'?['#8f6a2b','#4a2c1d']:state.season==='winter'?['#446b68','#17353c']:state.season==='spring'?['#55a84b','#1d5b35']:['#397c35','#143e22']; g.addColorStop(0,palette[0]); g.addColorStop(1,palette[1]); ctx.fillStyle=g; ctx.fillRect(0,0,CONFIG.width,CONFIG.height);
  ctx.globalAlpha=.22; ctx.font='54px serif';
  for (let y=20;y<CONFIG.height;y+=75) for (let x=10;x<CONFIG.width;x+=82) if (!insideTrunk(x,y)) ctx.fillText(state.season==='autumn'?((x+y)%3?'🍂':'🍁'):state.season==='winter'?((x+y)%3?'🌧️':'🌲'):state.season==='spring'?((x+y)%3?'🌸':'🌿'):((x+y)%3?'🌿':'🌳'),x,y);
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
  if(player.heldItem){ctx.font='21px serif';ctx.fillText(ITEM_ICONS[player.heldItem]||'🎁',25,32);}
  if(player.shieldActive>0){ctx.strokeStyle=player.parryWindow>0?'rgba(255,255,255,.98)':'rgba(119,222,255,.95)';ctx.lineWidth=player.parryWindow>0?8:5;ctx.beginPath();ctx.arc(0,5,42,0,Math.PI*2);ctx.stroke();}
  if(player.darkVision>0){ctx.globalAlpha=.72;ctx.fillStyle='#111';ctx.beginPath();ctx.arc(0,5,46,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.font='18px serif';ctx.fillText('🕶️',0,5);}
  ctx.restore();
}
function drawAlly() {
  if(!state.ally) return;
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
  const on=(event)=>{event.preventDefault();state.touch.add(key);button.setPointerCapture?.(event.pointerId);};
  const off=(event)=>{event.preventDefault();state.touch.delete(key);};
  button.addEventListener('pointerdown',on);button.addEventListener('pointerup',off);button.addEventListener('pointercancel',off);button.addEventListener('pointerleave',off);
});
function bindVirtualStick(element){
  const player=element.dataset.stick, knob=element.querySelector('.virtual-stick-knob');
  let pointerId=null;
  const update=(event)=>{
    const r=element.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=event.clientX-cx,dy=event.clientY-cy;
    const max=r.width*.32,len=Math.hypot(dx,dy)||1,scale=Math.min(1,max/len);
    dx*=scale;dy*=scale;
    state.joysticks[player]={x:dx/max,y:dy/max};
    knob.style.transform=`translate(${dx}px,${dy}px)`;
  };
  const end=(event)=>{if(pointerId!==null&&event.pointerId!==pointerId)return;pointerId=null;state.joysticks[player]={x:0,y:0};knob.style.transform='translate(0,0)';};
  element.addEventListener('pointerdown',(event)=>{event.preventDefault();pointerId=event.pointerId;element.setPointerCapture?.(pointerId);update(event);});
  element.addEventListener('pointermove',(event)=>{if(event.pointerId===pointerId)update(event);});
  element.addEventListener('pointerup',end);element.addEventListener('pointercancel',end);element.addEventListener('lostpointercapture',end);
}
$$('[data-stick]').forEach(bindVirtualStick);
window.addEventListener('blur',()=>{state.keys.clear();state.touch.clear();state.joysticks.p1={x:0,y:0};state.joysticks.p2={x:0,y:0};});

bindMenus();
