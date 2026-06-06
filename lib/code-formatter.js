/**
 * Code Formatting & Linting Utilities
 * Provides code formatting for multiple languages
 */

/**
 * Format JavaScript/TypeScript code
 */
const formatJavaScript = (code) => {
  // Basic formatting rules
  let formatted = code
    // Add spaces around operators
    .replace(/([^=!<>+\-*/%&|^])([=!<>+\-*/%&|^])([^=!<>+\-*/%&|^])/g, '$1 $2 $3')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    // Fix indentation
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      const indent = (line.match(/^\s*/)[0].length / 2) || 0;
      return '  '.repeat(indent) + trimmed;
    })
    .join('\n');

  return formatted;
};

/**
 * Format Python code
 */
const formatPython = (code) => {
  let formatted = code
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Preserve indentation
      const match = line.match(/^(\s*)/);
      const indent = match ? match[1].length : 0;
      
      return ' '.repeat(indent) + trimmed;
    })
    .join('\n');

  return formatted;
};

/**
 * Format Java code
 */
const formatJava = (code) => {
  let formatted = code
    .replace(/([{}])/g, '\n$1\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .join('\n');

  return formatted;
};

/**
 * Format C++ code
 */
const formatCpp = (code) => {
  let formatted = code
    .replace(/([{}])/g, '\n$1\n')
    .replace(/;/g, ';\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .join('\n');

  return formatted;
};

/**
 * Main format function
 */
export const formatCode = (code, language = 'javascript') => {
  if (!code) return code;

  const lang = language.toLowerCase();

  switch (lang) {
    case 'javascript':
    case 'js':
    case 'typescript':
    case 'ts':
      return formatJavaScript(code);
    case 'python':
    case 'py':
      return formatPython(code);
    case 'java':
      return formatJava(code);
    case 'cpp':
    case 'c++':
    case 'c':
      return formatCpp(code);
    default:
      return code;
  }
};

/**
 * Detect common syntax errors
 */
export const detectSyntaxErrors = (code, language = 'javascript') => {
  const errors = [];
  const lang = language.toLowerCase();

  // Common checks for all languages
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Check unclosed braces
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push({
        line: lineNumber,
        message: `Unmatched braces: ${openBraces} open, ${closeBraces} close`,
        severity: 'warning',
      });
    }

    // Check unclosed parentheses
    const openParen = (line.match(/\(/g) || []).length;
    const closeParen = (line.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
      errors.push({
        line: lineNumber,
        message: `Unmatched parentheses: ${openParen} open, ${closeParen} close`,
        severity: 'warning',
      });
    }

    // Check unclosed brackets
    const openBracket = (line.match(/\[/g) || []).length;
    const closeBracket = (line.match(/]/g) || []).length;
    if (openBracket !== closeBracket) {
      errors.push({
        line: lineNumber,
        message: `Unmatched brackets: ${openBracket} open, ${closeBracket} close`,
        severity: 'warning',
      });
    }

    // Language-specific checks
    if (lang === 'python' || lang === 'py') {
      if (line.trim().endsWith(':') && !lines[index + 1]?.match(/^\s{2,}/)) {
        errors.push({
          line: lineNumber,
          message: 'Expected indentation after colon',
          severity: 'error',
        });
      }
    }

    if (lang === 'javascript' || lang === 'js' || lang === 'java') {
      if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        if (!line.includes('{') && !line.includes('}') && !line.match(/^\s*$/)) {
          if (!line.trim().endsWith(';') && !line.trim().endsWith(',') && !line.trim().endsWith('{')) {
            // Don't require semicolon at end of line in some cases
          }
        }
      }
    }
  });

  return errors;
};

/**
 * Get code statistics
 */
export const getCodeStats = (code) => {
  const lines = code.split('\n');
  const nonEmptyLines = lines.filter(l => l.trim()).length;
  const commentLines = lines.filter(l => 
    l.trim().startsWith('//') || 
    l.trim().startsWith('#') || 
    l.trim().startsWith('/*')
  ).length;
  
  return {
    totalLines: lines.length,
    nonEmptyLines,
    commentLines,
    codeLines: nonEmptyLines - commentLines,
    characters: code.length,
    words: code.split(/\s+/).length,
  };
};

/**
 * Add line numbers to code
 */
export const addLineNumbers = (code) => {
  return code
    .split('\n')
    .map((line, index) => `${String(index + 1).padStart(3, ' ')} | ${line}`)
    .join('\n');
};

/**
 * Highlight errors in code
 */
export const highlightErrors = (code, errors) => {
  if (!errors || errors.length === 0) return code;

  const lines = code.split('\n');
  
  errors.forEach(error => {
    if (error.line && error.line <= lines.length) {
      const lineIndex = error.line - 1;
      const line = lines[lineIndex];
      lines[lineIndex] = `${line} // ⚠ ${error.message}`;
    }
  });

  return lines.join('\n');
};
