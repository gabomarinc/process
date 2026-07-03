const fs = require('fs');
let content = fs.readFileSync('src/components/ui/LaunchExecutionModal.jsx', 'utf8');

const target = `                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} />
                        ) : (
                          <span>{m.name.charAt(0).toUpperCase()}</span>
                        )}`;
const repl = `                        <span>{m.name ? m.name.charAt(0).toUpperCase() : 'U'}</span>`;
content = content.replace(target, repl);

fs.writeFileSync('src/components/ui/LaunchExecutionModal.jsx', content);
