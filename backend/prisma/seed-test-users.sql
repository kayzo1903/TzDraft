-- Create test users for API testing
INSERT INTO users (id, username, display_name, password_hash, created_at) VALUES 
('player-001', 'testuser1', 'Test User 1', '$2b$10$dummyhashfortest', NOW()),
('player-002', 'testuser2', 'Test User 2', '$2b$10$dummyhashfortest', NOW())
ON CONFLICT (id) DO NOTHING;
