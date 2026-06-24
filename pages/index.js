import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [name, setName] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('alpha_user_name')) router.push('/dashboard');
  }, [router]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    localStorage.setItem('alpha_user_name', name.trim());
    router.push('/dashboard');
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a1628'}}>
      <div style={{background:'#0d1f3c',border:'1px solid #1e3a5f',borderRadius:'16px',padding:'40px',width:'100%',maxWidth:'400px'}}>
        <h1 style={{fontSize:'28px',color:'#f1f5f9',textAlign:'center',marginBottom:'8px'}}>📡 Alpha Wireless</h1>
        <p style={{color:'#64748b',textAlign:'center',marginBottom:'30px'}}>Priority Tracker v2</p>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Your name..." value={name} onChange={e=>setName(e.target.value)}
            style={{width:'100%',background:'#0a1628',border:'1px solid #1e3a5f',color:'#e2e8f0',padding:'12px',borderRadius:'8px',marginBottom:'16px'}} />
          <button type="submit" style={{width:'100%',padding:'12px',background:'#38bdf8',color:'#0a1628',border:'none',borderRadius:'8px',fontWeight:'600',cursor:'pointer'}}>Enter</button>
        </form>
      </div>
    </div>
  );
}