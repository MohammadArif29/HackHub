document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('Dashboard check:', { token: !!token, user });

    if (!token || !user) {
        console.log('No token or user found, redirecting to login');
        window.location.href = 'https://hackhub-fqxx.onrender.com/pages/login.html';
        return;
    }

    // Add token to all fetch requests
    const originalFetch = window.fetch;
    window.fetch = function() {
        let [resource, config] = arguments;
        config = config || {};
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
        return originalFetch(resource, config);
    };

    // Only fetch dashboard data if we're on a dashboard page
    const isDashboardPage = window.location.pathname.startsWith('/dashboard');
    if (isDashboardPage) {
        fetch(`https://hackhub-fqxx.onrender.com/dashboard/${user.role}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'text/html'
            }
        })
        .then(response => {
            console.log('Dashboard response:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`Dashboard fetch failed: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            console.log('Received HTML');
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = html;
            } else {
                document.body.innerHTML = html;
            }
        })
        .catch(error => {
            console.error('Dashboard error:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/pages/login.html';
        });
    }

    // Update user info in the header if it exists
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        userNameElement.textContent = `${user.firstName} ${user.lastName}`;
    }
});

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/pages/login.html';
} 