import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArenaToken, Character } from '../types';
import { 
  Plus, Trash2, Sliders, PlaySquare, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Scan, RefreshCw, X, Shield, Users, 
  Check, Move, Eye
} from 'lucide-react';
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

  // Viewport / Zoom / Fit State
  const [autoFit, setAutoFit] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 });

  // GM Config / Spawner modals
  const [showConfig, setShowConfig] = useState(false);
  const [showSpawn, setShowSpawn] = useState(false);
  const [spawnType, setSpawnType] = useState<'PLAYER' | 'NPC' | 'OBJ'>('NPC');
  const [spawnName, setSpawnName] = useState('');
  const [spawnImg, setSpawnImg] = useState('');
  const [spawnCharId, setSpawnCharId] = useState('');
  const [spawnSqm, setSpawnSqm] = useState<number>(1);

  // Grid dimensions form for GM
  const [customGridW, setCustomGridW] = useState(20);
  const [customGridH, setCustomGridH] = useState(12);

  // Combat selection state
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  // Track viewport container dimensions with ResizeObserver
  useEffect(() => {
    if (!viewportRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      }
    });

    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  // Listen to Firestore Arena state and tokens
  useEffect(() => {
    const arenaDocPath = 'arena/default';
    const unsubArena = onSnapshot(doc(db, 'arena', 'default'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.bg) setBg(data.bg);
        if (data.gridWidth) {
          setGridWidth(data.gridWidth);
          setCustomGridW(data.gridWidth);
        }
        if (data.gridHeight) {
          setGridHeight(data.gridHeight);
          setCustomGridH(data.gridHeight);
        }
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

  // Toggle Fullscreen on wrapper
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Calculate cell size based on autoFit or manual zoom
  const calculatedCellSize = React.useMemo(() => {
    const padding = 24;
    const availableW = Math.max(100, containerSize.width - padding);
    const availableH = Math.max(100, containerSize.height - padding);

    const fitSize = Math.max(16, Math.floor(Math.min(availableW / gridWidth, availableH / gridHeight)));

    if (autoFit) {
      return fitSize;
    }
    return Math.max(20, Math.round(fitSize * zoomLevel));
  }, [containerSize, gridWidth, gridHeight, autoFit, zoomLevel]);

  const gridPixelWidth = calculatedCellSize * gridWidth;
  const gridPixelHeight = calculatedCellSize * gridHeight;

  // Background update
  const handleUpdateBg = async (newUrl: string) => {
    if (!newUrl) return;
    const path = 'arena/default';
    try {
      await updateDoc(doc(db, 'arena', 'default'), { bg: newUrl });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  // Dimensions update (GM)
  const handleSaveGridDimensions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGM) return;
    const w = Math.max(5, Math.min(50, Number(customGridW) || 20));
    const h = Math.max(5, Math.min(50, Number(customGridH) || 12));
    try {
      await updateDoc(doc(db, 'arena', 'default'), { gridWidth: w, gridHeight: h });
      setShowConfig(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'arena/default');
    }
  };

  // Spawn Token
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
      x: Math.floor(gridWidth / 2),
      y: Math.floor(gridHeight / 2),
      sqm: Number(spawnSqm) || 1,
      ...(charId ? { charId } : {})
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

  const myActiveTableChars = characters.filter(c => c.email_dono === currentUserEmail && c.ativo_na_mesa && !c.arquivado);
  const activeTableCharacters = characters.filter(c => c.ativo_na_mesa && !c.arquivado);

  const canControlToken = (tk: ArenaToken) => {
    if (isGM) return true;
    if (tk.type === 'PLAYER' && tk.charId) {
      return myActiveTableChars.some(c => c.id === tk.charId);
    }
    return false;
  };

  const handleCellClick = async (x: number, y: number) => {
    if (hasDragged.current) return;
    if (selectedTokenId) {
      const token = tokens.find(t => t.id === selectedTokenId);
      if (!token || !canControlToken(token)) {
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

  // Mouse pan handlers when not in autoFit mode
  const handleMouseDown = (e: React.MouseEvent) => {
    if (autoFit) return;
    if (e.button === 0 && (e.target as HTMLElement).tagName !== 'BUTTON') {
      setIsPanning(true);
      hasDragged.current = false;
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || autoFit) return;
    hasDragged.current = true;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setTimeout(() => { hasDragged.current = false; }, 50);
  };

  const resetPanAndFit = () => {
    setAutoFit(true);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const selectedToken = tokens.find(t => t.id === selectedTokenId);

  // Build grid matrix slots
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const cellTokens = tokens.filter(t => t.x === x && t.y === y);
      const isGridInteractive = isGM || !!selectedTokenId;

      cells.push(
        <div
          key={`${x}-${y}`}
          onClick={() => isGridInteractive && handleCellClick(x, y)}
          style={{
            width: calculatedCellSize,
            height: calculatedCellSize,
          }}
          className={`border border-white/15 relative flex items-center justify-center transition-colors ${
            isGridInteractive ? 'cursor-pointer hover:bg-blue-500/25' : 'cursor-default'
          }`}
        >
          {/* Coordinates indicator on hover / GM */}
          <span className="opacity-0 hover:opacity-100 absolute top-0.5 left-0.5 text-[7px] font-mono text-white/40 pointer-events-none z-10 select-none">
            {x},{y}
          </span>

          {cellTokens.map(tk => {
            const isSelected = selectedTokenId === tk.id;
            const sqm = tk.sqm || 1;
            const borderCol = tk.type === 'PLAYER' 
              ? 'border-cyan-400 ring-cyan-500/50' 
              : tk.type === 'NPC' 
              ? 'border-rose-500 ring-rose-500/50' 
              : 'border-amber-400 ring-amber-500/50';
            const userCanControl = canControlToken(tk);

            return (
              <div
                key={tk.id}
                onClick={(e) => {
                  if (hasDragged.current) return;
                  if (!userCanControl) return;
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
                  userCanControl ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                } ${isSelected ? 'scale-105 ring-2 ring-blue-400 z-30' : ''}`}
                title={`${tk.name} (${tk.type}) - ${sqm}x${sqm} SQM ${userCanControl ? '(Clique para mover)' : ''}`}
              >
                <div className="relative w-full h-full group">
                  <img
                    src={tk.img}
                    alt={tk.name}
                    className={`w-full h-full object-cover shadow-2xl ${
                      tk.type === 'OBJ' ? 'rounded-md' : 'rounded-full'
                    } border-2 ${borderCol}`}
                    draggable={false}
                  />
                  
                  {/* Token Name Tag */}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black/90 text-[8px] text-white font-black font-mono tracking-wider px-1.5 py-0.2 rounded whitespace-nowrap max-w-[140%] truncate border border-white/20 shadow pointer-events-none">
                    {tk.name} {sqm > 1 && `[${sqm}x${sqm}]`}
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
    <div 
      ref={containerRef} 
      className="w-full h-full flex flex-col bg-[#050505] text-white overflow-hidden select-none"
    >
      {/* 1. TOP HUD CONTROL BAR */}
      <div className="h-12 bg-[#0c0d0e] border-b border-white/10 px-3 py-1 flex items-center justify-between shrink-0 gap-2 z-30">
        
        {/* Left: Map Title & Status */}
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/30 text-sky-400 shrink-0">
            <PlaySquare className="h-4 w-4" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-tight text-white truncate">
                Arena Tática
              </span>
              <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 border ${
                isGM 
                  ? 'bg-blue-500/20 text-sky-400 border-blue-500/40' 
                  : 'bg-white/5 text-white/60 border-white/10'
              }`}>
                {isGM ? '👑 GM' : '👁️ Jogador'}
              </span>
              <span className="text-[10px] text-white/40 font-mono hidden sm:inline">
                {gridWidth}x{gridHeight} SQM • {tokens.length} Tokens
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Viewport Zoom & Fit Controls */}
        <div className="flex items-center gap-1.5">
          {/* Fit Screen Mode */}
          <button
            type="button"
            onClick={resetPanAndFit}
            className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 rounded transition border ${
              autoFit 
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                : 'bg-[#181818] hover:bg-[#222] text-white/70 hover:text-white border-white/10'
            }`}
            title="Ajustar grade perfeitamente à tela sem rolagens"
          >
            <Scan className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ajustar à Tela</span>
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => {
              setAutoFit(false);
              setZoomLevel(prev => Math.max(0.5, prev - 0.2));
            }}
            className="p-1.5 bg-[#181818] hover:bg-[#252525] text-white/80 hover:text-white border border-white/10 rounded transition"
            title="Diminuir Zoom"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => {
              setAutoFit(false);
              setZoomLevel(prev => Math.min(3.0, prev + 0.2));
            }}
            className="p-1.5 bg-[#181818] hover:bg-[#252525] text-white/80 hover:text-white border border-white/10 rounded transition"
            title="Aumentar Zoom"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 bg-[#181818] hover:bg-[#252525] text-white/80 hover:text-white border border-white/10 rounded transition"
            title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* GM Tools */}
          {isGM && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/10">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className={`p-1.5 sm:px-2.5 sm:py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 rounded transition border ${
                  showConfig 
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' 
                    : 'bg-[#181818] hover:bg-[#222] text-white/80 hover:text-white border-white/10'
                }`}
                title="Configurar Cenário, Grid e Dimensões"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Cenário & Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSpawn(!showSpawn)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] rounded transition uppercase tracking-wider flex items-center gap-1 shadow"
                title="Adicionar Token ao Grid"
              >
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Novo Token</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 2. GM ACTION BAR ON TOKEN SELECT */}
      {selectedToken && (
        <div className="bg-[#121316] border-b border-blue-500/40 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20 shadow-lg text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-blue-400 shrink-0">
              <img src={selectedToken.img} alt={selectedToken.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-white uppercase">{selectedToken.name}</span>
              <span className="text-[10px] text-white/50 font-mono ml-2">
                ({selectedToken.x}, {selectedToken.y}) • {selectedToken.sqm || 1}x{selectedToken.sqm || 1} SQM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-sky-300 font-mono">
              Clique na célula do grid para mover
            </span>

            {isGM && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleUpdateTokenSqm(selectedToken.id, s)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-bold border rounded transition ${
                      (selectedToken.sqm || 1) === s
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#222] text-white/60 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {s}x{s}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleDeleteToken(selectedToken.id)}
                  className="text-[10px] font-bold uppercase bg-red-950/40 text-red-400 border border-red-900/40 hover:bg-red-900/60 hover:text-white px-2 py-0.5 rounded ml-1 transition"
                >
                  Remover
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedTokenId(null)}
              className="p-1 text-white/40 hover:text-white transition"
              title="Deselecionar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. GM CONFIGURATION MODAL / PANEL */}
      {showConfig && isGM && (
        <div className="bg-[#101114] border-b border-white/10 p-4 space-y-4 shrink-0 shadow-2xl z-20 max-h-[60vh] overflow-y-auto custom-scroll">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders className="h-4 w-4" />
              Configurações de Cenário e Dimensões do Grid
            </h4>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="text-white/40 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Background Image Upload & Presets */}
            <div className="space-y-3">
              <ImageUploadField
                label="Fazer Upload da Imagem de Fundo (Do Computador)"
                value={bg}
                onChange={handleUpdateBg}
                maxWidth={1920}
                maxHeight={1440}
                helperText="Envie qualquer imagem de mapa ou cenário tático"
              />

              <div>
                <label className="block text-[10px] text-white/50 font-bold uppercase tracking-wider mb-1.5">
                  Cenários Prontos Rápidos
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateBg('https://images.unsplash.com/photo-1547891654-e66ed7edd96c?auto=format&fit=crop&w=1400&q=80')}
                    className="bg-[#181818] hover:bg-[#222] text-white p-2 border border-white/10 text-left transition rounded"
                  >
                    <span className="block text-xs font-black uppercase text-sky-400">Floresta Sombria</span>
                    <span className="text-[9px] text-white/40 font-mono">Vegetação densa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateBg('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?auto=format&fit=crop&w=1400&q=80')}
                    className="bg-[#181818] hover:bg-[#222] text-white p-2 border border-white/10 text-left transition rounded"
                  >
                    <span className="block text-xs font-black uppercase text-sky-400">Taberna Telumak</span>
                    <span className="text-[9px] text-white/40 font-mono">Interior rústico</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Width and Height Form */}
            <form onSubmit={handleSaveGridDimensions} className="space-y-3 bg-[#16171b] p-3.5 rounded border border-white/5">
              <label className="block text-[10px] text-white/60 font-black uppercase tracking-wider">
                Dimensões da Grade Tática (Colunas x Linhas)
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-mono mb-1">
                    Largura (Colunas)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={customGridW}
                    onChange={(e) => setCustomGridW(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-mono mb-1">
                    Altura (Linhas)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={customGridH}
                    onChange={(e) => setCustomGridH(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-[10px] text-white/40 font-mono">
                Ao alterar o tamanho do grid, a visualização se adapta automaticamente na tela de todos os jogadores conectados.
              </p>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded transition"
                >
                  Salvar Dimensões
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. GM SPAWN TOKEN MODAL */}
      {showSpawn && isGM && (
        <form onSubmit={handleSpawnToken} className="bg-[#101114] border-b border-white/10 p-4 space-y-4 shrink-0 shadow-2xl z-20 max-h-[60vh] overflow-y-auto custom-scroll">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Adicionar Novo Token ao Grid Tático
            </h4>
            <button
              type="button"
              onClick={() => setShowSpawn(false)}
              className="text-white/40 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2">
            {(['NPC', 'OBJ', 'PLAYER'] as const).map(ty => (
              <button
                type="button"
                key={ty}
                onClick={() => setSpawnType(ty)}
                className={`py-1 px-3 text-[10px] font-black uppercase tracking-widest rounded border transition ${
                  spawnType === ty
                    ? 'bg-blue-600/30 text-sky-400 border-blue-500/50'
                    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {ty === 'PLAYER' ? 'Jogador' : ty === 'NPC' ? 'Monstro / NPC' : 'Objeto / Elemento'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {spawnType === 'PLAYER' ? (
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-white/50 mb-1 font-bold uppercase tracking-wider">
                  Selecionar Personagem Cadastrado
                </label>
                <select
                  value={spawnCharId}
                  onChange={(e) => setSpawnCharId(e.target.value)}
                  className="w-full bg-[#16171b] border border-white/10 px-3 py-2 text-white text-xs rounded focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="" className="text-black">-- Selecionar da Ficha --</option>
                  {activeTableCharacters.map(c => (
                    <option key={c.id} value={c.id} className="text-black">{c.nome} {c.email_dono ? `(${c.email_dono})` : ''}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] text-white/50 mb-1 font-bold uppercase tracking-wider">
                    Nome do Token
                  </label>
                  <input
                    type="text"
                    value={spawnName}
                    onChange={(e) => setSpawnName(e.target.value)}
                    placeholder="Ex: Chefe Orc, Baú, Lobo"
                    className="w-full bg-[#16171b] border border-white/10 px-3 py-2 text-white text-xs rounded focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <ImageUploadField
                    label="Foto do Token (Upload)"
                    value={spawnImg}
                    onChange={setSpawnImg}
                    helperText="Carregue a foto do monstro ou objeto"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] text-white/50 mb-1 font-bold uppercase tracking-wider">
                Tamanho em SQM (Espaço no Grid)
              </label>
              <select
                value={spawnSqm}
                onChange={(e) => setSpawnSqm(Number(e.target.value))}
                className="w-full bg-[#16171b] border border-white/10 px-3 py-2 text-white text-xs rounded focus:border-blue-500 focus:outline-none font-mono"
              >
                <option value={1} className="text-black">1x1 SQM (Médio / Humanoide)</option>
                <option value={2} className="text-black">2x2 SQM (Grande - Ogro, Fera)</option>
                <option value={3} className="text-black">3x3 SQM (Enorme - Hidra, Titã)</option>
                <option value={4} className="text-black">4x4 SQM (Colossal - Dragão Ancestral)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowSpawn(false)}
              className="px-3 py-1.5 text-white/60 hover:text-white text-xs uppercase tracking-wider font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded shadow transition"
            >
              Spawnar no Grid
            </button>
          </div>
        </form>
      )}

      {/* 5. MAIN TACTICAL GRID VIEWPORT (Zero-Scroll Adaptive Canvas) */}
      <div 
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 w-full h-full relative overflow-hidden flex items-center justify-center bg-[#020202] ${
          !autoFit ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <div
          style={{
            width: gridPixelWidth,
            height: gridPixelHeight,
            transform: !autoFit ? `translate(${panOffset.x}px, ${panOffset.y}px)` : 'none',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
            backgroundImage: `url(${bg})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
          }}
          className="relative shadow-2xl border border-white/20 select-none shrink-0"
        >
          {/* Ambient Darkness / Grid Tint Overlay */}
          <div className="inset-0 absolute bg-black/40 pointer-events-none z-0" />

          {/* CSS Grid of Cells */}
          <div
            className="w-full h-full grid relative z-10"
            style={{
              gridTemplateColumns: `repeat(${gridWidth}, ${calculatedCellSize}px)`,
              gridTemplateRows: `repeat(${gridHeight}, ${calculatedCellSize}px)`,
            }}
          >
            {cells}
          </div>
        </div>
      </div>

    </div>
  );
}
