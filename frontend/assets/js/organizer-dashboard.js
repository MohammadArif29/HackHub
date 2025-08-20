document.addEventListener('DOMContentLoaded', function() {
    // Initialize date inputs with minimum date as today
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.min = today;
    });

    // Load all dashboard data
    loadActiveHackathons();
    loadRecentHackathons();
    loadDashboardStats();
    loadAllJudgeRequests();

    // Track loading states for each hackathon
    const loadingStates = new Map();

    const accordionButtons = document.querySelectorAll('.accordion-button');
    
    // Load requests when accordion section is opened
    accordionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const hackathonId = this.dataset.bsTarget.split('-')[1];
            if (!loadingStates.has(hackathonId)) {
                loadJudgeRequestsForHackathon(hackathonId);
            }
        });
    });
});

async function createHackathon() {
    const form = document.getElementById('createHackathonForm');
    
    // Log the form data to check what's being sent
    console.log('Form data:', {
        title: form.title.value,
        description: form.description.value,
        startDate: form.startDate.value,
        endDate: form.endDate.value,
        registrationDeadline: form.registrationDeadline.value,
        maxParticipants: form.maxParticipants.value,
        prizePool: form.prizePool.value,
        tags: form.tags.value,
        rules: form.rules.value
    });

    try {
        const response = await fetch('https://hackhub-fqxx.onrender.com/api/hackathons/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                title: form.title.value,
                description: form.description.value,
                startDate: form.startDate.value,
                endDate: form.endDate.value,
                registrationDeadline: form.registrationDeadline.value,
                maxParticipants: parseInt(form.maxParticipants.value),
                prizePool: parseInt(form.prizePool.value),
                tags: form.tags.value,
                rules: form.rules.value
            })
        });

        const result = await response.json();
        console.log('Create hackathon response:', result); // Log the response

        if (response.ok) {
            // Close modal and refresh hackathons list
            bootstrap.Modal.getInstance(document.getElementById('createHackathonModal')).hide();
            form.reset();
            
            // Refresh all dashboard data
            await Promise.all([
                loadActiveHackathons(),
                loadRecentHackathons(),
                loadDashboardStats()
            ]);
            
            showAlert('success', 'Hackathon created successfully!');
        } else {
            showAlert('error', result.message || 'Failed to create hackathon');
        }
    } catch (error) {
        console.error('Create hackathon error:', error);
        showAlert('error', 'Error creating hackathon');
    }
}

async function inviteJudge(judgeId) {
    const hackathonId = document.getElementById('hackathonSelect').value;

    try {
        const response = await fetch(`https://hackhub-fqxx.onrender.com/api/hackathons/${hackathonId}/invite-judge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ judgeId })
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('success', 'Judge invited successfully!');
            loadActiveHackathons(); // Refresh hackathon data
        } else {
            showAlert('error', result.message);
        }
    } catch (error) {
        console.error('Invite judge error:', error);
        showAlert('error', 'Error inviting judge');
    }
}

function viewSubmissions(hackathonId) {
    window.location.href = `https://hackhub-fqxx.onrender.com/hackathons/${hackathonId}/submissions`;
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.dashboard-content').insertAdjacentElement('afterbegin', alertDiv);

    setTimeout(() => alertDiv.remove(), 5000);
}

async function loadActiveHackathons() {
    try {
        const response = await fetch('https://hackhub-fqxx.onrender.com/api/hackathons/active', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const hackathons = await response.json();
            updateActiveHackathons(hackathons);
        } else {
            console.error('Failed to load active hackathons');
        }
    } catch (error) {
        console.error('Load active hackathons error:', error);
    }
}

async function loadRecentHackathons() {
    try {
        const response = await fetch('https://hackhub-fqxx.onrender.com/api/hackathons/recent', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const hackathons = await response.json();
            updateRecentHackathons(hackathons);
        } else {
            console.error('Failed to load recent hackathons');
        }
    } catch (error) {
        console.error('Load recent hackathons error:', error);
    }
}

function updateActiveHackathons(hackathons) {
    const container = document.getElementById('activeHackathons');
    if (!container) return;

    // Check if there are any hackathons
    if (!hackathons || hackathons.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    No active hackathons found.
                </div>
            </div>`;
        return;
    }

    container.innerHTML = hackathons.map(hackathon => `
        <div class="col-md-6 col-xl-4">
            <div class="hackathon-card">
                <div class="hackathon-status ${hackathon.status === 'active' ? 'status-active' : 'status-draft'}">
                    ${hackathon.status.toUpperCase()}
                </div>
                <h3 class="hackathon-title">${hackathon.title}</h3>
                <div class="hackathon-info">
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(hackathon.startDate).toLocaleDateString()} - ${new Date(hackathon.endDate).toLocaleDateString()}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <span>${hackathon.participants ? hackathon.participants.length : 0} Participants</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-gavel"></i>
                        <span>${hackathon.judges ? hackathon.judges.length : 0} Judges</span>
                    </div>
                </div>
                <div class="hackathon-actions">
                    <a href="https://hackhub-fqxx.onrender.com/hackathons/${hackathon._id}" class="btn btn-outline-primary">
                        <i class="fas fa-cog"></i> Manage
                    </a>
                    <button class="btn btn-outline-success" onclick="viewSubmissions('${hackathon._id}')">
                        <i class="fas fa-inbox"></i> Submissions
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Log the updated hackathons for debugging
    console.log('Updated active hackathons:', hackathons);
}

function updateRecentHackathons(hackathons) {
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;

    tbody.innerHTML = hackathons.map(hackathon => `
        <tr>
            <td>${hackathon.title}</td>
            <td>${new Date(hackathon.endDate).toLocaleDateString()}</td>
            <td>${hackathon.participants.length}</td>
            <td>${hackathon.submissions.length}</td>
            <td><span class="badge bg-secondary">Completed</span></td>
            <td><a href="https://hackhub-fqxx.onrender.com/hackathons/${hackathon._id}/results" class="btn btn-sm btn-primary">View Results</a></td>
        </tr>
    `).join('');
}

// Add this new function to fetch dashboard stats
async function loadDashboardStats() {
    try {
        const response = await fetch('https://hackhub-fqxx.onrender.com/dashboard/organizer/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const stats = await response.json();
            updateDashboardStats(stats);
        }
    } catch (error) {
        console.error('Load dashboard stats error:', error);
    }
}

// Add this function to update the stats in the UI
function updateDashboardStats(stats) {
    document.querySelector('.stat-card:nth-child(1) h3').textContent = stats.activeHackathons;
    document.querySelector('.stat-card:nth-child(2) h3').textContent = stats.totalParticipants;
    document.querySelector('.stat-card:nth-child(3) h3').textContent = stats.ongoingSubmissions;
    document.querySelector('.stat-card:nth-child(4) h3').textContent = stats.assignedJudges;
}

// Load judge requests
async function loadAllJudgeRequests() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        const hackathonId = item.querySelector('[id^="requests-"]').id.split('-')[1];
        loadJudgeRequestsForHackathon(hackathonId);
    });
}

// Track loading states for each hackathon
const loadingStates = new Map();

async function loadJudgeRequestsForHackathon(hackathonId) {
    try {
        // Show loading state
        const container = document.getElementById(`judgeRequests-${hackathonId}`);
        if (!container) return;

        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading judge requests...</p>
            </div>`;

        const response = await fetch(`https://hackhub-fqxx.onrender.com/api/organizer/judge-requests/${hackathonId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch judge requests');
        }

        const requests = await response.json();
        console.log('Received judge requests:', requests); // Debug log

        // Update the badge count
        const countBadge = document.getElementById(`request-count-${hackathonId}`);
        if (countBadge) {
            countBadge.textContent = requests.length;
        }

        if (!requests.length) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">No pending judge requests for this hackathon</div>
                </div>`;
            return;
        }

        container.innerHTML = requests.map(judge => `
            <div class="col-md-6 col-lg-4">
                <div class="judge-request-card">
                    <div class="request-header">
                        <h4>${judge.user.firstName} ${judge.user.lastName}</h4>
                        <span class="badge bg-warning">Pending</span>
                    </div>
                    <div class="request-details">
                        <div class="info-item">
                            <i class="fas fa-envelope"></i>
                            <span>${judge.user.email}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-briefcase"></i>
                            <span>${judge.currentRole}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-star"></i>
                            <span>${judge.experience} years experience</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-code-branch"></i>
                            <span>Expertise: ${judge.expertise.join(', ') || 'Not specified'}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <span>Requested: ${new Date(judge.requestedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-success btn-sm" 
                                onclick="respondToJudgeRequest('${hackathonId}', '${judge._id}', 'accept')">
                            Accept
                        </button>
                        <button class="btn btn-danger btn-sm" 
                                onclick="respondToJudgeRequest('${hackathonId}', '${judge._id}', 'decline')">
                            Decline
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading judge requests:', error);
        const container = document.getElementById(`judgeRequests-${hackathonId}`);
        if (container) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Error loading judge requests: ${error.message}
                    </div>
                </div>`;
        }
    }
}

async function respondToJudgeRequest(hackathonId, judgeId, response) {
    try {
        const res = await fetch(`https://hackhub-fqxx.onrender.com/api/organizer/respond-to-judge-request/${hackathonId}/${judgeId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ response })
        });

        const data = await res.json();
        
        if (res.ok) {
            showAlert(`Judge request ${response}ed successfully`, 'success');
            // Reload the requests for this hackathon
            loadJudgeRequestsForHackathon(hackathonId);
            // Reload dashboard stats if they exist
            if (typeof loadDashboardStats === 'function') {
                loadDashboardStats();
            }
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error responding to judge request:', error);
        showAlert(error.message || 'Error responding to request', 'error');
    }
}