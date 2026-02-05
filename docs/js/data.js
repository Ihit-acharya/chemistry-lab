(() => {
	const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
	const storedBase = localStorage.getItem('API_BASE_URL');
	const defaultBase = isLocalhost ? 'http://localhost:3000' : 'https://api-chemistry-lab.onrender.com';
	const apiBase = (storedBase || defaultBase).replace(/\/+$/, '');

	function apiUrl(path) {
		if (!path) return apiBase;
		if (/^https?:\/\//i.test(path)) return path; // Already absolute URL
		if (path.startsWith('/')) return `${apiBase}${path}`;
		return `${apiBase}/${path}`;
	}

	// Validate API connection with async health check
	function validateApiConnection() {
		try {
			fetch(`${apiBase}/health`, { method: 'HEAD', cache: 'no-store' })
				.catch(() => {
					console.warn(`⚠ API at ${apiBase} may be unavailable`);
				});
		} catch (e) {
			console.warn('API health check error:', e);
		}
	}

	window.API_BASE = apiBase;
	window.apiUrl = apiUrl;
	
	// Check connection on page load
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', validateApiConnection, { once: true });
	} else {
		validateApiConnection();
	}
})();
