import React, { useState } from 'react';
import emailjs from '@emailjs/browser';

const InquiryModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ name: '', email: '', type: 'bug', message: '' });
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');

    // EmailJSの情報を設定
    const serviceId = 'service_ozlah6b';
    const templateId = 'template_sgyc1qp';
    const publicKey = 'j1bMToGV2qz1hk2DN';

    // テンプレートに渡す変数名（EmailJSのテンプレート設定に合わせて調整が必要な場合があります）
    const templateParams = {
      from_name: formData.name,
      from_email: formData.email,
      inquiry_type: formData.type === 'bug' ? '不具合報告' : formData.type === 'request' ? '機能要望' : 'その他',
      message: formData.message,
      // 既存のテンプレート変数名に合わせる（ジム記録アプリの例を参考に）
      username: formData.name, 
      email: formData.email,
      password: '(問い合わせフォームからの送信)' 
    };

    try {
      const result = await emailjs.send(serviceId, templateId, templateParams, publicKey);
      if (result.status === 200) {
        setStatus('success');
        setTimeout(() => {
          onClose();
          setStatus('idle');
          setFormData({ name: '', email: '', type: 'bug', message: '' });
        }, 2000);
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('EmailJS Error:', err);
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="inquiry-panel" onClick={e => e.stopPropagation()}>
        <div className="inquiry-header">
          <h2>お問い合わせ・不具合報告</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        {status === 'success' ? (
          <div className="success-message" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="success-icon" style={{ 
              width: '80px', height: '80px', background: 'var(--accent-primary)', 
              color: '#000', borderRadius: '50%', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto 20px' 
            }}>✓</div>
            <h3 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '10px' }}>送信完了</h3>
            <p style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}>
              メールを送信しました。
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '10px' }}>
              内容を確認次第、ご連絡いたします。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="inquiry-form">
            <div className="form-group">
              <label>お名前</label>
              <input type="text" required className="edit-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>メールアドレス</label>
              <input type="email" required className="edit-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label>種別</label>
              <select className="edit-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="bug">不具合報告</option>
                <option value="request">機能要望</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div className="form-group">
              <label>メッセージ</label>
              <textarea required rows="4" className="edit-input" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} style={{resize:'none'}} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} className="cancel-btn">キャンセル</button>
              <button type="submit" disabled={status === 'sending'} className="save-btn">{status === 'sending' ? '送信中...' : '送信する'}</button>
            </div>
            {status === 'error' && <p style={{ color: '#ef4444', marginTop: '1rem', textAlign: 'center' }}>送信に失敗しました。時間をおいて再度お試しください。</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default InquiryModal;
