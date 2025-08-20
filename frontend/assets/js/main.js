document.addEventListener('DOMContentLoaded', function() {
    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Load upcoming hackathons
    fetchUpcomingHackathons();

    // Mobile menu toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        });
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Set the correct radio button
    document.querySelector(`#${savedTheme}Theme`).checked = true;

    // Add event listeners to radio buttons
    document.querySelectorAll('input[name="themeOption"]').forEach(radio => {
        radio.addEventListener('change', function() {
            setTheme(this.value);
        });
    });
});

async function fetchUpcomingHackathons() {
    try {
        // Add proper headers and error handling
        const response = await fetch('https://hackhub-fqxx.onrender.com/api/hackathons/upcoming', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const hackathons = await response.json();
        displayHackathons(hackathons);
    } catch (error) {
        console.error('Error fetching hackathons:', error);
        // Show placeholder hackathons only if the element exists
        const hackathonsList = document.getElementById('hackathonsList');
        if (hackathonsList) {
            displayPlaceholderHackathons();
        }
    }
}

function displayPlaceholderHackathons() {
    const hackathons = [
        {
            title: "Web Innovation Hackathon",
            description: "Create next-gen web applications",
            startDate: new Date('2024-05-15')
        },
        {
            title: "AI/ML Challenge",
            description: "Build intelligent solutions",
            startDate: new Date('2024-06-01')
        },
        {
            title: "Mobile App Hackathon",
            description: "Develop innovative mobile apps",
            startDate: new Date('2024-06-15')
        }
    ];
    displayHackathons(hackathons);
}

function displayHackathons(hackathons) {
    const hackathonsList = document.getElementById('hackathonsList');
    if (!hackathonsList) return;

    hackathonsList.innerHTML = hackathons.map(hackathon => `
        <div class="col-md-4">
            <div class="feature-card">
                <h3>${hackathon.title}</h3>
                <p>${hackathon.description}</p>
                <p class="text-muted">
                    <small>Starting: ${new Date(hackathon.startDate).toLocaleDateString()}</small>
                </p>
                <a href="https://hackhub-fqxx.onrender.com/pages/hackathon-details.html?id=${hackathon._id}" 
                   class="btn btn-primary">Learn More</a>
            </div>
        </div>
    `).join('');
}

function inviteJudge(judgeId) {
    const hackathonId = document.getElementById('hackathonSelect').value;
    
    fetch('https://hackhub-fqxx.onrender.com/api/hackathons/invite-judge', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            hackathonId,
            judgeId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Judge invited successfully!');
            // Optionally refresh the judges list or update UI
        } else {
            alert('Failed to invite judge: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to invite judge. Please try again.');
    });
}

function enableEdit() {
    const form = document.getElementById('profileForm');
    const inputs = form.querySelectorAll('input, textarea');
    const actions = form.querySelector('.form-actions');
    
    inputs.forEach(input => input.disabled = false);
    actions.style.display = 'block';
}

function cancelEdit() {
    const form = document.getElementById('profileForm');
    const inputs = form.querySelectorAll('input, textarea');
    const actions = form.querySelector('.form-actions');
    
    inputs.forEach(input => input.disabled = true);
    actions.style.display = 'none';
    form.reset();
}

function saveProfile() {
    const form = document.getElementById('profileForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Add social links if they exist
    const linkedin = document.querySelector('input[name="linkedin"]');
    const twitter = document.querySelector('input[name="twitter"]');
    const github = document.querySelector('input[name="github"]');
    
    if (linkedin) data.linkedin = linkedin.value;
    if (twitter) data.twitter = twitter.value;
    if (github) data.github = github.value;

    fetch('https://hackhub-fqxx.onrender.com/profile/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            const successAlert = document.createElement('div');
            successAlert.className = 'alert alert-success alert-dismissible fade show';
            successAlert.innerHTML = `
                Profile updated successfully!
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            form.insertBefore(successAlert, form.firstChild);
            
            // Disable form fields and hide actions
            cancelEdit();
            
            // Reload page after 1 second
            setTimeout(() => window.location.reload(), 1000);
        } else {
            throw new Error(data.message || 'Failed to update profile');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Show error message
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger alert-dismissible fade show';
        errorAlert.innerHTML = `
            ${error.message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        form.insertBefore(errorAlert, form.firstChild);
    });
}

function resetProfile() {
    if (confirm('Are you sure you want to reset your profile? This cannot be undone.')) {
        fetch('https://hackhub-fqxx.onrender.com/profile/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Profile reset successfully. The page will now reload.');
                window.location.reload();
            } else {
                throw new Error(data.message || 'Failed to reset profile');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to reset profile: ' + error.message);
        });
    }
}

function filterSubmissions() {
    const hackathonId = document.getElementById('hackathonFilter').value;
    const status = document.getElementById('statusFilter').value;

    fetch(`https://hackhub-fqxx.onrender.com/api/submissions/filter?hackathon=${hackathonId}&status=${status}`)
        .then(response => response.json())
        .then(data => {
            updateSubmissionsTable(data);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to filter submissions');
        });
}

function viewSubmissionDetails(submissionId) {
    fetch(`https://hackhub-fqxx.onrender.com/api/submissions/${submissionId}`)
        .then(response => response.json())
        .then(submission => {
            const modal = document.getElementById('submissionDetailsContent');
            modal.innerHTML = `
                <div class="submission-details">
                    <h4>${submission.projectName}</h4>
                    <div class="mb-4">
                        <h6>Description</h6>
                        <p>${submission.description}</p>
                    </div>
                    <div class="mb-4">
                        <h6>Project Links</h6>
                        <ul class="list-unstyled">
                            <li><strong>GitHub:</strong> <a href="${submission.githubLink}" target="_blank">${submission.githubLink}</a></li>
                            <li><strong>Demo:</strong> <a href="${submission.demoLink}" target="_blank">${submission.demoLink}</a></li>
                        </ul>
                    </div>
                    <div class="mb-4">
                        <h6>Team Members</h6>
                        <ul>
                            ${submission.teamMembers.map(member => `
                                <li>${member.firstName} ${member.lastName}</li>
                            `).join('')}
                        </ul>
                    </div>
                    ${submission.status !== 'reviewed' ? `
                        <div class="mt-4">
                            <h6>Evaluation</h6>
                            <form id="evaluationForm">
                                <input type="hidden" name="submissionId" value="${submission._id}">
                                <div class="mb-3">
                                    <label class="form-label">Score (0-100)</label>
                                    <input type="number" class="form-control" name="score" min="0" max="100" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Feedback</label>
                                    <textarea class="form-control" name="feedback" rows="3" required></textarea>
                                </div>
                                <button type="button" class="btn btn-primary" onclick="submitEvaluation()">
                                    Submit Evaluation
                                </button>
                            </form>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Show the modal
            const detailsModal = new bootstrap.Modal(document.getElementById('submissionDetailsModal'));
            detailsModal.show();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to load submission details');
        });
}

function submitEvaluation() {
    const form = document.getElementById('evaluationForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    fetch(`https://hackhub-fqxx.onrender.com/api/submissions/${data.submissionId}/evaluate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Evaluation submitted successfully');
            // Close the details modal
            bootstrap.Modal.getInstance(document.getElementById('submissionDetailsModal')).hide();
            // Refresh the submissions table
            filterSubmissions();
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to submit evaluation');
    });
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    // Save theme preference
    localStorage.setItem('theme', theme);
} 