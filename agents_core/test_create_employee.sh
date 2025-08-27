#!/bin/bash

# Test script for POST /employees endpoint
# Usage: ./test_create_employee.sh [BASE_URL] [AUTH_TOKEN]
#
AUTH_TOKEN="eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18yem4zZkRuc0pTNlozelAwajJjM0dwVmJaSlciLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovL2FwcC5jbGFuY3lhaS5jb20iLCJleHAiOjE3ODc3NTg0NjIsImlhdCI6MTc1NjIyMjQ2MiwiaXNzIjoiaHR0cHM6Ly9ibGVzc2VkLWdvYmxpbi04NS5jbGVyay5hY2NvdW50cy5kZXYiLCJqdGkiOiJmZmJmOGE3NThlMWI4NWJhYjFlOSIsIm5iZiI6MTc1NjIyMjQ1NywibyI6eyJpZCI6Im9yZ18yem42YTRNbWtwUkVJRWkwWWRLamJwQzAyb3QiLCJyb2wiOiJvcmc6YWRtaW4iLCJzbGciOiJlZHVvcmcifSwic3ViIjoidXNlcl8yem42WUlMbmZIc05UQ0FncW0wOUkwOW54NkYifQ.aNT0yzDvgF59_DdHSUtnw4dDWI6LEcpnQd4ZU4g1vHZa5CVLSJBOH7PBYhFR0mwZHrCGZkF1lco4R_avzCECKZxMfOHOahJ10iZNxmfnTdiIgkjoUb91gQYDUvAPyLpyJtMVx0M7JAeo5qn4IjSahAIRmdwDYX_s1siaMvI8nzoQhr_6zJIE1y7ZAAT6ombm637_4iKjKEcB7dntp4h7YwY_wxO_sJxeHgdPGnqTqieKSJf7Ur_dj1BZl8EYv8puyQIda2VTyQ6-ZA1hNL_BXxUlpJlRoVENI4e-bKGCSO0fmuaTAQ7kIN_LI5BqiyYUHfmQhzl9u0ExVTfeMYR1ew"
DEFAULT_BASE_URL="https://agents-core.staging.clancy.systems"

# Configuration
BASE_URL=${1:-$DEFAULT_BASE_URL}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing POST /employees endpoint${NC}"
echo "Base URL: $BASE_URL"
echo "Auth Token: ${AUTH_TOKEN:0:20}..." # Show only first 20 chars for security

# JSON payload for creating an employee with agents
JSON_PAYLOAD='{
  "orgId": "test-org-123",
  "userId": "test-user-456",
  "name": "Test Employee",
  "status": "active",
  "agents": [
    {
      "orgId": "test-org-123",
      "name": "Email Assistant",
      "description": "Handles email responses and scheduling",
      "userId": "test-user-456",
      "status": "active",
      "capabilities": [
        {
          "providerId": "google",
          "id": "gmail.send"
        },
        {
          "providerId": "google", 
          "id": "calendar.events.create"
        }
      ],
      "trigger": {
        "providerId": "google",
        "id": "gmail.message.received",
        "triggerParams": {
          "query": "is:unread"
        }
      },
      "prompt": "You are an email assistant. Help respond to emails professionally and schedule meetings when requested."
    },
    {
      "orgId": "test-org-123",
      "name": "Calendar Manager",
      "description": "Manages calendar events and scheduling",
      "userId": "test-user-456",
      "status": "active",
      "capabilities": [
        {
          "providerId": "google",
          "id": "calendar.events.list"
        },
        {
          "providerId": "google",
          "id": "calendar.events.create"
        }
      ],
      "trigger": {
        "providerId": "google",
        "id": "calendar.event.created",
        "triggerParams": {
          "calendarId": "primary"
        }
      },
      "prompt": "You are a calendar management assistant. Help organize and optimize schedules."
    }
  ]
}'

echo -e "\n${YELLOW}Sending request...${NC}"

# Make the curl request
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$JSON_PAYLOAD" \
  "$BASE_URL/v1/employees")

# Extract HTTP status code (last line) and response body (everything else)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

echo -e "\n${YELLOW}Response:${NC}"
echo "HTTP Status Code: $HTTP_CODE"

# Color code the response based on status
if [[ $HTTP_CODE -ge 200 && $HTTP_CODE -lt 300 ]]; then
    echo -e "${GREEN}✓ Success!${NC}"
    #echo "Response Body:"
    #echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
elif [[ $HTTP_CODE -eq 401 ]]; then
    echo -e "${RED}✗ Unauthorized (401)${NC}"
    echo "Please check your authentication token."
    #echo "Response Body:"
    #echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
elif [[ $HTTP_CODE -eq 400 ]]; then
    echo -e "${RED}✗ Bad Request (400)${NC}"
    echo "Please check your request payload."
    #echo "Response Body:"
    #echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
    echo -e "${RED}✗ Error ($HTTP_CODE)${NC}"
    #echo "Response Body:"
    #echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
fi

echo -e "\n${YELLOW}Raw curl command for reference:${NC}"
echo "curl -X POST \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$AUTH_TOKEN\" \\"
#echo "  -d '$JSON_PAYLOAD' \\"
echo "  \"$BASE_URL/v1/employees\""
