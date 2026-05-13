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

const GITHUB_REPO = 'umeme522/Antigravity';

const utf8ToBase64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const updateGitHubFile = async (filePath, contentStr, commitMessage, isJsonMerge = false) => {
  const token = import.meta.env.VITE_GITHUB_TOKEN || '';
  if (!token) return false;

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
  let sha = null;
  let existingObj = {};

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
      if (isJsonMerge && data.download_url) {
        const dlRes = await fetch(data.download_url + '?t=' + Date.now());
        if (dlRes.ok) existingObj = await dlRes.json();
      }
    }
  } catch (e) {
    console.error('Fetch file failed', e);
  }

  let finalContentStr = contentStr;
  if (isJsonMerge) {
    const newObj = JSON.parse(contentStr);
    const merged = { ...existingObj, ...newObj };
    finalContentStr = JSON.stringify(merged);
  }

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
    body: JSON.stringify({
      message: commitMessage,
      content: utf8ToBase64(finalContentStr),
      sha: sha,
      branch: 'main'
    })
  });
  return putRes.ok;
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
          // タイムスタンプを比較 (サーバー vs ローカル)
          const mockUpdated = mockMember.photoUpdatedAt || 0;
          const savedUpdated = saved.photoUpdatedAt || 0;
          
          // サーバー(mockData/photoData.json経由)の写真が新しい場合、ローカルの写真を無視する
          const preferServer = mockUpdated > savedUpdated && serverPhoto;
          const resolvedPhoto = preferServer ? serverPhoto : resolvePhoto(saved.photo, legacy?.photo, serverPhoto, mockMember.photo);

          finalMemberMap.set(mockMember.id, {
            ...mockMember,  // mockDataの新フィールド（careerHistory等）をベースに
            ...saved,       // localStorageの編集済みデータで上書き
            photo: resolvedPhoto,
            photoUpdatedAt: preferServer ? mockUpdated : savedUpdated,
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
            photoUpdatedAt: legacy.photoUpdatedAt || mockMember.photoUpdatedAt || 0,
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

    try {
      // 1. 写真と基本データを分離
      const photoMap = {};
      const membersWithoutPhotos = currentMembers.map(m => {
        const copy = { ...m };
        if (m.photo && m.photo.startsWith('data:')) {
          photoMap[m.id] = m.photo;
          copy.photo = `__photo__${m.id}`; // プレースホルダーに置き換え
        }
        return copy;
      });

      const dataForMockData = { units: currentUnits, members: membersWithoutPhotos };
      const mockDataContent = `export const mockData = ${JSON.stringify(dataForMockData, null, 2)};`;
      const photoDataContent = JSON.stringify(photoMap);

      // 2. ブラウザからGitHubのファイルを直接書き換え (完全自動化)
      const photoOk = await updateGitHubFile('sosikizu-app/public/photoData.json', photoDataContent, 'Update photos from browser (auto)', true);
      const dataOk = await updateGitHubFile('sosikizu-app/src/data/mockData.js', mockDataContent, 'Update personnel data from browser (auto)', false);

      if (photoOk && dataOk) {
        alert('写真を含めて全データを自動保存しました！\n（GitHub Actionsによる反映まで約1〜2分かかります）');
      } else {
        alert('保存中にエラーが発生しました。\nネットワークまたはGitHub Tokenの設定を確認してください。');
      }
    } catch (e) {
      console.error('Save failed', e);
      alert('保存処理に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  const updateMember = (updatedMember) => {
    if (!updatedMember) return;
    const memberToSave = { 
      ...updatedMember,
      // 写真が更新された可能性があるためタイムスタンプを更新
      photoUpdatedAt: Date.now() 
    };
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
      photoUpdatedAt: Date.now(),
      birthDate: '', joinDate: new Date().getFullYear().toString(),
      employeeId: '', birthplace: '', careerHistory: [], isNew: true
    };
  };

  // 全データ（写真含む）を強制的に再保存する関数
  const syncAllPhotos = useCallback(async () => {
    await saveToGitHub(units, members);
  }, [saveToGitHub, units, members]);

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
