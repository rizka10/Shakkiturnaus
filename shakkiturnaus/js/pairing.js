function createRound() {
  const active = appState.players.filter(p => p.active);
  if (active.length < 2) return alert('Tarvitaan vähintään 2 pelaajaa.');

  const sc = calcScores(), col = calcColors(), opp = calcOpponents(), byes = calcByes();

  // 1. Lajittelu: Pisteet, sitten Rating
  const sorted = [...active].sort((a, b) => (sc[b.id] || 0) - (sc[a.id] || 0) || (b.rating || 0) - (a.rating || 0));

  const pairs = [];
  const used = new Set();

  // 2. BYE-käsittely (kuten aiemmin)
  if (sorted.length % 2 === 1) {
    let byeTarget = sorted.slice().reverse().find(p => !byes[p.id]) || sorted[sorted.length - 1];
    pairs.push({ wId: byeTarget.id, bId: null, res: '1' });
    used.add(byeTarget.id);
  }

  // 3. Järjestetään paritusjonoon "Sveitsiläisellä puolituksella"
  const remaining = sorted.filter(p => !used.has(p.id));
  
  // Ryhmitellään pelaajat pisteiden mukaan
  const groups = {};
  remaining.forEach(p => {
    const s = sc[p.id] || 0;
    if (!groups[s]) groups[s] = [];
    groups[s].push(p);
  });

  // Luodaan uusi "haastelista", jossa kunkin pisteryhmän yläosa kohtaa alaosan
  let swissSortedList = [];
  const sortedScores = Object.keys(groups).map(Number).sort((a, b) => b - a);
  
  sortedScores.forEach(score => {
    const group = groups[score];
    const mid = Math.ceil(group.length / 2);
    const top = group.slice(0, mid);
    const bottom = group.slice(mid);
    
    // Tässä on "taika": lisätään listaan vuorotellen ylä- ja alaosan pelaaja
    // esim. [1, 41, 2, 42...] -> tryPair parittaa silloin 1-41, 2-42 jne.
    for (let i = 0; i < mid; i++) {
      if (top[i]) swissSortedList.push(top[i]);
      if (bottom[i]) swissSortedList.push(bottom[i]);
    }
  });

  // 4. Rekursiivinen paritus (Backtracking)
  function tryPair(list, allowRematch) {
    if (list.length === 0) return [];
    
    const p1 = list[0];
    const options = list.slice(1);

    for (let i = 0; i < options.length; i++) {
      const p2 = options[i];
      if (!allowRematch && opp[p1.id].has(p2.id)) continue;

      let w = p1, b = p2;
      
      // MUUTOS TÄSSÄ: 1. kierroksen värit (Vahvin valkeilla, 2. vahvin mustilla jne.)
      if (appState.rounds.length === 0) {
          const p1Index = active.findIndex(p => p.id === p1.id);
          if (p1Index % 2 === 1) { [w, b] = [p2, p1]; }
      } else {
          // Normaalit värisäännöt myöhemmillä kierroksilla
          if ((col[p1.id] || 0) > (col[p2.id] || 0)) { [w, b] = [p2, p1]; }
          else if ((col[p1.id] || 0) === (col[p2.id] || 0) && (p1.rating || 0) < (p2.rating || 0)) { [w, b] = [p2, p1]; }
      }

      const res = tryPair(options.filter(p => p.id !== p2.id), allowRematch);
      if (res !== null) return [{ wId: w.id, bId: b.id, res: null }, ...res];
    }
    return null;
  }

  let result = tryPair(swissSortedList, false) || tryPair(swissSortedList, true);
  
  if (result) {
    result.forEach(p => pairs.push(p));
    appState.rounds.push({ pairs });
    appState.view = appState.rounds.length - 1;
    render();
  } else {
    alert("Paritus epäonnistui!");
  }
}
