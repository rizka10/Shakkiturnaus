// LISÄYS: Apufunktio bye-ehdokkaalle (v7: ei uusille, ei toista byea)
function findByeCandidate(players, byes) {
  return players.slice().reverse().find(p => byes[p.id] === 0) || players[players.length - 1];
}

// MUUTOS: createRound() – ryhmittely ja ryhmäkohtainen paritus
function createRound() {

  const active = appState.players.filter(p => p.active);
  if (active.length < 2) return showModal('Virhe', 'Tarvitaan vähintään 2 pelaajaa.');

  const gamesPerPair = appState.cfg.gamesPerPair || 1;
  const currentRoundIndex = appState.rounds.length; // 0 = ensimmäinen kierros
  
  // Tarkistetaan tulisiko pelaajien pelata uusintaottelu vaihtovärein.
  if (currentRoundIndex % gamesPerPair !== 0) {
    const prevPairs = appState.rounds[currentRoundIndex - 1].pairs;
    const reversedColorsPairs = prevPairs.map(pair => {
      if (pair.bId === null) {
        return { ...pair }; // Bye pysyy samana (ei vaihdeta väriäkään)
      }

      return { wId: pair.bId, bId: pair.wId, res: null, group: pair.group };
    });

    appState.rounds.push({ pairs: reversedColorsPairs });
    appState.view = appState.rounds.length - 1;
    autoSave();
    render();
    return; // lopetetaan tähän – ei uutta paritusta
  }

  const sc = calcScores(), col = calcColors(), opp = calcOpponents(), byes = calcByes();

  // Ryhmittele pelaajat group:in mukaan (tyhjä = oletus)
  const groups = {};
  active.forEach(p => {
    const grp = p.group.toUpperCase() || 'DEFAULT';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(p);
  });

  const allPairs = [];
  Object.keys(groups).forEach(grp => {
    let groupPlayers = groups[grp];
    if (groupPlayers.length < 2) return; // Ei paritusta pienille ryhmille

    // Lajittelu pisteet + rating
    groupPlayers = groupPlayers.sort((a, b) => (sc[b.id] || 0) - (sc[a.id] || 0) || (b.rating || 0) - (a.rating || 0));

    // Bye jos pariton (v7-tyyli)
    let byePair = null;
    if (groupPlayers.length % 2 === 1) {
      const byeTarget = findByeCandidate(groupPlayers, byes);
      byePair = { wId: byeTarget.id, bId: null, res: '1', group: grp };
      groupPlayers = groupPlayers.filter(p => p.id !== byeTarget.id);
    }

    // Sveitsiläinen puolitus ryhmässä
    const sortedScores = [...new Set(groupPlayers.map(p => sc[p.id] || 0))].sort((a, b) => b - a);
    let swissSortedList = [];
    sortedScores.forEach(score => {
      const g = groupPlayers.filter(p => (sc[p.id] || 0) === score);
      const mid = Math.ceil(g.length / 2);
      const top = g.slice(0, mid);
      const bottom = g.slice(mid);
      for (let i = 0; i < Math.max(top.length, bottom.length); i++) {
        if (top[i]) swissSortedList.push(top[i]);
        if (bottom[i]) swissSortedList.push(bottom[i]);
      }
    });

    // Rekursiivinen paritus (ennallaan, mutta ryhmässä)
    function tryPair(list, allowRematch) {
      if (list.length === 0) return [];
      const p1 = list[0];
      const options = list.slice(1);
      for (let i = 0; i < options.length; i++) {
        const p2 = options[i];
        if (!allowRematch && opp[p1.id].has(p2.id)) continue;
        let w = p1, b = p2;
        if (appState.rounds.length === 0) {
          const p1Index = groupPlayers.findIndex(p => p.id === p1.id);
          if (p1Index % 2 === 1) { [w, b] = [p2, p1]; }
          else if ((col[p1.id]||0) > (col[p2.id]||0)) { [w, b] = [p2, p1]; }
          else if ((col[p1.id]||0) === (col[p2.id]||0) && (p1.rating||0) < (p2.rating||0)) { [w, b] = [p2, p1]; }
        }
        
        const res = tryPair(options.filter(p => p.id !== p2.id), allowRematch);
        if (res !== null) return [{ wId: w.id, bId: b.id, res: null, group: grp }, ...res];
      }
      return null;
    }

    let result = tryPair(swissSortedList, false) || tryPair(swissSortedList, true);
    if (result) {
      result.forEach(pair => pair.group = grp);
      allPairs.push(...result);
      if (byePair) {allPairs.push(byePair);}
    } else {
      showModal('Virhe', `Paritus epäonnistui ryhmässä ${grp === 'DEFAULT' ? 'oletus' : grp}`);
      return;
    }
  });

  if (allPairs.length > 0) {
    appState.rounds.push({ pairs: allPairs });
    appState.view = appState.rounds.length - 1;
    autoSave();
    render();
  } else {
    showModal('Virhe', 'Ei tarpeeksi pelaajia ryhmissä.');
  }
}
