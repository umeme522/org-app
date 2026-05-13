import { Network, Users, Search, Share2, BarChart3, Download, HelpCircle, MessageSquare, Upload } from 'lucide-react';

const Navigation = ({ 
  isSidebarOpen, 
  setIsSidebarOpen,
  sidebarTab,
  setSidebarTab,
  onExport,
  onInquiry,
  onSyncPhotos
}) => {
  return (
    <div className="nav-sidebar">
      <div style={{ height: '40px' }} />
      
      <div className="nav-items" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button onClick={() => setIsSidebarOpen(false)} className={`nav-btn ${!isSidebarOpen ? 'active' : ''}`} style={{ width: '100%' }} title="組織図">
          <Share2 size={24} />
          <span className="nav-label">組織図</span>
        </button>

        <button onClick={() => { setIsSidebarOpen(true); setSidebarTab('members'); }} className={`nav-btn ${isSidebarOpen && sidebarTab === 'members' ? 'active' : ''}`} style={{ width: '100%' }} title="メンバー">
          <Users size={24} />
          <span className="nav-label">メンバー</span>
        </button>

        <button onClick={() => { setIsSidebarOpen(true); setSidebarTab('search'); }} className={`nav-btn ${isSidebarOpen && sidebarTab === 'search' ? 'active' : ''}`} style={{ width: '100%' }} title="検索">
          <Search size={24} />
          <span className="nav-label">検索</span>
        </button>

        <button onClick={() => { setIsSidebarOpen(true); setSidebarTab('stats'); }} className={`nav-btn ${isSidebarOpen && sidebarTab === 'stats' ? 'active' : ''}`} style={{ width: '64px', height: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} title="組織統計">
          <BarChart3 size={24} />
          <span className="nav-label">統計</span>
        </button>

        <div style={{ margin: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)', width: '40px' }} />
        
        <button 
          onClick={onExport} 
          className="nav-btn" 
          style={{ width: '64px', height: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }} 
          title="Excel出力"
        >
          <Download size={24} />
          <span className="nav-label">出力</span>
        </button>

        <button 
          onClick={onSyncPhotos} 
          className="nav-btn" 
          style={{ width: '64px', height: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#4CAF50' }} 
          title="全データ・写真をサーバーに同期"
        >
          <Upload size={24} />
          <span className="nav-label">同期</span>
        </button>

        <button 
          onClick={onInquiry} 
          className="nav-btn" 
          style={{ width: '64px', height: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa' }} 
          title="お問い合わせ・エラー報告"
        >
          <HelpCircle size={24} />
          <span className="nav-label">ヘルプ</span>
        </button>

      </div>
    </div>
  );
};

export default Navigation;
