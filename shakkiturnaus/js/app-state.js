// ═══════════════════════════════════════════════════════
// STATE — single source of truth
// ═══════════════════════════════════════════════════════
window.appState = {
  players: [],   // { id:int, name:str, rating:int, club:str, active:bool }
  rounds:  [],   // [ { pairs: [ {wId, bId, res} ] } ]
  view:    0,    // currently displayed round index (0-based)
  cfg: { name:'Shakkiturnaus', rounds:7, bye:0.5 }
};

let _nextId = 1;
function freshId() { return _nextId++; }