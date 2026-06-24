import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';

const SECTIONS = [
  { key: 'good_news', label: '✅ Good News', placeholder: 'Share something positive...' },
  { key: 'metrics', label: '📊 Metrics Review', placeholder: 'Key metrics this week...' },
  { key: 'top_thing', label: '🎯 #1 Thing Today', placeholder: 'The most important thing to get done...' },
  { key: 'stucks', label: '🚧 Stucks', placeholder: 'What is blocking progress...' },
  { key: 'actions', label: '📋 Action Items', placeholder: 'Actions agreed in this meeting...' },
];

export default function MeetingDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [meeting, setMeeting] = useState(null);
  const [agendaItems, setAgendaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('good_news');
  const [newContent, setNewContent] = useState('');
  const currentUser = typeof window !== 'undefined' ? localStorage.getItem('alpha_user_name') : '';

  useEffect(() => {
    const user = localStorage.getItem('alpha_user_name');
    if (!user) { router.push('/'); return; }
    if (id) load();
  }, [id, router]);

  const load = async () => {
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase.from('meetings').select('*').eq('id', id).single(),
      supabase.from('meeting_agenda_items').select('*').eq('meeting_id', id).order('created_at', { ascending: true })
    ]);
    setMeeting(m);
    setAgendaItems(a || []);
    setLoading(false);
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    await supabase.from('meeting_agenda_items').insert({
      id: `ai_${Date.now()}`,
      meeting_id: id,
      section: activeSection,
      content: newContent.trim(),
      author: currentUser
    });
    setNewContent('');
    load();
  };

  const deleteItem = async (itemId) => {
    await supabase.from('meeting_agenda_items').delete().eq('id', itemId);
    load();
  };

  if (loading || !meeting) return <Layout><div className="card">Loading...</div></Layout>;

  const sectionItems = (key) => agendaItems.filter(a => a.section === key);

  return (
    <Layout>
      <div className="header">
        <div>
          <Link href="/meetings" style={{ color: '#64748b', fontSize: 14, marginBottom: 8, display: 'block' }}>← Back to Meetings</Link>
          <h1>{meeting.title}</h1>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            📅 {meeting.meeting_date} {meeting.meeting_time ? `at ${meeting.meeting_time}` : ''}
            {meeting.quarter_id && ` · ${meeting.quarter_id}`}
          </div>
        </div>
        {meeting.teams_link && (
          <a href={meeting.teams_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            📹 Join Teams
          </a>
        )}
      </div>

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <div key={s.key} className={`tab ${activeSection === s.key ? 'active' : ''}`} onClick={() => setActiveSection(s.key)}>
            {s.label} ({sectionItems(s.key).length})
          </div>
        ))}
      </div>

      {SECTIONS.map(s => activeSection === s.key && (
        <div key={s.key}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div className="section-title">{s.label}</div>
          </div>

          {sectionItems(s.key).length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <p>No items yet. Add the first one below.</p>
            </div>
          ) : (
            sectionItems(s.key).map(item => (
              <div key={item.id} className="card" style={{ marginBottom: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#e2e8f0' }}>{item.content}</div>
                  {item.author && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>— {item.author}</div>}
                </div>
                <button className="btn btn-sm btn-danger" style={{ marginLeft: 12, flexShrink: 0 }} onClick={() => deleteItem(item.id)}>×</button>
              </div>
            ))
          )}

          <form onSubmit={addItem} style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder={s.placeholder}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        </div>
      ))}

      {meeting.notes && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="section-title" style={{ marginBottom: 10 }}>📝 Meeting Notes</div>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>{meeting.notes}</div>
        </div>
      )}
    </Layout>
  );
}