const http = require('http');

const payload = JSON.stringify({
  parsedResume: {
    personalInfo: { name: "Test Candidate" },
    skills: ["React", "Node.js"],
    projects: [
      { name: "Chat App", technologies: ["React", "Socket.io"], descriptions: ["Built a real-time chat app using React and Socket.io."] }
    ]
  },
  focusArea: "Projects",
  persona: "hiring-manager",
  numQuestions: 2
});

const options = {
  hostname: '127.0.0.1',
  port: 4001,
  path: '/api/resume/generate-questions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('RESPONSE:', data);
  });
});

req.on('error', (e) => {
  console.error('ERROR:', e.message);
});

req.write(payload);
req.end();
