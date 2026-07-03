const fs = require('fs');

let app = fs.readFileSync('src/App.jsx', 'utf8');

// Add Audio/Wizard functions before generateTemplate
const audioFunctions = `
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        handleAudioSubmit(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      showAlert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleAudioSubmit = (audioBlob) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1];
      generateTemplate("Audio grabado por el usuario", "Proceso por Audio", {
        inlineData: {
          mimeType: "audio/webm",
          data: base64data
        }
      });
    };
  };

  const handleSavePreview = async (templateData) => {
    try {
      setPreviewTemplate(null);
      setTemplates(prev => [templateData, ...prev]);
      setSelectedTemplateId(templateData.id);
      
      setTicketModal({
        isOpen: true,
        title: "¡Plantilla Creada!",
        message: "La plantilla se ha guardado exitosamente.",
        ticketId: "Nueva Plantilla",
        customFields: [
          { label: "Nombre", value: templateData.title }
        ]
      });
      setActiveTab('templates');

      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
    } catch (err) {
      console.error("Error saving template", err);
    }
  };

  const generateTemplate = async (textSource, titleSuggestion = "Nuevo Proceso", audioData = null) => {`;

app = app.replace('const generateTemplate = async (textSource, titleSuggestion = "Nuevo Proceso") => {', audioFunctions);

// Update generateTemplate body to handle audioData
const originalContents = `contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]`;

const newContents = `contents: [
            {
              parts: [
                {
                  text: prompt
                },
                ...(audioData ? [audioData] : [])
              ]
            }
          ]`;

app = app.replace(originalContents, newContents);

// Replace saving logic inside generateTemplate
const saveLogic = `setTemplates(prev => [finalTemplate, ...prev]);
      setSelectedTemplateId(tempId);
      setIsUploading(false);
      setTicketModal({
        isOpen: true,
        title: "¡Plantilla Creada!",
        message: "La plantilla se ha generado exitosamente.",
        ticketId: "Nueva Plantilla",
        customFields: [
          { label: "Nombre", value: finalTemplate.title }
        ]
      });
      setManualText('');
      setActiveTab('templates');

      // Save to Neon DB
      try {
        await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalTemplate)
        });
      } catch (err) {
        console.error("Error al guardar plantilla generada en Neon:", err);
      }`;

const newSaveLogic = `setPreviewTemplate(finalTemplate);
      setIsUploading(false);
      setUploadStatusMsg("");
      setManualText('');`;

app = app.replace(saveLogic, newSaveLogic);

// Replace fallback mock saving logic
const mockSaveLogic = `setTemplates(prev => [newTemp, ...prev]);
        setSelectedTemplateId(newTemp.id);
        setIsUploading(false);
        setTicketModal({
          isOpen: true,
          title: "¡Plantilla Creada!",
          message: "La plantilla se ha generado exitosamente.",
          ticketId: "Nueva Plantilla",
          customFields: [
            { label: "Nombre", value: newTemp.title }
          ]
        });
        setManualText('');
        setActiveTab('templates');

        // Save to Database
        fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTemp)
        }).catch(err => console.error("Error al guardar plantilla simulada en Neon:", err));`;

const mockNewSaveLogic = `setPreviewTemplate(newTemp);
        setIsUploading(false);
        setUploadStatusMsg("");
        setManualText('');`;

app = app.replace(mockSaveLogic, mockNewSaveLogic);

// Replace UI form with buttons
const formUI = `<form onSubmit={handleManualSubmit}>
                <textarea 
                  className="textarea-input"
                  placeholder="Ejemplo: Proceso de Onboarding. Día 1: Kickoff inicial. Día 2: Subir identificación (digital). Día 3: Firma de contrato de confidencialidad."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  disabled={isUploading}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={isUploading || !manualText.trim()}
                >
                  <Sparkles size={16} />
                  {apiKey ? "Generar Plantilla con Gemini" : "Generar Plantilla Simulada"}
                </button>
              </form>`;

const buttonsUI = `<div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  className={\`btn \${isRecording ? 'btn-danger' : 'btn-primary'}\`} 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isUploading || !apiKey}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '1rem', position: 'relative' }}
                >
                  {isRecording && <span className="recording-pulse" style={{ position: 'absolute', right: '15px', width: '10px', height: '10px', background: 'white', borderRadius: '50%', animation: 'pulse 1s infinite' }} />}
                  <Mic size={18} />
                  {isRecording ? "Detener Grabación" : "Dictar por Audio"}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setIsWizardOpen(true)}
                  disabled={isUploading || !apiKey}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '1rem' }}
                >
                  <Sparkles size={18} /> Asistente Paso a Paso
                </button>
              </div>`;

app = app.replace(formUI, buttonsUI);

// Modals
const appEnd = `      <SuccessTicketModal
        isOpen={ticketModal.isOpen}
        onClose={() => setTicketModal({ ...ticketModal, isOpen: false })}
        title={ticketModal.title}
        message={ticketModal.message}
        ticketId={ticketModal.ticketId}
        customFields={ticketModal.customFields}
      />
    </div>
  );
}`;

const appEndModals = `      <SuccessTicketModal
        isOpen={ticketModal.isOpen}
        onClose={() => setTicketModal({ ...ticketModal, isOpen: false })}
        title={ticketModal.title}
        message={ticketModal.message}
        ticketId={ticketModal.ticketId}
        customFields={ticketModal.customFields}
      />

      <TemplateWizardModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)}
        onSubmit={(prompt, title) => {
          setIsWizardOpen(false);
          generateTemplate(prompt, title);
        }}
      />

      <TemplatePreviewModal 
        isOpen={!!previewTemplate}
        initialTemplate={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onSave={handleSavePreview}
      />
    </div>
  );
}`;

app = app.replace(appEnd, appEndModals);

fs.writeFileSync('src/App.jsx', app);
console.log('App.jsx patched perfectly.');
