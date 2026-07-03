const fs = require('fs');

let file = fs.readFileSync('src/components/ui/TemplatePreviewModal.jsx', 'utf8');

// Header and class changes
file = file.replace('<button className="close-btn"', '<button className="close-btn-aesthetic" title="Cerrar"');
file = file.replace(
  '<div className="modal-header">\\n          <div style={{ display: \\'flex\\', alignItems: \\'center\\', gap: \\'10px\\' }}>\\n            <div className="icon-circle primary">',
  '<div className="modal-header" style={{ display: \\'flex\\', justifyContent: \\'space-between\\', alignItems: \\'flex-start\\', marginBottom: \\'1.5rem\\', position: \\'relative\\' }}>\\n          <div style={{ display: \\'flex\\', alignItems: \\'center\\', gap: \\'12px\\' }}>\\n            <div className="icon-circle primary" style={{ width: \\'40px\\', height: \\'40px\\' }}>'
);
file = file.replace(
  '<h2 className="modal-title">Vista Previa de Plantilla</h2>',
  '<div>\\n              <h2 className="modal-title" style={{ margin: 0, fontSize: \\'1.4rem\\' }}>Vista Previa de Plantilla</h2>\\n              <p style={{ margin: 0, color: \\'var(--text-muted)\\', fontSize: \\'0.85rem\\' }}>Revisa y ajusta los detalles antes de guardar.</p>\\n            </div>'
);

// State additions
file = file.replace(
  'const [template, setTemplate] = useState(null);',
  'const [template, setTemplate] = useState(null);\n  const [expandedStepIndex, setExpandedStepIndex] = useState(null);'
);

// Toggle step function
file = file.replace(
  'const handleTemplateChange = (field, value) => {',
  'const toggleStep = (index) => {\n    setExpandedStepIndex(prev => prev === index ? null : index);\n  };\n\n  const handleTemplateChange = (field, value) => {'
);

// Accordion mapping replacement
const stepsRegex = /<div className="steps-editor-list">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div className="modal-footer"/;

const newStepsBlock = \`<div className="steps-editor-list">
              {template.steps?.map((step, index) => {
                const isExpanded = expandedStepIndex === index;
                return (
                <div key={index} className="step-editor-card">
                  <div className="step-editor-header" onClick={() => toggleStep(index)} style={{ cursor: 'pointer', transition: 'background 0.2s', background: isExpanded ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)' }}>
                    <div className="step-number">{index + 1}</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <input 
                        type="text" 
                        className="form-input step-title-input" 
                        value={step.title} 
                        onChange={e => handleStepChange(index, 'title', e.target.value)} 
                        onClick={e => e.stopPropagation()}
                        style={{ padding: '4px 8px', margin: '-4px -8px' }}
                      />
                      {!isExpanded && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '8px' }}>
                          {step.durationLabel || \\\`Día \\\${step.relativeOffsetDays}\\\`} • {step.type === 'manual' ? 'Manual' : 'Digital'}
                        </span>
                      )}
                    </div>
                    <button className="circle-btn red" onClick={(e) => { e.stopPropagation(); handleDeleteStep(index); }}><Trash2 size={14} /></button>
                  </div>
                  
                  {isExpanded && (
                    <motion.div 
                      className="step-editor-body"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="form-group">
                        <label>Descripción</label>
                        <textarea className="form-input" rows={2} value={step.description} onChange={e => handleStepChange(index, 'description', e.target.value)} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label>Día (Offset)</label>
                          <input type="number" className="form-input" value={step.relativeOffsetDays || 0} onChange={e => handleStepChange(index, 'relativeOffsetDays', parseInt(e.target.value))} />
                        </div>
                        <div className="form-group">
                          <label>Tipo</label>
                          <select className="form-input" value={step.type} onChange={e => handleStepChange(index, 'type', e.target.value)}>
                            <option value="manual">Manual</option>
                            <option value="digital">Digital (Subir Archivo)</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )})}
            </div>
          </div>
        </div>

        <div className="modal-footer"\`;

file = file.replace(stepsRegex, newStepsBlock);

fs.writeFileSync('src/components/ui/TemplatePreviewModal.jsx', file);
console.log('TemplatePreviewModal updated.');
