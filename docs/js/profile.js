document.addEventListener('DOMContentLoaded', async () => {
  const nameEl = document.getElementById('profileName');
  const listEl = document.getElementById('historyList');
  if (!nameEl || !listEl) {
    console.warn('Profile page elements not found');
    return;
  }

  try {
    const username = (window.auth && typeof window.auth.getUserName === 'function')
      ? window.auth.getUserName()
      : '';

    nameEl.textContent = username || 'Unknown User';

    if (!username) {
      listEl.innerHTML = '<p class="text-muted">No user found. Please log in.</p>';
      return;
    }

    listEl.innerHTML = '<p class="text-muted">Loading history...</p>';

    const res = await fetch(window.apiUrl(`/api/quiz/history?username=${encodeURIComponent(username)}`));
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to load history');
    }

    if (!data.history || data.history.length === 0) {
      listEl.innerHTML = '<p class="text-muted">No quiz attempts yet.</p>';
      return;
    }

    const rows = data.history.map(entry => {
      try {
        const date = new Date(entry.timestamp).toLocaleString();
        const pct = entry.total ? Math.round((entry.score / entry.total) * 100) : 0;
        return `
          <div class="leaderboard-row mb-2">
            <span class="leaderboard-user">${entry.difficulty?.toUpperCase() || 'UNKNOWN'}</span>
            <span class="leaderboard-score">${entry.score || 0}/${entry.total || 0} (${pct}%)</span>
            <span class="text-muted small">${date}</span>
          </div>
        `;
      } catch (e) {
        console.error('Error rendering history entry:', e);
        return '';
      }
    }).join('');

    listEl.innerHTML = rows || '<p class="text-muted">No quiz history available.</p>';
  } catch (err) {
    console.error('Profile load error:', err);
    listEl.innerHTML = '<p class="text-danger">Unable to load history. Please try again later.</p>';
  }
});
