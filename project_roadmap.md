# Greenhouse Management System - Project Roadmap

## System Overview

The Greenhouse Management System is a comprehensive monitoring solution that tracks environmental conditions inside a greenhouse through sensor data. It includes a web-based dashboard for visualizing temperature, humidity, and light levels, and now features a secure login system to protect access to this valuable data.

## Project Evolution

### Phase 1: Foundation and Data Collection
- **Arduino Integration**: Setup of sensors for temperature, humidity, and light monitoring
- **Data Storage**: Creation of SQLite database to store sensor readings
- **API Endpoints**: Development of endpoints to receive and transmit sensor data

### Phase 2: Visualization Dashboard
- **Real-time Monitoring**: Creation of a dynamic dashboard showing current environmental conditions
- **Historical Data Views**: Implementation of charts tracking environmental changes over time
- **Statistical Analysis**: Addition of min/max/average calculations for all sensor readings
- **Responsive Design**: Mobile-friendly interface that works across different devices

### Phase 3: Security and User Management (Current)
- **Authentication System**: Login system requiring username and password credentials
- **User Roles**: Administrator and regular user role separation
- **Access Control**: Protection of dashboard and data endpoints
- **User Management**: Interface for adding, editing, and removing system users

## Current Architecture

### Backend Components
1. **Flask Web Application**
   - Handles HTTP requests and serves web pages
   - Processes and responds to API calls
   - Manages user authentication and sessions

2. **SQLite Database**
   - `sensor_data` table: Stores all environmental readings with timestamps
   - `users` table: Contains user credentials and permission levels

3. **API Layer**
   - `/api/sensor-data`: Receives data from Arduino sensors
   - `/api/current-data`: Provides the most recent sensor readings
   - `/api/historical-data`: Supplies time-series data for charts
   - `/api/stats`: Delivers statistical calculations

### Frontend Components
1. **Dashboard Interface**
   - Real-time display cards for temperature, humidity, and light
   - Interactive charts for historical data visualization
   - System status and connection indicators

2. **Authentication Interface**
   - Login form for user credentials
   - Session management for persistent login
   - Logout functionality

3. **User Management Interface**
   - User listing with role indicators
   - Add/edit user forms with validation
   - User deletion with confirmation

## Security Features

- **Password Hashing**: All passwords are stored as SHA-256 hashes, not plaintext
- **Session Protection**: Authentication state maintained via secure sessions
- **Role-Based Access Control**: Users can only access features appropriate to their role
- **Input Validation**: All form inputs are validated to prevent injection attacks
- **API Protection**: Data endpoints require authentication to prevent unauthorized access

## Future Development Plans

### Phase 4: Advanced Analytics
- Trend prediction based on historical data
- Automated alerts for condition thresholds
- Downloadable reports and data exports

### Phase 5: Remote Control
- Integration with greenhouse equipment (fans, vents, irrigation)
- Scheduled operations and automation rules
- Mobile app for remote monitoring and control

### Phase 6: Multi-Zone Management
- Support for multiple greenhouse zones
- Comparative analytics between zones
- Custom optimization for different plant types
