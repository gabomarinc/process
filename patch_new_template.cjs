const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const t1 = `        setTemplates(prev => [newTemp, ...prev]);
        setSelectedTemplateId(newTemp.id);
        setIsUploading(false);`;
const r1 = `        setTemplates(prev => [newTemp, ...prev]);
        setSelectedTemplateId(newTemp.id);
        setIsUploading(false);
        setTicketModal({
          isOpen: true,
          title: "¡Plantilla Creada!",
          message: "La plantilla se ha generado exitosamente.",
          ticketId: newTemp.id,
          customFields: [
            { label: "Nombre", value: newTemp.title }
          ]
        });`;
content = content.replace(t1, r1);

const t2 = `      setTemplates(prev => [finalTemplate, ...prev]);
      setSelectedTemplateId(tempId);
      setIsUploading(false);`;
const r2 = `      setTemplates(prev => [finalTemplate, ...prev]);
      setSelectedTemplateId(tempId);
      setIsUploading(false);
      setTicketModal({
        isOpen: true,
        title: "¡Plantilla Creada!",
        message: "La plantilla se ha generado exitosamente.",
        ticketId: finalTemplate.id,
        customFields: [
          { label: "Nombre", value: finalTemplate.title }
        ]
      });`;
content = content.replace(t2, r2);

fs.writeFileSync('src/App.jsx', content);
