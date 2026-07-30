'use strict';

/*
  REY DE LA COLINA · ALPHA 17.0 · DIRECTOR, CABRA, KOALA Y DOS OSAS
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
  gameShell: $('#gameShell'), hearts: $('#heartsLabel'), rival2Score: $('#rival2ScoreLabel'), rival3Score: $('#rival3ScoreLabel'), humanDot: $('#humanTeamDot'), rivalDot: $('#rivalTeamDot'), rival2Dot: $('#rival2TeamDot'), rival3Dot: $('#rival3TeamDot'), levelSelect: $('#levelSelect')
};
const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d');
function drawItemGraphic(type,x,y,size=42){
  ctx.font=`${size}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ITEM_ICONS[type]||'❓',x,y);
}

// Alpha 14.2: HUD más compacto y desplazado al lateral para liberar el centro.
(function applyAlpha142HudPatch(){
  if(document.getElementById('alpha142HudPatch')) return;
  const style=document.createElement('style');
  style.id='alpha142HudPatch';
  style.textContent=`
    .hud{left:max(14px,env(safe-area-inset-left));right:auto;transform:none;gap:6px;top:max(10px,env(safe-area-inset-top));}
    .hud-card,.icon-button{min-height:43px;border-width:2px;border-radius:13px;}
    .hud-card{padding:5px 10px;gap:5px;}
    .hud-card span{font-size:1.35rem;}
    .hud-card strong{font-size:1.05rem;}
    .hud-card small{font-size:.72rem;}
    .icon-button{width:43px;font-size:1.05rem;}
    @media(max-width:700px){
      .hud{left:8px;top:7px;gap:4px;}
      .hud-card,.icon-button{min-height:38px;border-radius:11px;}
      .hud-card{padding:4px 7px;}
      .hud-card span{font-size:1.12rem;}
      .hud-card strong{font-size:.92rem;}
      .hud-card small{font-size:.64rem;}
      .icon-button{width:38px;font-size:.92rem;}
    }
  `;
  document.head.appendChild(style);
})();

// Alpha 17.0: cuarto marcador creado sin exigir cambios en el HTML existente.
(function ensureFourthTribeHud(){
  const source=document.getElementById('rival2ScoreLabel');
  if(!source||document.getElementById('rival3ScoreLabel')) return;
  const card=source.closest('.hud-card');
  if(!card||!card.parentElement) return;
  const clone=card.cloneNode(true);
  const score=clone.querySelector('#rival2ScoreLabel');
  const dot=clone.querySelector('#rival2TeamDot');
  if(score){score.id='rival3ScoreLabel';score.textContent='0';}
  if(dot){dot.id='rival3TeamDot';dot.textContent='🟡';}
  clone.id='rival3HudCard';
  clone.hidden=true;
  card.parentElement.insertBefore(clone,card.nextSibling);
})();

const CONFIG = Object.freeze({
  width: 2000, height: 1125, cx: 1000, cy: 570,
  playerRadius: 25, speed: 265, jumpDuration: .54, jumpCooldown: .08,
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
function allPlayers(){ return [...state.players,...state.rivals,...state.rivals2,...state.rivals3]; }
function rosterForTeam(team){ return team===state.humanTeam?state.players:team===state.rivalTeam?state.rivals:team===state.rival2Team?state.rivals2:state.rivals3; }
function flagForTeam(team){ return state.flags[team]; }
function randomStyle(){ return AI_STYLES[Math.floor(Math.random()*AI_STYLES.length)]; }

// Afinidades simples: cada contenido declara a qué personalidad de IA atrae.
const ITEM_PROFILES = Object.freeze({
  ball:{ofensivo:3,defensivo:1,todoterreno:2,tactico:1,troll:2,caotico:2},
  heavyball:{ofensivo:3,defensivo:1,todoterreno:2,tactico:1,troll:2,caotico:2},
  bouncyball:{ofensivo:2,defensivo:0,todoterreno:2,tactico:2,troll:3,caotico:3},
  shield:{ofensivo:1,defensivo:3,todoterreno:2,tactico:2,troll:1,caotico:1},
  honey:{ofensivo:0,defensivo:2,todoterreno:2,tactico:3,troll:3,caotico:2},
  gift:{ofensivo:2,defensivo:2,todoterreno:3,tactico:2,troll:3,caotico:3},
  television:{ofensivo:1,defensivo:2,todoterreno:2,tactico:3,troll:3,caotico:3},
  radio:{ofensivo:1,defensivo:2,todoterreno:2,tactico:3,troll:3,caotico:3},
  bell:{ofensivo:1,defensivo:2,todoterreno:2,tactico:3,troll:3,caotico:3},
  bomb:{ofensivo:3,defensivo:0,todoterreno:2,tactico:2,troll:3,caotico:3},
  ice:{ofensivo:2,defensivo:2,todoterreno:2,tactico:3,troll:2,caotico:3},
  fish:{ofensivo:2,defensivo:1,todoterreno:2,tactico:3,troll:3,caotico:3},
  tropicalfish:{ofensivo:2,defensivo:1,todoterreno:3,tactico:3,troll:3,caotico:3},
  pufferfish:{ofensivo:3,defensivo:0,todoterreno:2,tactico:2,troll:3,caotico:3},
  fishingrod:{ofensivo:2,defensivo:1,todoterreno:3,tactico:3,troll:3,caotico:3},
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
  elephant:{ofensivo:3,defensivo:0,todoterreno:2,tactico:3,troll:1,caotico:3},
  jaguar:{ofensivo:3,defensivo:0,todoterreno:2,tactico:3,troll:2,caotico:3}
});
const HOLDABLE_ITEMS=new Set(['ball','heavyball','bouncyball','shield','honey','television','radio','bell','ice','fish','tropicalfish','pufferfish','fishingrod','snowman','sunglasses','campfire','hammer','clownmask','acorn','sunscreen','goldleaf']);
const ITEM_ICONS={boots:'👟',shield:'🛡️',banana:'🍌',ball:'⚽',heavyball:'🏐',bouncyball:'🏀',watermelon:'🍉',juice:'🧃',sunscreen:'🧴',acorn:'🌰',mushroom:'🍄',goldleaf:'🍁',flower:'🌸',honey:'🍯',berry:'🫐',peanut:'🥜',gift:'🎁',television:'📺',radio:'📻',snowman:'⛄',sunglasses:'🕶️',campfire:'🔥',hammer:'🔨',clownmask:'🤡',bell:'🔔',bomb:'💣',ice:'❄️',fish:'🐟',tropicalfish:'🐠',pufferfish:'🐡',fishingrod:'🎣'};
function itemAffinity(type,style){return ITEM_PROFILES[type]?.[style]??(style==='todoterreno'?2:1);}



const state = {
  level: 1, mode: 'solo', selectedCharacter: 'tina', selectedAlly: 'loro', selectedColor: 'red', humanTeam:'red', rivalTeam:'blue', rival2Team:'green', rival3Team:'gold', running: false,
  paused: false, score: 0, rivalScore: 0, rival2Score: 0, rival3Score: 0, scoreClock: 0, rivalScoreClock: 0, rival2ScoreClock: 0, rival3ScoreClock: 0, lastTime: 0, players: [], rivals: [], rivals2: [], rivals3: [], flags:{}, flag: null, rivalFlag: null, rival2Flag:null, rival3Flag:null,
  ally: null, particles: [], keys: new Set(), touch: new Set(), winner: false,
  flagPassCooldown: 0, flagPassArmed: true, guardians: [], items: [],
  rivalFlags: [], toastTimer: 0, fauna: [], balls: [], eggs: [], chicks: [], bearThrowClock: 12, staticMap: null, eventFeed: [],
  joysticks: { p1:{x:0,y:0}, p2:{x:0,y:0} }, puddles: [], season: 'summer', cameraShake: 0, hazards: [], bees: [], bombs: [], clouds: [], bearItemClock: 6, bearSpecialClock: 10, bearFishClock: 15, cloudCheckClock: 60, fishProjectiles: []
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
    invulnerable: 0, stun: 0, boots: 0, shield: 0, heldBall: 0, heldItem: null, shieldActive:0, parryWindow:0,  hammerSwing:0, darkVision:0, confused:0, clownTaunt:0, burning:0, chilled:0, aiClock: 0,
    navLastX: x, navLastY: y, navStuckClock: 0, navEscapeClock: 0, navEscapeAngle: 0, navBias: Math.random()<.5?-1:1,
    flagPickupCooldown: 0, aiSupportMode: 'recover', aiSupportClock: 0, aiJumpCooldown: 0,
    tauntHistory: [], tauntLastAxis: '', tauntCooldown: 0, aiStyle: randomStyle(), outline: id.endsWith('1')||id==='p1'?'black':'white', bananaBoost:0, launched:0, launchPower:0, perfectDodge:0, stompCooldown:0, prevJumpHeight:0,
    aiDecisionClock:0, aiTargetX:x, aiTargetY:y, aiTargetId:null, aiRole:null, aiTeamRole:null,
    aiFarClock:0, aiMissionClock:0, aiHillAnchorAngle:Math.random()*Math.PI*2,
    aiPlanLock:0, aiCaptureDuty:false, deathFlash:0, ghost:0, bombFuse:0, wet:0, rodActive:false };
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

// Alpha 14.1: cada equipo conserva siempre un responsable de llevar SU bandera a la colina.
function captureBotForTeam(team){
  const bots=team.filter(p=>p.ai);
  if(!bots.length)return null;
  const ownFlag=flagForTeam(bots[0].team);
  const rosterCarrier=getCarrier(ownFlag,team);
  if(rosterCarrier?.ai)return rosterCarrier;
  const winners=bots.filter(p=>p.aiTeamRole==='winner');
  const pool=winners.length?winners:bots;
  return pool.slice().sort((a,b)=>distance(a,ownFlag)-distance(b,ownFlag))[0]||bots[0];
}
function refreshCaptureDuties(team){
  const captain=captureBotForTeam(team);
  for(const bot of team.filter(p=>p.ai))bot.aiCaptureDuty=bot.id===captain?.id;
  return captain;
}
function captureMissionFor(player){
  const team=rosterForTeam(player.team),ownFlag=flagForTeam(player.team);
  const captain=refreshCaptureDuties(team);
  if(captain?.id!==player.id)return null;
  const carrier=flagCarrierEntity(ownFlag);
  if(carrier?.id===player.id)return {x:CONFIG.cx+player.navBias*24,y:CONFIG.cy-14,role:'score'};
  if(!carrier)return {x:ownFlag.x,y:ownFlag.y,role:'capture-flag'};
  if(carrier.team===player.team)return {x:carrier.x+player.navBias*92,y:carrier.y-35,role:'escort'};
  return {x:ownFlag.x,y:ownFlag.y,role:'recover-stolen'};
}

function resetWorld() {
  ui.rival3Score=document.getElementById('rival3ScoreLabel');ui.rival3Dot=document.getElementById('rival3TeamDot');const r3Card=document.getElementById('rival3HudCard');if(r3Card)r3Card.hidden=state.level<7;
  state.season=seasonForLevel(state.level); state.staticMap=null; state.puddles=[]; state.cameraShake=0;
  state.score=0;state.rivalScore=0;state.rival2Score=0;state.rival3Score=0;state.scoreClock=0;state.rivalScoreClock=0;state.rival2ScoreClock=0;state.rival3ScoreClock=0;state.winner=false;state.paused=false;
  state.particles=[];state.keys.clear();state.touch.clear();state.joysticks.p1={x:0,y:0};state.joysticks.p2={x:0,y:0};state.flagPassCooldown=0;state.flagPassArmed=true;
  const colors=Object.keys(TEAM_COLORS); state.humanTeam=state.selectedColor;
  const remaining=colors.filter(c=>c!==state.humanTeam); state.rivalTeam=remaining[0]; state.rival2Team=remaining[1]; state.rival3Team=remaining[2];
  const other=state.selectedCharacter==='tina'?'nito':'tina';
  state.flags={};
  state.flags[state.humanTeam]={x:1000,y:1030,carrier:null,bob:0,vx:0,vy:0,team:state.humanTeam};
  state.flags[state.rivalTeam]={x:1000,y:110,carrier:null,bob:2,vx:0,vy:0,team:state.rivalTeam};
  state.flags[state.rival2Team]={x:225,y:485,carrier:null,bob:4,vx:0,vy:0,team:state.rival2Team};
  if(state.level>=7) state.flags[state.rival3Team]={x:1775,y:485,carrier:null,bob:6,vx:0,vy:0,team:state.rival3Team};
  state.flag=state.flags[state.humanTeam];state.rivalFlag=state.flags[state.rivalTeam];state.rival2Flag=state.flags[state.rival2Team];state.rival3Flag=state.flags[state.rival3Team]||null;
  // Cada equipo nace en el anillo previo a la colina y en el lado opuesto a su bandera.
  // Los dos integrantes comparten sector, pero aparecen separados para evitar choques iniciales.
  const humanSpawn=teamSpawnPair(state.flag), rivalSpawn=teamSpawnPair(state.rivalFlag), rival2Spawn=teamSpawnPair(state.rival2Flag), rival3Spawn=state.rival3Flag?teamSpawnPair(state.rival3Flag):null;
  state.players=[makePlayer('p1',state.selectedCharacter,humanSpawn[0].x,humanSpawn[0].y,'p1',false,state.humanTeam),makePlayer('p2',other,humanSpawn[1].x,humanSpawn[1].y,'p2',state.mode==='solo',state.humanTeam)];
  state.rivals=[makePlayer('b1','tina',rivalSpawn[0].x,rivalSpawn[0].y,'bot',true,state.rivalTeam),makePlayer('b2','nito',rivalSpawn[1].x,rivalSpawn[1].y,'bot',true,state.rivalTeam)];
  state.rivals2=[makePlayer('c1','tina',rival2Spawn[0].x,rival2Spawn[0].y,'bot',true,state.rival2Team),makePlayer('c2','nito',rival2Spawn[1].x,rival2Spawn[1].y,'bot',true,state.rival2Team)];
  state.rivals3=rival3Spawn?[makePlayer('d1','tina',rival3Spawn[0].x,rival3Spawn[0].y,'bot',true,state.rival3Team),makePlayer('d2','nito',rival3Spawn[1].x,rival3Spawn[1].y,'bot',true,state.rival3Team)]:[];
  assignTeamAiRoles(state.players);assignTeamAiRoles(state.rivals);assignTeamAiRoles(state.rivals2);assignTeamAiRoles(state.rivals3);
  state.ally=state.selectedAlly==='none'?null:{id:'ally-1',type:state.selectedAlly,x:humanSpawn[0].x+36,y:humanSpawn[0].y+48,angle:1.9,radius:25,phase:0,deliveryClock:CONFIG.parrotDeliveryEvery,task:null,carryingItem:null,targetPlayerId:'p1',retargetClock:0,attackCooldown:0,targetGuardianId:null,decisionClock:0,idleClock:0,idleAngle:Math.random()*Math.PI*2,flagCarry:false,vx:0,vy:0,stun:0,launched:0,invulnerable:0,team:state.humanTeam};
  state.guardians=guardianSetForLevel(state.level);
  if(isWinter()) state.puddles=makePuddles();
  state.items=[makeItem('boots',1540,790),makeItem('shield',485,390),makeItem('banana',650,650),makeItem('banana',1320,520),makeItem('banana',1020,835),...seasonalStartItems(),...alpha151TestItems(state.level),...makeInitialPeanuts()];
  state.rivalFlags=[state.rivalFlag,state.rival2Flag,state.rival3Flag].filter(Boolean);state.balls=[];state.hazards=[];state.bees=[];state.bombs=[];state.clouds=[];state.fishProjectiles=[];state.bearItemClock=6;state.bearSpecialClock=10;state.bearFishClock=15;state.cloudCheckClock=cloudRule().interval;state.eggs=[];state.chicks=[];state.eventFeed=[];document.querySelector('.event-feed')?.remove();state.bearThrowClock=CONFIG.bearThrowEvery;
  state.fauna=[{type:'bear',x:150,y:160,angle:.2,speed:34,turnClock:3.2,bob:0,throwPose:0}];
  synchronizeFlagOwnership();
  ui.score.textContent='0';ui.rivalScore.textContent='0';ui.rival2Score.textContent='0';if(ui.rival3Score)ui.rival3Score.textContent='0';
  ui.humanDot.textContent=TEAM_COLORS[state.humanTeam].emoji;ui.rivalDot.textContent=TEAM_COLORS[state.rivalTeam].emoji;ui.rival2Dot.textContent=TEAM_COLORS[state.rival2Team].emoji;if(ui.rival3Dot)ui.rival3Dot.textContent=TEAM_COLORS[state.rival3Team].emoji;
  updateFlagHud();updateHeartsHud();ui.gameShell.classList.toggle('is-coop',state.mode==='coop');
  ui.hint.textContent=state.mode==='coop'?'WASD + E / ESPACIO   ·   FLECHAS + ENTER':'WASD + E / ESPACIO';ui.hint.classList.remove('is-hidden');setTimeout(()=>ui.hint.classList.add('is-hidden'),3500);
  showToast(`${seasonEmoji()} ${seasonName(state.season)} · NIVEL ${state.level}`);
  showToast(`IA: ${state.rivals.concat(state.rivals2,state.rivals3).map(p=>p.aiStyle.toUpperCase()).join(' · ')}`);
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
  pollSecretGamepad();
  state.players.forEach((player) => updatePlayer(player, dt));
  state.rivals.forEach((player)=>updatePlayer(player,dt)); state.rivals2.forEach((player)=>updatePlayer(player,dt)); state.rivals3.forEach((player)=>updatePlayer(player,dt));
  resolvePlayerCollisions(dt);
  synchronizeFlagOwnership();
  updateSoloCompanion(dt);
  updateAiFlagTransfers();
  updateTaunts(dt);
  updateFlagObject(state.flag,state.players,dt);updateFlagObject(state.rivalFlag,state.rivals,dt);updateFlagObject(state.rival2Flag,state.rivals2,dt);if(state.rival3Flag)updateFlagObject(state.rival3Flag,state.rivals3,dt); updateAutomaticFlagPass(dt); updateItems(dt); updateHazards(dt); updateBees(dt); updateBalls(dt); updateGuardians(dt);
  updateAlly(dt); updateDistractions(dt); updateAllyPhysics(dt); updateFauna(dt); updateBearThrows(dt); updateBombs(dt); updateFishProjectiles(dt); updateClouds(dt); updateEggsAndChicks(dt); synchronizeFlagOwnership(); updateScoring(dt); updateParticles(dt); updateToast(dt); state.cameraShake=Math.max(0,state.cameraShake-dt);
}

/* ========================================================================== 
   VERSIÓN FINAL · SOPORTE SECRETO PARA GAMEPAD DEL JUGADOR 2
   - No muestra avisos ni opciones en pantalla.
   - Mantiene flechas + Enter como alternativa permanente.
   - Compatible con mandos estándar y adaptadores USB de controles PS2.
   ========================================================================== */
const secretGamepad={index:null,x:0,y:0,action:false,pause:false,prevPause:false,logged:false};
function gamepadButtonPressed(gamepad,index){
  const button=gamepad?.buttons?.[index];
  return !!button&&(button.pressed||button.value>.55);
}
function deadzoneAxis(value,deadzone=.22){
  const n=Number.isFinite(value)?value:0;
  if(Math.abs(n)<=deadzone)return 0;
  return Math.sign(n)*(Math.abs(n)-deadzone)/(1-deadzone);
}
function firstConnectedGamepad(){
  if(!navigator.getGamepads)return null;
  const pads=[...navigator.getGamepads()].filter(Boolean);
  if(secretGamepad.index!==null){
    const remembered=pads.find(p=>p.index===secretGamepad.index&&p.connected);
    if(remembered)return remembered;
  }
  return pads.find(p=>p.connected)||null;
}
function pollSecretGamepad(){
  const pad=firstConnectedGamepad();
  if(!pad){
    secretGamepad.index=null;secretGamepad.x=0;secretGamepad.y=0;
    secretGamepad.action=false;secretGamepad.pause=false;secretGamepad.prevPause=false;
    return;
  }
  secretGamepad.index=pad.index;
  if(!secretGamepad.logged){console.info('🎮 Gamepad detectado.');secretGamepad.logged=true;}

  // Stick izquierdo estándar. Algunos adaptadores PS2 exponen el stick en 2/3.
  let x=deadzoneAxis(pad.axes?.[0]||0),y=deadzoneAxis(pad.axes?.[1]||0);
  if(Math.abs(x)<.05&&Math.abs(y)<.05&&pad.axes?.length>=4){
    const altX=deadzoneAxis(pad.axes[2]||0),altY=deadzoneAxis(pad.axes[3]||0);
    if(Math.abs(altX)>.05||Math.abs(altY)>.05){x=altX;y=altY;}
  }

  // Cruceta estándar (12–15) y variantes frecuentes de adaptadores PS2.
  const left=gamepadButtonPressed(pad,14)||gamepadButtonPressed(pad,3);
  const right=gamepadButtonPressed(pad,15)||gamepadButtonPressed(pad,1);
  const up=gamepadButtonPressed(pad,12)||gamepadButtonPressed(pad,0);
  const down=gamepadButtonPressed(pad,13)||gamepadButtonPressed(pad,2);
  if(left||right)x=(right?1:0)-(left?1:0);
  if(up||down)y=(down?1:0)-(up?1:0);

  // En ciertos Twin USB/PS2 la cruceta aparece como ejes digitales adicionales.
  if(Math.abs(x)<.05&&pad.axes?.length>=6&&Math.abs(pad.axes[4]||0)>.7)x=Math.sign(pad.axes[4]);
  if(Math.abs(y)<.05&&pad.axes?.length>=6&&Math.abs(pad.axes[5]||0)>.7)y=Math.sign(pad.axes[5]);

  secretGamepad.x=Math.max(-1,Math.min(1,x));
  secretGamepad.y=Math.max(-1,Math.min(1,y));
  // A/X/Cruz y botones frontales alternativos.
  secretGamepad.action=[0,1,2,3].some(i=>gamepadButtonPressed(pad,i));
  // Start/Select/Options: pausa sólo en el flanco de pulsación.
  secretGamepad.pause=[8,9,10,11].some(i=>gamepadButtonPressed(pad,i));
  if(secretGamepad.pause&&!secretGamepad.prevPause&&state.running)togglePause();
  secretGamepad.prevPause=secretGamepad.pause;
}
window.addEventListener('gamepadconnected',event=>{
  secretGamepad.index=event.gamepad.index;
  if(!secretGamepad.logged){console.info('🎮 Gamepad detectado.');secretGamepad.logged=true;}
});
window.addEventListener('gamepaddisconnected',event=>{
  if(secretGamepad.index===event.gamepad.index)secretGamepad.index=null;
});

function inputFor(player) {
  if (player.ai) return aiInput(player);
  if (player.control === 'p1') return {
    left: state.keys.has('KeyA'), right: state.keys.has('KeyD'), up: state.keys.has('KeyW'), down: state.keys.has('KeyS'),
    axisX: state.joysticks.p1.x, axisY: state.joysticks.p1.y,
    action: state.keys.has('KeyE') || state.keys.has('Space') || state.touch.has('p1-action')
  };
  return {
    left: state.keys.has('ArrowLeft'), right: state.keys.has('ArrowRight'), up: state.keys.has('ArrowUp'), down: state.keys.has('ArrowDown'),
    axisX: Math.abs(secretGamepad.x)>.05?secretGamepad.x:state.joysticks.p2.x,
    axisY: Math.abs(secretGamepad.y)>.05?secretGamepad.y:state.joysticks.p2.y,
    action: state.keys.has('Enter') || state.touch.has('p2-action') || secretGamepad.action
  };
}

function aiInput(player) {
  if(player.team!==state.humanTeam)return rivalAiInput(player);
  const monkeyThreat=monkeyFlagThreatForTeam(player.team);
  if(monkeyThreat){
    if(player.heldBall>0&&distance(player,monkeyThreat)<410)throwBall(player,monkeyThreat);
    const dirs=smartAiDirections(player,monkeyThreat,18);
    if(player.heldBall<=0&&player.jump<=0&&player.aiJumpCooldown<=0&&distance(player,monkeyThreat)>48&&distance(player,monkeyThreat)<145){dirs.action=true;player.aiJumpCooldown=.82;player.aiJumpAngle=Math.atan2(monkeyThreat.y-player.y,monkeyThreat.x-player.x);player.aiJumpCommitClock=CONFIG.jumpDuration+.10;}
    return dirs;
  }
  const human=state.players.find(p=>!p.ai)||state.players[0];const carrier=getCarrier();
  player.aiDecisionClock-=1/60;
  if(carrier?.id===player.id){player.aiTargetX=human.x;player.aiTargetY=human.y;player.aiRole='deliver';player.aiDecisionClock=.18;}
  else if(player.aiDecisionClock<=0){
    let goal;
    if(player.aiTeamRole==='support'&&!carrier&&player.flagPickupCooldown<=0)goal={x:state.flag.x,y:state.flag.y,role:'recover'};
    else if(carrier?.id===human.id)goal=nonFlagStyleGoal(player,human);
    else goal=nonFlagStyleGoal(player,carrier);
    goal=applyHillGravity(player,goal);
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
  for(const team of [state.rivals,state.rivals2,state.rivals3]){
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
  player.deathFlash=Math.max(0,(player.deathFlash||0)-dt);player.ghost=Math.max(0,(player.ghost||0)-dt);player.wet=Math.max(0,(player.wet||0)-dt);if(player.bombFuse>0)player.bombFuse=Math.max(0,player.bombFuse-dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.stun = Math.max(0, player.stun - dt);
  player.boots=Math.max(0,player.boots-dt);player.bananaBoost=Math.max(0,player.bananaBoost-dt);player.perfectDodge=Math.max(0,player.perfectDodge-dt);player.shieldActive=Math.max(0,player.shieldActive-dt);player.parryWindow=Math.max(0,player.parryWindow-dt);player.hammerSwing=Math.max(0,(player.hammerSwing||0)-dt);player.darkVision=Math.max(0,player.darkVision-dt);player.confused=Math.max(0,player.confused-dt);player.clownTaunt=Math.max(0,player.clownTaunt-dt);player.burning=Math.max(0,player.burning-dt);player.chilled=Math.max(0,(player.chilled||0)-dt);
  player.flagPickupCooldown = Math.max(0, player.flagPickupCooldown - dt);
  player.aiSupportClock = Math.max(0, player.aiSupportClock - dt);
  player.aiJumpCooldown = Math.max(0, player.aiJumpCooldown - dt);
  player.aiJumpCommitClock = Math.max(0, (player.aiJumpCommitClock || 0) - dt);
  const input = (player.stun > 0||player.deathFlash>0||player.ghost>0) ? {left:false,right:false,up:false,down:false,action:false} : inputFor(player);
  let dx = Math.abs(input.axisX||0)>.08 ? input.axisX : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = Math.abs(input.axisY||0)>.08 ? input.axisY : (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if(player.confused>0){dx*=-1;dy*=-1;}
  const length = Math.hypot(dx, dy) || 1; dx /= length; dy /= length;
  if(player.ai){const fire=state.hazards.find(h=>h.type==='campfire'&&distance(player,h)<125);if(fire){const fx=player.x-fire.x,fy=player.y-fire.y,fl=Math.hypot(fx,fy)||1;dx=dx*.35+fx/fl*.95;dy=dy*.35+fy/fl*.95;const dl=Math.hypot(dx,dy)||1;dx/=dl;dy/=dl;}}
  const visionPenalty=player.darkVision>0?.66:1;
  const coldPenalty=player.chilled>0?.58:1;
  const moveSpeed = CONFIG.speed * (player.boots > 0 ? 1.34 : 1) * visionPenalty * coldPenalty;
  const targetVx = dx * moveSpeed, targetVy = dy * moveSpeed;
  const wetSlip=player.wet>0;const accel=wetSlip?(isWinter()?210:420):(isWinter()?620:1300), brake=wetSlip?(isWinter()?55:110):(isWinter()?240:1600);
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
      respawnPlayer(player);player.invulnerable=1.6;player.launched=0;player.launchPower=0;
    }
  }

  movePlayer(player,player.vx*dt,player.vy*dt);
  checkPlayerMonkeyStomp(player);
  player.trailClock -= dt;
  if ((Math.abs(player.vx) + Math.abs(player.vy)) > 120 && player.trailClock <= 0) {
    state.particles.push({ x: player.x, y: player.y + 20, vx: -player.vx * .08, vy: -player.vy * .08, life: .35, type: 'dust' });
    player.trailClock = .08;
  }
}

function movePlayer(player, dx, dy) {
  const oldX = player.x, oldY = player.y;
  player.x += dx; player.y += dy;
  if (!insideTrunk(player.x, player.y) || (!player.jump && ridgeCollision(player.x, player.y, .86))) {
    player.x = oldX; player.y = oldY;
    if (dx && !dy) player.vx = 0;
    if (dy && !dx) player.vy = 0;
    if (dx && dy) {
      player.x = oldX + dx;
      if (!insideTrunk(player.x, player.y) || (!player.jump && ridgeCollision(player.x, player.y, .86))) player.x = oldX;
      player.y = oldY + dy;
      if (!insideTrunk(player.x, player.y) || (!player.jump && ridgeCollision(player.x, player.y, .86))) player.y = oldY;
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
function ridgeCollision(x, y, thicknessScale=1) {
  const angle = Math.atan2(y - CONFIG.cy, x - CONFIG.cx);
  return map.ridges.some((ridge, index) => {
    if (angleInGap(angle, ridge.gaps)) return false;
    const scale = irregularScale(angle, 1.3 + index);
    const normalized = ellipseRadius(x, y, ridge.rx * scale, ridge.ry * scale);
    const band = (ridge.thickness * thicknessScale) / Math.min(ridge.rx, ridge.ry);
    return Math.abs(normalized - 1) < band;
  });
}

// Alpha 14.4: una sola fuente de verdad para la posesión de banderas.
function playerCarriedFlag(player) {
  if (!player) return null;
  return Object.values(state.flags).find((flag) => flag.carrier === player.id) || null;
}
function clearPlayerFlagState(player) {
  if (player && 'carryingFlag' in player) player.carryingFlag = false;
}
function setFlagCarrier(flag, entity) {
  if (!flag) return false;
  const previous = flagCarrierEntity(flag);
  if (previous && previous !== entity) clearPlayerFlagState(previous);

  if (!entity) {
    flag.carrier = null;
    return true;
  }

  // En este juego cada equipo transporta únicamente su propia bandera.
  // Si aparece una referencia cruzada, se rechaza antes de que pueda puntuar.
  if (entity.character && entity.team !== flag.team) return false;

  if (entity.character) {
    const other = playerCarriedFlag(entity);
    if (other && other !== flag) {
      other.carrier = null;
      other.pickupLock = Math.max(other.pickupLock || 0, .45);
      other.x = entity.x;
      other.y = entity.y - 18;
      other.vx = 0;
      other.vy = 0;
    }
    entity.carryingFlag = true;
  }
  flag.carrier = entity.id;
  return true;
}
function releaseFlag(flag, x=flag?.x, y=flag?.y, vx=0, vy=0, pickupLock=.55) {
  if (!flag) return;
  const previous = flagCarrierEntity(flag);
  clearPlayerFlagState(previous);
  flag.carrier = null;
  flag.x = Number.isFinite(x) ? x : flag.x;
  flag.y = Number.isFinite(y) ? y : flag.y;
  flag.vx = vx;
  flag.vy = vy;
  flag.pickupLock = Math.max(flag.pickupLock || 0, pickupLock);
}
function synchronizeFlagOwnership() {
  const players = allPlayers();
  players.forEach(clearPlayerFlagState);
  const claimedPlayers = new Set();
  const claimedGuardians = new Set();

  for (const flag of Object.values(state.flags)) {
    if (!flag?.carrier) continue;
    const carrier = flagCarrierEntity(flag);
    const invalid = !carrier ||
      (carrier.character && carrier.team !== flag.team) ||
      (carrier.character && claimedPlayers.has(carrier.id)) ||
      (!carrier.character && claimedGuardians.has(carrier.id));

    if (invalid) {
      const fallbackX = carrier?.x ?? flag.x;
      const fallbackY = (carrier?.y ?? flag.y) - 18;
      releaseFlag(flag, fallbackX, fallbackY, 0, 0, .65);
      continue;
    }

    if (carrier.character) {
      carrier.carryingFlag = true;
      claimedPlayers.add(carrier.id);
    } else {
      claimedGuardians.add(carrier.id);
    }
  }
}
function respawnPlayer(player) {
  const carried = playerCarriedFlag(player);
  if (carried) releaseFlag(carried, player.x, player.y - 18, 0, 0, .9);
  clearPlayerFlagState(player);
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.jump = 0;
  player.jumpLock = false;
  player.flagPickupCooldown = Math.max(player.flagPickupCooldown || 0, 1.0);
}

function flagCarrierEntity(flag) {
  if (!flag?.carrier) return null;
  return [...allPlayers(), ...state.guardians, state.ally].filter(Boolean).find((entity) => entity.id === flag.carrier) || null;
}
function updateFlagObject(flag, teamPlayers, dt) {
  flag.bob += dt * 4;
  flag.pickupLock = Math.max(0, (flag.pickupLock || 0) - dt);
  if (!flag.carrier && (Math.abs(flag.vx) + Math.abs(flag.vy) > 1)) {
    const oldX = flag.x, oldY = flag.y;
    flag.x += flag.vx * dt; flag.y += flag.vy * dt;
    if (!insideTrunk(flag.x, flag.y)) { flag.x = oldX; flag.y = oldY; flag.vx *= -.45; flag.vy *= -.45; }
    flag.vx *= Math.pow(.07, dt); flag.vy *= Math.pow(.07, dt);
  }
  const carrier = flagCarrierEntity(flag);
  if (carrier) {
    const hop = carrier.type === 'monkey' ? (carrier.hopHeight || 0) : (carrier.character ? jumpHeight(carrier) : 0);
    const facing = carrier.facing || 1;
    flag.x = carrier.x - 27 * facing;
    flag.y = carrier.y - 34 - hop * .5;
    return;
  }
  if (flag.pickupLock > 0) return;
  for (const player of teamPlayers) {
    if (player.flagPickupCooldown <= 0 && distance(player, flag) < 54) {
      if (!setFlagCarrier(flag, player)) continue; flag.vx = 0; flag.vy = 0;
      burst(flag.x, flag.y, 14); if(flag===state.flag) updateFlagHud(); break;
    }
  }
}
function passFlag(from, to) {
  if (!from || !to || from.id === to.id || from.team !== to.team) return;
  const flag = playerCarriedFlag(from);
  if (!flag || flag.team !== from.team || !setFlagCarrier(flag, to)) return;
  clearPlayerFlagState(from);
  to.carryingFlag = true;
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
  if(level>=2) list.push(makeJaguar('jaguar-1'));
  return list;
}
function makePuddles(){return [{id:'puddle-1',x:720,y:410,rx:105,ry:55},{id:'puddle-2',x:1270,y:690,rx:125,ry:62},{id:'puddle-3',x:1040,y:300,rx:92,ry:48}];}
function makeCrocodileGuardian(id,x,y){return{id,type:'crocodile',x,y,radius:34,homePuddleId:'puddle-1',speed:245,attackCooldown:0,stunned:0,vx:0,vy:0};}
function makeMonkeyGuardian(id,x,y){return{id,type:'monkey',x,y,radius:28,speed:225,state:'search',targetFlag:null,thinkClock:0,carryClock:0,helpGorillaId:null,accuseId:null,stunned:0,vx:0,vy:0,heldItem:null,itemUseClock:0,escapeClock:0,shieldActive:0,parryWindow:0,facing:1,team:'monkey',stuckClock:0,navBias:Math.random()<.5?-1:1,tx:x,ty:y,patrolClock:0,patrolIndex:Math.floor(Math.random()*8),hopClock:0,hopCooldown:0,hopHeight:0,hearts:2,damageClock:0,stompInvulnerable:0};}

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
      }else if(item.type==='gift'){
        const prize=randomGiftItem();
        player.heldItem=prize;player.heldBall=0;
        for(let n=0;n<20;n++){const a=Math.random()*Math.PI*2,speed=55+Math.random()*145;state.particles.push({x:item.x,y:item.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.55+Math.random()*.5,type:'confetti'});}
        showToast(`🎁 ¡SORPRESA! Salió ${ITEM_ICONS[prize]||'❓'}`);
      }else if(item.type==='boots'){player.boots=CONFIG.bootsDuration;showToast('👟 ¡Más velocidad!');}
      else if(item.type==='watermelon'||item.type==='flower'){player.hearts=Math.min(CONFIG.maxHearts,player.hearts+1);updateHeartsHud();showToast('❤️ ¡Un corazón recuperado!');}
      else if(item.type==='juice'||item.type==='mushroom'){player.boots=Math.max(player.boots,6);showToast('💨 ¡Impulso!');}
      else if(item.type==='berry'){player.bananaBoost=Math.max(player.bananaBoost,5);showToast('🫐 ¡Salto mejorado!');}
      else if(item.type==='banana'){player.bananaBoost=CONFIG.bananaJumpDuration;showToast('🍌 ¡SUPER SALTO!');const now=performance.now()/1000;state.guardians.filter(g=>g.type==='gorilla').forEach(g=>{g.taunters.set(player.id,now);g.personalTargetId=player.id;g.targetId=player.id;g.wildClock=CONFIG.gorillaWildSeconds;g.rage=g.wildClock;g.chaseClock=g.wildClock;g.alertState='furious';});}
      burst(item.x,item.y,12);break;
    }
  }
}
const GIFT_COMMON=['ball','shield','honey','snowman','sunglasses'];
const GIFT_UNCOMMON=['heavyball','campfire','hammer','clownmask','television','radio','bell','ice','fishingrod'];
function randomGiftItem(){
  const roll=Math.random();
  const pool=roll<.68?GIFT_COMMON:roll<.94?GIFT_UNCOMMON:['hammer','heavyball','clownmask','radio'];
  return pool[Math.floor(Math.random()*pool.length)];
}
function nearestOpponent(player){return allPlayers().filter(p=>p.team!==player.team).sort((a,b)=>distance(player,a)-distance(player,b))[0]||null;}
function activateGuardianTaunt(player,range=380){
  for(const g of state.guardians){if(distance(player,g)>range)continue;
    if(g.type==='gorilla'){g.personalTargetId=player.id;g.targetId=player.id;g.wildClock=CONFIG.gorillaWildSeconds;g.chaseClock=g.wildClock;g.rage=g.wildClock;g.alertState='furious';}
    else{g.tauntTargetId=player.id;g.tauntClock=3.5;g.stunned=0;}
  }
}
function useHeldItem(player){
  const type=player.heldItem;if(!type)return;
  if(type==='fishingrod'&&!player.rodActive){player.rodActive=true;showToast('🎣 ¡CAÑA EQUIPADA! Volvé a usarla para lanzarla.');return;}
  player.heldItem=null;player.rodActive=false;
  const enemy=nearestOpponent(player);const aim=enemy?Math.atan2(enemy.y-player.y,enemy.x-player.x):(player.facing>0?0:Math.PI);
  if(type==='shield'||type==='sunscreen'||type==='goldleaf'){player.shieldActive=1.05;player.parryWindow=.32;showToast('🛡️ ¡ESCUDO! Reaccioná al impacto.');return;}
  if(['fish','tropicalfish','pufferfish','fishingrod'].includes(type)){throwFishProjectile(player,type,aim);return;}
  if(type==='ball'||type==='heavyball'||type==='bouncyball'||type==='acorn'){state.balls.push({x:player.x,y:player.y-10,vx:Math.cos(aim)*CONFIG.ballSpeed*(type==='heavyball'?.72:1),vy:Math.sin(aim)*CONFIG.ballSpeed*(type==='heavyball'?.72:1),life:2.5,ownerTeam:player.team,bounces:type==='bouncyball'?6:2,kind:type});burst(player.x,player.y,7);return;}
  if(type==='honey'){
    for(let i=0;i<7;i++)state.hazards.push({type:'honey',x:player.x-Math.cos(aim)*i*33,y:player.y-Math.sin(aim)*i*33,life:8,radius:36,hitCooldown:new Map()});
    spawnBees(player.x-Math.cos(aim)*95,player.y-Math.sin(aim)*95,player.team);
    showToast('🍯🐝 ¡La miel atrajo abejas!');return;
  }
  if(type==='sunglasses'){
    const targets=allPlayers().filter(p=>p.team!==player.team&&distance(player,p)<=430).sort((a,b)=>distance(player,a)-distance(player,b));
    const target=targets[0]||enemy;
    if(target){target.darkVision=Math.max(target.darkVision,4);target.stun=Math.max(target.stun,.16);target.aiDecisionClock=0;burst(target.x,target.y,10);showToast('🕶️ ¡Rival encandilado durante 4 segundos!');}
    else showToast('🕶️ No había ningún rival cerca.');
    return;
  }
  if(type==='television'||type==='radio'){
    const isRadio=type==='radio';
    state.hazards.push({type,x:player.x+Math.cos(aim)*70,y:player.y+Math.sin(aim)*70,life:isRadio?9:8,radius:isRadio?520:400,innerRadius:isRadio?235:200,ownerTeam:player.team,pulse:0});
    showToast(isRadio?'📻🎵 ¡RADIO ACTIVADA! 👂 AFUERA · 👀 ADENTRO':'📺👀 ¡TELEVISOR ACTIVADO! 👂 AFUERA · 👀 ADENTRO');return;
  }
  if(type==='bell'){state.hazards.push({type:'bell',x:player.x+Math.cos(aim)*78,y:player.y+Math.sin(aim)*78,life:7,radius:430,pulse:0});showToast('🔔🎵 ¡DING DING! Los guardianes investigan.');return;}
  if(type==='bomb'){state.bombs.push({id:'bomb-'+Math.random().toString(36).slice(2),x:player.x+Math.cos(aim)*72,y:player.y+Math.sin(aim)*72,vx:Math.cos(aim)*330,vy:Math.sin(aim)*330,fuse:player.bombFuse>0?player.bombFuse:3.4,holder:null,ownerId:player.id});player.bombFuse=0;showToast('💣 ¡CORRÉ!');return;}
  if(type==='ice'){state.hazards.push({type:'ice',x:player.x+Math.cos(aim)*75,y:player.y+Math.sin(aim)*75,life:2,radius:145,pulse:0});showToast('❄️ ¡ZONA CONGELADA!');return;}
  if(type==='snowman'){state.hazards.push({type:'snowman',x:player.x+Math.cos(aim)*65,y:player.y+Math.sin(aim)*65,life:10,radius:115,melted:false});showToast('⛄❄️ ¡ZONA HELADA!');return;}
  if(type==='campfire'){const duration={summer:12,spring:10,autumn:8,winter:6}[state.season]||12;state.hazards.push({type:'campfire',x:player.x+Math.cos(aim)*60,y:player.y+Math.sin(aim)*60,life:duration,radius:46,hitCooldown:new Map()});showToast(`🔥 ¡FOGATA DURANTE ${duration} SEGUNDOS!`);return;}
  if(type==='hammer'){useHammer(player,aim);return;}
  if(type==='clownmask'){
    player.clownTaunt=4;
    for(const rival of allPlayers().filter(p=>p.team!==player.team&&distance(player,p)<250)){
      rival.stun=Math.max(rival.stun,.62);rival.confused=Math.max(rival.confused,2.4);burst(rival.x,rival.y,8);
    }
    activateGuardianTaunt(player,300);
    state.cameraShake=Math.max(state.cameraShake,.12);burst(player.x,player.y,18);
    showToast('🤡 ¡CARCAJADA CAÓTICA! Los rivales se confunden, pero los guardianes te miran.');return;
  }
}
function useHammer(player,aim){
  player.hammerSwing=.24;
  const hx=player.x+Math.cos(aim)*72,hy=player.y+Math.sin(aim)*72;
  const targets=[...allPlayers().filter(p=>p.id!==player.id),...state.guardians,state.ally].filter(Boolean);
  let hits=0;
  for(const target of targets){
    const r=(target.radius||CONFIG.playerRadius)+58;
    if(Math.hypot(target.x-hx,target.y-hy)>r)continue;
    hits++;
    if(target.character){dropFlagFrom(target,player,620);target.stun=Math.max(target.stun,.48);target.invulnerable=Math.max(target.invulnerable,.32);}
    else if(target.type==='monkey'){monkeyDropFlag(target,player,650);target.stunned=Math.max(target.stunned||0,.65);}
    else if(target.type==='elephant'){angerElephant(target,'🐘💢 ¡EL MARTILLO ENFURECIÓ AL ELEFANTE!');}
    else{if('stunned' in target)target.stunned=Math.max(target.stunned||0,.7);}
    pushCreature(target,player,target.type==='elephant'?260:620);
    burst(target.x,target.y,12);
  }
  burst(hx,hy,18);state.cameraShake=Math.max(state.cameraShake,.20);
  showToast(hits?'🔨💥 ¡MARTILLAZO!':'🔨 ¡Martillazo al aire!');
}

function dropFlagFrom(player, source, strength=390) {
  const flag = playerCarriedFlag(player);
  if (!flag) { clearPlayerFlagState(player); return; }
  const origin = source || {x:player.x-(player.facing||1)*24,y:player.y};
  const a = Math.atan2(player.y-origin.y, player.x-origin.x) + (Math.random()-.5)*.35;
  releaseFlag(flag, player.x, player.y-18, Math.cos(a)*strength, Math.sin(a)*strength, .55);
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
    player.hearts=CONFIG.maxHearts; respawnPlayer(player); player.invulnerable=1.8;
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
    if(g.type==='jaguar'){ updateJaguar(g,dt); continue; }
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
  if(p.state==='eatFish'){p.eatClock-=dt;if(p.eatClock<=0){p.state='charge';p.chargeGoal=.35;p.charge=.34;}return;}
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
      p.angle=angle;p.bouncesLeft=Math.max(1,Math.round(p.plannedBounces*(p.fishBoostBounces||1)));p.slideVx*=p.fishBoostPower||1;p.slideVy*=p.fishBoostPower||1;p.fishBoostBounces=1;p.fishBoostPower=1;p.state='slide';p.charge=0;
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
    releaseFlag(obj,obj.x,obj.y,Math.cos(ang)*power,Math.sin(ang)*power,.7);
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
// Alpha 15.3: objetos de prueba garantizados. Se agregan en niveles concretos
// para que no haya que recorrer toda la campaña buscándolos.
function alpha151TestItems(level){
  const items=[];
  if(level===2) items.push(makeItem('gift',760,735));
  if(level===3) items.push(makeItem('honey',730,720));
  if(level===5) items.push(makeItem('television',1240,735));
  if(level===6) items.push(makeItem('snowman',760,720));
  if(level===7) items.push(makeItem('sunglasses',1260,720));
  if(level===8) items.push(makeItem('radio',1020,300));
  if(level===9) items.push(makeItem('heavyball',1260,720));
  if(level===10) items.push(makeItem('clownmask',780,720),makeItem('bell',1180,720));
  if(level===11) items.push(makeItem('ice',1220,720));
  if(level===12) items.push(makeItem('fishingrod',780,720),makeItem('tropicalfish',1010,720),makeItem('pufferfish',1240,720));
  return items;
}

function seasonalStartItems(){
  const groups={summer:['watermelon','shield','sunglasses','campfire','gift'],autumn:['television','snowman','campfire','gift'],spring:['flower','honey','clownmask','hammer','radio','bell','fishingrod'],winter:['shield','snowman','radio','heavyball','gift','ice']};
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
  if(['fish','tropicalfish','pufferfish','fishingrod'].includes(type)){throwFishProjectile(m,type,aim);return;}
  if(type==='ball'||type==='heavyball'||type==='bouncyball'||type==='acorn'){
    state.balls.push({x:m.x,y:m.y-10,vx:Math.cos(aim)*CONFIG.ballSpeed*(type==='heavyball'?.72:1),vy:Math.sin(aim)*CONFIG.ballSpeed*(type==='heavyball'?.72:1),life:2.5,ownerTeam:'monkey',bounces:type==='bouncyball'?6:2,kind:type});return;
  }
  if(type==='honey'){for(let i=0;i<6;i++)state.hazards.push({type:'honey',x:m.x-Math.cos(aim)*i*34,y:m.y-Math.sin(aim)*i*34,life:7,radius:34});spawnBees(m.x-Math.cos(aim)*80,m.y-Math.sin(aim)*80,m.team);return;}
  if(type==='television'||type==='radio'){state.hazards.push({type,x:m.x+Math.cos(aim)*55,y:m.y+Math.sin(aim)*55,life:type==='radio'?9:8,radius:type==='radio'?520:350,ownerTeam:'monkey',pulse:0});return;}
  if(type==='bell'){state.hazards.push({type:'bell',x:m.x+Math.cos(aim)*55,y:m.y+Math.sin(aim)*55,life:7,radius:430,pulse:0});return;}
  if(type==='bomb'){state.bombs.push({id:'bomb-'+Math.random().toString(36).slice(2),x:m.x,y:m.y,vx:Math.cos(aim)*320,vy:Math.sin(aim)*320,fuse:3.4,holder:null,ownerId:m.id});return;}
  if(type==='ice'){state.hazards.push({type:'ice',x:m.x+Math.cos(aim)*55,y:m.y+Math.sin(aim)*55,life:2,radius:145,pulse:0});return;}
  if(type==='clownmask'){activateGuardianTaunt(m,260);return;}
  if(type==='sunglasses'&&target){target.darkVision=3;return;}
  if(type==='snowman'||type==='campfire'){const duration=type==='snowman'?10:({summer:12,spring:10,autumn:8,winter:6}[state.season]||12);state.hazards.push({type,x:m.x+Math.cos(aim)*62,y:m.y+Math.sin(aim)*62,life:duration,radius:type==='snowman'?115:42,hitCooldown:new Map()});return;}
  if(type==='hammer'&&target){pushCreature(target,m,560);target.stun=Math.max(target.stun,.45);return;}
  if(type==='boots'||type==='juice'||type==='mushroom'){m.speed=285;setTimeout(()=>{m.speed=225;},5000);return;}
  if(type==='banana'||type==='berry'){m.speed=270;setTimeout(()=>{m.speed=225;},4000);return;}
}
function monkeyCarriedFlag(m) {
  return Object.values(state.flags).find((flag) => flag.carrier === m.id) || null;
}
function monkeyDropFlag(m, source=null, strength=430) {
  const flag = monkeyCarriedFlag(m);
  if (!flag) return;
  releaseFlag(flag, m.x, m.y-18, 0, 0, .7);
  const origin = source || {x:m.x-(m.facing||1)*30,y:m.y};
  const angle = Math.atan2(m.y-origin.y,m.x-origin.x) + (Math.random()-.5)*.7;
  flag.x=m.x;flag.y=m.y-18;flag.vx=Math.cos(angle)*strength;flag.vy=Math.sin(angle)*strength;
  m.carryClock=0;m.escapeClock=0;
  burst(m.x,m.y,10);
}

function monkeyFlagThreatForTeam(team){
  const monkey=state.guardians.find(g=>g.type==='monkey');
  const ownFlag=flagForTeam(team);
  return monkey&&ownFlag?.carrier===monkey.id?monkey:null;
}
function angerNearestGorillaAt(attacker,monkey){
  const gorilla=state.guardians.filter(g=>g.type==='gorilla').sort((a,b)=>distance(monkey,a)-distance(monkey,b))[0]||null;
  if(!gorilla||!attacker)return;
  gorilla.personalTargetId=attacker.id;gorilla.targetId=attacker.id;
  gorilla.wildClock=Math.max(gorilla.wildClock||0,5.2);gorilla.chaseClock=Math.max(gorilla.chaseClock||0,5.2);
  gorilla.alertState='furious';gorilla.rage=Math.max(gorilla.rage||0,1);
}
function stompMonkey(monkey,attacker){
  if(!monkey||!attacker||monkey.stompInvulnerable>0)return false;
  monkey.hearts=Math.max(0,(monkey.hearts??2)-1);
  monkey.damageClock=6;monkey.stompInvulnerable=.58;monkey.stunned=Math.max(monkey.stunned,.48);
  attacker.jump=Math.max(attacker.jump,CONFIG.jumpDuration*.58);attacker.stompCooldown=.62;
  angerNearestGorillaAt(attacker,monkey);
  burst(monkey.x,monkey.y,13);
  if(monkey.hearts<=0){
    monkeyDropFlag(monkey,attacker,560);monkey.hearts=2;monkey.damageClock=0;monkey.escapeClock=1.6;
    showToast('🐵💔🚩 ¡DOS PISOTONES! ¡SOLTÓ LA BANDERA!');
  }else showToast('🐵💢 ¡UN CORAZÓN MENOS! El gorila se enojó...');
  return true;
}
function checkPlayerMonkeyStomp(player){
  const monkey=state.guardians.find(g=>g.type==='monkey');
  if(!monkey||player.stompCooldown>0||monkey.stompInvulnerable>0||player.jump<=0)return;
  const now=jumpHeight(player),descending=player.prevJumpHeight>now+.35;
  if(!descending||now<8)return;
  if(distance(player,monkey)<CONFIG.playerRadius+monkey.radius-5)stompMonkey(monkey,player);
}
function monkeySecureFlag(m, flag, gorilla) {
  releaseFlag(flag, gorilla.x+(gorilla.side||1)*54, gorilla.y+34, 0, 0, 2.4);
  m.carryClock=0;m.escapeClock=0;m.patrolClock=0;
  showToast('🐵🚩🦍 ¡El monito dejó la bandera bajo custodia!');
  burst(flag.x,flag.y,16);
}
function updateMonkeyGuardian(m,dt){
  m.thinkClock=Math.max(0,(m.thinkClock||0)-dt);m.stunned=Math.max(0,(m.stunned||0)-dt);
  m.stompInvulnerable=Math.max(0,(m.stompInvulnerable||0)-dt);
  if((m.damageClock||0)>0){m.damageClock=Math.max(0,m.damageClock-dt);if(m.damageClock<=0)m.hearts=2;}else m.hearts=2;
  m.itemUseClock=Math.max(0,(m.itemUseClock||0)-dt);m.escapeClock=Math.max(0,(m.escapeClock||0)-dt);
  m.shieldActive=Math.max(0,(m.shieldActive||0)-dt);m.parryWindow=Math.max(0,(m.parryWindow||0)-dt);
  m.patrolClock=Math.max(0,(m.patrolClock||0)-dt);m.hopClock=Math.max(0,(m.hopClock||0)-dt);m.hopCooldown=Math.max(0,(m.hopCooldown||0)-dt);
  m.hopHeight=m.hopClock>0?Math.sin((1-m.hopClock/.42)*Math.PI)*34:0;
  if(m.stunned>0){monkeyDropFlag(m,null,500);return;}
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
  const carried=monkeyCarriedFlag(m);
  if(carried){
    m.carryClock+=dt;
    const refuge=gorilla||{x:CONFIG.cx,y:CONFIG.cy};
    moveMonkey(m,refuge.x,refuge.y,dt);
    if(gorilla&&distance(m,gorilla)<78){monkeySecureFlag(m,carried,gorilla);return;}
    if(m.carryClock>8.5){monkeyDropFlag(m,refuge,520);showToast('🐵❓ ¡Esta bandera pesa demasiado!');}
    return;
  }
  if(m.heldItem){
    if(m.itemUseClock<=0&&(threat||Math.random()<.012)){monkeyUseItem(m);m.itemUseClock=1.6;return;}
    if(gorilla)moveMonkey(m,gorilla.x+Math.cos(m.thinkClock*3)*78,gorilla.y+Math.sin(m.thinkClock*3)*58,dt);
    return;
  }
  const loose=Object.values(state.flags).filter(f=>!f.carrier).sort((a,b)=>distance(m,a)-distance(m,b))[0];
  if(loose){moveMonkey(m,loose.x,loose.y,dt);if(distance(m,loose)<48&&!(loose.pickupLock>0)){setFlagCarrier(loose,m);loose.vx=0;loose.vy=0;m.targetFlag=loose.team;m.carryClock=0;m.escapeClock=1.5;showToast('🐵🚩 ¡Yo también soy jugador!');burst(loose.x,loose.y,12);}return;}
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
function drawFauna() {
  for (const animal of state.fauna) {
    ctx.save();
    ctx.translate(animal.x,animal.y+Math.sin(animal.bob)*3);
    ctx.globalAlpha=.18;
    ctx.fillStyle='#1d120d';
    ctx.beginPath();
    ctx.ellipse(0,20,22,7,0,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
    ctx.rotate(animal.throwPose>0?-.22:0);
    ctx.font=animal.throwPose>0?'52px serif':'43px serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('🐻',0,animal.throwPose>0?-7:0);
    if(animal.throwPose>0){
      ctx.font='24px serif';
      ctx.fillText('💨',30,-24);
    }
    ctx.restore();
  }
}

function drawPuddles(){for(const p of state.puddles){ctx.save();ctx.globalAlpha=.72;ctx.fillStyle='#4ca7c9';ctx.beginPath();ctx.ellipse(p.x,p.y,p.rx,p.ry,.08,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(210,245,255,.8)';ctx.lineWidth=5;ctx.stroke();ctx.restore();}}
function drawWeather(){if(!isWinter())return;ctx.save();ctx.strokeStyle='rgba(210,240,255,.48)';ctx.lineWidth=3;const t=performance.now()*.48;for(let i=0;i<95;i++){const x=(i*97+t)%2050-25,y=(i*61+t*1.7)%1180-30;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-13,y+29);ctx.stroke();}ctx.restore();}

function spawnBees(x,y,ownerTeam){
  for(let i=0;i<4;i++)state.bees.push({id:`bee-${Math.random().toString(36).slice(2)}`,x:x+(Math.random()-.5)*45,y:y+(Math.random()-.5)*45,vx:0,vy:0,life:6+Math.random()*2,ownerTeam,targetId:null,retarget:0,stingCooldown:Math.random()*.8,phase:Math.random()*6});
}
function updateBees(dt){
  for(const bee of state.bees){
    bee.life-=dt;bee.retarget-=dt;bee.stingCooldown-=dt;bee.phase+=dt*7;
    let target=allPlayers().find(p=>p.id===bee.targetId);
    if(!target||bee.retarget<=0||distance(bee,target)>360){target=allPlayers().filter(p=>p.team!==bee.ownerTeam).sort((a,b)=>distance(bee,a)-distance(bee,b))[0]||null;bee.targetId=target?.id||null;bee.retarget=.7+Math.random()*.7;}
    if(target){const a=Math.atan2(target.y-bee.y,target.x-bee.x),speed=145;bee.vx=approach(bee.vx,Math.cos(a)*speed,420*dt);bee.vy=approach(bee.vy,Math.sin(a)*speed,420*dt);bee.x+=bee.vx*dt;bee.y+=bee.vy*dt;if(distance(bee,target)<34&&bee.stingCooldown<=0){target.stun=Math.max(target.stun,.18);target.vx+=(Math.random()-.5)*180;target.vy+=(Math.random()-.5)*180;bee.stingCooldown=1.15;burst(target.x,target.y,4);}}
  }
  state.bees=state.bees.filter(b=>b.life>0);
}
function updateHazards(dt){
  for(const h of state.hazards){
    h.life-=dt;
    if(h.type==='honey'){for(const p of allPlayers())if(distance(p,h)<h.radius){p.vx*=.84;p.vy*=.84;}}
    if(h.type==='snowman'){
      for(const p of allPlayers())if(distance(p,h)<h.radius){p.chilled=Math.max(p.chilled,.24);if(Math.random()<dt*7)state.particles.push({x:p.x+(Math.random()-.5)*34,y:p.y-20+Math.random()*30,vx:(Math.random()-.5)*20,vy:-18,life:.55,type:'snow'});}
      if(h.life<=0&&!h.melted){h.melted=true;for(let i=0;i<10;i++)state.particles.push({x:h.x+(Math.random()-.5)*36,y:h.y+(Math.random()-.5)*20,vx:(Math.random()-.5)*35,vy:-25-Math.random()*25,life:.8,type:i%3?'drop':'splash'});}
    }
    if(h.type==='ice'){for(const p of allPlayers())if(distance(p,h)<h.radius){p.chilled=Math.max(p.chilled,freezeSeconds());p.stun=Math.max(p.stun,Math.min(.9,freezeSeconds()*.15));if(Math.random()<dt*9)state.particles.push({x:p.x+(Math.random()-.5)*34,y:p.y-20,vx:0,vy:-18,life:.55,type:'snow'});}}
    if(h.type==='campfire'){
      for(const p of allPlayers()){const key=p.id;const cd=h.hitCooldown?.get(key)||0;if(cd>0)h.hitCooldown.set(key,Math.max(0,cd-dt));if(distance(p,h)<h.radius+24&&cd<=0){const a=Math.atan2(p.y-h.y,p.x-h.x);p.vx=Math.cos(a)*370;p.vy=Math.sin(a)*370;p.stun=Math.max(p.stun,.25);p.burning=Math.max(p.burning,2.2);h.hitCooldown?.set(key,.8);burst(p.x,p.y,8);}}
    }
  }
  state.hazards=state.hazards.filter(h=>h.life>0);
}
function updateDistractions(dt){
  const sources=state.hazards.filter(h=>['television','radio','bell'].includes(h.type)&&h.life>0);
  for(const source of sources){source.pulse=(source.pulse||0)+dt*6;const inner=source.innerRadius||source.radius*.5;const strength=source.type==='radio'?260:source.type==='television'?225:190;
    for(const g of state.guardians){const d=distance(g,source);if(d>source.radius||d<42)continue;const a=Math.atan2(source.y-g.y,source.x-g.x),step=(1-d/source.radius)*strength*.44*dt;const nx=g.x+Math.cos(a)*step,ny=g.y+Math.sin(a)*step;if(pointIsWalkable(nx,ny)){g.x=nx;g.y=ny;}g.facingAngle=a;g.angle=a;g.tauntTargetId=null;g.targetId=null;}
    if(source.type!=='bell'){
      for(const p of allPlayers()){const d=distance(p,source);if(d>inner||d<38)continue;const a=Math.atan2(source.y-p.y,source.x-p.x),pull=(1-d/inner)*strength;p.vx=approach(p.vx,Math.cos(a)*92,pull*dt*5);p.vy=approach(p.vy,Math.sin(a)*92,pull*dt*5);p.facing=Math.sign(source.x-p.x)||p.facing;p.stun=Math.max(p.stun,.055);if(p.ai){p.aiTargetX=source.x;p.aiTargetY=source.y;p.aiDecisionClock=.22;}}
      if(state.ally){const d=distance(state.ally,source);if(d<inner&&d>42){const a=Math.atan2(source.y-state.ally.y,source.x-state.ally.x),step=(1-d/inner)*strength*.46*dt;state.ally.x+=Math.cos(a)*step;state.ally.y+=Math.sin(a)*step;}}
    }
    if(Math.random()<dt*5){const outer=Math.random()>.48;state.particles.push({x:source.x+(Math.random()-.5)*Math.min(source.radius,170),y:source.y-35-Math.random()*45,vx:(Math.random()-.5)*20,vy:-20-Math.random()*25,life:.65,type:outer?'ear':source.type==='radio'?'music':'eyes'});}
  }
}
function drawHazards(){
  for(const h of state.hazards){ctx.save();ctx.translate(h.x,h.y);ctx.globalAlpha=Math.min(1,h.life);ctx.textAlign='center';ctx.textBaseline='middle';const glyph={honey:'🍯',snowman:'⛄',television:'📺',radio:'📻',bell:'🔔',ice:'❄️',lightning:'⚡',campfire:'🔥'}[h.type]||'🔥';ctx.font=h.type==='honey'?'34px serif':h.type==='lightning'?'76px serif':'46px serif';ctx.fillText(glyph,0,0);
    if(h.type==='television'||h.type==='radio'){const inner=h.innerRadius||h.radius*.5;ctx.font='25px serif';ctx.fillText(h.type==='radio'?'🎵🎶':'👀',0,-50);ctx.globalAlpha=.17+.07*Math.sin(h.pulse||0);ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,h.radius,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.28;ctx.beginPath();ctx.arc(0,0,inner,0,Math.PI*2);ctx.stroke();ctx.font='24px serif';ctx.globalAlpha=.9;ctx.fillText('👂',h.radius*.70,0);ctx.fillText('👀',inner*.62,0);}
    if(h.type==='bell'){ctx.font='22px serif';ctx.fillText('🎵',0,-43);ctx.globalAlpha=.16;ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,h.radius,0,Math.PI*2);ctx.stroke();}
    if(h.type==='snowman'||h.type==='ice'){ctx.globalAlpha=.28;ctx.strokeStyle='#dff7ff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,h.radius,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  for(const bee of state.bees){ctx.save();ctx.translate(bee.x,bee.y+Math.sin(bee.phase)*5);ctx.font='25px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🐝',0,0);ctx.restore();}
}
function drawItems(){for(const item of state.items){if(!item.active)continue;ctx.save();ctx.translate(item.x,item.y+Math.sin(item.bob)*5);drawItemGraphic(item.type,0,0,42);ctx.restore();}}
function drawGuardians(){for(const g of state.guardians){
  ctx.save();ctx.translate(g.x,g.y-(g.jump?.height||g.hopHeight||0));ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.globalAlpha=1;ctx.fillStyle='#23150f';ctx.beginPath();ctx.ellipse(0,27,32,10,0,0,Math.PI*2);ctx.fill();
  if(g.type==='penguin'){if(g.state==='charge'){const t=Math.min(1,g.charge/g.chargeGoal);ctx.strokeStyle='#54d6ff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,38,-Math.PI/2,-Math.PI/2+t*Math.PI*2);ctx.stroke();if((g.chargeLevel||1)>=3){ctx.font='27px serif';ctx.fillText('🪖',0,-25);}}if(g.state==='slide')ctx.rotate(g.angle+Math.PI/2);ctx.font='54px serif';ctx.fillText('🐧',0,0);ctx.restore();continue;}
  if(g.type==='sloth'){ctx.font='52px serif';ctx.fillText('🦥',0,0);if(g.hugTargetId){ctx.font='18px serif';ctx.fillText('🤗',0,-39);}ctx.restore();continue;}
  if(g.type==='ant'){ctx.fillStyle='#111';ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();ctx.font='42px serif';ctx.fillText('🐜',0,0);ctx.restore();continue;}
  if(g.type==='crocodile'){ctx.font='58px serif';ctx.fillText('🐊',0,0);ctx.restore();continue;}
  if(g.type==='jaguar'){if(g.visible){ctx.font='62px serif';ctx.fillText('🐆',0,-(g.jumpHeight||0));if(g.state==='furious'){ctx.font='24px serif';ctx.fillText('💢',24,-52);}}ctx.restore();continue;}
  if(g.type==='monkey'){ctx.font='54px serif';ctx.fillText('🐒',0,0);ctx.font='17px serif';ctx.fillText((g.hearts??2)>=2?'❤️❤️':'❤️🖤',0,-58);if(g.stunned>0){ctx.font='22px serif';ctx.fillText('⭐✨',0,-82);}if(g.heldItem){ctx.font='28px serif';ctx.fillText(ITEM_ICONS[g.heldItem]||'🎁',0,-43);}if(monkeyCarriedFlag(g)){ctx.font='24px serif';ctx.fillText('💨',-(g.facing||1)*34,-22);}if(g.shieldActive>0){ctx.strokeStyle='#dff7ff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,42,-1.25,1.25);ctx.stroke();}ctx.restore();continue;}
  if(g.type==='elephant'){if(g.state==='trumpet'){ctx.font='24px serif';ctx.fillText('📯',34,-35);}if(g.state==='charge'){ctx.rotate(g.angle);ctx.font='24px serif';ctx.fillText('💨',-54,-4);ctx.rotate(-g.angle);}ctx.font='72px serif';ctx.fillText('🐘',0,-4);ctx.restore();continue;}
  /* Gorila completamente opaco: silueta sólida detrás del emoji. */
  ctx.fillStyle='#21130f';ctx.beginPath();ctx.arc(0,2,34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3a2118';ctx.beginPath();ctx.arc(0,2,29,0,Math.PI*2);ctx.fill();if(g.rage>0){ctx.font='22px serif';ctx.fillText(g.wildClock>0?'💢':'😡',0,-45);}ctx.font='58px serif';ctx.fillText('🦍',0,0);ctx.restore();}}



function teamScoreValue(team){return team===state.humanTeam?state.score:team===state.rivalTeam?state.rivalScore:team===state.rival2Team?state.rival2Score:state.rival3Score;}
function centerEnemiesFor(player){return allPlayers().filter(p=>p.team!==player.team&&Math.hypot(p.x-CONFIG.cx,p.y-CONFIG.cy)<CONFIG.centerRadius+65);}
function mostDangerousEnemy(player){
  return allPlayers().filter(p=>p.team!==player.team).sort((a,b)=>{
    const av=(a.carryingFlag?220:0)+(Math.hypot(a.x-CONFIG.cx,a.y-CONFIG.cy)<CONFIG.centerRadius?160:0)+teamScoreValue(a.team)*3-distance(player,a)*.12;
    const bv=(b.carryingFlag?220:0)+(Math.hypot(b.x-CONFIG.cx,b.y-CONFIG.cy)<CONFIG.centerRadius?160:0)+teamScoreValue(b.team)*3-distance(player,b)*.12;
    return bv-av;
  })[0]||null;
}
function hillDistance(entity){return Math.hypot(entity.x-CONFIG.cx,entity.y-CONFIG.cy);}
function hillAnchor(player,radius=92,angleOffset=0){
  const a=(player.aiHillAnchorAngle||0)+angleOffset;
  return {x:CONFIG.cx+Math.cos(a)*radius,y:CONFIG.cy+Math.sin(a)*radius*.72};
}
function enemyFlagCarriersFor(player){
  return allPlayers().filter(p=>p.team!==player.team&&p.carryingFlag);
}
function urgentEnemyCarrier(player){
  const carriers=enemyFlagCarriersFor(player);
  return carriers.sort((a,b)=>distance(player,a)-distance(player,b))[0]||null;
}
function centerThreatFor(player,extra=105){
  return allPlayers().filter(p=>p.team!==player.team&&hillDistance(p)<CONFIG.centerRadius+extra)
    .sort((a,b)=>hillDistance(a)-hillDistance(b))[0]||null;
}
function guardianAffinity(type,style){return GUARDIAN_PROFILES[type]?.[style]??(style==='todoterreno'?2:1);}
function guardianChaosGoal(player){
  const candidates=state.guardians.filter(g=>['gorilla','elephant','monkey','penguin'].includes(g.type));
  if(!candidates.length)return null;
  const ranked=candidates.map(g=>({g,score:guardianAffinity(g.type,player.aiStyle)*120-distance(player,g)*.18-hillDistance(g)*.06}))
    .sort((a,b)=>b.score-a.score);
  const g=ranked[0]?.g;if(!g)return null;
  // La IA no se queda junto al guardián: se coloca del lado exterior para atraerlo hacia la colina.
  const a=Math.atan2(g.y-CONFIG.cy,g.x-CONFIG.cx);
  return {x:g.x+Math.cos(a)*92,y:g.y+Math.sin(a)*70,role:'lure'};
}
function aiMissionIsCritical(player){
  return player.carryingFlag||['score','recover','capture-flag','recover-stolen','deliver','intercept-carrier','escort'].includes(player.aiRole);
}
function applyHillGravity(player,goal){
  if(!goal)return {x:CONFIG.cx,y:CONFIG.cy,role:'contest'};
  const far=hillDistance(player)>430;
  const goalFar=Math.hypot(goal.x-CONFIG.cx,goal.y-CONFIG.cy)>470;
  const critical=player.carryingFlag||['score','recover','capture-flag','recover-stolen','deliver','intercept-carrier'].includes(goal.role);
  if(far&&!critical&&player.aiFarClock>2.8)return {...hillAnchor(player,75),role:'return-center'};
  if(goalFar&&!critical&&player.aiMissionClock>2.4)return {...hillAnchor(player,105),role:'return-center'};
  return goal;
}
function nonFlagStyleGoal(player,carrier=null){
  const enemy=mostDangerousEnemy(player),centerEnemy=centerThreatFor(player),style=player.aiStyle;
  const enemyCarrier=urgentEnemyCarrier(player);
  // Emergencia universal: una bandera robada siempre está por encima de la personalidad.
  if(enemyCarrier)return {x:enemyCarrier.x,y:enemyCarrier.y,role:'intercept-carrier'};
  if(carrier){
    if(style==='defensivo'){
      const threat=centerEnemy||enemy;
      return threat?{x:threat.x,y:threat.y,role:'clear'}:{...hillAnchor(player,135),role:'guard'};
    }
    if(style==='tactico'){
      const threat=centerEnemy;
      return threat?{x:(threat.x+CONFIG.cx)/2,y:(threat.y+CONFIG.cy)/2,role:'cutoff'}:{x:carrier.x+115*player.navBias,y:carrier.y-45,role:'escort'};
    }
    if(style==='troll'||style==='caotico'){
      const chaos=guardianChaosGoal(player);
      if(chaos&&hillDistance(player)<520)return chaos;
      return centerEnemy?{x:centerEnemy.x,y:centerEnemy.y,role:'harass'}:{...hillAnchor(player,90),role:'contest'};
    }
    return centerEnemy?{x:centerEnemy.x,y:centerEnemy.y,role:'clear'}:{...hillAnchor(player,70),role:'contest'};
  }
  if(style==='ofensivo'){
    const target=centerEnemy||(enemy&&hillDistance(enemy)<420?enemy:null);
    return target?{x:target.x,y:target.y,role:'attack'}:{...hillAnchor(player,55),role:'contest'};
  }
  if(style==='defensivo'){
    const target=centerEnemy;
    if(target)return {x:target.x,y:target.y,role:'push-out'};
    return {...hillAnchor(player,145,player.navBias*.35),role:'guard'};
  }
  if(style==='tactico'){
    if(centerEnemy)return {x:(centerEnemy.x+CONFIG.cx)/2,y:(centerEnemy.y+CONFIG.cy)/2,role:'cutoff'};
    return {...hillAnchor(player,115,player.navBias*.55),role:'setup'};
  }
  if(style==='troll'){
    const chaos=guardianChaosGoal(player);
    if(chaos&&hillDistance(player)<500)return chaos;
    return centerEnemy?{x:centerEnemy.x,y:centerEnemy.y,role:'harass'}:{...hillAnchor(player,95),role:'harass'};
  }
  if(style==='caotico'){
    const choices=[];
    const chaos=guardianChaosGoal(player);if(chaos)choices.push(chaos);
    if(centerEnemy)choices.push({x:centerEnemy.x,y:centerEnemy.y,role:'chaos'});
    choices.push({...hillAnchor(player,65+Math.random()*95,(Math.random()-.5)*1.2),role:'chaos'});
    return choices[Math.floor(Math.random()*choices.length)];
  }
  if(centerEnemy)return {x:centerEnemy.x,y:centerEnemy.y,role:'support'};
  return {...hillAnchor(player,85),role:'contest'};
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
  // El objetivo manda: no cruza medio mapa por un objeto y, cuanto más lejos esté de la colina, más exigente es.
  if(!best)return null;
  const d=distance(player,best), itemHill=Math.hypot(best.x-CONFIG.cx,best.y-CONFIG.cy);
  const maxDetour=player.aiStyle==='troll'||player.aiStyle==='caotico'?300:245;
  if(d>maxDetour||itemHill>520)return null;
  return bestScore>(hillDistance(player)>420?145:105)?best:null;
}
function shouldAiUseHeldItem(player,enemy){
  if(!player.heldItem)return false;
  if(player.heldItem==='shield')return !!state.guardians.find(g=>g.type==='penguin'&&g.state==='slide'&&distance(player,g)<270)||!!enemy&&distance(player,enemy)<90;
  if(player.heldItem==='honey')return !!enemy&&distance(player,enemy)<230;
  if(player.heldItem==='clownmask')return allPlayers().filter(p=>p.team!==player.team&&distance(player,p)<245).length>=1;
  if(player.heldItem==='sunglasses')return !!enemy&&distance(player,enemy)<430;
  if(player.heldItem==='television'||player.heldItem==='radio')return hillDistance(player)<360||allPlayers().filter(p=>p.team!==player.team&&distance(player,p)<360).length>=2;
  return !!enemy&&distance(player,enemy)<420;
}
function rivalAiInput(player){
  const tick=1/60;
  player.aiDecisionClock-=tick;
  player.aiPlanLock=Math.max(0,(player.aiPlanLock||0)-tick);
  player.aiMissionClock=(player.aiMissionClock||0)+tick;
  player.aiFarClock=hillDistance(player)>430?(player.aiFarClock||0)+tick:Math.max(0,(player.aiFarClock||0)-tick*2.2);
  player.aiIdleWatch=(player.aiIdleWatch||0)+tick;
  if(Math.hypot(player.vx,player.vy)>18)player.aiIdleWatch=0;
  if(player.aiIdleWatch>1.8){player.aiDecisionClock=0;player.navStuckClock=1;player.navEscapeClock=.8;player.navEscapeAngle=Math.random()*Math.PI*2;player.aiIdleWatch=0;}

  const monkeyThreat=monkeyFlagThreatForTeam(player.team);
  if(monkeyThreat){
    player.aiTargetX=monkeyThreat.x;player.aiTargetY=monkeyThreat.y;player.aiRole='recover-from-monkey';player.aiDecisionClock=.12;
    if(player.heldBall>0&&distance(player,monkeyThreat)<410)throwBall(player,monkeyThreat);
    const dirs=smartAiDirections(player,monkeyThreat,18);
    if(player.heldBall<=0&&player.jump<=0&&player.aiJumpCooldown<=0&&distance(player,monkeyThreat)>48&&distance(player,monkeyThreat)<145){dirs.action=true;player.aiJumpCooldown=.82;player.aiJumpAngle=Math.atan2(monkeyThreat.y-player.y,monkeyThreat.x-player.x);player.aiJumpCommitClock=CONFIG.jumpDuration+.10;}
    return dirs;
  }
  const captureGoal=captureMissionFor(player);
  if(captureGoal){
    if(captureGoal.role!==player.aiRole)player.aiMissionClock=0;
    player.aiTargetX=captureGoal.x;player.aiTargetY=captureGoal.y;player.aiRole=captureGoal.role;
    player.aiPlanLock=Math.max(player.aiPlanLock,2.8);
    player.aiDecisionClock=.22;
  }else if(player.aiDecisionClock<=0||!Number.isFinite(player.aiTargetX)||distance(player,{x:player.aiTargetX,y:player.aiTargetY})<28){
    const urgent=urgentEnemyCarrier(player);
    const usefulItem=!urgent&&player.aiFarClock<2.2&&player.aiPlanLock<=0?bestAiItemTarget(player):null;
    let goal=urgent?{x:urgent.x,y:urgent.y,role:'intercept-carrier'}:(usefulItem?{x:usefulItem.x,y:usefulItem.y,role:'item'}:chooseStableAiTarget(player));
    goal=applyHillGravity(player,goal);
    if(goal.role!==player.aiRole){
      player.aiMissionClock=0;
      player.aiPlanLock=['intercept-carrier','escort','guard','cutoff'].includes(goal.role)?1.5:.65;
    }
    player.aiTargetX=goal.x;player.aiTargetY=goal.y;player.aiRole=goal.role;
    player.aiDecisionClock=(player.aiStyle==='caotico'?.72:.34)+Math.random()*.24;
  }
  const enemy=mostDangerousEnemy(player);
  if(shouldAiUseHeldItem(player,enemy))useHeldItem(player);
  if(player.heldBall>0&&enemy&&distance(player,enemy)<410)throwBall(player,enemy);
  return smartAiDirections(player,{x:player.aiTargetX,y:player.aiTargetY},player.aiRole==='escort'?55:20);
}

function pointIsWalkable(x,y){return insideTrunk(x,y)&&!ridgeCollision(x,y);}
function pointIsPlayerWalkable(x,y){return insideTrunk(x,y)&&!ridgeCollision(x,y,.86);}
function smartAiDirections(player,target,dead=18){
  if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))target={x:CONFIG.cx,y:CONFIG.cy};
  const step=46;let dx=target.x-player.x,dy=target.y-player.y;const dist=Math.hypot(dx,dy)||1;
  let angle=Math.atan2(dy,dx),directAngle=angle;
  if(player.jump>0&&player.aiJumpCommitClock>0){
    const a=player.aiJumpAngle||angle,mx=Math.cos(a),my=Math.sin(a);
    return {left:mx<-.22,right:mx>.22,up:my<-.22,down:my>.22,action:false};
  }
  const ahead=(a,d=step)=>pointIsPlayerWalkable(player.x+Math.cos(a)*d,player.y+Math.sin(a)*d);
  let directBlocked=!ahead(angle,54),shouldJump=false;
  if(directBlocked&&!player.heldItem&&player.heldBall<=0&&player.jump<=0&&player.aiJumpCooldown<=0){
    if(pointIsPlayerWalkable(player.x+Math.cos(angle)*108,player.y+Math.sin(angle)*108)){shouldJump=true;player.aiJumpCooldown=.88;player.aiJumpAngle=angle;player.aiJumpCommitClock=CONFIG.jumpDuration+.10;}
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
    shouldJump=!player.heldItem&&player.heldBall<=0&&player.jump<=0&&player.aiJumpCooldown<=0;player.aiJumpCooldown=.9;if(shouldJump){player.aiJumpAngle=angle;player.aiJumpCommitClock=CONFIG.jumpDuration+.10;}
    player.navEscapeClock=.72;player.navEscapeAngle=angle+(1.15+Math.random()*.7)*player.navBias;player.navBias*=-1;player.navStuckClock=0;
  }
  if(player.navEscapeClock>0){angle=player.navEscapeAngle;player.navEscapeClock=Math.max(0,player.navEscapeClock-1/60);}
  const penguin=state.guardians.find(g=>g.type==='penguin'&&(g.state==='charge'||g.state==='slide'));
  if(penguin&&distance(player,penguin)<560){
    angle=Math.atan2(player.y-penguin.y,player.x-penguin.x)+player.navBias*.36;
    if(penguin.state==='slide'&&distance(player,penguin)<150&&player.jump<=0&&player.aiJumpCooldown<=0){shouldJump=true;player.aiJumpCooldown=.75;player.aiJumpAngle=angle;player.aiJumpCommitClock=CONFIG.jumpDuration+.10;}
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
    const jaguar=state.guardians.find(g=>g.type==='jaguar'&&g.visible&&distance(ball,g)<46);
    if(jaguar){jaguarFury(jaguar,10);jaguar.stunned=.18;ball.life=0;burst(jaguar.x,jaguar.y,10);showToast('🐆⚽💢 ¡PELOTAZO! El jaguar cazará a un jugador de cada equipo.');}
    if(ball.life<=0)continue;
    const monkey=state.guardians.find(g=>g.type==='monkey'&&distance(ball,g)<42);
    if(monkey){monkey.stunned=.5;monkeyDropFlag(monkey,ball,590);monkey.hearts=2;monkey.damageClock=0;const gorilla=state.guardians.find(g=>g.type==='gorilla');const accused=allPlayers().sort((a,b)=>distance(monkey,a)-distance(monkey,b))[0];if(gorilla&&accused){monkey.helpGorillaId=gorilla.id;monkey.accuseId=accused.id;showToast('🐵😭⚽ ¡PELOTAZO! ¡SOLTÓ LA BANDERA!');}ball.life=0;burst(monkey.x,monkey.y,10);}
    if(ball.life<=0)continue;
    for(const p of allPlayers()){
      if(p.team===ball.ownerTeam||p.invulnerable>0||distance(ball,p)>38)continue;
      const heavy=ball.kind==='heavyball';dropFlagFrom(p,ball,heavy?760:470);p.stun=heavy?.62:.35;p.invulnerable=.7;const a=Math.atan2(p.y-ball.y,p.x-ball.x);const force=heavy?760:430;p.vx=Math.cos(a)*force;p.vy=Math.sin(a)*force;ball.life=0;burst(p.x,p.y,heavy?22:15);showToast(heavy?'🏐💥 ¡PELOTA PESADA!':'⚽ ¡Pelotazo!');break;
    }
  }
  for(const b of state.balls)if((b.life<=0||b.bounces<0)&&!b.settled)settleBall(b);
  state.balls=state.balls.filter(b=>b.life>0&&b.bounces>=0);
}
function drawBalls(){for(const b of state.balls){ctx.save();ctx.translate(b.x,b.y);ctx.font=(b.kind==='heavyball'?'42px':'34px')+' serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.kind==='heavyball'?'🏐':b.kind==='bouncyball'?'🏀':'⚽',0,0);ctx.restore();}}
function randomLandingPoint(){
  for(let tries=0;tries<22;tries++){const a=Math.random()*Math.PI*2,r=235+Math.random()*390;const x=CONFIG.cx+Math.cos(a)*r,y=CONFIG.cy+Math.sin(a)*r*.60;if(pointIsWalkable(x,y))return{x,y};}
  return{x:CONFIG.cx,y:CONFIG.cy+260};
}
function bearThrowItem(bear,type,landing){
  bear.throwPose=.85;
  if(type==='bomb'){state.bombs.push({id:'bomb-'+Math.random().toString(36).slice(2),x:bear.x,y:bear.y,sx:bear.x,sy:bear.y,tx:landing.x,ty:landing.y,flight:1.2,flightAge:0,arcHeight:185,flying:true,vx:0,vy:0,fuse:4.1,holder:null,ownerId:'bear'});showToast('🐻💣 ¡LA OSA LANZÓ UNA BOMBA!');return;}
  if(type==='egg'){state.eggs.push({id:'egg-'+Math.random().toString(36).slice(2),x:bear.x,y:bear.y,sx:bear.x,sy:bear.y,tx:landing.x,ty:landing.y,flight:1.35,age:0,stage:'flight'});showToast('🐻🥚 ¡LA OSA TIRÓ UN HUEVO!');return;}
  state.items.push(makeItem(type,bear.x,bear.y,{active:false,flying:true,sx:bear.x,sy:bear.y,tx:landing.x,ty:landing.y,flight:1.2,arcHeight:170,thrownByBear:true}));
  showToast(`🐻${ITEM_ICONS[type]||'🎁'} ¡La osa lanzó un objeto!`);burst(bear.x,bear.y,7);
}
function seasonalBearItem(){const pools={summer:['watermelon','sunscreen','juice'],spring:['flower','honey','berry'],autumn:['acorn','goldleaf','mushroom'],winter:['snowman','ice','shield']};const pool=pools[state.season]||['banana'];return pool[Math.floor(Math.random()*pool.length)];}
function mapItemCount(type){
  return state.items.filter(i=>i.type===type&&(i.active||i.flying)).length+
    allPlayers().filter(p=>p.heldItem===type).length;
}
function weightedChoice(entries){
  const total=entries.reduce((sum,e)=>sum+e.weight,0);let r=Math.random()*total;
  for(const e of entries){r-=e.weight;if(r<=0)return e.type;}
  return entries[entries.length-1].type;
}
function otherBearItem(){
  // Los objetos repetidos pierden peso para que la osa mantenga variedad.
  // Las pelotas pesadas ya no se cuelan en esta categoría: pertenecen al cupo de pelotas.
  const pool=['banana','shield','honey','television','radio','bell','snowman','sunglasses','campfire','hammer','clownmask','gift','fishingrod'];
  return weightedChoice(pool.map(type=>({type,weight:1/(1+mapItemCount(type)*1.35)})));
}
function activeBallCount(){
  const ballTypes=new Set(['ball','heavyball','bouncyball']);
  const flying=state.balls.filter(b=>b.life>0).length;
  const loose=state.items.filter(i=>ballTypes.has(i.type)&&(i.active||i.flying)).length;
  const held=allPlayers().filter(p=>p.heldBall>0||ballTypes.has(p.heldItem)).length;
  return flying+loose+held;
}
function specialBearRoll(){
  const table={summer:{egg:.25,peanut:.20,ice:.01},spring:{egg:.20,peanut:.15,ice:.10},autumn:{egg:.15,peanut:.10,ice:.20},winter:{egg:.10,peanut:.05,ice:.35}}[state.season];
  const r=Math.random();let edge=.10;if(r<edge)return'bomb';edge+=table.egg;if(r<edge)return'egg';edge+=table.peanut;if(r<edge)return'peanut';edge+=table.ice;if(r<edge)return'ice';return null;
}
function updateBearThrows(dt){
  const bear=state.fauna.find(a=>a.type==='bear');if(!bear)return;
  bear.throwPose=Math.max(0,bear.throwPose-dt);state.bearItemClock-=dt;state.bearSpecialClock-=dt;state.bearFishClock-=dt;
  if(state.bearItemClock<=0){state.bearItemClock=6;const r=Math.random();const type=r<.50?'ball':r<.70?seasonalBearItem():otherBearItem();bearThrowItem(bear,type,randomLandingPoint());}
  if(state.bearSpecialClock<=0){state.bearSpecialClock=10;const type=specialBearRoll();if(type)bearThrowItem(bear,type,randomLandingPoint());}
  if(state.bearFishClock<=0){state.bearFishClock=15;if(Math.random()<.75)bearThrowItem(bear,bearFishType(),randomLandingPoint());}
}
function updateEggsAndChicks(dt){
  const rules=chickRules();
  for(const egg of state.eggs){egg.age+=dt;if(egg.stage==='flight'){const t=Math.min(1,egg.age/CONFIG.eggFlightSeconds);egg.x=egg.sx+(egg.tx-egg.sx)*t;egg.y=egg.sy+(egg.ty-egg.sy)*t-Math.sin(Math.PI*t)*145;if(t>=1){egg.stage='egg';egg.age=0;egg.x=egg.tx;egg.y=egg.ty;burst(egg.x,egg.y,6);}}else if(egg.stage==='egg'&&egg.age>rules.hatchStep){egg.stage='crack';egg.age=0;}else if(egg.stage==='crack'&&egg.age>rules.hatchStep){egg.stage='baby';egg.age=0;}else if(egg.stage==='baby'&&egg.age>rules.hatchStep){state.chicks.push({id:'chick-'+Math.random().toString(36).slice(2),x:egg.x,y:egg.y,vx:0,vy:0,life:rules.life,power:rules.power,attackCooldown:0,phase:0,exiting:false});egg.dead=true;showToast('🐤😈 ¡NACIÓ EL POLLITO DEMONIO!');}}
  state.eggs=state.eggs.filter(e=>!e.dead);
  for(const c of state.chicks){c.phase+=dt;c.attackCooldown=Math.max(0,c.attackCooldown-dt);if(!c.exiting){c.life-=dt;const targets=allPlayers();const target=targets.sort((a,b)=>distance(c,a)-distance(c,b))[0];if(target){const ang=Math.atan2(target.y-c.y,target.x-c.x);c.vx=approach(c.vx,Math.cos(ang)*420,1100*dt);c.vy=approach(c.vy,Math.sin(ang)*420,1100*dt);if(distance(c,target)<45&&c.attackCooldown<=0){pushCreature(target,c,255*(c.power||1));target.stun=Math.max(target.stun,.12);c.attackCooldown=.48;showToast('🐤 ¡PICOTAZO DEMONÍACO!');}}if(c.life<=0){c.exiting=true;const ang=Math.atan2(c.y-CONFIG.cy,c.x-CONFIG.cx);c.vx=Math.cos(ang)*560;c.vy=Math.sin(ang)*560;showToast('🐤💨 ¡El demonio volvió al bosque!');}}else{c.life-=dt;if(c.life<-2)c.dead=true;}c.x+=c.vx*dt;c.y+=c.vy*dt;if(!c.exiting&&!insideTrunk(c.x,c.y)){c.vx*=-.6;c.vy*=-.6;c.x=Math.max(95,Math.min(1905,c.x));c.y=Math.max(80,Math.min(1045,c.y));}}
  state.chicks=state.chicks.filter(c=>!c.dead);
}
function drawEggsAndChicks(){for(const e of state.eggs){ctx.save();ctx.translate(e.x,e.y);ctx.font='38px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.stage==='flight'||e.stage==='egg'?'🥚':e.stage==='crack'?'🐣':'🐥',0,0);ctx.restore();}for(const c of state.chicks){ctx.save();ctx.translate(c.x,c.y+Math.sin(c.phase*16)*10);ctx.rotate(Math.sin(c.phase*10)*.22);ctx.font='40px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🐤',0,0);ctx.font='14px serif';ctx.fillText('😈',14,-18);ctx.restore();}}
function updateScoring(dt){scoreTeam(state.flag,state.players,state.humanTeam,dt);scoreTeam(state.rivalFlag,state.rivals,state.rivalTeam,dt);scoreTeam(state.rival2Flag,state.rivals2,state.rival2Team,dt);if(state.rival3Flag)scoreTeam(state.rival3Flag,state.rivals3,state.rival3Team,dt);}
function contestedScoreInterval(team){
  const occupants=allPlayers().filter(p=>Math.hypot(p.x-CONFIG.cx,p.y-CONFIG.cy)<CONFIG.centerRadius+8);
  const opponents=occupants.filter(p=>p.team!==team).length;
  if(opponents<=0)return CONFIG.scoreEvery;
  if(opponents===1)return 1.30;
  if(opponents===2)return 2.00;
  return 3.00;
}
function scoreTeam(flag,roster,team,dt){
  const carrier=getCarrier(flag,roster),validCarrier=carrier&&flag.team===team&&carrier.team===team&&carrier.carryingFlag&&flag.carrier===carrier.id;
  const inCenter=validCarrier&&Math.hypot(carrier.x-CONFIG.cx,carrier.y-CONFIG.cy)<CONFIG.centerRadius;
  const isHuman=team===state.humanTeam,isR1=team===state.rivalTeam,isR2=team===state.rival2Team;const clockKey=isHuman?'scoreClock':isR1?'rivalScoreClock':isR2?'rival2ScoreClock':'rival3ScoreClock';
  if(!inCenter){state[clockKey]=0;return;}
  const interval=contestedScoreInterval(team);state[clockKey]+=dt;
  if(state[clockKey]>=interval){state[clockKey]-=interval;
    if(isHuman){state.score++;ui.score.textContent=String(state.score);if(state.score>=CONFIG.targetScore)winLevel(team);}
    else if(isR1){state.rivalScore++;ui.rivalScore.textContent=String(state.rivalScore);if(state.rivalScore>=CONFIG.targetScore)winLevel(team);}
    else if(isR2){state.rival2Score++;ui.rival2Score.textContent=String(state.rival2Score);if(state.rival2Score>=CONFIG.targetScore)winLevel(team);}
    else{state.rival3Score++;if(ui.rival3Score)ui.rival3Score.textContent=String(state.rival3Score);if(state.rival3Score>=CONFIG.targetScore)winLevel(team);}
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
  drawFauna(); drawClouds(); drawHazards(); drawItems(); drawBombs(); drawFishProjectiles(); drawBalls(); drawEggsAndChicks(); drawFlag(state.flag);drawFlag(state.rivalFlag);drawFlag(state.rival2Flag);if(state.rival3Flag)drawFlag(state.rival3Flag); drawGuardians(); drawAlly(); allPlayers().forEach(drawPlayer); drawParticles(); drawWeather();
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
  if(player.deathFlash>0||player.ghost>0){ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=player.deathFlash>0?'58px serif':'54px serif';ctx.fillText(player.deathFlash>0?'💀':'👻',0,0);ctx.restore();return;}
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
  if(player.rodActive){ctx.font='30px serif';ctx.fillText('🎣',34,26);ctx.font='20px serif';ctx.fillText('🐟',46,52);}
  if(player.wet>0){ctx.font='18px serif';ctx.fillText('💧',-30,-25);}
  if(player.heldItem){drawItemGraphic(player.heldItem,25,32,24);if(player.heldItem==='bomb'){ctx.font='15px sans-serif';ctx.fillStyle='#fff';ctx.fillText(String(Math.max(1,Math.ceil(player.bombFuse||3.4))),25,5);}}
  if(player.shieldActive>0){ctx.strokeStyle=player.parryWindow>0?'rgba(255,255,255,.98)':'rgba(119,222,255,.95)';ctx.lineWidth=player.parryWindow>0?8:5;ctx.beginPath();ctx.arc(0,5,42,0,Math.PI*2);ctx.stroke();}
  if(player.hammerSwing>0){ctx.font='34px serif';ctx.fillText('🔨',(player.facing||1)*38,-10);}
  if(player.clownTaunt>0){ctx.save();ctx.font='48px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🤡',0,2);ctx.font='18px serif';ctx.fillText('😂',player.facing*40,-28);ctx.restore();}
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
  state.particles.forEach((p)=>{ctx.globalAlpha=Math.max(0,p.life*1.8);ctx.font=p.type==='dust'?'17px serif':'22px serif';const glyph=p.type==='dust'?'·':p.type==='snow'?'❄️':p.type==='drop'?'💧':p.type==='splash'?'💦':p.type==='confetti'?(['🎊','✨','⭐'][Math.floor(Math.random()*3)]):p.type==='music'?'🎵':p.type==='eyes'?'👀':p.type==='ear'?'👂':p.type==='spark'?'💥':'✨';ctx.fillText(glyph,p.x,p.y);});ctx.globalAlpha=1;
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



// Alpha 15.4 · capas de atención, campana, bomba, hielo y nube eléctrica.
function freezeSeconds(){return {winter:6,autumn:4,spring:2,summer:1}[state.season]||1;}
function cloudRule(){return {summer:{interval:60,chance:.05},spring:{interval:45,chance:.10},autumn:{interval:30,chance:.15},winter:{interval:15,chance:.20}}[state.season]||{interval:60,chance:.05};}
function ghostPlayer(player,seconds){
  const carried=playerCarriedFlag(player);if(carried)releaseFlag(carried,player.x,player.y-18,0,0,.9);
  player.heldItem=null;player.bombFuse=0;player.deathFlash=.45;player.ghost=seconds;player.stun=Math.max(player.stun,seconds+.45);player.vx=0;player.vy=0;burst(player.x,player.y,18);
}
function explodeBomb(bomb,carried=false){
  const radius=155;state.cameraShake=Math.max(state.cameraShake,.55);
  for(const p of allPlayers())if(distance(p,bomb)<=radius){const d=Math.max(1,distance(p,bomb)),a=Math.atan2(p.y-bomb.y,p.x-bomb.x);p.vx=Math.cos(a)*620;p.vy=Math.sin(a)*620;ghostPlayer(p,carried&&bomb.holder===p.id?9:4);}
  if(state.ally&&distance(state.ally,bomb)<=radius)hitAlly(bomb,620);
  for(const g of state.guardians)if(distance(g,bomb)<=radius){const a=Math.atan2(g.y-bomb.y,g.x-bomb.x);g.x+=Math.cos(a)*42;g.y+=Math.sin(a)*42;if('stunned'in g)g.stunned=Math.max(g.stunned||0,1.1);if(g.type==='penguin'){g.slideVx=Math.cos(a)*650;g.slideVy=Math.sin(a)*650;}}
  for(let i=0;i<34;i++){const a=Math.random()*Math.PI*2,sp=90+Math.random()*360;state.particles.push({x:bomb.x,y:bomb.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.45+Math.random()*.65,type:i%3?'spark':'confetti'});}showToast('💣💥 ¡BOOOOM! 💀 ... 👻');
}
function updateBombs(dt){
  for(const b of state.bombs){
    if(b.flying){
      b.flightAge=(b.flightAge||0)+dt;const t=Math.min(1,b.flightAge/Math.max(.01,b.flight||1.2));
      b.x=(b.sx??b.x)+((b.tx??b.x)-(b.sx??b.x))*t;
      b.y=(b.sy??b.y)+((b.ty??b.y)-(b.sy??b.y))*t-Math.sin(Math.PI*t)*(b.arcHeight||185);
      if(t>=1){b.flying=false;b.x=b.tx;b.y=b.ty;burst(b.x,b.y,10);}continue;
    }
    b.fuse-=dt;
    if(b.holder){const p=allPlayers().find(x=>x.id===b.holder);if(p){b.x=p.x;b.y=p.y-35;p.bombFuse=b.fuse;}else b.holder=null;}
    else{const ox=b.x,oy=b.y;b.x+=(b.vx||0)*dt;b.y+=(b.vy||0)*dt;b.vx=(b.vx||0)*Math.pow(.10,dt);b.vy=(b.vy||0)*Math.pow(.10,dt);if(!pointIsWalkable(b.x,b.y)){b.x=ox;b.y=oy;b.vx*=-.45;b.vy*=-.45;}
      for(const p of allPlayers()){if(p.heldItem||p.ghost>0||p.deathFlash>0||distance(p,b)>48)continue;p.heldItem='bomb';p.bombFuse=b.fuse;b.holder=p.id;b.dead=true;showToast('💣 ¡LA AGARRASTE! ¡TIRALA!');break;}
    }
    if(b.fuse<=0){explodeBomb(b,!!b.holder);b.dead=true;}
  }
  state.bombs=state.bombs.filter(b=>!b.dead);
  for(const p of allPlayers())if(p.heldItem==='bomb'&&p.bombFuse<=0){explodeBomb({x:p.x,y:p.y,holder:p.id},true);p.heldItem=null;p.bombFuse=0;}
}
function drawBombs(){for(const b of state.bombs){ctx.save();ctx.translate(b.x,b.y);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='44px serif';ctx.fillText('💣',0,0);ctx.font='19px sans-serif';ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.strokeText(String(Math.max(1,Math.ceil(b.fuse))),0,-34);ctx.fillText(String(Math.max(1,Math.ceil(b.fuse))),0,-34);ctx.restore();}}
function spawnCloud(){const left=Math.random()<.5;state.clouds.push({x:left?-100:2100,y:130+Math.random()*250,vx:left?95:-95,life:24,strikeClock:1.2+Math.random()*1.4,pulse:0});showToast('☁️⚡ ¡SE ACERCA UNA NUBE ELÉCTRICA!');}
function updateClouds(dt){const rule=cloudRule();state.cloudCheckClock-=dt;if(state.cloudCheckClock<=0){state.cloudCheckClock=rule.interval;if(Math.random()<rule.chance)spawnCloud();}
  for(const c of state.clouds){c.life-=dt;c.x+=c.vx*dt;c.pulse+=dt*5;c.strikeClock-=dt;if(c.strikeClock<=0){c.strikeClock=1.15+Math.random()*1.4;const target=[...allPlayers(),...state.guardians,state.ally].filter(Boolean).filter(e=>Math.abs(e.x-c.x)<165).sort((a,b)=>Math.abs(a.x-c.x)-Math.abs(b.x-c.x))[0];if(target){const strike={x:target.x,y:target.y};state.hazards.push({type:'lightning',x:strike.x,y:strike.y,life:.32,radius:80,pulse:0});if(target.character){target.vx+=(Math.random()-.5)*420;target.vy=520;target.stun=Math.max(target.stun,.65);}else if(target===state.ally)hitAlly(c,420);else if('stunned'in target)target.stunned=Math.max(target.stunned||0,.8);state.cameraShake=.25;burst(strike.x,strike.y,14);}}}
  state.clouds=state.clouds.filter(c=>c.life>0&&c.x>-180&&c.x<2180);
}
function drawClouds(){for(const c of state.clouds){ctx.save();ctx.translate(c.x,c.y);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='82px serif';ctx.fillText('☁️',0,0);ctx.font='30px serif';ctx.fillText('⚡',Math.sin(c.pulse)*24,48);ctx.restore();}}


// Alpha 15.5 · Jaguar, pescados y caña de dos tiempos.
function makeJaguar(id){return {id,type:'jaguar',x:CONFIG.cx,y:CONFIG.cy,spawnX:CONFIG.cx,spawnY:CONFIG.cy,radius:34,state:'hidden',visible:false,targetId:null,stalkClock:2.5+Math.random()*2.5,ambushClock:0,roamClock:0,furyClock:0,teamQueue:[],jumpHeight:0,vx:0,vy:0,stunned:0,eatingClock:0,fishTarget:null,hitCooldown:new Map()};}
function jaguarCandidate(j){
  const rodTargets=allPlayers().filter(p=>p.rodActive);
  if(rodTargets.length)return rodTargets.sort((a,b)=>distance(j,a)-distance(j,b))[0];
  const wet=allPlayers().filter(p=>p.wet>0);if(wet.length)return wet.sort((a,b)=>b.wet-a.wet)[0];
  const all=allPlayers();
  return all.sort((a,b)=>{const da=Math.hypot(a.x-CONFIG.cx,a.y-CONFIG.cy),db=Math.hypot(b.x-CONFIG.cx,b.y-CONFIG.cy);const aloneA=all.filter(o=>o!==a&&distance(a,o)<170).length,aloneB=all.filter(o=>o!==b&&distance(b,o)<170).length;return (db+aloneA*80)-(da+aloneB*80);})[0]||null;
}
function startJaguarAmbush(j,target){if(!target)return;j.visible=true;j.state='ambush';j.targetId=target.id;const a=Math.atan2(target.y-CONFIG.cy,target.x-CONFIG.cx);j.x=target.x+Math.cos(a)*260;j.y=target.y+Math.sin(a)*260;j.vx=(target.x-j.x)*2.25;j.vy=(target.y-j.y)*2.25;j.ambushClock=.72;j.jumpHeight=0;showToast('🌿🐆 ¡EMBOSCADA!');}
function jaguarFury(j,seconds=10){j.visible=true;j.state='furious';j.furyClock=seconds;j.teamQueue=[state.humanTeam,state.rivalTeam,state.rival2Team,...(state.rival3Flag?[state.rival3Team]:[])];j.targetId=null;showToast('🐆💢 ¡EL JAGUAR ENTRÓ EN FURIA!');}
function respawnByJaguar(p){dropFlagFrom(p,{x:p.x,y:p.y},520);p.deathFlash=.35;p.stun=.6;setTimeout(()=>{respawnPlayer(p);p.invulnerable=1.5;},350);burst(p.x,p.y,14);}
function updateJaguar(j,dt){
  j.stunned=Math.max(0,(j.stunned||0)-dt);j.eatingClock=Math.max(0,(j.eatingClock||0)-dt);for(const[k,v]of j.hitCooldown){const n=v-dt;n<=0?j.hitCooldown.delete(k):j.hitCooldown.set(k,n);}if(j.stunned>0)return;
  if(j.eatingClock>0){j.visible=true;j.state='eating';return;}
  if(j.state==='hidden'){j.visible=false;j.stalkClock-=dt;if(j.stalkClock<=0)startJaguarAmbush(j,jaguarCandidate(j));return;}
  if(j.state==='ambush'){
    const target=allPlayers().find(p=>p.id===j.targetId);j.ambushClock-=dt;const t=1-Math.max(0,j.ambushClock)/.72;j.jumpHeight=Math.sin(Math.PI*t)*95;j.x+=j.vx*dt;j.y+=j.vy*dt;
    if(target&&distance(j,target)<58&&j.ambushClock<.30){if(target.jump>0){showToast('🐆💨 ¡LO ESQUIVASTE JUSTO!');}else respawnByJaguar(target);j.state='roam';j.roamClock=5;j.jumpHeight=0;}
    if(j.ambushClock<=0){j.state='roam';j.roamClock=5;j.jumpHeight=0;}return;
  }
  if(j.state==='furious'){
    j.furyClock-=dt;let target=allPlayers().find(p=>p.id===j.targetId);
    if(!target&&j.teamQueue.length){const team=j.teamQueue[0];target=rosterForTeam(team).sort((a,b)=>distance(j,a)-distance(j,b))[0];j.targetId=target?.id||null;}
    if(target){moveGuardianNavigated(j,target.x,target.y,330,dt,34);if(distance(j,target)<55&&!j.hitCooldown.has(target.id)){respawnByJaguar(target);j.hitCooldown.set(target.id,1);j.teamQueue.push(j.teamQueue.shift());j.targetId=null;}}
    if(j.furyClock<=0){j.state='roam';j.roamClock=4;j.teamQueue=[];j.targetId=null;}return;
  }
  if(j.state==='roam'){
    j.visible=true;j.roamClock-=dt;const target=jaguarCandidate(j);if(target)moveGuardianNavigated(j,target.x,target.y,165,dt,42);
    for(const p of allPlayers())if(distance(j,p)<55&&!j.hitCooldown.has(p.id)){damagePlayer(p,1);pushCreature(p,j,420);p.stun=Math.max(p.stun,.35);j.hitCooldown.set(p.id,1.1);}
    if(j.roamClock<=0){j.state='hidden';j.visible=false;j.stalkClock=3+Math.random()*4;}return;
  }
}
function bearFishType(){const r=Math.random(),table={summer:{tropical:.20,puffer:.05},spring:{tropical:.25,puffer:.10},autumn:{tropical:.15,puffer:.30},winter:{tropical:.10,puffer:.50}}[state.season];return r<table.tropical?'tropicalfish':r<table.tropical+table.puffer?'pufferfish':'fish';}
function throwFishProjectile(player,type,aim){state.fishProjectiles.push({id:'fish-'+Math.random().toString(36).slice(2),kind:type,x:player.x,y:player.y-8,vx:Math.cos(aim)*590,vy:Math.sin(aim)*590,life:2.4,ownerTeam:player.team,bounces:1});burst(player.x,player.y,7);}
function damagePlayer(player,amount=1,source=null){
  if(!player||player.invulnerable>0||player.deathFlash>0||player.ghost>0)return false;
  if(player.shieldActive>0){
    player.shieldActive=0;player.parryWindow=0;player.invulnerable=.65;
    showToast('🛡️ ¡El escudo resistió!');burst(player.x,player.y,12);return false;
  }
  dropFlagFrom(player,source||{x:player.x-(player.facing||1)*24,y:player.y},420);
  player.hearts=Math.max(0,(player.hearts??CONFIG.maxHearts)-Math.max(1,amount));
  player.invulnerable=CONFIG.hitInvulnerability;player.stun=Math.max(player.stun,.28);
  updateHeartsHud();
  if(player.hearts<=0){
    player.hearts=CONFIG.maxHearts;respawnPlayer(player);player.invulnerable=1.8;
    showToast(`${CHARACTERS[player.character].emoji} volvió al borde`);updateHeartsHud();
  }
  return true;
}
function wetPlayer(p){p.wet=Math.max(p.wet,3);p.stun=Math.max(p.stun,.18);damagePlayer(p,1);showToast('💧 ¡MOJADO! Ahora resbalás.');}
function enrageGorillaOrElephant(g,kind){const mult=kind==='pufferfish'?2:1;if(g.type==='gorilla'){g.wildClock=CONFIG.gorillaWildSeconds*mult;g.rage=g.wildClock;g.alertState='furious';g.personalTargetId=null;}else if(g.type==='elephant'){angerElephant(g,kind==='pufferfish'?'🐘🐡💢 ¡PEZ GLOBO! ¡FURIA DOBLE!':'🐘🐟💢 ¡Le tiraron un pescado!');}}
function feedPenguin(p,kind){const mult=kind==='tropicalfish'?2:kind==='pufferfish'?1.5:1.5;const push=kind==='pufferfish'?3:mult;p.state='eatFish';p.eatClock=1.1;p.fishBoostBounces=mult;p.fishBoostPower=push;p.slideVx=0;p.slideVy=0;showToast('🐧🐟 ¡PAUSA PARA COMER... Y DESPUÉS TURBO!');}
function feedJaguar(j,kind){if(kind==='pufferfish'){j.stunned=.45;jaguarFury(j,10);showToast('🐆🐡💢 ¡EL PEZ GLOBO LO ENFURECIÓ!');}else{j.state='eating';j.visible=true;j.eatingClock=kind==='tropicalfish'?3:1.4;j.furyClock=0;j.teamQueue=[];j.targetId=null;showToast(kind==='tropicalfish'?'🐆🐠 😋 ¡SU FAVORITO!':'🐆🐟 El jaguar se calmó.');}}
function updateFishProjectiles(dt){for(const f of state.fishProjectiles){const ox=f.x,oy=f.y;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=Math.pow(.72,dt);f.vy*=Math.pow(.72,dt);f.life-=dt;if(!insideTrunk(f.x,f.y)){f.x=ox;f.y=oy;f.vx*=-.55;f.vy*=-.55;f.bounces--;}
  const jag=state.guardians.find(g=>g.type==='jaguar'&&distance(g,f)<48);if(jag){feedJaguar(jag,f.kind==='fishingrod'?'fish':f.kind);f.life=0;continue;}
  const pen=state.guardians.find(g=>g.type==='penguin'&&distance(g,f)<48);if(pen){feedPenguin(pen,f.kind==='fishingrod'?'fish':f.kind);f.life=0;continue;}
  const angry=state.guardians.find(g=>['gorilla','elephant'].includes(g.type)&&distance(g,f)<52);if(angry){enrageGorillaOrElephant(angry,f.kind==='fishingrod'?'fish':f.kind);f.life=0;continue;}
  for(const p of allPlayers()){if(p.team===f.ownerTeam||p.invulnerable>0||distance(p,f)>40)continue;wetPlayer(p);const a=Math.atan2(p.y-f.y,p.x-f.x);p.vx=Math.cos(a)*430;p.vy=Math.sin(a)*430;f.life=0;burst(p.x,p.y,12);break;}
  if(f.life<=0||f.bounces<0){if(f.kind!=='fishingrod'&&pointIsWalkable(f.x,f.y))state.items.push(makeItem(f.kind,f.x,f.y));f.dead=true;}}
  state.fishProjectiles=state.fishProjectiles.filter(f=>!f.dead&&f.life>0);
}
function drawFishProjectiles(){for(const f of state.fishProjectiles){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(Math.atan2(f.vy,f.vx));ctx.font='40px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ITEM_ICONS[f.kind]||'🐟',0,0);ctx.restore();}}


/* ==========================================================================\n   REY DE LA COLINA · ALPHA 15.6 · DIRECTOR DE PARTIDA, FAUNA Y CAOS FINAL\n   ========================================================================== */

function highestTeamScore(){ return Math.max(state.score||0,state.rivalScore||0,state.rival2Score||0,state.rival3Score||0); }
function matchPhase(){ const s=highestTeamScore(); return s>=15?4:s>=10?3:s>=7?2:1; }

function makeBear(x=150,y=160,index=1){
  return {id:`bear-${index}`,type:'bear',x,y,angle:.2+Math.random()*1.2,speed:34,turnClock:2.4+Math.random()*2,bob:0,throwPose:0,
    itemClock:6,specialClock:10,fishClock:15,bombClock:5};
}
function makeKoala(){return {id:'koala-1',type:'koala',x:1850,y:180,angle:Math.PI,speed:24,turnClock:3,bob:0,throwPose:0,koalaClock:6};}
function makeGoat(id='goat-1'){return {id,type:'goat',x:330,y:250,spawnX:330,spawnY:250,radius:30,state:'roam',angle:.3,speed:78,turnClock:2.4,chargeClock:2.5+Math.random()*2,targetId:null,vx:0,vy:0,furyClock:0,furyHits:0,hitCooldown:new Map(),navBias:1,stunned:0};}

function spawnSecondBear(reason=''){if(state.fauna.filter(a=>a.type==='bear').length>=2)return false;state.fauna.push(makeBear(1835,930,2));showToast(reason||'🐻🐻 ¡LLEGÓ OTRA OSA!');return true;}
function resetAlpha156Director(){
  state.secondBearCheckClock=10;state.secondBearResolved=false;state.levelSecondBearDelay=state.level>=7?(1+Math.floor(Math.random()*4)):null;
  state.extraCreatures=[];state.fauna=state.fauna.filter(a=>a.type!=='bear'&&a.type!=='koala');state.fauna.push(makeBear(),makeKoala());
  if(!state.guardians.some(g=>g.type==='goat')){
    const goat=makeGoat();
    const spawn=randomLandingPoint();goat.x=goat.spawnX=spawn.x;goat.y=goat.spawnY=spawn.y;
    goat.angle=Math.atan2(CONFIG.cy-goat.y,CONFIG.cx-goat.x)+(Math.random()-.5)*.8;
    state.guardians.push(goat);
  }
}

const _alpha156ResetWorld=resetWorld;
resetWorld=function(){_alpha156ResetWorld();resetAlpha156Director();};

function bearNormalType(){
  // 50% de pelota al comenzar. Cada pelota activa reduce 5 puntos ese porcentaje.
  // La estación conserva siempre su 20%; lo recuperado pasa a objetos normales.
  const ballChance=Math.max(.05,.50-activeBallCount()*.05);
  const seasonalChance=.20;
  const r=Math.random();
  if(r<ballChance)return 'ball';
  if(r<ballChance+seasonalChance)return seasonalBearItem();
  return otherBearItem();
}
function updateBearIndependent(bear,dt){
  bear.throwPose=Math.max(0,bear.throwPose-dt);bear.itemClock-=dt;bear.specialClock-=dt;bear.fishClock-=dt;
  if(bear.itemClock<=0){bear.itemClock=6;bearThrowItem(bear,bearNormalType(),randomLandingPoint());}
  if(bear.specialClock<=0){bear.specialClock=10;const type=specialBearRoll();if(type)bearThrowItem(bear,type,randomLandingPoint());}
  if(bear.fishClock<=0){bear.fishClock=15;if(Math.random()<.75)bearThrowItem(bear,bearFishType(),randomLandingPoint());}
  if(highestTeamScore()>=15){bear.bombClock-=dt;if(bear.bombClock<=0){bear.bombClock=5;if(Math.random()<.25)bearThrowItem(bear,'bomb',randomLandingPoint());}}
}
updateBearThrows=function(dt){for(const bear of state.fauna.filter(a=>a.type==='bear'))updateBearIndependent(bear,dt);};

function updateMatchDirector(dt){
  if(state.level>=7&&state.levelSecondBearDelay!=null){state.levelSecondBearDelay-=dt;if(state.levelSecondBearDelay<=0){spawnSecondBear('🐻🐻 ¡La segunda osa ya estaba viniendo!');state.levelSecondBearDelay=null;state.secondBearResolved=true;}}
  else if(state.level<7&&!state.secondBearResolved&&highestTeamScore()>=10){state.secondBearCheckClock-=dt;if(state.secondBearCheckClock<=0){state.secondBearCheckClock=10;if(Math.random()<.20){spawnSecondBear('🐻🌲 ¡UNA NUEVA OSA ENTRÓ AL BOSQUE!');state.secondBearResolved=true;}}}
}

/* Jaguar: no caza antes de 7 puntos y no usa temporizadores del navegador. */
respawnByJaguar=function(p){dropFlagFrom(p,{x:p.x,y:p.y},520);p.deathFlash=.28;p.jaguarRespawn=.28;p.stun=.32;burst(p.x,p.y,14);};
const _alpha156UpdatePlayer=updatePlayer;
updatePlayer=function(player,dt){
  if(player.jaguarRespawn>0){player.jaguarRespawn=Math.max(0,player.jaguarRespawn-dt);if(player.jaguarRespawn===0){respawnPlayer(player);player.invulnerable=1.5;}}
  _alpha156UpdatePlayer(player,dt);
};
const _alpha156UpdateJaguar=updateJaguar;
updateJaguar=function(j,dt){
  if(highestTeamScore()<7){j.visible=false;j.state='hidden';j.targetId=null;j.stalkClock=Math.max(j.stalkClock||0,1.2);return;}
  const beforeX=j.x,beforeY=j.y;_alpha156UpdateJaguar(j,dt);
  if(!Number.isFinite(j.x)||!Number.isFinite(j.y)){j.x=beforeX||CONFIG.cx;j.y=beforeY||CONFIG.cy;j.state='hidden';j.visible=false;j.targetId=null;j.stalkClock=2;}
};

function angerNearbyByLooseItem(item){
  const near=state.guardians.filter(g=>['gorilla','elephant','jaguar'].includes(g.type)&&distance(g,item)<115);
  for(const g of near){if(g.type==='gorilla'){g.wildClock=CONFIG.gorillaWildSeconds;g.rage=g.wildClock;g.alertState='furious';}else if(g.type==='elephant')angerElephant(g,'🐏💥 ¡La cabra le voló la comida!');else jaguarFury(g,10);}
}
function goatStartCharge(g,target){if(!target)return;g.state='charge';g.targetId=target.id;const a=Math.atan2(target.y-g.y,target.x-g.x);g.vx=Math.cos(a)*610;g.vy=Math.sin(a)*610;g.chargeTime=1.25;}
function goatFury(g){g.state='furious';g.furyClock=10;g.furyHits=0;g.targetId=null;showToast('🐏💢 ¡LA CABRA ENTRÓ EN FURIA!');}
function updateGoat(g,dt){
  // Rescate de seguridad: si nació o fue empujada fuera del terreno válido,
  // la recolocamos una vez dentro del mapa en lugar de dejarla inmóvil para siempre.
  if(!Number.isFinite(g.x)||!Number.isFinite(g.y)||!pointIsWalkable(g.x,g.y)){
    const spawn=randomLandingPoint();g.x=g.spawnX=spawn.x;g.y=g.spawnY=spawn.y;
    g.state='roam';g.targetId=null;g.vx=0;g.vy=0;g.chargeClock=1.2+Math.random()*1.8;
    g.angle=Math.atan2(CONFIG.cy-g.y,CONFIG.cx-g.x)+(Math.random()-.5)*.8;
  }
  g.stunned=Math.max(0,(g.stunned||0)-dt);for(const[k,v]of g.hitCooldown){const n=v-dt;n<=0?g.hitCooldown.delete(k):g.hitCooldown.set(k,n);}if(g.stunned>0)return;
  if(g.state==='furious'){g.furyClock-=dt;let t=allPlayers().find(p=>p.id===g.targetId);if(!t)t=allPlayers().filter(p=>!g.hitCooldown.has(p.id)).sort((a,b)=>distance(g,a)-distance(g,b))[0];if(t){g.targetId=t.id;goatMoveCharge(g,t,dt,true);}if(g.furyClock<=0||g.furyHits>=3){g.state='roam';g.targetId=null;g.chargeClock=3;}return;}
  if(g.state==='charge'){const t=allPlayers().find(p=>p.id===g.targetId);goatMoveCharge(g,t,dt,false);g.chargeTime-=dt;if(g.chargeTime<=0){g.state='roam';g.targetId=null;g.chargeClock=3+Math.random()*3;}return;}
  g.turnClock-=dt;g.chargeClock-=dt;if(g.turnClock<=0){g.angle+=(Math.random()-.5)*1.5;g.turnClock=1.8+Math.random()*2.8;}const nx=g.x+Math.cos(g.angle)*g.speed*dt,ny=g.y+Math.sin(g.angle)*g.speed*dt;if(pointIsWalkable(nx,ny)){g.x=nx;g.y=ny}else g.angle+=Math.PI*.7;
  if(g.chargeClock<=0){const t=allPlayers().sort((a,b)=>distance(g,a)-distance(g,b))[0];goatStartCharge(g,t);}
}
function goatMoveCharge(g,target,dt,fury){
  if(target){const a=Math.atan2(target.y-g.y,target.x-g.x);const speed=fury?690:610;g.vx=approach(g.vx,Math.cos(a)*speed,1500*dt);g.vy=approach(g.vy,Math.sin(a)*speed,1500*dt);}
  const ox=g.x,oy=g.y;g.x+=g.vx*dt;g.y+=g.vy*dt;if(!pointIsWalkable(g.x,g.y)){g.x=ox;g.y=oy;g.vx*=-.35;g.vy*=-.35;if(!fury)g.chargeTime=0;}
  for(const item of state.items.filter(i=>i.active&&['peanut','fish','tropicalfish','pufferfish','banana'].includes(i.type)&&distance(g,i)<55)){const a=Math.atan2(item.y-g.y,item.x-g.x);item.throwVx=Math.cos(a)*650;item.throwVy=Math.sin(a)*650;item.throwClock=1.1;angerNearbyByLooseItem(item);}
  for(const p of allPlayers())if(distance(g,p)<57&&!g.hitCooldown.has(p.id)){dropFlagFrom(p,g,680);p.vx=g.vx*1.05;p.vy=g.vy*1.05;p.stun=.55;p.invulnerable=.7;g.hitCooldown.set(p.id,1);if(fury){g.furyHits++;g.targetId=null;}else g.chargeTime=0;burst(p.x,p.y,12);}
}

function spawnMouse(x,y){const land=randomLandingPoint();state.extraCreatures.push({id:'mouse-'+Math.random().toString(36).slice(2),type:'mouse',x,y,sx:x,sy:y,tx:land.x,ty:land.y,flight:1.05,flightAge:0,arcHeight:135,flying:true,vx:0,vy:0,life:12,state:'wander',angle:Math.random()*6.28,turnClock:.5});showToast('🐨🐁 ¿Cómo algo tan chiquito puede causar tantos problemas?');}
function spawnSnail(x,y){const land=randomLandingPoint();state.extraCreatures.push({id:'snail-'+Math.random().toString(36).slice(2),type:'snail',x,y,sx:x,sy:y,tx:land.x,ty:land.y,flight:1.15,flightAge:0,arcHeight:125,flying:true,vx:0,vy:0,life:8,angle:Math.random()*6.28,trailClock:0});showToast('🐨🐌 ¡CUIDADO CON LA BABA!');}
function updateKoala(k,dt){k.koalaClock-=dt;if(k.koalaClock<=0){k.koalaClock=6;const r=Math.random();if(r<.15)spawnMouse(k.x,k.y);else if(r<.30)spawnSnail(k.x,k.y);else if(r<.45){spawnBees(k.x,k.y,'koala');showToast('🐨🐝 ¡ABEJAS!');}}}
function updateExtraCreatures(dt){
  for(const c of state.extraCreatures){
    if(c.flying){c.flightAge+=dt;const t=Math.min(1,c.flightAge/Math.max(.01,c.flight));c.x=c.sx+(c.tx-c.sx)*t;c.y=c.sy+(c.ty-c.sy)*t-Math.sin(Math.PI*t)*(c.arcHeight||125);if(t>=1){c.flying=false;c.x=c.tx;c.y=c.ty;burst(c.x,c.y,7);}continue;}
    c.life-=dt;if(c.type==='snail'){c.trailClock-=dt;if(c.trailClock<=0){c.trailClock=.22;state.hazards.push({type:'slime',x:c.x,y:c.y,radius:62,life:2.2});}const nx=c.x+Math.cos(c.angle)*28*dt,ny=c.y+Math.sin(c.angle)*28*dt;if(pointIsWalkable(nx,ny)){c.x=nx;c.y=ny}else c.angle+=2.1;continue;}
    const jag=state.guardians.find(g=>g.type==='jaguar');const elephant=state.guardians.find(g=>g.type==='elephant');if(elephant&&distance(c,elephant)<170){angerElephant(elephant,'🐘🐁😱 ¡UN RATÓN!');const a=Math.atan2(elephant.y-c.y,elephant.x-c.x);elephant.angle=a;}
    if(jag&&distance(c,jag)<420){c.state='escape';const a=Math.atan2(c.y-jag.y,c.x-jag.x);c.vx=approach(c.vx,Math.cos(a)*390,1200*dt);c.vy=approach(c.vy,Math.sin(a)*390,1200*dt);jag.visible=true;if(jag.state==='hidden'){jag.state='roam';jag.roamClock=2.5;}moveGuardianNavigated(jag,c.x,c.y,235,dt,30);}else{c.turnClock-=dt;if(c.turnClock<=0){c.angle+=(Math.random()-.5)*2.8;c.turnClock=.25+Math.random()*.7;}c.vx=approach(c.vx,Math.cos(c.angle)*150,500*dt);c.vy=approach(c.vy,Math.sin(c.angle)*150,500*dt);}
    const banana=state.items.find(i=>i.active&&i.type==='banana'&&distance(c,i)<42);if(banana){banana.active=false;state.guardians.filter(g=>g.type==='gorilla').forEach(g=>{g.wildClock=CONFIG.gorillaWildSeconds;g.rage=g.wildClock;g.alertState='furious';});showToast('🐁🍌🦍 ¡EL RATÓN SE COMIÓ LA BANANA!');}
    const ox=c.x,oy=c.y;c.x+=c.vx*dt;c.y+=c.vy*dt;if(!pointIsWalkable(c.x,c.y)){c.x=ox;c.y=oy;c.vx*=-.7;c.vy*=-.7;}
  }
  state.extraCreatures=state.extraCreatures.filter(c=>c.life>0);
}

const _alpha156UpdateHazards=updateHazards;
updateHazards=function(dt){_alpha156UpdateHazards(dt);for(const h of state.hazards.filter(x=>x.type==='slime')){h.life-=dt;for(const p of allPlayers())if(distance(p,h)<h.radius){p.vx*=.76;p.vy*=.76;p.stun=Math.max(p.stun,.035);}for(const g of state.guardians)if(distance(g,h)<h.radius){g.vx=(g.vx||0)*.75;g.vy=(g.vy||0)*.75;}}state.hazards=state.hazards.filter(h=>h.life>0);};

const _alpha156UpdateGuardians=updateGuardians;
updateGuardians=function(dt){
  // El motor 15.5 interpreta cualquier tipo desconocido como gorila. La cabra
  // debe quedar fuera de esa pasada o su Map de cooldowns se convierte en NaN.
  const goats=state.guardians.filter(g=>g.type==='goat');
  if(goats.length) state.guardians=state.guardians.filter(g=>g.type!=='goat');
  try{ _alpha156UpdateGuardians(dt); }
  finally{ if(goats.length) state.guardians.push(...goats); }
  for(const goat of goats) updateGoat(goat,dt);
};
const _alpha156UpdateFauna=updateFauna;
updateFauna=function(dt){_alpha156UpdateFauna(dt);for(const k of state.fauna.filter(a=>a.type==='koala'))updateKoala(k,dt);};
const _alpha156Update=update;
update=function(dt){_alpha156Update(dt);updateMatchDirector(dt);updateExtraCreatures(dt);};

/* Pelotazos que enfurecen a la cabra. */
const _alpha156UpdateBalls=updateBalls;
updateBalls=function(dt){for(const b of state.balls){const goat=state.guardians.find(g=>g.type==='goat'&&distance(g,b)<52);if(goat){goatFury(goat);b.life=0;}}_alpha156UpdateBalls(dt);};

/* Dibujo adicional. */
const _alpha156DrawFauna=drawFauna;
drawFauna=function(){
  for(const a of state.fauna){if(a.type==='bear')continue;ctx.save();ctx.translate(a.x,a.y+Math.sin(a.bob||0)*3);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=a.throwPose>0?'54px serif':'48px serif';ctx.fillText(a.type==='koala'?'🐨':'❓',0,0);ctx.restore();}
  for(const bear of state.fauna.filter(a=>a.type==='bear')){ctx.save();ctx.translate(bear.x,bear.y+Math.sin(bear.bob)*3);ctx.globalAlpha=.18;ctx.fillStyle='#1d120d';ctx.beginPath();ctx.ellipse(0,20,22,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.rotate(bear.throwPose>0?-.22:0);ctx.font=bear.throwPose>0?'52px serif':'43px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🐻',0,bear.throwPose>0?-7:0);ctx.restore();}
};
const _alpha156DrawGuardians=drawGuardians;
drawGuardians=function(){
  // Evita que el dibujante antiguo pinte a la cabra como si fuera un gorila.
  const goats=state.guardians.filter(g=>g.type==='goat');
  if(goats.length) state.guardians=state.guardians.filter(g=>g.type!=='goat');
  try{ _alpha156DrawGuardians(); }
  finally{ if(goats.length) state.guardians.push(...goats); }
  for(const g of goats){ctx.save();ctx.translate(g.x,g.y);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='58px serif';ctx.fillText('🐏',0,0);if(g.state==='furious'){ctx.font='22px serif';ctx.fillText('💢',24,-40);}ctx.restore();}
};
const _alpha156DrawHazards=drawHazards;
drawHazards=function(){_alpha156DrawHazards();for(const h of state.hazards.filter(x=>x.type==='slime')){ctx.save();ctx.globalAlpha=.28;ctx.fillStyle='#d7ef9b';ctx.beginPath();ctx.ellipse(h.x,h.y,h.radius,h.radius*.38,0,0,Math.PI*2);ctx.fill();ctx.restore();}};
const _alpha156Draw=draw;
draw=function(){_alpha156Draw();for(const c of state.extraCreatures||[]){ctx.save();ctx.translate(c.x,c.y);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=c.type==='mouse'?'35px serif':'40px serif';ctx.fillText(c.type==='mouse'?'🐁':'🐌',0,0);ctx.restore();}};




// Alpha 17.0 · diagnóstico rápido desde la consola.
window.rdcAlpha17=function(){
  const report={level:state.level,tribes:state.rival3Flag?4:3,players:allPlayers().length,teams:[state.humanTeam,state.rivalTeam,state.rival2Team,...(state.rival3Flag?[state.rival3Team]:[])],scores:[state.score,state.rivalScore,state.rival2Score,...(state.rival3Flag?[state.rival3Score]:[])]};
  console.table(report);return report;
};
bindMenus();

/* ========================================================================== */
/* ALPHA 15.9.1 DEBUG · diagnóstico de congelamientos                           */
/* F3: mostrar/ocultar panel · F4: copiar informe · F8: pausa de emergencia   */
/* ========================================================================== */
(function installAlpha159Debug(){
  'use strict';
  const D={
    visible:true, started:performance.now(), frames:0, fps:0, frameMs:0, maxFrameMs:0,
    lastReport:0, lastUi:0, currentPhase:'inicio', previousPhase:'inicio',
    warnings:[], profiles:Object.create(null), errors:[], freezes:0, lastCounts:'',
    pausedByWatchdog:false
  };
  window.RDC_DEBUG=D;

  const panel=document.createElement('pre');
  panel.id='rdcDebugPanel';
  panel.setAttribute('aria-live','polite');
  Object.assign(panel.style,{
    position:'fixed',right:'8px',top:'8px',zIndex:'99999',margin:'0',padding:'10px 12px',
    maxWidth:'46vw',maxHeight:'86vh',overflow:'auto',pointerEvents:'none',whiteSpace:'pre-wrap',
    color:'#d8ffd8',background:'rgba(0,18,7,.88)',border:'2px solid rgba(150,255,170,.8)',
    borderRadius:'10px',font:'12px/1.25 Consolas,monospace',boxShadow:'0 6px 24px rgba(0,0,0,.45)'
  });
  panel.textContent='DEBUG iniciando…';
  document.body.appendChild(panel);

  function warn(msg){
    const line=`${new Date().toLocaleTimeString()} · ${msg}`;
    D.warnings.push(line); if(D.warnings.length>8)D.warnings.shift();
    console.warn('[RDC DEBUG]',msg);
  }
  function counts(){
    const safe=(name)=>Array.isArray(state?.[name])?state[name].length:0;
    return {
      jugadores:typeof allPlayers==='function'?allPlayers().length:0,
      guardianes:safe('guardians'),items:safe('items'),pelotas:safe('balls'),
      peligros:safe('hazards'),abejas:safe('bees'),bombas:safe('bombs'),
      nubes:safe('clouds'),huevos:safe('eggs'),pollitos:safe('chicks'),
      peces:safe('fishProjectiles'),extras:safe('extraCreatures'),particulas:safe('particles'),
      fauna:safe('fauna')
    };
  }
  const LIMITS={particles:900,hazards:220,items:220,balls:120,bees:100,bombs:40,clouds:10,eggs:60,chicks:100,fishProjectiles:80,extraCreatures:60};
  function applyCaps(){
    for(const [key,max] of Object.entries(LIMITS)){
      const arr=state?.[key];
      if(!Array.isArray(arr)||arr.length<=max)continue;
      const removed=arr.length-max;
      arr.splice(0,removed);
      warn(`LÍMITE DE SEGURIDAD: ${key} tenía ${arr.length+removed}; se retiraron ${removed}.`);
    }
  }
  function topProfiles(){
    return Object.entries(D.profiles).sort((a,b)=>b[1].max-a[1].max).slice(0,7)
      .map(([n,v])=>`${n.padEnd(22)} ${v.last.toFixed(1).padStart(6)} ms  máx ${v.max.toFixed(1).padStart(6)}`).join('\n');
  }
  function render(){
    if(!D.visible){panel.style.display='none';return;}
    panel.style.display='block';
    const c=counts(); D.lastCounts=JSON.stringify(c);
    const maxScore=Math.max(state?.score||0,state?.rivalScore||0,state?.rival2Score||0,state?.rival3Score||0);
    panel.textContent=
`REY DE LA COLINA · ALPHA 15.9.2 DEBUG
F3 panel · F4 copiar informe · F8 pausa

FPS ${String(D.fps).padStart(3)} · frame ${D.frameMs.toFixed(1)} ms · máximo ${D.maxFrameMs.toFixed(1)} ms
Fase actual: ${D.currentPhase}
Nivel ${state?.level??'-'} · puntos máximos ${maxScore} · estación ${state?.season??'-'}

ENTIDADES
${Object.entries(c).map(([k,v])=>`${k.padEnd(12)} ${String(v).padStart(4)}`).join('\n')}

FUNCIONES MÁS LENTAS
${topProfiles()||'sin datos todavía'}

AVISOS
${D.warnings.slice(-5).join('\n')||'ninguno'}

ERRORES
${D.errors.slice(-3).join('\n')||'ninguno'}`;
  }
  function phase(name){D.previousPhase=D.currentPhase;D.currentPhase=name;}
  function wrap(name){
    const original=window[name];
    if(typeof original!=='function'||original.__rdcDebugWrapped)return;
    function wrapped(...args){
      phase(name); const start=performance.now();
      try{return original.apply(this,args);}
      catch(err){
        const text=`${name}: ${err?.stack||err}`;D.errors.push(text);if(D.errors.length>6)D.errors.shift();
        console.error('[RDC DEBUG]',text);render();throw err;
      }finally{
        const ms=performance.now()-start;
        const p=D.profiles[name]||(D.profiles[name]={last:0,max:0,total:0,calls:0});
        p.last=ms;p.max=Math.max(p.max,ms);p.total+=ms;p.calls++;
        if(ms>120)warn(`${name} tardó ${ms.toFixed(1)} ms.`);
      }
    }
    wrapped.__rdcDebugWrapped=true;wrapped.__original=original;window[name]=wrapped;
  }

  // Sistemas principales: el panel permite descubrir cuál fue el último en entrar.
  [
    'updatePlayer','resolvePlayerCollisions','updateItems','updateHazards','updateBees',
    'updateBalls','updateGuardians','updateAlly','updateDistractions','updateAllyPhysics',
    'updateFauna','updateBearThrows','updateBombs','updateFishProjectiles','updateClouds',
    'updateEggsAndChicks','updateScoring','updateExtraCreatures','updateMatchDirector',
    'draw'
  ].forEach(wrap);

  const originalUpdate=window.update;
  if(typeof originalUpdate==='function'){
    window.update=function alpha159DebugUpdate(dt){
      const start=performance.now();phase('update completo');
      try{originalUpdate(dt);applyCaps();}
      catch(err){
        const text=`UPDATE: ${err?.stack||err}`;D.errors.push(text);console.error('[RDC DEBUG]',text);
        state.paused=true;D.pausedByWatchdog=true;render();
        if(typeof showToast==='function')showToast('🛠️ DEBUG: se pausó por un error. Presioná F4.');
        return;
      }finally{
        D.frameMs=performance.now()-start;D.maxFrameMs=Math.max(D.maxFrameMs,D.frameMs);D.frames++;
        if(D.frameMs>500){D.freezes++;warn(`FRAME CRÍTICO ${D.frameMs.toFixed(0)} ms · fase ${D.currentPhase}`);}
        const now=performance.now();
        if(now-D.lastUi>500){D.fps=Math.round(D.frames*1000/Math.max(1,now-D.lastReport));D.frames=0;D.lastReport=now;D.lastUi=now;render();}
      }
    };
  }

  function report(){
    const c=counts();
    return [
      'REY DE LA COLINA · INFORME DEBUG ALPHA 15.9',
      `fecha=${new Date().toISOString()}`,
      `nivel=${state?.level} season=${state?.season}`,
      `scores=${state?.score}/${state?.rivalScore}/${state?.rival2Score}/${state?.rival3Score}`,
      `fps=${D.fps} frameMs=${D.frameMs.toFixed(1)} maxFrameMs=${D.maxFrameMs.toFixed(1)}`,
      `fase=${D.currentPhase} faseAnterior=${D.previousPhase}`,
      `entidades=${JSON.stringify(c)}`,
      `avisos=${JSON.stringify(D.warnings)}`,
      `errores=${JSON.stringify(D.errors)}`,
      'perfiles:',topProfiles()
    ].join('\n');
  }
  async function copyReport(){
    const text=report();console.log(text);
    try{await navigator.clipboard.writeText(text);if(typeof showToast==='function')showToast('📋 Informe DEBUG copiado.');}
    catch(_){prompt('Copiá este informe:',text);}
  }
  window.rdcDebugReport=report;
  window.addEventListener('keydown',(e)=>{
    if(e.code==='F3'){e.preventDefault();D.visible=!D.visible;render();}
    else if(e.code==='F4'){e.preventDefault();copyReport();}
    else if(e.code==='F8'){e.preventDefault();state.paused=!state.paused;D.pausedByWatchdog=state.paused;if(!state.paused){state.lastTime=performance.now();requestAnimationFrame(loop);}render();}
  });
  window.addEventListener('error',(e)=>{D.errors.push(`${e.message} @ ${e.filename}:${e.lineno}`);render();});
  window.addEventListener('unhandledrejection',(e)=>{D.errors.push(`Promise: ${e.reason}`);render();});
  D.lastReport=performance.now();render();
})();


/* ========================================================================== 
   REY DE LA COLINA · ALPHA 16 · DIRECTOR DE PROGRESIÓN
   Estacionaria = objetos/eventos por estación
   Dual         = segunda mitad habilita amenazas simultáneas
   Trinomio     = cantidad de habitantes especiales del bosque
   IMPORTANTE: no modifica velocidades, daño ni frecuencias internas.
   ========================================================================== */

function progressionForLevel(level=state.level){
  const safeLevel=Math.max(1,Math.min(12,Number(level)||1));
  const seasonIndex=Math.ceil(safeLevel/3);      // 1..4
  const dualHalf=safeLevel<=6?1:2;               // 1..2
  const trinomial=Math.ceil(safeLevel/4);        // 1..3
  return {
    level:safeLevel,
    seasonIndex,
    dualHalf,
    trinomial,
    expectedChaos:trinomial/3,
    maxBears:trinomial>=3?2:1,
    allowKoala:trinomial>=2,
    allowGoat:dualHalf===2,
    allowJaguar:dualHalf===2,
    allowBearSpecial:safeLevel>=3,
    allowBearFish:safeLevel>=4,
    allowBomb:safeLevel>=10
  };
}

// Orden definitivo: primavera, verano, otoño e invierno.
seasonForLevel=function(level){
  if(level<=3)return 'spring';
  if(level<=6)return 'summer';
  if(level<=9)return 'autumn';
  return 'winter';
};

// Reparte los guardianes sin alterar su IA ni sus números internos.
guardianSetForLevel=function(level){
  const penguin=makePenguin('penguin-1',1040,540);
  let list=level===1
    ?[penguin,makeSloth('sloth-1',510,620)]
    :level===2
      ?[penguin,makeGorilla('g1',1665,320,0),makeGorilla('g2',335,820,Math.PI),makeSloth('sloth-1',1010,860)]
      :[penguin,makeGorilla('g1',1665,320,0),makeGorilla('g2',335,820,Math.PI),makeAnt('ant-1',220,560)];

  if(state.season==='autumn')list.push(makeMonkeyGuardian('monkey-guardian',760,250));
  if(state.season==='winter')list.push(makeCrocodileGuardian('croc-1',1000,760));

  const progression=progressionForLevel(level);
  if(progression.allowJaguar)list.push(makeJaguar('jaguar-1'));
  return list;
};

function resetAlpha16Director(){
  const progression=progressionForLevel();
  state.progression=progression;
  state.secondBearCheckClock=10;
  state.secondBearResolved=progression.maxBears>=2;
  state.levelSecondBearDelay=null;
  state.extraCreatures=[];

  // El trinomio gobierna la población especial del bosque.
  state.fauna=state.fauna.filter(a=>a.type!=='bear'&&a.type!=='koala');
  state.fauna.push(makeBear());
  if(progression.allowKoala)state.fauna.push(makeKoala());
  if(progression.maxBears>=2)state.fauna.push(makeBear(1835,930,2));

  // La dificultad dual introduce la cabra recién en la segunda mitad.
  state.guardians=state.guardians.filter(g=>g.type!=='goat');
  if(progression.allowGoat){
    const goat=makeGoat();
    const spawn=randomLandingPoint();
    goat.x=goat.spawnX=spawn.x;goat.y=goat.spawnY=spawn.y;
    goat.angle=Math.atan2(CONFIG.cy-goat.y,CONFIG.cx-goat.x)+(Math.random()-.5)*.8;
    state.guardians.push(goat);
  }
}

const _alpha16ResetWorld=resetWorld;
resetWorld=function(){
  _alpha16ResetWorld();
  resetAlpha16Director();
  const p=state.progression;
  showToast(`🌳 PROGRESIÓN · ESTACIÓN ${p.seasonIndex}/4 · DUAL ${p.dualHalf}/2 · TRINOMIO ${p.trinomial}/3`);
};

// En Alpha 16 la segunda osa depende únicamente del tercer trinomio.
updateMatchDirector=function(dt){};

// Conserva los mismos relojes: solo habilita gradualmente categorías de caos.
updateBearIndependent=function(bear,dt){
  const progression=state.progression||progressionForLevel();
  bear.throwPose=Math.max(0,bear.throwPose-dt);
  bear.itemClock-=dt;bear.specialClock-=dt;bear.fishClock-=dt;

  if(bear.itemClock<=0){
    bear.itemClock=6;
    bearThrowItem(bear,bearNormalType(),randomLandingPoint());
  }

  if(bear.specialClock<=0){
    bear.specialClock=10;
    if(progression.allowBearSpecial){
      let type=specialBearRoll();
      if(type==='bomb'&&!progression.allowBomb)type=null;
      if(type)bearThrowItem(bear,type,randomLandingPoint());
    }
  }

  if(bear.fishClock<=0){
    bear.fishClock=15;
    if(progression.allowBearFish&&Math.random()<.75){
      bearThrowItem(bear,bearFishType(),randomLandingPoint());
    }
  }

  if(progression.allowBomb&&highestTeamScore()>=15){
    bear.bombClock-=dt;
    if(bear.bombClock<=0){
      bear.bombClock=5;
      if(Math.random()<.25)bearThrowItem(bear,'bomb',randomLandingPoint());
    }
  }
};
updateBearThrows=function(dt){for(const bear of state.fauna.filter(a=>a.type==='bear'))updateBearIndependent(bear,dt);};

// Datos visibles en consola para comprobar rápidamente cada nivel.
window.rdcProgression=function(level=state.level){
  const p=progressionForLevel(level);
  return {
    nivel:p.level,
    estacion:seasonName(seasonForLevel(p.level)),
    estacionaria:`${p.seasonIndex}/4`,
    dual:`${p.dualHalf}/2`,
    trinomio:`${p.trinomial}/3`,
    caosEsperado:`${Math.round(p.expectedChaos*100)}%`,
    osas:p.maxBears,
    koala:p.allowKoala,
    cabra:p.allowGoat,
    jaguar:p.allowJaguar,
    especialesOsa:p.allowBearSpecial,
    pecesOsa:p.allowBearFish,
    bombas:p.allowBomb
  };
};

/* ========================================================================== */
/* REY DE LA COLINA · ALPHA 17.1 · MENÚ DE TRIBU + TALLER DE BANDERAS       */
/* Bloque de presentación integrado por JavaScript, sin exigir cambios HTML. */
/* ========================================================================== */

(function installAlpha171TribeWorkshop(){
  if(window.__rdcAlpha171Installed)return;
  window.__rdcAlpha171Installed=true;

  const FLAG_SHAPES=Object.freeze({
    triangle:{name:'Punta',icon:'🔺'},
    swallow:{name:'Cola de golondrina',icon:'✂️'},
    square:{name:'Recta',icon:'🟦'},
    round:{name:'Redondeada',icon:'🌙'}
  });
  const FLAG_POLES=Object.freeze({
    wood:{name:'Madera',color:'#5b351f',cap:'🟤'},
    bamboo:{name:'Bambú',color:'#9a7b32',cap:'🟡'},
    silver:{name:'Plateado',color:'#b8c3cf',cap:'⚪'},
    dark:{name:'Ébano',color:'#27221f',cap:'⚫'}
  });
  const FLAG_EMBLEMS=Object.freeze(['🌳','👑','🍌','⭐','🌙','☀️','🍃','🐾','⚡','❤️','🔥','💎']);
  const TRIBE_FIRST=Object.freeze(['Guardianes','Exploradores','Reyes','Amigos','Valientes','Saltadores','Defensores','Viajeros','Soñadores','Aventureros']);
  const TRIBE_SECOND=Object.freeze(['del Gran Árbol','de la Copa Verde','de las Bananas','del Bosque Alto','de la Colina','de las Hojas','del Tronco Dorado','de la Luna','del Sol','de las Raíces']);
  const colorKeys=Object.keys(TEAM_COLORS);

  function pick(list){return list[Math.floor(Math.random()*list.length)];}
  function cleanName(value){
    return String(value||'').replace(/[<>]/g,'').trim().slice(0,28) || 'Guardianes del Gran Árbol';
  }
  function randomTribeName(){return `${pick(TRIBE_FIRST)} ${pick(TRIBE_SECOND)}`;}
  function defaultCustomization(){
    return {name:'Guardianes del Gran Árbol',shape:'triangle',pole:'wood',emblem:'🌳'};
  }
  function randomCustomization(forbiddenEmblems=[]){
    const available=FLAG_EMBLEMS.filter(e=>!forbiddenEmblems.includes(e));
    return {
      name:randomTribeName(),
      shape:pick(Object.keys(FLAG_SHAPES)),
      pole:pick(Object.keys(FLAG_POLES)),
      emblem:pick(available.length?available:FLAG_EMBLEMS)
    };
  }

  state.tribeCustomization=Object.assign(defaultCustomization(),state.tribeCustomization||{});
  state.teamProfiles=state.teamProfiles||{};

  const style=document.createElement('style');
  style.id='alpha171TribeWorkshopStyle';
  style.textContent=`
    #tribeWorkshopOverlay{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px;background:radial-gradient(circle at 50% 15%,rgba(91,143,75,.96),rgba(26,44,30,.98) 68%);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;overflow:auto}
    #tribeWorkshopOverlay.is-open{display:flex}
    .tw-card{width:min(980px,96vw);border:5px solid #4b2d1b;border-radius:28px;background:linear-gradient(180deg,#fff3c7,#e8c77d);box-shadow:0 18px 60px rgba(0,0,0,.45),inset 0 0 0 4px rgba(255,255,255,.35);color:#342416;overflow:hidden}
    .tw-header{padding:18px 24px 14px;text-align:center;background:linear-gradient(#7f4a27,#54301d);color:#fff8d7;border-bottom:4px solid #3c2114}
    .tw-header h2{margin:0;font-size:clamp(1.5rem,4vw,2.4rem);letter-spacing:.04em;text-shadow:0 3px 0 rgba(0,0,0,.25)}
    .tw-header p{margin:6px 0 0;font-weight:700;opacity:.92}
    .tw-body{display:grid;grid-template-columns:minmax(250px,.85fr) minmax(340px,1.35fr);gap:20px;padding:20px}
    .tw-preview-panel,.tw-controls{border:3px solid #81502d;border-radius:20px;background:rgba(255,255,255,.54);box-shadow:inset 0 0 0 3px rgba(255,255,255,.35)}
    .tw-preview-panel{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:380px;padding:18px;text-align:center}
    #twFlagCanvas{width:min(100%,300px);height:auto;image-rendering:auto;filter:drop-shadow(0 10px 7px rgba(0,0,0,.25))}
    #twPreviewName{margin:12px 0 2px;font-size:clamp(1.2rem,3vw,1.75rem);line-height:1.1;color:#3e2817}
    #twPreviewTeam{font-weight:900;color:#79502e;text-transform:uppercase;letter-spacing:.08em}
    .tw-controls{padding:16px;display:grid;gap:13px;align-content:start}
    .tw-field{display:grid;gap:7px}.tw-field label{font-weight:900;color:#4a2d1b}.tw-field input{width:100%;box-sizing:border-box;border:3px solid #88562f;border-radius:13px;padding:11px 13px;font:700 1rem system-ui;background:#fffdf4;color:#342416;outline:none}.tw-field input:focus{border-color:#2d753d;box-shadow:0 0 0 3px rgba(45,117,61,.18)}
    .tw-options{display:flex;flex-wrap:wrap;gap:8px}.tw-option{border:3px solid #7d5333;border-radius:13px;background:#fff8dd;color:#3c291a;min-width:48px;min-height:45px;padding:7px 10px;font:800 .88rem system-ui;cursor:pointer;box-shadow:0 3px 0 #5a351f}.tw-option:hover{transform:translateY(-1px)}.tw-option.is-selected{background:#377d45;color:#fff;border-color:#20582d;box-shadow:0 3px 0 #143b1e}
    .tw-option.tw-emblem{font-size:1.45rem;padding:4px 9px}.tw-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:0 20px 20px}.tw-actions button{border:3px solid #4d2b18;border-radius:15px;padding:11px 18px;font:900 1rem system-ui;cursor:pointer;box-shadow:0 4px 0 #3d2214}.tw-primary{background:#2f8b45;color:#fff}.tw-random{background:#f4c942;color:#38270f}.tw-back{background:#fff5d5;color:#38270f}
    .tw-step{font-size:.78rem;font-weight:900;letter-spacing:.12em;opacity:.8;text-transform:uppercase}
    @media(max-width:760px){#tribeWorkshopOverlay{padding:8px}.tw-card{border-width:3px;border-radius:18px}.tw-body{grid-template-columns:1fr;padding:12px;gap:12px}.tw-preview-panel{min-height:225px;padding:10px}#twFlagCanvas{width:210px}.tw-controls{padding:12px}.tw-actions{padding:0 12px 14px}.tw-actions button{flex:1;min-width:130px}.tw-header{padding:12px}.tw-option{min-height:40px}}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.id='tribeWorkshopOverlay';
  overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML=`
    <section class="tw-card" role="dialog" aria-modal="true" aria-labelledby="twTitle">
      <header class="tw-header"><div class="tw-step">PASO FINAL · TU TRIBU</div><h2 id="twTitle">🪵 Taller de Banderas</h2><p>Armá la identidad de tu equipo antes de subir a la colina.</p></header>
      <div class="tw-body">
        <div class="tw-preview-panel"><canvas id="twFlagCanvas" width="360" height="280"></canvas><h3 id="twPreviewName"></h3><div id="twPreviewTeam"></div></div>
        <div class="tw-controls">
          <div class="tw-field"><label for="twTribeName">Nombre de la tribu</label><input id="twTribeName" maxlength="28" autocomplete="off" placeholder="Guardianes del Gran Árbol"></div>
          <div class="tw-field"><label>Forma de la bandera</label><div class="tw-options" id="twShapeOptions"></div></div>
          <div class="tw-field"><label>Emblema</label><div class="tw-options" id="twEmblemOptions"></div></div>
          <div class="tw-field"><label>Mástil</label><div class="tw-options" id="twPoleOptions"></div></div>
        </div>
      </div>
      <div class="tw-actions"><button type="button" class="tw-back" id="twBack">← Volver</button><button type="button" class="tw-random" id="twRandom">🎲 Todo al azar</button><button type="button" class="tw-primary" id="twContinue">Confirmar tribu →</button></div>
    </section>`;
  document.body.appendChild(overlay);

  const nameInput=overlay.querySelector('#twTribeName');
  const previewName=overlay.querySelector('#twPreviewName');
  const previewTeam=overlay.querySelector('#twPreviewTeam');
  const flagCanvas=overlay.querySelector('#twFlagCanvas');
  const fctx=flagCanvas.getContext('2d');
  const shapesBox=overlay.querySelector('#twShapeOptions');
  const emblemsBox=overlay.querySelector('#twEmblemOptions');
  const polesBox=overlay.querySelector('#twPoleOptions');

  Object.entries(FLAG_SHAPES).forEach(([key,data])=>{
    const b=document.createElement('button');b.type='button';b.className='tw-option';b.dataset.shape=key;b.textContent=`${data.icon} ${data.name}`;shapesBox.appendChild(b);
  });
  FLAG_EMBLEMS.forEach(emblem=>{
    const b=document.createElement('button');b.type='button';b.className='tw-option tw-emblem';b.dataset.emblem=emblem;b.textContent=emblem;emblemsBox.appendChild(b);
  });
  Object.entries(FLAG_POLES).forEach(([key,data])=>{
    const b=document.createElement('button');b.type='button';b.className='tw-option';b.dataset.pole=key;b.textContent=`${data.cap} ${data.name}`;polesBox.appendChild(b);
  });

  function selectedColor(){return TEAM_COLORS[state.selectedColor]||TEAM_COLORS.red;}
  function setChoice(kind,value){
    state.tribeCustomization[kind]=value;
    overlay.querySelectorAll(`[data-${kind}]`).forEach(b=>b.classList.toggle('is-selected',b.dataset[kind]===value));
    refreshPreview();
  }
  function drawPreviewFlag(){
    const cfg=state.tribeCustomization,c=selectedColor();
    fctx.clearRect(0,0,flagCanvas.width,flagCanvas.height);
    fctx.save();fctx.translate(62,24);
    fctx.lineCap='round';fctx.strokeStyle=FLAG_POLES[cfg.pole]?.color||'#5b351f';fctx.lineWidth=15;fctx.beginPath();fctx.moveTo(0,224);fctx.lineTo(0,18);fctx.stroke();
    fctx.fillStyle='#d6b06b';fctx.beginPath();fctx.ellipse(0,229,38,12,0,0,Math.PI*2);fctx.fill();
    fctx.fillStyle=c.hex;fctx.strokeStyle='rgba(45,26,14,.72)';fctx.lineWidth=6;fctx.beginPath();
    const shape=cfg.shape;
    if(shape==='square'){fctx.moveTo(5,25);fctx.lineTo(245,25);fctx.lineTo(245,145);fctx.lineTo(5,145);}
    else if(shape==='swallow'){fctx.moveTo(5,25);fctx.lineTo(245,25);fctx.lineTo(202,85);fctx.lineTo(245,145);fctx.lineTo(5,145);}
    else if(shape==='round'){fctx.moveTo(5,25);fctx.lineTo(205,25);fctx.quadraticCurveTo(285,85,205,145);fctx.lineTo(5,145);}
    else {fctx.moveTo(5,25);fctx.lineTo(250,85);fctx.lineTo(5,145);}
    fctx.closePath();fctx.fill();fctx.stroke();
    fctx.textAlign='center';fctx.textBaseline='middle';fctx.font='70px serif';
    const ex=shape==='triangle'?105:125;fctx.fillText(cfg.emblem,ex,85);
    fctx.restore();
  }
  function refreshPreview(){
    state.tribeCustomization.name=cleanName(nameInput.value||state.tribeCustomization.name);
    previewName.textContent=state.tribeCustomization.name;
    previewTeam.textContent=`${selectedColor().emoji} EQUIPO ${selectedColor().name}`;
    drawPreviewFlag();
  }
  function syncControls(){
    nameInput.value=state.tribeCustomization.name;
    ['shape','emblem','pole'].forEach(kind=>overlay.querySelectorAll(`[data-${kind}]`).forEach(b=>b.classList.toggle('is-selected',b.dataset[kind]===state.tribeCustomization[kind])));
    refreshPreview();
  }
  function openWorkshop(){overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');syncControls();setTimeout(()=>nameInput.focus(),80);}
  function closeWorkshop(){overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');}

  nameInput.addEventListener('input',refreshPreview);
  shapesBox.addEventListener('click',e=>{const b=e.target.closest('[data-shape]');if(b)setChoice('shape',b.dataset.shape);});
  emblemsBox.addEventListener('click',e=>{const b=e.target.closest('[data-emblem]');if(b)setChoice('emblem',b.dataset.emblem);});
  polesBox.addEventListener('click',e=>{const b=e.target.closest('[data-pole]');if(b)setChoice('pole',b.dataset.pole);});
  overlay.querySelector('#twRandom').addEventListener('click',()=>{state.tribeCustomization=randomCustomization();syncControls();});
  overlay.querySelector('#twBack').addEventListener('click',()=>{closeWorkshop();showScreen('ally');});
  overlay.querySelector('#twContinue').addEventListener('click',()=>{
    state.tribeCustomization.name=cleanName(nameInput.value);
    closeWorkshop();
    ui.teamSummary.innerHTML=teamMarkup();
    ui.readyLevelLabel.textContent=`NIVEL ${state.level} · ${seasonName(seasonForLevel(state.level))}`;
    showScreen('ready');
  });

  // Intercepta la selección del AniBot para insertar el Taller antes del resumen.
  $$('[data-ally]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();
    state.selectedAlly=button.dataset.ally;
    openWorkshop();
  },true));

  // Conserva el flujo existente, pero el resumen ahora muestra identidad completa.
  const originalTeamMarkup=teamMarkup;
  teamMarkup=function(){
    const base=originalTeamMarkup();
    const cfg=state.tribeCustomization||defaultCustomization();
    return `${base}<div class="summary-chip"><span>${cfg.emblem}</span><strong>${cleanName(cfg.name)}</strong> · ${FLAG_SHAPES[cfg.shape]?.name||'Punta'}</div>`;
  };

  function makeTeamProfiles(){
    const activeTeams=[state.humanTeam,state.rivalTeam,state.rival2Team,state.rival3Flag?state.rival3Team:null].filter(Boolean);
    const usedEmblems=[];
    state.teamProfiles={};
    activeTeams.forEach((team,index)=>{
      if(index===0){
        const cfg=Object.assign(defaultCustomization(),state.tribeCustomization||{});
        cfg.name=cleanName(cfg.name);cfg.color=team;state.teamProfiles[team]=cfg;usedEmblems.push(cfg.emblem);
      }else{
        const cfg=randomCustomization(usedEmblems);cfg.color=team;state.teamProfiles[team]=cfg;usedEmblems.push(cfg.emblem);
      }
    });
    for(const flag of Object.values(state.flags))if(flag)flag.profile=state.teamProfiles[flag.team];
  }

  const originalResetWorld171=resetWorld;
  resetWorld=function(){
    originalResetWorld171();
    makeTeamProfiles();
    const rivals=[state.rivalTeam,state.rival2Team,state.rival3Flag?state.rival3Team:null].filter(Boolean).map(t=>`${state.teamProfiles[t].emblem} ${state.teamProfiles[t].name}`);
    showToast(`🚩 ${state.teamProfiles[state.humanTeam].name}`);
    if(rivals.length)showToast(`RIVALES: ${rivals.join(' · ')}`);
  };

  function flagPath(context,shape){
    context.beginPath();
    if(shape==='square'){context.moveTo(-8,-30);context.lineTo(38,-30);context.lineTo(38,4);context.lineTo(-8,4);}
    else if(shape==='swallow'){context.moveTo(-8,-30);context.lineTo(40,-30);context.lineTo(29,-13);context.lineTo(40,4);context.lineTo(-8,4);}
    else if(shape==='round'){context.moveTo(-8,-30);context.lineTo(30,-30);context.quadraticCurveTo(51,-13,30,4);context.lineTo(-8,4);}
    else {context.moveTo(-8,-30);context.lineTo(39,-13);context.lineTo(-8,4);}
    context.closePath();
  }

  drawFlag=function(flag){
    if(!flag)return;
    const profile=flag.profile||state.teamProfiles?.[flag.team]||{shape:'triangle',pole:'wood',emblem:'⭐'};
    const y=flag.y+Math.sin(flag.bob)*3;
    ctx.save();ctx.translate(flag.x,flag.carrier?y:y-8);
    ctx.strokeStyle=FLAG_POLES[profile.pole]?.color||'#3a2619';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-12,23);ctx.lineTo(-12,-31);ctx.stroke();
    ctx.fillStyle=TEAM_COLORS[flag.team]?.hex||'#ef3f4c';ctx.strokeStyle='rgba(48,29,18,.75)';ctx.lineWidth=2.5;flagPath(ctx,profile.shape);ctx.fill();ctx.stroke();
    ctx.font='18px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(profile.emblem||'⭐',profile.shape==='triangle'?7:14,-13);
    ctx.restore();
  };

  // Victoria con nombre real de tribu.
  const originalFinishMatch=typeof finishMatch==='function'?finishMatch:null;
  if(originalFinishMatch){
    finishMatch=function(team){
      originalFinishMatch(team);
      const profile=state.teamProfiles?.[team];
      if(team!==state.humanTeam&&profile&&ui.victoryTeam){
        ui.victoryTeam.innerHTML=`<div class="summary-chip"><span>${profile.emblem}</span>GANÓ ${profile.name.toUpperCase()}</div>`;
      }
    };
  }

  // Ayudas de prueba.
  window.rdcAlpha171=function(){
    return {
      version:'Alpha 17.1',
      tribuJugador:Object.assign({},state.tribeCustomization),
      perfiles:Object.fromEntries(Object.entries(state.teamProfiles||{}).map(([team,p])=>[team,Object.assign({},p)])),
      tallerInstalado:!!document.getElementById('tribeWorkshopOverlay')
    };
  };
})();

/* ========================================================================== 
   REY DE LA COLINA · ALPHA 17.2 · TRANSICIONES Y SUITE ESTACIONAL
   - Cortina estacional antes de cada ronda.
   - Música generativa original con aire de jazz de Nueva Orleans.
   - Cada estación suma una capa instrumental.
   ========================================================================== */
(function installAlpha172Presentation(){
  'use strict';
  if(window.__rdcAlpha172Installed)return;
  window.__rdcAlpha172Installed=true;

  const SEASON_PRESENTATION=Object.freeze({
    spring:{name:'PRIMAVERA',emoji:'🌸',subtitle:'El árbol vuelve a despertar',tempo:126,layers:2,
      chords:[[60,64,67,71],[62,65,69,72],[57,60,64,67],[55,59,62,65]]},
    summer:{name:'VERANO',emoji:'☀️',subtitle:'La copa vibra bajo el sol',tempo:142,layers:3,
      chords:[[60,64,67,70],[65,69,72,75],[62,65,69,72],[67,71,74,77]]},
    autumn:{name:'OTOÑO',emoji:'🍂',subtitle:'Las hojas bailan con el viento',tempo:116,layers:4,
      chords:[[57,60,64,67],[62,65,69,72],[55,59,62,65],[60,64,67,71]]},
    winter:{name:'INVIERNO',emoji:'❄️',subtitle:'La colina resiste el frío',tempo:98,layers:5,
      chords:[[57,60,64,68],[53,57,60,64],[62,65,68,72],[55,59,62,65]]}
  });

  const overlay=document.getElementById('seasonTransition');
  const emojiEl=document.getElementById('seasonTransitionEmoji');
  const titleEl=document.getElementById('seasonTransitionTitle');
  const subtitleEl=document.getElementById('seasonTransitionSubtitle');
  const levelEl=document.getElementById('seasonTransitionLevel');
  const musicButton=document.getElementById('musicToggle');

  const music={ctx:null,master:null,timer:null,nextTime:0,step:0,season:null,enabled:true,lookAhead:.12};
  function audioContext(){
    if(!music.ctx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return null;
      music.ctx=new AC();
      music.master=music.ctx.createGain();
      music.master.gain.value=.16;
      music.master.connect(music.ctx.destination);
    }
    if(music.ctx.state==='suspended')music.ctx.resume().catch(()=>{});
    return music.ctx;
  }
  function tone(freq,start,duration,type='sine',volume=.08,detune=0){
    const ac=audioContext();if(!ac||!music.enabled)return;
    const osc=ac.createOscillator(),gain=ac.createGain();
    osc.type=type;osc.frequency.value=freq;osc.detune.value=detune;
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(music.master);osc.start(start);osc.stop(start+duration+.03);
  }
  function midi(n){return 440*Math.pow(2,(n-69)/12);}
  function noiseHit(start,duration=.045,volume=.035){
    const ac=audioContext();if(!ac||!music.enabled)return;
    const length=Math.max(1,Math.floor(ac.sampleRate*duration));
    const buffer=ac.createBuffer(1,length,ac.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const src=ac.createBufferSource(),gain=ac.createGain();src.buffer=buffer;gain.gain.value=volume;src.connect(gain);gain.connect(music.master);src.start(start);
  }
  function scheduleStep(season,step,time){
    const p=SEASON_PRESENTATION[season]||SEASON_PRESENTATION.spring;
    const chord=p.chords[Math.floor(step/8)%p.chords.length];
    const eighth=60/p.tempo/2;
    // Capa 1: contrabajo caminante.
    const bassPattern=[0,2,1,3,0,2,1,3];
    tone(midi(chord[bassPattern[step%8]]-24),time,eighth*.84,'triangle',.095);
    // Capa 2: banjo/piano sincopado.
    if(step%2===1) chord.slice(0,3).forEach((n,i)=>tone(midi(n+12),time,eighth*.52,'square',.024,-i*3));
    // Capa 3: batería suave desde verano.
    if(p.layers>=3){if(step%2===0)noiseHit(time,.035,.028);if(step%8===4)tone(78,time,.08,'sine',.045);}
    // Capa 4: clarinete desde otoño.
    if(p.layers>=4){const melody=[0,1,2,1,3,2,1,0][step%8];tone(midi(chord[melody]+24),time,eighth*.72,'sine',.052,step%2?7:-5);}
    // Capa 5: trompeta apagada en invierno.
    if(p.layers>=5&&step%4===0){tone(midi(chord[(step/4)%4]+19),time,eighth*1.5,'sawtooth',.025);}
  }
  function scheduler(){
    if(!music.ctx||!music.enabled||!music.season)return;
    const p=SEASON_PRESENTATION[music.season]||SEASON_PRESENTATION.spring;
    const stepDuration=60/p.tempo/2;
    while(music.nextTime<music.ctx.currentTime+music.lookAhead){
      scheduleStep(music.season,music.step,music.nextTime);
      music.step=(music.step+1)%32;music.nextTime+=stepDuration;
    }
  }
  function playSeasonMusic(season){
    music.season=season;music.step=0;
    const ac=audioContext();if(!ac)return;
    music.nextTime=ac.currentTime+.08;
    clearInterval(music.timer);music.timer=setInterval(scheduler,55);scheduler();
    refreshMusicButton();
  }
  function stopMusic(){clearInterval(music.timer);music.timer=null;music.season=null;}
  function refreshMusicButton(){if(musicButton){musicButton.textContent=music.enabled?'♫':'🔇';musicButton.setAttribute('aria-label',music.enabled?'Silenciar música':'Activar música');}}
  function toggleMusic(){
    music.enabled=!music.enabled;
    if(music.master&&music.ctx)music.master.gain.setTargetAtTime(music.enabled?.16:.0001,music.ctx.currentTime,.04);
    if(music.enabled&&state.running)playSeasonMusic(state.season);
    else if(!music.enabled)clearInterval(music.timer);
    refreshMusicButton();
  }
  musicButton?.addEventListener('click',toggleMusic);
  refreshMusicButton();

  function showSeasonCurtain(season,level){
    const p=SEASON_PRESENTATION[season]||SEASON_PRESENTATION.spring;
    if(!overlay)return Promise.resolve();
    overlay.dataset.season=season;
    emojiEl.textContent=p.emoji;titleEl.textContent=p.name;subtitleEl.textContent=p.subtitle;
    levelEl.textContent=`NIVEL ${level} · ${level>=7?'4 TRIBUS · 8 JUGADORES':'3 TRIBUS · 6 JUGADORES'}`;
    overlay.hidden=false;
    requestAnimationFrame(()=>overlay.classList.add('is-visible'));
    return new Promise(resolve=>{
      setTimeout(()=>overlay.classList.add('is-opening'),1850);
      setTimeout(()=>{overlay.classList.remove('is-visible','is-opening');overlay.hidden=true;resolve();},2700);
    });
  }

  // Sustituye el inicio inmediato por una presentación de 2,7 segundos.
  startLevel=function(){
    syncLevelSelector();
    state.running=false;
    resetWorld();
    ui.readyLevelLabel.textContent=`NIVEL ${state.level} · ${seasonName(state.season)}`;
    showScreen('game');
    playSeasonMusic(state.season);
    showSeasonCurtain(state.season,state.level).then(()=>{
      state.running=true;state.paused=false;ui.pause.textContent='Ⅱ';
      state.lastTime=performance.now();requestAnimationFrame(loop);
    });
  };

  // Mantiene la música coherente al abandonar la partida hacia los menús.
  ui.changeChoices?.addEventListener('click',()=>stopMusic());
  document.addEventListener('visibilitychange',()=>{
    if(!music.ctx)return;
    if(document.hidden)music.ctx.suspend().catch(()=>{});
    else if(music.enabled)music.ctx.resume().catch(()=>{});
  });

  window.rdcAlpha172=function(){
    return {version:'Versión Final · Gamepad secreto',season:state.season,musicEnabled:music.enabled,layers:(SEASON_PRESENTATION[state.season]||SEASON_PRESENTATION.spring).layers,transitionInstalled:!!overlay};
  };
})();

(function monitorSecretGamepadOutsideLoop(){
  let last=0;
  function tick(now){
    if(now-last>32){pollSecretGamepad();last=now;}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
