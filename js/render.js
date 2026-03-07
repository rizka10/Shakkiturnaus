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
  const R = appState.rounds.length;
  const sub = document.getElementById('pairings-sub');
  sub.textContent = R === 0 ? '' : `Kierros ${appState.view+1} / ${appState.cfg.rounds}`;

  const scoresBefore = calcScores(appState.view);

  const tabsEl = document.getElementById('round-tabs');
  tabsEl.innerHTML = appState.rounds.map((_, i) =>
    `<button class="rtab${i===appState.view?' active':''}" onclick="switchView(${i})">K${i+1}</button>`
  ).join('');

  const body = document.getElementById('pairings-body');

  if (R === 0) {
    body.innerHTML = '<div class="msg">Ei parituksia. Lisää pelaajat ja luo kierros vasemmalta.</div>';
    return;
  }

  const rnd = appState.rounds[appState.view];
  const pairsByGroup = {};
  rnd.pairs.forEach(pair => {
    const grp = pair.group || 'DEFAULT';
    if (!pairsByGroup[grp]) pairsByGroup[grp] = [];
    pairsByGroup[grp].push(pair);
  });

  let html = '';
  Object.keys(pairsByGroup).sort().forEach(grp => {
    html += `<div class="group-hdr">${grp === 'DEFAULT' ? 'Oletusryhmä' : `Ryhmä ${grp}`}</div>`;
    pairsByGroup[grp].forEach((pair, idx) => {
      const globalIdx = rnd.pairs.findIndex(p => 
        p.wId === pair.wId && 
        p.bId === pair.bId && 
        (p.group || 'DEFAULT') === (pair.group || 'DEFAULT')
      );

      if (pair.bId === null) {
        const p = playerById(pair.wId);
        const r = pair.res; // Nyt voi olla '1', 'D', '0' tai null

        html += `<div class="pairing-row">
          <div class="board-n">${idx+1}</div>
          
          <div class="player-cell right">
            <span class="pts-before">${fmtScore(scoresBefore[pair.wId] || 0)}</span>
            <span class="player-name">${p?.name||'?'} <span class="bye-tag">(BYE)</span></span>
            <span class="color-pip white-pip"></span>
          </div>
          
          <div class="vs-cell">vs</div>
          
          <div class="player-cell">
            <span class="color-pip"></span> <!-- tyhjä musta -->
            <span class="player-name bye-opponent">—</span>
            <span class="pts-before"></span>
          </div>
          
          <div class="result-btns">
            <button class="rbtn${r==='1'?' sel-w':''}" onclick="setRes(${appState.view},${globalIdx},'1')" title="Valkoinen saa pisteen">1–0</button>
            <button class="rbtn${r==='D'?' sel-d':''}" onclick="setRes(${appState.view},${globalIdx},'D')" title="½ pistettä bye:stä">½–½</button>
            <button class="rbtn${r==='0'?' sel-l':''}" onclick="setRes(${appState.view},${globalIdx},'0')" title="Ei pisteitä (harvinainen)">0–1</button>
          </div>
        </div>`;
        return;
      }

      const w = playerById(pair.wId);
      const b = playerById(pair.bId);
      const r = pair.res;

      html += `<div class="pairing-row">
        <div class="board-n">${idx+1}</div>
        <div class="player-cell right">
          <span class="player-name">${w?.name||'?'}</span>
          <span class="pts-before">${fmtScore(scoresBefore[w?.id] || 0)}</span>
          <span class="color-pip white-pip"></span>
        </div>
        <div class="vs-cell">vs</div>
        <div class="player-cell">
          <span class="color-pip black-pip"></span>
          <span class="player-name">${b?.name||'?'}</span>
          <span class="pts-before">${fmtScore(scoresBefore[b?.id] || 0)}</span>
        </div>
        <div class="result-btns">
          <button class="rbtn${r==='1'?' sel-w':''}" onclick="setRes(${appState.view},${globalIdx},'1')" title="Valkoinen voittaa">1–0</button>
          <button class="rbtn${r==='D'?' sel-d':''}" onclick="setRes(${appState.view},${globalIdx},'D')" title="Tasapeli">½–½</button>
          <button class="rbtn${r==='0'?' sel-l':''}" onclick="setRes(${appState.view},${globalIdx},'0')" title="Musta voittaa">0–1</button>
        </div>
      </div>`;
    });
  });

  html += '</div>';
  body.innerHTML = html;
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
  const sc = calcScores();
  const elos = calcElo(); // Lisää tämä, jos haluat näyttää reaaliaikaiset Elot

  // Ryhmittely
  const groups = {};
  appState.players.filter(p => p.active).forEach(p => {
    const grp = (p.group || '').trim().toUpperCase() || 'DEFAULT';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(p);
  });

  let html = '';

  Object.keys(groups).sort().forEach(grpKey => {
    let groupPlayers = groups[grpKey];
    if (groupPlayers.length === 0) return;

    const bh = calcBuchholz(sc, groupPlayers);
    const sb = calcSB(sc, groupPlayers);

    // Lajittelu: pisteet > buchholz > sonneborn-berger
    const sorted = groupPlayers.slice().sort((a, b) => {
      const ds = (sc[b.id] || 0) - (sc[a.id] || 0);
      if (Math.abs(ds) > 0.001) return ds;
      const db = (bh[b.id] || 0) - (bh[a.id] || 0);
      if (Math.abs(db) > 0.001) return db;
      return (sb[b.id] || 0) - (sb[a.id] || 0);
    });

    const groupName = grpKey === 'DEFAULT' ? 'Oletusryhmä' : `Ryhmä ${grpKey}`;
    html += `<div class="group-hdr">${groupName} (${sorted.length} pelaajaa)</div>`;

    if (sorted.length === 0) {
      html += '<div class="msg">Ei pelaajia tässä ryhmässä.</div>';
      return;
    }

    // Pelaajahistoria-funktio (voit siirtää uloskin)
    function playerHistory(pid) {
      return appState.rounds.map(rnd => {
        const pair = rnd.pairs.find(p => p.wId === pid || p.bId === pid);
        if (!pair) return '<span class="hc u">·</span>';
        if (pair.bId === null) return '<span class="hc B">B</span>';
        if (pair.res === null) return '<span class="hc u">?</span>';
        const isWhite = pair.wId === pid;
        if (pair.res === 'D') return '<span class="hc D">T</span>';
        const won = (isWhite && pair.res === '1') || (!isWhite && pair.res === '0');
        return `<span class="hc ${won ? 'W' : 'L'}">${won ? 'V' : 'H'}</span>`;
      }).join('');
    }

    html += '<table><thead><tr>' +
      '<th>#</th><th>Nimi</th><th>Rating</th><th>Pisteet</th><th>BH</th><th>SB</th><th>Historia</th>' +
      '</tr></thead><tbody>';

    sorted.forEach((p, i) => {
      html += `<tr>
        <td class="td-num">${i+1}</td>
        <td class="td-name">${p.name}</td>
        <td class="td-rating">${p.rating || '—'} (${elos[p.id] || '—'})</td>
        <td class="td-score">${fmtScore(sc[p.id] || 0)}</td>
        <td class="td-muted">${fmtScore(bh[p.id] || 0)}</td>
        <td class="td-muted">${fmtScore(sb[p.id] || 0)}</td>
        <td><div class="hist">${playerHistory(p.id)}</div></td>
      </tr>`;
    });

    html += '</tbody></table>';
  });

  const body = document.getElementById('standings-body');
  body.innerHTML = html || '<div class="msg">Ei aktiivisia pelaajia.</div>';
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

// LISÄYS: Funktio group-muutokselle (events.js hoitaa listenerin, mutta määrittele täällä)
function setGroup(id, val) {
  const p = playerById(id);
  if (p) p.group = val.trim().toUpperCase();
  autoSave();
  render();
}