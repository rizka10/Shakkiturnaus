function fmtScore(n) {
  if (n == null) return '—';
  if (n === Math.floor(n)) return String(n);
  // n is x.5
  const whole = Math.floor(n);
  return whole === 0 ? '½' : whole + '½';
}

function playerById(id) {
  return appState.players.find(p => p.id === id) || null;
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