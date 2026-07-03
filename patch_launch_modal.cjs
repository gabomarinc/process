const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Add import
const importStr = "import { LaunchExecutionModal } from './components/ui/LaunchExecutionModal';";
if (!content.includes('LaunchExecutionModal')) {
  content = content.replace("import './App.css';", "import './App.css';\n" + importStr);
}

// Refactor handleLaunchInstance
const oldLaunchHandler = `  // Launch a new instance from selected template
  const handleLaunchInstance = async (e) => {
    e.preventDefault();
    // Resolve which template to use: prefer the currently open detail modal, else the modal picker
    const templateToUse = activeTemplate || templates.find(t => t.id === launchTemplateId);
    if (!templateToUse || !launchInstanceName.trim()) return;

    const startDateTime = new Date(launchStartDate).getTime();`;

const newLaunchHandler = `  // Launch a new instance from selected template
  const handleLaunchInstance = async (data) => {
    let templateToUse;
    let startDateTime;
    let instanceName;

    // Support both old event-based call and new data object call
    if (data && data.preventDefault) {
      data.preventDefault();
      templateToUse = activeTemplate || templates.find(t => t.id === launchTemplateId);
      if (!templateToUse || !launchInstanceName.trim()) return;
      startDateTime = new Date(launchStartDate).getTime();
      instanceName = launchInstanceName;
    } else {
      templateToUse = templates.find(t => t.id === data.templateId);
      if (!templateToUse || !data.instanceName.trim()) return;
      startDateTime = data.startDate.getTime();
      instanceName = data.instanceName;
    }
`;

content = content.replace(oldLaunchHandler, newLaunchHandler);

// Change instanceName in the object creation
content = content.replace(
  "      instanceName: launchInstanceName,",
  "      instanceName: instanceName,"
);
content = content.replace(
  "      startedAt: new Date(launchStartDate).toISOString(),",
  "      startedAt: new Date(startDateTime).toISOString(),"
);

// Replace the JSX block for showLaunchModal
// We need to find the entire block `{showLaunchModal && ( ... )}`
const regexJSX = /\{\/\* Start Execution Modal \*\/\}\s*\{showLaunchModal && \([\s\S]*?\}\s*\)\}/;

const newJSX = `{/* Start Execution Modal */}
      {showLaunchModal && (
        <LaunchExecutionModal
          templates={templates}
          teamMembers={teamMembers}
          initialTemplateId={activeTemplate?.id || launchTemplateId}
          onSchedule={(data) => handleLaunchInstance(data)}
          onCancel={() => { setShowLaunchModal(false); setLaunchModalStep(1); }}
        />
      )}`;

content = content.replace(regexJSX, newJSX);

fs.writeFileSync('src/App.jsx', content);
console.log('App patched with LaunchExecutionModal');
