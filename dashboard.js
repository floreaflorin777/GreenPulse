// Greenhouse Management System Dashboard JavaScript

// Configuration
const REFRESH_INTERVAL = 30000; // 30 seconds
const TEMP_RANGES = { min: 18, max: 28 }; // Optimal temperature range (°C)
const HUMIDITY_RANGES = { min: 40, max: 80 }; // Optimal humidity range (%)
const LIGHT_RANGES = { min: 300, max: 800 }; // Optimal light range (analog value)

// Theme constants
const ANIMATION_DURATION = 1000; // Animation duration in ms

// Chart references and UI elements
let trendsChart;
let welcomeMessage;

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Display current date in footer
    const today = new Date();
    document.getElementById('footer-date').textContent = today.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Handle welcome message
    welcomeMessage = document.getElementById('welcome-message');
    setTimeout(() => {
        if (welcomeMessage) {
            fadeOut(welcomeMessage, 500);
        }
    }, 3000);
    
    // Initialize charts with animation
    initializeTrendsChart();
    
    // Show loading state for all gauges
    document.querySelectorAll('.loading').forEach(el => {
        el.classList.add('shimmer');
    });
    
    // Load initial data
    loadCurrentData();
    loadHistoricalData(24); // Default to 24 hours
    loadStats(24); // Default to 24 hours
    
    // Remove loading class after initial data is loaded
    setTimeout(() => {
        document.querySelectorAll('.loading').forEach(el => {
            el.classList.remove('shimmer');
        });
    }, 2000);
    
    // Set up refresh timer
    setInterval(loadCurrentData, REFRESH_INTERVAL);
    setInterval(() => {
        const activeFilter = document.querySelector('.time-filter.active');
        const hours = activeFilter ? parseInt(activeFilter.dataset.hours) : 24;
        loadHistoricalData(hours);
        loadStats(hours);
    }, REFRESH_INTERVAL);
    
    // Time filter buttons event listeners
    document.querySelectorAll('.time-filter').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.time-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Load data for selected time period
            const hours = parseInt(this.dataset.hours);
            loadHistoricalData(hours);
            loadStats(hours);
        });
    });
    
    // Display current date/time for system uptime
    displaySystemUptime();
});

// Helper function to fade out an element
function fadeOut(element, duration) {
    element.style.opacity = 1;
    element.style.transition = `opacity ${duration}ms ease`;
    element.style.opacity = 0;
    
    setTimeout(() => {
        element.style.display = 'none';
    }, duration);
}

// Function to animate number counting
function animateValue(element, start, end, duration) {
    if (start === end) return;
    
    const range = end - start;
    const startTime = performance.now();
    
    function updateValue(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out cubic)
        const easing = 1 - Math.pow(1 - progress, 3);
        
        const current = start + range * easing;
        element.textContent = current.toFixed(1);
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        } else {
            element.textContent = end.toFixed(1);
        }
    }
    
    requestAnimationFrame(updateValue);
}

// Function to set gauge values based on value and range
function setGaugeValues(type, value, ranges) {
    const needleElement = document.getElementById(`${type}-needle`);
    const valueElement = document.getElementById(`current-${type}`);
    
    if (!needleElement || !valueElement) return;
    
    // Update range min/max labels if they exist
    const rangeMinElement = document.getElementById(`${type}-range-min`);
    const rangeMaxElement = document.getElementById(`${type}-range-max`);
    
    if (rangeMinElement && rangeMaxElement) {
        let unit = '';
        if (type === 'temperature') unit = '°C';
        else if (type === 'humidity') unit = '%';
        
        rangeMinElement.textContent = `${ranges.min}${unit}`;
        rangeMaxElement.textContent = `${ranges.max}${unit}`;
    }
    
    const min = ranges.min * 0.5; // Allow some padding below min
    const max = ranges.max * 1.5; // Allow some padding above max
    const range = max - min;
    
    // Calculate percentage (0-100)
    let percentage = ((value - min) / range) * 100;
    percentage = Math.max(0, Math.min(100, percentage)); // Clamp between 0-100
    
    // Convert percentage to degrees for semi-circular gauge (180 degrees = 0% to 100%)
    // -90 degrees is at the left (0%), 90 degrees is at the right (100%)
    const degrees = (percentage * 1.8) - 90;
    
    // Position the needle with the angle
    needleElement.style.transform = `translateX(-50%) rotate(${degrees}deg)`;
    
    // Remove previous status classes
    valueElement.classList.remove('value-optimal', 'value-warning', 'value-critical');
    
    // Set value color based on status exactly as requested
    if (value < ranges.min) {
        if (value < ranges.min * 0.8) {
            valueElement.classList.add('value-critical');
        } else {
            valueElement.classList.add('value-warning');
        }
    } else if (value > ranges.max) {
        if (value > ranges.max * 1.2) {
            valueElement.classList.add('value-critical');
        } else {
            valueElement.classList.add('value-warning');
        }
    } else {
        valueElement.classList.add('value-optimal');
    }
}

// Function to initialize the trends chart with animations
function initializeTrendsChart() {
    const ctx = document.getElementById('trends-chart').getContext('2d');
    
    // Apply chart global defaults for animations
    Chart.defaults.animation = {
        duration: 1000,
        easing: 'easeOutQuart'
    };
    
    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: 'rgba(243, 115, 53, 0.8)',
                    backgroundColor: 'rgba(243, 115, 53, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: 'rgba(50, 162, 168, 0.8)',
                    backgroundColor: 'rgba(50, 162, 168, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'Light Level',
                    data: [],
                    borderColor: 'rgba(255, 209, 102, 0.8)',
                    backgroundColor: 'rgba(255, 209, 102, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: "'Montserrat', 'Poppins', sans-serif",
                            size: 12
                        },
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1a2342',
                    bodyColor: '#495057',
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12,
                        font: {
                            family: "'Montserrat', 'Poppins', sans-serif",
                            size: 10
                        },
                        color: '#495057'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.03)'
                    }
                },
                y: {
                    beginAtZero: false,
                    suggestedMin: 0,
                    ticks: {
                        font: {
                            family: "'Montserrat', 'Poppins', sans-serif",
                            size: 10
                        },
                        color: '#495057'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.03)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            elements: {
                line: {
                    tension: 0.3
                },
                point: {
                    radius: 3,
                    hoverRadius: 7,
                    hitRadius: 12
                }
            }
        }
    });
}

// Function to load current sensor data with animation
function loadCurrentData() {
    // Show spinner in last updated text
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl && !lastUpdatedEl.querySelector('.fa-spin')) {
        const icon = document.createElement('i');
        icon.className = 'fas fa-sync-alt fa-spin me-2';
        lastUpdatedEl.innerHTML = '';
        lastUpdatedEl.appendChild(icon);
        lastUpdatedEl.appendChild(document.createTextNode('Updating...'));
    }
    
    fetch('/api/current-data')
        .then(response => {
            // If we get redirected to login page due to session expiry
            if (response.redirected) {
                window.location.href = response.url;
                return;
            }
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data) { // Only update if we have data (not redirected)
                updateCurrentReadings(data);
                updateConnectionStatus(true);
            }
        })
        .catch(error => {
            console.error('Error fetching current data:', error);
            updateConnectionStatus(false);
        });
}

// Function to load historical data for charts
function loadHistoricalData(hours) {
    fetch(`/api/historical-data?hours=${hours}`)
        .then(response => {
            // If we get redirected to login page due to session expiry
            if (response.redirected) {
                window.location.href = response.url;
                return;
            }
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data) { // Only update if we have data (not redirected)
                updateTrendsChart(data);
                updateReadingsCount(data.length);
            }
        })
        .catch(error => {
            console.error('Error fetching historical data:', error);
        });
}

// Function to load statistics
function loadStats(hours) {
    fetch(`/api/stats?hours=${hours}`)
        .then(response => {
            // If we get redirected to login page due to session expiry
            if (response.redirected) {
                window.location.href = response.url;
                return;
            }
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data) { // Only update if we have data (not redirected)
                updateStats(data);
            }
        })
        .catch(error => {
            console.error('Error fetching stats:', error);
        });
}

// Function to update current readings display with animations
function updateCurrentReadings(data) {
    // Update temperature with animation
    const tempElement = document.getElementById('current-temperature');
    const oldTempValue = parseFloat(tempElement.textContent) || 0;
    animateValue(tempElement, oldTempValue, data.temperature, ANIMATION_DURATION);
    tempElement.classList.add('pulse');
    setTimeout(() => tempElement.classList.remove('pulse'), 1000);
    
    // Update temperature gauge
    setGaugeValues('temperature', data.temperature, TEMP_RANGES);
    
    // Update humidity with animation
    const humidityElement = document.getElementById('current-humidity');
    const oldHumidityValue = parseFloat(humidityElement.textContent) || 0;
    animateValue(humidityElement, oldHumidityValue, data.humidity, ANIMATION_DURATION);
    humidityElement.classList.add('pulse');
    setTimeout(() => humidityElement.classList.remove('pulse'), 1000);
    
    // Update humidity gauge
    setGaugeValues('humidity', data.humidity, HUMIDITY_RANGES);
    
    // Update light level with animation
    const lightElement = document.getElementById('current-light');
    const oldLightValue = parseFloat(lightElement.textContent) || 0;
    animateValue(lightElement, oldLightValue, data.light_level, ANIMATION_DURATION);
    lightElement.classList.add('pulse');
    setTimeout(() => lightElement.classList.remove('pulse'), 1000);
    
    // Update light gauge
    setGaugeValues('light', data.light_level, LIGHT_RANGES);
    
    // Update status indicators
    updateStatusIndicator('temp', data.temperature, TEMP_RANGES);
    updateStatusIndicator('humidity', data.humidity, HUMIDITY_RANGES);
    updateStatusIndicator('light', data.light_level, LIGHT_RANGES);
    
    // Update last updated time
    const timestamp = new Date(data.timestamp);
    document.getElementById('last-updated').innerHTML = `<i class="fas fa-clock me-2"></i> Last update: ${formatDateTime(timestamp)}`;
    document.getElementById('last-data-time').textContent = formatDateTime(timestamp);
}

// Function to update status indicators with animations
function updateStatusIndicator(type, value, ranges) {
    const iconElement = document.getElementById(`${type}-status-icon`);
    const textElement = document.getElementById(`${type}-status-text`);
    
    if (!iconElement || !textElement) return;
    
    // Remove all status classes
    iconElement.classList.remove('status-green', 'status-yellow', 'status-red', 'status-gray');
    
    // Save old text for animation
    const oldText = textElement.textContent;
    let newText = 'Unknown';
    let newClass = 'status-gray';
    
    // Determine status based on value and ranges
    if (value < ranges.min) {
        // Too low
        if (value < ranges.min * 0.8) {
            newClass = 'status-red';
            newText = 'Critical Low';
        } else {
            newClass = 'status-yellow';
            newText = 'Low';
        }
    } else if (value > ranges.max) {
        // Too high
        if (value > ranges.max * 1.2) {
            newClass = 'status-red';
            newText = 'Critical High';
        } else {
            newClass = 'status-yellow';
            newText = 'High';
        }
    } else {
        // Optimal
        newClass = 'status-green';
        newText = 'Optimal';
    }
    
    // Add the new status class with animation if different
    iconElement.classList.add(newClass);
    
    if (oldText !== newText) {
        // Animate text change
        textElement.style.opacity = 0;
        setTimeout(() => {
            textElement.textContent = newText;
            textElement.style.opacity = 1;
        }, 300);
    } else {
        textElement.textContent = newText;
    }
}

// Function to update trends chart with historical data
function updateTrendsChart(data) {
    // Format dates for x-axis labels
    const labels = data.map(item => {
        const date = new Date(item.timestamp);
        return formatTime(date);
    });
    
    // Extract sensor values
    const temperatures = data.map(item => item.temperature);
    const humidities = data.map(item => item.humidity);
    const lightLevels = data.map(item => item.light_level);
    
    // Update chart data
    trendsChart.data.labels = labels;
    trendsChart.data.datasets[0].data = temperatures;
    trendsChart.data.datasets[1].data = humidities;
    trendsChart.data.datasets[2].data = lightLevels;
    
    // Update chart
    trendsChart.update();
}

// Function to update statistics display with subtle animations
function updateStats(data) {
    // Helper function to update stat with animation
    function updateStat(elementId, value, unit = '', decimals = 1) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const newValue = value ? value.toFixed(decimals) + unit : '--';
        
        // Only animate if element doesn't have the value already
        if (element.textContent !== newValue) {
            element.classList.add('pulse');
            setTimeout(() => element.classList.remove('pulse'), 1000);
            element.textContent = newValue;
        }
    }
    
    // Temperature stats
    updateStat('temp-min', data.temperature.min, '°C');
    updateStat('temp-avg', data.temperature.avg, '°C');
    updateStat('temp-max', data.temperature.max, '°C');
    
    // Humidity stats
    updateStat('humidity-min', data.humidity.min, '%');
    updateStat('humidity-avg', data.humidity.avg, '%');
    updateStat('humidity-max', data.humidity.max, '%');
    
    // Light level stats
    updateStat('light-min', data.light_level.min, '', 0);
    updateStat('light-avg', data.light_level.avg, '', 0);
    updateStat('light-max', data.light_level.max, '', 0);
}

// Function to update connection status with animation
function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    // Remove loading class if present
    statusElement.classList.remove('loading');
    
    const oldHtml = statusElement.innerHTML;
    let newHtml = '';
    
    if (isConnected) {
        newHtml = '<span class="text-success"><i class="fas fa-check-circle me-1"></i>Connected</span>';
    } else {
        newHtml = '<span class="text-danger"><i class="fas fa-times-circle me-1"></i>Disconnected</span>';
    }
    
    // Only animate if changing state
    if (oldHtml !== newHtml) {
        fadeTransition(statusElement, newHtml);
    }
}

// Helper function for fade transition
function fadeTransition(element, newContent) {
    // Fade out
    element.style.opacity = 0;
    
    // Change content after fade out
    setTimeout(() => {
        element.innerHTML = newContent;
        // Fade in
        element.style.opacity = 1;
    }, 300);
}

// Function to update readings count with animation
function updateReadingsCount(count) {
    const element = document.getElementById('readings-count');
    if (!element) return;
    
    // Remove loading class if present
    element.classList.remove('loading');
    
    const currentCount = parseInt(element.textContent) || 0;
    
    // Only animate if count has changed
    if (currentCount !== count) {
        // Simple animation for count change
        element.classList.add('pulse');
        setTimeout(() => element.classList.remove('pulse'), 1000);
        element.textContent = count;
    }
}

// Function to display system uptime with animation
function displaySystemUptime() {
    const startTime = new Date();
    const uptimeElement = document.getElementById('system-uptime');
    
    // Remove loading class
    setTimeout(() => {
        if (uptimeElement) {
            uptimeElement.classList.remove('loading');
        }
    }, 1500);
    
    // Update uptime every minute
    setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000); // difference in seconds
        
        let uptime = '';
        if (diff < 60) {
            uptime = `${diff} seconds`;
        } else if (diff < 3600) {
            uptime = `${Math.floor(diff / 60)} minutes`;
        } else {
            uptime = `${Math.floor(diff / 3600)} hours, ${Math.floor((diff % 3600) / 60)} minutes`;
        }
        
        document.getElementById('system-uptime').textContent = uptime;
    }, 60000); // update every minute
    
    // Initial display
    document.getElementById('system-uptime').textContent = '0 seconds';
}

// Helper function to format date and time
function formatDateTime(date) {
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Helper function to format time
function formatTime(date) {
    return date.toLocaleString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    });
}
