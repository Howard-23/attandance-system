// ===== Attendance JavaScript =====

let employees = [];
let todayAttendance = [];
let attendanceHistory = [];
let checkInTimeInterval = null;
let checkOutTimeInterval = null;

// Set today's date
document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
});

// Load employees for dropdowns
async function loadEmployees() {
    try {
        employees = await apiGet('/api/employees');
        populateEmployeeDropdowns();
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Populate employee dropdowns
function populateEmployeeDropdowns() {
    const dropdowns = [
        'checkInEmployee',
        'checkOutEmployee',
        'manualEmployee',
        'filterEmployee'
    ];
    
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    
    dropdowns.forEach(id => {
        const dropdown = document.getElementById(id);
        if (!dropdown) return;
        
        const currentValue = dropdown.value;
        
        // Keep first option
        const firstOption = dropdown.options[0];
        dropdown.innerHTML = '';
        dropdown.appendChild(firstOption);
        
        activeEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.id} - ${emp.name}`;
            dropdown.appendChild(option);
        });
        
        if (currentValue) dropdown.value = currentValue;
    });
}

// Load today's attendance
async function loadTodayAttendance() {
    try {
        todayAttendance = await apiGet('/api/attendance/today');
        renderTodayAttendance();
    } catch (error) {
        console.error('Error loading today attendance:', error);
    }
}

// Render today's attendance table
function renderTodayAttendance() {
    const tbody = document.querySelector('#todayAttendanceTable tbody');
    
    if (todayAttendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No attendance records for today</td></tr>';
        return;
    }
    
    tbody.innerHTML = todayAttendance.map(record => {
        const status = record.check_out ? 'checked_out' : (record.check_in ? 'present' : 'absent');
        let statusBadge = '';
        
        switch(status) {
            case 'present':
                statusBadge = '<span class="badge badge-success">Present</span>';
                break;
            case 'checked_out':
                statusBadge = '<span class="badge badge-info">Checked Out</span>';
                break;
            default:
                statusBadge = '<span class="badge badge-secondary">Absent</span>';
        }
        
        return `
            <tr>
                <td><strong>${record.employee_id}</strong></td>
                <td>${record.employee_name || 'Unknown'}</td>
                <td>${record.department || 'Unknown'}</td>
                <td>${formatTime(record.check_in)}</td>
                <td>${formatTime(record.check_out)}</td>
                <td>${calculateWorkHours(record.check_in, record.check_out)}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

// Load attendance history
async function loadAttendanceHistory() {
    try {
        const params = new URLSearchParams();
        const dateFilter = document.getElementById('filterDate').value;
        const employeeFilter = document.getElementById('filterEmployee').value;
        
        if (dateFilter) params.append('date', dateFilter);
        if (employeeFilter) params.append('employee_id', employeeFilter);
        
        attendanceHistory = await apiGet(`/api/attendance?${params.toString()}`);
        renderAttendanceHistory();
    } catch (error) {
        console.error('Error loading attendance history:', error);
    }
}

// Render attendance history
function renderAttendanceHistory() {
    const tbody = document.querySelector('#attendanceHistoryTable tbody');
    
    if (attendanceHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No attendance records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = attendanceHistory.map(record => `
        <tr>
            <td><strong>${record.employee_id}</strong></td>
            <td>${formatDate(record.date)}</td>
            <td>${formatTime(record.check_in)}</td>
            <td>${formatTime(record.check_out)}</td>
            <td>${calculateWorkHours(record.check_in, record.check_out)}</td>
            <td>${getStatusBadge(record.status)}</td>
            <td>
                <button class="btn-delete btn-sm" onclick="deleteAttendance(${record.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Filter attendance
function filterAttendance() {
    loadAttendanceHistory();
}

function resetFilter() {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterEmployee').value = '';
    loadAttendanceHistory();
}

// Check In Modal
function openCheckInModal() {
    document.getElementById('checkInModal').classList.add('active');
    checkInTimeInterval = startTimeUpdate('checkInTimeDisplay');
}

function closeCheckInModal() {
    document.getElementById('checkInModal').classList.remove('active');
    if (checkInTimeInterval) {
        clearInterval(checkInTimeInterval);
        checkInTimeInterval = null;
    }
}

async function submitCheckIn() {
    const employeeId = document.getElementById('checkInEmployee').value;
    
    if (!employeeId) {
        showToast('Please select an employee', 'error');
        return;
    }
    
    try {
        await apiPost('/api/attendance/checkin', { employee_id: employeeId });
        showToast('Check-in successful');
        closeCheckInModal();
        loadTodayAttendance();
        loadAttendanceHistory();
    } catch (error) {
        showToast(error.message || 'Check-in failed', 'error');
    }
}

// Check Out Modal
function openCheckOutModal() {
    document.getElementById('checkOutModal').classList.add('active');
    checkOutTimeInterval = startTimeUpdate('checkOutTimeDisplay');
}

function closeCheckOutModal() {
    document.getElementById('checkOutModal').classList.remove('active');
    if (checkOutTimeInterval) {
        clearInterval(checkOutTimeInterval);
        checkOutTimeInterval = null;
    }
}

async function submitCheckOut() {
    const employeeId = document.getElementById('checkOutEmployee').value;
    
    if (!employeeId) {
        showToast('Please select an employee', 'error');
        return;
    }
    
    try {
        await apiPost('/api/attendance/checkout', { employee_id: employeeId });
        showToast('Check-out successful');
        closeCheckOutModal();
        loadTodayAttendance();
        loadAttendanceHistory();
    } catch (error) {
        showToast(error.message || 'Check-out failed', 'error');
    }
}

// Manual Attendance Modal
function openManualAttendanceModal() {
    document.getElementById('manualAttendanceModal').classList.add('active');
    document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
}

function closeManualAttendanceModal() {
    document.getElementById('manualAttendanceModal').classList.remove('active');
}

async function submitManualAttendance() {
    const employeeId = document.getElementById('manualEmployee').value;
    const date = document.getElementById('manualDate').value;
    const checkIn = document.getElementById('manualCheckIn').value;
    const checkOut = document.getElementById('manualCheckOut').value;
    const status = document.getElementById('manualStatus').value;
    
    if (!employeeId || !date) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate check-in/check-out times
    if (checkIn && checkOut && checkIn > checkOut) {
        showToast('Check-out time must be after check-in time', 'error');
        return;
    }
    
    try {
        await apiPost('/api/attendance/manual', {
            employee_id: employeeId,
            date: date,
            check_in: checkIn || null,
            check_out: checkOut || null,
            status: status
        });
        
        showToast('Attendance record saved successfully');
        closeManualAttendanceModal();
        document.getElementById('manualAttendanceForm').reset();
        loadTodayAttendance();
        loadAttendanceHistory();
    } catch (error) {
        showToast(error.message || 'Failed to save attendance record', 'error');
    }
}

// Delete attendance record
async function deleteAttendance(recordId) {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
        return;
    }
    
    try {
        await apiDelete(`/api/attendance/${recordId}`);
        showToast('Attendance record deleted');
        loadTodayAttendance();
        loadAttendanceHistory();
    } catch (error) {
        showToast('Failed to delete record', 'error');
    }
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        // Clear intervals
        if (checkInTimeInterval) {
            clearInterval(checkInTimeInterval);
            checkInTimeInterval = null;
        }
        if (checkOutTimeInterval) {
            clearInterval(checkOutTimeInterval);
            checkOutTimeInterval = null;
        }
    }
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadEmployees();
    loadTodayAttendance();
    loadAttendanceHistory();
});
