import { useState, useEffect, useCallback } from 'react';
import { mockData } from '../data/mockData';

const STORAGE_KEY = 'antigravity_org_data_v5';
const OLD_KEYS = ['antigravity_org_data_v4', 'antigravity_org_data_v3', 'antigravity_org_data_v2'];

// photoData.json から写真データを取得する関数
const fetchPhotoData = async () => {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const url = `${base}photoData.json?t=${Date.now()}`; // キャッシュ回避
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.log('photoData.json not available (local dev mode):', e.message);
  }
  return {};
};

export const useOrgData = () => {
  const [units, setUnits] = useState(mockData.units || []);
  const [members, setMembers] = useState(mockData.members || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const initData = async () => {
      // --- Step 0: サーバー上の写真データを取得 ---
      const photoData = await fetchPhotoData();
      const hasServerPhotos = Object.keys(photoData).length > 0;

      // --- Step 1: 旧バージョンからすべてのデータを収集（写真・経歴含む） ---
      const legacyMemberMap = new Map();
      OLD_KEYS.forEach(oldKey => {
        try {
          const oldSaved = localStorage.getItem(oldKey);
          if (oldSaved) {
            const oldParsed = JSON.parse(oldSaved);
            if (oldParsed.members) {
              oldParsed.members.forEach(m => {
                if (!legacyMemberMap.has(m.id)) {
                  legacyMemberMap.set(m.id, m);
                }
              });
            }
          }
        } catch(e) {}
      });

      // --- Step 2: 現在のバージョン(v5)のデータを読み込む ---
      const saved = localStorage.getItem(STORAGE_KEY);
      let savedMemberMap = new Map();
      let savedUnitMap = new Map();

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // 文字化けや旧バージョンの不正データは無視
          if (!saved.includes('譛') && !saved.includes('驛') && !saved.includes('m_dept2_chief')) {
            if (parsed.members) {
              parsed.members.forEach(m => savedMemberMap.set(m.id, m));
            }
            if (parsed.units) {
              parsed.units.forEach(u => savedUnitMap.set(u.id, u));
            }
          }
        } catch(e) {
          console.error('Data parse error', e);
        }
      }

      // --- Step 3: マージロジック（ユーザーデータを最優先） ---
      // mockDataの全メンバーをベースにして、保存データで上書き
      const finalMemberMap = new Map();

      mockData.members.forEach(mockMember => {
        const saved = savedMemberMap.get(mockMember.id);
        const legacy = legacyMemberMap.get(mockMember.id);
        const serverPhoto = photoData[mockMember.id]; // サーバー上の写真

        if (saved) {
          // localStorage(v5)のデータが最優先
          const resolvedPhoto = resolvePhoto(saved.photo, legacy?.photo, serverPhoto, mockMember.photo);
          finalMemberMap.set(mockMember.id, {
            ...mockMember,  // mockDataの新フィールド（careerHistory等）をベースに
            ...saved,       // localStorageの編集済みデータで上書き
            photo: resolvedPhoto,
            // 経歴: localStorageにあればそちらを優先、なければmockDataの新データを使う
            careerHistory: (saved.careerHistory && saved.careerHistory.length > 0)
              ? saved.careerHistory
              : (mockMember.careerHistory && mockMember.careerHistory.length > 0)
                ? mockMember.careerHistory
                : [],
            gender: saved.gender || mockMember.gender || "男性"
          });
        } else if (legacy) {
          // v5にはないが旧バージョンにある場合（写真付きで引き継ぎ）
          const resolvedPhoto = resolvePhoto(legacy.photo, null, serverPhoto, mockMember.photo);
          finalMemberMap.set(mockMember.id, {
            ...mockMember,
            ...legacy,
            photo: resolvedPhoto,
            careerHistory: (legacy.careerHistory && legacy.careerHistory.length > 0)
              ? legacy.careerHistory
              : (mockMember.careerHistory || []),
            gender: legacy.gender || mockMember.gender || "男性"
          });
        } else {
          // 完全新規（mockDataのみ） → サーバー写真があれば適用
          const resolvedPhoto = serverPhoto || mockMember.photo;
          finalMemberMap.set(mockMember.id, {
            ...mockMember,
            photo: resolvedPhoto
          });
        }
      });

      // localStorageにあってmockDataにないメンバー（手動追加したメンバー）も保持
      savedMemberMap.forEach((m, id) => {
        if (!finalMemberMap.has(id)) {
          const serverPhoto = photoData[id];
          const resolvedPhoto = resolvePhoto(m.photo, null, serverPhoto, m.photo);
          finalMemberMap.set(id, { ...m, photo: resolvedPhoto });
        }
      });

      const finalMembers = Array.from(finalMemberMap.values());

      // ユニット（部署）のマージ
      const finalUnitMap = new Map();
      mockData.units.forEach(u => finalUnitMap.set(u.id, u));
      savedUnitMap.forEach((u, id) => finalUnitMap.set(id, u));
      const finalUnits = Array.from(finalUnitMap.values());

      setMembers(finalMembers);
      setUnits(finalUnits);
      // 最新の状態をv5に保存
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ units: finalUnits, members: finalMembers }));
    };

    initData();
  }, []);

  const saveToGitHub = useCallback(async (currentUnits, currentMembers) => {
    if (isSaving) return;
    setIsSaving(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ units: currentUnits, members: currentMembers }));

    const dataPayload = JSON.stringify({ units: currentUnits, members: currentMembers }, null, 2);

    try {
      const localResponse = await fetch('http://localhost:3001/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataPayload })
      });

      if (localResponse.ok) {
        console.log('Saved via local sync server');
        return;
      }

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

  // 全データ（写真含む）をsync-serverに一括同期する関数
  const syncAllPhotos = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const dataPayload = JSON.stringify({ units, members }, null, 2);
      const localResponse = await fetch('http://localhost:3001/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataPayload })
      });

      if (localResponse.ok) {
        alert('全データ（写真含む）をサーバーに同期しました！\nGitHub Pagesに反映されるまで約2分かかります。');
      } else {
        alert('同期に失敗しました。sync-serverが起動しているか確認してください。');
      }
    } catch (e) {
      alert('同期に失敗しました。sync-serverが起動しているか確認してください。\nターミナルで node sync-server.cjs を実行してください。');
      console.error('Sync failed', e);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, units, members]);

  return { units, members, updateMember, createNewMember, isSaving, syncAllPhotos };
};

/**
 * 写真を優先順位に基づいて解決する
 * 優先順位: localStorage base64 > サーバー写真(photoData.json) > レガシー写真 > mockDataデフォルト
 * プレースホルダー(__photo__で始まる)はスキップ
 */
function resolvePhoto(primaryPhoto, legacyPhoto, serverPhoto, fallbackPhoto) {
  // localStorageに実際のbase64写真がある場合（最優先）
  if (primaryPhoto && primaryPhoto.startsWith('data:')) {
    return primaryPhoto;
  }

  // サーバー上のphotoData.jsonに写真がある場合
  if (serverPhoto && serverPhoto.startsWith('data:')) {
    return serverPhoto;
  }

  // レガシーデータにbase64写真がある場合
  if (legacyPhoto && legacyPhoto.startsWith('data:')) {
    return legacyPhoto;
  }

  // プレースホルダー(__photo__xxxで始まる)の場合はフォールバック
  if (primaryPhoto && primaryPhoto.startsWith('__photo__')) {
    return fallbackPhoto;
  }

  // その他（dicebear URL等）
  return primaryPhoto || fallbackPhoto;
}
