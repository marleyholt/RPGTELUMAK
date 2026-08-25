const fs = require('fs');
let code = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf-8');

const effectBlock = `  useEffect(() => {
    const handleEditChar = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === character.id) {
        setIsEditingTexts(true);
      }
    };
    window.addEventListener('editCharacterSheet', handleEditChar);
    return () => window.removeEventListener('editCharacterSheet', handleEditChar);
  }, [character.id]);`;

if (!code.includes('editCharacterSheet')) {
  // inject after other useEffects
  code = code.replace(
    "const [isEditingTexts, setIsEditingTexts] = useState(false);",
    "const [isEditingTexts, setIsEditingTexts] = useState(false);\n" + effectBlock
  );
  fs.writeFileSync('src/components/CharacterSheet.tsx', code);
}
