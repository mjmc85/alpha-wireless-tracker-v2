import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';

export default function Dashboard() {
  const [actions, setActions] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('alpha_user_name');
    if (!saved) { router.push('/'); return; }
    // Simulated data for now
    setActions([
      { id: 1, description: 'Complete Q2 report', due_date: '2026-06-20', completion_pct: 100 },
      { id: 2, description: 'Review tower proposals', due_date: '2026-06-25', completion_pct: 50 },
      { id: 3, description: 'Schedule team meeting', due_date: '2026-06-28', completion_pct: 0 },
    ]);
    setPriorities([
      { id: 1, title: 'US Supply Chain', quarter: 'Q2 2026', completion: 40, status: 'In Progress' },
      { id: 2, title: 'Europe Expansion', quarter: 'Q2 2026', completion: 65, status: 'In Progress' },
    ]);
    setLoading(false);
  }, [router]);

  if (loading) return <Layout><div style={{padding:40,textAlign:'center',color:'#64748b'}}>Loading...</div></Layout>;

  return (
    <Layout>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'30px'}}>
        <h1 style={{fontSize:'24px',color:'#f1f5f9'}}>📊 Dashboard</h1>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'20px',marginBottom:'30px'}}>
        <div style={{background:'#0d1f3c',border:'1px solid #1e3a5f',borderRadius:'12px',padding:'20px'}}>
          <div style={{fontSize:'12px',color:'#64748b',marginBottom:'8px'}}>Actions</div>
          <div style={{fontSize:'28px',fontWeight:'700',color:'#f1f5f9'}}>{actions.length}</div>
        </div>
        <div style={{background:'#0d1f3c',border:'1px solid #1e3a5f',borderRadius:'12px',padding:'20px'}}>
          <div style={{fontSize:'12px',color:'#64748b',marginBottom:'8px'}}>Overdue</div>
          <div style={{fontSize:'28px',fontWeight:'700',color:'#ef4444'}}>0</div>
        </div>
        <div style={{background:'#0d1f3c',border:'1px solid #1e3a5f',borderRadius:'12px',padding:'20px'}}>
          <div style={{fontSize:'12px',color:'#64748b',marginBottom:'8px'}}>This Week</div>
          <div style={{fontSize:'28px',fontWeight:'700',color:'#f59e0b'}}>2</div>
        </div>
        <div style={{background:'#0d1f3c',border:'1px solid #1e3a5f',borderRadius:'12px',padding:'20px'}}>
          <div style={{fontSize:'12px',color:'#64748b',marginBottom:'8px'}}>Completed</div>
          <div style={{fontSize:'28px',fontWeight:'700',color:'#10b981'}}>1</div>
        </div>
      </div>
      <div style={{marginBottom:'30px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
          <div style={{fontSize:'16px',fontWeight:'600',color:'#f1f5f9'}}>📋 Action Items</div>
          <Link href="/priorities" style={{padding:'8px 16px',background:'#1e3a5f',color:'#e2e8f0',borderRadius:'8px',fontSize:'14px',textDecoration:'none'}}>Manage</Link>
        </div>
        {actions.map(a => (
          <div key={a.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',background:'#0a1628',borderRadius:'8px',marginBottom:'8px',border:'1px solid #1e3a5f'}}>
            <div style={{width:'20px',height:'20px',border:'2px solid #38bdf8',borderRadius:'4px',background:a.completion_pct===100?'#10b981':'transparent'}}>
              {a.completion_pct===100 && <span style={{color:'#0a1628',fontSize:'12px'}}>✓</span>}
            </div>
            <div style={{flex:1,color:a.completion_pct===100?'#64748b':'#e2e8f0',textDecoration:a.completion_pct===100?'line-through':'none'}}>{a.description}</div>
            <div style={{fontSize:'12px',color:'#64748b'}}>{a.due_date}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{fontSize:'16px',fontWeight:'600',color:'#f1f5f9',marginBottom:'16px'}}>🎯 Priorities</div>
        {priorities.map(p => (
          <div key={p.id} style={{background:'#0d1f3c',border:'1px solid #1e3a5f',borderRadius:'12px',padding:'20px',marginBottom:'12px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div style={{fontWeight:'500',color:'#f1f5f9'}}>{p.title}</div>
              <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'11px',background:'#1e3a8a',color:'#60a5fa'}}>{p.status}</span>
            </div>
            <div style={{width:'100%',height:'8px',background:'#1e3a5f',borderRadius:'4px',overflow:'hidden'}}>
              <div style={{width:`${p.completion}%`,height:'100%',background:p.completion<50?'#ef4444':p.completion<80?'#f59e0b':'#10b981',borderRadius:'4px'}}></div>
            </div>
            <div style={{fontSize:'12px',color:'#64748b',marginTop:'8px'}}>{p.completion}% · {p.quarter}</div>
          </div>
        ))}
      </div>
    </Layout>
  );
}