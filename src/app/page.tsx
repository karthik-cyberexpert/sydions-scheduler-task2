'use client';

import { useState, useEffect } from 'react';
import { Link, Copy, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface UrlMapping {
  shortId: string;
  longUrl: string;
  clicks: number;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = 'briefly_urls_db';

export default function Home() {
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState<UrlMapping[]>([]);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [redirecting, setRedirecting] = useState(false);

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
    loadUrls();
    triggerToast('URL deleted successfully!');
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
      <div className="glass-panel">
        <h1>Briefly</h1>
        <p className="subtitle">Shorten your links. Track your clicks. Beautifully simple.</p>

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
              <Link size={20} />
              Shorten
            </button>
          </div>
          {error && (
            <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </form>
      </div>

      <div className="glass-panel" style={{ paddingTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', fontWeight: 600 }}>
          Recent Links
        </h2>
        <div className="url-list">
          {urls.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '2rem 0' }}>
              No links yet. Create your first one above!
            </p>
          ) : (
            urls.map((u) => {
              const fullShortUrl = `${baseUrl}#${u.shortId}`;
              return (
                <div className="url-item" key={u.shortId}>
                  <div className="url-details">
                    <div className="long-url" title={u.longUrl}>
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
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="action-btn" onClick={() => handleCopy(u.shortId)} title="Copy URL">
                        <Copy size={18} />
                      </button>
                      <button className="action-btn delete-btn" onClick={() => handleDelete(u.shortId)} title="Delete URL">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={`toast ${showToast ? 'show' : ''}`}>
        <CheckCircle2 size={20} />
        {toastMessage}
      </div>
    </div>
  );
}
