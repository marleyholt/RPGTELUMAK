const fs = require('fs');

let gt = fs.readFileSync('src/components/GameTable.tsx', 'utf-8');

// Add ephemeralNpcs state
if (!gt.includes('ephemeralNpcs')) {
  gt = gt.replace(
    "const [showBlankCardModal, setShowBlankCardModal] = useState(false);",
    "const [showBlankCardModal, setShowBlankCardModal] = useState(false);\n  const [ephemeralNpcs, setEphemeralNpcs] = useState<NPC[]>([]);"
  );
}

// Modify allActive
gt = gt.replace(
  "const allActive = [...activeCharacters.map(c => ({...c, _type: 'character'})), ...activeNpcs.map(n => ({...n, _type: 'npc'}))];",
  "const allActive = [...activeCharacters.map(c => ({...c, _type: 'character'})), ...activeNpcs.map(n => ({...n, _type: 'npc'})), ...ephemeralNpcs.map(n => ({...n, _type: 'npc'}))];"
);

// Modify handleUpdateNpcMarker
const oldUpdateNpcMarker = `  const handleUpdateNpcMarker = async (npcId: string, field: string, amount: number, current: number = 0) => {
    let newVal = current + amount;
    try {
      await updateDoc(doc(db, 'npcs', npcId), { [field]: newVal });
    } catch (e) {
      console.error("Erro ao atualizar marcador npc:", e);
    }
  };`;
  
const newUpdateNpcMarker = `  const handleUpdateNpcMarker = async (npcId: string, field: string, amount: number, current: number = 0) => {
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
gt = gt.replace(oldUpdateNpcMarker, newUpdateNpcMarker);

// Modify handleToggleBoard
const oldToggleBoard = `  const handleToggleBoard = async (id: string, type: 'character' | 'npc', currentVal: boolean) => {
    const collectionName = type === 'character' ? 'characters' : 'npcs';
    try {
      await updateDoc(doc(db, collectionName, id), { active_on_board: !currentVal });
    } catch (e) {
      console.error(e);
    }
  };`;
const newToggleBoard = `  const handleToggleBoard = async (id: string, type: 'character' | 'npc', currentVal: boolean) => {
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
gt = gt.replace(oldToggleBoard, newToggleBoard);

// Modify handleCloneNpc
const oldCloneNpc = `  const handleCloneNpc = async (id: string) => {
    const target = npcs.find(n => n.id === id);
    if (!target) return;
    try {
      const { id: _, ...npcData } = target;
      await addDoc(collection(db, 'npcs'), {
        ...npcData,
        name: \`\${npcData.name} (Cópia)\`,
        active_on_board: true,
        createdAt: new Date().toISOString()
      });
      setShowSelector(null);
    } catch (e) {
      console.error(e);
    }
  };`;
const newCloneNpc = `  const handleCloneNpc = async (id: string) => {
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
gt = gt.replace(oldCloneNpc, newCloneNpc);

// Modify handleCreateBlankCard
const oldCreateBlankCard = `  const handleCreateBlankCard = async () => {
    if (!blankCard.nome.trim()) return;
    try {
      await addDoc(collection(db, 'npcs'), {
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
        createdAt: new Date().toISOString()
      });
      setShowBlankCardModal(false);
      setBlankCard({ nome: '', hp: 10, ether: 0, destiny: 0, tools: 0 });
    } catch (e) {
      console.error(e);
    }
  };`;
const newCreateBlankCard = `  const handleCreateBlankCard = async () => {
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
gt = gt.replace(oldCreateBlankCard, newCreateBlankCard);

fs.writeFileSync('src/components/GameTable.tsx', gt);

console.log("Patched Gametable Ephemeral");
