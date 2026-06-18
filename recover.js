const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\baekhadev\\.gemini\\antigravity\\brain';
const toolsDir = 'C:\\Users\\baekhadev\\Documents\\antigravity\\elegant-fermi\\tools';

// Get all transcript_full.jsonl files
function findTranscripts(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findTranscripts(filePath));
    } else if (file === 'transcript_full.jsonl' || file === 'transcript.jsonl') {
      results.push(filePath);
    }
  });
  return results;
}

const transcripts = findTranscripts(brainDir);
const recoveredFiles = new Set();
const latestContents = {};

transcripts.forEach(transcript => {
  const lines = fs.readFileSync(transcript, 'utf-8').split('\n');
  lines.forEach(line => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        obj.tool_calls.forEach(call => {
          let args = call.args || call.arguments;
          if (typeof args === 'string') {
            try { args = JSON.parse(args); } catch(e) { args = {}; }
          }
          if (!args) args = {};
          
          const fnName = call.name || call.function;
          if ((fnName === 'write_to_file' || fnName === 'default_api:write_to_file') && args.TargetFile) {
            if (args.TargetFile.endsWith('.html') && args.TargetFile.includes('\\tools\\')) {
              let content = args.CodeContent;
              if (content) {
                content = content.replace(/data-theme="dark"/g, 'data-theme="light"');
                latestContents[args.TargetFile] = content;
                recoveredFiles.add(args.TargetFile);
              }
            }
          }
        });
      }
    } catch (e) {}
  });
});

for (const [file, content] of Object.entries(latestContents)) {
  fs.writeFileSync(file, content, 'utf-8');
}

console.log('Recovered files:', Array.from(recoveredFiles));
