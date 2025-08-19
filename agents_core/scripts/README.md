# Test Employee Creator

The `createTestEmployee.ts` script automatically creates or updates an AI employee composed of many small test agents, each designed to exercise 1-3 capabilities with appropriate triggers. This ensures all tool integrations are working correctly.

## Usage

### Environment Variables

Required:
- `AGENT_CORE_API_URL` - Agent Core service URL
- `AGENT_CORE_TOKEN` - Authentication token for Agent Core
- `CONNECT_HUB_API_URL` - Connect Hub service URL  
- `CONNECT_HUB_TOKEN` - Authentication token for Connect Hub
- `CHECKPOINTER_DB_URL` - PostgreSQL connection string for LangGraph checkpointer
- `ORG_ID` - Organization ID
- `USER_ID` - User ID for the employee
- `MODEL` - LLM model for intelligent bundle and prompt generation (e.g., "claude-3-5-sonnet-20241022")

Optional:
- `EMPLOYEE_NAME` - Name for the test employee (default: "Integration Test Employee")
- `EMPLOYEE_ID` - If provided, updates existing employee; if not, creates new one
- `CRON_SCHEDULE` - Cron expression for scheduled triggers (default: "0 */15 * * * *")
- `TEST_SAFE_EMAIL` - Safe email address for testing email capabilities
- `ALLOW_DESTRUCTIVE=true` - Allow testing of destructive capabilities (delete, remove, etc.)
- `PRUNE=true` - Remove stale test agents that no longer correspond to bundles
- `DRY_RUN=true` - Show what would be created/updated without making changes
- `CREATE_IF_MISSING=true` - Create new employee if EMPLOYEE_ID not found

### Run the Script

```bash
# Create new test employee
npm run build
AGENT_CORE_API_URL=http://localhost:3001 \
AGENT_CORE_TOKEN=your_token \
CONNECT_HUB_API_URL=http://localhost:3002 \
CONNECT_HUB_TOKEN=your_token \
CHECKPOINTER_DB_URL=postgresql://user:pass@localhost/langgraph \
ORG_ID=your_org_id \
USER_ID=your_user_id \
MODEL=claude-3-5-sonnet-20241022 \
node dist/scripts/createTestEmployee.js

# Update existing employee
EMPLOYEE_ID=existing_employee_id \
# ... other env vars
node dist/scripts/createTestEmployee.js

# Dry run to see what would happen
DRY_RUN=true \
# ... other env vars  
node dist/scripts/createTestEmployee.js
```

## How it Works

### LLM-Powered Intelligence

This script uses LLM agents to intelligently create test coverage:

1. **Bundle Creator Agent**: Uses LLM with `get_capabilities` and `get_triggers` tools to:
   - Analyze all available capabilities and triggers
   - Create comprehensive test bundles with smart trigger assignment
   - Ensure coverage while respecting safety constraints
   - Prefer cron triggers for reliable scheduled testing

2. **Prompt Builder Agent**: Uses LLM to generate custom prompts for each test agent:
   - Tailored instructions based on specific capabilities being tested
   - Safety constraints and test markers appropriate to the integration
   - Specific guidance for different capability types (read/write/send)
   - Clear success/failure criteria

### Trigger Assignment Strategy

The LLM intelligently assigns triggers based on:
- **Coverage**: Ensures at least one bundle tests each available trigger
- **Reliability**: Prefers cron triggers for consistent scheduled testing
- **Safety**: Avoids complex trigger parameters that could cause issues
- **Provider matching**: When possible, matches triggers to capabilities from the same provider

### Create vs Update

- **Create mode** (no `EMPLOYEE_ID`): Creates a new employee with all test agents via EmployeesApi
- **Update mode** (with `EMPLOYEE_ID`): 
  - Fetches existing employee and agents via EmployeesApi
  - Creates missing agents for new capabilities/triggers via AgentsApi
  - Updates agents when capabilities, triggers, or prompts change via AgentsApi
  - Re-registers triggers when trigger configuration changes
  - Optionally prunes stale agents with `PRUNE=true`

### Generated Prompts

The LLM creates intelligent, context-aware prompts that:
- Specify exactly which capabilities to exercise and in what order
- Include appropriate safety constraints and test markers
- Provide guidance tailored to the specific capability types
- Use configured safe email addresses for mail capabilities
- Include clear logging and success/failure criteria

## Examples

### Typical Test Bundles

- `test:gmail/messages.send@cron` - Scheduled email sending test
- `test:slack/chat.postMessage@message.received` - Slack auto-reply test  
- `test:google-calendar/events.list@cron` - Scheduled calendar sync test
- `test:canvas/announcements.create@cron` - Scheduled Canvas announcement test

### Safety Features

- All emails include `[TEST]` prefix and use `TEST_SAFE_EMAIL`
- Destructive operations are filtered out by default
- Complex trigger parameters are skipped rather than guessed
- Dry-run mode available for testing

## Troubleshooting

- **No cron trigger found**: Ensure Connect Hub has an internal cron/scheduler trigger
- **Complex trigger params**: Bundles with unsupported trigger schemas are marked as unsatisfied
- **Auth errors**: Check that tokens have appropriate permissions for both services
- **Missing capabilities**: Ensure Connect Hub is properly configured with provider integrations
