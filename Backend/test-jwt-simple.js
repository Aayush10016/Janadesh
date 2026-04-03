const jwt = require('jsonwebtoken');

// Test JWT creation and verification
const secret = 'fallback-secret-change-in-production';

// Create a token with the exact structure expected by AuthService
const payload = {
    userId: 'test-admin-id',
    walletAddress: '0x1234567890123456789012345678901234567890',
    role: 'admin',
    voterStatus: 'eligible',
    isVerified: true,
    isEmailVerified: true,
    type: 'access'
};

console.log('Creating JWT token...');
const token = jwt.sign(payload, secret, { expiresIn: '1h' });
console.log('Token created:', token);

console.log('\nVerifying JWT token...');
try {
    const decoded = jwt.verify(token, secret);
    console.log('Token verified successfully:', decoded);
} catch (error) {
    console.log('Token verification failed:', error.message);
}

console.log('\nTesting with curl command:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3001/api/v1/monitoring/health`);