// Telumak RPG - Browser Cache & Optimistic Local Storage for Characters & Sheets
// Reduces Firestore reads and provides instantaneous local load

const CACHE_PREFIX = 'telumak_char_cache_';
const ALL_CHARS_CACHE_KEY = 'telumak_all_characters_v1';
const CACHE_TIMESTAMP_KEY = 'telumak_cache_timestamp_v1';

export function saveCharactersToCache(characters: any[]) {
  try {
    if (!characters || !Array.isArray(characters)) return;
    localStorage.setItem(ALL_CHARS_CACHE_KEY, JSON.stringify(characters));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.warn('Falha ao salvar cache no localStorage:', e);
  }
}

export function loadCharactersFromCache(): any[] | null {
  try {
    const raw = localStorage.getItem(ALL_CHARS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Falha ao carregar cache do localStorage:', e);
    return null;
  }
}

export function saveSingleCharacterToCache(char: any) {
  try {
    if (!char || !char.id) return;
    localStorage.setItem(`${CACHE_PREFIX}${char.id}`, JSON.stringify(char));
    
    // Also update in all characters cache
    const existing = loadCharactersFromCache();
    if (existing) {
      const idx = existing.findIndex(c => c.id === char.id);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...char };
      } else {
        existing.push(char);
      }
      saveCharactersToCache(existing);
    }
  } catch (e) {
    console.warn('Falha ao salvar ficha individual no cache:', e);
  }
}

export function loadSingleCharacterFromCache(charId: string): any | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${charId}`);
    if (raw) return JSON.parse(raw);
    
    const all = loadCharactersFromCache();
    if (all) {
      return all.find(c => c.id === charId) || null;
    }
    return null;
  } catch (e) {
    return null;
  }
}
