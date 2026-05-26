'use client';

import { useState, useEffect } from 'react';
import { Link as LinkIcon, Copy, Trash2, CheckCircle2, AlertCircle, Eye, History, X } from 'lucide-react';

interface UrlMapping {
  shortId: string;
  longUrl: string;
  clicks: number;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = 'briefly_urls_db';
const ITEMS_PER_PAGE = 10;

export default function Home() {
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState<UrlMapping[]>([]);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<UrlMapping | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
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
      const parsedUrl = new URL(targetUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        setError('URL must use http:// or https:// protocol.');
        return;
      }

      const hostname = parsedUrl.hostname;
      const hasDot = hostname.includes('.');
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      const tld = hasDot ? hostname.split('.').pop() : '';
      const hasValidTld = tld && tld.length >= 2 && /^[a-z]{2,}$/i.test(tld);

      if (!isLocalhost && (!hasDot || !hasValidTld)) {
        setError('Please enter a valid URL with a valid domain extension (e.g. .com, .org).');
        return;
      }

      // Prevent shortening URLs that belong to this service
      if (baseUrl && targetUrl.startsWith(baseUrl)) {
        setError('You cannot shorten a URL from this service.');
        return;
      }
    } catch {
      setError('Please enter a valid URL.');
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
      <div className="layout-centered">
        {/* Shortener Panel */}
        <div className="glass-panel main-panel" style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsHistoryOpen(true)} 
            className="history-trigger-btn"
            title="View History"
            type="button"
          >
            <History size={20} />
          </button>

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
      </div>

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="modal-overlay" onClick={() => setIsHistoryOpen(false)}>
          <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <History size={22} style={{ color: '#60a5fa', marginRight: '0.5rem' }} />
                Recent Links History
              </h2>
              <button className="close-btn" onClick={() => setIsHistoryOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="history-grid">
              {paginatedUrls.length === 0 ? (
                <div className="empty-state">
                  <p>No links yet. Create your first one!</p>
                </div>
              ) : (
                paginatedUrls.map((u) => {
                  const fullShortUrl = `${baseUrl}#${u.shortId}`;
                  return (
                    <div className="history-card" key={u.shortId}>
                      <div className="history-card-header">
                        <div className="history-clicks" title="Total clicks">
                          <span className="clicks-val">{u.clicks}</span>
                          <span className="clicks-lbl">clicks</span>
                        </div>
                      </div>
                      <div className="history-card-body">
                        <div className="history-long-url" title={u.longUrl}>
                          {u.longUrl}
                        </div>
                        <a href={fullShortUrl} target="_blank" rel="noopener noreferrer" className="history-short-url">
                          #{u.shortId}
                        </a>
                      </div>
                      <div className="history-card-actions">
                        <button className="action-btn" onClick={() => handleCopy(u.shortId)} title="Copy URL">
                          <Copy size={14} />
                        </button>
                        <button className="action-btn" onClick={() => setPreviewUrl(u)} title="View Details">
                          <Eye size={14} />
                        </button>
                        <button className="action-btn delete-btn" onClick={() => handleDelete(u.shortId)} title="Delete URL">
                          <Trash2 size={14} />
                        </button>
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
      )}

      {/* Modal for full URL preview */}
      {previewUrl && (
        <div className="modal-overlay" onClick={() => setPreviewUrl(null)}>
          <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()}>
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
