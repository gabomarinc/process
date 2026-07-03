const fs = require('fs');

let css = fs.readFileSync('src/components/ui/notifications.css', 'utf8');

const additionalCss = `
.radix-notif-action-btn.success {
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10b981;
}
.radix-notif-action-btn.success:hover {
  background: #10b981;
  color: white;
}
`;

if (!css.includes('.radix-notif-action-btn.success')) {
  fs.appendFileSync('src/components/ui/notifications.css', additionalCss);
}

console.log('CSS updated');
