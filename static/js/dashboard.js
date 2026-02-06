// ===== Dashboard JavaScript =====

// Update current date
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// Load dashboard stats
async function loadDashboardStats() {
    try {
        const stats = await apiGet('/api/dashboard/stats');
        
        // Update stat cards
        document.getElementById('totalEmployees').textContent = stats.total_employees;
        document.getElementById('presentToday').textContent = stats.present_today;
        document.getElementById('checkedOutToday').textContent = stats.checked_out_today;
        document.getElementById('absentToday').textContent = stats.absent_today;
        document.getElementById('avgHours').textContent = stats.avg_work_hours + 'h';
        
        // Update attendance progress ring
        const total = stats.present_today + stats.checked_out_today + stats.absent_today;
        const present = stats.present_today + stats.checked_out_today;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        
        document.getElementById('attendancePercent').textContent = percentage + '%';
        
        // Animate progress ring
        const circle = document.getElementById('attendanceProgress');
        const circumference = 2 * Math.PI * 50; // r=50
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        // Load recent activity
        loadRecentActivity(stats.recent_activity);
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

function loadRecentActivity(activities) {
    const tbody = document.querySelector('#recentActivityTable tbody');
    
    if (activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No recent activity</td></tr>';
        return;
    }
    
    tbody.innerHTML = activities.map(activity => `
        <tr>
            <td>${activity.employee_name || 'Unknown'}</td>
            <td>${formatDate(activity.date)}</td>
            <td>${formatTime(activity.check_in)}</td>
            <td>${formatTime(activity.check_out)}</td>
            <td>${getStatusBadge(activity.status)}</td>
        </tr>
    `).join('');
}

// Load stats on page load
document.addEventListener('DOMContentLoaded', loadDashboardStats);
