'use client';
import { FormEvent, useState } from 'react';
import { Heart, LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? 'That password did not work.'); return; }
      window.location.href = '/';
    } catch { setError('Could not connect. Try again in a moment.'); }
    finally { setBusy(false); }
  }
  return <main className="login-screen"><div className="login-card"><div className="tiny-flower">✳</div><p className="eyebrow">A PRIVATE LITTLE PLACE</p><h1>Our Little<br/><em>LA Guide.</em></h1><p className="login-copy">A few plans, a little anticipation,<br/>and something to look forward to. ♡</p><form onSubmit={submit} className="login-form"><label htmlFor="password">The secret password</label><div className="password-wrap"><LockKeyhole size={17}/><input id="password" type="password" autoComplete="current-password" placeholder="Just between us…" value={password} onChange={e=>setPassword(e.target.value)} required/></div><button className="primary-button" disabled={busy}>{busy ? 'Opening our little place…' : 'Come on in ♡'}</button>{error && <p className="form-error" role="alert">{error}</p>}</form><p className="login-foot"><Heart size={13}/> made for two people and one little adventure</p></div></main>;
}
