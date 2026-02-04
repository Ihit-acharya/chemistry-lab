(() => {
	const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
	const storedBase = localStorage.getItem('API_BASE_URL');
	const defaultBase = isLocalhost ? 'http://localhost:3000' : 'https://api-chemistry-lab.onrender.com';
	const apiBase = (storedBase || defaultBase).replace(/\/+$/, '');

	function apiUrl(path) {
		if (!path) return apiBase;
		if (/^https?:\/\//i.test(path)) return path;
		if (path.startsWith('/')) return `${apiBase}${path}`;
		return `${apiBase}/${path}`;
	}

	window.API_BASE = apiBase;
	window.apiUrl = apiUrl;
})();
