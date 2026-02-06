// ===== Reports JavaScript =====

let employees = [];
let reportData = null;

// Load employees for dropdown
async function loadEmployees() {
    try {
        employees = await apiGet('/api/employees');
        const dropdown = document.getElementById('reportEmployee');
        
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.id} - ${emp.name}`;
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Set default date range (current month)
function setDefaultDateRange() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('reportStartDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
}

// Generate report
async function generateReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const employeeId = document.getElementById('reportEmployee').value;
    
    if (!startDate || !endDate) {
        showToast('Please select both start and end dates', 'error');
        return;
    }
    
    if (startDate > endDate) {
        showToast('Start date cannot be after end date', 'error');
        return;
    }
    
    try {
        const params = new URLSearchParams();
        params.append('start_date', startDate);
        params.append('end_date', endDate);
        if (employeeId) params.append('employee_id', employeeId);
        
        reportData = await apiGet(`/api/reports/attendance?${params.toString()}`);
        
        // Show cards and hide empty state
        document.getElementById('noDataMessage').style.display = 'none';
        document.getElementById('summaryCards').style.display = 'grid';
        document.getElementById('employeeSummaryCard').style.display = 'block';
        document.getElementById('detailedRecordsCard').style.display = 'block';
        
        // Render summary
        renderSummary(reportData.summary);
        
        // Render employee summary
        renderEmployeeSummary(reportData.summary);
        
        // Render detailed records
        renderDetailedRecords(reportData.records);
        
        showToast('Report generated successfully');
    } catch (error) {
        console.error('Error generating report:', error);
        showToast('Failed to generate report', 'error');
    }
}

function renderSummary(summary) {
    let totalDays = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHours = 0;
    
    summary.forEach(emp => {
        totalDays += emp.total_days;
        totalPresent += emp.present_days;
        totalAbsent += emp.absent_days;
        totalHours += emp.total_hours;
    });
    
    const avgHours = summary.length > 0 ? (totalHours / summary.length).toFixed(2) : 0;
    
    document.getElementById('summaryTotalDays').textContent = totalDays;
    document.getElementById('summaryPresentDays').textContent = totalPresent;
    document.getElementById('summaryAbsentDays').textContent = totalAbsent;
    document.getElementById('summaryAvgHours').textContent = avgHours + 'h';
}

function renderEmployeeSummary(summary) {
    const tbody = document.querySelector('#employeeSummaryTable tbody');
    
    if (summary.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = summary.map(emp => {
        const attendancePercent = emp.total_days > 0 
            ? Math.round((emp.present_days / emp.total_days) * 100) 
            : 0;
        
        let percentClass = 'badge-success';
        if (attendancePercent < 75) percentClass = 'badge-danger';
        else if (attendancePercent < 90) percentClass = 'badge-warning';
        
        return `
            <tr>
                <td><strong>${emp.employee_id}</strong></td>
                <td>${emp.employee_name}</td>
                <td>${emp.department}</td>
                <td>${emp.total_days}</td>
                <td>${emp.present_days}</td>
                <td>${emp.absent_days}</td>
                <td>${emp.total_hours}h</td>
                <td>${emp.avg_hours}h</td>
                <td><span class="badge ${percentClass}">${attendancePercent}%</span></td>
            </tr>
        `;
    }).join('');
}

function renderDetailedRecords(records) {
    const tbody = document.querySelector('#detailedRecordsTable tbody');
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No records found</td></tr>';
        return;
    }
    
    // Sort by date descending
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = records.map(record => `
        <tr>
            <td><strong>${record.employee_id}</strong></td>
            <td>${formatDate(record.date)}</td>
            <td>${formatTime(record.check_in)}</td>
            <td>${formatTime(record.check_out)}</td>
            <td>${calculateWorkHours(record.check_in, record.check_out)}</td>
            <td>${getStatusBadge(record.status)}</td>
        </tr>
    `).join('');
}

// Export to CSV
function exportReport() {
    if (!reportData) {
        showToast('Please generate a report first', 'error');
        return;
    }
    
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    // Create CSV content
    let csv = 'Employee ID,Name,Department,Total Days,Present Days,Absent Days,Total Hours,Avg Hours/Day\n';
    
    reportData.summary.forEach(emp => {
        csv += `${emp.employee_id},"${emp.employee_name}","${emp.department}",${emp.total_days},${emp.present_days},${emp.absent_days},${emp.total_hours},${emp.avg_hours}\n`;
    });
    
    csv += '\n\nDetailed Records\n';
    csv += 'Employee ID,Date,Check In,Check Out,Work Hours,Status\n';
    
    reportData.records.forEach(record => {
        const workHours = calculateWorkHours(record.check_in, record.check_out);
        csv += `${record.employee_id},${record.date},${record.check_in || ''},${record.check_out || ''},${workHours},${record.status}\n`;
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('Report exported successfully');
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadEmployees();
    setDefaultDateRange();
});
