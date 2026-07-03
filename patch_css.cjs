const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

// Modernize .btn
const btnTarget = `.btn {
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: var(--transition-smooth);
}`;
const btnRepl = `.btn {
  padding: 0.55rem 1.25rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}`;
content = content.replace(btnTarget, btnRepl);

// Modernize .btn-danger
const dangerTarget = `.btn-danger {
  background-color: #FFF1F0;
  color: #D32F2F;
}

.btn-danger:hover {
  background-color: #FFECEB;
}`;
const dangerRepl = `.btn-danger {
  background-color: transparent;
  color: #ef4444;
  border: 1px solid #fee2e2;
  box-shadow: none;
}

.btn-danger:hover {
  background-color: #fee2e2;
  transform: translateY(-1px);
}`;
content = content.replace(dangerTarget, dangerRepl);

// Modernize .form-input
const inputTarget = `.form-input {
  padding: 0.75rem;
  border: 1px solid rgba(220, 200, 190, 0.4);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  outline: none;
  transition: var(--transition-smooth);
}`;
const inputRepl = `.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
  background-color: #fafafa;
}
.form-input:hover {
  border-color: rgba(0, 0, 0, 0.15);
}`;
content = content.replace(inputTarget, inputRepl);

fs.writeFileSync('src/index.css', content);
