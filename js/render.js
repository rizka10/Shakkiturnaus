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
// js/render.js
// ... muut render-funktiot ennallaan ...

function renderCross() {
  const container = document.getElementById('cross-body');
  if (!container) return;

  const activePlayers = appState.players.filter(p => p.active);
  if (activePlayers.length === 0) {
    container.innerHTML = '<p>Ei aktiivisia pelaajia.</p>';
    return;
  }

  // Ryhmittele aktiiviset pelaajat group-kentän mukaan (tyhjä → 'DEFAULT')
  const groups = {};
  activePlayers.forEach(p => {
    const grp = (p.group || '').trim().toUpperCase() || 'DEFAULT';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(p);
  });

  let html = '';

  // Käy läpi jokainen ryhmä aakkosjärjestyksessä
  Object.keys(groups).sort().forEach(grpKey => {
    const groupPlayers = groups[grpKey];
    if (groupPlayers.length < 2) {
      html += `<div class="group-hdr">${grpKey === 'DEFAULT' ? 'Oletusryhmä' : `Ryhmä ${grpKey}`}</div>
               <p>Ryhmässä liian vähän pelaajia kohtaamistietoihin.</p>`;
      return;
    }

    // Lajittele ryhmän pelaajat nimellä tai rating + nimellä (voit muuttaa)
    groupPlayers.sort((a, b) => a.name.localeCompare(b.name));

    // Luo pelaaja-ID → indeksi -mappi vain tälle ryhmälle (helpottaa taulukon indeksointia)
    const playerIndex = {};
    groupPlayers.forEach((p, idx) => {
      playerIndex[p.id] = idx;
    });

    const groupName = grpKey === 'DEFAULT' ? 'Oletusryhmä (ei ryhmää)' : `Ryhmä ${grpKey}`;
    html += `<div class="group-hdr">${groupName} (${groupPlayers.length} pelaajaa)</div>`;

    // Aloita taulukko
    html += '<table class="cross-table">';

    // Yläreuna: tyhjä solu + pelaajien nimet (lyhennettynä jos pitkä)
    html += '<thead><tr><th></th>';
    groupPlayers.forEach(p => {
      const shortName = p.name.length > 18 ? p.name.substring(0, 15) + '…' : p.name;
      html += `<th title="${p.name}">${shortName}</th>`;
    });
    html += '</tr></thead>';

    // Runko: rivit pelaajille
    html += '<tbody>';
    groupPlayers.forEach((playerRow, rowIdx) => {
      html += '<tr>';
      // Vasen sarake: pelaajan nimi (voit lisätä ratingin tms.)
      html += `<th title="${playerRow.name}">${playerRow.name}</th>`;

      groupPlayers.forEach((playerCol, colIdx) => {
        if (rowIdx === colIdx) {
          html += '<td class="cross-empty">-</td>';
          return;
        }

        // Etsi ottelut näiden kahden välillä (kaikki kierrokset)
        let games = 0;
        let points = 0;
        let display = '';   // ruudussa näytetään str-muodossa pelitulokset (esim "1½1")

        appState.rounds.forEach(round => {
          round.pairs.forEach(pair => {
            if (pair.res === null) {return;}

            let isWhite = null;
            if (pair.wId === playerRow.id && pair.bId === playerCol.id) {
              isWhite = true;
            } else if (pair.wId === playerCol.id && pair.bId === playerRow.id) {
              isWhite = false;
            } else {
              return;
            }
            
            games++;

            if (pair.res === '1') {
              const char = isWhite ? '1' : '0';
              display += char;
              points += isWhite ? 1 : 0;
            } else if (pair.res === '0') {
              const char = isWhite ? '0' : '1';
              display += char;
              points += isWhite ? 0 : 1;
            } else if (pair.res === 'D') {
              display += '½';
              points += 0.5;
            }
          });
        });

        let cls = '';
        if (games === 0) { cls = 'cross-none' }
        else if (points === games) { cls = 'cross-win' }
        else if (points / games > 0.5) { cls = 'cross-good' }
        else if (points === games / 2) { cls = 'cross-draw' }
        else if (points / games > 0) { cls = 'cross-bad' }
        else cls = 'cross-loss';

        html += `<td class="${cls}">${display}</td>`;
      });

      html += '</tr>';
    });

    html += '</tbody></table>';
  });

  container.innerHTML = html || '<p>Ei ryhmiä tai pelaajia.</p>';
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