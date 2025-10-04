#!/bin/bash

# Test Runner Script for Amalthea Backend
# This script sets up the test environment and runs comprehensive tests

set -e  # Exit on any error

echo "🧪 Amalthea Backend Test Suite"
echo "=============================="

# Check if we're in the backend directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

# Check if npm is installed  
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "📦 Installing test dependencies..."
npm install --silent

echo ""
echo "🔧 Environment Setup"
echo "===================="

# Set test environment variables
export NODE_ENV=test
export JWT_SECRET=test_jwt_secret_key_for_testing_only_do_not_use_in_production
export MONGODB_URI=mongodb://localhost:27017/amalthea_test

# Check if MongoDB is running (optional)
if command -v mongod &> /dev/null; then
    if ! pgrep mongod > /dev/null; then
        echo "⚠️  Warning: MongoDB doesn't appear to be running"
        echo "   Some integration tests may fail without a database connection"
    else
        echo "✅ MongoDB is running"
    fi
fi

echo "✅ Environment configured for testing"
echo ""

# Function to run a specific test suite
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    echo "🧪 Running $suite_name..."
    echo "================================"
    
    if npm run $test_command; then
        echo "✅ $suite_name passed"
    else
        echo "❌ $suite_name failed"
        return 1
    fi
    echo ""
}

# Parse command line arguments
case "${1:-all}" in
    "unit")
        run_test_suite "Unit Tests" "test:unit"
        ;;
    "integration") 
        run_test_suite "Integration Tests" "test:integration"
        ;;
    "coverage")
        echo "📊 Running tests with coverage..."
        echo "================================"
        npm run test:coverage
        ;;
    "watch")
        echo "👀 Running tests in watch mode..."
        echo "================================" 
        echo "Press Ctrl+C to stop watching"
        npm run test:watch
        ;;
    "all"|*)
        echo "🚀 Running Full Test Suite"
        echo "=========================="
        
        # Run unit tests first (faster feedback)
        run_test_suite "Unit Tests" "test:unit"
        
        # Run integration tests
        run_test_suite "Integration Tests" "test:integration"
        
        echo "🎉 All tests completed successfully!"
        echo ""
        echo "📊 Test Summary:"
        echo "  - Unit tests: Edge cases and business logic"
        echo "  - Integration tests: API endpoints and workflows"
        echo ""
        echo "💡 Run specific test suites:"
        echo "  ./run-tests.sh unit         # Unit tests only"
        echo "  ./run-tests.sh integration  # Integration tests only" 
        echo "  ./run-tests.sh coverage     # Tests with coverage report"
        echo "  ./run-tests.sh watch        # Watch mode for development"
        ;;
esac

echo "✨ Testing complete!"