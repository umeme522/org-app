import { useState, useEffect, useCallback } from 'react';
import { mockData } from '../data/mockData';

const STORAGE_VERSION = 'v5';
const UNITS_STORAGE_KEY = `antigravity_org_units_${STORAGE_VERSION}`;
const MEMBERS_STORAGE_KEY = `antigravity_org_members_${STORAGE_VERSION}`;
const LEGACY_STORAGE_KEYS = ['org-units', 'org-members', 'antigravity_org_data_v4'];

export const useOrgData = () => {
  const [units, setUnits] = useState(mockData.units || []);
  const [members, setMembers] = useState(mockData.members || []);
  const [isSaving, setIsSaving] = useState(false);

  // データの初期化と同期ロジック
  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

    const savedUnits = localStorage.getItem(UNITS_STORAGE_KEY);
    const savedMembers = localStorage.getItem(MEMBERS_STORAGE_KEY);
    let finalMembers = [...mockData.members];
    let finalUnits = [...mockData.units];

    if (savedUnits) {
      try {
        const parsedUnits = JSON.parse(savedUnits);
        if (Array.isArray(parsedUnits)) {
          finalUnits = parsedUnits;
        }
      } catch (e) {
        console.error('Unit data sync error', e);
      }
    }

    if (savedMembers) {
      try {
        const parsedMembers = JSON.parse(savedMembers);
        if (Array.isArray(parsedMembers)) {
          finalMembers = parsedMembers.map(m => ({
            ...m,
            gender: m.gender || "男性"
          }));
        }
      } catch (e) {
        console.error('Member data sync error', e);
      }
    }

    setMembers(finalMembers);
    setUnits(finalUnits);
    localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(finalUnits));
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(finalMembers));
  }, []);

  const saveToGitHub = useCallback(async (currentUnits, currentMembers) => {
    if (isSaving) return;
    setIsSaving(true);
    localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(currentUnits));
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(currentMembers));

    try {
      // 1. まずローカルの同期サーバー（Port 3001）を試す
      const localResponse = await fetch('http://localhost:3001/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: JSON.stringify({ units: currentUnits, members: currentMembers }, null, 2) })
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
