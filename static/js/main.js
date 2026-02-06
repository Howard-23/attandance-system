// ===== Main JavaScript for Attendance System =====

// API Base URL
const API_BASE_URL = '';

// ===== Utility Functions =====

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return '-';
    return timeStr;
}

function calculateWorkHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return '-';
    
    const [inHours, inMinutes, inSeconds] = checkIn.split(':').map(Number);
    const [outHours, outMinutes, outSeconds] = checkOut.split(':').map(Number);
    
    const checkInDate = new Date(2000, 0, 1, inHours, inMinutes, inSeconds);
    const checkOutDate = new Date(2000, 0, 1, outHours, outMinutes, outSeconds);
    
    let diff = (checkOutDate - checkInDate) / (1000 * 60 * 60); // hours
    
    return diff.toFixed(2) + 'h';
}

function getStatusBadge(status) {
    const statusMap = {
        'present': '<span class="badge badge-success">Present</span>',
        'absent': '<span class="badge badge-danger">Absent</span>',
        'leave': '<span class="badge badge-warning">Leave</span>',
        'half_day': '<span class="badge badge-info">Half Day</span>'
    };
    return statusMap[status] || '<span class="badge badge-secondary">Unknown</span>';
}

// ===== API Functions =====

async function apiGet(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('API GET Error:', error);
        throw error;
    }
}

async function apiPost(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Request failed');
        return result;
    } catch (error) {
        console.error('API POST Error:', error);
        throw error;
    }
}

async function apiPut(url, data) {
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Request failed');
        return result;
    } catch (error) {
        console.error('API PUT Error:', error);
        throw error;
    }
}

async function apiDelete(url) {
    try {
        const response = await fetch(url, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Request failed');
        return result;
    } catch (error) {
        console.error('API DELETE Error:', error);
        throw error;
    }
}

// ===== Mobile Menu Toggle =====
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
});

// ===== Auto-update time for modals =====
function startTimeUpdate(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    function updateTime() {
        const now = new Date();
        element.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
    
    updateTime();
    return setInterval(updateTime, 1000);
}
