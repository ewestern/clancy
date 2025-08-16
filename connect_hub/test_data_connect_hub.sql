-- Test data for Connect Hub database
-- This file contains INSERT statements to populate the local database with test data
-- that mirrors the mock data used in the UI
\set org_id '\'org_2zn6a4MmkpREIEi0YdKjbpC02ot\''
\set user_id '\'user_2zn6YILnfHsNTCAgqm09I09nx6F\''




-- Clear existing data (in dependency order)
DELETE FROM knowledge_snippets;
DELETE FROM document_store;
DELETE FROM agent_memory;
DELETE FROM trigger_registrations;
DELETE FROM tokens;
DELETE FROM connections;
DELETE FROM oauth_transactions;

-- Insert test OAuth connections
INSERT INTO connections (id, org_id, user_id, provider_id, capabilities, external_account_metadata, status, created_at, updated_at) VALUES
  (
    'aa0e8400-e29b-41d4-a716-446655440001',
    :org_id,
    :user_id,
    'quickbooks',
    ARRAY['invoice.create', 'customer.upsert'],
    '{"company_name": "Demo Company", "company_id": "12345", "base_url": "https://sandbox-quickbooks.api.intuit.com"}',
    'active',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440002',
    :org_id,
    :user_id,
    'slack',
    ARRAY['chat.write', 'channels.read'],
    '{"team_name": "Demo Team", "team_id": "T0123456789", "workspace_url": "https://demo-team.slack.com"}',
    'active',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440003',
    :org_id,
    :user_id,
    'google',
    ARRAY['gmail.messages.send', 'gmail.messages.read'],
    '{"email": "demo@company.com", "name": "Demo User"}',
    'active',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 hour'
  );

-- Insert test OAuth tokens
INSERT INTO tokens (id, connection_id, ownership_scope, owner_id, token_payload, scopes, created_at, updated_at) VALUES
  (
    'bb0e8400-e29b-41d4-a716-446655440001',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'user',
    :user_id,
    '{"access_token": "qb_access_token_encrypted", "refresh_token": "qb_refresh_token_encrypted", "expires_at": "2024-12-31T23:59:59Z"}',
    ARRAY['invoice.read', 'invoice.write', 'customer.read'],
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day'
  ),
  (
    'bb0e8400-e29b-41d4-a716-446655440002',
    'aa0e8400-e29b-41d4-a716-446655440002',
    'user',
    :user_id,
    '{"access_token": "slack_access_token_encrypted", "expires_at": "2024-12-31T23:59:59Z"}',
    ARRAY['chat.write', 'channels.read'],
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'bb0e8400-e29b-41d4-a716-446655440003',
    'aa0e8400-e29b-41d4-a716-446655440003',
    'user',
    :user_id,
    '{"access_token": "gmail_access_token_encrypted", "refresh_token": "gmail_refresh_token_encrypted", "expires_at": "2024-12-31T23:59:59Z"}',
    ARRAY['mail.send', 'mail.read'],
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 hour'
  );

-- Insert test documents
INSERT INTO document_store (id, org_id, document_id, document_type, document_uri, title, mime_type, size_bytes, uploader_user_id, ownership_scope, owner_id, status, created_at, updated_at) VALUES
  (
    'cc0e8400-e29b-41d4-a716-446655440001',
    :org_id,
    'doc-001',
    'financial_report',
    's3://clancy-documents/org-demo-1/q4-2024-financial-report.pdf',
    'Q4 2024 Financial Report',
    'application/pdf',
    '2048576',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440002',
    :org_id,
    'doc-002',
    'contract_template',
    's3://clancy-documents/org-demo-1/acme-corp-contract-template.docx',
    'Acme Corp Contract Template',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '1024000',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440003',
    :org_id,
    'doc-005',
    'presentation',
    's3://clancy-documents/org-demo-1/sales-presentation-template.pptx',
    'Sales Presentation Template',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '5120000',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440004',
    :org_id,
    'doc-006',
    'financial_schedule',
    's3://clancy-documents/org-demo-1/vendor-payment-schedule-q1-2025.xlsx',
    'Vendor Payment Schedule Q1 2025',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '512000',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '12 hours',
    NOW() - INTERVAL '12 hours'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440005',
    'org-demo-1',
    'doc-007',
    'strategy_document',
    's3://clancy-documents/org-demo-1/product-pricing-strategy.pdf',
    'Product Pricing Strategy',
    'application/pdf',
    '3072000',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440006',
    'org-demo-1',
    'doc-008',
    'support_documentation',
    's3://clancy-documents/org-demo-1/troubleshooting-faq.txt',
    'Troubleshooting FAQ',
    'text/plain',
    '25600',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440007',
    'org-demo-1',
    'doc-009',
    'policy_document',
    's3://clancy-documents/org-demo-1/company-privacy-policy.pdf',
    'Company Privacy Policy',
    'application/pdf',
    '1536000',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440008',
    :org_id,
    'doc-010',
    'internal_guidelines',
    's3://clancy-documents/org-demo-1/internal-expense-guidelines.docx',
    'Internal Expense Guidelines',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '768000',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440009',
    :org_id,
    'doc-011',
    'hr_handbook',
    's3://clancy-documents/org-demo-1/employee-handbook-2024.pdf',
    'Employee Handbook 2024',
    'application/pdf',
    '4096000',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '45 days'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440010',
    :org_id,
    'doc-012',
    'marketing_assets',
    's3://clancy-documents/org-demo-1/brand-guidelines.pdf',
    'Brand Guidelines',
    'application/pdf',
    '2560000',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440011',
    :org_id,
    'doc-013',
    'technical_documentation',
    's3://clancy-documents/org-demo-1/api-integration-guide.txt',
    'API Integration Guide',
    'text/plain',
    '51200',
    :user_id,
    'organization',
    :org_id,
    'completed',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
  );

-- Insert test knowledge snippets (with sample embeddings - in real scenario these would be actual vector embeddings)
INSERT INTO knowledge_snippets (id, org_id, source_run_id, origin, blob, embedding, metadata, ownership_scope, owner_id, document_id, chunk_index, chunk_count, checksum, created_at) VALUES
  (
    'dd0e8400-e29b-41d4-a716-446655440001',
    :org_id,
    'run-20241215-001',
    'user_upload',
    'Our Q4 2024 revenue reached $2.5M, representing a 35% increase from Q3 2024. The growth was primarily driven by new customer acquisitions in the enterprise segment.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector, -- 1536-dim zero vector
    '{"title": "Q4 2024 Financial Report", "section": "Revenue Summary", "page": 1}',
    'organization',
    'org-demo-1',
    'doc-001',
    1,
    10,
    'sha256:abc123def456',
    NOW() - INTERVAL '1 day'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440002',
    :org_id,
    'run-20241215-002',
    'user_upload',
    'Acme Corp contract terms: Payment due within 30 days of invoice date. Late payment penalties apply at 2% per month. All work must be completed within agreed timeline.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector, -- 1536-dim zero vector
    '{"title": "Acme Corp Contract Template", "section": "Payment Terms", "page": 2}',
    'organization',
    :org_id,
    'doc-002',
    1,
    5,
    'sha256:def456ghi789',
    NOW() - INTERVAL '3 days'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440003',
    :org_id,
    'run-20241215-003',
    'agent',
    'Customer payment reminder: Acme Corp invoice #INV-2024-001 for $14,000 is now overdue by 5 days. Standard late fee of 2% will be applied.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector, -- 1536-dim zero vector
    '{"agent_id": "660e8400-e29b-41d4-a716-446655440001", "context": "payment_tracking", "customer": "Acme Corp"}',
    'organization',
    :org_id,
    NULL,
    NULL,
    NULL,
    'sha256:ghi789jkl012',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440004',
    :org_id,
    'run-20241215-004',
    'user_upload',
    'Sales presentation should highlight key value propositions: 35% cost reduction, 50% faster implementation, and 24/7 customer support. Include competitive analysis on slide 5.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"title": "Sales Presentation Template", "section": "Key Messages", "slide": 3}',
    'organization',
    :org_id,
    'doc-005',
    1,
    8,
    'sha256:jkl012mno345',
    NOW() - INTERVAL '5 days'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440005',
    :org_id,
    'run-20241215-005',
    'user_upload',
    'Vendor payment schedule Q1 2025: Acme Corp - $15,000 due Jan 15th, Beta Systems - $8,500 due Feb 1st, Gamma Solutions - $12,000 due Mar 10th. All payments subject to 2% early pay discount if paid 10 days early.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"title": "Vendor Payment Schedule Q1 2025", "section": "Payment Calendar", "sheet": "Q1_Schedule"}',
    'organization',
    :org_id,
    'doc-006',
    1,
    3,
    'sha256:mno345pqr678',
    NOW() - INTERVAL '12 hours'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440006',
    :org_id,
    'run-20241215-006',
    'user_upload',
    'Product pricing strategy: Premium tier at $99/month targets enterprise customers, Standard tier at $49/month for mid-market, Basic tier at $19/month for small businesses. Annual billing offers 20% discount.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"title": "Product Pricing Strategy", "section": "Tier Structure", "page": 3}',
    'organization',
    :org_id,
    'doc-007',
    1,
    6,
    'sha256:pqr678stu901',
    NOW() - INTERVAL '10 days'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440007',
    :org_id,
    'run-20241215-007',
    'user_upload',
    'Common troubleshooting steps: 1) Clear browser cache and cookies, 2) Disable browser extensions, 3) Try incognito/private mode, 4) Check network connectivity, 5) Contact support with error logs.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"title": "Troubleshooting FAQ", "section": "General Issues", "category": "browser_issues"}',
    'organization',
    :org_id,
    'doc-008',
    1,
    1,
    'sha256:stu901vwx234',
    NOW() - INTERVAL '2 days'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440008',
    :org_id,
    'run-20241215-008',
    'user_upload',
    'Privacy policy highlights: We collect minimal personal data necessary for service delivery. All data is encrypted in transit and at rest. Users can request data deletion at any time. Third-party integrations require explicit consent.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"title": "Company Privacy Policy", "section": "Data Collection", "page": 2}',
    'organization',
    :org_id,
    'doc-009',
    1,
    12,
    'sha256:vwx234yzab567',
    NOW() - INTERVAL '30 days'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440009',
    :org_id,
    'run-20241215-009',
    'user_upload',
    'Expense guidelines: Meals under $50 require receipt, travel expenses must be pre-approved, software subscriptions require IT approval, conference attendance needs manager sign-off.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"title": "Internal Expense Guidelines", "section": "Approval Requirements", "category": "general_expenses"}',
    'organization',
    :org_id,
    'doc-010',
    1,
    4,
    'sha256:yzab567cdef890',
    NOW() - INTERVAL '15 days'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440010',
    :org_id,
    'run-20241215-010',
    'user_upload',
    'Employee handbook 2024 update: Remote work policy allows up to 3 days/week from home, flexible hours between 7AM-10AM start times, new parental leave policy provides 12 weeks paid leave.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"title": "Employee Handbook 2024", "section": "Work Policies", "page": 15}',
    'organization',
    :org_id,
    'doc-011',
    1,
    25,
    'sha256:cdef890ghij123',
    NOW() - INTERVAL '45 days'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440011',
    :org_id,
    'run-20241215-011',
    'user_upload',
    'Brand guidelines: Primary color is #2563EB (blue), secondary is #F59E0B (amber). Logo must have 24px minimum clear space. Use Inter font family for all marketing materials.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"title": "Brand Guidelines", "section": "Visual Identity", "page": 4}',
    'organization',
    :org_id,
    'doc-012',
    1,
    8,
    'sha256:ghij123klmn456',
    NOW() - INTERVAL '20 days'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440012',
    :org_id,
    'run-20241215-012',
    'user_upload',
    'API integration guide: Use Bearer token authentication, all requests must include Content-Type: application/json header, rate limit is 1000 requests per hour, webhook endpoints must respond within 5 seconds.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"title": "API Integration Guide", "section": "Authentication", "category": "technical_specs"}',
    'organization',
    :org_id,
    'doc-013',
    1,
    1,
    'sha256:klmn456opqr789',
    NOW() - INTERVAL '7 days'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440013',
    :org_id,
    'run-20241215-013',
    'agent',
    'Invoice processing update: Successfully generated invoice INV-2024-156 for Acme Corp totaling $14,750. Payment terms: Net 30. Invoice sent via email and Slack notification posted to #finance channel.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"agent_id": "660e8400-e29b-41d4-a716-446655440001", "context": "invoice_generation", "invoice_number": "INV-2024-156", "customer": "Acme Corp"}',
    'organization',
    :org_id,
    NULL,
    NULL,
    NULL,
    'sha256:opqr789stuv012',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440014',
    :org_id,
    'run-20241215-014',
    'agent',
    'Content creation completed: Posted Q4 results announcement to LinkedIn with 35% engagement rate improvement message. Scheduled follow-up posts for Twitter and company blog.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"agent_id": "660e8400-e29b-41d4-a716-446655440002", "context": "content_publishing", "platform": "linkedin", "performance": "high_engagement"}',
    'organization',
    :org_id,
    NULL,
    NULL,
    NULL,
    'sha256:stuv012wxyz345',
    NOW() - INTERVAL '6 hours'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440015',
    :org_id,
    'run-20241215-015',
    'agent',
    'Support ticket resolution: Resolved ticket #SUP-2024-0892 regarding API authentication issue. Customer was using deprecated endpoint. Provided updated documentation and code examples.',
    ('[' || array_to_string(array_fill(0.0, ARRAY[1536]), ',') || ']')::vector,
    '{"agent_id": "660e8400-e29b-41d4-a716-446655440005", "context": "customer_support", "ticket_id": "SUP-2024-0892", "resolution": "documentation_provided"}',
    'organization',
    :org_id,
    NULL,
    NULL,
    NULL,
    'sha256:wxyz345abcd678',
    NOW() - INTERVAL '4 hours'
  );

-- Insert test trigger registrations
INSERT INTO trigger_registrations (id, org_id, agent_id, provider_id, connection_id, trigger_id, params, expires_at, created_at, updated_at) VALUES
  (
    'ee0e8400-e29b-41d4-a716-446655440001',
    :org_id,
    '660e8400-e29b-41d4-a716-446655440002',
    'slack',
    'aa0e8400-e29b-41d4-a716-446655440002',
    'channel_message',
    '{"channel": "#marketing", "keywords": ["content", "post", "social"]}',
    NOW() + INTERVAL '30 days',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'ee0e8400-e29b-41d4-a716-446655440002',
    :org_id,
    '660e8400-e29b-41d4-a716-446655440005',
    'google',
    'aa0e8400-e29b-41d4-a716-446655440003',
    'new_email',
    '{"label": "customer-support", "auto_respond": true}',
    NOW() + INTERVAL '30 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 hour'
  );

-- Insert test agent memory
INSERT INTO agent_memory (id, agent_id, memory_key, data, expires_at, created_at, updated_at) VALUES
  (
    'ff0e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    'customer_preferences',
    '{"acme_corp": {"payment_terms": "Net 30", "preferred_contact": "email", "invoice_format": "PDF"}, "beta_corp": {"payment_terms": "Net 15", "preferred_contact": "slack", "invoice_format": "PDF"}}',
    NOW() + INTERVAL '90 days',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    'content_templates',
    '{"product_announcement": "Excited to share our latest [PRODUCT] update! [FEATURES]. Learn more: [LINK]", "company_update": "Great news from the team! [UPDATE_TEXT] #growth #team"}',
    NOW() + INTERVAL '60 days',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '15 minutes'
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440003',
    :org_id,
    'global_settings',
    '{"timezone": "America/New_York", "business_hours": {"start": "09:00", "end": "17:00"}, "holidays": ["2024-12-25", "2025-01-01"]}',
    NULL,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '1 day'
  );

-- Insert test OAuth transactions (some completed, some pending)
INSERT INTO oauth_transactions (id, user_id, org_id, provider, capabilities, requested_scopes, state, code_verifier, redirect_uri, status, created_at, expires_at, finished_at) VALUES
  (
    'ff0e8400-e29b-41d4-a716-446655440001',
    :user_id,
    :org_id,
    'quickbooks',
    ARRAY['invoice.read', 'invoice.write', 'customer.read'],
    ARRAY['invoice.create', 'customer.upsert'], -- need external scopes i think.
    'state-qb-12345',
    'code-verifier-qb-12345',
    'http://localhost:3000/oauth/callback',
    'completed',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days' + INTERVAL '30 minutes',
    NOW() - INTERVAL '7 days' + INTERVAL '5 minutes'
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440002',
    :user_id,
    :org_id,
    'slack',
    ARRAY['chat.write', 'channels.read'],
    ARRAY['chat.write', 'channels.read'], -- need external scopes i think.
    'state-slack-67890',
    'code-verifier-slack-67890',
    'http://localhost:3000/oauth/callback',
    'completed',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days' + INTERVAL '30 minutes',
    NOW() - INTERVAL '5 days' + INTERVAL '8 minutes'
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440003',
    :user_id,
    :org_id,
    'microsoft',
    ARRAY['mail.send', 'calendar.events.read'],
    ARRAY['mail.send', 'calendar.events.read'], -- need external scopes i think.
    'state-ms-13579',
    'code-verifier-ms-13579',
    'http://localhost:3000/oauth/callback',
    'expired',
    NOW() - INTERVAL '100 years',
    NOW() - INTERVAL '100 years' + INTERVAL '30 minutes',
    NULL
  );