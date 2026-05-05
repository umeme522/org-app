import { useState, useEffect, useCallback } from 'react';
import { mockData } from '../data/mockData';

const STORAGE_KEY = 'antigravity_org_data_v4'; // バージョンを上げて強制リセット

export const useOrgData = () => {
  const [units, setUnits] = useState(mockData.units || []);
  const [members, setMembers] = useState(mockData.members || []);
  const [isSaving, setIsSaving] = useState(false);

  // データの初期化と同期ロジック
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let finalMembers = [...mockData.members];
    let finalUnits = [...mockData.units];

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // 文字化けチェック または 旧バージョンの架空データIDが含まれていたらリセット
        if (saved.includes('譛') || saved.includes('驛') || saved.includes('m_dept2_chief') || saved.includes('m_top')) {
          console.warn('Old or corrupted data detected, resetting.');
          localStorage.removeItem(STORAGE_KEY);
        } else {
          if (parsed.members) {
            const memberMap = new Map();
            // まずは mockData をベースにセット
            finalMembers.forEach(m => memberMap.set(m.id, m));
            // その後、保存されている編集済みデータで上書きする
            parsed.members.forEach(m => memberMap.set(m.id, m));

            finalMembers = Array.from(memberMap.values()).map(m => ({
              ...m,
              gender: m.gender || "男性"
            }));
          }
          if (parsed.units) {
            const unitMap = new Map();
            finalUnits.forEach(u => unitMap.set(u.id, u));
            parsed.units.forEach(u => unitMap.set(u.id, u));
            finalUnits = Array.from(unitMap.values());
          }
        }
      } catch (e) {
        console.error('Data sync error', e);
      }
    }

    setMembers(finalMembers);
    setUnits(finalUnits);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ units: finalUnits, members: finalMembers }));
  }, []);

  const saveToGitHub = useCallback(async (currentUnits, currentMembers) => {
    if (isSaving) return;
    setIsSaving(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ units: currentUnits, members: currentMembers }));

    const dataPayload = JSON.stringify({ units: currentUnits, members: currentMembers }, null, 2);

    try {
      // 1. まずローカルの同期サーバー（Port 3001）を試す
      const localResponse = await fetch('http://localhost:3001/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataPayload })
      });

      if (localResponse.ok) {
        console.log('Saved via local sync server');
        return;
      }

      // 2. ローカルサーバーが使えない場合は GitHub Dispatch API (Fallback)
      const response = await fetch('https://api.github.com/repos/umeme522/Antigravity/dispatches', {
        method: 'POST',
        headers: {
          'Authorization': `token ${import.meta.env.VITE_GITHUB_TOKEN || ''}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          event_type: 'update-data',
          client_payload: { data: dataPayload }
        })
      });
      if (response.ok) {
        alert('保存しました！全員に反映されるまで約1分かかります。');
      }
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  const updateMember = (updatedMember) => {
    if (!updatedMember) return;
    const memberToSave = { ...updatedMember };
    delete memberToSave.isNew;

    setMembers(prev => {
      const newMembers = prev.some(m => m.id === memberToSave.id)
        ? prev.map(m => m.id === memberToSave.id ? memberToSave : m)
        : [...prev, memberToSave];

      saveToGitHub(units, newMembers);
      return newMembers;
    });
    return memberToSave;
  };

  const createNewMember = (defaultUnitId) => {
    return {
      id: `m_${Date.now()}`,
      lastName: '', firstName: '', reading: '', position: '',
      unitId: defaultUnitId || '',
      photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      birthDate: '', joinDate: new Date().getFullYear().toString(),
      employeeId: '', birthplace: '', careerHistory: [], isNew: true
    };
  };

  return { units, members, updateMember, createNewMember, isSaving };
};
