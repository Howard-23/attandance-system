// ===== Employees JavaScript =====

let employees = [];
let editingEmployeeId = null;

// Load employees from API
async function loadEmployees() {
    try {
        employees = await apiGet('/api/employees');
        renderEmployeesTable(employees);
    } catch (error) {
        console.error('Error loading employees:', error);
        showToast('Failed to load employees', 'error');
    }
}

// Render employees table
function renderEmployeesTable(data) {
    const tbody = document.querySelector('#employeesTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No employees found</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(emp => `
        <tr>
            <td><strong>${emp.id}</strong></td>
            <td>${emp.name}</td>
            <td>${emp.department}</td>
            <td>${emp.position}</td>
            <td>${emp.email}</td>
            <td>${emp.phone || '-'}</td>
            <td>
                <span class="badge ${emp.status === 'active' ? 'badge-success' : 'badge-secondary'}">
                    ${emp.status}
                </span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editEmployee('${emp.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="confirmDeleteEmployee('${emp.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Search employees
document.getElementById('searchEmployee')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.email.toLowerCase().includes(searchTerm) ||
        emp.department.toLowerCase().includes(searchTerm) ||
        emp.position.toLowerCase().includes(searchTerm) ||
        emp.id.toLowerCase().includes(searchTerm)
    );
    renderEmployeesTable(filtered);
});

// Modal Functions
function openEmployeeModal(employeeId = null) {
    const modal = document.getElementById('employeeModal');
    const title = document.getElementById('modalTitle');
    
    editingEmployeeId = employeeId;
    
    if (employeeId) {
        title.textContent = 'Edit Employee';
        const emp = employees.find(e => e.id === employeeId);
        if (emp) {
            document.getElementById('employeeId').value = emp.id;
            document.getElementById('empName').value = emp.name;
            document.getElementById('empEmail').value = emp.email;
            document.getElementById('empDepartment').value = emp.department;
            document.getElementById('empPosition').value = emp.position;
            document.getElementById('empPhone').value = emp.phone || '';
            document.getElementById('empJoinDate').value = emp.join_date;
            document.getElementById('empStatus').value = emp.status;
        }
    } else {
        title.textContent = 'Add Employee';
        document.getElementById('employeeForm').reset();
        document.getElementById('employeeId').value = '';
        document.getElementById('empJoinDate').value = new Date().toISOString().split('T')[0];
    }
    
    modal.classList.add('active');
}

function closeEmployeeModal() {
    const modal = document.getElementById('employeeModal');
    modal.classList.remove('active');
    editingEmployeeId = null;
}

// Save employee
async function saveEmployee() {
    const form = document.getElementById('employeeForm');
    
    // Validation
    const name = document.getElementById('empName').value.trim();
    const email = document.getElementById('empEmail').value.trim();
    const department = document.getElementById('empDepartment').value;
    const position = document.getElementById('empPosition').value.trim();
    
    if (!name || !email || !department || !position) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const employeeData = {
        name: name,
        email: email,
        department: department,
        position: position,
        phone: document.getElementById('empPhone').value.trim(),
        join_date: document.getElementById('empJoinDate').value,
        status: document.getElementById('empStatus').value
    };
    
    try {
        if (editingEmployeeId) {
            await apiPut(`/api/employees/${editingEmployeeId}`, employeeData);
            showToast('Employee updated successfully');
        } else {
            await apiPost('/api/employees', employeeData);
            showToast('Employee added successfully');
        }
        
        closeEmployeeModal();
        loadEmployees();
    } catch (error) {
        showToast(error.message || 'Failed to save employee', 'error');
    }
}

// Edit employee
function editEmployee(employeeId) {
    openEmployeeModal(employeeId);
}

// Delete confirmation
function confirmDeleteEmployee(employeeId) {
    document.getElementById('deleteEmployeeId').value = employeeId;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
}

// Confirm delete
async function confirmDelete() {
    const employeeId = document.getElementById('deleteEmployeeId').value;
    
    try {
        await apiDelete(`/api/employees/${employeeId}`);
        showToast('Employee deleted successfully');
        closeDeleteModal();
        loadEmployees();
    } catch (error) {
        showToast('Failed to delete employee', 'error');
    }
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// Load employees on page load
document.addEventListener('DOMContentLoaded', loadEmployees);
