const axios = require('axios');

async function testVoice() {
    try {
        console.log('Checking Voice Stack status...');
        const home = await axios.get('http://localhost:7100/', { timeout: 2000 });
        console.log('Status:', home.data);
        
        console.log('Requesting speech...');
        const start = Date.now();
        const response = await axios.post('http://localhost:7100/tts', {
            text: 'Hello from HermesDesk test.',
            voice: 'english-uk'
        }, { timeout: 5000 });
        console.log('Response:', response.data);
        console.log('Time taken:', Date.now() - start, 'ms');
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testVoice();
