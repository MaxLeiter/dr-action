/* eslint-env node */

const fs = require('fs');
const https = require('https');

// Check if failed_files.txt exists
if (!fs.existsSync('failed_files.txt')) {
  console.log('No failed files found.');
  process.exit(0);
}

// Read the failed files from the log
const failedFiles = fs.readFileSync('failed_files.txt', 'utf-8').split('\n').filter(Boolean);
console.log('Failed files:', failedFiles);

// Handle the case where no failed files are found
if (failedFiles.length === 0) {
  console.log('No failed files found.');
  process.exit(0);
}

// Prepare the API request payload
const files = failedFiles.map(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    path: filePath,
    content: content
  };
}).filter(Boolean);

const payload = {
  files: files
};

// Log the current working directory
console.log('Current working directory:', process.cwd());

// Call the Google Generative AI API
const options = {
  hostname: 'ai.google.dev',
  path: '/api/rest',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, res => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('API call completed with status code:', res.statusCode);
    if (res.statusCode !== 200) {
      console.error(`HTTP error! status: ${res.statusCode}, body: ${data}`);
      return;
    }

    try {
      const response = JSON.parse(data);
      console.log('API response:', JSON.stringify(response, null, 2));

      // Parse the response and create suggestions
      const suggestions = response.suggestions.map(suggestion => {
        return `\`\`\`suggestion\n${suggestion.diff}\n\`\`\``;
      });

      if (suggestions.length === 0) {
        console.log('No suggestions received from the API.');
        return;
      }

      // Write the suggestions to a file
      try {
        fs.writeFileSync('suggestions.txt', suggestions.join('\n'), 'utf-8');
        console.log('Suggestions written to suggestions.txt');
      } catch (error) {
        console.error('Error writing suggestions to file:', error);
      }
    } catch (error) {
      console.error('Error parsing API response:', error);
    }
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

console.log('Sending API request with payload:', JSON.stringify(payload, null, 2));
req.write(JSON.stringify(payload));
req.end();
