from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash
import os
import datetime
import json
import hashlib
import secrets
from functools import wraps
import pymysql  # Using pymysql for MySQL connection

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)  # Generate a random secret key for sessions
app.permanent_session_lifetime = datetime.timedelta(days=7)  # Set session lifetime

# MySQL Database Configuration for PythonAnywhere
DB_CONFIG = {
    'host': 'florinm12.mysql.pythonanywhere-services.com',
    'user': 'florinm12',
    'password': 'D3n30pr1t.',  # ⚠️ Replace with your actual password
    'database': 'florinm12$greenhouse_db',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def get_db_connection():
    """Get a connection to the MySQL database"""
    return pymysql.connect(**DB_CONFIG)

def init_db():
    """Initialize the database with required tables if they don't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create sensor_data table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sensor_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        temperature FLOAT,
        humidity FLOAT,
        light_level FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create users table for login system
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(64) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Check if we already have users, if not create default admin user
    cursor.execute("SELECT COUNT(*) as count FROM users")
    user_count = cursor.fetchone()['count']
    
    if user_count == 0:
        # Hash the password - in a real application, use a proper password hashing library
        default_password = hashlib.sha256("admin123".encode()).hexdigest()
        
        # Insert default admin user
        cursor.execute(
            "INSERT INTO users (username, password, name, role) VALUES (%s, %s, %s, %s)",
            ("admin", default_password, "Administrator", "admin")
        )
        print("Default admin user created")
    
    conn.commit()
    conn.close()
    print("Database initialized successfully")

# Initialize database when app starts
init_db()

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Admin role required decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        if session.get('user_role') != 'admin':
            flash('You need administrator privileges to access this page', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    """Redirect to login or dashboard based on authentication status"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login"""
    # If user is already logged in, redirect to dashboard
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Hash the password for comparison
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if username exists and password matches
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        conn.close()
        
        if user and user['password'] == hashed_password:
            # Authentication successful - store user info in session
            session['user_id'] = user['id']
            session['user_name'] = user['name']
            session['user_role'] = user['role']
            session['username'] = user['username']
            session.permanent = True  # Make the session persistent
            
            # Redirect to dashboard
            return redirect(url_for('dashboard'))
        else:
            error = "Invalid username or password"
    
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    """Handle user logout"""
    # Clear the session
    session.clear()
    return redirect(url_for('login', message="You have been successfully logged out"))

@app.route('/dashboard')
@login_required
def dashboard():
    """Render the main dashboard page"""
    return render_template('dashboard.html')

@app.route('/user-management')
@admin_required
def user_management():
    """Render the user management page for admins"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all users
    cursor.execute("SELECT * FROM users ORDER BY id")
    users = cursor.fetchall()
    
    # Get user count
    cursor.execute("SELECT COUNT(*) as count FROM users")
    user_count = cursor.fetchone()['count']
    
    conn.close()
    
    return render_template(
        'user_management.html', 
        users=users, 
        user_count=user_count,
        error=request.args.get('error'),
        success=request.args.get('success')
    )

@app.route('/add-user', methods=['POST'])
@admin_required
def add_user():
    """Add a new user"""
    # Get user count
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM users")
    user_count = cursor.fetchone()['count']
    
    # Check if max user limit reached
    if user_count >= 10:
        conn.close()
        return redirect(url_for('user_management', error="Maximum user limit (10) reached"))
    
    # Get form data
    username = request.form.get('username')
    password = request.form.get('password')
    name = request.form.get('name')
    role = request.form.get('role')
    
    # Validate form data
    if not all([username, password, name, role]):
        conn.close()
        return redirect(url_for('user_management', error="All fields are required"))
    
    # Hash the password
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    
    try:
        # Insert new user
        cursor.execute(
            "INSERT INTO users (username, password, name, role) VALUES (%s, %s, %s, %s)",
            (username, hashed_password, name, role)
        )
        conn.commit()
        conn.close()
        return redirect(url_for('user_management', success=f"User '{username}' added successfully"))
    except pymysql.IntegrityError:
        conn.close()
        return redirect(url_for('user_management', error=f"Username '{username}' already exists"))
    except Exception as e:
        conn.close()
        return redirect(url_for('user_management', error=f"Error: {str(e)}"))

@app.route('/edit-user/<int:user_id>', methods=['POST'])
@admin_required
def edit_user(user_id):
    """Edit an existing user"""
    # Get form data
    username = request.form.get('username')
    password = request.form.get('password')
    name = request.form.get('name')
    role = request.form.get('role')
    
    # Validate form data
    if not all([username, name, role]):
        return redirect(url_for('user_management', error="Username, name and role are required"))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if we're editing the last admin
        if role != 'admin':
            cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND id != %s", (user_id,))
            admin_count = cursor.fetchone()['count']
            if admin_count == 0:
                conn.close()
                return redirect(url_for('user_management', error="Cannot change the role of the last administrator"))
        
        # Update user details
        if password:  # If password was provided, update it too
            hashed_password = hashlib.sha256(password.encode()).hexdigest()
            cursor.execute(
                "UPDATE users SET username = %s, password = %s, name = %s, role = %s WHERE id = %s",
                (username, hashed_password, name, role, user_id)
            )
        else:  # Otherwise, just update other fields
            cursor.execute(
                "UPDATE users SET username = %s, name = %s, role = %s WHERE id = %s",
                (username, name, role, user_id)
            )
        
        conn.commit()
        conn.close()
        return redirect(url_for('user_management', success=f"User '{username}' updated successfully"))
    except pymysql.IntegrityError:
        conn.close()
        return redirect(url_for('user_management', error=f"Username '{username}' already exists"))
    except Exception as e:
        conn.close()
        return redirect(url_for('user_management', error=f"Error: {str(e)}"))

@app.route('/delete-user/<int:user_id>')
@admin_required
def delete_user(user_id):
    """Delete a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if we're deleting the last admin
    cursor.execute("SELECT role, username FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return redirect(url_for('user_management', error="User not found"))
    
    if user['role'] == 'admin':
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND id != %s", (user_id,))
        admin_count = cursor.fetchone()['count']
        if admin_count == 0:
            conn.close()
            return redirect(url_for('user_management', error="Cannot delete the last administrator"))
    
    # Delete the user
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    conn.commit()
    conn.close()
    
    return redirect(url_for('user_management', success=f"User '{user['username']}' deleted successfully"))

@app.route('/api/sensor-data', methods=['POST'])
def receive_sensor_data():
    """API endpoint to receive sensor data from Arduino"""
    # This endpoint should remain accessible without authentication 
    # for Arduino devices to send data
    try:
        data = request.json
        print("Received data from Arduino:", data)  # Log the received data
        
        # Handle Arduino JSON format which uses 'ldr' instead of 'light_level'
        temperature = data.get('temperature')
        humidity = data.get('humidity')
        light_level = data.get('ldr')  # Arduino sends 'ldr' for light value
        
        # Validate data
        if None in [temperature, humidity, light_level]:
            missing_fields = []
            if temperature is None: missing_fields.append('temperature')
            if humidity is None: missing_fields.append('humidity')
            if light_level is None: missing_fields.append('ldr')
            
            return jsonify({
                'status': 'error', 
                'message': f'Missing required data fields: {", ".join(missing_fields)}'
            }), 400
        
        # Store data in database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO sensor_data (temperature, humidity, light_level) VALUES (%s, %s, %s)",
            (temperature, humidity, light_level)
        )
        conn.commit()
        conn.close()
        
        # Log successful data storage
        print(f"Stored data: temp={temperature}°C, humidity={humidity}%, light={light_level}")
        
        return jsonify({
            'status': 'success', 
            'message': 'Data received and stored',
            'data': {
                'temperature': temperature,
                'humidity': humidity,
                'light_level': light_level
            }
        }), 201
    
    except Exception as e:
        print(f"Error processing sensor data: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/current-data', methods=['GET'])
@login_required
def get_current_data():
    """API endpoint to get the most recent sensor data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    if row:
        # Convert datetime objects to strings for JSON serialization
        if 'timestamp' in row:
            row['timestamp'] = row['timestamp'].isoformat() if row['timestamp'] else None
        return jsonify(row)
    else:
        return jsonify({'status': 'error', 'message': 'No data available'}), 404

@app.route('/api/historical-data', methods=['GET'])
@login_required
def get_historical_data():
    """API endpoint to get historical sensor data for charts"""
    hours = request.args.get('hours', default=24, type=int)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get data from last X hours
    cursor.execute(
        "SELECT * FROM sensor_data WHERE timestamp >= DATE_SUB(NOW(), INTERVAL %s HOUR) ORDER BY timestamp",
        (hours,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    # Convert datetime objects to strings for JSON serialization
    for row in rows:
        if 'timestamp' in row:
            row['timestamp'] = row['timestamp'].isoformat() if row['timestamp'] else None
    
    return jsonify(rows)

@app.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    """API endpoint to get basic statistics"""
    hours = request.args.get('hours', default=24, type=int)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get min, max, avg for temperature, humidity, light
    cursor.execute(
        """
        SELECT 
            MIN(temperature) as min_temp, 
            MAX(temperature) as max_temp, 
            AVG(temperature) as avg_temp,
            MIN(humidity) as min_humidity, 
            MAX(humidity) as max_humidity, 
            AVG(humidity) as avg_humidity,
            MIN(light_level) as min_light, 
            MAX(light_level) as max_light, 
            AVG(light_level) as avg_light
        FROM sensor_data 
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL %s HOUR)
        """,
        (hours,)
    )
    row = cursor.fetchone()
    conn.close()
    
    # Format the results
    stats = {
        'temperature': {
            'min': row['min_temp'],
            'max': row['max_temp'],
            'avg': row['avg_temp']
        },
        'humidity': {
            'min': row['min_humidity'],
            'max': row['max_humidity'],
            'avg': row['avg_humidity']
        },
        'light_level': {
            'min': row['min_light'],
            'max': row['max_light'],
            'avg': row['avg_light']
        }
    }
    
    return jsonify(stats)

# For testing purposes
@app.route('/api/test-data', methods=['GET'])
@admin_required
def generate_test_data():
    """Generate test data for development purposes - admin only"""
    import random
    from datetime import datetime, timedelta
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clear existing data first (for testing only)
    cursor.execute("DELETE FROM sensor_data")
    
    # Generate 48 hours of data at 30-min intervals
    current_time = datetime.now()
    
    for i in range(96):  # 48 hours * 2 readings per hour
        timestamp = current_time - timedelta(minutes=30 * i)
        temperature = round(random.uniform(18, 30), 1)  # 18-30°C
        humidity = round(random.uniform(40, 95), 1)     # 40-95%
        light_level = round(random.uniform(0, 1023), 0)  # 0-1023 (analogRead range)
        
        formatted_timestamp = timestamp.strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(
            "INSERT INTO sensor_data (temperature, humidity, light_level, timestamp) VALUES (%s, %s, %s, %s)",
            (temperature, humidity, light_level, formatted_timestamp)
        )
    
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'success', 'message': 'Test data generated'})

if __name__ == '__main__':
    app.run(debug=True)
