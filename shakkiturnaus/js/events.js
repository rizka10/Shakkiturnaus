document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.page).classList.add('active');
    render();
  });
});

document.getElementById('btn-new-round').addEventListener('click', () => {
  readCfgFields();
  if (appState.rounds.length > 0) {
    const last = appState.rounds[appState.rounds.length - 1];
    const missing = last.pairs.filter(p => p.res === null).length;
    if (missing > 0) {
      showModal('Puuttuvia tuloksia',
        `Kierroksella ${appState.rounds.length} on ${missing} syöttämätöntä tulosta. Luodaanko uusi kierros silti?`,
        () => { proceedToNewRound(); }
      );
      return;
    }
  }
  proceedToNewRound();
});

function proceedToNewRound() {
  createRound();
  showPage('pairings');
}

function showPage(id) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab[data-page="${id}"]`).classList.add('active');
  document.getElementById('page-' + id).classList.add('active');
  render();
}

document.getElementById('btn-delete-round').addEventListener('click', () => {
  const n = appState.rounds.length;
  showModal('Poista kierros ' + n,
    `Poistetaanko kierros ${n} ja kaikki sen tulokset?`,
    () => {
      appState.rounds.pop();
      appState.view = Math.max(0, appState.rounds.length - 1);
      autoSave();
      render();
    }
  );
});

document.getElementById('btn-save').addEventListener('click', () => { readCfgFields(); saveBackup(); });
document.getElementById('btn-load').addEventListener('click', () => document.getElementById('file-input').click());
document.getElementById('file-input').addEventListener('change', loadBackupFile);

document.getElementById('btn-reset').addEventListener('click', () => {
  showModal('Nollaa kaikki', 'Poistetaan kaikki pelaajat, kierrokset ja tulokset. Tätä ei voi peruuttaa.', () => {
    appState.players = []; appState.rounds = []; appState.view = 0; _nextId = 1;
    localStorage.removeItem('shakkiTurnaus_v2');
    render();
  });
});

document.getElementById('btn-import').addEventListener('click', importPlayers);

document.getElementById('btn-example').addEventListener('click', () => {
  document.getElementById('import-text').value =
`001 Virtanen Vesa             2340  HSS
002 Korhonen Kimmo            2210  TuSS
003 Mäkinen Marko             2180  OShK
004 Heikkinen Helena          2050  HSS
005 Leinonen Laura            1980  TuSS
006 Mäkelä Mikael             1920  HeSS
007 Järvinen Jari             1870  OShK
008 Nieminen Niina            1820  HSS
009 Kärkkäinen Katri          1760  TuSS
010 Räsänen Riku              1700  HeSS
011 Hämäläinen Henna          1650  HSS
012 Lehto Lauri               1580  OShK
013 Ojala Otto                1520  TuSS
014 Saarinen Saara            1460  HSS
015 Peltola Petri             1400  ESS`;
});

document.getElementById('btn-add-player').addEventListener('click', () => {
  const name   = prompt('Nimi:');
  if (!name?.trim()) return;
  const rstr   = prompt('Rating (0 = ei ratingia):', '0');
  const rating = parseInt(rstr, 10) || 0;
  const club   = prompt('Seura (valinnainen):', '') || '';
  appState.players.push({ id: freshId(), name: name.trim(), rating, club, active: true });
  autoSave();
  render();
});

document.getElementById('btn-clear-players').addEventListener('click', () => {
  showModal('Tyhjennä pelaajat', 'Poistetaan kaikki pelaajat ja tulokset?', () => {
    appState.players = []; appState.rounds = []; appState.view = 0; _nextId = 1;
    autoSave(); render();
  });
});

['cfg-name','cfg-rounds','cfg-bye'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => { readCfgFields(); autoSave(); renderSidebar(); });
});