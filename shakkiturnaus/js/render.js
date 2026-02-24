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

  const elos = calcElo(); // Lasketaan turnauksen aikaiset Elo-luvut

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
  let html = '<div class="pairing-board">';

  rnd.pairs.forEach((pair, idx) => {
    if (pair.bId === null) {
      const p = playerById(pair.wId);
      html += `<div class="bye-row">
        <span style="font-size:11px;color:var(--muted)">${idx+1}.</span>
        <span class="player-name">${p ? p.name : '?'}</span>
        <span style="font-size:11px;color:var(--muted)">${p?.rating||''} (${elos[pair.wId]})</span>
        <span class="bye-tag">BYE +${fmtScore(appState.cfg.bye)}</span>
      </div>`;
      return;
    }

    const w = playerById(pair.wId);
    const b = playerById(pair.bId);
    const r = pair.res;

    html += `<div class="pairing-row">
      <div class="board-n">${idx+1}</div>
      <div class="player-cell right">
        <span class="player-rtg">${w?.rating||''} (${elos[w.id]})</span>
        <span class="player-name">${w?.name||'?'}</span>
        <span class="color-pip white-pip"></span>
      </div>
      <div class="vs-cell">vs</div>
      <div class="player-cell">
        <span class="color-pip black-pip"></span>
        <span class="player-name">${b?.name||'?'}</span>
        <span class="player-rtg">${b?.rating||''} (${elos[b.id]})</span>
      </div>
      <div class="result-btns">
        <button class="rbtn${r==='1'?' sel-w':''}" onclick="setRes(${appState.view},${idx},'1')" title="Valkoinen voittaa">1–0</button>
        <button class="rbtn${r==='D'?' sel-d':''}" onclick="setRes(${appState.view},${idx},'D')" title="Tasapeli">½–½</button>
        <button class="rbtn${r==='0'?' sel-l':''}" onclick="setRes(${appState.view},${idx},'0')" title="Musta voittaa">0–1</button>
      </div>
    </div>`;
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
  const bh = calcBuchholz(sc);
  const sb = calcSB(sc);

  const sorted = appState.players.filter(p => p.active).sort((a, b) => {
    const ds = (sc[b.id]||0) - (sc[a.id]||0);
    if (Math.abs(ds) > 0.001) return ds;
    const db = (bh[b.id]||0) - (bh[a.id]||0);
    if (Math.abs(db) > 0.001) return db;
    return (sb[b.id]||0) - (sb[a.id]||0);
  });

  if (sorted.length === 0) {
    document.getElementById('standings-body').innerHTML = '<div class="msg">Ei pelaajia.</div>';
    return;
  }

  // Build history per player
  function playerHistory(pid) {
    return appState.rounds.map(rnd => {
      const pair = rnd.pairs.find(p => p.wId === pid || p.bId === pid);
      if (!pair) return '<span class="hc u">·</span>';
      if (pair.bId === null) return '<span class="hc B">B</span>';
      if (pair.res == null) return '<span class="hc u">?</span>';
      const isWhite = pair.wId === pid;
      if (pair.res === 'D') return '<span class="hc D">T</span>';
      const won = (isWhite && pair.res === '1') || (!isWhite && pair.res === '0');
      return `<span class="hc ${won?'W':'L'}">${won?'V':'H'}</span>`;
    }).join('');
  }

  let html = '<table><thead><tr><th>#</th><th>Nimi</th><th>Rating</th><th>Pisteet</th><th>BH</th><th>SB</th><th>Historia</th></tr></thead><tbody>';
  sorted.forEach((p, i) => {
    html += `<tr>
      <td class="td-num">${i+1}</td>
      <td class="td-name">${p.name}</td>
      <td class="td-rating">${p.rating||'—'} (${elos[p.id]})</td>
      <td class="td-score">${fmtScore(sc[p.id]||0)}</td>
      <td class="td-muted">${fmtScore(bh[p.id]||0)}</td>
      <td class="td-muted">${fmtScore(sb[p.id]||0)}</td>
      <td><div class="hist">${playerHistory(p.id)}</div></td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('standings-body').innerHTML = html;
}

// ── CROSS TABLE ──
function renderCross() {
  const sc = calcScores();
  const sorted = appState.players.filter(p => p.active).sort((a, b) => (sc[b.id]||0) - (sc[a.id]||0));

  if (sorted.length === 0) {
    document.getElementById('cross-body').innerHTML = '<div class="msg">Ei pelaajia.</div>';
    return;
  }

  // Build result lookup: res[pid1][pid2] = result from pid1's perspective
  const res = {};
  sorted.forEach(p => { res[p.id] = {}; });

  appState.rounds.forEach(rnd => {
    rnd.pairs.forEach(pair => {
      if (pair.bId === null || pair.res == null) return;
      const w = pair.wId, b = pair.bId;
      if (pair.res === '1') { res[w][b] = '1'; res[b][w] = '0'; }
      else if (pair.res === '0') { res[w][b] = '0'; res[b][w] = '1'; }
      else { res[w][b] = 'D'; res[b][w] = 'D'; }
    });
  });

  let html = '<div class="cross-wrap"><table><thead><tr><th>#</th><th>Nimi</th>';
  sorted.forEach((_, i) => { html += `<th>${i+1}</th>`; });
  html += '<th>Pist.</th></tr></thead><tbody>';

  sorted.forEach((p, i) => {
    html += `<tr><td class="td-num">${i+1}</td><td class="td-name">${p.name}</td>`;
    sorted.forEach(opp => {
      if (opp.id === p.id) {
        html += '<td class="self-cell">×</td>';
      } else {
        const r = res[p.id]?.[opp.id];
        if (r == null) {
          html += '<td class="td-muted">—</td>';
        } else {
          const cls = r==='1'?'cr-w':r==='0'?'cr-l':'cr-d';
          const lbl = r==='1'?'1':r==='0'?'0':'½';
          html += `<td class="${cls}">${lbl}</td>`;
        }
      }
    });
    html += `<td class="td-score">${fmtScore(sc[p.id]||0)}</td></tr>`;
  });

  html += '</tbody></table></div>';
  document.getElementById('cross-body').innerHTML = html;
}

// ── PLAYERS PAGE ──
function renderPlayers() {
  const elos = calcElo(); // Lisää tämä funktion alkuun
  const active = appState.players.filter(p => p.active);
  document.getElementById('player-count').textContent = active.length;

  const tbody = document.getElementById('player-tbody');
  if (appState.players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="td-muted" style="text-align:center;padding:20px">Ei pelaajia. Tuo pelaajat yllä olevalla lomakkeella.</td></tr>';
    return;
  }

  tbody.innerHTML = appState.players.map((p, i) => `
    <tr style="opacity:${p.active?1:0.45}">
      <td class="td-num">${i+1}</td>
      <td class="td-name">${p.name}</td>
      <td class="td-rating">${p.rating||'—'} (${elos[p.id]})</td>
      <td class="td-muted">${p.club||''}</td>
      <td class="td-muted">${p.active?'Aktiivinen':'Ei pelaa'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-sm" onclick="toggleActive(${p.id})">${p.active?'Poista':'Aktivoi'}</button>
          ${appState.rounds.length===0 ? `<button class="btn btn-red btn-sm" onclick="removePlayer(${p.id})">✕</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}