document.addEventListener('DOMContentLoaded', function() {
    loadDashboardStats();
    loadActiveHackathons();
    loadAvailableHackathons();
    loadRecentSubmissions();
    initializeEventListeners();

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize hackathon filters
    const filterButtons = document.querySelectorAll('.filter-chip');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.dataset.filter;
            filterHackathons(filter);
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchHackathons');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            const searchTerm = this.value.toLowerCase();
            const hackathonCards = document.querySelectorAll('.hackathon-card');
            
            hackathonCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const description = card.querySelector('p').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }, 300));
    }
});

function initializeEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchHackathons');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            loadAvailableHackathons(this.value);
        }, 300));
    }

    // Filter functionality
    document.querySelectorAll('.dropdown-item[data-filter]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const filter = this.dataset.filter;
            filterHackathons(filter);
        });
    });

    // Quick action cards
    document.querySelectorAll('.quick-action-card').forEach(card => {
        card.addEventListener('click', function() {
            const action = this.querySelector('h4').textContent.toLowerCase();
            handleQuickAction(action);
        });
    });
}

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/participant/stats');
        const stats = await response.json();
        
        // Update stats in the UI
        document.querySelectorAll('.stat-info h3').forEach(el => {
            const stat = el.nextElementSibling.textContent.toLowerCase().replace(' ', '_');
            el.textContent = stats[stat] || 0;
        });

        // Animate counters
        animateCounters();
    } catch (error) {
        console.error('Error loading stats:', error);
        showAlert('error', 'Failed to load dashboard statistics');
    }
}

async function loadActiveHackathons() {
    try {
        const response = await fetch('/api/participant/active-hackathons');
        const hackathons = await response.json();
        
        const container = document.getElementById('activeHackathons');
        if (!container) return;

        if (!hackathons.length) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        You haven't joined any hackathons yet. 
                        <a href="#" data-bs-toggle="modal" data-bs-target="#joinHackathonModal">Join one now!</a>
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = hackathons.map(hackathon => `
            <div class="col-md-6 col-lg-4">
                <div class="hackathon-card">
                    <div class="hackathon-status ${hackathon.status}">
                        ${formatStatus(hackathon.status)}
                    </div>
                    <h3>${hackathon.title}</h3>
                    <div class="hackathon-info">
                        <div class="info-item">
                            <i class="fas fa-calendar"></i>
                            <span>Ends: ${formatDate(hackathon.endDate)}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <span>Team: ${hackathon.team.name}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <span>${getTimeRemaining(hackathon.endDate)}</span>
                        </div>
                    </div>
                    <div class="hackathon-actions">
                        ${getActionButtons(hackathon)}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading active hackathons:', error);
        showAlert('error', 'Failed to load active hackathons');
    }
}

// Helper functions
function formatStatus(status) {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function getTimeRemaining(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff < 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days left` : 'Ending soon';
}

function getActionButtons(hackathon) {
    const buttons = [];
    
    if (hackathon.status === 'in_progress') {
        buttons.push(`
            <button class="btn btn-primary" onclick="submitProject('${hackathon._id}')">
                Submit Project
            </button>
        `);
    }
    
    buttons.push(`
        <button class="btn btn-outline-primary" onclick="viewDetails('${hackathon._id}')">
            View Details
        </button>
    `);

    return buttons.join('');
}

function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function handleQuickAction(action) {
    switch(action) {
        case 'find hackathons':
            document.querySelector('#searchHackathons').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'my teams':
            loadTeamManagement();
            break;
        case 'submissions':
            loadSubmissionsView();
            break;
        case 'achievements':
            loadAchievements();
            break;
    }
}

async function loadTeamManagement() {
    try {
        const participant = await fetch('/api/participant/profile').then(res => res.json());
        const teams = participant.teams;

        const container = document.getElementById('activeHackathons');
        container.innerHTML = teams.map(team => `
            <div class="col-md-6 col-lg-4">
                <div class="team-card">
                    <h3>${team.name}</h3>
                    <div class="team-info">
                        <p><i class="fas fa-users"></i> ${team.members.length} Members</p>
                        <p><i class="fas fa-trophy"></i> ${team.hackathon.title}</p>
                        ${team.isRecruiting ? '<span class="badge bg-success">Recruiting</span>' : ''}
                    </div>
                    <div class="team-actions">
                        <button class="btn btn-primary" onclick="manageTeam('${team._id}')">
                            Manage Team
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading teams:', error);
        showAlert('error', 'Failed to load teams');
    }
}

async function joinHackathon(hackathonId) {
    try {
        const response = await fetch('/api/participant/join-hackathon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hackathonId })
        });

        if (!response.ok) throw new Error('Failed to join hackathon');
        
        showAlert('success', 'Successfully joined hackathon');
        location.reload();
    } catch (error) {
        console.error('Error joining hackathon:', error);
        showAlert('error', 'Failed to join hackathon');
    }
}

async function submitProject(hackathonId) {
    const form = document.getElementById('submitProjectForm');
    const formData = new FormData(form);
    formData.append('hackathonId', hackathonId);

    try {
        const response = await fetch('/api/participant/submit-project', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to submit project');

        showAlert('success', 'Project submitted successfully');
        $('#submitProjectModal').modal('hide');
        loadActiveHackathons();
    } catch (error) {
        console.error('Error submitting project:', error);
        showAlert('error', error.message);
    }
}

// Add achievement tracking
async function loadAchievements() {
    try {
        const response = await fetch('/api/participant/achievements');
        const achievements = await response.json();

        const container = document.getElementById('achievementsContainer');
        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-card">
                <div class="achievement-icon">
                    <i class="fas ${getAchievementIcon(achievement.type)}"></i>
                </div>
                <div class="achievement-info">
                    <h4>${formatAchievementTitle(achievement.type)}</h4>
                    <p>${achievement.description}</p>
                    <small>${formatDate(achievement.date)}</small>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading achievements:', error);
        showAlert('error', 'Failed to load achievements');
    }
}

function getAchievementIcon(type) {
    const icons = {
        hackathon_win: 'fa-trophy',
        submission: 'fa-code',
        team_lead: 'fa-users',
        first_place: 'fa-medal',
        popular_choice: 'fa-star'
    };
    return icons[type] || 'fa-award';
}

function formatAchievementTitle(type) {
    return type.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

async function loadAvailableHackathons(searchQuery = '') {
    try {
        const response = await fetch('/api/participant/available-hackathons');
        let hackathons = await response.json();

        if (searchQuery) {
            hackathons = hackathons.filter(h => 
                h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                h.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        const container = document.getElementById('availableHackathons');
        if (!hackathons.length) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        No hackathons available at the moment. Check back later!
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = hackathons.map(hackathon => `
            <div class="hackathon-card">
                <div class="hackathon-header">
                    <h3>${hackathon.title}</h3>
                    <span class="status-badge status-${hackathon.status.toLowerCase()}">
                        ${formatStatus(hackathon.status)}
                    </span>
                </div>
                <div class="hackathon-body">
                    <div class="hackathon-info">
                        <div class="info-item">
                            <i class="fas fa-calendar"></i>
                            <span>Starts: ${formatDate(hackathon.startDate)}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <span>Duration: ${hackathon.duration} days</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <span>${hackathon.participantCount || 0} participants</span>
                        </div>
                    </div>

                    <div class="prize-pool">
                        <div class="prize-amount">$${hackathon.prizePool}</div>
                        <small>Total Prize Pool</small>
                    </div>

                    <p class="hackathon-description">${hackathon.description}</p>

                    <div class="deadline-alert">
                        <i class="fas fa-exclamation-circle"></i>
                        Registration closes in ${getTimeRemaining(hackathon.registrationDeadline)}
                    </div>
                </div>

                <div class="hackathon-footer">
                    <div class="organizer-info">
                        <img src="${hackathon.organizer.avatar || '/assets/images/default-avatar.png'}" 
                             alt="Organizer" 
                             class="organizer-avatar">
                        <span>${hackathon.organizer.organization}</span>
                    </div>
                    <button class="btn btn-primary" onclick="joinHackathon('${hackathon._id}')">
                        Join Now
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading available hackathons:', error);
        showAlert('error', 'Failed to load available hackathons');
    }
}

function filterHackathons(filter) {
    const hackathonCards = document.querySelectorAll('.hackathon-card');
    hackathonCards.forEach(card => {
        if (filter === 'all') {
            card.style.display = 'block';
            return;
        }
        
        const status = card.dataset.status;
        card.style.display = status === filter ? 'block' : 'none';
    });
}

// Project Progress Tracking
async function updateProjectProgress(hackathonId, progress) {
    try {
        const response = await fetch(`/api/participant/update-progress/${hackathonId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ progress })
        });
        
        if (!response.ok) throw new Error('Failed to update progress');
        
        showAlert('success', 'Progress updated successfully');
        loadActiveHackathons();
    } catch (error) {
        console.error('Error updating progress:', error);
        showAlert('error', 'Failed to update progress');
    }
}

// Team Collaboration Features
async function initializeTeamChat(teamId) {
    const socket = io('/team-chat');
    
    socket.emit('join-team', teamId);
    
    socket.on('team-message', (message) => {
        appendMessage(message);
    });
}

function appendMessage(message) {
    const chatContainer = document.getElementById('teamChat');
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.isOwn ? 'own' : ''}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <strong>${message.sender}</strong>
            <p>${message.text}</p>
            <small>${new Date(message.timestamp).toLocaleTimeString()}</small>
        </div>
    `;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Project Milestone Tracking
async function addMilestone(hackathonId) {
    const milestone = {
        title: document.getElementById('milestoneTitle').value,
        description: document.getElementById('milestoneDescription').value,
        dueDate: document.getElementById('milestoneDueDate').value
    };

    try {
        const response = await fetch(`/api/participant/add-milestone/${hackathonId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(milestone)
        });

        if (!response.ok) throw new Error('Failed to add milestone');
        
        showAlert('success', 'Milestone added successfully');
        loadMilestones(hackathonId);
    } catch (error) {
        console.error('Error adding milestone:', error);
        showAlert('error', 'Failed to add milestone');
    }
}

// Resource Sharing
async function shareResource(teamId) {
    const formData = new FormData();
    formData.append('file', document.getElementById('resourceFile').files[0]);
    formData.append('description', document.getElementById('resourceDescription').value);

    try {
        const response = await fetch(`/api/participant/share-resource/${teamId}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to share resource');
        
        showAlert('success', 'Resource shared successfully');
        loadTeamResources(teamId);
    } catch (error) {
        console.error('Error sharing resource:', error);
        showAlert('error', 'Failed to share resource');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('/api/participant/dashboard-data');
        const data = await response.json();
        
        updateStats(data.stats);
        updateActiveHackathons(data.activeHackathons);
        updateAvailableHackathons(data.availableHackathons);
        updateCompletedHackathons(data.completedHackathons);
        updateRecentSubmissions(data.recentSubmissions);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('error', 'Failed to load dashboard data');
    }
}

// Team management functions
async function createTeam(hackathonId) {
    const teamData = {
        name: document.getElementById('teamName').value,
        description: document.getElementById('teamDescription').value,
        hackathonId
    };

    try {
        const response = await fetch('/api/participant/create-team', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(teamData)
        });

        if (!response.ok) throw new Error('Failed to create team');
        
        showAlert('success', 'Team created successfully');
        loadDashboardData();
    } catch (error) {
        console.error('Error creating team:', error);
        showAlert('error', 'Failed to create team');
    }
}

async function joinTeam(teamId) {
    try {
        const response = await fetch(`/api/participant/join-team/${teamId}`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to join team');
        
        showAlert('success', 'Joined team successfully');
        loadDashboardData();
    } catch (error) {
        console.error('Error joining team:', error);
        showAlert('error', 'Failed to join team');
    }
}