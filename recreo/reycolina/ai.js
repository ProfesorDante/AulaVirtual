'use strict';

/*
  REYES DEL ÁRBOL · ALPHA 18 · DIRECTOR IA
  Archivo separado para poder ajustar estrategia sin tocar físicas, render ni mapas.
  Objetivo: rivales con intención de puntuar, no rivales perfectos.
*/

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

function teamWinner(team,excludeId=null){
  const flag=flagForTeam(team);
  return rosterForTeam(team).filter(p=>p.id!==excludeId&&p.aiTeamRole==='winner').sort((a,b)=>distance(a,flag)-distance(b,flag))[0]||null;
}

function designatedWinnerSeeker(player,flag,team){
  const winners=team.filter(p=>p.aiTeamRole==='winner');
  return winners.length>0&&winners.slice().sort((a,b)=>distance(a,flag)-distance(b,flag))[0]?.id===player.id;
}

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

function teamPanicLevel(team=null){
  const leader=highestTeamScore();
  if(!team)return leader>=15?3:leader>=10?2:leader>=5?1:0;
  const own=teamScoreValue(team),gap=Math.max(0,leader-own);
  if(leader>=15||gap>=10)return 3;
  if(leader>=10||gap>=7)return 2;
  if(leader>=5||gap>=4)return 1;
  return 0;
}


function captureMissionFor(player){
  const team=rosterForTeam(player.team),ownFlag=flagForTeam(player.team);
  if(!ownFlag)return null;
  const panic=teamPanicLevel(player.team);
  const captain=refreshCaptureDuties(team);
  const carrier=flagCarrierEntity(ownFlag);

  if(carrier?.id===player.id){
    return {x:CONFIG.cx+player.navBias*(panic>=2?12:24),y:CONFIG.cy-10,role:'score'};
  }
  if(!carrier){
    if(captain?.id===player.id)return {x:ownFlag.x,y:ownFlag.y,role:'capture-flag'};
    if(panic>=2)return {x:(ownFlag.x+CONFIG.cx)*.5,y:(ownFlag.y+CONFIG.cy)*.5,role:'route-clear'};
    return null;
  }
  if(carrier.team===player.team){
    const towardCenter=Math.atan2(CONFIG.cy-carrier.y,CONFIG.cx-carrier.x);
    const side=player.navBias*(panic>=2?58:88);
    return {x:carrier.x+Math.cos(towardCenter+Math.PI/2)*side,y:carrier.y+Math.sin(towardCenter+Math.PI/2)*side,role:'escort'};
  }
  // La bandera fue robada: uno persigue y el otro corta el camino a la colina.
  if(captain?.id===player.id)return {x:carrier.x,y:carrier.y,role:'recover-stolen'};
  return {x:(carrier.x+CONFIG.cx)*.55,y:(carrier.y+CONFIG.cy)*.55,role:'intercept-carrier'};
}


function rivalAiInput(player){
  const tick=1/60,panic=teamPanicLevel(player.team);
  player.aiDecisionClock-=tick;
  player.aiPlanLock=Math.max(0,(player.aiPlanLock||0)-tick);
  player.aiMissionClock=(player.aiMissionClock||0)+tick;
  player.aiFarClock=hillDistance(player)>430?(player.aiFarClock||0)+tick:Math.max(0,(player.aiFarClock||0)-tick*2.2);
  player.aiIdleWatch=(player.aiIdleWatch||0)+tick;
  if(Math.hypot(player.vx,player.vy)>18)player.aiIdleWatch=0;
  if(player.aiIdleWatch>1.6){player.aiDecisionClock=0;player.navStuckClock=1;player.navEscapeClock=.8;player.navEscapeAngle=Math.random()*Math.PI*2;player.aiIdleWatch=0;}

  // El Director IA decide primero cómo puntuar. Las distracciones quedan después.
  const captureGoal=captureMissionFor(player);
  if(captureGoal){
    if(captureGoal.role!==player.aiRole)player.aiMissionClock=0;
    player.aiTargetX=captureGoal.x;player.aiTargetY=captureGoal.y;player.aiRole=captureGoal.role;
    player.aiPlanLock=Math.max(player.aiPlanLock,panic>=2?4.2:2.8);
    player.aiDecisionClock=.18;
  }else{
    const monkeyThreat=monkeyFlagThreatForTeam(player.team);
    if(monkeyThreat&&panic<2){
      player.aiTargetX=monkeyThreat.x;player.aiTargetY=monkeyThreat.y;player.aiRole='recover-from-monkey';player.aiDecisionClock=.12;
    }else if(player.aiDecisionClock<=0||!Number.isFinite(player.aiTargetX)||distance(player,{x:player.aiTargetX,y:player.aiTargetY})<28){
      const urgent=urgentEnemyCarrier(player);
      const usefulItem=!urgent&&panic===0&&player.aiFarClock<2.2&&player.aiPlanLock<=0?bestAiItemTarget(player):null;
      let goal=urgent?{x:urgent.x,y:urgent.y,role:'intercept-carrier'}:(usefulItem?{x:usefulItem.x,y:usefulItem.y,role:'item'}:chooseStableAiTarget(player));
      goal=applyHillGravity(player,goal);
      if(panic>=1&&!['score','capture-flag','recover-stolen','intercept-carrier','escort'].includes(goal.role)){
        goal={...hillAnchor(player,panic>=2?65:95),role:'contest'};
      }
      if(goal.role!==player.aiRole){player.aiMissionClock=0;player.aiPlanLock=panic>=2?2.4:.8;}
      player.aiTargetX=goal.x;player.aiTargetY=goal.y;player.aiRole=goal.role;
      player.aiDecisionClock=(player.aiStyle==='caotico'?.62:.30)+Math.random()*.20;
    }
  }

  const enemy=mostDangerousEnemy(player);
  if(panic<2&&shouldAiUseHeldItem(player,enemy))useHeldItem(player);
  if(player.heldBall>0&&enemy&&distance(player,enemy)<(panic>=2?245:410))throwBall(player,enemy);
  return smartAiDirections(player,{x:player.aiTargetX,y:player.aiTargetY},player.aiRole==='escort'?48:18);
}


window.rdcAiStatus=function(){
  const teams=[state.humanTeam,state.rivalTeam,state.rival2Team,...(state.rival3Flag?[state.rival3Team]:[])];
  return teams.map(team=>({team,score:teamScoreValue(team),panic:teamPanicLevel(team),roles:rosterForTeam(team).map(p=>({id:p.id,role:p.aiRole,teamRole:p.aiTeamRole,capture:p.aiCaptureDuty}))}));
};
