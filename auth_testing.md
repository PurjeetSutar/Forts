# Auth Testing Playbook

## Email/password (JWT cookies)
curl -c cookies.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@fortsofmaharashtra.in","password":"FortAdmin@2026"}'
curl -b cookies.txt $API/api/auth/me
Mutating requests from curl: omit Origin header or use the app origin.

## Google (Emergent) session — create a test session directly
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({user_id: userId, email: 'test.user.' + Date.now() + '@example.com', name: 'Test User', role: 'user', auth_provider: 'google', favorites: [], created_at: new Date().toISOString()});
db.user_sessions.insertOne({user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date()});
print('Session token: ' + sessionToken);
"
Then: curl -H "Authorization: Bearer <token>" $API/api/auth/me
Browser: set cookie session_token=<token> (httpOnly, secure, sameSite None) on the app domain.
