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

// Log the contents of failed_files.txt
console.log('Contents of failed_files.txt:', fs.readFileSync('failed_files.txt', 'utf-8'));

// Handle the case where no failed files are found
if (failedFiles.length === 0 || failedFiles[0] === 'No failed files found.') {
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

// Log environment variables
console.log('Environment variables:', process.env);

// Ensure the payload is not empty before sending the request
if (files.length === 0) {
  console.log('No valid files to send to the API.');
  process.exit(0);
}

// Call the Google Generative AI API
function sendApiRequest(payload) {
  const payloadString = JSON.stringify(payload);
  const options = {
    hostname: 'ai.google.dev',
    path: '/api/rest',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadString, 'utf8')
    }
  };

  const req = https.request(options, res => {
    let data = '';

    res.on('data', chunk => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('API call completed with status code:', res.statusCode);
      console.log('Response headers:', res.headers);
      if (res.statusCode !== 200) {
        console.error(`HTTP error! status: ${res.statusCode}, body: ${data}`);
        return;
      }

      // Log the raw data received from the API
      console.log('Raw API response data:', data);

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
          const suggestionsFilePath = `${process.cwd()}/suggestions.txt`;
          fs.writeFileSync(suggestionsFilePath, suggestions.join('\n'), 'utf-8');
          console.log(`Suggestions written to ${suggestionsFilePath}`);
        } catch (error) {
          console.error('Error writing suggestions to file:', error);
        }
      } catch (error) {
        console.error('Error parsing API response:', error);
        console.error('Raw response body:', data); // Log the raw response body for debugging
      }
    });
  });

  req.on('error', error => {
    console.error('Error:', error);
  });

  console.log('Sending API request with payload:', payloadString);
  req.write(payloadString);
  req.end();
}

sendApiRequest(payload);

console.log('AI Fix Script completed.');

// This is a dummy comment to trigger the GitHub Action
