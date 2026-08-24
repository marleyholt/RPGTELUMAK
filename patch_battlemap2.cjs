const fs = require('fs');

let code = fs.readFileSync('src/components/BattleMap.tsx', 'utf8');

const panState = `  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });`;

const newPanState = `  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const hasDragged = useRef(false);`;

code = code.replace(panState, newPanState);

const handleMouseDown = `  const handleMouseDown = (e: React.MouseEvent) => {
    if (autoFit) return;
    if (e.button === 0 && (e.target as HTMLElement).tagName !== 'BUTTON') {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };`;

const newHandleMouseDown = `  const handleMouseDown = (e: React.MouseEvent) => {
    if (autoFit) return;
    if (e.button === 0 && (e.target as HTMLElement).tagName !== 'BUTTON') {
      setIsPanning(true);
      hasDragged.current = false;
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };`;

code = code.replace(handleMouseDown, newHandleMouseDown);

const handleMouseMove = `  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || autoFit) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };`;

const newHandleMouseMove = `  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || autoFit) return;
    hasDragged.current = true;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };`;

code = code.replace(handleMouseMove, newHandleMouseMove);

const handleMouseUp = `  const handleMouseUp = () => {
    setIsPanning(false);
  };`;

const newHandleMouseUp = `  const handleMouseUp = () => {
    setIsPanning(false);
    setTimeout(() => { hasDragged.current = false; }, 50);
  };`;

code = code.replace(handleMouseUp, newHandleMouseUp);

const handleCellClick = `  const handleCellClick = async (x: number, y: number) => {
    if (selectedTokenId) {`;

const newHandleCellClick = `  const handleCellClick = async (x: number, y: number) => {
    if (hasDragged.current) return;
    if (selectedTokenId) {`;

code = code.replace(handleCellClick, newHandleCellClick);

const tokenClick = `                onClick={(e) => {
                  if (!userCanControl) return;
                  e.stopPropagation();
                  setSelectedTokenId(isSelected ? null : tk.id);
                }}`;

const newTokenClick = `                onClick={(e) => {
                  if (hasDragged.current) return;
                  if (!userCanControl) return;
                  e.stopPropagation();
                  setSelectedTokenId(isSelected ? null : tk.id);
                }}`;

code = code.replace(tokenClick, newTokenClick);

fs.writeFileSync('src/components/BattleMap.tsx', code);
console.log('Patched panning and clicks.');
