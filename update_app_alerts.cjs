const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Add import
const importInsertion = `import { useAlert } from './contexts/AlertContext';\n`;
if (!content.includes('AlertContext')) {
  content = importInsertion + content;
}

// Find App component start
const appStartStr = `function App() {`;
if (content.includes(appStartStr)) {
  const hookInsertion = `\n  const showAlert = useAlert();\n`;
  content = content.replace(appStartStr, appStartStr + hookInsertion);
}

// Replace all alert(...) with showAlert(..., 'warning')
// A regex to match alert("...") or alert(`...`) or alert(var)
// We need to be careful with string boundaries.
// Actually, global string replacement might be easier:
// We just replace `alert(` with `showAlert(`. Wait, `showAlert` signature is `showAlert(message, variant, title)`.
// By default `variant='information'`, so `showAlert(..., 'warning')` or `error` is better.
// I will replace `alert(` with `showAlert(`. It will default to 'information'. 
// I will just replace `alert(` with `showAlert(`. And update `AlertContext.jsx` default to 'warning'. No, 'information' is fine. Or I can do `content = content.replace(/\balert\(/g, 'showAlert(');`

content = content.replace(/\balert\(/g, 'showAlert(');

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx alerts replaced');
