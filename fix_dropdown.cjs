const fs = require('fs');

let css = fs.readFileSync('src/components/ui/dropdown-menu.css', 'utf8');
css = css.replace(/z-index: 50;/g, 'z-index: 99999;');
fs.writeFileSync('src/components/ui/dropdown-menu.css', css);

let notifCss = fs.readFileSync('src/components/ui/notifications.css', 'utf8');
notifCss = notifCss.replace(/\.notification-item/g, '.radix-notif-item');
fs.writeFileSync('src/components/ui/notifications.css', notifCss);

console.log('CSS fixed');
