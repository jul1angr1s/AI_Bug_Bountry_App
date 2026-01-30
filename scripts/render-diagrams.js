import { renderMermaidAscii } from 'beautiful-mermaid';
import fs from 'fs';
import path from 'path';

const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide a file path');
    process.exit(1);
}
const absolutePath = path.resolve(process.cwd(), filePath);
let content = fs.readFileSync(absolutePath, 'utf8');

// Update content to use Kimi AI (just in case sed missed some case variations)
content = content.replace(/Ollama/gi, 'Kimi AI');
content = content.replace(/DeepSeek/gi, 'Kimi');

const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
let match;

// Collect replacements
const replacements = [];

while ((match = mermaidRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const mermaidText = match[1];

    try {
        const ascii = renderMermaidAscii(mermaidText, { useAscii: false }); // false uses unicode box chars
        replacements.push({
            original: fullMatch,
            replacement: `\n\`\`\`\n${ascii}\n\`\`\`\n`
        });
    } catch (e) {
        console.error(`Error rendering diagram in ${filePath}:`, e);
    }
}

let newContent = content;
replacements.forEach(({ original, replacement }) => {
    newContent = newContent.replace(original, replacement);
});

fs.writeFileSync(absolutePath, newContent);
console.log(`${filePath} updated with beautiful-mermaid ASCII diagrams.`);
