const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Import and start just the WebSocket service
const { WebSocketService } = require('./dist/services/WebSocketService');

async function testWebSocketMinimal() {
  console.log('🚀 Testing WebSocket Service (Minimal Test)...\n');

  try {
    // Start WebSocket service
    console.log('Starting WebSocket service...');
    const wsService = new WebSocketService();
    console.log('✅ WebSocket service started on port 3002');

    // Create test token
    const testUser = {
      userId: 'test-user-id',
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'voter',
      voterStatus: 'eligible',
      isVerified: true,
      isEmailVerified: true
    };

    const token = jwt.sign(testUser, 'your_super_secret_jwt_key_here_change_in_production', { expiresIn: '1h' });

    // Wait a moment for server to be ready
    setTimeout(() => {
      console.log('Testing WebSocket connection...');
      
      const ws = new WebSocket(`ws://localhost:3002?token=${token}`, {
        origin: 'http://localhost:3000'
      });

      let testsPassed = 0;

      ws.on('open', () => {
        console.log('✅ WebSocket connection established');
        testsPassed++;
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log(`📨 Received: ${message.type}`);

        if (message.type === 'connection_established') {
          console.log('✅ Authentication successful, user ID:', message.data.userId);
          testsPassed++;

          // Test room joining
          ws.send(JSON.stringify({
            type: 'join_room',
            data: { room: 'public' },
            timestamp: new Date().toISOString()
          }));
        } else if (message.type === 'room_joined') {
          console.log('✅ Room joining successful:', message.data.room);
          testsPassed++;

          // Test complete
          console.log(`\n🎉 WebSocket tests completed: ${testsPassed}/3 passed`);
          
          if (testsPassed >= 3) {
            console.log('🎊 SUCCESS: WebSocket implementation is working with database!');
          }

          ws.close();
          wsService.close().then(() => {
            console.log('✅ WebSocket service closed');
            process.exit(0);
          });
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        wsService.close().then(() => process.exit(1));
      });

    }, 1000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testWebSocketMinimal();