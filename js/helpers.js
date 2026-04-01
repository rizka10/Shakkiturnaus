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

function groupPairsByGroup(pairs) {
  const groups = {};
  pairs.forEach(pair => {
    const key = pair.group || 'DEFAULT';
    if (!groups[key]) groups[key] = [];
    groups[key].push(pair);
  });
  return groups;
}

function sortPlayersForStandings(players, scores, buchholz, sonneborn) {
  return [...players].sort((a, b) => {
    const scoreDiff = (scores[b.id] || 0) - (scores[a.id] || 0);
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

    const bhDiff = (buchholz[b.id] || 0) - (buchholz[a.id] || 0);
    if (Math.abs(bhDiff) > 0.001) return bhDiff;

    return (sonneborn[b.id] || 0) - (sonneborn[a.id] || 0);
  });
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

// Exportataan globaalisti perinteiseen tyyliin (window.)
window.showModal = showModal;
window.initModalListeners = initModalListeners;