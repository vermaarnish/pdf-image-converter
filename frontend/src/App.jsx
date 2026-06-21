import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('pdfToImg'); // 'pdfToImg' or 'imgToPdf'
  const [pdfFile, setPdfFile] = useState(null);
  const [imgFiles, setImgFiles] = useState([]);
  const [imgPreviews, setImgPreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Conversion state
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadBlob, setDownloadBlob] = useState(null);
  const [downloadFilename, setDownloadFilename] = useState('');
  const [convertedImages, setConvertedImages] = useState([]);

  const fileInputRef = useRef(null);

  // Generate and cleanup Image Previews
  useEffect(() => {
    // Revoke old previews to prevent memory leaks
    imgPreviews.forEach(url => URL.revokeObjectURL(url));
    
    if (imgFiles.length === 0) {
      setImgPreviews([]);
      return;
    }

    const newPreviews = imgFiles.map(file => URL.createObjectURL(file));
    setImgPreviews(newPreviews);

    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imgFiles]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (incomingFiles) => {
    // Reset status on new file add
    setStatus('idle');
    setStatusMessage('');
    setDownloadBlob(null);

    if (activeTab === 'pdfToImg') {
      const pdf = incomingFiles.find(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
      if (pdf) {
        setPdfFile(pdf);
      } else {
        setStatus('error');
        setStatusMessage('Please select a valid PDF file.');
      }
    } else {
      // Filter images
      const images = incomingFiles.filter(f => 
        f.type.startsWith('image/jpeg') || 
        f.type.startsWith('image/png') || 
        f.name.endsWith('.jpg') || 
        f.name.endsWith('.jpeg') || 
        f.name.endsWith('.png')
      );
      
      if (images.length > 0) {
        setImgFiles(prev => [...prev, ...images]);
      } else {
        setStatus('error');
        setStatusMessage('Please select JPEG, JPG, or PNG images.');
      }
    }
  };

  const removePdfFile = () => {
    setPdfFile(null);
    setStatus('idle');
    setStatusMessage('');
    setDownloadBlob(null);
    setConvertedImages([]);
  };

  const removeImgFile = (index) => {
    setImgFiles(prev => prev.filter((_, i) => i !== index));
    setStatus('idle');
    setStatusMessage('');
    setDownloadBlob(null);
  };

  const clearAll = () => {
    setPdfFile(null);
    setImgFiles([]);
    setStatus('idle');
    setStatusMessage('');
    setDownloadBlob(null);
    setConvertedImages([]);
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleDownloadSingle = (base64, pageNumber) => {
    const a = document.createElement('a');
    a.href = base64;
    a.download = `${pdfFile.name.replace(/\.pdf$/i, '')}_page_${pageNumber}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConvert = async () => {
    setStatus('loading');
    setStatusMessage('Converting your files... Please wait.');
    setDownloadBlob(null);
    setConvertedImages([]);

    try {
      if (activeTab === 'pdfToImg') {
        if (!pdfFile) return;

        const formData = new FormData();
        formData.append('file', pdfFile);

        // Fetch the base64 page images for UI preview and direct downloads
        const response = await fetch('/api/convert/pdf-to-images-base64', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Server returned error: ${response.statusText}`);
        }

        const images = await response.json();
        setConvertedImages(images);

        if (images.length === 1) {
          // If exactly 1 page, configure the primary download button for direct image download
          const res = await fetch(images[0]);
          const blob = await res.blob();
          setDownloadBlob(blob);
          setDownloadFilename(`${pdfFile.name.replace(/\.pdf$/i, '')}.jpg`);
          setStatusMessage('Your PDF has been converted successfully! Click below to download your image.');
        } else {
          // If multiple pages, fetch the ZIP in the background for the primary "Download All (ZIP)" button
          try {
            const zipResponse = await fetch('/api/convert/pdf-to-jpeg', {
              method: 'POST',
              body: formData,
            });
            if (zipResponse.ok) {
              const zipBlob = await zipResponse.ok ? await zipResponse.blob() : null;
              if (zipBlob) {
                setDownloadBlob(zipBlob);
                setDownloadFilename(`${pdfFile.name.replace(/\.pdf$/i, '')}_images.zip`);
              }
            }
          } catch (zipErr) {
            console.error("ZIP packaging error", zipErr);
          }
          setStatusMessage(`Your PDF has been converted to ${images.length} page images! You can download them individually below or grab the full ZIP archive.`);
        }
        setStatus('success');
      } else {
        if (imgFiles.length === 0) return;

        const formData = new FormData();
        imgFiles.forEach(file => {
          formData.append('files', file);
        });

        const response = await fetch('/api/convert/jpeg-to-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Server returned error: ${response.statusText}`);
        }

        const blob = await response.blob();
        setDownloadBlob(blob);
        setDownloadFilename('converted_images.pdf');
        setStatus('success');
        setStatusMessage('Your images have been converted into a single PDF! Click below to download.');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setStatusMessage(err.message || 'An unexpected error occurred during conversion.');
    }
  };

  const handleDownload = () => {
    if (!downloadBlob) return;
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="app-container">
      {/* SVGs definitions for Gradients */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      <header>
        <div className="logo-container">
          <svg className="logo-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3M3 12a48.291 48.291 0 01.138-3.662M3 12l3 3m-3-3l-3 3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17h6M9 13h6" />
          </svg>
          <h1>ConvertPDF</h1>
        </div>
        <p className="subtitle">Convert PDF documents to JPEGs, and bundle your images into standard PDFs in seconds.</p>
      </header>

      {/* Navigation Tab buttons */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'pdfToImg' ? 'active' : ''}`}
          onClick={() => { setActiveTab('pdfToImg'); clearAll(); }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          PDF to Image
        </button>
        <button 
          className={`tab-btn ${activeTab === 'imgToPdf' ? 'active' : ''}`}
          onClick={() => { setActiveTab('imgToPdf'); clearAll(); }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          Image to PDF
        </button>
      </div>

      {/* Core card workspace */}
      <main className="converter-card">
        {/* Upload dragzone */}
        <div 
          className={`dropzone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            multiple={activeTab === 'imgToPdf'} 
            accept={activeTab === 'pdfToImg' ? '.pdf' : '.jpg,.jpeg,.png'}
            onChange={handleFileChange}
          />
          
          <svg className="dropzone-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
          
          <div className="dropzone-text">
            <h3>Drag & drop your {activeTab === 'pdfToImg' ? 'PDF file' : 'images'} here</h3>
            <p>or click to browse your computer</p>
          </div>
          
          <span className="file-type-hint">
            {activeTab === 'pdfToImg' ? 'Supports: PDF (Max 50MB)' : 'Supports: JPG, JPEG, PNG (Max 50MB)'}
          </span>
        </div>

        {/* Selected files details */}
        {activeTab === 'pdfToImg' && pdfFile && (
          <div className="file-list">
            <div className="file-list-header">
              <span>Selected Document</span>
              <button className="clear-btn" onClick={removePdfFile}>Clear</button>
            </div>
            <div className="files-grid">
              <div className="file-item">
                <div className="file-info">
                  <svg className="file-item-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div>
                    <div className="file-name">{pdfFile.name}</div>
                    <div className="file-size">{formatSize(pdfFile.size)}</div>
                  </div>
                </div>
                <button className="remove-file-btn" onClick={removePdfFile}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'imgToPdf' && imgFiles.length > 0 && (
          <div className="file-list">
            <div className="file-list-header">
              <span>Selected Images ({imgFiles.length})</span>
              <button className="clear-btn" onClick={clearAll}>Clear All</button>
            </div>
            <div className="files-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
              {imgFiles.map((file, idx) => (
                <div key={idx} className="file-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '8px', position: 'relative' }}>
                  <button 
                    className="remove-file-btn" 
                    onClick={() => removeImgFile(idx)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '4px', color: '#fff', zIndex: 5 }}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {imgPreviews[idx] ? (
                    <img 
                      src={imgPreviews[idx]} 
                      alt={`Preview ${idx + 1}`} 
                      style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '4px', background: '#1c1f36' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1f36', borderRadius: '4px' }}>
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {file.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action button & Status Cards */}
        <div className="action-section">
          {status === 'idle' && (
            <button 
              className="primary-btn" 
              onClick={handleConvert}
              disabled={activeTab === 'pdfToImg' ? !pdfFile : imgFiles.length === 0}
            >
              <span>Convert files</span>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}

          {status === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div className="loader"></div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{statusMessage}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="status-card success">
              <div className="status-header success">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Conversion Complete!</span>
              </div>
              <p className="status-desc">{statusMessage}</p>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button className="primary-btn" onClick={handleDownload} style={{ padding: '12px 30px', fontSize: '0.95rem' }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download File
                </button>
                <button className="btn-secondary" onClick={clearAll}>
                  Convert another
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="status-card error">
              <div className="status-header error">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>Error Occurred</span>
              </div>
              <p className="status-desc">{statusMessage}</p>
              <button className="btn-secondary" onClick={() => setStatus('idle')} style={{ marginTop: '8px' }}>
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Converted PDF Page Images Grid */}
        {activeTab === 'pdfToImg' && convertedImages.length > 0 && (
          <div className="converted-images-section">
            <div className="file-list-header">
              <span>Converted Page Images ({convertedImages.length})</span>
            </div>
            <div className="converted-grid">
              {convertedImages.map((base64, idx) => (
                <div key={idx} className="converted-item">
                  <img src={base64} alt={`Page ${idx + 1}`} />
                  <div className="converted-item-overlay">
                    <button className="download-item-btn" onClick={() => handleDownloadSingle(base64, idx + 1)}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download Page
                    </button>
                  </div>
                  <div className="converted-item-footer">
                    Page {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Feature explanations */}
      <section className="features-grid">
        <div className="feature-item">
          <div className="feature-icon-wrapper">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3>Local & Secure</h3>
          <p>Your files are processed directly on your server, ensuring privacy and data security. No third parties.</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon-wrapper">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h3>High Quality</h3>
          <p>Images are generated at 150 DPI for crisp reading, and images compiled to PDF are rendered in native dimensions.</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon-wrapper">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3M3 12a48.291 48.291 0 01.138-3.662M3 12l3 3m-3-3l-3 3" />
            </svg>
          </div>
          <h3>Bidirectional</h3>
          <p>Easily switch between converting single PDFs into high-quality JPEG series and compiling images into clean PDFs.</p>
        </div>
      </section>

      <footer>
        <p>&copy; {new Date().getFullYear()} ConvertPDF. High performance, zero hassle file conversion.</p>
      </footer>
    </div>
  );
}
