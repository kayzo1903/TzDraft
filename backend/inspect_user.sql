-- Query to inspect the created user and session
SELECT 
  u.id,
  u.phone_number,
  u.username,
  u.display_name,
  u.is_verified,
  u.created_at,
  r.rating,
  COUNT(rt.id) as refresh_token_count
FROM users u
LEFT JOIN ratings r ON r.user_id = u.id
LEFT JOIN refresh_tokens rt ON rt.user_id = u.id
WHERE u.phone_number = '+255653274741'
GROUP BY u.id, r.rating
ORDER BY u.created_at DESC
LIMIT 1;
