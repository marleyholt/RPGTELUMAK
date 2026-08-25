const fs = require('fs');
let code = fs.readFileSync('src/components/GameTable.tsx', 'utf-8');

code = code.replace(
  "import { updateDoc, doc } from 'firebase/firestore';",
  "import { updateDoc, doc, collection, onSnapshot } from 'firebase/firestore';\nimport { useEffect } from 'react';"
);

code = code.replace(
  "export function GameTable({ characters, npcs, onQuickEditChar, onOpenCharSheet, onOpenNpcSheet }: GameTableProps) {",
  `export function GameTable({ characters, onQuickEditChar, onOpenCharSheet, onOpenNpcSheet }: Omit<GameTableProps, 'npcs'>) {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'npcs'), (snap) => {
      const data: NPC[] = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() } as NPC);
      });
      setNpcs(data);
    });
    return () => unsub();
  }, []);`
);

fs.writeFileSync('src/components/GameTable.tsx', code);
