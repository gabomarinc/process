import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  RefreshCw, 
  Folder, 
  FileText, 
  FileSpreadsheet, 
  FileCheck, 
  File, 
  Image as ImageIcon, 
  Check, 
  ChevronRight, 
  ExternalLink, 
  Link2, 
  ArrowLeft,
  HardDrive
} from 'lucide-react';
import './GoogleDrivePickerModal.css';

// SVG Official Google Drive Tri-color Icon
const GoogleDriveLogo = () => (
  <svg width="24" height="24" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 53h-32.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.9c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.25 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
);

const getDriveFileIcon = (file) => {
  const mime = file.mimeType || '';
  const name = (file.name || '').toLowerCase();

  if (file.isFolder || mime.includes('folder')) {
    return <Folder size={32} color="#F59E0B" fill="#FEF3C7" />;
  }
  if (mime.includes('spreadsheet') || mime.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
    return <FileSpreadsheet size={30} color="#10B981" />;
  }
  if (mime.includes('document') || mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) {
    return <FileText size={30} color="#2563EB" />;
  }
  if (mime.includes('presentation') || name.endsWith('.pptx')) {
    return <FileText size={30} color="#F97316" />;
  }
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return <FileCheck size={30} color="#EF4444" />;
  }
  if (mime.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg)$/.test(name)) {
    return <ImageIcon size={30} color="#8B5CF6" />;
  }
  return <File size={30} color="#64748B" />;
};

export default function GoogleDrivePickerModal({
  isOpen,
  onClose,
  onSelect,
  initialFolderId = null,
  initialFolderName = 'Mi Unidad',
  allowFolders = false, // If true, folder itself can be selected
  title = 'Seleccionar desde Google Drive',
  confirmButtonText = 'Añadir seleccionado'
}) {
  const [activeTab, setActiveTab] = useState('drive'); // 'drive' | 'link'
  const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);
  const [folderHistory, setFolderHistory] = useState([
    { id: initialFolderId || '', name: initialFolderName || 'Mi Unidad' }
  ]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [manualLinkInput, setManualLinkInput] = useState('');
  const [manualLinkName, setManualLinkName] = useState('');

  // Synchronize when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentFolderId(initialFolderId);
      setFolderHistory([{ id: initialFolderId || '', name: initialFolderName || 'Mi Unidad' }]);
      setSelectedItem(null);
      setSearchQuery('');
      setManualLinkInput('');
      fetchFiles(initialFolderId);
    }
  }, [isOpen, initialFolderId, initialFolderName]);

  const fetchFiles = async (folderId = currentFolderId, query = searchQuery) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (folderId) params.append('folderId', folderId);
      if (query && query.trim()) params.append('q', query.trim());
      params.append('pageSize', '70');

      const res = await fetch(`/api/integrations/google-drive/files?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al obtener archivos de Google Drive');
      }
      const data = await res.json();
      if (data.oauthActive === false && (!data.files || data.files.length === 0)) {
        setActiveTab('link');
      }
      // Normalize items
      const normalized = (data.files || []).map(f => ({
        ...f,
        isFolder: f.mimeType === 'application/vnd.google-apps.folder' || f.isFolder
      }));
      setFiles(normalized);
    } catch (err) {
      console.warn('Google Drive fetch error:', err);
      setErrorMsg(err.message || 'No se pudieron cargar los archivos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFolder = (folder) => {
    setSelectedItem(null);
    setCurrentFolderId(folder.id);
    setFolderHistory(prev => [...prev, { id: folder.id, name: folder.name }]);
    fetchFiles(folder.id, searchQuery);
  };

  const handleNavigateBreadcrumb = (index) => {
    const target = folderHistory[index];
    const newHistory = folderHistory.slice(0, index + 1);
    setFolderHistory(newHistory);
    setCurrentFolderId(target.id);
    setSelectedItem(null);
    fetchFiles(target.id, searchQuery);
  };

  const handleGoBack = () => {
    if (folderHistory.length <= 1) return;
    const newHistory = folderHistory.slice(0, -1);
    const parent = newHistory[newHistory.length - 1];
    setFolderHistory(newHistory);
    setCurrentFolderId(parent.id);
    setSelectedItem(null);
    fetchFiles(parent.id, searchQuery);
  };

  const handleCardClick = (item) => {
    if (item.isFolder) {
      if (allowFolders && selectedItem?.id === item.id) {
        // If clicking already selected folder, navigate into it
        handleOpenFolder(item);
      } else if (!allowFolders) {
        // Directly navigate into folders when folders aren't selectable
        handleOpenFolder(item);
      } else {
        setSelectedItem(item);
      }
    } else {
      setSelectedItem(selectedItem?.id === item.id ? null : item);
    }
  };

  const handleConfirmSelection = () => {
    if (activeTab === 'link') {
      const cleanUrl = manualLinkInput.trim();
      if (!cleanUrl) return;
      const resolvedName = manualLinkName.trim() || (cleanUrl.includes('docs.google.com') ? 'Documento de Google Drive' : 'Enlace de Google Drive');
      onSelect({
        id: cleanUrl,
        name: resolvedName,
        webViewLink: cleanUrl,
        url: cleanUrl,
        mimeType: 'custom_link',
        isFolder: cleanUrl.includes('/folders/')
      });
      onClose();
      return;
    }

    if (!selectedItem) return;
    onSelect({
      ...selectedItem,
      url: selectedItem.webViewLink || `https://drive.google.com/file/d/${selectedItem.id}/view`
    });
    onClose();
  };

  // Split into Folders and Files for Google Drive aesthetic
  const { folderItems, fileItems } = useMemo(() => {
    const folders = [];
    const regularFiles = [];
    files.forEach(f => {
      if (f.isFolder) folders.push(f);
      else regularFiles.push(f);
    });
    return { folderItems: folders, fileItems: regularFiles };
  }, [files]);

  if (!isOpen) return null;

  return (
    <div className="gdrive-modal-overlay" onClick={onClose}>
      <div className="gdrive-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gdrive-header">
          <div className="gdrive-brand">
            <div className="gdrive-logo-icon">
              <GoogleDriveLogo />
            </div>
            <div className="gdrive-title-wrap">
              <h3>{title}</h3>
              <p>Navega visualmente por tus carpetas o selecciona un documento de Google Drive</p>
            </div>
          </div>
          <button type="button" className="gdrive-close-btn" onClick={onClose} title="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="gdrive-nav-tabs">
          <button 
            type="button" 
            className={`gdrive-tab-item ${activeTab === 'drive' ? 'active' : ''}`}
            onClick={() => setActiveTab('drive')}
          >
            <HardDrive size={15} /> Explorador de Google Drive
          </button>
          <button 
            type="button" 
            className={`gdrive-tab-item ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            <Link2 size={15} /> Pegar Link Directo
          </button>
        </div>

        {/* Toolbar (Only for Drive explorer) */}
        {activeTab === 'drive' && (
          <div className="gdrive-toolbar">
            <div className="gdrive-breadcrumbs">
              {folderHistory.length > 1 && (
                <button
                  type="button"
                  className="gdrive-crumb-btn"
                  onClick={handleGoBack}
                  title="Subir de nivel"
                  style={{ marginRight: '4px' }}
                >
                  <ArrowLeft size={14} /> Atrás
                </button>
              )}
              {folderHistory.map((crumb, idx) => (
                <React.Fragment key={crumb.id || idx}>
                  <button
                    type="button"
                    className={`gdrive-crumb-btn ${idx === folderHistory.length - 1 ? 'active' : ''}`}
                    onClick={() => handleNavigateBreadcrumb(idx)}
                  >
                    {idx === 0 ? <Folder size={14} color="#F59E0B" /> : null}
                    <span>{crumb.name}</span>
                  </button>
                  {idx < folderHistory.length - 1 && (
                    <ChevronRight size={13} className="gdrive-crumb-separator" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="gdrive-actions-bar">
              <div className="gdrive-search-box">
                <Search size={14} className="gdrive-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar en esta carpeta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchFiles(currentFolderId, searchQuery);
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="gdrive-search-clear"
                    onClick={() => {
                      setSearchQuery('');
                      fetchFiles(currentFolderId, '');
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="gdrive-refresh-btn"
                onClick={() => fetchFiles(currentFolderId, searchQuery)}
                title="Actualizar archivos"
              >
                <RefreshCw size={14} className={isLoading ? 'gdrive-spinner' : ''} />
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="gdrive-body">
          {activeTab === 'link' ? (
            <div className="gdrive-manual-link-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <Link2 size={24} color="#2563EB" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0F172A', fontWeight: 700 }}>Vincular por Enlace Directo</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                    Pega cualquier enlace de Google Docs, Sheets, Slides o carpeta compartida de Google Drive.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Enlace de Google Drive / Docs *
                  </label>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/document/d/... o https://drive.google.com/file/d/..."
                    value={manualLinkInput}
                    onChange={(e) => setManualLinkInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Nombre descriptivo del archivo (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Contrato de Servicio Firmado.pdf"
                    value={manualLinkName}
                    onChange={(e) => setManualLinkName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="gdrive-state-container">
              <div className="gdrive-spinner"></div>
              <p>Consultando archivos en Google Drive...</p>
            </div>
          ) : errorMsg ? (
            <div className="gdrive-state-container">
              <p style={{ color: '#EF4444', fontWeight: 600 }}>{errorMsg}</p>
              <button
                type="button"
                onClick={() => fetchFiles(currentFolderId)}
                style={{
                  marginTop: '10px',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#2563EB',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Reintentar
              </button>
            </div>
          ) : files.length === 0 ? (
            <div className="gdrive-state-container">
              <Folder size={42} color="#CBD5E1" />
              <p style={{ fontWeight: 600, color: '#475569' }}>Esta carpeta está vacía</p>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                No se encontraron archivos en este directorio de Google Drive.
              </span>
            </div>
          ) : (
            <div>
              {/* Folders Section */}
              {folderItems.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div className="gdrive-section-title">
                    <Folder size={13} color="#F59E0B" /> Carpetas ({folderItems.length})
                  </div>
                  <div className="gdrive-grid">
                    {folderItems.map(folder => {
                      const isSelected = selectedItem?.id === folder.id;
                      return (
                        <div
                          key={folder.id}
                          className={`gdrive-card gdrive-card-folder ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleCardClick(folder)}
                          onDoubleClick={() => handleOpenFolder(folder)}
                          title={`${folder.name} (Doble clic para abrir)`}
                        >
                          {isSelected && (
                            <div className="gdrive-card-check">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                          <div className="gdrive-card-icon-wrap">
                            <Folder size={32} color="#F59E0B" fill="#FEF3C7" />
                          </div>
                          <div className="gdrive-card-name">{folder.name}</div>
                          <div className="gdrive-card-meta">Carpeta</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files Section */}
              {fileItems.length > 0 && (
                <div>
                  <div className="gdrive-section-title">
                    <File size={13} color="#2563EB" /> Archivos ({fileItems.length})
                  </div>
                  <div className="gdrive-grid">
                    {fileItems.map(file => {
                      const isSelected = selectedItem?.id === file.id;
                      return (
                        <div
                          key={file.id}
                          className={`gdrive-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleCardClick(file)}
                          onDoubleClick={() => {
                            setSelectedItem(file);
                            handleConfirmSelection();
                          }}
                          title={`${file.name}\n(Doble clic para seleccionar rápido)`}
                        >
                          {isSelected && (
                            <div className="gdrive-card-check">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                          <div className="gdrive-card-icon-wrap">
                            {getDriveFileIcon(file)}
                          </div>
                          <div className="gdrive-card-name">{file.name}</div>
                          <div className="gdrive-card-meta">
                            {file.mimeType?.split('.').pop()?.toUpperCase() || 'Archivo'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Selected file info and Bottom-Right Action Button */}
        <div className="gdrive-footer">
          <div className="gdrive-footer-selected-info">
            {activeTab === 'link' ? (
              manualLinkInput.trim() ? (
                <span className="gdrive-selection-badge">
                  <Link2 size={12} /> Enlace ingresado
                </span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Pega el link de Google Drive</span>
              )
            ) : selectedItem ? (
              <span className="gdrive-selection-badge">
                <Check size={12} /> Seleccionado: <strong style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedItem.name}</strong>
              </span>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Selecciona un archivo haciendo clic sobre su tarjeta
              </span>
            )}
          </div>

          <div className="gdrive-footer-actions">
            <button type="button" className="gdrive-cancel-btn" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="gdrive-submit-btn"
              disabled={activeTab === 'link' ? !manualLinkInput.trim() : !selectedItem}
              onClick={handleConfirmSelection}
            >
              <Check size={15} />
              {confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
