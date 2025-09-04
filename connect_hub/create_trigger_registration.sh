AUTH_TOKEN="eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18yem4zZkRuc0pTNlozelAwajJjM0dwVmJaSlciLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovL2FwcC5jbGFuY3lhaS5jb20iLCJleHAiOjE3ODc3NTg0NjIsImlhdCI6MTc1NjIyMjQ2MiwiaXNzIjoiaHR0cHM6Ly9ibGVzc2VkLWdvYmxpbi04NS5jbGVyay5hY2NvdW50cy5kZXYiLCJqdGkiOiJmZmJmOGE3NThlMWI4NWJhYjFlOSIsIm5iZiI6MTc1NjIyMjQ1NywibyI6eyJpZCI6Im9yZ18yem42YTRNbWtwUkVJRWkwWWRLamJwQzAyb3QiLCJyb2wiOiJvcmc6YWRtaW4iLCJzbGciOiJlZHVvcmcifSwic3ViIjoidXNlcl8yem42WUlMbmZIc05UQ0FncW0wOUkwOW54NkYifQ.aNT0yzDvgF59_DdHSUtnw4dDWI6LEcpnQd4ZU4g1vHZa5CVLSJBOH7PBYhFR0mwZHrCGZkF1lco4R_avzCECKZxMfOHOahJ10iZNxmfnTdiIgkjoUb91gQYDUvAPyLpyJtMVx0M7JAeo5qn4IjSahAIRmdwDYX_s1siaMvI8nzoQhr_6zJIE1y7ZAAT6ombm637_4iKjKEcB7dntp4h7YwY_wxO_sJxeHgdPGnqTqieKSJf7Ur_dj1BZl8EYv8puyQIda2VTyQ6-ZA1hNL_BXxUlpJlRoVENI4e-bKGCSO0fmuaTAQ7kIN_LI5BqiyYUHfmQhzl9u0ExVTfeMYR1ew"
DEFAULT_BASE_URL="http://localhost:3001"

JSON_PAYLOAD='{
  "orgId": "test-org-123",
  "agentId": "test-agent-123",
  "providerId": "google",
  "triggerId": "gmail.message.received",
  "params": {
  }
}'


curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$JSON_PAYLOAD" \
  "$DEFAULT_BASE_URL/trigger-registrations"
