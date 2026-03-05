// ═══════════════════════════════════════════════════════
// STATE — single source of truth
// ═══════════════════════════════════════════════════════
window.appState = {
  players: [],   // { id:int, name:str, rating:int, club:str, active:bool, group:str }
  rounds:  [],   // [ { pairs: [ {wId, bId, res} ] } ]
  view:    0,    // currently displayed round index (0-based)
  cfg: { name:'Shakkiturnaus', rounds:7, gamesPerPair:1, bye:1.0 }
};

// LISÄYS: Funktio uuden pelaajan luontiin (käytetään playermanagement.js:ssä)
function createPlayer(name, rating = 0, club = '', active = true, group = '') {
  return { id: freshId(), name, rating, club, active, group };
}

let _nextId = 1;
function freshId() { return _nextId++; }