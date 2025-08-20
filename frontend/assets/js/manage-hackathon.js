document.addEventListener('DOMContentLoaded', function() {
    // Only load manageable hackathons if we're on the manage hackathon page
    const manageableTable = document.getElementById('manageableHackathonsTable');
    if (manageableTable) {
        loadManageableHackathons();
    }
});

async function loadManageableHackathons() {
    try {
        const response = await fetch('https://hackhub-fqxx.onrender.com/api/hackathons/manageable', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch hackathons');
        }

        const hackathons = await response.json();
        const tableBody = document.getElementById('manageableHackathonsTable');
        if (tableBody) {
            updateHackathonsTable(hackathons);
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('error', 'Failed to load hackathons');
    }
}

function updateHackathonsTable(hackathons) {
    const tableBody = document.getElementById('manageableHackathonsTable');
    
    if (hackathons.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No manageable hackathons found</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = hackathons.map(hackathon => `
        <tr>
            <td>${hackathon.title}</td>
            <td>${new Date(hackathon.startDate).toLocaleDateString()}</td>
            <td>${new Date(hackathon.endDate).toLocaleDateString()}</td>
            <td>
                <span class="badge bg-${getStatusBadgeColor(hackathon)}">
                    ${hackathon.status.toUpperCase()}
                </span>
            </td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="confirmDelete('${hackathon._id}', '${hackathon.title}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function getStatusBadgeColor(hackathon) {
    const now = new Date();
    const startDate = new Date(hackathon.startDate);
    
    if (startDate > now) {
        return 'warning';
    }
    return 'success';
}

function confirmDelete(hackathonId, hackathonTitle) {
    const modal = new bootstrap.Modal(document.getElementById('deleteHackathonModal'));
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    confirmBtn.onclick = () => deleteHackathon(hackathonId);
    modal.show();
}

async function deleteHackathon(hackathonId) {
    try {
        const response = await fetch(`https://hackhub-fqxx.onrender.com/api/hackathons/${hackathonId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete hackathon');
        }

        // Close modal and refresh list
        bootstrap.Modal.getInstance(document.getElementById('deleteHackathonModal')).hide();
        showAlert('success', 'Hackathon deleted successfully');
        loadManageableHackathons();
    } catch (error) {
        console.error('Error:', error);
        showAlert('error', error.message);
    }
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

async function createHackathon() {
    try {
        const form = document.getElementById('createHackathonForm');
        const formData = {
            title: form.title.value,
            description: form.description.value,
            startDate: form.startDate.value,
            endDate: form.endDate.value,
            registrationDeadline: form.registrationDeadline.value,
            maxParticipants: form.maxParticipants.value,
            prizePool: form.prizePool.value,
            tags: form.tags.value,
            rules: form.rules.value
        };

        const response = await fetch('https://hackhub-fqxx.onrender.com/api/hackathons/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('createHackathonModal')).hide();
            showAlert('success', 'Hackathon created successfully');
            // Refresh the hackathons list if it exists
            if (typeof loadManageableHackathons === 'function') {
                loadManageableHackathons();
            }
            // Reload page to show new hackathon
            setTimeout(() => window.location.reload(), 1000);
        } else {
            throw new Error(data.message || 'Failed to create hackathon');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('error', 'Failed to create hackathon: ' + error.message);
    }
} 