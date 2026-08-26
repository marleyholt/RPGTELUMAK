const fs = require('fs');

let gt = fs.readFileSync('src/components/GameTable.tsx', 'utf-8');

// 1. imports - include deleteDoc, getDocs
if (!gt.includes('deleteDoc')) {
  gt = gt.replace("updateDoc, doc, collection, onSnapshot, addDoc", "updateDoc, doc, collection, onSnapshot, addDoc, deleteDoc, getDocs, writeBatch");
}

// 2. Modify state and effects
const oldStateBlock = `  const [npcs, setNpcs] = useState<NPC[]>([]);
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'npcs'), (snap) => {
      const data: NPC[] = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() } as NPC);
      });
      setNpcs(data);
    }, (err) => {
      console.warn("GameTable NPCs erro:", err);
    });
    return () => unsub();
  }, []);
  const [notepadContent, setNotepadContent] = useState('');
  const [showBlankCardModal, setShowBlankCardModal] = useState(false);
  const [ephemeralNpcs, setEphemeralNpcs] = useState<NPC[]>([]);`;

const newStateBlock = `  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [ephemeralNpcs, setEphemeralNpcs] = useState<NPC[]>([]);
  
  useEffect(() => {
    const unsubNpcs = onSnapshot(collection(db, 'npcs'), (snap) => {
      const data: NPC[] = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() } as NPC);
      });
      setNpcs(data);
    }, (err) => console.warn("GameTable NPCs erro:", err));

    const unsubBattlemap = onSnapshot(collection(db, 'battlemap_npcs'), (snap) => {
      const data: NPC[] = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() } as NPC);
      });
      setEphemeralNpcs(data);
    }, (err) => console.warn("GameTable Battlemap erro:", err));

    return () => {
      unsubNpcs();
      unsubBattlemap();
    };
  }, []);
  
  const [notepadContent, setNotepadContent] = useState('');
  const [showBlankCardModal, setShowBlankCardModal] = useState(false);`;

gt = gt.replace(oldStateBlock, newStateBlock);

// 3. allActive definition
const oldAllActive = `const allActive = [...activeCharacters.map(c => ({...c, _type: 'character'})), ...activeNpcs.map(n => ({...n, _type: 'npc'})), ...ephemeralNpcs.map(n => ({...n, _type: 'npc'}))];`;
// activeNpcs is no longer used for rendering, we only use ephemeralNpcs for NPCs on the board.
const newAllActive = `const allActive = [...activeCharacters.map(c => ({...c, _type: 'character'})), ...ephemeralNpcs.map(n => ({...n, _type: 'npc'}))];`;
gt = gt.replace(oldAllActive, newAllActive);

// 4. handleCloneNpc -> handleInsertNpc
const oldCloneBlock = `    const handleCloneNpc = async (id: string) => {
    const target = npcs.find(n => n.id === id);
    if (!target) return;
    
    const ephemeralId = \`ephemeral_\${Date.now()}_\${Math.floor(Math.random() * 1000)}\`;
    const newEphemeral: NPC = {
      ...target,
      id: ephemeralId,
      name: \`\${target.name} (Cópia)\`,
      active_on_board: true
    };
    
    setEphemeralNpcs(prev => [...prev, newEphemeral]);
    setShowSelector(null);
  };`;

const newInsertBlock = `  const handleInsertNpc = async (id: string) => {
    const target = npcs.find(n => n.id === id);
    if (!target) return;
    
    const baseName = target.name;
    const sameBaseNpcs = ephemeralNpcs.filter(n => (n as any).original_name === baseName);
    const count = sameBaseNpcs.length;
    const displayName = count === 0 ? baseName : \`\${baseName} \${count + 1}\`;
    
    try {
      const { id: _, ...npcData } = target;
      await addDoc(collection(db, 'battlemap_npcs'), {
        ...npcData,
        name: displayName,
        original_name: baseName,
        createdAt: new Date().toISOString()
      });
      setShowSelector(null);
    } catch (e) {
      console.error(e);
    }
  };`;
gt = gt.replace(oldCloneBlock, newInsertBlock);
gt = gt.replace('onCloneNpc={handleCloneNpc}', 'onInsertNpc={handleInsertNpc}');

// 5. handleCreateBlankCard
const oldCreateBlankBlock = `  const handleCreateBlankCard = async () => {
    if (!blankCard.nome.trim()) return;
    
    const ephemeralId = \`ephemeral_\${Date.now()}_\${Math.floor(Math.random() * 1000)}\`;
    const newEphemeral: NPC = {
      id: ephemeralId,
      name: blankCard.nome,
      hp_max: blankCard.hp,
      hp_atual: blankCard.hp,
      ether_max: blankCard.ether,
      ether_atual: blankCard.ether,
      poder_max: blankCard.destiny,
      poder_atual: blankCard.destiny,
      ferramentas_max: blankCard.tools,
      ferramentas_atual: blankCard.tools,
      active_on_board: true,
      createdAt: new Date().toISOString(),
      content: '',
      images: [],
      coverImageIndex: 0,
      updatedAt: new Date().toISOString()
    };
    
    setEphemeralNpcs(prev => [...prev, newEphemeral]);
    setShowBlankCardModal(false);
    setBlankCard({ nome: '', hp: 10, ether: 0, destiny: 0, tools: 0 });
  };`;

const newCreateBlankBlock = `  const handleCreateBlankCard = async () => {
    if (!blankCard.nome.trim()) return;
    
    const baseName = blankCard.nome;
    const sameBaseNpcs = ephemeralNpcs.filter(n => (n as any).original_name === baseName);
    const count = sameBaseNpcs.length;
    const displayName = count === 0 ? baseName : \`\${baseName} \${count + 1}\`;
    
    try {
      await addDoc(collection(db, 'battlemap_npcs'), {
        name: displayName,
        original_name: baseName,
        hp_max: blankCard.hp,
        hp_atual: blankCard.hp,
        ether_max: blankCard.ether,
        ether_atual: blankCard.ether,
        poder_max: blankCard.destiny,
        poder_atual: blankCard.destiny,
        ferramentas_max: blankCard.tools,
        ferramentas_atual: blankCard.tools,
        createdAt: new Date().toISOString(),
        content: '',
        images: [],
        coverImageIndex: 0,
        updatedAt: new Date().toISOString()
      });
      setShowBlankCardModal(false);
      setBlankCard({ nome: '', hp: 10, ether: 0, destiny: 0, tools: 0 });
    } catch (e) {
      console.error(e);
    }
  };`;
gt = gt.replace(oldCreateBlankCard, newCreateBlankBlock);

// 6. handleUpdateNpcMarker
const oldUpdateNpcBlock = `  const handleUpdateNpcMarker = async (npcId: string, field: string, amount: number, current: number = 0) => {
    let newVal = current + amount;
    
    // Check if ephemeral
    if (ephemeralNpcs.some(n => n.id === npcId)) {
      setEphemeralNpcs(prev => prev.map(n => n.id === npcId ? { ...n, [field]: newVal } : n));
      return;
    }
    
    try {
      await updateDoc(doc(db, 'npcs', npcId), { [field]: newVal });
    } catch (e) {
      console.error("Erro ao atualizar marcador npc:", e);
    }
  };`;
const newUpdateNpcBlock = `  const handleUpdateNpcMarker = async (npcId: string, field: string, amount: number, current: number = 0) => {
    let newVal = current + amount;
    try {
      await updateDoc(doc(db, 'battlemap_npcs', npcId), { [field]: newVal });
    } catch (e) {
      console.error("Erro ao atualizar marcador npc:", e);
    }
  };`;
gt = gt.replace(oldUpdateNpcBlock, newUpdateNpcBlock);

// 7. handleToggleBoard
const oldToggleBoard = `  const handleToggleBoard = async (id: string, type: 'character' | 'npc', currentVal: boolean) => {
    if (type === 'npc' && currentVal === true) {
      if (ephemeralNpcs.some(n => n.id === id)) {
         setEphemeralNpcs(prev => prev.filter(n => n.id !== id));
         return;
      }
    }

    const collectionName = type === 'character' ? 'characters' : 'npcs';
    try {
      await updateDoc(doc(db, collectionName, id), { active_on_board: !currentVal });
    } catch (e) {
      console.error(e);
    }
  };`;
const newToggleBoard = `  const handleToggleBoard = async (id: string, type: 'character' | 'npc', currentVal: boolean) => {
    if (type === 'npc') {
      try {
        await deleteDoc(doc(db, 'battlemap_npcs', id));
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      await updateDoc(doc(db, 'characters', id), { active_on_board: !currentVal });
    } catch (e) {
      console.error(e);
    }
  };`;
gt = gt.replace(oldToggleBoard, newToggleBoard);

// 8. Add "Limpar Mesa" button and function
const clearBoardFunction = `  const handleClearBoard = async () => {
    if (!confirm("Tem certeza que deseja limpar a mesa? Todos os NPCs e cards serão removidos e os aventureiros retornarão ao banco.")) return;
    try {
      const snap = await getDocs(collection(db, 'battlemap_npcs'));
      const batch = writeBatch(db);
      snap.forEach(d => {
        batch.delete(d.ref);
      });
      activeCharacters.forEach(c => {
        batch.update(doc(db, 'characters', c.id), { active_on_board: false });
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };`;
if (!gt.includes('handleClearBoard')) {
    gt = gt.replace('  return (', clearBoardFunction + '\n\n  return (');
}

// Add the button to the header
const headerButtons = `<div className="flex gap-2">
          <button onClick={() => setShowSelector('character')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase rounded shadow">
            <Plus className="w-3.5 h-3.5" /> Adicionar Player
          </button>
          <button onClick={() => setShowSelector('npc')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded shadow">
            <Plus className="w-3.5 h-3.5" /> Adicionar NPC
          </button>
          <button onClick={() => setShowBlankCardModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-600 hover:bg-zinc-500 text-white text-xs font-bold uppercase rounded shadow">
            <FileText className="w-3.5 h-3.5" /> Criar Card
          </button>
        </div>`;

const newHeaderButtons = `<div className="flex gap-2">
          <button onClick={() => setShowSelector('character')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase rounded shadow">
            <Plus className="w-3.5 h-3.5" /> Player
          </button>
          <button onClick={() => setShowSelector('npc')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded shadow">
            <Plus className="w-3.5 h-3.5" /> NPC
          </button>
          <button onClick={() => setShowBlankCardModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-600 hover:bg-zinc-500 text-white text-xs font-bold uppercase rounded shadow">
            <FileText className="w-3.5 h-3.5" /> Criar Card
          </button>
          <button onClick={handleClearBoard} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase rounded shadow ml-2">
            <X className="w-3.5 h-3.5" /> Limpar Mesa
          </button>
        </div>`;
gt = gt.replace(headerButtons, newHeaderButtons);

// Remove the "onToggleNpc" from NpcSelectorWindow in JSX since we don't use it anymore
const oldSelectorWindow = `<NpcSelectorWindow 
          npcs={npcs} 
          openNpcIds={activeNpcs.map(n => n.id)} 
          onToggleNpc={(id) => {
            const isAct = activeNpcs.some(n => n.id === id);
            handleToggleBoard(id, 'npc', isAct);
            setShowSelector(null);
          }}
          onInsertNpc={handleInsertNpc}
          onClose={() => setShowSelector(null)}
        />`;

const newSelectorWindow = `<NpcSelectorWindow 
          npcs={npcs} 
          onInsertNpc={handleInsertNpc}
          onClose={() => setShowSelector(null)}
        />`;
gt = gt.replace(oldSelectorWindow, newSelectorWindow);

fs.writeFileSync('src/components/GameTable.tsx', gt);
console.log("GameTable updated.");
