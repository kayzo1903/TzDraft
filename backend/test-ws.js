const io = require('socket.io-client');
const axios = require('axios');

async function testWebSocket() {
  const API_URL = 'http://localhost:3000';
  const socket = io('http://localhost:3000/games');

  console.log('1. Connecting to WebSocket...');

  socket.on('connect', async () => {
    console.log('✅ Connected to WebSocket');

    try {
      // 1. Create a Game
      console.log('2. Creating a new game...');
      const createResponse = await axios.post(`${API_URL}/games/pvp`, {
        whitePlayerId: 'user-1',
        blackPlayerId: 'user-2',
      });
      const gameId = createResponse.data.data.id;
      console.log(`✅ Game created: ${gameId}`);

      // 2. Join the Game Room
      console.log(`3. Joining room for game ${gameId}...`);
      socket.emit('joinGame', gameId);

      // Listen for updates
      socket.on('gameStateUpdated', (data) => {
        console.log('🎉 Received gameStateUpdated event!');
        console.log('Data:', JSON.stringify(data, null, 2));
        console.log('✅ Verification SUCCESS');
        socket.disconnect();
        process.exit(0);
      });

      // 3. Make a Move
      console.log('4. Making a move (White: 9 -> 14)...');
      // Wait a bit to ensure subscription is active
      setTimeout(async () => {
        try {
          await axios.post(`${API_URL}/games/${gameId}/moves?playerId=user-1`, {
            from: 9,
            to: 13,
          });
          console.log('✅ Move executed via API');
        } catch (error) {
          console.error(
            '❌ Move failed:',
            error.response?.data || error.message,
          );
          process.exit(1);
        }
      }, 1000);
    } catch (error) {
      console.error(
        '❌ Error during setup:',
        error.response?.data || error.message,
      );
      process.exit(1);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
  });
}

testWebSocket();
