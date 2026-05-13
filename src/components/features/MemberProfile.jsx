import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Briefcase, Hash, User, Clock, Award, Plus, Trash2, History, MapPin, Mail } from 'lucide-react';

const POSITIONS = [
  '支店長',
  '副支店長',
  '部長',
  '所長',
  '課長',
  '副長',
  '係長',
  'スタッフ'
];

const getPositionColor = (pos) => {
  if (!pos) return '#A0AEC0';
  const p = String(pos);
  if (p.includes('支店長')) return '#FFD700'; 
  if (p.includes('部長')) return '#FF4B4B';   
  if (p.includes('所長') || p.includes('課長')) return '#4B7BFF'; 
  if (p.includes('副長')) return '#FF9500'; 
  if (p.includes('係長')) return '#00E676'; 
  return '#A0AEC0'; 
};

const calculateAge = (birthDate) => {
  if (!birthDate) return '未設定';
  
  let dateStr = String(birthDate).replace(/\//g, '-');
  
  // 19950522 形式（8桁数字）の場合、1995-05-22 に変換
  if (/^\d{8}$/.test(dateStr)) {
    dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  
  const birth = new Date(dateStr);
  if (isNaN(birth.getTime())) return '未設定';
  
  const today = new Date();
  const birthClean = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
  const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  let age = todayClean.getFullYear() - birthClean.getFullYear();
  const m = todayClean.getMonth() - birthClean.getMonth();
  
  if (m < 0 || (m === 0 && todayClean.getDate() < birthClean.getDate())) {
    age--;
  }
  
  return `${age} 歳`;
};

const calculateYearsOfService = (joinYear) => {
  if (!joinYear) return '未設定';
  const currentYear = new Date().getFullYear();
  const year = parseInt(joinYear);
  if (isNaN(year)) return '未設定';
  
  const years = currentYear - year;
  return `${Math.max(0, years)} 年`;
};

const MemberProfile = ({ member, unit, units, onUpdate, onDelete, onClose, isPermanent }) => {

  const [isEditing, setIsEditing] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [formData, setFormData] = useState(member || {});

  useEffect(() => {
    if (!member) return;
    const joinYear = member.joinDate && typeof member.joinDate === 'string' && member.joinDate.includes('-') 
      ? member.joinDate.split('-')[0] 
      : member.joinDate;

    setFormData({ 
      ...member, 
      joinDate: joinYear,
      careerHistory: member.careerHistory || [] 
    });
    setIsEditing(member.isNew || false);
  }, [member]);

  if (!member) return null;

      const handleChange = (e) => {
    let { name, value } = e.target;
    
    if (name === 'birthDate') {
      // 数字のみ抽出
      const nums = value.replace(/\D/g, '').slice(0, 8);
      if (nums.length <= 4) {
        value = nums;
      } else if (nums.length <= 6) {
        value = `${nums.slice(0, 4)}/${nums.slice(4)}`;
      } else {
        value = `${nums.slice(0, 4)}/${nums.slice(4, 6)}/${nums.slice(6)}`;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddCareer = () => {
    setFormData(prev => ({
      ...prev,
      careerHistory: [...(prev.careerHistory || []), { id: `career_${Date.now()}`, period: '', department: '' }]
    }));
  };

  const handleCareerChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      careerHistory: (prev.careerHistory || []).map(c => 
        (c.id === id || c._id === id) ? { ...c, [field]: value } : c
      )
    }));
  };

  const handleRemoveCareer = (id) => {
    setFormData(prev => ({
      ...prev,
      careerHistory: (prev.careerHistory || []).filter(c => (c.id !== id && c._id !== id))
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // 組織図のアイコンとして最適なサイズに設定
        const SIZE = 256; 
        canvas.width = SIZE;
        canvas.height = SIZE;
        
        const ctx = canvas.getContext('2d');
        
        // 中央で正方形に切り抜くロジック
        const minSide = Math.min(img.width, img.height);
        const sourceX = (img.width - minSide) / 2;
        const sourceY = (img.height - minSide) / 2;
        
        ctx.drawImage(img, sourceX, sourceY, minSide, minSide, 0, 0, SIZE, SIZE);
        
        // WebPが使えるなら使い、なければJPEGで圧縮 (0.7品質)
        const mimeType = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 
          ? 'image/webp' 
          : 'image/jpeg';
        
        const dataUrl = canvas.toDataURL(mimeType, 0.7);
        setFormData(prev => ({ ...prev, photo: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Icon size={18} color="var(--accent-primary)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ fontSize: '0.95rem', color: '#ffffff' }}>{value || '-'}</div>
      </div>
    </div>
  );

  const renderUnitOptions = () => {
    const getUnitTree = (parentId = null, level = 0) => {
      let results = [];
      const children = units.filter(u => u.parentId === parentId);
      
      children.forEach(unit => {
        const indent = '\u3000'.repeat(level); 
        results.push(
          <option key={unit.id} value={unit.id} style={{ background: '#1a202c', color: '#ffffff' }}>
            {level > 0 ? `${indent}└─ ${unit.name}` : unit.name}
          </option>
        );
        results = [...results, ...getUnitTree(unit.id, level + 1)];
      });
      return results;
    };
    return getUnitTree();
  };

  const renderYearOptions = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1980; y--) {
      years.push(<option key={y} value={y}>{y}年度</option>);
    }
    return years;
  };

  const roleColor = getPositionColor(member.position);
  const fullName = `${member.lastName || ''} ${member.firstName || ''}`;

  return (
    <motion.div
      initial={isPermanent ? false : { x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
      className={isPermanent ? "profile-panel-permanent" : "profile-panel"}
      style={{
        background: 'rgba(26, 32, 44, 0.95)',
        backdropFilter: 'blur(20px)',
        borderLeft: isPermanent ? 'none' : '2px solid var(--accent-primary)',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        zIndex: 100000
      }}
    >
      {!isPermanent && (
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#ffffff',
            zIndex: 100
          }}
        >
          <X size={20} />
        </button>
      )}

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: isPermanent ? '0' : '20px', paddingBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffffff', letterSpacing: '0.05em' }}>プロフィール編集</h2>
          
          <div className="form-group" style={{ textAlign: 'center', marginBottom: '10px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img 
                src={formData.photo} 
                alt="Preview" 
                onClick={(e) => {
                  // 4回クリックで管理者モード切替
                  if (e.detail === 4) {
                    setIsAdminMode(prev => !prev);
                  }
                }}
                style={{ width: '100px', height: '100px', borderRadius: '50%', border: `3px solid ${getPositionColor(formData.position)}`, objectFit: 'cover', cursor: 'pointer' }} 
                title="4回連続クリックで管理者モード（直接登録）切替"
              />
              
              {isAdminMode ? (
                <>
                  {/* 写真追加ボタン（右下） */}
                  <label style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--accent-primary)', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} />
                    <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  </label>
                  {/* 写真削除ボタン（左下）— カスタム写真がある場合のみ表示 */}
                  {formData.photo && formData.photo.startsWith('data:') && (
                    <button
                      type="button"
                      onClick={() => {
                        const defaultPhoto = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id || Date.now()}`;
                        setFormData(prev => ({ ...prev, photo: defaultPhoto }));
                      }}
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        background: '#FF4B4B',
                        color: 'white',
                        padding: '6px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(26, 32, 44, 0.95)',
                        width: '30px',
                        height: '30px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#ff1a1a'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#FF4B4B'; e.currentTarget.style.transform = 'scale(1)'; }}
                      title="写真を削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </>
              ) : (
                /* 一般ユーザー向け：写真変更依頼ボタン（右下） */
                <a 
                  href={`mailto:umeahra.y@g.konoike.net?subject=【組織図アプリ】写真変更依頼&body=${encodeURIComponent(`氏名: ${fullName}\n社員番号: ${member.employeeId || ''}\n\n※こちらに新しい写真を添付して送信してください。`)}`}
                  style={{ 
                    position: 'absolute', bottom: '0', right: '-10px', background: '#4B7BFF', color: 'white', padding: '8px', 
                    borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    textDecoration: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border: '2px solid rgba(26, 32, 44, 0.95)'
                  }}
                  title="管理者に写真変更をメールで依頼する"
                >
                  <Mail size={16} />
                </a>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>姓</label>
              <input name="lastName" value={formData.lastName || ''} onChange={handleChange} className="edit-input" />
            </div>
            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>名</label>
              <input name="firstName" value={formData.firstName || ''} onChange={handleChange} className="edit-input" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>性別</label>
              <select name="gender" value={formData.gender || ''} onChange={handleChange} className="edit-input" style={{ color: '#fff', background: '#1a1d26' }}>
                <option value="" style={{ background: '#1a1d26', color: '#fff' }}>未設定</option>
                <option value="男性" style={{ background: '#1a1d26', color: '#fff' }}>男性</option>
                <option value="女性" style={{ background: '#1a1d26', color: '#fff' }}>女性</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>生年月日（年齢自動算出）</label>
              <input 
                type="text" 
                name="birthDate" 
                value={formData.birthDate || ''} 
                onChange={handleChange} 
                className="edit-input" 
                placeholder="例: 1980-01-01"
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>役職</label>
            <select name="position" value={formData.position || ''} onChange={handleChange} className="edit-input" style={{ color: '#fff', background: '#1a1d26' }}>
              <option value="" style={{ background: '#1a1d26', color: '#fff' }}>役職なし</option>
              {POSITIONS.map(p => <option key={p} value={p} style={{ background: '#1a1d26', color: '#fff' }}>{p}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>所属部署</label>
            <select name="unitId" value={formData.unitId || ''} onChange={handleChange} className="edit-input" style={{ color: '#fff', background: '#1a1d26' }}>
              <option value="" style={{ background: '#1a1d26', color: '#fff' }}>部署なし</option>
              {renderUnitOptions()}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>社員番号</label>
              <input name="employeeId" value={formData.employeeId || ''} onChange={handleChange} className="edit-input" />
            </div>
            <div className="form-group">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>入社年度</label>
              <select name="joinDate" value={formData.joinDate || ''} onChange={handleChange} className="edit-input" style={{ color: '#fff', background: '#1a1d26' }}>
                <option value="" style={{ background: '#1a1d26', color: '#fff' }}>未設定</option>
                {renderYearOptions()}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>出身地</label>
            <input name="birthplace" value={formData.birthplace || ''} onChange={handleChange} className="edit-input" placeholder="例: 東京都" />
          </div>

          {/* 経歴編集セクション */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>経歴</label>
              <button onClick={handleAddCareer} style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> 追加
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(formData.careerHistory || []).map((c, i) => (
                <div key={c.id || c._id || i} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '70px', flexShrink: 0 }}>
                    <input 
                      placeholder="年度" 
                      value={c.period || ''} 
                      onChange={(e) => handleCareerChange(c.id || c._id || i, 'period', e.target.value)}
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', color: 'var(--accent-primary)', fontSize: '0.9rem', width: '100%', textAlign: 'center', fontWeight: '700', padding: '4px 0' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input 
                      placeholder="所属・部署名を入力" 
                      value={c.department || ''} 
                      onChange={(e) => handleCareerChange(c.id || c._id || i, 'department', e.target.value)}
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', width: '100%', padding: '4px 0' }}
                    />
                  </div>
                  <button 
                    onClick={() => handleRemoveCareer(c.id || c._id || i)} 
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,75,75,0.6)', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#FF4B4B'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,75,75,0.6)'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={handleSave} className="save-btn" style={{ flex: 2 }}>変更を保存</button>
            <button onClick={() => setIsEditing(false)} className="cancel-btn">戻る</button>
            {isAdminMode && (
              <button 
                onClick={() => {
                  if (window.confirm(`${fullName} さんを組織図から削除してもよろしいですか？`)) {
                    onDelete(member.id);
                    onClose();
                  }
                }} 
                style={{ 
                  background: '#FF4B4B', color: 'white', border: 'none', borderRadius: '12px', padding: '0 15px', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}
                title="人物を削除"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: '30px', paddingTop: '20px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img 
                src={member.photo} 
                alt={fullName} 
                onDoubleClick={() => setIsAdminMode(prev => !prev)}
                onClick={(e) => {
                  // 4回クリックで管理者モード切替
                  if (e.detail === 4) {
                    setIsAdminMode(prev => !prev);
                  }
                }}
                style={{ width: '120px', height: '120px', borderRadius: '50%', border: `4px solid ${roleColor}`, objectFit: 'cover', boxShadow: `0 0 20px ${roleColor}44`, cursor: 'pointer' }} 
              />
              <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#1a1d26', padding: '6px', borderRadius: '50%', border: `2px solid ${roleColor}` }}>
                <User size={16} color={roleColor} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginTop: '16px', fontWeight: '900' }}>{fullName}</h2>
            <div style={{ color: roleColor, fontWeight: '700', letterSpacing: '0.1em', fontSize: '1rem', marginTop: '4px' }}>{member.position || '役職なし'}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <InfoRow icon={Briefcase} label="所属部署" value={unit?.name} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InfoRow icon={User} label="性別" value={member.gender} />
              <InfoRow icon={Calendar} label="年齢" value={calculateAge(member.birthDate)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InfoRow icon={Hash} label="社員番号" value={member.employeeId} />
              <InfoRow icon={Clock} label="勤続年数" value={calculateYearsOfService(member.joinDate)} />
            </div>

            <InfoRow icon={MapPin} label="出身地" value={member.birthplace} />
            
            {member.careerHistory && member.careerHistory.length > 0 && (
              <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <History size={18} color="var(--accent-primary)" /> <span style={{ fontWeight: '700', color: '#fff' }}>経歴</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', background: 'linear-gradient(to bottom, var(--accent-primary), transparent)' }} />
                  
                  {member.careerHistory.map((c, i) => (
                    <div key={i} style={{ paddingLeft: '24px', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '0', top: '6px', width: '16px', height: '16px', borderRadius: '50%', background: '#1a1d26', border: '3px solid var(--accent-primary)' }} />
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: '700', whiteSpace: 'nowrap' }}>{c.period}</div>
                        <div style={{ fontSize: '0.9rem', color: '#ffffff', lineHeight: '1.4' }}>{c.department}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '40px', paddingBottom: '20px', display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setIsEditing(true)}
              className="save-btn"
              style={{ flex: 1, background: 'linear-gradient(135deg, #4B7BFF, #7c4dff)', color: 'white', border: 'none' }}
            >
              プロフィールを編集する
            </button>
            {isAdminMode && (
              <button 
                onClick={() => {
                  if (window.confirm(`${fullName} さんを組織図から削除してもよろしいですか？`)) {
                    onDelete(member.id);
                    onClose();
                  }
                }} 
                style={{ 
                  background: '#FF4B4B', color: 'white', border: 'none', borderRadius: '12px', padding: '0 15px', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}
                title="人物を削除"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default MemberProfile;
