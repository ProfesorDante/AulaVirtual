'use strict';

/*
  REYES DEL ÁRBOL · MAPAS ESTACIONALES
  Base preparada para la última etapa: un mapa diferente por estación.
  Por ahora conserva exactamente el mapa estable y sólo registra perfiles.
*/
const RDC_SEASON_MAPS=Object.freeze({
  summer:{id:'summer',name:'Verano',build:null,decorate:null},
  autumn:{id:'autumn',name:'Otoño',build:null,decorate:null},
  winter:{id:'winter',name:'Invierno',build:null,decorate:null},
  spring:{id:'spring',name:'Primavera',build:null,decorate:null}
});
function activeSeasonMap(){return RDC_SEASON_MAPS[state?.season]||RDC_SEASON_MAPS.summer;}
window.RDC_SEASON_MAPS=RDC_SEASON_MAPS;
window.rdcMapStatus=()=>({season:state?.season,map:activeSeasonMap().id,readyForVariants:true});
