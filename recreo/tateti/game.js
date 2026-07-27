'use strict';

const boardEl=document.getElementById('board');
const statusEl=document.getElementById('status');
const turnLabel=document.getElementById('turnLabel');
const scoreLabel=document.getElementById('scoreLabel');
const modeBadge=document.getElementById('modeBadge');
const challengeInfo=document.getElementById('challengeInfo');
const jumpButton=document.getElementById('jumpButton');
const tournamentPanel=document.getElementById('tournamentPanel');
const opponentAvatar=document.getElementById('opponentAvatar');
const opponentName=document.getElementById('opponentName');
const opponentPhrase=document.getElementById('opponentPhrase');
const restartButton=document.getElementById('restartButton');
const changeModeButton=document.getElementById('changeModeButton');
const musicButton=document.getElementById('musicButton');
const challengeBackButton=document.getElementById('challengeBackButton');

const X='X',O='O';
const wins3=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

let board=Array(9).fill('');
let size=3;
let turn=X;
let gameMode='classic';
let playType='pvp';
let aiLevel='easy';
let roundOver=false;
let scores={X:0,O:0};
let selectedCharacter='nito';
let humanTeam=X;
let aiTeam=O;
let selectedCell=null;
let placementCounts={X:0,O:0};
let mobileMoveCount=0;
let moveCount=0;
let challengeIndex=0;
let challengeResults=[];
let duelScores={X:0,O:0};
let duelRoundResults=[];
let duelPlayers={
  X:{name:'Jugador 1',animalIndex:0,colorIndex:0},
  O:{name:'Jugador 2',animalIndex:1,colorIndex:1}
};
let challengeState=null;
let challengeEffect=null;
let bombSlideFx=[];
let aiTurnToken=0;
let nextStarter=X;
let tournamentScores={X:0,O:0},tournamentRound=0,tournamentModeIndex=0,tournamentSubMode='classic',tournamentSuddenDeath=false,tournamentPendingWinner=null;
let dragState=null,suppressNextClick=false;
let resultFeedback=null;
let mobileSlideFx=null;
let currentOpponent={emoji:'🦉',name:'Profesor Búho',phrase:'Piensa antes de mover.'};

let musicOn=true,audioCtx=null,musicTimer=null,musicStep=0;
const MASTER_VOLUME=3.2;

const forestOpponents=[
  {emoji:'🦉',name:'Profesor Búho',phrase:'Piensa antes de mover.'},{emoji:'🐢',name:'Tortuga Tito',phrase:'Nunca se apura.'},{emoji:'🦜',name:'Loro Lolo',phrase:'Siempre tiene algo para decir.'},{emoji:'🐘',name:'Elefante Bruno',phrase:'Recuerda cada jugada.'},{emoji:'🐿️',name:'Ardilla Rita',phrase:'Rápida y observadora.'},{emoji:'🐸',name:'Rana Lila',phrase:'Salta de idea en idea.'},{emoji:'🦊',name:'Zorro Tom',phrase:'Busca caminos inesperados.'},{emoji:'🦒',name:'Jirafa Gina',phrase:'Ve el tablero desde muy alto.'}
];

const duelAnimals=[
  {emoji:'🐒',name:'Mono'},
  {emoji:'🦜',name:'Loro'},
  {emoji:'🐢',name:'Tortuga'},
  {emoji:'🐘',name:'Elefante'},
  {emoji:'🐊',name:'Cocodrilo'},
  {emoji:'🦁',name:'León'},
  {emoji:'🦅',name:'Águila'},
  {emoji:'🦉',name:'Búho'},
  {emoji:'🐼',name:'Panda'},
  {emoji:'🦝',name:'Mapache'},
  {emoji:'🦥',name:'Perezoso'},
  {emoji:'🐯',name:'Tigre'},
  {emoji:'🦓',name:'Cebra'},
  {emoji:'🦛',name:'Hipopótamo'},
  {emoji:'🐨',name:'Koala'},
  {emoji:'🦦',name:'Nutria'}
];
const duelColors=[
  {name:'Rojo',value:'#d94b45'},
  {name:'Naranja',value:'#e8862d'},
  {name:'Amarillo',value:'#e6bd2e'},
  {name:'Verde',value:'#4b9a58'},
  {name:'Azul',value:'#3d7fc4'},
  {name:'Violeta',value:'#8554b5'},
  {name:'Rosa',value:'#d85f91'},
  {name:'Turquesa',value:'#32a7a2'},
  {name:'Marrón',value:'#8b5a3c'},
  {name:'Gris',value:'#7b8794'},
  {name:'Celeste',value:'#72bde8'},
  {name:'Lima',value:'#86c83f'},
  {name:'Bordó',value:'#8d3345'},
  {name:'Negro',value:'#252a30'},
  {name:'Blanco',value:'#f7f3e8',light:true},
  {name:'Dorado',value:'#d6a928'}
];
function isChallengeMode(){return gameMode==='challenge'||gameMode==='challengeDuel'}
function isChallengeDuel(){return gameMode==='challengeDuel'}
function duelPlayer(team){return duelPlayers[team]}
function duelAnimal(team){return duelAnimals[duelPlayer(team).animalIndex]}
function duelColor(team){return duelColors[duelPlayer(team).colorIndex]}
function safePlayerName(value,fallback){
  const cleaned=String(value||'').replace(/[<>]/g,'').trim().slice(0,14);
  return cleaned||fallback;
}

function activeMode(){return gameMode==='tournament'?tournamentSubMode:(isChallengeMode()?'challenge':gameMode)}

function applyVisualTheme(){
  document.body.classList.remove('theme-classic','theme-anti','theme-mobile','theme-challenge');
  const mode=isChallengeMode()?'challenge':activeMode();
  document.body.classList.add(`theme-${mode}`);
}

function modeAccent(){
  const mode=activeMode();

  // Colores pensados para diferenciar las fichas del tablero a primera vista.
  if(mode==='anti'){
    return {
      nitoRing:'#cf3e32',nitoDetail:'#ff7468',
      tinaRing:'#f3c62f',tinaDetail:'#ffe36d',
      stroke:'#7a2b24'
    };
  }

  if(mode==='mobile'){
    return {
      nitoRing:'#2f80d0',nitoDetail:'#72b7f3',
      tinaRing:'#d83e4f',tinaDetail:'#ff7b89',
      stroke:'#4b2b69'
    };
  }

  return {
    nitoRing:'#2f80d0',nitoDetail:'#79bdf2',
    tinaRing:'#f2c230',tinaDetail:'#ffe370',
    stroke:'#285735'
  };
}
function chooseForestOpponent(){currentOpponent=forestOpponents[Math.floor(Math.random()*forestOpponents.length)]}
function updateOpponentCard(){
  opponentCard.classList.remove('activeTurnCard');
  opponentCard.style.background='';
  opponentCard.style.borderColor='';

  if(isChallengeDuel()){
    const player=duelPlayer(turn);
    const animal=duelAnimal(turn);
    const color=duelColor(turn);

    opponentAvatar.textContent=animal.emoji;
    opponentAvatar.style.background=color.value;
    opponentAvatar.style.borderColor=color.light?'#65421f':'#fff2c4';
    opponentName.textContent=player.name;
    opponentPhrase.textContent='ES EL TURNO DE';
    opponentCard.style.background=`linear-gradient(135deg,${color.value}33,#fffdf2)`;
    opponentCard.style.borderColor=color.value;
    opponentCard.classList.add('activeTurnCard');
    return;
  }

  if(gameMode==='challenge'){
    const humanTurn=turn===humanTeam;
    opponentAvatar.textContent=humanTurn
      ?(selectedCharacter==='nito'?'🐒':'🎀')
      :currentOpponent.emoji;
    opponentAvatar.style.background=humanTurn?'#fff8df':'#f0f7ff';
    opponentAvatar.style.borderColor=humanTurn?'#d2b75a':'#7798c7';
    opponentName.textContent=teamName(turn);
    opponentPhrase.textContent=humanTurn?'ES TU TURNO':'ESTÁ PENSANDO...';
    opponentCard.classList.add('activeTurnCard');
    return;
  }

  opponentAvatar.style.background='';
  opponentAvatar.style.borderColor='';

  if(playType==='ai'){
    opponentAvatar.textContent=currentOpponent.emoji;
    opponentName.textContent=currentOpponent.name;
    opponentPhrase.textContent=currentOpponent.phrase;
  }else{
    opponentAvatar.textContent='🐒🎀';
    opponentName.textContent='Nito y Tina';
    opponentPhrase.textContent='Una partida entre amigos.';
  }
}

const challenges=[
  {
    name:'Rey del Árbol',
    icon:'👑',
    description:'Los casilleros dorados forman el reino. Cuando se llenan, comienza una cuenta de tres turnos y el territorio crece.',
    rules:{king:true}
  },
  {
    name:'Banana Traviesa',
    icon:'🍌',
    description:'Comienza con tres bananas. Cada ronda una cambia de lugar y cada dos rondas aparece otra.',
    rules:{banana:true}
  },
  {
    name:'Bombas del Bosque',
    icon:'💣',
    description:'Una bomba explota después de dos rondas y lanza las fichas como discos de hockey.',
    rules:{bomb:true}
  },
  {
    name:'Viento del Bosque',
    icon:'🌪️',
    description:'Un tornado cruza el tablero por una línea horizontal, vertical o diagonal y arrastra de tres a cuatro fichas a su paso.',
    rules:{wind:true}
  },
  {
    name:'Loro Bromista',
    icon:'🦜',
    description:'Desde la tercera ronda, el Loro Bromista interviene una vez por ronda y alterna a quién molesta: primero al jugador y después a la computadora.',
    rules:{parrot:true}
  },
  {
    name:'Corona y Banana',
    icon:'👑🍌',
    description:'El territorio dorado crece mientras la banana cambia los caminos.',
    rules:{king:true,banana:true}
  },
  {
    name:'Bosque en Movimiento',
    icon:'🍃🦜🐒',
    description:'Tornados, bromas del loro y bombas que desordenan todo el tablero.',
    rules:{wind:true,parrot:true,bomb:true}
  },
  {
    name:'Gran Desafío del Árbol',
    icon:'🌳',
    description:'Todas las sorpresas aparecen juntas, incluido el territorio cambiante del Rey del Árbol.',
    rules:{king:true,banana:true,wind:true,parrot:true,bomb:true}
  }
];

function teamName(team){
  if(isChallengeDuel()) return duelPlayers[team].name;
  const nitoTeam=selectedCharacter==='nito'?humanTeam:(humanTeam===X?O:X);
  const isNito=team===nitoTeam;
  return isNito?'Nito':'Tina';
}

function monkeySVG(team){
  if(isChallengeDuel()){
    const animal=duelAnimal(team);
    const color=duelColor(team);
    return `<div class="duelToken${color.light?' lightToken':''}" style="background:${color.value}" title="${duelPlayers[team].name}: ${animal.name} ${color.name}">${animal.emoji}</div>`;
  }
  const nitoTeam=selectedCharacter==='nito'?humanTeam:(humanTeam===X?O:X);
  const isNito=team===nitoTeam;
  const accent=modeAccent();
  const ring=isNito?accent.nitoRing:accent.tinaRing;
  const detail=isNito?accent.nitoDetail:accent.tinaDetail;
  const head=isNito?'#5e3827':'#8b572d';
  const face=isNito?'#e4b77d':'#f1c983';
  const mode=activeMode();

  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="52" r="40" fill="${ring}" stroke="#fff2c4" stroke-width="4"/>
    <circle cx="50" cy="48" r="25" fill="${head}"/>
    <circle cx="26" cy="44" r="10" fill="${head}"/>
    <circle cx="74" cy="44" r="10" fill="${head}"/>
    <ellipse cx="50" cy="58" rx="18" ry="14" fill="${face}"/>
    <circle cx="43" cy="45" r="5" fill="#fff"/><circle cx="57" cy="45" r="5" fill="#fff"/>
    <circle cx="43" cy="45" r="2.2" fill="#1d2a23"/><circle cx="57" cy="45" r="2.2" fill="#1d2a23"/>
    <path d="M42 60 Q50 68 58 60" fill="none" stroke="#5b3424" stroke-width="3" stroke-linecap="round"/>
    ${isNito
      ?'<path d="M40 27 L47 15 L51 26 L59 17 L60 30" fill="#4b2c21"/>'
      :`<path d="M34 25 Q42 14 49 27 Q57 14 66 25 Q57 34 50 28 Q42 34 34 25" fill="${detail}" stroke="${accent.stroke}" stroke-width="2"/>`}
    ${mode==='anti'
      ?`<path d="M29 73 Q50 84 71 73 L67 83 Q50 91 33 83 Z" fill="${detail}" stroke="${accent.stroke}" stroke-width="2"/>`
      :mode==='mobile'
        ?`<circle cx="76" cy="72" r="11" fill="${detail}" stroke="${accent.stroke}" stroke-width="3"/><path d="M70 72 H82 M78 67 L83 72 L78 77" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
        :''}
  </svg>`;
}

function createEmptyBoard(n){return Array(n*n).fill('')}

function render(){
  applyVisualTheme();
  document.body.classList.toggle('challenge-playing',isChallengeMode());
  boardEl.className='board '+(size===3?'size3':'size9')+(resultFeedback&&resultFeedback.kind==='anti'?' antiMistakeBoard':'');
  boardEl.innerHTML='';

  board.forEach((value,index)=>{
    const cell=document.createElement('button');
    cell.className='cell '+(((Math.floor(index/size)+index%size)%2)?'dark':'');
    cell.dataset.index=index;
    if(selectedCell===index) cell.classList.add('selected');

    if(challengeState&&challengeState.winLine&&challengeState.winLine.includes(index)) cell.classList.add('win');
    if(resultFeedback&&resultFeedback.line&&resultFeedback.line.includes(index)){
      cell.classList.add(resultFeedback.kind==='anti'?'antiLoss':'winClassic');
    }
    if(isBananaCell(index)) cell.classList.add('blocked');
    if(challengeEffect&&challengeEffect.cells&&challengeEffect.cells.includes(index)) cell.classList.add('effectCell');
    if(challengeState&&challengeState.bomb&&challengeState.bomb.index===index) cell.classList.add('bombCell');
    if(isChallengeMode()&&challengeState&&challenges[challengeIndex].rules.king&&getKingTargets().includes(index)){
      cell.classList.add('kingTarget');
      if(challengeState.kingPhase!=='base'&&challengeState.kingPhase!=='baseCountdown') cell.classList.add('kingExpanded');
      if(board[index]) cell.classList.add('kingOccupied');
    }

    cell.onclick=()=>{if(suppressNextClick){suppressNextClick=false;return}playAt(index)};
    cell.addEventListener('pointerdown',event=>beginMobileDrag(event,index));

    if(value){
      const piece=document.createElement('div');
      piece.className='monkey';
      if(mobileSlideFx&&mobileSlideFx.to===index){
        const fromR=Math.floor(mobileSlideFx.from/3),fromC=mobileSlideFx.from%3;
        const toR=Math.floor(mobileSlideFx.to/3),toC=mobileSlideFx.to%3;
        piece.classList.add('moveSlide');
        piece.style.setProperty('--move-x',`${(fromC-toC)*100}%`);
        piece.style.setProperty('--move-y',`${(fromR-toR)*100}%`);
      }
      if(bombSlideFx&&bombSlideFx.length){
        const slide=bombSlideFx.find(f=>f.to===index);
        if(slide){
          const fromR=Math.floor(slide.from/9),fromC=slide.from%9;
          const toR=Math.floor(slide.to/9),toC=slide.to%9;
          piece.classList.add('bombSlide');
          piece.style.setProperty('--bomb-x',`${(fromC-toC)*100}%`);
          piece.style.setProperty('--bomb-y',`${(fromR-toR)*100}%`);
        }
      }
      piece.innerHTML=monkeySVG(value);
      cell.appendChild(piece);
    }

    if(isBananaCell(index)){
      const hazard=document.createElement('div');
      hazard.className='hazard';
      hazard.textContent='🍌';
      cell.appendChild(hazard);
    }
    if(challengeState&&challengeState.bomb&&challengeState.bomb.index===index){
      const hazard=document.createElement('div');
      hazard.className='hazard bombHazard';
      hazard.textContent='💣';
      const timer=document.createElement('div');
      timer.className='bombTimer';
      timer.textContent=challengeState.bomb.timer;
      cell.appendChild(hazard);cell.appendChild(timer);
    }

    boardEl.appendChild(cell);
  });

  if(challengeEffect){
    const fx=document.createElement('div');
    fx.className=`challengeEffect ${challengeEffect.type||''}`;

    if(challengeEffect.type==='parrotSpeech'){
      const sideClass=challengeEffect.fromRight?' fromRight':'';
      fx.innerHTML=`<div class="parrotActor${sideClass}" style="--parrot-y:${challengeEffect.y||42}%">
        <div class="parrotBird" aria-hidden="true">🦜</div>
        <div class="parrotBubble">${challengeEffect.text}</div>
      </div>`;
    }else{
      fx.innerHTML=`<div class="effectIcon">${challengeEffect.icon}</div><div class="effectText">${challengeEffect.text}</div>`;
    }

    if(challengeEffect.wind){
      fx.style.setProperty('--wind-start-x',`${challengeEffect.wind.sx}%`);
      fx.style.setProperty('--wind-start-y',`${challengeEffect.wind.sy}%`);
      fx.style.setProperty('--wind-end-x',`${challengeEffect.wind.ex}%`);
      fx.style.setProperty('--wind-end-y',`${challengeEffect.wind.ey}%`);
    }
    boardEl.appendChild(fx);
  }

  turnLabel.textContent=teamName(turn);
  scoreLabel.textContent=isChallengeDuel()
    ?`${duelScores.X} - ${duelScores.O}`
    :gameMode==='challenge'
      ?`${challengeIndex+1} / 8`
      :gameMode==='tournament'
        ?`${tournamentScores.X} - ${tournamentScores.O}`
        :`${scores.X} - ${scores.O}`;

  const modeNow=activeMode();
  if(gameMode==='tournament'){
    const labels={classic:'🌿 Ta-Te-Ti',anti:'🍃 Ta-Te-Ti Inverso',mobile:'🔄 Ta-Te-Ti Móvil'};
    modeBadge.textContent=`🏆 Torneo · ${labels[modeNow]}`;
  }else if(modeNow==='mobile'&&size===3){
    modeBadge.textContent='🔄 Ta-Te-Ti Móvil';
  }else if(modeNow==='anti'){
    modeBadge.textContent='🍃 Ta-Te-Ti Inverso';
  }else if(isChallengeMode()){
    const ch=challenges[challengeIndex];
    modeBadge.textContent=isChallengeDuel()
      ?`⚔️ Duelo ${challengeIndex+1} de ${challenges.length} · ${ch.name}`
      :`${ch.icon} Desafío ${challengeIndex+1} de ${challenges.length} · ${ch.name}`;
  }else{
    modeBadge.textContent='🌿 Ta-Te-Ti Clásico';
  }

  if(isChallengeMode()){
    challengeInfo.style.display='none';
    jumpButton.style.display='none';

    statusEl.textContent=isChallengeDuel()
      ?`Marcador: ${teamName(X)} ${duelScores.X} - ${duelScores.O} ${teamName(O)}`
      :`Formá cinco en línea antes que ${teamName(aiTeam)}.`;
  }else{
    challengeInfo.style.display='none';
    jumpButton.style.display='none';
  }

  if(gameMode==='tournament'){
    const labels={classic:'Ta-Te-Ti',anti:'Ta-Te-Ti Inverso',mobile:'Ta-Te-Ti Móvil'};
    tournamentPanel.style.display='block';
    tournamentPanel.innerHTML=`<strong>🏆 Copa a 12 puntos</strong><br>${teamName(X)} ${tournamentScores.X} · ${teamName(O)} ${tournamentScores.O}<br><small>Partida ${tournamentRound+1}: ${labels[tournamentSubMode]}</small>`;
  }else{
    tournamentPanel.style.display='none';
  }

  updateOpponentCard();
}

function playAt(index){
  if(roundOver) return;
  if(playType==='ai'&&turn===aiTeam) return;

  if(activeMode()==='mobile'){
    handleMobileMove(index);
    return;
  }

  if(isChallengeMode()){
    handleChallengeMove(index);
    return;
  }

  if(board[index]) return;
  placeStandard(index,turn);
}

function placeStandard(index,team){
  board[index]=team;
  pluck();
  render();

  const line=getThreeLine(board);
  if(line){
    if(activeMode()==='anti'){
      const winner=team===X?O:X;
      finishStandard({winner,line,loser:team});
    }else{
      finishStandard({winner:team,line});
    }
    return;
  }

  if(board.every(Boolean)){
    finishStandard({winner:null,line:[]});
    return;
  }

  switchTurn();
  afterHumanTurn();
}

function getThreeLine(currentBoard){
  for(const line of wins3){
    const [a,b,c]=line;
    if(currentBoard[a]&&currentBoard[a]===currentBoard[b]&&currentBoard[a]===currentBoard[c]) return line;
  }
  return null;
}

function beginMobileDrag(event,index){
  if(roundOver||activeMode()!=='mobile'||(playType==='ai'&&turn===aiTeam)||placementCounts.X+placementCounts.O<6||board[index]!==turn)return;
  dragState={from:index,startX:event.clientX,startY:event.clientY,moved:false,target:null};selectedCell=index;render();
  const moveHandler=ev=>{if(!dragState)return;if(Math.hypot(ev.clientX-dragState.startX,ev.clientY-dragState.startY)>8)dragState.moved=true;document.querySelectorAll('.cell.dragTarget').forEach(el=>el.classList.remove('dragTarget'));const under=document.elementFromPoint(ev.clientX,ev.clientY);const cell=under&&under.closest?under.closest('.cell'):null;if(cell){const to=Number(cell.dataset.index);if(!board[to]&&isAdjacent3(dragState.from,to)){dragState.target=to;cell.classList.add('dragTarget')}else dragState.target=null}};
  const upHandler=()=>{document.removeEventListener('pointermove',moveHandler);document.removeEventListener('pointerup',upHandler);document.removeEventListener('pointercancel',upHandler);document.querySelectorAll('.cell.dragTarget').forEach(el=>el.classList.remove('dragTarget'));if(!dragState)return;const {from,target,moved}=dragState;dragState=null;if(moved&&target!==null){suppressNextClick=true;moveMobilePiece(from,target)}};
  document.addEventListener('pointermove',moveHandler,{passive:true});document.addEventListener('pointerup',upHandler,{once:true});document.addEventListener('pointercancel',upHandler,{once:true});
}
function moveMobilePiece(from,to){if(roundOver||activeMode()!=='mobile'||board[from]!==turn||board[to]||!isAdjacent3(from,to))return;mobileSlideFx={from,to};board[to]=turn;board[from]='';selectedCell=null;mobileMoveCount++;pluck();setTimeout(()=>{mobileSlideFx=null},220);const line=getThreeLine(board);if(line){finishStandard({winner:turn,line});return}if(mobileMoveCount>=20){finishStandard({winner:null,line:[]});return}switchTurn();afterHumanTurn()}

function handleMobileMove(index){
  const totalPlaced=placementCounts.X+placementCounts.O;

  if(totalPlaced<6){
    if(board[index]) return;
    board[index]=turn;
    placementCounts[turn]++;
    pluck();

    const line=getThreeLine(board);
    if(line){finishStandard({winner:turn,line});return}

    switchTurn();
    afterHumanTurn();
    return;
  }

  if(selectedCell===null){
    if(board[index]!==turn) return;
    selectedCell=index;
    statusEl.textContent='Elegí un casillero vecino vacío.';
    render();
    return;
  }

  if(index===selectedCell){
    selectedCell=null;
    render();
    return;
  }

  if(board[index]||!isAdjacent3(selectedCell,index)) return;

  moveMobilePiece(selectedCell,index);
}

function isAdjacent3(a,b){
  const ar=Math.floor(a/3),ac=a%3,br=Math.floor(b/3),bc=b%3;
  return Math.max(Math.abs(ar-br),Math.abs(ac-bc))===1;
}

function presentChallengeRound(){
  hideAllOverlays();
  const ch=challenges[challengeIndex];
  const presentationTitles=[
    'REY DEL GRAN ÁRBOL',
    'BANANAS LOCAS',
    'BOMBAS DEL BOSQUE',
    'VIENTO DEL BOSQUE',
    'LORO BROMISTA',
    'CORONA Y BANANA',
    'BOSQUE EN MOVIMIENTO',
    'GRAN DESAFÍO DEL ÁRBOL'
  ];
  document.getElementById('challengeRoundIcon').textContent=ch.icon;
  document.getElementById('challengeRoundStep').textContent=isChallengeDuel()
    ?`DUELO ${challengeIndex+1} DE ${challenges.length} · ${teamName(X)} ${duelScores.X} - ${duelScores.O} ${teamName(O)}`
    :`DESAFÍO ${challengeIndex+1} DE ${challenges.length}`;
  document.getElementById('challengeRoundTitle').textContent=presentationTitles[challengeIndex]||ch.name.toUpperCase();
  document.getElementById('challengeRoundDescription').textContent=ch.description;
  let rule='Formá cinco fichas en línea antes que tu rival.';
  if(ch.rules.king) rule='Prestá atención a los casilleros dorados: el territorio del Gran Árbol puede crecer.';
  if(ch.rules.banana) rule='Las bananas bloquean casilleros, se mueven y aparecen nuevas cada dos rondas.';
  if(ch.rules.bomb) rule='La bomba explota después de dos rondas y empuja las fichas con fuerza.';
  if(ch.rules.wind) rule='El tornado atraviesa una línea completa y puede mover varias fichas a la vez.';
  if(ch.rules.parrot) rule='Desde la ronda 3, el Loro Bromista cambia una ficha y alterna entre los dos equipos.';
  if(Object.values(ch.rules).filter(Boolean).length>1) rule='Varias reglas del bosque estarán activas al mismo tiempo.';
  document.getElementById('challengeRoundRule').textContent=rule;
  document.getElementById('challengeRoundIntroOverlay').style.display='flex';
}

function beginPresentedChallenge(){
  document.getElementById('challengeRoundIntroOverlay').style.display='none';
  startChallengeRound();
}

function startChallengeRound(){
  resultFeedback=null;mobileSlideFx=null;
  if(!isChallengeDuel()){
    gameMode='challenge';
    playType='ai';
    aiLevel='medium';
  }else{
    playType='pvp';
  }
  size=9;
  board=createEmptyBoard(9);
  roundOver=false;
  selectedCell=null;
  moveCount=0;
  turn=isChallengeDuel()?(challengeIndex%2===0?X:O):humanTeam;
  challengeState={
    bananas:[],
    bananaRound:0,
    bomb:null,
    bombRespawnDelay:0,
    jumpUsed:{X:false,O:false},
    jumpMode:false,
    jumpSelected:null,
    winLine:[],
    kingPhase:'base',
    kingCountdown:null,
    kingWave:0,
    kingExtraTargets:[],
    parrotNextTarget:isChallengeDuel()?X:humanTeam,
    parrotStarted:false
  };

  const rules=challenges[challengeIndex].rules;
  if(rules.banana) initializeBananas();
  if(rules.bomb) placeBomb();

  hideAllOverlays();
  statusEl.textContent=rules.king?`👑 Ocupá los casilleros que brillan. También podés formar cinco en línea.`:`Comienza ${teamName(turn)}. Formá cinco en línea.`;
  render();
}

function handleChallengeMove(index){
  const rules=challenges[challengeIndex].rules;
  if(isBananaCell(index)||isBombCell(index)) return;

  if(challengeState.jumpMode){
    handleJumpSelection(index);
    return;
  }

  if(board[index]) return;

  board[index]=turn;
  moveCount++;
  pluck();

  const result=getChallengeResult(turn,rules);
  if(result){finishChallenge(result);return}

  applyChallengeEvents(rules);
  if(roundOver) return;

  switchTurn();
  render();
  afterHumanTurn();
}

function getChallengeResult(team,rules){
  const line=getFiveLine(board,team);
  if(line) return {winner:team,line,reason:'Formó cinco en línea.'};

  if(board.filter(Boolean).length>=81-(challengeState?.bananas?.length||0)-(challengeState?.bomb?1:0)){
    return {winner:null,line:[],reason:'El tablero quedó completo.'};
  }

  return null;
}

function getFiveLine(currentBoard,team){
  const directions=[[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      if(currentBoard[r*9+c]!==team) continue;
      for(const [dr,dc] of directions){
        const line=[];
        for(let k=0;k<5;k++){
          const rr=r+dr*k,cc=c+dc*k;
          if(rr<0||rr>=9||cc<0||cc>=9||currentBoard[rr*9+cc]!==team) break;
          line.push(rr*9+cc);
        }
        if(line.length===5) return line;
      }
    }
  }
  return null;
}

const KING_BASE_TARGETS=[0,8,31,39,40,41,49,72,80];
const KING_EXPANDED_TARGETS=[
  0,1,9, 7,8,17,
  30,31,32,39,40,41,48,49,50,
  63,72,73, 71,79,80
];

function getKingTargets(){
  if(!challengeState) return [];
  if(challengeState.kingPhase==='base'||challengeState.kingPhase==='baseCountdown') return KING_BASE_TARGETS;
  return [...new Set([...KING_EXPANDED_TARGETS,...(challengeState.kingExtraTargets||[])])];
}

function allKingTargetsOccupied(){
  const targets=getKingTargets();
  return targets.length>0&&targets.every(i=>board[i]);
}

function kingTerritoryScore(team){
  return getKingTargets().filter(i=>board[i]===team).length;
}

function buildNextKingWave(){
  const current=new Set(getKingTargets());
  const options=[];
  for(const index of current){
    for(const near of neighborIndexes(index,9)){
      if(!current.has(near)&&!board[near]&&!isBananaCell(near)&&!isBombCell(near)&&!options.includes(near)) options.push(near);
    }
  }
  for(let i=options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]]}
  return options.slice(0,Math.min(8,options.length));
}

function updateKingTerritory(rules){
  if(!rules.king||roundOver) return;
  const phase=challengeState.kingPhase;

  if(phase==='base'&&allKingTargetsOccupied()){
    challengeState.kingPhase='baseCountdown';
    challengeState.kingCountdown=3;
    statusEl.textContent='👑 ¡El reino inicial está completo! En 3 turnos el bosque crecerá.';
    render();
    return;
  }

  if(phase==='baseCountdown'){
    challengeState.kingCountdown--;
    if(challengeState.kingCountdown<=0){
      challengeState.kingPhase='expanded';
      challengeState.kingCountdown=null;
      statusEl.textContent='🌳 ¡EL REINO CRECIÓ! La cruz se volvió un cuadrado y las esquinas se expandieron.';
      winSound();
    }else statusEl.textContent=`👑 El reino crecerá en ${challengeState.kingCountdown} turno${challengeState.kingCountdown===1?'':'s'}…`;
    render();
    return;
  }

  if((phase==='expanded'||phase==='wave')&&allKingTargetsOccupied()){
    challengeState.kingPhase='finalCountdown';
    challengeState.kingCountdown=3;
    statusEl.textContent='🔥 ¡Todo el territorio está ocupado! Quedan 3 turnos para decidir quién domina el reino.';
    render();
    return;
  }

  if(phase==='finalCountdown'){
    challengeState.kingCountdown--;
    if(challengeState.kingCountdown>0){
      statusEl.textContent=`🔥 El reino se decide en ${challengeState.kingCountdown} turno${challengeState.kingCountdown===1?'':'s'}…`;
      render();
      return;
    }

    const xScore=kingTerritoryScore(X),oScore=kingTerritoryScore(O);
    if(xScore!==oScore){
      const winner=xScore>oScore?X:O;
      finishChallenge({winner,line:getKingTargets().filter(i=>board[i]===winner),reason:`Dominó el territorio brillante por ${Math.max(xScore,oScore)} a ${Math.min(xScore,oScore)}.`});
      return;
    }

    const extras=buildNextKingWave();
    challengeState.kingWave++;
    challengeState.kingExtraTargets=[...(challengeState.kingExtraTargets||[]),...extras];
    challengeState.kingPhase='wave';
    challengeState.kingCountdown=null;
    statusEl.textContent=extras.length?'🌿 ¡Empate! El Gran Árbol abrió nuevos casilleros y la lucha continúa.':'🌿 ¡Empate territorial! Seguimos hasta formar cinco en línea.';
    render();
  }
}

function isBananaCell(index){
  return !!(challengeState&&Array.isArray(challengeState.bananas)&&challengeState.bananas.includes(index));
}
function isBombCell(index){return !!(challengeState&&challengeState.bomb&&challengeState.bomb.index===index)}
function availableHazardCells(exclude=[]){
  const blocked=new Set(exclude);
  return board.map((v,i)=>!v&&!blocked.has(i)&&i!==40&&!isBananaCell(i)&&!isBombCell(i)?i:null).filter(i=>i!==null);
}
function showChallengeEffect(type,icon,text,cells=[],duration=900){
  challengeEffect={type,icon,text,cells};render();
  setTimeout(()=>{challengeEffect=null;render()},duration);
}
function applyChallengeEvents(rules){
  const completedRound=moveCount>0&&moveCount%2===0;
  if(completedRound){
    const round=moveCount/2;
    if(rules.banana) updateBananasForRound(round);
    if(rules.wind&&round%2===0) applyWind();
    if(rules.parrot&&round>=3) applyParrot(round);
    if(rules.bomb) updateBombRound();
  }
  updateKingTerritory(rules);
}
function initializeBananas(){
  challengeState.bananas=[];
  for(let i=0;i<3;i++) addBanana();
  statusEl.textContent='🍌 ¡Tres bananas traviesas bloquearon el tablero!';
}
function addBanana(){
  const cells=availableHazardCells(challengeState.bananas);
  if(!cells.length) return;
  challengeState.bananas.push(cells[Math.floor(Math.random()*cells.length)]);
}
function moveOneBanana(){
  if(!challengeState.bananas.length){addBanana();return}
  const which=Math.floor(Math.random()*challengeState.bananas.length);
  const old=challengeState.bananas[which];
  const cells=availableHazardCells(challengeState.bananas.filter((_,i)=>i!==which));
  if(!cells.length) return;
  let next=cells[Math.floor(Math.random()*cells.length)];
  if(cells.length>1) while(next===old) next=cells[Math.floor(Math.random()*cells.length)];
  challengeState.bananas[which]=next;
}
function updateBananasForRound(round){
  moveOneBanana();
  let added=false;
  if(round%2===0&&challengeState.bananas.length<8){addBanana();added=true}
  statusEl.textContent=added?'🍌 Una banana cambió y apareció otra.':'🍌 Una banana cambió de lugar.';
  render();
}
function placeBomb(){
  const cells=availableHazardCells();
  if(!cells.length) return;
  challengeState.bomb={index:cells[Math.floor(Math.random()*cells.length)],timer:2};
  challengeState.bombRespawnDelay=0;
  statusEl.textContent='💣 ¡Cayó una bomba! Explotará dentro de 3 rondas.';
  showChallengeEffect('bomb','💣','¡BOMBA! 3 rondas', [challengeState.bomb.index],800);
}
function updateBombRound(){
  if(challengeState.bombRespawnDelay>0){
    challengeState.bombRespawnDelay--;
    if(challengeState.bombRespawnDelay===0) placeBomb();
    return;
  }
  if(!challengeState.bomb){placeBomb();return}
  challengeState.bomb.timer--;
  if(challengeState.bomb.timer<=0) explodeBomb();
  else statusEl.textContent=`💣 La bomba explota en ${challengeState.bomb.timer} ronda${challengeState.bomb.timer===1?'':'s'}.`;
}
function explodeBomb(){
  const center=challengeState.bomb.index;
  challengeState.bomb=null;
  challengeState.bombRespawnDelay=1;
  const cr=Math.floor(center/9),cc=center%9;
  const minR=Math.max(0,Math.min(cr-1,5)),maxR=minR+3;
  const minC=Math.max(0,Math.min(cc-1,5)),maxC=minC+3;
  const impacted=board.map((v,i)=>{
    if(!v) return null;
    const r=Math.floor(i/9),c=i%9;
    return r>=minR&&r<=maxR&&c>=minC&&c<=maxC?i:null;
  }).filter(i=>i!==null).sort((a,b)=>{
    const ar=Math.floor(a/9),ac=a%9,br=Math.floor(b/9),bc=b%9;
    return Math.max(Math.abs(br-cr),Math.abs(bc-cc))-Math.max(Math.abs(ar-cr),Math.abs(ac-cc));
  });
  const moved=[];
  bombSlideFx=[];
  for(const i of impacted){
    if(!board[i]) continue;
    let r=Math.floor(i/9),c=i%9;
    let dr=Math.sign(r-cr),dc=Math.sign(c-cc);
    if(!dr&&!dc){const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];[dr,dc]=dirs[Math.floor(Math.random()*dirs.length)]}
    slidePieceWithImpact(i,dr,dc,6,moved,new Set());
  }
  statusEl.textContent='💥 ¡BOOM! Las fichas salieron volando como discos de hockey.';
  showChallengeEffect('bomb','💥','¡BOOOOM!',moved,1100);
  setTimeout(()=>{bombSlideFx=[];render()},780);
}
function slidePieceWithImpact(start,dr,dc,force,moved,visited){
  if(force<=0||!board[start]||visited.has(start)) return;
  visited.add(start);
  const piece=board[start];board[start]='';
  let pos=start,remaining=force,guard=0;
  while(remaining>0&&guard++<36){
    let r=Math.floor(pos/9),c=pos%9;
    let nr=r+dr,nc=c+dc;
    if(nr<0||nr>=9){dr*=-1;remaining+=2;nr=r+dr}
    if(nc<0||nc>=9){dc*=-1;remaining+=2;nc=c+dc}
    if(nr<0||nr>=9||nc<0||nc>=9) break;
    const next=nr*9+nc;
    if(isBananaCell(next)||isBombCell(next)){
      dr*=-1;dc*=-1;remaining+=2;continue;
    }
    if(board[next]){
      const transfer=Math.max(1,remaining);
      slidePieceWithImpact(next,dr,dc,transfer,moved,visited);
      if(board[next]) break;
      pos=next;remaining=0;break;
    }
    pos=next;remaining--;
  }
  board[pos]=piece;moved.push(pos);
  if(pos!==start) bombSlideFx.push({from:start,to:pos});
}

function buildWindPaths(){
  const paths=[];
  for(let r=0;r<9;r++) paths.push(Array.from({length:9},(_,c)=>r*9+c));
  for(let c=0;c<9;c++) paths.push(Array.from({length:9},(_,r)=>r*9+c));
  for(let d=-5;d<=5;d++){
    const a=[],b=[];
    for(let r=0;r<9;r++){
      const c=r+d;if(c>=0&&c<9)a.push(r*9+c);
      const c2=8-r-d;if(c2>=0&&c2<9)b.push(r*9+c2);
    }
    if(a.length>=5) paths.push(a);
    if(b.length>=5) paths.push(b);
  }
  return paths;
}
function applyWind(){
  const candidates=buildWindPaths().map(path=>({path,occupied:path.filter(i=>board[i])})).filter(x=>x.occupied.length>=3);
  if(!candidates.length) return;
  const picked=candidates[Math.floor(Math.random()*candidates.length)];
  const path=picked.path;
  const dir=Math.random()<.5?1:-1;
  const ordered=dir===1?[...path].reverse():[...path];
  const moved=[];
  let count=0;
  for(const from of ordered){
    if(count>=4) break;
    if(!board[from]) continue;
    const pos=path.indexOf(from),nextPos=pos+dir;
    if(nextPos<0||nextPos>=path.length) continue;
    const to=path[nextPos];
    if(board[to]||isBananaCell(to)||isBombCell(to)) continue;
    board[to]=board[from];board[from]='';moved.push(from,to);count++;
  }
  if(!count) return;
  const first=dir===1?path[0]:path[path.length-1];
  const last=dir===1?path[path.length-1]:path[0];
  const fr=Math.floor(first/9),fc=first%9,lr=Math.floor(last/9),lc=last%9;
  challengeEffect={type:'windSweep',icon:'🌪️',text:'',cells:[...new Set(moved)],wind:{sx:(fc+.5)/9*100,sy:(fr+.5)/9*100,ex:(lc+.5)/9*100,ey:(lr+.5)/9*100}};
  statusEl.textContent=`🌪️ ¡El tornado cruzó el tablero y movió ${count} fichas!`;
  render();
  setTimeout(()=>{challengeEffect=null;render()},1000);
}

function longestPotentialLine(team,b=board){
  const dirs=[[0,1],[1,0],[1,1],[1,-1]];let best=0;
  for(let r=0;r<9;r++)for(let c=0;c<9;c++)for(const [dr,dc] of dirs){
    let own=0,empty=0,valid=true;
    for(let k=0;k<5;k++){
      const rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=9||cc<0||cc>=9){valid=false;break}
      const v=b[rr*9+cc];if(v===team) own++;else if(!v) empty++;else{valid=false;break}
    }
    if(valid&&own+empty===5) best=Math.max(best,own);
  }
  return best;
}
function applyParrot(round){
  const target=challengeState.parrotNextTarget||humanTeam;
  const other=target===X?O:X;
  const targetPieces=board.map((v,i)=>v===target?i:null).filter(i=>i!==null);
  const otherPieces=board.map((v,i)=>v===other?i:null).filter(i=>i!==null);
  if(!targetPieces.length||!otherPieces.length) return;

  let best=null,bestScore=-Infinity;
  const beforeTarget=longestPotentialLine(target,board);
  for(const a of targetPieces){
    for(const b of otherPieces){
      const test=board.slice();[test[a],test[b]]=[test[b],test[a]];
      if(getFiveLine(test,target)) continue;
      let score=(beforeTarget-longestPotentialLine(target,test))*24;
      score+=longestPotentialLine(other,test)-longestPotentialLine(other,board);
      score+=Math.random()*2;
      if(score>bestScore){bestScore=score;best={a,b}}
    }
  }
  if(!best) return;

  [board[best.a],board[best.b]]=[board[best.b],board[best.a]];
  challengeState.parrotNextTarget=other;

  const bothersHuman=target===humanTeam;
  const humanPhrases=[
    '¡No tan rápido!',
    '¡Casi lo conseguías!',
    'Jejeje… por acá no.',
    '¡A ver qué hacés ahora!',
    '¡Ups! Cambié una.',
    '¡Te vi venir!'
  ];
  const aiPhrases=[
    '¡Ahora te toca a vos!',
    '¡Nadie se salva!',
    '¡También juego de este lado!',
    'Jejeje… ¡para los dos!',
    '¡Una bromita para vos!',
    '¡Acá molesto a todos!'
  ];
  const phrases=bothersHuman?humanPhrases:aiPhrases;
  const phrase=phrases[Math.floor(Math.random()*phrases.length)];

  statusEl.textContent=`🦜 El Loro Bromista cambió una ficha de ${teamName(target)}. La próxima molestará al otro equipo.`;
  challengeEffect={
    type:'parrotSpeech',
    icon:'🦜',
    text:phrase,
    cells:[best.a,best.b],
    fromRight:Math.random()<.5,
    y:28+Math.floor(Math.random()*42)
  };
  render();
  setTimeout(()=>{challengeEffect=null;render()},1500);
}

function neighborIndexes(index,n){
  const r=Math.floor(index/n),c=index%n,out=[];
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(!dr&&!dc) continue;
    const rr=r+dr,cc=c+dc;
    if(rr>=0&&rr<n&&cc>=0&&cc<n) out.push(rr*n+cc);
  }
  return out;
}

function activateJump(){
  if(!isChallengeMode()||roundOver) return;
  const rules=challenges[challengeIndex].rules;
  if(!rules.jump||challengeState.jumpUsed[turn]) return;

  challengeState.jumpMode=true;
  challengeState.jumpSelected=null;
  selectedCell=null;
  statusEl.textContent='Elegí una ficha tuya para hacerla saltar.';
  render();
}

function handleJumpSelection(index){
  if(challengeState.jumpSelected===null){
    if(board[index]!==turn) return;
    challengeState.jumpSelected=index;
    selectedCell=index;
    statusEl.textContent='Ahora elegí cualquier casillero vacío.';
    render();
    return;
  }

  if(index===challengeState.jumpSelected){
    challengeState.jumpMode=false;
    challengeState.jumpSelected=null;
    selectedCell=null;
    render();
    return;
  }

  if(board[index]||isBananaCell(index)||isBombCell(index)) return;

  board[index]=turn;
  board[challengeState.jumpSelected]='';
  challengeState.jumpUsed[turn]=true;
  challengeState.jumpMode=false;
  challengeState.jumpSelected=null;
  selectedCell=null;
  moveCount++;
  pluck();

  const result=getChallengeResult(turn,challenges[challengeIndex].rules);
  if(result){finishChallenge(result);return}

  applyChallengeEvents(challenges[challengeIndex].rules);
  if(roundOver) return;
  switchTurn();
  render();
  afterHumanTurn();
}

function finishChallenge(result){
  roundOver=true;
  challengeState.winLine=result.line||[];
  const inverseChallenge=!!result.inverse;
  resultFeedback=result.line&&result.line.length
    ?{line:result.line.slice(),kind:inverseChallenge?'anti':'classic'}
    :null;
  render();

  const draw=!result.winner;
  challengeNextButton.style.display='block';
  challengeNextButton.textContent=challengeIndex===challenges.length-1
    ?(isChallengeDuel()?'Ver ganador del duelo':'Ver resultado final')
    :'Siguiente desafío';

  if(isChallengeDuel()){
    if(draw){
      duelRoundResults[challengeIndex]='draw';
      challengeResultTitle.textContent='🌿 ¡Desafío empatado!';
      challengeResultText.textContent=`${teamName(X)} y ${teamName(O)} continúan sin sumar puntos.`;
      drawSound();
    }else{
      duelScores[result.winner]++;
      duelRoundResults[challengeIndex]=result.winner;
      challengeResultTitle.textContent=`🏆 ¡Punto para ${teamName(result.winner)}!`;
      challengeResultText.textContent=`Marcador del duelo: ${teamName(X)} ${duelScores.X} - ${duelScores.O} ${teamName(O)}.`;
      winSound();
    }
  }else{
    const humanWon=result.winner===humanTeam;
    challengeResults[challengeIndex]=humanWon?'win':draw?'draw':'loss';

    if(draw){
      challengeResultTitle.textContent='🌿 ¡Desafío empatado!';
      challengeResultText.textContent='El recorrido continúa. Este desafío contará como pendiente para la próxima aventura.';
      drawSound();
    }else if(humanWon){
      challengeResultTitle.textContent=inverseChallenge?'🍃 ¡El rival formó la línea!':'🏆 ¡Desafío superado!';
      challengeResultText.textContent=result.reason||'¡Muy buena estrategia!';
      if(inverseChallenge) mistakeSound(); else winSound();
    }else{
      challengeResultTitle.textContent=inverseChallenge?'🍃 ¡Formaste la línea!':'🌿 Esta vez ganó '+teamName(result.winner);
      challengeResultText.textContent=inverseChallenge
        ?'En este desafío, formar la línea significa perder. El recorrido continúa.'
        :'No pasa nada: vas a conocer el siguiente desafío y al final recibirás un consejo.';
      if(inverseChallenge) mistakeSound(); else drawSound();
    }
  }

  setTimeout(()=>challengeResultOverlay.style.display='flex',resultFeedback?760:560);
}

function nextChallenge(){
  challengeResultOverlay.style.display='none';
  challengeIndex++;
  if(challengeIndex>=challenges.length){
    if(isChallengeDuel()) showChallengeDuelResult();
    else showChallengeJourneyResult();
    return;
  }
  presentChallengeRound();
}

const challengeFinalCharacters=[
  {emoji:'🦅',name:'Águila',message:'Todos empezamos aprendiendo. Hoy conociste ocho formas distintas de jugar. La próxima aventura puede ser muy diferente.'},
  {emoji:'🐢',name:'Tortuga Tito',message:'Un desafío superado ya es un gran primer paso. Despacio y con atención se llega muy lejos.'},
  {emoji:'🐸',name:'Rana Lila',message:'¡Dos victorias! Cada salto te enseñó algo nuevo. Seguí probando caminos distintos.'},
  {emoji:'🦜',name:'Loro Lolo',message:'¡Tres desafíos, tres desafíos! Nada mal. El bosque todavía guarda varios secretos para vos.'},
  {emoji:'🐿️',name:'Ardilla Rita',message:'Superaste la mitad del recorrido. Estuviste rápido, atento y cada vez más seguro.'},
  {emoji:'🐘',name:'Elefante Bruno',message:'Cinco desafíos superados. La paciencia y la memoria te ayudaron a crecer como jugador.'},
  {emoji:'🦉',name:'Profesor Búho',message:'Seis victorias demuestran una gran estrategia. Observá con calma los tableros que faltan y volverás más preparado.'},
  {emoji:'🐊',name:'Cocodrilo',message:'¡Siete de ocho! Estuviste a una sola victoria del recorrido perfecto. La próxima vez jugá con todo.'}
];

const challengeAdvice=[
  '👑 Rey del Árbol: no mires solamente las líneas. Los casilleros dorados también pueden decidir la partida.',
  '🍌 Banana Traviesa: antes de colocar una ficha, pensá dónde podría aparecer o moverse la banana en la siguiente ronda.',
  '💣 Bombas del Bosque: la bomba explota rápido. Evitá construir toda tu estrategia demasiado cerca de ella.',
  '🌪️ Viento del Bosque: repartí tus fichas en más de una dirección para que un solo tornado no destruya todo tu plan.',
  '🦜 Loro Bromista: prepará más de una posibilidad de línea, porque el loro puede cambiar justo la ficha que necesitabas.',
  '👑🍌 Corona y Banana: combiná el control del territorio con una segunda línea lejos de las bananas.',
  '🍃🦜🐒 Bosque en Movimiento: cuando hay muchos efectos, priorizá una amenaza sencilla y mantené una alternativa.',
  '🌳 Gran Desafío del Árbol: no intentes controlar todo a la vez. Elegí una zona del tablero, defendela y construí desde allí.'
];

function showChallengeJourneyResult(){
  hideAllOverlays();
  const wins=challengeResults.filter(x=>x==='win').length;
  const perfect=wins===challenges.length;

  document.getElementById('challengePerfectResult').style.display=perfect?'block':'none';
  document.getElementById('challengeFinalCharacter').style.display=perfect?'none':'block';

  if(perfect){
    winSound();
  }else{
    const speaker=challengeFinalCharacters[wins];
    const lostIndexes=challengeResults
      .map((result,index)=>result==='win'?null:index)
      .filter(index=>index!==null);
    const advisedIndex=lostIndexes[Math.floor(Math.random()*lostIndexes.length)];

    document.getElementById('challengeFinalAvatar').textContent=speaker.emoji;
    document.getElementById('challengeFinalTitle').textContent=`${speaker.name} · ${wins}/8`;
    document.getElementById('challengeFinalMessage').textContent=speaker.message;
    document.getElementById('challengeFinalAdvice').innerHTML=
      `<strong>🌳 Un consejo del bosque</strong><p style="margin-bottom:0">${challengeAdvice[advisedIndex]}</p>`;
    drawSound();
  }

  finalOverlay.style.display='flex';
}

function restartChallengeJourney(){
  challengeResults=[];
  challengeIndex=0;
  finalOverlay.style.display='none';
  presentChallengeRound();
}

function retryChallenge(){
  challengeResultOverlay.style.display='none';
  startChallengeRound();
}

function switchTurn(){
  turn=turn===X?O:X;
  selectedCell=null;
  statusEl.textContent=`Turno de ${teamName(turn)}.`;
  render();
}

function afterHumanTurn(){
  render();
  if(!roundOver&&playType==='ai'&&turn===aiTeam){
    statusEl.textContent=`${teamName(aiTeam)} está pensando...`;
    const token=++aiTurnToken;
    setTimeout(()=>aiMove(token),420);
  }
}

function aiMove(token){
  if(token!==aiTurnToken||roundOver||playType!=='ai'||turn!==aiTeam) return;

  if(gameMode==='challenge'){
    challengeAiMove();
    return;
  }

  if(activeMode()==='mobile'){
    mobileAiMove();
    return;
  }

  const empty=board.map((v,i)=>v?'':i).filter(v=>v!=='');
  if(!empty.length) return;

  let move;
  if(aiLevel==='easy'){
    move=empty[Math.floor(Math.random()*empty.length)];
  }else if(aiLevel==='medium'){
    move=activeMode()==='anti'?mediumAntiMove():mediumMove3();
  }else{
    move=hardMove3();
  }

  placeStandard(move,aiTeam);
}


function mediumAntiMove(){
  const empty=board.map((v,i)=>v?'':i).filter(v=>v!=='');

  // Apertura especial del nivel medio en Ta-Te-Ti Inverso:
  // solamente en la primera jugada de la computadora disputa uno de
  // los cuatro centros laterales (arriba, izquierda, derecha o abajo).
  // Después de esa apertura continúa usando exactamente la misma IA.
  const aiHasPlayed=board.some(cell=>cell===aiTeam);
  if(!aiHasPlayed){
    const sideCenters=[1,3,5,7].filter(i=>!board[i]);
    if(sideCenters.length){
      return sideCenters[Math.floor(Math.random()*sideCenters.length)];
    }
  }

  // Nunca busca formar tres: primero descarta todas las jugadas
  // que harían perder inmediatamente a la computadora.
  const safe=empty.filter(i=>{
    const test=board.slice();
    test[i]=aiTeam;
    return !getThreeLine(test);
  });

  const candidates=safe.length?safe:empty;

  // En Ta-Te-Ti Inverso conviene dejarle al rival casilleros tentadores
  // que completarían su propia línea y, al mismo tiempo, conservar
  // varias salidas seguras para el siguiente turno.
  const scored=candidates.map(i=>{
    const test=board.slice();
    test[i]=aiTeam;

    let humanLosingMoves=0;
    let aiSafeReplies=0;

    for(let j=0;j<9;j++){
      if(test[j]) continue;

      const humanTest=test.slice();
      humanTest[j]=humanTeam;
      if(getThreeLine(humanTest)) humanLosingMoves++;

      const aiTest=test.slice();
      aiTest[j]=aiTeam;
      if(!getThreeLine(aiTest)) aiSafeReplies++;
    }

    const positionPreference=[4,0,2,6,8,1,3,5,7].indexOf(i);
    const positionalBonus=(9-positionPreference)*0.08;

    return {
      i,
      score:humanLosingMoves*3+aiSafeReplies*.35+positionalBonus+Math.random()*.25
    };
  });

  scored.sort((a,b)=>b.score-a.score);
  return scored[0].i;
}

function mediumMove3(){
  const win=findImmediate(aiTeam);
  if(win!==undefined) return win;

  const block=findImmediate(humanTeam);
  if(block!==undefined) return block;

  const preference=[4,0,2,6,8,1,3,5,7].filter(i=>!board[i]);
  if(Math.random()<.78&&preference.length) return preference[0];

  const empty=board.map((v,i)=>v?'':i).filter(v=>v!=='');
  return empty[Math.floor(Math.random()*empty.length)];
}

function findImmediate(team){
  for(let i=0;i<9;i++) if(!board[i]){
    const test=board.slice();
    test[i]=team;
    const line=getThreeLine(test);
    if(line) return i;
  }
}

function hardMove3(){
  let bestScore=-Infinity,best=0;
  for(let i=0;i<9;i++) if(!board[i]){
    board[i]=aiTeam;
    const score=minimax3(false);
    board[i]='';
    if(score>bestScore){bestScore=score;best=i}
  }
  return best;
}

function minimax3(maximizing){
  const line=getThreeLine(board);
  if(line){
    const winner=board[line[0]];
    if(activeMode()==='anti') return winner===aiTeam?-10:10;
    return winner===aiTeam?10:-10;
  }
  if(board.every(Boolean)) return 0;

  if(maximizing){
    let best=-Infinity;
    for(let i=0;i<9;i++) if(!board[i]){
      board[i]=aiTeam;
      best=Math.max(best,minimax3(false));
      board[i]='';
    }
    return best;
  }

  let best=Infinity;
  for(let i=0;i<9;i++) if(!board[i]){
    board[i]=humanTeam;
    best=Math.min(best,minimax3(true));
    board[i]='';
  }
  return best;
}

function mobileAiMove(){
  const totalPlaced=placementCounts.X+placementCounts.O;

  if(totalPlaced<6){
    const empty=board.map((v,i)=>v?'':i).filter(v=>v!=='');
    let move=findImmediate(aiTeam)??findImmediate(humanTeam);
    if(move===undefined){
      const pref=[4,0,2,6,8,1,3,5,7].filter(i=>!board[i]);
      move=pref[0]??empty[0];
    }
    board[move]=aiTeam;
    placementCounts[aiTeam]++;
    pluck();

    const line=getThreeLine(board);
    if(line){finishStandard({winner:aiTeam,line});return}

    switchTurn();
    return;
  }

  const options=[];
  board.forEach((v,from)=>{
    if(v!==aiTeam) return;
    neighborIndexes(from,3).forEach(to=>{
      if(!board[to]) options.push({from,to});
    });
  });

  if(!options.length){finishStandard({winner:null,line:[]});return}

  let chosen=options.find(m=>{
    const test=board.slice();
    test[m.to]=aiTeam;test[m.from]='';
    return getThreeLine(test);
  });

  if(!chosen){
    chosen=options.find(m=>{
      const test=board.slice();
      test[m.to]=humanTeam;test[m.from]='';
      return getThreeLine(test);
    });
  }

  chosen=chosen||options[Math.floor(Math.random()*options.length)];
  mobileSlideFx={from:chosen.from,to:chosen.to};
  board[chosen.to]=aiTeam;
  board[chosen.from]='';
  setTimeout(()=>{mobileSlideFx=null},220);
  mobileMoveCount++;
  pluck();

  const line=getThreeLine(board);
  if(line){finishStandard({winner:aiTeam,line});return}

  if(mobileMoveCount>=20){finishStandard({winner:null,line:[]});return}

  switchTurn();
}

function challengeAiMove(){
  const rules=challenges[challengeIndex].rules;

  if(rules.jump&&!challengeState.jumpUsed[aiTeam]&&Math.random()<.12){
    const jump=bestChallengeJump();
    if(jump){
      board[jump.to]=aiTeam;
      board[jump.from]='';
      challengeState.jumpUsed[aiTeam]=true;
      moveCount++;
      pluck();

      const result=getChallengeResult(aiTeam,rules);
      if(result){finishChallenge(result);return}

      applyChallengeEvents(rules);
      if(roundOver) return;
      switchTurn();
      return;
    }
  }

  const move=chooseMediumChallengeMove();
  if(move===undefined){finishChallenge({winner:null,line:[],reason:'No quedan movimientos.'});return}

  board[move]=aiTeam;
  moveCount++;
  pluck();

  const result=getChallengeResult(aiTeam,rules);
  if(result){finishChallenge(result);return}

  applyChallengeEvents(rules);
  if(roundOver) return;
  switchTurn();
}

function chooseMediumChallengeMove(){
  const candidates=board.map((v,i)=>!v&&!isBananaCell(i)&&!isBombCell(i)?i:null).filter(i=>i!==null);
  if(!candidates.length) return undefined;

  // 1. Ganar ahora, si es posible.
  const winning=candidates.find(i=>{
    const test=board.slice();test[i]=aiTeam;
    return getFiveLine(test,aiTeam);
  });
  if(winning!==undefined) return winning;

  // 2. Bloquear una victoria inmediata del jugador.
  const immediateBlocks=candidates.filter(i=>{
    const test=board.slice();test[i]=humanTeam;
    return getFiveLine(test,humanTeam);
  });
  if(immediateBlocks.length){
    return bestScoredChallengeCell(immediateBlocks, true);
  }

  // 3. Leer amenazas en formación. Una línea de tres con espacio para crecer
  // ya merece atención: la IA no espera a que aparezcan cuatro fichas.
  const kingTargets=challenges[challengeIndex].rules.king?getKingTargets():[];
  const scored=candidates.map(i=>{
    const attack=challengeThreatScore(i,aiTeam);
    const defense=challengeThreatScore(i,humanTeam);
    const kingBonus=kingTargets.includes(i)?12:0;
    const support=kingTargets.includes(i)&&neighborIndexes(i,9).some(n=>board[n]===aiTeam)?2:0;

    return {
      i,
      score:
        challengeCellScore(i,aiTeam)
        + attack
        + defense*1.18
        + kingBonus
        + support
    };
  }).sort((a,b)=>b.score-a.score);

  // Conserva un poco de variedad para niños, pero solo entre jugadas realmente cercanas.
  const best=scored[0].score;
  const sensible=scored.filter(x=>x.score>=best-1.6).slice(0,3);
  return sensible[Math.floor(Math.random()*sensible.length)].i;
}

function bestScoredChallengeCell(candidates,defensive=false){
  return candidates
    .map(i=>({
      i,
      score:challengeCellScore(i,aiTeam)
        +challengeThreatScore(i,defensive?humanTeam:aiTeam)*(defensive?1.3:1)
    }))
    .sort((a,b)=>b.score-a.score)[0].i;
}

function challengeThreatScore(index,team){
  const r=Math.floor(index/9),c=index%9;
  const dirs=[[0,1],[1,0],[1,1],[1,-1]];
  let score=0;

  for(const [dr,dc] of dirs){
    // Se revisan todas las ventanas de cinco que contienen el casillero candidato.
    for(let offset=-4;offset<=0;offset++){
      const cells=[];
      let valid=true;
      for(let k=0;k<5;k++){
        const rr=r+dr*(offset+k),cc=c+dc*(offset+k);
        if(rr<0||rr>=9||cc<0||cc>=9){valid=false;break}
        cells.push(rr*9+cc);
      }
      if(!valid||!cells.includes(index)) continue;

      let allies=0,empty=0,blocked=0;
      for(const cell of cells){
        const value=(cell===index)?team:board[cell];
        if(value===team) allies++;
        else if(!value&&!isBananaCell(cell)&&!isBombCell(cell)) empty++;
        else blocked++;
      }
      if(blocked) continue;

      if(allies===4&&empty===1) score+=110;
      else if(allies===3&&empty===2) score+=36;
      else if(allies===2&&empty===3) score+=9;
    }

    // Premio extra por cortar o completar una cadena consecutiva.
    let left=0,right=0;
    for(let step=1;step<=4;step++){
      const rr=r-dr*step,cc=c-dc*step;
      if(rr<0||rr>=9||cc<0||cc>=9||board[rr*9+cc]!==team) break;
      left++;
    }
    for(let step=1;step<=4;step++){
      const rr=r+dr*step,cc=c+dc*step;
      if(rr<0||rr>=9||cc<0||cc>=9||board[rr*9+cc]!==team) break;
      right++;
    }
    const chain=left+right;
    if(chain>=4) score+=160;
    else if(chain===3) score+=70;
    else if(chain===2) score+=24;
  }
  return score;
}

function challengeCellScore(index,team){
  const r=Math.floor(index/9),c=index%9;
  let score=0;
  if(index===40) score+=8;
  if([0,8,72,80].includes(index)) score+=4;
  score+=4-Math.min(4,Math.abs(r-4)+Math.abs(c-4))*.25;

  const dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(const [dr,dc] of dirs){
    let allies=0,enemies=0;
    for(let k=-4;k<=4;k++){
      const rr=r+dr*k,cc=c+dc*k;
      if(rr<0||rr>=9||cc<0||cc>=9) continue;
      const v=board[rr*9+cc];
      if(v===team) allies++;
      else if(v&&v!==team) enemies++;
    }
    score+=allies*.7-enemies*.1;
  }
  return score+Math.random()*.8;
}

function bestChallengeJump(){
  const own=board.map((v,i)=>v===aiTeam?i:null).filter(i=>i!==null);
  const empty=board.map((v,i)=>!v&&!isBananaCell(i)&&!isBombCell(i)?i:null).filter(i=>i!==null);

  for(const from of own){
    for(const to of empty){
      const test=board.slice();
      test[to]=aiTeam;test[from]='';
      if(getFiveLine(test,aiTeam)) return {from,to};
    }
  }
  return null;
}

function finishStandard(result){
  roundOver=true;
  aiTurnToken++;

  const inverseResult=activeMode()==='anti'&&!!result.winner;
  resultFeedback=result.line&&result.line.length
    ?{line:result.line.slice(),kind:inverseResult?'anti':'classic'}
    :null;

  render();

  if(gameMode==='tournament'){
    if(tournamentSuddenDeath){
      if(result.winner) tournamentPendingWinner=result.winner;
    }else{
      if(result.winner) tournamentScores[result.winner]+=2;
      else{tournamentScores.X++;tournamentScores.O++}
    }

    // En inverso, quien formó la línea debe sentir que cometió un error.
    if(result.winner){
      if(inverseResult) mistakeSound(); else winSound();
    }else drawSound();

    setTimeout(()=>showTournamentRoundResult(result),inverseResult?760:620);
    return;
  }

  if(result.winner){
    scores[result.winner]++;

    if(inverseResult){
      mistakeSound();
      statusEl.textContent=`¡Ups! ${teamName(result.loser)} formó tres.`;
      endTitle.textContent='🍃 ¡Formaste tres!';
      endText.textContent=`${teamName(result.loser)} perdió la partida. Ganó ${teamName(result.winner)}.`;
    }else{
      winSound();
      statusEl.textContent=`¡Línea completa de ${teamName(result.winner)}!`;
      endTitle.textContent='🌿 ¡Qué buena jugada!';
      endText.textContent=`Ganó ${teamName(result.winner)}.`;
    }
  }else{
    drawSound();
    endTitle.textContent='🌿 ¡Partida empatada!';
    endText.textContent=activeMode()==='mobile'
      ?'Se realizaron veinte movimientos sin ganador.'
      :'Los dos equipos jugaron muy bien.';
  }

  render();
  // Primero se entiende lo ocurrido en el tablero; después aparece el cartel.
  setTimeout(()=>endOverlay.style.display='flex',resultFeedback?760:560);
}

function showTournamentRoundResult(result){
  const labels={classic:'Ta-Te-Ti',anti:'Ta-Te-Ti Inverso',mobile:'Ta-Te-Ti Móvil'};
  tournamentRoundTitle.textContent=tournamentSuddenDeath?'⚔️ Desempate':`🏆 ${labels[tournamentSubMode]}`;

  const inverseRound=tournamentSubMode==='anti'&&!!result.winner;
  if(tournamentSuddenDeath){
    tournamentRoundText.textContent=result.winner
      ?(inverseRound
        ?`${teamName(result.loser)} formó tres y perdió. ${teamName(result.winner)} ganó el desempate.`
        :`${teamName(result.winner)} ganó el desempate.`)
      :'La partida terminó empatada. El desempate continúa.';
  }else{
    tournamentRoundText.textContent=result.winner
      ?(inverseRound
        ?`${teamName(result.loser)} formó tres y perdió. ${teamName(result.winner)} suma 2 puntos.`
        :`${teamName(result.winner)} ganó la partida y suma 2 puntos.`)
      :'La partida terminó empatada. Cada jugador suma 1 punto.';
  }

  tourPlayerOne.textContent=teamName(X);
  tourPlayerTwo.textContent=teamName(O);
  tourScore.textContent=`${tournamentScores.X} - ${tournamentScores.O}`;

  const button=tournamentRoundOverlay.querySelector('button');
  button.textContent=tournamentPendingWinner?'Ver campeón':'Siguiente partida';
  tournamentRoundOverlay.style.display='flex';
}

function continueTournament(){
  tournamentRoundOverlay.style.display='none';

  if(tournamentPendingWinner){
    const winner=tournamentPendingWinner;
    tournamentPendingWinner=null;
    showTournamentFinal(winner);
    return;
  }

  if(!tournamentSuddenDeath&&tournamentScores.X>=12&&tournamentScores.O>=12&&tournamentScores.X===tournamentScores.O){
    tournamentSuddenDeath=true;
    tournamentRound++;
    tournamentModeIndex=(tournamentModeIndex+1)%3;
    tournamentSubMode=['classic','anti','mobile'][tournamentModeIndex];
    presentTournamentRound(true);
    return;
  }

  if(!tournamentSuddenDeath&&(tournamentScores.X>=12||tournamentScores.O>=12)){
    showTournamentFinal(tournamentScores.X>=12?X:O);
    return;
  }

  tournamentRound++;
  tournamentModeIndex=(tournamentModeIndex+1)%3;
  tournamentSubMode=['classic','anti','mobile'][tournamentModeIndex];
  presentTournamentRound(false);
}

function presentTournamentRound(isFirstTiebreak=false){
  const data={
    classic:{icon:'🌿',title:'TA-TE-TI',rule:'Formá una línea de tres fichas.',className:'roundClassic'},
    anti:{icon:'🍃',title:'TA-TE-TI INVERSO',rule:'¡No formes tres! Quien complete una línea pierde.',className:'roundAnti'},
    mobile:{icon:'🔄',title:'TA-TE-TI MÓVIL',rule:'Primero colocá tres fichas. Después mové una por turno a un casillero vecino.',className:'roundMobile'}
  }[tournamentSubMode];

  tournamentIntroCard.className=`card roundCard ${isFirstTiebreak?'roundTiebreak':data.className}`;
  tournamentIntroIcon.textContent=isFirstTiebreak?'⚔️':data.icon;
  tournamentIntroEyebrow.innerHTML=isFirstTiebreak
    ?'<span class="suddenBadge">DESEMPATE</span>'
    :`<strong>RONDA ${tournamentRound+1}</strong>`;
  tournamentIntroTitle.textContent=isFirstTiebreak?'¡PRÓXIMA VICTORIA GANA!':data.title;
  tournamentIntroRule.textContent=isFirstTiebreak
    ?'Los dos llegaron a 12 puntos. Los empates hacen continuar el torneo; la próxima victoria decide al campeón.'
    :data.rule;
  tournamentIntroScore.innerHTML=`<span>${teamName(X)}</span><strong>${tournamentScores.X} - ${tournamentScores.O}</strong><span>${teamName(O)}</span>`;
  tournamentStartButton.textContent=isFirstTiebreak?'Jugar desempate':'Comenzar partida';
  tournamentIntroOverlay.style.display='flex';
  applyVisualTheme();
}

function startPresentedTournamentRound(){
  resultFeedback=null;mobileSlideFx=null;
  tournamentIntroOverlay.style.display='none';
  restartRound();
  startMusic();
}

function showTournamentFinal(winner){
  const winnerName=teamName(winner);
  const playerWon=playType!=='ai'||winner===humanTeam;
  const downloadButton=document.querySelector('#tournamentFinalOverlay .menuGrid .action.gold');

  if(playerWon){
    const isNito=winnerName==='Nito';
    const filename=isNito?'tatetitorneonito.png':'tatetitorneotina.png';
    tournamentFinalTitle.textContent=`🏆 ¡${winnerName} ganó el torneo!`;
    tournamentFinalText.textContent=tournamentSuddenDeath
      ?`¡Ganaste el desempate! Resultado del torneo: ${teamName(X)} ${tournamentScores.X} · ${teamName(O)} ${tournamentScores.O}`
      :`Resultado final: ${teamName(X)} ${tournamentScores.X} · ${teamName(O)} ${tournamentScores.O}`;
    tournamentFinalImage.src=`../../img/${filename}?v=3`;
    tournamentFinalImage.alt=`Premio del torneo ganado por ${winnerName}`;
    tournamentFinalImage.dataset.filename=filename;
    tournamentFinalImage.style.display='block';
    if(downloadButton) downloadButton.style.display='block';
    winSound();
  }else{
    tournamentFinalTitle.textContent='🌿 Esta vez ganó la computadora';
    tournamentFinalText.textContent=`Resultado final: ${teamName(X)} ${tournamentScores.X} · ${teamName(O)} ${tournamentScores.O}. El premio se entrega solamente cuando gana el jugador. ¡Volvé a intentarlo!`;
    tournamentFinalImage.style.display='none';
    tournamentFinalImage.removeAttribute('data-filename');
    if(downloadButton) downloadButton.style.display='none';
    drawSound();
  }

  tournamentDownloadStatus.textContent='';
  tournamentFinalOverlay.style.display='flex';
}

async function downloadTournamentImage(){
  const image=document.getElementById('tournamentFinalImage');
  const status=document.getElementById('tournamentDownloadStatus');
  const filename=image.dataset.filename||'tatetitorneonito.png';
  await downloadImageFile(image.src,filename,status);
}

function restartRound(){
  resultFeedback=null;mobileSlideFx=null;
  aiTurnToken++;
  endOverlay.style.display='none';

  if(isChallengeMode()){
    startChallengeRound();
    return;
  }

  size=3;
  board=createEmptyBoard(3);
  roundOver=false;
  selectedCell=null;
  placementCounts={X:0,O:0};
  mobileMoveCount=0;

  // En cada ronda comienza el personaje contrario al que inició la anterior.
  turn=nextStarter;
  nextStarter=nextStarter===X?O:X;

  if(playType==='ai'&&turn===aiTeam){
    statusEl.textContent=`${teamName(aiTeam)} comienza y está pensando...`;
  }else{
    statusEl.textContent=`Turno de ${teamName(turn)}.`;
  }

  render();

  if(playType==='ai'&&turn===aiTeam){
    const token=++aiTurnToken;
    setTimeout(()=>aiMove(token),500);
  }
}

function chooseMode(mode){
  gameMode=mode;
  applyVisualTheme();
  menuOverlay.style.display='none';
  playTypeOverlay.style.display='flex';
}

function choosePlayType(type){playType=type;playTypeOverlay.style.display='none';if(type==='ai')chooseForestOpponent();if(gameMode==='tournament'){aiLevel='medium';characterOverlay.style.display='flex'}else if(type==='ai')levelsOverlay.style.display='flex';else characterOverlay.style.display='flex'}

function chooseAiLevel(level){
  aiLevel=level;
  levelsOverlay.style.display='none';
  characterOverlay.style.display='flex';
}

function selectCharacter(character){
  selectedCharacter=character;
  humanTeam=X;
  aiTeam=O;
  nextStarter=X;
  characterOverlay.style.display='none';

  if(gameMode==='challenge'){challengeIndex=0;challengeResults=[];presentChallengeRound()}
  else if(gameMode==='tournament'){
    tournamentScores={X:0,O:0};
    tournamentRound=0;
    tournamentModeIndex=0;
    tournamentSubMode='classic';
    tournamentSuddenDeath=false;
    tournamentPendingWinner=null;
    scores={X:0,O:0};
    presentTournamentRound(false);
    startMusic();
  }
  else{scores={X:0,O:0};restartRound();startMusic()}
}


function showChallengeDuelIntro(){
  gameMode='challengeDuel';
  playType='pvp';
  hideAllOverlays();
  challengeDuelIntroOverlay.style.display='flex';
}

function openDuelSetup(){
  challengeDuelIntroOverlay.style.display='none';
  duelSetupWarning.textContent='';
  duelSetupOverlay.style.display='flex';
  updateDuelSetupPreviews();
}

function changeDuelAnimal(team,direction){
  const player=duelPlayers[team];
  player.animalIndex=(player.animalIndex+direction+duelAnimals.length)%duelAnimals.length;
  updateDuelSetupPreviews();
}

function changeDuelColor(team,direction){
  const player=duelPlayers[team];
  player.colorIndex=(player.colorIndex+direction+duelColors.length)%duelColors.length;
  updateDuelSetupPreviews();
}

function updateDuelSetupPreviews(){
  for(const team of [X,O]){
    const animal=duelAnimal(team),color=duelColor(team);
    const lightClass=color.light?' lightToken':'';
    document.getElementById(`duelAnimalPreview${team}`).innerHTML=
      `<span class="duelTokenPreview${lightClass}" style="background:${color.value}">${animal.emoji}</span><span>${animal.name}</span>`;
    document.getElementById(`duelColorPreview${team}`).innerHTML=
      `<span class="duelTokenPreview${lightClass}" style="background:${color.value}"></span><span>${color.name}</span>`;
  }
}

function beginChallengeDuel(){
  duelPlayers.X.name=safePlayerName(duelNameX.value,'Jugador 1');
  duelPlayers.O.name=safePlayerName(duelNameO.value,'Jugador 2');

  if(duelPlayers.X.name.toLowerCase()===duelPlayers.O.name.toLowerCase()){
    duelSetupWarning.textContent='Elegí nombres diferentes para reconocer a cada jugador.';
    return;
  }
  if(duelPlayers.X.animalIndex===duelPlayers.O.animalIndex&&duelPlayers.X.colorIndex===duelPlayers.O.colorIndex){
    duelSetupWarning.textContent='Las dos fichas no pueden tener el mismo animal y el mismo color.';
    return;
  }

  duelSetupWarning.textContent='';
  gameMode='challengeDuel';
  playType='pvp';
  challengeIndex=0;
  duelScores={X:0,O:0};
  duelRoundResults=[];
  duelSetupOverlay.style.display='none';
  presentChallengeRound();
  startMusic();
}

function showChallengeDuelResult(){
  hideAllOverlays();
  const x=duelScores.X,o=duelScores.O;
  let title,textResult;
  if(x===o){
    title='🤝 ¡Duelo empatado!';
    textResult=`${teamName(X)} y ${teamName(O)} terminaron con ${x} victorias cada uno.`;
    drawSound();
  }else{
    const winner=x>o?X:O;
    title=`🏆 ¡${teamName(winner)} ganó el duelo!`;
    textResult=`Después de ocho desafíos, ${teamName(winner)} consiguió más victorias.`;
    winSound();
  }

  duelFinalTitle.textContent=title;
  duelFinalText.textContent=textResult;
  duelFinalScore.innerHTML=`
    <div class="duelPlayerSummary">
      <div class="duelTokenPreview${duelColor(X).light?' lightToken':''}" style="background:${duelColor(X).value}">${duelAnimal(X).emoji}</div>
      ${teamName(X)}
    </div>
    <div class="duelBigScore">${x} - ${o}</div>
    <div class="duelPlayerSummary">
      <div class="duelTokenPreview${duelColor(O).light?' lightToken':''}" style="background:${duelColor(O).value}">${duelAnimal(O).emoji}</div>
      ${teamName(O)}
    </div>`;
  duelFinalOverlay.style.display='flex';
}

function restartChallengeDuel(){
  duelScores={X:0,O:0};
  duelRoundResults=[];
  challengeIndex=0;
  duelFinalOverlay.style.display='none';
  presentChallengeRound();
}

function showChallengeIntro(){
  gameMode='challenge';
  menuOverlay.style.display='none';
  challengeIntroOverlay.style.display='flex';
}

function beginChallengeCharacterChoice(){
  challengeIntroOverlay.style.display='none';
  playType='ai';
  aiLevel='medium';
  characterOverlay.style.display='flex';
}

function backToMainMenu(){
  hideAllOverlays();
  menuOverlay.style.display='flex';
}

function backToPlayType(){
  levelsOverlay.style.display='none';
  playTypeOverlay.style.display='flex';
}

function hideAllOverlays(){
  document.querySelectorAll('.overlay').forEach(el=>el.style.display='none');
}

function showMenu(){
  resultFeedback=null;mobileSlideFx=null;
  document.body.classList.remove('challenge-playing');
  stopMusic();
  aiTurnToken++;
  hideAllOverlays();
  menuOverlay.style.display='flex';
}

async function downloadImageFile(source,filename,status){status.textContent='Preparando la descarga...';try{const response=await fetch(source,{cache:'no-store'});if(!response.ok)throw new Error('No se pudo leer la imagen.');const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);status.textContent='¡Imagen PNG descargada!'}catch(error){status.textContent='Abrí la imagen y mantené presionado para guardarla.';window.open(source,'_blank','noopener')}}
async function downloadFinalImage(){await downloadImageFile(document.getElementById('finalImage').src,'finaltateti.png',document.getElementById('downloadStatus'))}

/* Audio */
function initAudio(){
  if(!musicOn)return;
  if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') audioCtx.resume();
}
function tone(f,d,type='sine',volume=.03,delay=0){
  if(!musicOn)return;
  initAudio();
  const now=audioCtx.currentTime+delay;
  const oscillator=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  oscillator.type=type;oscillator.frequency.value=f;
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.linearRampToValueAtTime(Math.min(.35,volume*MASTER_VOLUME),now+.018);
  gain.gain.exponentialRampToValueAtTime(.0001,now+d);
  oscillator.connect(gain).connect(audioCtx.destination);
  oscillator.start(now);oscillator.stop(now+d+.05);
}
function midi(n){return 440*Math.pow(2,(n-69)/12)}
function playMusicStep(){
  if(!musicOn||!audioCtx)return;

  const mode=activeMode();
  const arrangements={
    classic:{melody:[60,64,65,67,60,64,65,67,60,64,65,67,64,60,64,62],shift:12,type:'triangle',bass:'sine'},
    anti:{melody:[57,60,61,64,57,60,56,59,57,60,61,64,60,57,56,52],shift:12,type:'sine',bass:'triangle'},
    mobile:{melody:[64,67,69,71,72,71,69,67,64,67,69,72,71,69,67,66],shift:12,type:'square',bass:'triangle'}
  };
  const a=arrangements[mode]||arrangements.classic;
  const note=a.melody[musicStep%a.melody.length];

  tone(midi(note+a.shift),mode==='mobile'?.14:.22,a.type,mode==='mobile'?.009:.012);
  if(musicStep%2===0)tone(midi(note-24),mode==='mobile'?.20:.30,a.bass,.008);
  musicStep++;
}

function musicTempo(){
  const mode=activeMode();
  if(mode==='mobile')return 360;
  if(mode==='anti')return 610;
  return 520;
}

function startMusic(){
  stopMusic();
  if(!musicOn)return;
  initAudio();
  musicStep=0;
  playMusicStep();
  musicTimer=setInterval(playMusicStep,musicTempo());
}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
function toggleMusic(){
  musicOn=!musicOn;
  musicLabel.textContent='Música: '+(musicOn?'sí':'no');
  if(musicOn&&menuOverlay.style.display==='none')startMusic();else stopMusic();
}
function pluck(){tone(660,.1,'triangle',.04);tone(880,.12,'triangle',.03,.06)}
function winSound(){tone(523,.15,'triangle',.05);tone(659,.15,'triangle',.05,.12);tone(784,.25,'triangle',.06,.24)}
function drawSound(){tone(392,.18,'sine',.04);tone(349.23,.22,'sine',.035,.16)}
function mistakeSound(){
  tone(330,.13,'triangle',.045);
  tone(247,.18,'sine',.05,.10);
  tone(196,.28,'sine',.045,.23);
}


function resetToMainMenu(){
  resultFeedback=null;mobileSlideFx=null;
  aiTurnToken++;
  stopMusic();
  gameMode='classic';
  playType='pvp';
  duelScores={X:0,O:0};
  tournamentSuddenDeath=false;
  tournamentPendingWinner=null;
  document.querySelectorAll('.overlay').forEach(el=>el.style.display='none');
  menuOverlay.style.display='flex';
  applyVisualTheme();
  modeBadge.textContent='Elegí un modo';
  statusEl.textContent='Elegí un modo para comenzar.';
}

const coverOverlay=document.getElementById('coverOverlay');
const coverPlayButton=document.getElementById('coverPlayButton');
let coverOpening=false;

function openGameFromCover(event){
  if(event){
    event.preventDefault();
    event.stopPropagation();
    if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
  }
  if(coverOpening||coverOverlay.style.display==='none')return;

  coverOpening=true;
  coverPlayButton.disabled=true;
  resetToMainMenu();

  // La portada se vuelve transparente, pero durante unos instantes sigue
  // capturando el toque. Así el mismo gesto no atraviesa hacia un botón
  // del menú en celulares o tablets.
  coverOverlay.style.transition='opacity .28s ease';
  coverOverlay.style.opacity='0';
  coverOverlay.style.visibility='visible';
  coverOverlay.style.pointerEvents='auto';

  setTimeout(()=>{
    coverOverlay.style.display='none';
    coverOverlay.style.pointerEvents='none';
    coverOpening=false;
  },420);

  if(musicOn)initAudio();
}

coverPlayButton.addEventListener('pointerup',openGameFromCover);

coverPlayButton.addEventListener('click',event=>{
  if(event.detail===0)openGameFromCover(event);
  else{
    event.preventDefault();
    event.stopPropagation();
  }
});

window.addEventListener('pageshow',()=>{
  if(coverOverlay.style.display==='none'||coverOverlay.classList.contains('is-hidden')){
    resetToMainMenu();
  }
});

render();
resetToMainMenu();
