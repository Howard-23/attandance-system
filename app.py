"""
Employee Attendance System
A web-based application to track employee attendance.
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for
from datetime import datetime, date, timedelta
import os
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'attendance-system-secret-key'

# Data storage (using JSON files for simplicity)
DATA_DIR = 'data'
EMPLOYEES_FILE = os.path.join(DATA_DIR, 'employees.json')
ATTENDANCE_FILE = os.path.join(DATA_DIR, 'attendance.json')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize data files if they don't exist
def init_data_files():
    if not os.path.exists(EMPLOYEES_FILE):
        with open(EMPLOYEES_FILE, 'w') as f:
            json.dump([], f)
    if not os.path.exists(ATTENDANCE_FILE):
        with open(ATTENDANCE_FILE, 'w') as f:
            json.dump([], f)

def load_employees():
    try:
        with open(EMPLOYEES_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_employees(employees):
    with open(EMPLOYEES_FILE, 'w') as f:
        json.dump(employees, f, indent=2)

def load_attendance():
    try:
        with open(ATTENDANCE_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_attendance(attendance):
    with open(ATTENDANCE_FILE, 'w') as f:
        json.dump(attendance, f, indent=2)

def generate_employee_id():
    employees = load_employees()
    if not employees:
        return "EMP001"
    max_id = max([int(emp['id'].replace('EMP', '')) for emp in employees])
    return f"EMP{max_id + 1:03d}"

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/employees')
def employees_page():
    return render_template('employees.html')

@app.route('/attendance')
def attendance_page():
    return render_template('attendance.html')

@app.route('/reports')
def reports_page():
    return render_template('reports.html')

# API Routes - Employees
@app.route('/api/employees', methods=['GET'])
def get_employees():
    employees = load_employees()
    return jsonify(employees)

@app.route('/api/employees', methods=['POST'])
def add_employee():
    data = request.json
    employees = load_employees()
    
    new_employee = {
        'id': generate_employee_id(),
        'name': data.get('name'),
        'email': data.get('email'),
        'department': data.get('department'),
        'position': data.get('position'),
        'phone': data.get('phone'),
        'join_date': data.get('join_date', datetime.now().strftime('%Y-%m-%d')),
        'status': 'active'
    }
    
    employees.append(new_employee)
    save_employees(employees)
    
    return jsonify({'success': True, 'employee': new_employee})

@app.route('/api/employees/<employee_id>', methods=['PUT'])
def update_employee(employee_id):
    data = request.json
    employees = load_employees()
    
    for emp in employees:
        if emp['id'] == employee_id:
            emp['name'] = data.get('name', emp['name'])
            emp['email'] = data.get('email', emp['email'])
            emp['department'] = data.get('department', emp['department'])
            emp['position'] = data.get('position', emp['position'])
            emp['phone'] = data.get('phone', emp['phone'])
            emp['status'] = data.get('status', emp['status'])
            break
    
    save_employees(employees)
    return jsonify({'success': True})

@app.route('/api/employees/<employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    employees = load_employees()
    employees = [emp for emp in employees if emp['id'] != employee_id]
    save_employees(employees)
    return jsonify({'success': True})

# API Routes - Attendance
@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    attendance = load_attendance()
    employee_id = request.args.get('employee_id')
    date_filter = request.args.get('date')
    
    filtered = attendance
    
    if employee_id:
        filtered = [a for a in filtered if a['employee_id'] == employee_id]
    
    if date_filter:
        filtered = [a for a in filtered if a['date'] == date_filter]
    
    # Sort by date and time (newest first)
    filtered.sort(key=lambda x: (x['date'], x['check_in'] or ''), reverse=True)
    
    return jsonify(filtered)

@app.route('/api/attendance/today', methods=['GET'])
def get_today_attendance():
    today = date.today().strftime('%Y-%m-%d')
    attendance = load_attendance()
    today_records = [a for a in attendance if a['date'] == today]
    
    # Add employee info to each record
    employees = {emp['id']: emp for emp in load_employees()}
    for record in today_records:
        emp = employees.get(record['employee_id'], {})
        record['employee_name'] = emp.get('name', 'Unknown')
        record['department'] = emp.get('department', 'Unknown')
    
    return jsonify(today_records)

@app.route('/api/attendance/checkin', methods=['POST'])
def check_in():
    data = request.json
    employee_id = data.get('employee_id')
    
    if not employee_id:
        return jsonify({'success': False, 'message': 'Employee ID is required'}), 400
    
    # Check if employee exists
    employees = load_employees()
    employee = next((emp for emp in employees if emp['id'] == employee_id), None)
    if not employee:
        return jsonify({'success': False, 'message': 'Employee not found'}), 404
    
    today = date.today().strftime('%Y-%m-%d')
    now_time = datetime.now().strftime('%H:%M:%S')
    
    attendance = load_attendance()
    
    # Check if already checked in today
    existing = next((a for a in attendance if a['employee_id'] == employee_id and a['date'] == today), None)
    
    if existing and existing.get('check_in'):
        return jsonify({'success': False, 'message': 'Already checked in today'}), 400
    
    if existing:
        existing['check_in'] = now_time
    else:
        new_record = {
            'id': len(attendance) + 1,
            'employee_id': employee_id,
            'date': today,
            'check_in': now_time,
            'check_out': None,
            'status': 'present'
        }
        attendance.append(new_record)
    
    save_attendance(attendance)
    return jsonify({'success': True, 'message': 'Check-in successful', 'time': now_time})

@app.route('/api/attendance/checkout', methods=['POST'])
def check_out():
    data = request.json
    employee_id = data.get('employee_id')
    
    if not employee_id:
        return jsonify({'success': False, 'message': 'Employee ID is required'}), 400
    
    today = date.today().strftime('%Y-%m-%d')
    now_time = datetime.now().strftime('%H:%M:%S')
    
    attendance = load_attendance()
    
    # Find today's record
    record = next((a for a in attendance if a['employee_id'] == employee_id and a['date'] == today), None)
    
    if not record:
        return jsonify({'success': False, 'message': 'No check-in record found for today'}), 400
    
    if record.get('check_out'):
        return jsonify({'success': False, 'message': 'Already checked out today'}), 400
    
    record['check_out'] = now_time
    save_attendance(attendance)
    
    return jsonify({'success': True, 'message': 'Check-out successful', 'time': now_time})

@app.route('/api/attendance/manual', methods=['POST'])
def add_manual_attendance():
    """Add or update attendance record manually (for admins)"""
    data = request.json
    attendance = load_attendance()
    
    employee_id = data.get('employee_id')
    record_date = data.get('date')
    
    # Check if record exists
    existing = next((a for a in attendance if a['employee_id'] == employee_id and a['date'] == record_date), None)
    
    if existing:
        existing['check_in'] = data.get('check_in') or existing.get('check_in')
        existing['check_out'] = data.get('check_out') or existing.get('check_out')
        existing['status'] = data.get('status', existing.get('status', 'present'))
    else:
        new_record = {
            'id': len(attendance) + 1,
            'employee_id': employee_id,
            'date': record_date,
            'check_in': data.get('check_in'),
            'check_out': data.get('check_out'),
            'status': data.get('status', 'present')
        }
        attendance.append(new_record)
    
    save_attendance(attendance)
    return jsonify({'success': True})

@app.route('/api/attendance/<int:record_id>', methods=['DELETE'])
def delete_attendance(record_id):
    attendance = load_attendance()
    attendance = [a for a in attendance if a['id'] != record_id]
    save_attendance(attendance)
    return jsonify({'success': True})

# Dashboard Statistics
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    employees = load_employees()
    attendance = load_attendance()
    today = date.today().strftime('%Y-%m-%d')
    
    today_records = [a for a in attendance if a['date'] == today]
    
    # Count by status
    present_count = len([a for a in today_records if a.get('check_in') and not a.get('check_out')])
    checked_out_count = len([a for a in today_records if a.get('check_out')])
    absent_count = len(employees) - len(today_records)
    
    # Calculate work hours for checked out employees
    total_hours = 0
    for record in today_records:
        if record.get('check_in') and record.get('check_out'):
            try:
                check_in_time = datetime.strptime(record['check_in'], '%H:%M:%S')
                check_out_time = datetime.strptime(record['check_out'], '%H:%M:%S')
                hours = (check_out_time - check_in_time).total_seconds() / 3600
                total_hours += hours
            except:
                pass
    
    avg_hours = checked_out_count if checked_out_count == 0 else round(total_hours / checked_out_count, 2)
    
    # Recent activity (last 5)
    recent_activity = sorted(attendance, key=lambda x: (x['date'], x['check_in'] or ''), reverse=True)[:5]
    employees_dict = {emp['id']: emp for emp in employees}
    
    for activity in recent_activity:
        emp = employees_dict.get(activity['employee_id'], {})
        activity['employee_name'] = emp.get('name', 'Unknown')
    
    return jsonify({
        'total_employees': len(employees),
        'present_today': present_count,
        'checked_out_today': checked_out_count,
        'absent_today': absent_count,
        'avg_work_hours': avg_hours,
        'recent_activity': recent_activity
    })

# Reports API
@app.route('/api/reports/attendance', methods=['GET'])
def get_attendance_report():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    employee_id = request.args.get('employee_id')
    
    attendance = load_attendance()
    employees = load_employees()
    
    # Filter by date range
    if start_date:
        attendance = [a for a in attendance if a['date'] >= start_date]
    if end_date:
        attendance = [a for a in attendance if a['date'] <= end_date]
    if employee_id:
        attendance = [a for a in attendance if a['employee_id'] == employee_id]
    
    # Calculate summary
    employees_dict = {emp['id']: emp for emp in employees}
    summary = {}
    
    for record in attendance:
        emp_id = record['employee_id']
        if emp_id not in summary:
            emp = employees_dict.get(emp_id, {})
            summary[emp_id] = {
                'employee_id': emp_id,
                'employee_name': emp.get('name', 'Unknown'),
                'department': emp.get('department', 'Unknown'),
                'total_days': 0,
                'present_days': 0,
                'absent_days': 0,
                'total_hours': 0
            }
        
        summary[emp_id]['total_days'] += 1
        
        if record.get('check_in'):
            summary[emp_id]['present_days'] += 1
            
            if record.get('check_out'):
                try:
                    check_in_time = datetime.strptime(record['check_in'], '%H:%M:%S')
                    check_out_time = datetime.strptime(record['check_out'], '%H:%M:%S')
                    hours = (check_out_time - check_in_time).total_seconds() / 3600
                    summary[emp_id]['total_hours'] += hours
                except:
                    pass
        else:
            summary[emp_id]['absent_days'] += 1
    
    # Calculate averages
    for emp_id, data in summary.items():
        if data['present_days'] > 0:
            data['avg_hours'] = round(data['total_hours'] / data['present_days'], 2)
        else:
            data['avg_hours'] = 0
        data['total_hours'] = round(data['total_hours'], 2)
    
    return jsonify({
        'records': attendance,
        'summary': list(summary.values())
    })

if __name__ == '__main__':
    init_data_files()
    app.run(debug=True, host='0.0.0.0', port=5000)
