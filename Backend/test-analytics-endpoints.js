const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3001/api/v1';

async function createTestUser() {
    try {
        // First register a test admin user
        const userData = {
            email: 'testadmin@example.com',
            username: 'testadmin',
            firstName: 'Test',
            lastName: 'Admin',
            registrationNumber: 'REG-ADMIN-TEST'
        };

        console.log('Creating test admin user...');
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, userData);
        
        if (!registerResponse.data.success) {
            throw new Error('Failed to register user');
        }

        const userId = registerResponse.data.data.user.id;
        console.log(`✅ Test user created with ID: ${userId}`);

        // Create a proper admin token with all required fields
        const adminToken = jwt.sign({
            userId: userId,
            walletAddress: '0x1234567890123456789012345678901234567890',
            role: 'admin',
            voterStatus: 'eligible',
            isVerified: true,
            isEmailVerified: true,
            type: 'access'
        }, 'fallback-secret-change-in-production', { expiresIn: '1h' });

        return { userId, adminToken };
    } catch (error) {
        if (error.response?.status === 409) {
            console.log('User already exists, using existing user...');
            // If user exists, just create a token (we'll need to get the user ID from DB)
            const adminToken = jwt.sign({
                userId: 'existing-admin-id', // This won't work, but let's try
                walletAddress: '0x1234567890123456789012345678901234567890',
                role: 'admin',
                voterStatus: 'eligible',
                isVerified: true,
                isEmailVerified: true,
                type: 'access'
            }, 'fallback-secret-change-in-production', { expiresIn: '1h' });
            
            return { userId: 'existing-admin-id', adminToken };
        }
        throw error;
    }
}

async function testEndpoints() {
    console.log('Testing Analytics and Monitoring Endpoints...\n');

    // Create test user and get admin token
    const { userId, adminToken } = await createTestUser();
    console.log('Using admin token for testing...\n');

    const endpoints = [
        { name: 'System Health', url: '/monitoring/health' },
        { name: 'Performance Metrics', url: '/monitoring/performance' },
        { name: 'Dashboard Data', url: '/monitoring/dashboard' },
        { name: 'System Configuration', url: '/monitoring/config' },
        { name: 'Application Logs', url: '/monitoring/logs' },
        { name: 'System Statistics', url: '/analytics/system' },
        { name: 'Real-time Stats', url: '/analytics/realtime' },
        { name: 'System Alerts', url: '/analytics/alerts' },
        { name: 'Voting Patterns', url: '/analytics/patterns' },
        { name: 'User Engagement', url: '/analytics/engagement' }
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint.name}...`);
            const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                },
                timeout: 5000
            });

            if (response.status === 200 && response.data.success) {
                console.log(`✅ ${endpoint.name}: SUCCESS`);
                console.log(`   Status: ${response.status}`);
                console.log(`   Data keys: ${Object.keys(response.data.data || {}).join(', ')}`);
            } else {
                console.log(`❌ ${endpoint.name}: FAILED`);
                console.log(`   Status: ${response.status}`);
                console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint.name}: ERROR`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Error: ${error.response.data?.error?.message || 'Unknown error'}`);
            } else {
                console.log(`   Error: ${error.message}`);
            }
        }
        console.log('');
    }

    console.log('Testing complete!');
}

testEndpoints().catch(console.error);