import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArenaToken, Character } from '../types';
import { Map, Plus, Trash2, Edit2, Move, User, Sliders, PlaySquare } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errors';

interface BattleMapProps {
  isGM: boolean;
  currentUserEmail: string;
  characters: Character[];
}

export function BattleMap({ isGM, currentUserEmail, characters }: BattleMapProps) {
  const [tokens, setTokens] = useState<ArenaToken[]>([]);
  const [bg, setBg] = useState('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?auto=format&fit=crop&w=1920&q=80');
  const [gridWidth, setGridWidth] = useState(20);
  const [gridHeight, setGridHeight] = useState(12);
  const [loading, setLoading] = useState(true);

  // Spawner form states
  const [showConfig, setShowConfig] = useState(false);
  const [showSpawn, setShowSpawn] = useState(false);
  const [spawnType, setSpawnType] = useState<'PLAYER' | 'NPC' | 'OBJ'>('NPC');
  const [spawnName, setSpawnName] = useState('');
  const [spawnImg, setSpawnImg] = useState('');
  const [spawnCharId, setSpawnCharId] = useState('');

  // Combat selection state
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  // Local state for checking if user is the owner of a token
  const isMyToken = (token: ArenaToken) => {
    if (isGM) return true;
    if (token.type !== 'PLAYER' || !token.charId) return false;
    const char = characters.find(c => c.id === token.charId);
    return char?.email_dono === currentUserEmail;
  };

  // Load Arena state and tokens
  useEffect(() => {
    const arenaDocPath = 'arena/default';
    const unsubArena = onSnapshot(doc(db, 'arena', 'default'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.bg) setBg(data.bg);
        if (data.gridWidth) setGridWidth(data.gridWidth);
        if (data.gridHeight) setGridHeight(data.gridHeight);
      } else {
        // Initialize default arena if not present
        setDoc(doc(db, 'arena', 'default'), {
          bg: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?auto=format&fit=crop&w=1920&q=80',
          gridWidth: 20,
          gridHeight: 12
        });
      }
    });

    const tokensPath = 'arena/default/tokens';
    const unsubTokens = onSnapshot(collection(db, 'arena', 'default', 'tokens'), (snap) => {
      const items: ArenaToken[] = [];
      snap.forEach(d => {
        items.push(d.data() as ArenaToken);
      });
      setTokens(items);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, tokensPath);
    });

    return () => {
      unsubArena();
      unsubTokens();
    };
  }, []);

  const handleUpdateBg = async (newUrl: string) => {
    if (!newUrl) return;
    const path = 'arena/default';
    try {
      await updateDoc(doc(db, 'arena', 'default'), { bg: newUrl });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleSpawnToken = async (e: React.FormEvent) => {
    e.preventDefault();
    let name = spawnName.trim();
    let img = spawnImg.trim();
    let charId = '';

    if (spawnType === 'PLAYER') {
      const selectedChar = characters.find(c => c.id === spawnCharId);
      if (!selectedChar) return;
      name = selectedChar.nome;
      img = selectedChar.img_saudavel || 'https://via.placeholder.com/150';
      charId = selectedChar.id;
    }

    if (!name || !img) return;

    const id = `token_${Date.now()}`;
    const tokenDoc: ArenaToken = {
      id,
      name,
      img,
      type: spawnType,
      x: 1,
      y: 1,
      charId: charId || undefined
    };

    const path = `arena/default/tokens/${id}`;
    try {
      await setDoc(doc(db, 'arena', 'default', 'tokens', id), tokenDoc);
      setSpawnName('');
      setSpawnImg('');
      setSpawnCharId('');
      setShowSpawn(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteToken = async (id: string) => {
    const path = `arena/default/tokens/${id}`;
    try {
      await deleteDoc(doc(db, 'arena', 'default', 'tokens', id));
      if (selectedTokenId === id) setSelectedTokenId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleCellClick = async (x: number, y: number) => {
    if (selectedTokenId) {
      const token = tokens.find(t => t.id === selectedTokenId);
      if (!token) {
        setSelectedTokenId(null);
        return;
      }

      // Check access permission: GM can move anything; User can only move OWN PLAYER tokens
      if (!isMyToken(token)) {
        alert('Este token não pertence ao seu personagem ou você não é o mestre!');
        setSelectedTokenId(null);
        return;
      }

      // Move token physically inside grid cell
      const path = `arena/default/tokens/${token.id}`;
      try {
        await updateDoc(doc(db, 'arena', 'default', 'tokens', token.id), { x, y });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      setSelectedTokenId(null); // Deselect
    }
  };

  // Build grid matrix slots
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      // Find what tokens sit on this grid coordinate
      const cellTokens = tokens.filter(t => t.x === x && t.y === y);

      cells.push(
        <div
          key={`${x}-${y}`}
          onClick={() => handleCellClick(x, y)}
          className="border border-white/5 aspect-square relative flex items-center justify-center cursor-pointer hover:bg-yellow-500/10 transition-all duration-150"
        >
          {cellTokens.map(tk => {
            const isSelected = selectedTokenId === tk.id;
            const sizeClass = tk.type === 'OBJ' ? 'w-[90%] h-[95%]' : 'w-[85%] h-[85%]';
            const borderCol = tk.type === 'PLAYER' ? 'border-indigo-400' : tk.type === 'NPC' ? 'border-rose-500' : 'border-slate-500';

            return (
              <div
                key={tk.id}
                onClick={(e) => {
                  e.stopPropagation(); // Stop bubble so we don't trigger cell click instantly
                  if (isSelected) {
                    setSelectedTokenId(null);
                  } else {
                    setSelectedTokenId(tk.id);
                  }
                }}
                className={`absolute z-10 transition-all cursor-move select-none ${sizeClass} ${
                  isSelected ? 'scale-110 rotate-6 ring-2 ring-yellow-500 z-25' : ''
                }`}
                title={`${tk.name} (${tk.type})`}
              >
                <img
                  src={tk.img}
                  alt={tk.name}
                  className={`w-full h-full object-cover shadow-2xl ${
                    tk.type === 'OBJ' ? 'rounded-lg' : 'rounded-full'
                  } border-2 ${borderCol}`}
                  draggable={false}
                />
                
                {/* Visual tooltip bubble */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-950/85 text-[8px] text-white font-semibold font-mono tracking-wide px-1 py-0.5 rounded truncate max-w-full border border-slate-800">
                  {tk.name}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0a0a] border border-white/10 p-5 rounded-none shadow-2xl">
        <div className="flex items-center gap-3">
          <PlaySquare className="h-5 w-5 text-orange-500" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-white mb-0.5">Arena de Combate Realtime</h3>
            <span className="text-[10px] text-white/50 block font-mono">Clique no seu token, e depois no local vazio para se mover!</span>
          </div>
        </div>

        <div className="flex gap-2">
          {isGM && (
            <>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-black text-xs py-2 px-4 border border-white/10 transition-all uppercase tracking-widest"
              >
                <Sliders className="h-4 w-4" />
                Configurar Arena
              </button>

              <button
                onClick={() => setShowSpawn(!showSpawn)}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-2 px-5 transition-colors uppercase tracking-widest shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Spawnar Token
              </button>
            </>
          )}
        </div>
      </div>

      {/* GM Config Overlay Panel */}
      {showConfig && isGM && (
        <div className="bg-black border border-white/10 p-6 space-y-4 shadow-2xl">
          <p className="text-xs font-black text-orange-500 uppercase tracking-widest block italic">Ajustes Rápidos da Mesa</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">URL da Imagem de Fundo (Mapa de Grid)</label>
              <input
                type="text"
                value={bg}
                onChange={(e) => handleUpdateBg(e.target.value)}
                placeholder="Introduza um link"
                className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Sugestões de Mapas Prontos</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateBg('https://images.unsplash.com/photo-1547891654-e66ed7edd96c?auto=format&fit=crop&w=1200&q=80')}
                  className="bg-white/5 hover:bg-white/10 text-white/80 py-1.5 px-3 border border-white/10 text-[10px] font-mono uppercase tracking-widest"
                >
                  Floresta Fantasma
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateBg('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?auto=format&fit=crop&w=1200&q=80')}
                  className="bg-white/5 hover:bg-white/10 text-white/80 py-1.5 px-3 border border-white/10 text-[10px] font-mono uppercase tracking-widest"
                >
                  Mesa de Taberna Original
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GM Spawn Token Overlay */}
      {showSpawn && isGM && (
        <form onSubmit={handleSpawnToken} className="bg-black border border-white/10 p-6 space-y-5 shadow-2xl">
          <p className="text-xs font-black text-orange-500 uppercase tracking-widest block italic">Invocador de Board Tokens</p>

          <div className="flex gap-2">
            {(['NPC', 'OBJ', 'PLAYER'] as const).map(ty => (
              <button
                type="button"
                key={ty}
                onClick={() => {
                  setSpawnType(ty);
                }}
                className={`py-1.5 px-4 text-[10px] font-black uppercase tracking-widest border transition-all ${
                  spawnType === ty
                    ? 'bg-[#151515] text-orange-500 border-orange-500/30'
                    : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {ty}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {spawnType === 'PLAYER' ? (
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Selecionar Personagem Ativo</label>
                <select
                  value={spawnCharId}
                  onChange={(e) => setSpawnCharId(e.target.value)}
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none uppercase tracking-wider"
                  required
                >
                  <option value="" className="text-black">-- Selecionar da Ficha --</option>
                  {characters.map(c => (
                    <option key={c.id} value={c.id} className="text-black">{c.nome} {c.email_dono ? `(${c.email_dono})` : ''}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Nome de Exibição</label>
                  <input
                    type="text"
                    value={spawnName}
                    onChange={(e) => setSpawnName(e.target.value)}
                    placeholder="Ex: Dragão Titan, Obstáculo Árvore"
                    className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none font-sans"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">URL do Avatar</label>
                  <input
                    type="url"
                    value={spawnImg}
                    onChange={(e) => setSpawnImg(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none font-mono"
                    required
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowSpawn(false)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs uppercase tracking-widest font-black"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest transition shadow"
            >
              Confirmar e Spawnar
            </button>
          </div>
        </form>
      )}

      {/* Token Tracker Action Bar when Selected */}
      {selectedTokenId && (
        <div className="bg-[#080808] border border-orange-500/40 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-orange-500 animate-pulse"></div>
            <span className="text-xs font-mono text-orange-500 uppercase tracking-tight font-black">
              TOKEN SELECIONADO: <span className="text-white font-sans uppercase font-extrabold">{tokens.find(t => t.id === selectedTokenId)?.name}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/40 uppercase tracking-widest hidden sm:inline">
              Clique numa célula do grid para movimentar este peão
            </span>
            {isGM && (
              <button
                onClick={() => handleDeleteToken(selectedTokenId)}
                className="text-xs font-black uppercase tracking-widest bg-red-950/20 text-red-500 border border-red-900/30 hover:bg-red-950/40 hover:text-white py-2 px-4 transition"
              >
                Remover Peão
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tactical Canvas Interface */}
      <div className="w-full overflow-hidden border border-white/10 shadow-2xl relative">
        <div className="w-full overflow-auto max-h-[80vh] custom-scroll relative">
          <div
            id="arena-tabletop"
            className="grid relative"
            style={{
              gridTemplateColumns: `repeat(${gridWidth}, minmax(40px, 1fr))`,
              width: '100%',
              minWidth: '700px', // forces desktop style grid on mobile to scroll correctly!
              backgroundImage: `url(${bg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Visual overlay transparency dark mask and layout grid cells */}
            <div className="inset-0 absolute bg-black/35 pointer-events-none z-0"></div>
            
            {cells}
          </div>
        </div>
      </div>
    </div>
  );
}
