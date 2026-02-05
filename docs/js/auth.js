// Simple auth UI helpers used by multiple pages
function isLoggedIn() {
    try {
        return localStorage.getItem('loggedIn') === 'true';
    } catch (e) {
        console.warn('localStorage access failed:', e);
        return false;
    }
}

function getUserName() {
    try {
        return localStorage.getItem('userName') || '';
    } catch (e) {
        console.warn('localStorage access failed:', e);
        return '';
    }
}

function logout() {
    try {
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('userName');
    } catch (e) {
        console.warn('localStorage clear failed:', e);
    }
    // reload to update UI and allow redirects
    window.location.reload();
}

function renderProfileInNavbar() {
    try {
        const nav = document.querySelector('.navbar-nav');
        if (!nav) return;
        
        // Remove any previous profile nodes
        const prev = document.getElementById('navProfile');
        if (prev) prev.remove();

        if (isLoggedIn()) {
            const name = getUserName();
            const li = document.createElement('li');
            li.className = 'nav-item dropdown';
            li.id = 'navProfile';

            li.innerHTML = `
                <a class="nav-link dropdown-toggle" href="#" id="profileMenu" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fa-solid fa-user"></i> ${name || 'User'}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="profileMenu">
                    <li><a class="dropdown-item" href="#" id="viewProfile">View profile</a></li>
                    <li><a class="dropdown-item" href="#" id="doLogout">Logout</a></li>
                </ul>
            `;

            nav.appendChild(li);

            // Attach handlers
            const logoutBtn = document.getElementById('doLogout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => { 
                    e.preventDefault(); 
                    logout(); 
                });
            }
            
            const viewBtn = document.getElementById('viewProfile');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => { 
                    e.preventDefault(); 
                    window.location.href = 'profile.html'; 
                });
            }
        } else {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.id = 'navProfile';
            li.innerHTML = `<a class="nav-link" href="Loginpage.html"><i class="fa-solid fa-right-to-bracket"></i> Login</a>`;
            nav.appendChild(li);
        }

    } catch (err) {
        console.error('renderProfileInNavbar error:', err);
    }
}

function requireAuthRedirect() {
    if (!isLoggedIn()) {
        try {
            // preserve the target so user can return later
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            localStorage.setItem('postLoginRedirect', currentPage);
        } catch (e) {
            console.warn('Could not save redirect target:', e);
        }
        window.location.href = 'signup.html';
    }
}

// Expose functions for pages to call
window.auth = {
    isLoggedIn, getUserName, logout, renderProfileInNavbar, requireAuthRedirect
};
