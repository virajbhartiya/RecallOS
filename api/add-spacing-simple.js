#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function addSpacingBetweenFunctions(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Split content into lines
    const lines = content.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      newLines.push(line);
      
      // Check if current line is a function definition (static async method)
      if (line.match(/^\s*static\s+async\s+\w+\s*\(/)) {
        // Look ahead to find the next function definition
        let j = i + 1;
        let foundNextFunction = false;
        
        while (j < lines.length) {
          const nextLine = lines[j];
          
          // Skip empty lines
          if (nextLine.trim() === '') {
            j++;
            continue;
          }
          
          // Check if this is a function definition
          if (nextLine.match(/^\s*static\s+async\s+\w+\s*\(/)) {
            foundNextFunction = true;
            break;
          }
          
          // If it's not a function definition, break
          break;
        }
        
        // If we found the next function, check if there's a blank line between them
        if (foundNextFunction) {
          let hasBlankLine = false;
          for (let k = i + 1; k < j; k++) {
            if (lines[k].trim() === '') {
              hasBlankLine = true;
              break;
            }
          }
          
          // Add blank line if there isn't one
          if (!hasBlankLine) {
            newLines.push('');
            modified = true;
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, newLines.join('\n'));
      console.log(`✅ Added spacing to ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let processedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
      processedCount += processDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      if (addSpacingBetweenFunctions(filePath)) {
        processedCount++;
      }
    }
  }
  
  return processedCount;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
console.log('🎨 Adding spacing between function definitions...');

const processedCount = processDirectory(srcDir);
console.log(`✅ Spacing added to ${processedCount} files!`);
