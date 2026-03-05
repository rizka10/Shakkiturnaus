function toggleActive(id) {
  const p = appState.players.find(p => p.id === id);
  if (p) p.active = !p.active;
  autoSave();
  render();
}

function removePlayer(id) {
  appState.players = appState.players.filter(p => p.id !== id);
  autoSave();
  render();
}

function importPlayers() {
  const text = document.getElementById('import-text').value.trim();
  if (!text) return;

  let count = 0;
  const lines = text.split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    let name = '', rating = 0, club = '', group = '';

    // Swiss-Manager: "001 Lastname Firstname    2150  FIN [Group]"
    // Number at start, then name, then rating, optional club
    const smMatch = line.match(/^\d+\s+(.+?)\s{2,}(\d{3,4})(?:\s+(\S+))?(?:\s+(\S+))?/);
    if (smMatch) {
      name   = smMatch[1].trim();
      rating = parseInt(smMatch[2], 10) || 0;
      club   = smMatch[3] || '';
      group  = smMatch[4] || '';
    } else {
      // Simple: last token is rating if 3-4 digits, rest is name
      const parts = line.split(/\s+/);
      let last = parts.pop();
      if (/^[A-Z]$/.test(last)) { group = last; last = parts.pop(); } // Ryhmä kuten "A"
      if (/^\d{3,4}$/.test(last)) { rating = parseInt(last, 10); last = parts.pop(); }
      name = parts.join(' ');
    }

    name = name.trim();
    if (!name) continue;

    appState.players.push(createPlayer(name, rating, club, true, group.toUpperCase()));
    count++;
  }

  document.getElementById('import-text').value = '';
  const msg = document.getElementById('import-msg');
  if (count > 0) {
    msg.innerHTML = `<div class="msg ok" style="margin-top:8px">✓ Tuotiin ${count} pelaajaa.</div>`;
    setTimeout(() => { msg.innerHTML = ''; }, 3000);
  } else {
    msg.innerHTML = `<div class="msg err" style="margin-top:8px">Ei tunnistettuja pelaajia.</div>`;
  }

  autoSave();
  render();
}