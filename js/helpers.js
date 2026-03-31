function fmtScore(n) {
  if (n === null) return '—';
  if (n === Math.floor(n)) return String(n);
  // n is x.5
  const whole = Math.floor(n);
  return whole === 0 ? '½' : whole + '½';
}

function playerById(id) {
  return appState.players.find(p => p.id === id) || null;
}

// Lisää render.js-tiedoston alkuun tai helpers.js:ään
function groupPairsByGroup(pairs) {
  const groups = {};
  pairs.forEach(pair => {
    const key = pair.group || 'DEFAULT';
    if (!groups[key]) groups[key] = [];
    groups[key].push(pair);
  });
  return groups;
}

// ═══════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════
let _modalCb = null;
function showModal(title, msg, cb) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-msg').textContent   = msg;
  document.getElementById('modal-bg').classList.add('open');
  _modalCb = cb;
}

function initModalListeners() {
  const okBtn = document.getElementById('modal-ok');
  const cancelBtn = document.getElementById('modal-cancel');
  const bg = document.getElementById('modal-bg');  // jos haluat sulkea klikkaamalla taustaa

  if (!okBtn || !cancelBtn) {
    console.warn('Modaalin elementtejä ei löydy – tarkista HTML-rakenne');
    return;
  }

  okBtn.addEventListener('click', function() {
    bg.classList.remove('open');
    if (_modalCb) {
      _modalCb();
      _modalCb = null;
    }
  });

  cancelBtn.addEventListener('click', function() {
    bg.classList.remove('open');
    _modalCb = null;
  });

  // Valinnainen: sulje modaali klikkaamalla taustaa (ei sisältöä)
  bg.addEventListener('click', function(e) {
    if (e.target === bg) {  // vain jos klikattiin taustaa, ei modaalin painikkeita
      bg.classList.remove('open');
      _modalCb = null;
    }
  });
}

// ═══════════════════════════════════════════════════════
// Apufunktiot DocumentFragment-rakenteluun 
// ═══════════════════════════════════════════════════════

function createMessage(text) {
  const div = document.createElement('div');
  div.className = 'msg';
  div.textContent = text;
  return div;
}

function createGroupHeader(groupKey) {
  const div = document.createElement('div');
  div.className = 'group-hdr';
  div.textContent = groupKey === 'DEFAULT' ? 'Oletusryhmä' : `Ryhmä ${groupKey}`;
  return div;
}

function createPairingRow(pair, localBoardIdx, scoresBefore, roundIdx, globalPairIdx) {
  const row = document.createElement('div');
  row.className = 'pairing-row';

  // Taulun numero
  const boardDiv = document.createElement('div');
  boardDiv.className = 'board-n';
  boardDiv.textContent = (localBoardIdx + 1).toString();
  row.appendChild(boardDiv);

  if (pair.bId === null) {
    // BYE-rivi
    row.appendChild(createByeRow(pair, scoresBefore[pair.wId] || 0, roundIdx, globalPairIdx));
    return row;
  }

  // Normaali peli
  const whitePlayer = playerById(pair.wId);
  const blackPlayer = playerById(pair.bId);

  row.appendChild(createPlayerCell(whitePlayer, scoresBefore[pair.wId] || 0, true));
  
  const vsDiv = document.createElement('div');
  vsDiv.className = 'vs-cell';
  vsDiv.textContent = 'vs';
  row.appendChild(vsDiv);

  row.appendChild(createPlayerCell(blackPlayer, scoresBefore[pair.bId] || 0, false));

  // Tulospainikkeet – nyt käytetään globaalia indeksiä!
  row.appendChild(createResultButtons(pair, roundIdx, globalPairIdx, pair.res));

  return row;
}

function createPlayerCell(player, scoreBefore, isWhite) {
  const cell = document.createElement('div');
  cell.className = `player-cell ${isWhite ? 'right' : ''}`;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'player-name';
  nameSpan.textContent = player?.name || '?';

  const ptsSpan = document.createElement('span');
  ptsSpan.className = 'pts-before';
  ptsSpan.textContent = fmtScore(scoreBefore);

  const pip = document.createElement('span');
  pip.className = `color-pip ${isWhite ? 'white-pip' : 'black-pip'}`;

  if (isWhite) {
    cell.append(ptsSpan, nameSpan, pip);
  } else {
    cell.append(pip, nameSpan, ptsSpan);
  }

  return cell;
}

function createByeRow(pair, scoreBefore, roundIdx, globalPairIdx) {
  const container = document.createElement('div');
  container.style.display = 'contents';

  const whiteCell = document.createElement('div');
  whiteCell.className = 'player-cell right';

  const ptsSpan = document.createElement('span');
  ptsSpan.className = 'pts-before';
  ptsSpan.textContent = fmtScore(scoreBefore);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'player-name';
  nameSpan.textContent = playerById(pair.wId)?.name || '?';

  const byeTag = document.createElement('span');
  byeTag.className = 'bye-tag';
  byeTag.textContent = '(BYE)';

  const pip = document.createElement('span');
  pip.className = 'color-pip white-pip';

  whiteCell.append(ptsSpan, nameSpan, byeTag, pip);

  const vsDiv = document.createElement('div');
  vsDiv.className = 'vs-cell';
  vsDiv.textContent = 'vs';

  const blackCell = document.createElement('div');
  blackCell.className = 'player-cell';
  const emptyPip = document.createElement('span');
  emptyPip.className = 'color-pip';
  const emptyName = document.createElement('span');
  emptyName.className = 'player-name bye-opponent';
  emptyName.textContent = '—';
  blackCell.append(emptyPip, emptyName);

  container.append(whiteCell, vsDiv, blackCell);
  container.appendChild(createResultButtons(pair, roundIdx, globalPairIdx, pair.res));

  return container;
}

function createResultButtons(pair, roundIdx, globalPairIdx, currentRes) {
  const container = document.createElement('div');
  container.className = 'result-btns';

  const options = [
    { text: '1–0', value: '1', title: 'Valkoinen voittaa', selClass: 'sel-w' },
    { text: '½–½', value: 'D', title: 'Tasapeli',          selClass: 'sel-d' },
    { text: '0–1', value: '0', title: 'Musta voittaa',     selClass: 'sel-l' }
  ];

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `rbtn ${currentRes === opt.value ? opt.selClass : ''}`;
    btn.textContent = opt.text;
    btn.title = opt.title;

    // TÄRKEIN KORJAUS: käytetään globaalia pair-indeksiä
    btn.addEventListener('click', () => {
      setRes(roundIdx, globalPairIdx, opt.value);
    });

    container.appendChild(btn);
  });

  return container;
}

// Exportataan globaalisti perinteiseen tyyliin (window.)
window.showModal = showModal;
window.initModalListeners = initModalListeners;