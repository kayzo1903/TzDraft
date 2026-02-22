const crypto = require('crypto');

async function verify() {
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const phoneNumber = `+2557${Date.now().toString().slice(-8)}`;
  const username = `VerifyUser_${randomSuffix}`;
  const password = 'VerifyPassword123!';

  try {
    console.log(`Registering user ${username} (${phoneNumber})...`);
    const registerRes = await fetch('http://localhost:3002/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber,
        username,
        password,
        confirmPassword: password,
        displayName: username,
      }),
    });

    if (!registerRes.ok) {
      console.error('Registration failed:', await registerRes.text());
      return;
    }

    const registerData = await registerRes.json();
    const token = registerData.accessToken;
    const userId = registerData.user.id;
    console.log('Registered & Logged in. Token acquired.');

    console.log('Sending request to create PvE game...');
    const response = await fetch('http://localhost:3002/games/pve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        playerId: userId,
        playerColor: 'WHITE',
        aiLevel: 1,
      }),
    });

    if (!response.ok) {
      console.error('Create game failed:', await response.text());
      return;
    }

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(data, null, 2));

    if (response.status === 201) {
      console.log('✅ VERIFICATION SUCCESSFUL: Game created with AI opponent.');
    } else {
      console.log('❌ VERIFICATION FAILED: Unexpected status code.');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

verify();
