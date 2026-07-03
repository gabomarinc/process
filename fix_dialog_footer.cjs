const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const target = `            <button 
              className="btn btn-primary" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              onClick={(e) => {
                e.preventDefault();
                handleSaveMember(e);
                setShowEditProfileModal(false);
              }}
            >
              Guardar Cambios
            </button>`;

const replacement = `            <button 
              className="btn btn-primary" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              onClick={(e) => {
                e.preventDefault();
                handleSaveMember(e);
              }}
            >
              Guardar Cambios
            </button>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.jsx', content);
