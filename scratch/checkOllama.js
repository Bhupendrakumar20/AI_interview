const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 11434,
  path: '/api/tags',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('OLLAMA_STATUS: ACTIVE');
      console.log('MODELS:', json.models?.map(m => m.name).join(', ') || 'None');
    } catch (e) {
      console.log('OLLAMA_STATUS: ERROR_PARSING');
    }
  });
});

req.on('error', (err) => {
  console.log('OLLAMA_STATUS: INACTIVE');
  console.log('ERROR:', err.message);
});

req.on('timeout', () => {
  console.log('OLLAMA_STATUS: TIMEOUT');
  req.destroy();
});

req.end();
