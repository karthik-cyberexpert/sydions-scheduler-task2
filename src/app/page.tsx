'use client';

import { useState, useEffect } from 'react';
import { Link as LinkIcon, Copy, Trash2, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

interface UrlMapping {
  shortId: string;
  longUrl: string;
  clicks: number;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = 'briefly_urls_db';
const ITEMS_PER_PAGE = 3;

export default function Home() {
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState<UrlMapping[]>([]);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<UrlMapping | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Helper to load database
  const getDB = (): Record<string, UrlMapping> => {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  };

  // Helper to save database
  const saveDB = (db: Record<string, UrlMapping>) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  };

  // Fetch URLs from localStorage
  const loadUrls = () => {
    const db = getDB();
    const sorted = Object.values(db).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setUrls(sorted);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setBaseUrl(window.location.origin + window.location.pathname);

    // Check for redirection via hash
    const hash = window.location.hash.substring(1);
    if (hash && hash.length === 6) {
      const db = getDB();
      if (db[hash]) {
        setRedirecting(true);
        // Increment click
        db[hash].clicks += 1;
        saveDB(db);

        // Redirect after 1 second
        setTimeout(() => {
          window.location.href = db[hash].longUrl;
        }, 1000);
        return;
      } else {
        alert('Short URL not found.');
        window.location.hash = '';
      }
    }

    loadUrls();
  }, []);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleShorten = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError('');

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      new URL(targetUrl);
    } catch {
      setError('Please enter a valid URL (including http:// or https://)');
      return;
    }

    const db = getDB();

    // Check if URL already shortened to avoid duplicate IDs
    const existingId = Object.keys(db).find((key) => db[key].longUrl === targetUrl);

    if (existingId) {
      setUrl('');
      triggerToast('URL already shortened!');
      return;
    }

    // Generate unique 6-character code
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let shortId = '';
    for (let i = 0; i < 6; i++) {
      shortId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    db[shortId] = {
      shortId,
      longUrl: targetUrl,
      clicks: 0,
      createdAt: new Date().toISOString(),
    };

    saveDB(db);
    setUrl('');
    loadUrls();
    setCurrentPage(1); // Jump to first page to see the new item
    triggerToast('URL Shortened successfully!');
  };

  const handleCopy = (shortId: string) => {
    const fullUrl = `${baseUrl}#${shortId}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      triggerToast('Copied to clipboard!');
    }).catch(() => {
      triggerToast('Failed to copy!');
    });
  };

  const handleDelete = (shortId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    const db = getDB();
    delete db[shortId];
    saveDB(db);
    
    // Adjust current page if we delete the last item on the active page
    const updatedUrls = urls.filter(u => u.shortId !== shortId);
    const newTotalPages = Math.ceil(updatedUrls.length / ITEMS_PER_PAGE);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
    
    loadUrls();
    triggerToast('URL deleted successfully!');
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(urls.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUrls = urls.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Generate page numbers range: e.g., 1, ..., 4, 5, ..., 10
  const getPaginationRange = () => {
    const range: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        range.push('...');
      }
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      if (end < totalPages - 1) {
        range.push('...');
      }
      
      range.push(totalPages);
    }
    return range;
  };

  if (redirecting) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, width: '100%', height: '100%',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
      }}>
        <div style={{
          border: '4px solid rgba(255,255,255,0.1)',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite',
          marginBottom: '1.5rem',
        }}></div>
        <h2 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Redirecting...</h2>
        <p style={{ color: '#94a3b8', margin: 0 }}>Taking you to your destination</p>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="layout-grid">
        {/* Left Side: Shortener Panel */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <LinkIcon size={32} style={{ color: '#60a5fa' }} />
            <h1 style={{ margin: 0, fontSize: '2.25rem', textAlign: 'left' }}>Briefly</h1>
          </div>
          <p className="subtitle" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            Shorten your links. Track your clicks. Beautifully simple.
          </p>

          <form onSubmit={handleShorten}>
            <div className="input-group">
              <input
                type="url"
                placeholder="Paste your long URL here (https://...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                autoComplete="off"
              />
              <button type="submit" className="primary-btn">
                Shorten Link
              </button>
            </div>
            {error && (
              <div className="error-msg">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Right Side: Recent Links */}
        <div className="glass-panel" style={{ padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
          <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', fontWeight: 600 }}>
            Recent Links
          </h2>
          <div className="url-list" style={{ flex: 1 }}>
            {paginatedUrls.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '3rem 0', fontSize: '0.9rem' }}>
                No links yet. Create your first one on the left!
              </p>
            ) : (
              paginatedUrls.map((u) => {
                const fullShortUrl = `${baseUrl}#${u.shortId}`;
                return (
                  <div className="url-item" key={u.shortId}>
                    <div className="url-details" title={`Short: ${fullShortUrl}\nLong: ${u.longUrl}`}>
                      <div className="long-url">
                        {u.longUrl}
                      </div>
                      <a href={fullShortUrl} target="_blank" rel="noopener noreferrer" className="short-url">
                        {baseUrl.replace(/^https?:\/\//i, '')}#<span style={{ color: 'white' }}>{u.shortId}</span>
                      </a>
                    </div>
                    <div className="url-actions">
                      <div className="click-count" title="Total clicks">
                        <span>{u.clicks}</span>
                        <label>Clicks</label>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="action-btn" onClick={() => handleCopy(u.shortId)} title="Copy URL">
                          <Copy size={16} />
                        </button>
                        <button className="action-btn" onClick={() => setPreviewUrl(u)} title="View full details">
                          <Eye size={16} />
                        </button>
                        <button className="action-btn delete-btn" onClick={() => handleDelete(u.shortId)} title="Delete URL">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Component */}
          {urls.length > 0 && (
            <div className="pagination">
              {getPaginationRange().map((page, idx) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="page-ellipsis">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={`page-${page}`}
                    className={`page-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page as number)}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal for full URL preview */}
      {previewUrl && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }} onClick={() => setPreviewUrl(null)}>
          <div style={{
            background: '#1e293b',
            border: '1px solid var(--border-color)',
            borderRadius: '1rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '550px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1.25rem', color: 'white', fontWeight: 600 }}>Link Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Shortened Link</label>
                <a href={`${baseUrl}#${previewUrl.shortId}`} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', wordBreak: 'break-all', fontSize: '1rem', textDecoration: 'none', fontWeight: 600 }}>
                  {baseUrl}#{previewUrl.shortId}
                </a>
              </div>
              
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Destination URL</label>
                <div style={{ color: 'white', wordBreak: 'break-all', fontSize: '0.95rem', background: 'rgba(15,23,42,0.3)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {previewUrl.longUrl}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '2rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Total Clicks</label>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#c084fc' }}>{previewUrl.clicks}</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Created At</label>
                  <span style={{ fontSize: '0.95rem', color: 'white' }}>{new Date(previewUrl.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="primary-btn" style={{ width: 'auto', padding: '0.6rem 1.5rem', background: 'rgba(255,255,255,0.08)', color: 'white' }} onClick={() => setPreviewUrl(null)}>
                Close
              </button>
              <button className="primary-btn" style={{ width: 'auto', padding: '0.6rem 1.5rem' }} onClick={() => { handleCopy(previewUrl.shortId); setPreviewUrl(null); }}>
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${showToast ? 'show' : ''}`}>
        <CheckCircle2 size={18} />
        {toastMessage}
      </div>
    </div>
  );
}
