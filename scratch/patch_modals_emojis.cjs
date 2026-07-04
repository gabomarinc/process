const fs = require('fs');

function replaceAll(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  for (const [a, b] of replacements) {
    content = content.split(a).join(b);
  }
  fs.writeFileSync(file, content, 'utf8');
}

// ActiveExecutionModal.jsx
replaceAll('src/components/ui/ActiveExecutionModal.jsx', [
  ["X, Check, Clock, AlertCircle, Upload, FileCheck, ChevronLeft, ChevronRight, Eye, Mail }", "X, Check, Clock, AlertCircle, Upload, FileCheck, ChevronLeft, ChevronRight, Eye, Mail, Lightbulb, FileText, AlertTriangle, Settings }"],
  ["💡 {step.motivation}", "<Lightbulb size={16} className=\"inline-block mr-1\"/> {step.motivation}"],
  ["<div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📄</div>", "<div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--color-primary)' }}><FileText size={48} /></div>"],
  ["✓ Hecho", "<Check size={14} className=\"inline-block mr-1\"/> Hecho"],
  ["⚠ Pedir Cliente", "<AlertTriangle size={14} className=\"inline-block mr-1\"/> Pedir Cliente"],
  ["⚙ Interno", "<Settings size={14} className=\"inline-block mr-1\"/> Interno"]
]);

// AddUserModal.jsx
replaceAll('src/components/ui/AddUserModal.jsx', [
  ["X }", "X, Check, User }"],
  ['{isCompleted ? "✓" : idx + 1}', '{isCompleted ? <Check size={16}/> : idx + 1}'],
  ["👤 Registrar Nuevo Usuario", "<User size={20} className=\"inline-block mr-2\"/> Registrar Nuevo Usuario"]
]);

// MemberModal.jsx
replaceAll('src/components/ui/MemberModal.jsx', [
  ["X }", "X, Check, Edit, Users }"],
  ['{isCompleted ? "✓" : idx + 1}', '{isCompleted ? <Check size={16}/> : idx + 1}'],
  ["{editingMember ? '📝 Editar Colaborador' : '👥 Nuevo Colaborador'}", "{editingMember ? <><Edit size={20} className=\"inline-block mr-2\"/> Editar Colaborador</> : <><Users size={20} className=\"inline-block mr-2\"/> Nuevo Colaborador</>}"]
]);

// TemplateDetailsModal.jsx
replaceAll('src/components/ui/TemplateDetailsModal.jsx', [
  ["ChevronRight }", "ChevronRight, Settings, Lightbulb, CheckCircle }"],
  ["<span className=\"tdm-header-avatar\">{activeTemplate.companionAvatar || '⚙️'}</span>", "<span className=\"tdm-header-avatar\">{activeTemplate.companionAvatar || <Settings size={24}/>}</span>"],
  ["💡 {step.motivation}", "<Lightbulb size={16} className=\"inline-block mr-1\"/> {step.motivation}"],
  ["✅ Confirmar asignación de {member.name}", "<CheckCircle size={18} className=\"inline-block mr-2\"/> Confirmar asignación de {member.name}"]
]);

// TemplateWizardModal.jsx
replaceAll('src/components/ui/TemplateWizardModal.jsx', [
  ["ChevronRight }", "ChevronRight, Check }"],
  ['{isCompleted ? "✓" : index + 1}', '{isCompleted ? <Check size={16}/> : index + 1}']
]);

console.log("Modals patched.");
