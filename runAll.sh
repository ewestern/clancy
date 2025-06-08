#!/bin/bash

### run all services locally (not in docker)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Array to store background process PIDs
PIDS=()

# Function to print colored output
print_status() {
    echo -e "${GREEN}[RUNNER]${NC} $1"
}

print_error() {
    echo -e "${RED}[RUNNER]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[RUNNER]${NC} $1"
}

# Function to cleanup all processes
cleanup() {
    print_warning "Shutting down all services..."
    
    # Kill all background processes
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            print_status "Stopping process $pid..."
            kill -TERM "$pid" 2>/dev/null
        fi
    done
    
    # Wait for processes to terminate gracefully
    sleep 2
    
    # Force kill any remaining processes
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            print_warning "Force killing process $pid..."
            kill -KILL "$pid" 2>/dev/null
        fi
    done
    
    print_status "All services stopped."
    exit 0
}

# Function to start a service
start_service() {
    local service_name="$1"
    local service_dir="$2"
    local color="$3"
    
    print_status "Starting $service_name..."
    
    # Check if directory exists
    if [ ! -d "$service_dir" ]; then
        print_error "Directory $service_dir does not exist!"
        return 1
    fi
    
    # Check if package.json exists
    if [ ! -f "$service_dir/package.json" ]; then
        print_error "No package.json found in $service_dir!"
        return 1
    fi
    
    # Start the service in background and capture output with colored prefix
    (
        cd "$service_dir" || exit 1
        npm run dev 2>&1 | while IFS= read -r line; do
            echo -e "${color}[$service_name]${NC} $line"
        done
    ) &
    
    # Store the PID
    local pid=$!
    PIDS+=("$pid")
    
    print_status "$service_name started with PID $pid"
    
    # Give it a moment to start
    sleep 1
    
    # Check if process is still running
    if ! kill -0 "$pid" 2>/dev/null; then
        print_error "$service_name failed to start!"
        return 1
    fi
    
    return 0
}

# Function to check if npm is available
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed or not in PATH"
        exit 1
    fi
}

# Function to install dependencies if needed
install_deps_if_needed() {
    local service_dir="$1"
    local service_name="$2"
    
    if [ ! -d "$service_dir/node_modules" ]; then
        print_warning "$service_name: node_modules not found, installing dependencies..."
        (cd "$service_dir" && npm install)
    fi
}

# Trap signals to cleanup on exit
trap cleanup SIGINT SIGTERM EXIT

print_status "Starting Clancy services..."

# Check prerequisites
check_npm

# Define services to start (using parallel arrays instead of associative arrays)
SERVICE_NAMES=("connect_hub" "agents_core" "ui")
SERVICE_DIRS=("connect_hub" "agents_core" "ui")
SERVICE_COLORS=("$BLUE" "$PURPLE" "$CYAN")

# Install dependencies if needed
for i in "${!SERVICE_NAMES[@]}"; do
    service_name="${SERVICE_NAMES[i]}"
    service_dir="${SERVICE_DIRS[i]}"
    install_deps_if_needed "$service_dir" "$service_name"
done

print_status "All dependencies checked."

# Start all services
failed_services=()
for i in "${!SERVICE_NAMES[@]}"; do
    service_name="${SERVICE_NAMES[i]}"
    service_dir="${SERVICE_DIRS[i]}"
    color="${SERVICE_COLORS[i]}"
    
    if ! start_service "$service_name" "$service_dir" "$color"; then
        failed_services+=("$service_name")
    fi
done

# Check if any services failed to start
if [ ${#failed_services[@]} -gt 0 ]; then
    print_error "Failed to start services: ${failed_services[*]}"
    cleanup
    exit 1
fi

print_status "All services started successfully!"
print_status "Services running:"
for i in "${!SERVICE_NAMES[@]}"; do
    service_name="${SERVICE_NAMES[i]}"
    color="${SERVICE_COLORS[i]}"
    echo -e "  ${color}$service_name${NC} (PID: ${PIDS[i]})"
done

print_status "Press Ctrl+C to stop all services"

# Wait for all background processes
wait

