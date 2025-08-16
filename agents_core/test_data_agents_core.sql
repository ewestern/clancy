-- Test data for Agents Core database
-- This file contains INSERT statements to populate the local database with test data
-- that mirrors the mock data used in the UI

-- Clear existing data (in dependency order)
DELETE FROM conversation_messages;
DELETE FROM agent_conversations;
DELETE FROM approval_requests;
DELETE FROM agents;
DELETE FROM employees;

-- Insert test employees
INSERT INTO employees (id, org_id, user_id, name, status, created_at, updated_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'org-demo-1', 'user-demo-1', 'Invoice Assistant', 'active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'org-demo-1', 'user-demo-1', 'Social Media Manager', 'active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'org-demo-1', 'user-demo-1', 'Customer Support Bot', 'active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440004', 'org-demo-1', 'user-demo-1', 'Report Generator', 'active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440005', 'org-demo-1', 'user-demo-1', 'Email Responder', 'active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440006', 'org-demo-1', 'user-demo-1', 'Expense Tracker', 'active', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440007', 'org-demo-1', 'user-demo-1', 'Meeting Scheduler', 'active', NOW(), NOW());

-- Insert test agents
INSERT INTO agents (id, org_id, user_id, name, description, prompt, capabilities, trigger, employee_id, last_active, status, created_at, updated_at) VALUES
  (
    '660e8400-e29b-41d4-a716-446655440001',
    'org-demo-1',
    'user-demo-1',
    'Invoice Assistant',
    'AR Clerk that manages invoicing workflows',
    'You are an accounts receivable clerk responsible for generating and sending invoices to customers. You should create invoices based on billing data, send them for approval when needed, and notify customers via email and Slack.',
    '[{"providerId": "quickbooks", "id": "invoice.create"}, {"providerId": "quickbooks", "id": "customer.read"}, {"providerId": "gmail", "id": "mail.send"}, {"providerId": "slack", "id": "chat.write"}]',
    '{"providerId": "internal", "id": "schedule", "triggerParams": {"schedule": "monthly"}}',
    '550e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '2 hours',
    'active',
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440002',
    'org-demo-1',
    'user-demo-1',
    'Social Media Manager',
    'Content Creator that manages social media workflows',
    'You are a social media content creator responsible for creating and publishing content across various social platforms. You should create engaging posts, schedule them appropriately, and track engagement.',
    '[{"providerId": "twitter", "id": "posts.write"}, {"providerId": "linkedin", "id": "posts.write"}, {"providerId": "slack", "id": "chat.read"}]',
    '{"providerId": "internal", "id": "schedule", "triggerParams": {"schedule": "daily"}}',
    '550e8400-e29b-41d4-a716-446655440002',
    NOW() - INTERVAL '15 minutes',
    'active',
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440003',
    'org-demo-1',
    'user-demo-1',
    'Customer Support Bot',
    'Support AI Employee that handles customer inquiries',
    'You are a customer support agent responsible for responding to and resolving customer support tickets. You should provide helpful responses, escalate when necessary, and track resolution status.',
    '[{"providerId": "zendesk", "id": "tickets.write"}, {"providerId": "slack", "id": "chat.write"}, {"providerId": "gmail", "id": "mail.send"}]',
    '{"providerId": "zendesk", "id": "new_ticket", "triggerParams": {}}',
    '550e8400-e29b-41d4-a716-446655440003',
    NOW() - INTERVAL '1 day',
    'active',
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440004',
    'org-demo-1',
    'user-demo-1',
    'Report Generator',
    'Data Analyst that creates and distributes reports',
    'You are a data analyst responsible for generating reports and distributing them to stakeholders. You should compile data from various sources, create formatted reports, and send them to appropriate recipients.',
    '[{"providerId": "internal", "id": "data.read"}, {"providerId": "gmail", "id": "mail.send"}]',
    '{"providerId": "internal", "id": "schedule", "triggerParams": {"schedule": "weekly"}}',
    '550e8400-e29b-41d4-a716-446655440004',
    NOW() - INTERVAL '30 minutes',
    'active',
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440005',
    'org-demo-1',
    'user-demo-1',
    'Email Responder',
    'Customer Service agent that handles email responses',
    'You are a customer service representative responsible for responding to customer emails promptly and professionally. You should provide helpful information and escalate complex issues when needed.',
    '[{"providerId": "gmail", "id": "mail.read"}, {"providerId": "gmail", "id": "mail.send"}, {"providerId": "slack", "id": "chat.write"}]',
    '{"providerId": "gmail", "id": "new_email", "triggerParams": {}}',
    '550e8400-e29b-41d4-a716-446655440005',
    NOW() - INTERVAL '5 minutes',
    'active',
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440006',
    'org-demo-1',
    'user-demo-1',
    'Expense Tracker',
    'Bookkeeper that manages expense tracking and reporting',
    'You are a bookkeeper responsible for tracking and categorizing business expenses. You should process receipts, categorize expenses, and generate expense reports.',
    '[{"providerId": "quickbooks", "id": "expense.create"}, {"providerId": "quickbooks", "id": "expense.read"}]',
    '{"providerId": "internal", "id": "schedule", "triggerParams": {"schedule": "daily"}}',
    '550e8400-e29b-41d4-a716-446655440006',
    NOW() - INTERVAL '4 hours',
    'active',
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440007',
    'org-demo-1',
    'user-demo-1',
    'Meeting Scheduler',
    'Executive Assistant that manages calendar and scheduling',
    'You are an executive assistant responsible for scheduling meetings and managing calendars. You should coordinate availability, send meeting invites, and manage calendar conflicts.',
    '[{"providerId": "google", "id": "calendar.events.create"}, {"providerId": "google", "id": "calendar.events.read"}, {"providerId": "gmail", "id": "mail.send"}]',
    '{"providerId": "google", "id": "calendar_event", "triggerParams": {}}',
    '550e8400-e29b-41d4-a716-446655440007',
    NOW() - INTERVAL '1 hour',
    'active',
    NOW(),
    NOW()
  );

-- Insert test approval requests
INSERT INTO approval_requests (id, agent_id, run_id, status, summary, modifications, capability, request, created_at, updated_at) VALUES
  (
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    'run-20241215-004',
    'pending',
    'Send $14k invoice to Acme Corp',
    '{}',
    'quickbooks.invoice.create',
    '{"customer": "Acme Corp", "amount": 14000, "description": "Q4 Consulting Services"}',
    '2024-01-15 10:30:00',
    '2024-01-15 10:30:00'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    'run-20241215-005',
    'pending',
    'Post quarterly results announcement',
    '{}',
    'twitter.posts.write',
    '{"content": "Excited to share our Q4 results! Record growth across all metrics. #growth #results", "schedule": "2024-01-16 09:00:00"}',
    '2024-01-15 11:45:00',
    '2024-01-15 11:45:00'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440004',
    'run-20241215-006',
    'pending',
    'Email monthly revenue report to board',
    '{}',
    'gmail.mail.send',
    '{"to": "board@company.com", "subject": "Monthly Revenue Report - December 2024", "attachment": "revenue-report-dec-2024.pdf"}',
    '2024-01-15 09:15:00',
    '2024-01-15 09:15:00'
  );

-- Insert test conversations
INSERT INTO agent_conversations (id, org_id, provider_id, provider_account_id, agent_id, sub_context, run_id, status, created_at, updated_at) VALUES
  (
    '880e8400-e29b-41d4-a716-446655440001',
    'org-demo-1',
    'slack',
    'team-finance',
    '660e8400-e29b-41d4-a716-446655440001',
    'invoice-generation',
    'run-20241215-004',
    'open',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440002',
    'org-demo-1',
    'slack',
    'team-marketing',
    '660e8400-e29b-41d4-a716-446655440002',
    'content-planning',
    'run-20241215-005',
    'open',
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '15 minutes'
  );

-- Insert test conversation messages
INSERT INTO conversation_messages (id, conversation_id, provider_id, provider_message_id, content, created_at, updated_at) VALUES
  (
    '990e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440001',
    'slack',
    'msg-1234567890',
    '{"text": "I''ve generated the Acme Corp invoice for $14,000. The invoice is ready for review.", "thread_ts": "1234567890.123456", "user": "U0123456789"}',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440002',
    'slack',
    'msg-1234567891',
    '{"text": "I''ve prepared the quarterly results announcement. Should I schedule it for tomorrow morning?", "thread_ts": "1234567891.123456", "user": "U0123456788"}',
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '15 minutes'
  );