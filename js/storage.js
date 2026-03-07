// ═══════════════════════════════════════════════════════
// BACKUP
// ═══════════════════════════════════════════════════════
function saveBackup() {
  const data = JSON.stringify({ v:2, players:appState.players, rounds:appState.rounds, cfg:appState.cfg, nextId:_nextId }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], {type:'application/json'}));
  a.download = (appState.cfg.name||'turnaus').replace(/[^a-z0-9äöå]/gi,'_') + '_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
}

function loadBackupFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (!Array.isArray(d.players)) throw new Error('Virheellinen tiedosto');
      appState.players = d.players;
      appState.rounds  = d.rounds || [];
      appState.cfg     = d.cfg || appState.cfg;
      appState.view    = Math.max(0, appState.rounds.length - 1);
      _nextId   = d.nextId || (Math.max(0, ...appState.players.map(p=>p.id)) + 1);
      syncCfgFields();
      autoSave();
      render();
      alert(`✓ Ladattu: ${appState.players.length} pelaajaa, ${appState.rounds.length} kierrosta.`);
    } catch(err) {
      alert('Virhe latauksessa: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function autoSave() {
  try {
    localStorage.setItem('shakkiTurnaus_v2', JSON.stringify({ v:2, players:appState.players, rounds:appState.rounds, cfg:appState.cfg, nextId:_nextId }));
  } catch(_) {}
}

function loadAutoSave() {
  try {
    const raw = localStorage.getItem('shakkiTurnaus_v2');
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!Array.isArray(d.players)) return;
    appState.players = d.players;
    appState.rounds  = d.rounds || [];
    appState.cfg     = d.cfg || appState.cfg;
    appState.view    = Math.max(0, appState.rounds.length - 1);
    _nextId   = d.nextId || (Math.max(0, ...appState.players.map(p=>p.id)) + 1);
    syncCfgFields();
  } catch(_) {}
}

function syncCfgFields() {
  document.getElementById('cfg-name').value   = appState.cfg.name;
  document.getElementById('cfg-rounds').value = appState.cfg.rounds;
  document.getElementById('cfg-bye').value    = appState.cfg.bye ?? 1.0;
}

function readCfgFields() {
  appState.cfg.name   = document.getElementById('cfg-name').value.trim() || 'Shakkiturnaus';
  appState.cfg.rounds = parseInt(document.getElementById('cfg-rounds').value, 10) || 7;
  const gamesVal = parseInt(document.getElementById('cfg-games-per-pair').value, 10);
  appState.cfg.gamesPerPair = isNaN(gamesVal) || gamesVal < 1 ? 1 : gamesVal;
  appState.cfg.bye    = parseFloat(document.getElementById('cfg-bye').value) || 1.0;
}