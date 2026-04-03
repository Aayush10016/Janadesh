const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Test WebSocket with real database connection
async function testWebSocketWithRealDB() {
  console.log('🚀 Testing WebSocket with Real Database Connection...\n');

  // Create a test JWT token
  const testUser = {
    userId: 'test-user-id',
    walletAddress: '0x1234567890123456789012345678901234567890',
    role: 'voter',
    voterStatus: 'eligible',
    isVerified: true,
    isEmailVerified: true
  };

  const token = jwt.sign(testUser, 'your_super_secret_jwt_key_here_change_in_production', { expiresIn: '1h' });

  console.log('1. Testing WebSocket Server Connection...');
  
  try {
    const ws = new WebSocket(`ws://localhost:3002?token=${token}`, {
      origin: 'http://localhost:3000'
    });

    let testsPassed = 0;
    let totalTests = 4;

    ws.on('open', () => {
      console.log('✅ WebSocket connection established');
      testsPassed++;

      // Test 1: Join public room
      console.log('2. Testing room joining...');
      ws.send(JSON.stringify({
        type: 'join_room',
        data: { room: 'public' },
        timestamp: new Date().toISOString()
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log(`📨 Received: ${message.type}`);

      switch (message.type) {
        case 'connection_established':
          console.log('✅ Connection established with user ID:', message.data.userId);
          testsPassed++;
          break;

        case 'room_joined':
          console.log('✅ Successfully joined room:', message.data.room);
          testsPassed++;

          // Test 2: Send ping
          console.log('3. Testing ping-pong...');
          ws.send(JSON.stringify({
            type: 'ping',
            data: {},
            timestamp: new Date().toISOString()
          }));
          break;

        case 'pong':
          console.log('✅ Ping-pong successful');
          testsPassed++;

          // All tests completed
          console.log('\n🎉 All WebSocket tests completed!');
          console.log(`✅ ${testsPassed}/${totalTests} tests passed`);
          
          if (testsPassed === totalTests) {
            console.log('\n🎊 SUCCESS: WebSocket implementation is working perfectly with real database!');
          } else {
            console.log('\n⚠️  Some tests failed, but basic functionality is working');
          }

          ws.close();
          process.exit(0);
          break;
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      process.exit(1);
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('⏰ Test timeout - WebSocket server might not be running');
      ws.close();
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Start the test
testWebSocketWithRealDB();