function render() {
  renderSidebar();
  const active = document.querySelector('.tab.active')?.dataset.page || 'pairings';
  if (active === 'pairings')   renderPairings();
  if (active === 'standings')  renderStandings();
  if (active === 'cross')      renderCross();
  if (active === 'players')    renderPlayers();
}

function renderSidebar() {
  const R = appState.rounds.length;
  const maxR = appState.cfg.rounds;
  const info = document.getElementById('sidebar-round-info');

  if (R === 0) {
    info.textContent = 'Pelaajia: ' + appState.players.filter(p=>p.active).length;
  } else {
    const lastRnd = appState.rounds[R-1];
    const done = lastRnd.pairs.filter(p => p.res !== null).length;
    const total = lastRnd.pairs.length;
    info.textContent = `Kierros ${R}/${maxR} — ${done}/${total} tulosta`;
  }

  // Buttons
  const btnNew = document.getElementById('btn-new-round');
  const delWrap = document.getElementById('btn-delete-round-wrap');

  if (R >= maxR) {
    btnNew.textContent = '✓ Turnaus valmis';
    btnNew.disabled = true;
    btnNew.className = 'btn btn-sm';
  } else {
    btnNew.textContent = R === 0 ? '▶ Aloita kierros 1' : `▶ Kierros ${R+1}`;
    btnNew.disabled = false;
    btnNew.className = 'btn btn-green';
  }

  delWrap.style.display = R > 0 ? 'block' : 'none';

  // Stats
  document.getElementById('st-players').textContent = appState.players.filter(p=>p.active).length;
  document.getElementById('st-rounds').textContent  = R;
  const lastRnd = appState.rounds[appState.view];
  document.getElementById('st-boards').textContent  = lastRnd ? lastRnd.pairs.filter(p=>p.bId!==null).length : 0;
  document.getElementById('st-done').textContent    = lastRnd ? lastRnd.pairs.filter(p=>p.res!==null).length : 0;
}

function renderPairings() {
  const body = document.getElementById('pairings-body');
  if (!body) return;

  body.innerHTML = '';

  const R = appState.rounds.length;

  // Päivitä alaotsikko
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

  // Ryhmittele parit
  const pairsByGroup = groupPairsByGroup(rnd.pairs);

  Object.keys(pairsByGroup)
    .sort()
    .forEach(groupKey => {
      fragment.appendChild(createGroupHeader(groupKey));

      pairsByGroup[groupKey].forEach((pair, localIdx) => {
        // TÄRKEÄÄ: Haetaan globaali indeksi rnd.pairs-taulukosta
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

function switchView(i) {
  appState.view = i;
  renderPairings();
  renderSidebar();
}

function setRes(roundIdx, pairIdx, res) {
  const pair = appState.rounds[roundIdx].pairs[pairIdx];
  pair.res = pair.res === res ? null : res; // toggle off if same
  autoSave();
  renderPairings();
  renderSidebar();
}

// ── STANDINGS PAGE ──
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

  // Ryhmittele pelaajat ryhmän mukaan
  const groups = groupPlayersByGroup(activePlayers);

  Object.keys(groups).sort().forEach(groupKey => {
    const groupPlayers = groups[groupKey];
    if (groupPlayers.length === 0) return;

    // Ryhmän otsikko
    fragment.appendChild(createStandingsGroupHeader(groupKey, groupPlayers.length));

    // Lajittele pelaajat: pisteet → Buchholz → Sonneborn-Berger
    const sortedPlayers = sortPlayersForStandings(groupPlayers, scores, buchholz, sonneborn);

    // Luo taulukko
    const table = createStandingsTable(sortedPlayers, scores, buchholz, sonneborn, elos);
    fragment.appendChild(table);
  });

  body.appendChild(fragment);
}

// ── CROSS TABLE ──
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

  // Ryhmittele pelaajat ryhmien mukaan
  const groups = groupPlayersByGroup(activePlayers);

  Object.keys(groups).sort().forEach(groupKey => {
    const groupPlayers = groups[groupKey];

    if (groupPlayers.length < 2) {
      fragment.appendChild(createGroupHeaderForCross(groupKey));
      const msg = createMessage(`Ryhmässä ${groupKey === 'DEFAULT' ? 'oletus' : groupKey} on liian vähän pelaajia kohtaamistietoihin.`);
      fragment.appendChild(msg);
      return;
    }

    // Ryhmän otsikko
    fragment.appendChild(createGroupHeaderForCross(groupKey, groupPlayers.length));

    // Luo ristitaulukko
    const crossTable = createCrossTable(groupPlayers);
    fragment.appendChild(crossTable);
  });

  container.appendChild(fragment);
}

// ── PLAYERS PAGE ──
function renderPlayers() {
  const elos = calcElo();
  const tbody = document.getElementById('player-tbody');
  const countEl = document.getElementById('player-count');

  const players = appState.players;
  countEl.textContent = players.filter(p => p.active).length;

  if (players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="td-muted" style="text-align:center;padding:20px">Ei pelaajia. Lisää tai tuo pelaajat.</td></tr>';
    return;
  }

  tbody.innerHTML = players.map((p, i) => `
    <tr style="opacity:${p.active ? 1 : 0.5}">
      <td class="td-num">${i+1}</td>
      <td class="td-name">${p.name}</td>
      <td class="td-rating">${p.rating || '—'} (${elos[p.id] || '—'})</td>
      <td class="td-muted">${p.club || ''}</td>
      <td>
        <input type="text" value="${p.group || ''}" size="3" 
              ${appState.rounds.length > 0 ? 'disabled title="Ryhmää ei voi muuttaa kun turnaus on alkanut"' : ''}
              onblur="if (${appState.rounds.length === 0}) setGroup(${p.id}, this.value)">
      </td>
      <td class="td-muted">${p.active ? 'Aktiivinen' : 'Ei pelaa'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="toggleActive(${p.id})">
            ${p.active ? 'Poista käytöstä' : 'Aktivoi'}
          </button>
          ${appState.rounds.length === 0 ? 
            `<button class="btn btn-red btn-sm" onclick="removePlayer(${p.id})">Poista</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// Korjattu setGroup – EI kutsu render() suoraan onchange:ssa, vaan renderöi vasta kun input menettää fokus (onblur)
function setGroup(id, val) {
  if (appState.rounds.length > 0) {
    console.warn('Ryhmän muutos estetty: turnaus on käynnissä');
    return; 
  }

  const p = playerById(id);
  if (p) {
    p.group = val.trim().toUpperCase();
    autoSave();
    render();
  }
}