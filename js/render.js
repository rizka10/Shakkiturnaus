function render() {
  renderSidebar();

  const activePage = document.querySelector('.tab.active')?.dataset.page || 'pairings';

  switch (activePage) {
    case 'pairings':
      renderPairings();
      break;
    case 'standings':
      renderStandings();
      break;
    case 'cross':
      renderCross();
      break;
    case 'players':
      renderPlayers();
      break;
    // settings-sivu ei tarvitse renderöintiä
  }
}

// ═══════════════════════════════════════════════════════
// Sidebar
// ═══════════════════════════════════════════════════════

function renderSidebar() {
  const R = appState.rounds.length;
  const maxR = appState.cfg.rounds;

  // Kierros-info
  const infoEl = document.getElementById('sidebar-round-info');
  if (infoEl) {
    if (R === 0) {
      const activeCount = appState.players.filter(p => p.active).length;
      infoEl.textContent = `Pelaajia: ${activeCount}`;
    } else {
      const lastRnd = appState.rounds[R - 1];
      const done = lastRnd.pairs.filter(p => p.res !== null).length;
      const total = lastRnd.pairs.length;
      infoEl.textContent = `Kierros ${R}/${maxR} — ${done}/${total} tulosta`;
    }
  }

  // "Luo uusi kierros" -nappi
  const btnNew = document.getElementById('btn-new-round');
  const delWrap = document.getElementById('btn-delete-round-wrap');

  if (btnNew) {
    if (R >= maxR) {
      btnNew.textContent = '✓ Turnaus valmis';
      btnNew.disabled = true;
      btnNew.className = 'btn btn-sm';
    } else {
      btnNew.textContent = R === 0 ? '▶ Aloita kierros 1' : `▶ Kierros ${R + 1}`;
      btnNew.disabled = false;
      btnNew.className = 'btn btn-green';
    }
  }

  // Poista kierros -nappulan näkyvyys
  if (delWrap) {
    delWrap.style.display = R > 0 ? 'block' : 'none';
  }

  // Statistiikkapalkki
  updateStatBar(R);
}

// ═══════════════════════════════════════════════════════
// Pairings
// ═══════════════════════════════════════════════════════

function renderPairings() {
  const body = document.getElementById('pairings-body');
  if (!body) return;

  body.innerHTML = '';

  const R = appState.rounds.length;

  const subEl = document.getElementById('pairings-sub');
  if (subEl) {
    subEl.textContent = R === 0 
      ? '' 
      : `Kierros ${appState.view + 1} / ${appState.cfg.rounds}`;
  }

  if (R === 0) {
    body.appendChild(createMessage("Lisää pelaajat Pelaajat-välilehdeltä ja luo paritukset vasemmalta."));
    return;
  }

  const fragment = document.createDocumentFragment();
  const rnd = appState.rounds[appState.view];
  const scoresBefore = calcScores(appState.view);

  const pairsByGroup = groupPairsByGroup(rnd.pairs);

  Object.keys(pairsByGroup)
    .sort()
    .forEach(groupKey => {
      fragment.appendChild(createGroupHeader(groupKey));

      pairsByGroup[groupKey].forEach((pair, localIdx) => {
        const globalIdx = rnd.pairs.findIndex(p => 
          p.wId === pair.wId && 
          p.bId === pair.bId && 
          (p.group || 'DEFAULT') === (pair.group || 'DEFAULT')
        );

        const row = createPairingRow(pair, localIdx, scoresBefore, appState.view, globalIdx);
        fragment.appendChild(row);
      });
    });

  body.appendChild(fragment);
}

// ═══════════════════════════════════════════════════════
// Standings
// ═══════════════════════════════════════════════════════

function renderStandings() {
  const body = document.getElementById('standings-body');
  if (!body) return;

  body.innerHTML = '';

  const activePlayers = appState.players.filter(p => p.active);
  if (activePlayers.length === 0) {
    body.appendChild(createMessage("Ei aktiivisia pelaajia."));
    return;
  }

  const fragment = document.createDocumentFragment();
  const scores = calcScores();
  const buchholz = calcBuchholz(scores);
  const sonneborn = calcSB(scores);
  const elos = calcElo();

  const groups = groupPlayersByGroup(activePlayers);

  Object.keys(groups).sort().forEach(groupKey => {
    const groupPlayers = groups[groupKey];
    if (groupPlayers.length === 0) return;

    fragment.appendChild(createGroupHeader(groupKey, groupPlayers.length));

    const sortedPlayers = sortPlayersForStandings(groupPlayers, scores, buchholz, sonneborn);
    const table = createStandingsTable(sortedPlayers, scores, buchholz, sonneborn, elos);
    fragment.appendChild(table);
  });

  body.appendChild(fragment);
}

// ═══════════════════════════════════════════════════════
// Cross Table
// ═══════════════════════════════════════════════════════

function renderCross() {
  const container = document.getElementById('cross-body');
  if (!container) return;

  container.innerHTML = '';

  const activePlayers = appState.players.filter(p => p.active);
  if (activePlayers.length === 0) {
    container.appendChild(createMessage("Ei aktiivisia pelaajia."));
    return;
  }

  const fragment = document.createDocumentFragment();
  const groups = groupPlayersByGroup(activePlayers);

  Object.keys(groups).sort().forEach(groupKey => {
    const groupPlayers = groups[groupKey];

    if (groupPlayers.length < 2) {
      fragment.appendChild(createGroupHeader(groupKey));
      const msg = createMessage(`Ryhmässä ${groupKey === 'DEFAULT' ? 'oletus' : groupKey} on liian vähän pelaajia kohtaamistietoihin.`);
      fragment.appendChild(msg);
      return;
    }

    fragment.appendChild(createGroupHeader(groupKey, groupPlayers.length));

    const crossTable = createCrossTable(groupPlayers);
    fragment.appendChild(crossTable);
  });

  container.appendChild(fragment);
}

// ═══════════════════════════════════════════════════════
// Players
// ═══════════════════════════════════════════════════════

function renderPlayers() {
  const tbody = document.getElementById('player-tbody');
  const countEl = document.getElementById('player-count');
  if (!tbody || !countEl) return;

  const players = appState.players;
  countEl.textContent = players.filter(p => p.active).length;

  tbody.innerHTML = '';

  if (players.length === 0) {
    tbody.appendChild(createEmptyPlayersRow());
    return;
  }

  const fragment = document.createDocumentFragment();
  const elos = calcElo();

  players.forEach((player, index) => {
    const row = createPlayerRow(player, index, elos);
    fragment.appendChild(row);
  });

  tbody.appendChild(fragment);
}

// ═══════════════════════════════════════════════════════
// Statistiikkapalkki
// ═══════════════════════════════════════════════════════

function updateStatBar(currentRounds) {
  const activePlayers = appState.players.filter(p => p.active).length;
  setStatValue('st-players', activePlayers);
  setStatValue('st-rounds', currentRounds);

  const lastRnd = appState.rounds[appState.view];
  const boards = lastRnd ? lastRnd.pairs.filter(p => p.bId !== null).length : 0;
  const done = lastRnd ? lastRnd.pairs.filter(p => p.res !== null).length : 0;

  setStatValue('st-boards', boards);
  setStatValue('st-done', done);
}

function setStatValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}