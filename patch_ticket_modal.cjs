const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add import
if (!content.includes('SuccessTicketModal')) {
  content = content.replace(
    'import { LaunchExecutionModal } from "./components/ui/LaunchExecutionModal";',
    'import { LaunchExecutionModal } from "./components/ui/LaunchExecutionModal";\nimport { SuccessTicketModal } from "./components/ui/SuccessTicketModal";'
  );
}

// 2. Add state
if (!content.includes('const [ticketModal, setTicketModal]')) {
  content = content.replace(
    '  const [showMemberModal, setShowMemberModal] = useState(false);',
    '  const [showMemberModal, setShowMemberModal] = useState(false);\n  const [ticketModal, setTicketModal] = useState({ isOpen: false, title: "", message: "", ticketId: "", customFields: [] });'
  );
}

// 3. Render it
if (!content.includes('<SuccessTicketModal')) {
  content = content.replace(
    '    </div>\n  );\n}\n\nexport default App;',
    `      <SuccessTicketModal 
        isOpen={ticketModal.isOpen} 
        onClose={() => setTicketModal({ ...ticketModal, isOpen: false })} 
        title={ticketModal.title} 
        message={ticketModal.message} 
        ticketId={ticketModal.ticketId} 
        customFields={ticketModal.customFields} 
      />\n    </div>\n  );\n}\n\nexport default App;`
  );
}

// 4. Update handleSaveMember alert
content = content.replace(
  'showAlert("¡Perfil guardado con éxito!");',
  `setTicketModal({
          isOpen: true,
          title: "¡Perfil Guardado!",
          message: editingMember ? "Los cambios se guardaron correctamente." : "El nuevo colaborador fue añadido con éxito.",
          ticketId: memberId,
          customFields: [
            { label: "Colaborador", value: newMember.name },
            { label: "Rol", value: newMember.role }
          ]
        });`
);

// 5. Update handleLaunchInstance (at the end)
content = content.replace(
  '    // Trigger active assignee notification for the first step',
  `    setTicketModal({
      isOpen: true,
      title: "¡Ejecución Iniciada!",
      message: "Se ha lanzado la ejecución con éxito.",
      ticketId: newInstance.id,
      customFields: [
        { label: "Ejecución", value: newInstance.instanceName },
        { label: "Plantilla Base", value: newInstance.title }
      ]
    });
    // Trigger active assignee notification for the first step`
);

// 6. Update handleNewTemplate (if it exists)
// Let's check how template is saved. We have handleCreateTemplate or something?
// The user says "crear plantillas". I'll replace `setShowNewTemplate(false)` or `setTemplates(prev => [newTemplate, ...prev])`

fs.writeFileSync('src/App.jsx', content);
