document.addEventListener('DOMContentLoaded', function() {
    // Only run auth-specific code if we're on an auth page
    const isAuthPage = document.querySelector('.auth-container');
    if (!isAuthPage) return;  // Exit if not on auth page

    // Load background content
    if (document.querySelector('.auth-page')) {
        fetch('/')
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Remove scripts from the main content to prevent duplicate execution
                doc.querySelectorAll('script').forEach(script => script.remove());
                
                // Set the main content
                document.getElementById('mainContent').innerHTML = doc.body.innerHTML;
            })
            .catch(error => console.error('Error loading main content:', error));
    }

    // Add a semi-transparent overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        backdrop-filter: blur(8px);
        z-index: 999;
    `;
    document.body.appendChild(overlay);

    // Close auth modal when clicking outside
    document.querySelector('.auth-container')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('auth-container')) {
            window.location.href = '/';
        }
    });

    // Prevent closing when clicking inside the auth box
    document.querySelector('.auth-box')?.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.querySelector('.auth-container')) {
            window.location.href = '/';
        }
    });

    // Role selection handling
    const roleButtons = document.querySelectorAll('.role-btn');
    const roleFields = document.querySelectorAll('.role-fields');
    let selectedRole = 'participant';

    roleButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update button states
            roleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show/hide role-specific fields
            selectedRole = button.dataset.role;
            roleFields.forEach(field => {
                if (field) {  // Add null check
                    field.classList.add('d-none');
                    // Remove required from all fields in this section
                    field.querySelectorAll('[data-role]').forEach(input => {
                        input.required = false;
                    });
                }
            });

            // Show selected role fields and make them required
            const selectedFields = document.getElementById(`${selectedRole}Fields`);
            if (selectedFields) {  // Add null check
                selectedFields.classList.remove('d-none');
                selectedFields.querySelectorAll(`[data-role="${selectedRole}"]`).forEach(input => {
                    input.required = true;
                    if (input.name === 'organizationWebsite') {
                        input.required = false; // Make website optional
                    }
                });
            }
        });
    });

    // Form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Get common form data
            const formData = {
                firstName: registerForm.firstName.value,
                lastName: registerForm.lastName.value,
                email: registerForm.email.value,
                password: registerForm.password.value,
                role: selectedRole
            };

            // Add role-specific data
            switch (selectedRole) {
                case 'participant':
                    formData.skills = registerForm.skills.value.split(',').map(skill => skill.trim());
                    formData.bio = registerForm.bio.value;
                    if (registerForm.githubProfile.value.trim()) {
                        formData.githubProfile = registerForm.githubProfile.value.trim();
                    }
                    if (registerForm.linkedinProfile.value.trim()) {
                        formData.linkedinProfile = registerForm.linkedinProfile.value.trim();
                    }
                    break;
                case 'organizer':
                    formData.organization = registerForm.organization.value;
                    formData.position = registerForm.position.value;
                    formData.organizationWebsite = registerForm.organizationWebsite.value;
                    break;
                case 'judge':
                    formData.expertise = registerForm.expertise.value.split(',').map(exp => exp.trim());
                    formData.experience = parseInt(registerForm.experience.value);
                    formData.currentRole = registerForm.currentRole.value;
                    break;
            }

            try {
                const response = await fetch('https://hackhub-fqxx.onrender.com/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    // Store token and user data
                    const token = data.token;
                    localStorage.setItem('token', token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Direct redirection
                    console.log('Registration successful, redirecting to:', `/dashboard/${data.user.role}`);
                    window.location.replace(`/dashboard/${data.user.role}`);
                } else {
                    alert(data.message || 'Registration failed');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Registration failed. Please try again.');
            }
        });
    }

    // Handle login form if it exists
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // Password visibility toggle
        const togglePassword = document.querySelector('.toggle-password');
        const passwordInput = document.querySelector('input[name="password"]');
        
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.querySelector('i').classList.toggle('fa-eye');
                this.querySelector('i').classList.toggle('fa-eye-slash');
            });
        }

        // Login form submission
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Add null check for role button
            const activeRoleBtn = document.querySelector('.role-btn.active');
            if (!activeRoleBtn) {
                showError('Please select a role');
                return;
            }

            const formData = {
                email: loginForm.email.value,
                password: loginForm.password.value,
                role: activeRoleBtn.dataset.role
            };

            try {
                const response = await fetch('https://hackhub-fqxx.onrender.com/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                console.log('Login response:', data);

                if (response.ok) {
                    // Store token and user data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    if (document.getElementById('rememberMe').checked) {
                        localStorage.setItem('rememberMe', 'true');
                    }

                    // Direct redirection
                    console.log('Redirecting to:', `/dashboard/${data.user.role}`);
                    window.location.replace(`/dashboard/${data.user.role}`);
                } else {
                    showError(data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('Login failed. Please try again.');
            }
        });
    }

    // Check for remembered login
    if (localStorage.getItem('rememberMe') && localStorage.getItem('token')) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role) {
            window.location.href = `/dashboard/${user.role}`;
        }
    }
});

// Error handling function
function showError(message) {
    let errorDiv = document.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        const form = document.querySelector('form');
        form.insertBefore(errorDiv, form.firstChild);
    }
    errorDiv.textContent = message;
    errorDiv.classList.add('show');

    // Hide error after 5 seconds
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
} 