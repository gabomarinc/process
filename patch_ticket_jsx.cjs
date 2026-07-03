const fs = require('fs');
let content = fs.readFileSync('src/components/ui/SuccessTicketModal.jsx', 'utf8');

// Replace "ID Ticket" label
content = content.replace(
  '<p style={{ fontSize: \'0.75rem\', color: \'var(--text-muted)\', textTransform: \'uppercase\', marginBottom: \'0.25rem\' }}>ID Ticket</p>',
  '<p style={{ fontSize: \'0.75rem\', color: \'var(--text-muted)\', textTransform: \'uppercase\', marginBottom: \'0.25rem\' }}>Acción</p>'
);

// Replace Barcode component entirely with Konsul Logo
// First, remove Barcode component definition from the file to clean up
const barcodeDefStart = content.indexOf('const Barcode = ({ value }) => {');
const barcodeDefEnd = content.indexOf('};', content.indexOf('return (', barcodeDefStart)) + 2;
if (barcodeDefStart > -1 && barcodeDefEnd > -1) {
  content = content.substring(0, barcodeDefStart) + content.substring(barcodeDefEnd);
}

// Then replace the usage
content = content.replace(
  /<Barcode value=\{ticketId \|\| `TKT-\$\{Math\.floor\(Math\.random\(\)\*10000\)\}`\} \/>/,
  '<div style={{ display: \'flex\', justifyContent: \'center\', padding: \'1rem 0 0.5rem\' }}><img src="https://konsul.digital/images/Konsul%20logo%20general.png" alt="Kônsul Logo" style={{ height: \'28px\', objectFit: \'contain\' }} /></div>'
);

fs.writeFileSync('src/components/ui/SuccessTicketModal.jsx', content);
