// ═══════════════════════════════════════════════════════
// dom-utils.js — Kaikki DOM-rakentelufunktiot
// ═══════════════════════════════════════════════════════

// Yleinen helper HTML-elementin luomiseen
function createElement(tag, className = '', textContent = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

// Viestilaatikko (käytetään monessa paikassa)
function createMessage(text, extraClass = '') {
  const div = createElement('div', `msg ${extraClass}`.trim());
  div.textContent = text;
  return div;
}

// ═══════════════════════════════════════════════════════
// Yhteiset otsikot
// ═══════════════════════════════════════════════════════

function createGroupHeader(groupKey, count = null) {
  const div = createElement('div', 'group-hdr');

  let title = groupKey === 'DEFAULT' 
    ? 'Oletusryhmä' 
    : `Ryhmä ${groupKey}`;

  if (count !== null) {
    const word = (count === 1) ? 'pelaaja' : 'pelaajaa';
    title += ` (${count} ${word})`;
  }

  div.textContent = title;
  return div;
}

// ═══════════════════════════════════════════════════════
// renderPairings apufunktiot
// ═══════════════════════════════════════════════════════

function createPairingRow(pair, localBoardIdx, scoresBefore, roundIdx, globalPairIdx) {
  const row = createElement('div', 'pairing-row');

  // Taulun numero
  const boardDiv = createElement('div', 'board-n', (localBoardIdx + 1).toString());
  row.appendChild(boardDiv);

  if (pair.bId === null) {
    row.appendChild(createByeRow(pair, scoresBefore[pair.wId] || 0, roundIdx, globalPairIdx));
    return row;
  }

  // Normaali peli
  const whitePlayer = playerById(pair.wId);
  const blackPlayer = playerById(pair.bId);

  row.appendChild(createPlayerCell(whitePlayer, scoresBefore[pair.wId] || 0, true));
  
  const vsDiv = createElement('div', 'vs-cell', 'vs');
  row.appendChild(vsDiv);

  row.appendChild(createPlayerCell(blackPlayer, scoresBefore[pair.bId] || 0, false));

  row.appendChild(createResultButtons(pair, roundIdx, globalPairIdx, pair.res));

  return row;
}

function createPlayerCell(player, scoreBefore, isWhite) {
  const cell = createElement('div', `player-cell ${isWhite ? 'right' : ''}`);

  const nameSpan = createElement('span', 'player-name', player?.name || '?');
  const ptsSpan = createElement('span', 'pts-before', fmtScore(scoreBefore));
  const pip = createElement('span', `color-pip ${isWhite ? 'white-pip' : 'black-pip'}`);

  if (isWhite) {
    cell.append(ptsSpan, nameSpan, pip);
  } else {
    cell.append(pip, nameSpan, ptsSpan);
  }

  return cell;
}

function createByeRow(pair, scoreBefore, roundIdx, globalPairIdx) {
  const container = createElement('div');
  container.style.display = 'contents';

  const whiteCell = createElement('div', 'player-cell right');
  const ptsSpan = createElement('span', 'pts-before', fmtScore(scoreBefore));
  const nameSpan = createElement('span', 'player-name', playerById(pair.wId)?.name || '?');
  const byeTag = createElement('span', 'bye-tag', '(BYE)');
  const pip = createElement('span', 'color-pip white-pip');

  whiteCell.append(ptsSpan, nameSpan, byeTag, pip);

  const vsDiv = createElement('div', 'vs-cell', 'vs');

  const blackCell = createElement('div', 'player-cell');
  const emptyPip = createElement('span', 'color-pip');
  const emptyName = createElement('span', 'player-name bye-opponent', '—');
  blackCell.append(emptyPip, emptyName);

  container.append(whiteCell, vsDiv, blackCell);
  container.appendChild(createResultButtons(pair, roundIdx, globalPairIdx, pair.res));

  return container;
}

function createResultButtons(pair, roundIdx, globalPairIdx, currentRes) {
  const container = createElement('div', 'result-btns');

  const options = [
    { text: '1–0', value: '1', title: 'Valkoinen voittaa', selClass: 'sel-w' },
    { text: '½–½', value: 'D', title: 'Tasapeli', selClass: 'sel-d' },
    { text: '0–1', value: '0', title: 'Musta voittaa', selClass: 'sel-l' }
  ];

  options.forEach(opt => {
    const btn = createElement('button', `rbtn ${currentRes === opt.value ? opt.selClass : ''}`);
    btn.textContent = opt.text;
    btn.title = opt.title;

    btn.addEventListener('click', () => {
      setRes(roundIdx, globalPairIdx, opt.value);
    });

    container.appendChild(btn);
  });

  return container;
}

// ═══════════════════════════════════════════════════════
// renderStandings apufunktiot
// ═══════════════════════════════════════════════════════

function createStandingsTable(players, scores, buchholz, sonneborn, elos) {
  const table = createElement('table');

  // Otsikko
  const thead = createElement('thead');
  const headerRow = createElement('tr');
  ['#', 'Nimi', 'Rating', 'Pisteet', 'BH', 'SB', 'Historia'].forEach(text => {
    const th = createElement('th', '', text);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Runko
  const tbody = createElement('tbody');

  players.forEach((player, index) => {
    const row = createElement('tr');

    row.appendChild(createElement('td', 'td-num', (index + 1).toString()));
    row.appendChild(createElement('td', 'td-name', player.name));

    const ratingTd = createElement('td', 'td-rating');
    ratingTd.textContent = `${player.rating || '—'} (${elos[player.id] || '—'})`;
    row.appendChild(ratingTd);

    row.appendChild(createElement('td', 'td-score', fmtScore(scores[player.id] || 0)));
    row.appendChild(createElement('td', 'td-muted', fmtScore(buchholz[player.id] || 0)));
    row.appendChild(createElement('td', 'td-muted', fmtScore(sonneborn[player.id] || 0)));

    const histTd = createElement('td');
    histTd.appendChild(createPlayerHistory(player.id));
    row.appendChild(histTd);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  return table;
}

function createPlayerHistory(playerId) {
  const container = createElement('div', 'hist');

  appState.rounds.forEach(round => {
    const pair = round.pairs.find(p => p.wId === playerId || p.bId === playerId);
    const span = createElement('span', 'hc');

    if (!pair) {
      span.classList.add('u');
      span.textContent = '·';
    } else if (pair.bId === null) {
      span.classList.add('B');
      span.textContent = 'B';
    } else if (pair.res === null) {
      span.classList.add('u');
      span.textContent = '?';
    } else if (pair.res === 'D') {
      span.classList.add('D');
      span.textContent = 'T';
    } else {
      const isWhite = pair.wId === playerId;
      const won = (isWhite && pair.res === '1') || (!isWhite && pair.res === '0');
      span.classList.add(won ? 'W' : 'L');
      span.textContent = won ? 'V' : 'H';
    }

    container.appendChild(span);
  });

  return container;
}

// ═══════════════════════════════════════════════════════
// renderCross apufunktiot
// ═══════════════════════════════════════════════════════

function createCrossTable(groupPlayers) {
  const table = createElement('table', 'cross-table');

  // Yläotsikko
  const thead = createElement('thead');
  const headerRow = createElement('tr');
  headerRow.appendChild(createElement('th')); // tyhjä kulma

  groupPlayers.forEach(player => {
    const th = createElement('th');
    const shortName = player.name.length > 18 ? player.name.substring(0, 15) + '…' : player.name;
    th.textContent = shortName;
    th.title = player.name;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Runko
  const tbody = createElement('tbody');

  groupPlayers.forEach((rowPlayer, rowIdx) => {
    const tr = createElement('tr');

    // Vasen nimi
    const nameTh = createElement('th', '', rowPlayer.name);
    nameTh.title = rowPlayer.name;
    tr.appendChild(nameTh);

    // Kohtaamiset
    groupPlayers.forEach((colPlayer, colIdx) => {
      if (rowIdx === colIdx) {
        const td = createElement('td', 'cross-empty', '—');
        tr.appendChild(td);
        return;
      }
      tr.appendChild(createCrossCell(rowPlayer.id, colPlayer.id));
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

function createCrossCell(playerRowId, playerColId) {
  const td = createElement('td');

  let games = 0;
  let points = 0;
  let display = '';

  appState.rounds.forEach(round => {
    round.pairs.forEach(pair => {
      if (pair.res === null) return;

      let isWhite = null;
      if (pair.wId === playerRowId && pair.bId === playerColId) isWhite = true;
      else if (pair.wId === playerColId && pair.bId === playerRowId) isWhite = false;
      else return;

      games++;

      if (pair.res === '1') {
        display += isWhite ? '1' : '0';
        points += isWhite ? 1 : 0;
      } else if (pair.res === '0') {
        display += isWhite ? '0' : '1';
        points += isWhite ? 0 : 1;
      } else if (pair.res === 'D') {
        display += '½';
        points += 0.5;
      }
    });
  });

  if (games === 0) {
    td.className = 'cross-none';
  } else if (points === games) {
    td.className = 'cross-win';
  } else if (points / games > 0.5) {
    td.className = 'cross-good';
  } else if (points === games / 2) {
    td.className = 'cross-draw';
  } else if (points / games > 0) {
    td.className = 'cross-bad';
  } else {
    td.className = 'cross-loss';
  }

  td.textContent = display;
  return td;
}

// ═══════════════════════════════════════════════════════
// renderPlayers apufunktiot
// ═══════════════════════════════════════════════════════

function createEmptyPlayersRow() {
  const tr = createElement('tr');
  const td = createElement('td');
  td.colSpan = 7;
  td.className = 'td-muted';
  td.style.textAlign = 'center';
  td.style.padding = '20px';
  td.textContent = 'Ei pelaajia. Lisää tai tuo pelaajat.';
  tr.appendChild(td);
  return tr;
}

function createPlayerRow(player, index, elos) {
  const tr = createElement('tr');
  if (!player.active) tr.style.opacity = '0.5';

  tr.appendChild(createElement('td', 'td-num', (index + 1).toString()));
  tr.appendChild(createElement('td', 'td-name', player.name));

  const ratingTd = createElement('td', 'td-rating');
  ratingTd.textContent = `${player.rating || '—'} (${elos[player.id] || '—'})`;
  tr.appendChild(ratingTd);

  tr.appendChild(createElement('td', 'td-muted', player.club || ''));

  // Ryhmä-sarake
  const groupTd = createElement('td');
  const groupInput = document.createElement('input');
  groupInput.type = 'text';
  groupInput.value = player.group || '';
  groupInput.size = 3;
  groupInput.style.fontFamily = 'JetBrains Mono, monospace';

  if (appState.rounds.length > 0) {
    groupInput.disabled = true;
    groupInput.title = 'Ryhmää ei voi muuttaa kun turnaus on alkanut';
  } else {
    groupInput.addEventListener('blur', () => setGroup(player.id, groupInput.value));
  }
  groupTd.appendChild(groupInput);
  tr.appendChild(groupTd);

  tr.appendChild(createElement('td', 'td-muted', player.active ? 'Aktiivinen' : 'Ei pelaa'));

  // Toiminnot
  const actionsTd = createElement('td');
  const btnContainer = createElement('div');
  btnContainer.style.display = 'flex';
  btnContainer.style.gap = '6px';

  const toggleBtn = createElement('button', 'btn btn-ghost btn-sm', 
    player.active ? 'Poista käytöstä' : 'Aktivoi');
  toggleBtn.addEventListener('click', () => toggleActive(player.id));
  btnContainer.appendChild(toggleBtn);

  if (appState.rounds.length === 0) {
    const removeBtn = createElement('button', 'btn btn-red btn-sm', 'Poista');
    removeBtn.addEventListener('click', () => removePlayer(player.id));
    btnContainer.appendChild(removeBtn);
  }

  actionsTd.appendChild(btnContainer);
  tr.appendChild(actionsTd);

  return tr;
}

// ═══════════════════════════════════════════════════════
// Ryhmittelyfunktiot
// ═══════════════════════════════════════════════════════

function groupPlayersByGroup(players) {
  const groups = {};
  players.forEach(player => {
    const key = (player.group || '').trim().toUpperCase() || 'DEFAULT';
    if (!groups[key]) groups[key] = [];
    groups[key].push(player);
  });
  return groups;
}

function groupPairsByGroup(pairs) {
  const groups = {};
  pairs.forEach(pair => {
    const key = pair.group || 'DEFAULT';
    if (!groups[key]) groups[key] = [];
    groups[key].push(pair);
  });
  return groups;
}

// Exportataan kaikki globaalisti (toistaiseksi)
window.createMessage = createMessage;
window.createElement = createElement;
// ... voit lisätä muita tarvittaessa