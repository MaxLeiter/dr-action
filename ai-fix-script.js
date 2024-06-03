/* eslint-env node */

const fs = require('fs');

// Check if failed_files.txt exists
if (!fs.existsSync('failed_files.txt')) {
  console.error('Error: failed_files.txt not found.');
  process.exit(1);
}

// Read the failed files from the log
const failedFiles = fs.readFileSync('failed_files.txt', 'utf-8').split('\n').filter(Boolean);

// Prepare the API request payload
const files = failedFiles.map(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    path: filePath,
    content: content
  };
});

const payload = {
  files: files
};

// Call the Google Generative AI API
fetch('https://ai.google.dev/api/rest', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(response => response.json())
  .then(data => {
    // Parse the response and create suggestions
    const suggestions = data.suggestions.map(suggestion => {
      return `\`\`\`suggestion\n${suggestion.diff}\n\`\`\``;
    });

    if (suggestions.length === 0) {
      console.log('No suggestions received from the API.');
      return;
    }

    // Write the suggestions to a file
    fs.writeFileSync('suggestions.txt', suggestions.join('\n'), 'utf-8');
    console.log('Suggestions written to suggestions.txt');
  })
  .catch(error => {
    console.error('Error:', error);
  });
