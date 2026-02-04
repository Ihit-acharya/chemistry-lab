document.addEventListener('DOMContentLoaded', async () => {
  const nameEl = document.getElementById('profileName');
  const listEl = document.getElementById('historyList');
  if (!nameEl || !listEl) return;

  const username = (window.auth && typeof window.auth.getUserName === 'function')
    ? window.auth.getUserName()
    : '';

  nameEl.textContent = username || 'Unknown';

  if (!username) {
    listEl.innerHTML = '<p class="text-muted">No user found. Please log in.</p>';
    return;
  }

  listEl.innerHTML = '<p class="text-muted">Loading history...</p>';

  try {
    const res = await fetch(window.apiUrl(`/api/quiz/history?username=${encodeURIComponent(username)}`));
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error('Failed to load history');

    if (!data.history || data.history.length === 0) {
      listEl.innerHTML = '<p class="text-muted">No quiz attempts yet.</p>';
      return;
    }

    const rows = data.history.map(entry => {
      const date = new Date(entry.timestamp).toLocaleString();
      const pct = entry.total ? Math.round((entry.score / entry.total) * 100) : 0;
      return `
        <div class="leaderboard-row mb-2">
          <span class="leaderboard-user">${entry.difficulty.toUpperCase()}</span>
          <span class="leaderboard-score">${entry.score}/${entry.total} (${pct}%)</span>
          <span class="text-muted small">${date}</span>
        </div>
      `;
    }).join('');

    listEl.innerHTML = rows;
  } catch (err) {
    listEl.innerHTML = '<p class="text-muted">Unable to load history.</p>';
  }
});
