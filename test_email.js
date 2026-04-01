
const axios = require('axios');

async function testDemoEmail() {
  const registerData = {
    username: 'testuser_' + Date.now(),
    pin: '1234',
    email: 'meganmuirhead@gmail.com', // Using user's email from .env to see if it sends
    bio: 'Testing demo email'
  };

  try {
    console.log('Attempting registration in demo mode (simulated by health check or known state)...');
    // Note: To truly test demo mode, the database must be disconnected.
    // If it's connected, we'll see the regular mongo behavior.

    const res = await axios.post('http://localhost:5001/api/auth/register', registerData);
    console.log('Response Status:', res.status);
    console.log('Response Body:', JSON.stringify(res.data, null, 2));

    if (res.data.isDemo) {
      console.log('SUCCESS: Server is in Demo Mode and handled registration.');
      if (res.data.emailSent) {
        console.log('SUCCESS: Email reported as SENT in Demo Mode.');
      } else if (res.data.debugMode) {
        console.log('INFO: Email in DEBUG mode (no SMTP configured).');
      } else {
        console.log('WARNING: Email reported as FAILED.');
      }
    } else {
      console.log('INFO: Server is in DATABASE mode.');
      if (res.data.emailSent) {
        console.log('SUCCESS: Email reported as SENT in Database Mode.');
      }
    }
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testDemoEmail();
