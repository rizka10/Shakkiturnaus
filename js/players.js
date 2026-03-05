// Returns { [playerId]: score }
function calcScores(upToRound = appState.rounds.length) {
  const sc = {};
  appState.players.forEach(p => { sc[p.id] = 0; });

  // Käydään vain halutut kierrokset läpi
  for (let r = 0; r < Math.min(upToRound, appState.rounds.length); r++) {
    const rnd = appState.rounds[r];
    rnd.pairs.forEach(pair => {
      if (pair.bId === null) {
        // BYE
        if (pair.res === '1') {
          sc[pair.wId] = (sc[pair.wId] || 0) + appState.cfg.bye;
        } else if (pair.res === 'D') {
          sc[pair.wId] = (sc[pair.wId] || 0) + appState.cfg.bye * 0.5;
        }
        // '0' → 0 pistettä, ei tarvitse erikseen
      } else {
        if (pair.res === '1') {
          sc[pair.wId] = (sc[pair.wId] || 0) + 1;
        } else if (pair.res === '0') {
          sc[pair.bId] = (sc[pair.bId] || 0) + 1;
        } else if (pair.res === 'D') {
          sc[pair.wId] = (sc[pair.wId] || 0) + 0.5;
          sc[pair.bId] = (sc[pair.bId] || 0) + 0.5;
        }
      }
    });
  }
  return sc;
}

// Returns { [playerId]: buchholzScore }
function calcBuchholz(sc, groupPlayers = appState.players) {
  const bh = {};
  groupPlayers.forEach(p => { bh[p.id] = 0; });

  appState.rounds.forEach(rnd => {
    rnd.pairs.forEach(pair => {
      if (pair.bId === null || pair.res == null) return; // bye ignored in BH (or add bye score)
      const wInGroup = groupPlayers.some(p => p.id === pair.wId);
      const bInGroup = groupPlayers.some(p => p.id === pair.bId);
      if (wInGroup && bInGroup) {
        bh[pair.wId] = (bh[pair.wId] || 0) + (sc[pair.bId] || 0);
        bh[pair.bId] = (bh[pair.bId] || 0) + (sc[pair.wId] || 0);
      }
    });
  });
  return bh;
}

// Returns { [playerId]: sonnebornBerger }
function calcSB(sc, groupPlayers = appState.players) {
  const sb = {};
  appState.players.forEach(p => { sb[p.id] = 0; });

  appState.rounds.forEach(rnd => {
    rnd.pairs.forEach(pair => {
      if (pair.bId === null || pair.res == null) return;
      const wInGroup = groupPlayers.some(p => p.id === pair.wId);
      const bInGroup = groupPlayers.some(p => p.id === pair.bId);

      if (wInGroup && bInGroup) {
        if (pair.res === '1') {
          sb[pair.wId] = (sb[pair.wId] || 0) + (sc[pair.bId] || 0);
        } else if (pair.res === '0') {
          sb[pair.bId] = (sb[pair.bId] || 0) + (sc[pair.wId] || 0);
        } else if (pair.res === 'D') {
          sb[pair.wId] = (sb[pair.wId] || 0) + 0.5 * (sc[pair.bId] || 0);
          sb[pair.bId] = (sb[pair.bId] || 0) + 0.5 * (sc[pair.wId] || 0);
        }
      }
    });
  });
  return sb;
}

// Returns { [playerId]: colorBalance }  positive = more whites
function calcColors() {
  const col = {};
  appState.players.forEach(p => { col[p.id] = 0; });
  appState.rounds.forEach(rnd => {
    rnd.pairs.forEach(pair => {
      if (pair.bId === null) return;
      col[pair.wId] = (col[pair.wId] || 0) + 1;
      col[pair.bId] = (col[pair.bId] || 0) - 1;
    });
  });
  return col;
}

// Returns { [playerId]: Set of opponent ids }
function calcOpponents() {
  const opp = {};
  appState.players.forEach(p => { opp[p.id] = new Set(); });
  appState.rounds.forEach(rnd => {
    rnd.pairs.forEach(pair => {
      if (pair.bId === null) return;
      opp[pair.wId].add(pair.bId);
      opp[pair.bId].add(pair.wId);
    });
  });
  return opp;
}

// Returns { [playerId]: byeCount }
function calcByes() {
  const b = {};
  appState.players.forEach(p => { b[p.id] = 0; });
  appState.rounds.forEach(rnd => {
    rnd.pairs.forEach(pair => {
      if (pair.bId === null) b[pair.wId] = (b[pair.wId] || 0) + 1;
    });
  });
  return b;
}

// Laskee uudet ELO-luvut (K-kerroin 20)
function calcElo() {
  const elo = {};
  appState.players.forEach(p => { elo[p.id] = p.rating || 0; });

  appState.rounds.forEach(rnd => {
    rnd.pairs.forEach(pair => {
      if (pair.bId === null || pair.res === null) return;
      
      const w = pair.wId, b = pair.bId;
      const Rw = elo[w], Rb = elo[b];
      
      const Ew = 1 / (1 + Math.pow(10, (Rb - Rw) / 400));
      const Eb = 1 / (1 + Math.pow(10, (Rw - Rb) / 400));
      
      let Sw = 0.5, Sb = 0.5;
      if (pair.res === '1') { Sw = 1; Sb = 0; }
      if (pair.res === '0') { Sw = 0; Sb = 1; }
      
      elo[w] = Math.round(Rw + 20 * (Sw - Ew));
      elo[b] = Math.round(Rb + 20 * (Sb - Eb));
    });
  });
  return elo;
}