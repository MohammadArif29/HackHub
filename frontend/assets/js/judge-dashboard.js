// Load dashboard data
async function loadDashboardData() {
    try {
        // Load stats
        const statsResponse = await fetch('/api/judge/stats');
        const stats = await statsResponse.json();
        updateStats(stats);

        // Load active assignments
        const assignmentsResponse = await fetch('/api/judge/assignments');
        const assignments = await assignmentsResponse.json();
        updateAssignments(assignments);

        // Load upcoming hackathons
        const upcomingResponse = await fetch('/api/judge/upcoming-hackathons');
        const upcomingHackathons = await upcomingResponse.json();
        updateUpcomingHackathons(upcomingHackathons);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Error loading dashboard data', 'error');
    }
}

// Request to judge a hackathon
async function requestToJudge(hackathonId) {
    try {
        const response = await fetch(`/api/judge/request-to-judge/${hackathonId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            showAlert('Request sent successfully', 'success');
            // Disable the button and update text
            const button = document.querySelector(`button[onclick="requestToJudge('${hackathonId}')"]`);
            button.disabled = true;
            button.textContent = 'Request Sent';
            // Reload dashboard data to update stats and lists
            loadDashboardData();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error requesting to judge:', error);
        showAlert(error.message || 'Error sending request', 'error');
    }
}

// Handle invitation response
async function respondToInvitation(hackathonId, response) {
    try {
        const res = await fetch(`/judge/respond-to-invite/${hackathonId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ response })
        });

        const data = await res.json();
        
        if (res.ok) {
            showAlert(`Invitation ${response}ed successfully`, 'success');
            // Remove the invitation card
            const card = document.querySelector(`[data-invitation="${hackathonId}"]`);
            card.remove();
            // Reload dashboard data to update stats
            loadDashboardData();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error responding to invitation:', error);
        showAlert(error.message || 'Error responding to invitation', 'error');
    }
}

// Helper function to show alerts
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.dashboard-content').prepend(alertDiv);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Add these functions to update the UI
function updateStats(stats) {
    try {
        const elements = {
            assignedHackathons: document.querySelector('[data-stat="assignedHackathons"]'),
            pendingInvites: document.querySelector('[data-stat="pendingInvites"]'),
            pendingReviews: document.querySelector('[data-stat="pendingReviews"]'),
            completedReviews: document.querySelector('[data-stat="completedReviews"]')
        };

        // Update each stat if the element exists
        Object.entries(elements).forEach(([key, element]) => {
            if (element && stats[key] !== undefined) {
                element.textContent = stats[key];
            }
        });
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Update assignments UI
function updateAssignments(assignments) {
    const container = document.getElementById('activeAssignments');
    if (!container) return;

    if (!assignments.length) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No active assignments found</td>
            </tr>`;
        return;
    }

    container.innerHTML = assignments.map(assignment => `
        <tr>
            <td>${assignment.hackathon.title}</td>
            <td>${assignment.totalSubmissions} submissions</td>
            <td>${new Date(assignment.dueDate).toLocaleDateString()}</td>
            <td>
                <div class="progress">
                    <div class="progress-bar" role="progressbar" 
                         style="width: ${Math.round((assignment.reviewedCount / assignment.totalSubmissions) * 100) || 0}%">
                        ${assignment.reviewedCount}/${assignment.totalSubmissions}
                    </div>
                </div>
            </td>
            <td>
                <a href="/judge/review/${assignment.hackathon._id}" 
                   class="btn btn-primary btn-sm">Review Submissions</a>
            </td>
        </tr>
    `).join('');
}

// Update upcoming hackathons UI
function updateUpcomingHackathons(hackathons) {
    const container = document.getElementById('upcomingHackathons');
    if (!container) return;

    if (!hackathons.length) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">No upcoming hackathons available</div>
            </div>`;
        return;
    }

    container.innerHTML = hackathons.map(hackathon => `
        <div class="col-md-4">
            <div class="hackathon-card">
                <div class="hackathon-status">
                    <span class="badge bg-info">Upcoming</span>
                </div>
                <h3 class="hackathon-title">${hackathon.title}</h3>
                <div class="hackathon-info">
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(hackathon.startDate).toLocaleDateString()}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <span>${hackathon.participants ? hackathon.participants.length : 0} Participants</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-building"></i>
                        <span>
                            ${hackathon.organizer && hackathon.organizer.organization ? 
                                hackathon.organizer.organization : 'Organization not specified'}
                        </span>
                    </div>
                </div>
                <div class="hackathon-actions">
                    <button class="btn btn-outline-primary" 
                            onclick="requestToJudge('${hackathon._id}')"
                            ${hackathon.alreadyRequested ? 'disabled' : ''}>
                        ${hackathon.alreadyRequested ? 'Request Sent' : 'Request to Judge'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
});