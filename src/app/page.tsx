'use client';

import { useState, useEffect } from 'react';
import { Link, Copy, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface UrlMapping {
  shortId: string;
  longUrl: string;
  clicks: number;
  createdAt: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState<UrlMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  const [isKvConfigured, setIsKvConfigured] = useState(true);

  // Fetch shortened URLs list
  const fetchUrls = async () => {
    try {
      const res = await fetch('/api/shorten');
      if (res.ok) {
        const data = await res.json();
        setUrls(data.urls || []);
        setIsKvConfigured(data.isKvConfigured !== false);
      }
    } catch (err) {
      console.error('Failed to fetch URLs:', err);
    }
  };

  useEffect(() => {
    fetchUrls();
    // Get host location safely inside browser
    setBaseUrl(window.location.origin);
  }, []);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (res.ok) {
        setUrl('');
        fetchUrls();
        triggerToast('URL Shortened successfully!');
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to reach backend server');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (shortId: string) => {
    const fullUrl = `${baseUrl}/${shortId}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      triggerToast('Copied to clipboard!');
    }).catch(() => {
      triggerToast('Failed to copy!');
    });
  };

  const handleDelete = async (shortId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const res = await fetch(`/api/shorten?code=${shortId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchUrls();
        triggerToast('URL deleted successfully!');
      } else {
        triggerToast('Failed to delete URL');
      }
    } catch (err) {
      triggerToast('Network error while deleting URL');
    }
  };

  return (
    <div className="container">
      <div className="glass-panel">
        <h1>Briefly</h1>
        <p className="subtitle">Shorten your links. Track your clicks. Beautifully simple.</p>

        {!isKvConfigured && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#fca5a5',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            lineHeight: '1.4'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <strong>Database Not Connected:</strong> To store URLs permanently on Vercel, link a database. Go to your Vercel Dashboard &rarr; <strong>Storage</strong>, create a free <strong>KV</strong> database, and link it with this project in 1 click.
            </div>
          </div>
        )}

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
            <button type="submit" className="primary-btn" disabled={loading}>
              <Link size={20} />
              {loading ? 'Shortening...' : 'Shorten'}
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
              const fullShortUrl = `${baseUrl}/${u.shortId}`;
              return (
                <div className="url-item" key={u.shortId}>
                  <div className="url-details">
                    <div className="long-url" title={u.longUrl}>
                      {u.longUrl}
                    </div>
                    <a href={fullShortUrl} target="_blank" rel="noopener noreferrer" className="short-url">
                      {baseUrl.replace(/^https?:\/\//i, '')}/<span style={{ color: 'white' }}>{u.shortId}</span>
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
