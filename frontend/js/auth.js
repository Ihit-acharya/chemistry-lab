// Simple auth UI helpers used by multiple pages
function isLoggedIn() {
    return localStorage.getItem('loggedIn') === 'true';
}

function getUserName() {
    return localStorage.getItem('userName') || '';
}

function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('userName');
    // reload to update UI and allow redirects
    window.location.reload();
}

function renderProfileInNavbar() {
    try {
        const nav = document.querySelector('.navbar-nav');
        if (!nav) return;
        // remove any previous profile nodes we may have appended
        const prev = document.getElementById('navProfile');
        if (prev) prev.remove();

        if (isLoggedIn()) {
            const name = getUserName();
            const li = document.createElement('li');
            li.className = 'nav-item dropdown';
            li.id = 'navProfile';

            li.innerHTML = `
                <a class="nav-link dropdown-toggle" href="#" id="profileMenu" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fa-solid fa-user"></i> ${name}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="profileMenu">
                    <li><a class="dropdown-item" href="#" id="viewProfile">View profile</a></li>
                    <li><a class="dropdown-item" href="#" id="doLogout">Logout</a></li>
                </ul>
            `;

            nav.appendChild(li);

            // attach handlers (dropdown toggle behavior is handled by Bootstrap JS)
            const logoutBtn = document.getElementById('doLogout');
            if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
            const viewBtn = document.getElementById('viewProfile');
            if (viewBtn) viewBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'profile.html'; });
        } else {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.id = 'navProfile';
            li.innerHTML = `<a class="nav-link" href="Loginpage.html"><i class="fa-solid fa-right-to-bracket"></i> Login</a>`;
            nav.appendChild(li);
        }

    } catch (err) {
        console.warn('renderProfileInNavbar error', err);
    }
}

function requireAuthRedirect() {
    if (!isLoggedIn()) {
        // preserve the target so user can return later
        localStorage.setItem('postLoginRedirect', window.location.pathname.split('/').pop());
        window.location.href = 'signup.html';
    }
}

// Expose functions for pages to call
window.auth = {
    isLoggedIn, getUserName, logout, renderProfileInNavbar, requireAuthRedirect
};
