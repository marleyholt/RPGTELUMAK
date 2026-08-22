import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArenaToken, Character } from '../types';
import { Map, Plus, Trash2, Edit2, Move, User, Sliders, PlaySquare, Shield, Upload } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errors';
import { ImageUploadField } from './ImageUploadField';

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
  const [spawnSqm, setSpawnSqm] = useState<number>(1);

  // Combat selection state (GM only)
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

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

    if (!name || !img) {
      alert('Preencha o nome e selecione uma foto para o token.');
      return;
    }

    const id = `token_${Date.now()}`;
    const tokenDoc: ArenaToken = {
      id,
      name,
      img,
      type: spawnType,
      x: 1,
      y: 1,
      sqm: Number(spawnSqm) || 1,
      charId: charId || undefined
    };

    const path = `arena/default/tokens/${id}`;
    try {
      await setDoc(doc(db, 'arena', 'default', 'tokens', id), tokenDoc);
      setSpawnName('');
      setSpawnImg('');
      setSpawnCharId('');
      setSpawnSqm(1);
      setShowSpawn(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteToken = async (id: string) => {
    if (!isGM) return;
    const path = `arena/default/tokens/${id}`;
    try {
      await deleteDoc(doc(db, 'arena', 'default', 'tokens', id));
      if (selectedTokenId === id) setSelectedTokenId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleUpdateTokenSqm = async (id: string, newSqm: number) => {
    if (!isGM) return;
    const path = `arena/default/tokens/${id}`;
    try {
      await updateDoc(doc(db, 'arena', 'default', 'tokens', id), { sqm: newSqm });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleCellClick = async (x: number, y: number) => {
    // Only GM can move pieces on the board
    if (!isGM) return;

    if (selectedTokenId) {
      const token = tokens.find(t => t.id === selectedTokenId);
      if (!token) {
        setSelectedTokenId(null);
        return;
      }

      // Move token to clicked coordinates
      const path = `arena/default/tokens/${token.id}`;
      try {
        await updateDoc(doc(db, 'arena', 'default', 'tokens', token.id), { x, y });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      setSelectedTokenId(null);
    }
  };

  const selectedToken = tokens.find(t => t.id === selectedTokenId);

  // Build grid matrix slots
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const cellTokens = tokens.filter(t => t.x === x && t.y === y);

      cells.push(
        <div
          key={`${x}-${y}`}
          onClick={() => isGM && handleCellClick(x, y)}
          className={`border border-white/10 aspect-square relative flex items-center justify-center transition-all duration-150 ${
            isGM ? 'cursor-pointer hover:bg-orange-500/15' : 'cursor-default'
          }`}
        >
          {cellTokens.map(tk => {
            const isSelected = selectedTokenId === tk.id;
            const sqm = tk.sqm || 1;
            const borderCol = tk.type === 'PLAYER' ? 'border-cyan-400' : tk.type === 'NPC' ? 'border-rose-500' : 'border-amber-400';

            return (
              <div
                key={tk.id}
                onClick={(e) => {
                  if (!isGM) return;
                  e.stopPropagation();
                  setSelectedTokenId(isSelected ? null : tk.id);
                }}
                style={{
                  width: `${sqm * 100}%`,
                  height: `${sqm * 100}%`,
                  minWidth: `${sqm * 100}%`,
                  minHeight: `${sqm * 100}%`,
                }}
                className={`absolute top-0 left-0 z-20 transition-all select-none flex items-center justify-center p-0.5 ${
                  isGM ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                } ${isSelected ? 'scale-105 ring-2 ring-orange-500 z-30' : ''}`}
                title={`${tk.name} (${tk.type}) - ${sqm}x${sqm} SQM`}
              >
                <div className="relative w-full h-full">
                  <img
                    src={tk.img}
                    alt={tk.name}
                    className={`w-full h-full object-cover shadow-2xl ${
                      tk.type === 'OBJ' ? 'rounded-md' : 'rounded-full'
                    } border-2 ${borderCol}`}
                    draggable={false}
                  />
                  
                  {/* Token Label */}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black/90 text-[8px] text-white font-black font-mono tracking-wider px-1.5 py-0.2 rounded whitespace-nowrap max-w-[120%] truncate border border-white/20 shadow">
                    {tk.name} {sqm > 1 && `[${sqm} SQM]`}
                  </div>
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
      {/* Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0a0a] border border-white/10 p-5 rounded-none shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 border border-orange-500/30 text-orange-500">
            <PlaySquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-tight text-white">Arena Tática Realtime</h3>
              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 border ${
                isGM 
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' 
                  : 'bg-white/5 text-white/50 border-white/10'
              }`}>
                {isGM ? '👑 Controle Total do Mestre' : '👁️ Visualização de Jogador'}
              </span>
            </div>
            <span className="text-[10px] text-white/50 block font-mono">
              {isGM 
                ? 'Clique num token para selecionar e clique na célula de destino para movimentar.' 
                : 'O Mestre controla a movimentação dos peões e o cenário em tempo real.'}
            </span>
          </div>
        </div>

        {/* GM Only Action Buttons */}
        {isGM && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-black text-xs py-2 px-4 border border-white/10 transition-all uppercase tracking-widest"
            >
              <Sliders className="h-4 w-4" />
              Fundo & Grid
            </button>

            <button
              onClick={() => setShowSpawn(!showSpawn)}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-2 px-5 transition-colors uppercase tracking-widest shadow-lg"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Novo Token
            </button>
          </div>
        )}
      </div>

      {/* GM Config Overlay Panel (Background Upload & Dimensions) */}
      {showConfig && isGM && (
        <div className="bg-black border border-white/10 p-6 space-y-4 shadow-2xl animate-in fade-in">
          <p className="text-xs font-black text-orange-500 uppercase tracking-widest block italic">
            Configurar Fundo do Mapa da Arena
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <ImageUploadField
                label="Fazer Upload da Imagem de Fundo (Do Computador)"
                value={bg}
                onChange={handleUpdateBg}
                maxWidth={1600}
                maxHeight={1200}
                helperText="Envie qualquer imagem de mapa ou cenário tático"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] text-white/50 font-bold uppercase tracking-wider">
                Mapas Prontos de Cenário
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateBg('https://images.unsplash.com/photo-1547891654-e66ed7edd96c?auto=format&fit=crop&w=1200&q=80')}
                  className="bg-[#0c0c0c] hover:bg-[#181818] text-white p-3 border border-white/10 text-left transition"
                >
                  <span className="block text-xs font-black uppercase text-orange-400">Floresta Sombria</span>
                  <span className="text-[9px] text-white/40 font-mono">Vegetação densa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateBg('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?auto=format&fit=crop&w=1200&q=80')}
                  className="bg-[#0c0c0c] hover:bg-[#181818] text-white p-3 border border-white/10 text-left transition"
                >
                  <span className="block text-xs font-black uppercase text-orange-400">Taberna Telumak</span>
                  <span className="text-[9px] text-white/40 font-mono">Interior rústico</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GM Spawn Token Overlay */}
      {showSpawn && isGM && (
        <form onSubmit={handleSpawnToken} className="bg-black border border-white/10 p-6 space-y-5 shadow-2xl animate-in fade-in">
          <p className="text-xs font-black text-orange-500 uppercase tracking-widest block italic">
            Adicionar Token ao Grid (com Tamanho SQM)
          </p>

          <div className="flex gap-2">
            {(['NPC', 'OBJ', 'PLAYER'] as const).map(ty => (
              <button
                type="button"
                key={ty}
                onClick={() => setSpawnType(ty)}
                className={`py-1.5 px-4 text-[10px] font-black uppercase tracking-widest border transition-all ${
                  spawnType === ty
                    ? 'bg-[#151515] text-orange-500 border-orange-500/30'
                    : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {ty === 'PLAYER' ? 'Jogador' : ty === 'NPC' ? 'Monstro / Inimigo (NPC)' : 'Objeto / Elemento'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {spawnType === 'PLAYER' ? (
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">
                  Selecionar Personagem Cadastrado
                </label>
                <select
                  value={spawnCharId}
                  onChange={(e) => setSpawnCharId(e.target.value)}
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-white text-xs focus:border-orange-500 focus:outline-none uppercase tracking-wider"
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
                  <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">
                    Nome do Token
                  </label>
                  <input
                    type="text"
                    value={spawnName}
                    onChange={(e) => setSpawnName(e.target.value)}
                    placeholder="Ex: Dragão Titan, Chefe Orc, Baú"
                    className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-white text-xs focus:border-orange-500 focus:outline-none font-sans"
                    required
                  />
                </div>
                <div>
                  <ImageUploadField
                    label="Foto do Token (Upload Direto)"
                    value={spawnImg}
                    onChange={setSpawnImg}
                    helperText="Carregue a foto do monstro ou objeto"
                  />
                </div>
              </>
            )}

            {/* SQM Token Size Selector */}
            <div>
              <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">
                Tamanho em SQM (Espaço no Grid)
              </label>
              <select
                value={spawnSqm}
                onChange={(e) => setSpawnSqm(Number(e.target.value))}
                className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-white text-xs focus:border-orange-500 focus:outline-none font-mono"
              >
                <option value={1} className="text-black">1x1 SQM (Padrão - Médio / Humanoide)</option>
                <option value={2} className="text-black">2x2 SQM (Grande - Cavalo, Ogro, Fera)</option>
                <option value={3} className="text-black">3x3 SQM (Enorme - Gigante, Hidra)</option>
                <option value={4} className="text-black">4x4 SQM (Colossal - Dragão Ancestral, Titã)</option>
              </select>
            </div>
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
              Spawnar na Arena
            </button>
          </div>
        </form>
      )}

      {/* Token Action Bar when Selected by GM */}
      {selectedToken && isGM && (
        <div className="bg-[#080808] border border-orange-500/40 p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-orange-500 shrink-0">
              <img src={selectedToken.img} alt={selectedToken.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xs font-mono text-orange-500 uppercase tracking-tight font-black block">
                PEÃO SELECIONADO: <span className="text-white font-sans uppercase font-extrabold">{selectedToken.name}</span>
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                Posição: ({selectedToken.x}, {selectedToken.y}) • Tamanho: {selectedToken.sqm || 1}x{selectedToken.sqm || 1} SQM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick SQM size changer */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/50 uppercase font-bold">Tamanho SQM:</span>
              {[1, 2, 3, 4].map(s => (
                <button
                  key={s}
                  onClick={() => handleUpdateTokenSqm(selectedToken.id, s)}
                  className={`px-2 py-1 text-xs font-mono font-bold border transition ${
                    (selectedToken.sqm || 1) === s
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {s}x{s}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleDeleteToken(selectedToken.id)}
              className="text-xs font-black uppercase tracking-widest bg-red-950/20 text-red-500 border border-red-900/30 hover:bg-red-950/40 hover:text-white py-1.5 px-3 transition"
            >
              Remover
            </button>
          </div>
        </div>
      )}

      {/* Tactical Grid Tabletop */}
      <div className="w-full overflow-hidden border border-white/10 shadow-2xl relative bg-black">
        <div className="w-full overflow-auto max-h-[75vh] custom-scroll relative">
          <div
            id="arena-tabletop"
            className="grid relative"
            style={{
              gridTemplateColumns: `repeat(${gridWidth}, minmax(44px, 1fr))`,
              width: '100%',
              minWidth: '750px',
              backgroundImage: `url(${bg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Ambient Darkness overlay */}
            <div className="inset-0 absolute bg-black/40 pointer-events-none z-0"></div>
            
            {cells}
          </div>
        </div>
      </div>
    </div>
  );
}
