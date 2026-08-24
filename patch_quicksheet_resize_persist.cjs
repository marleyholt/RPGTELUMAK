const fs = require('fs');
let code = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf8');

// 1. Update import
const importTarget = `import React, { useState } from 'react';`;
const newImportTarget = `import React, { useState, useRef } from 'react';`;
code = code.replace(importTarget, newImportTarget);

// 2. Add ref and size state, update toggleMinimize logic
const stateTarget = `  const [isMinimized, setIsMinimized] = useState(false);`;
const newStateTarget = `  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 320, height: 340 });

  const toggleMinimize = () => {
    if (!isMinimized && panelRef.current) {
      setSize({
        width: panelRef.current.offsetWidth,
        height: panelRef.current.offsetHeight
      });
    }
    setIsMinimized(!isMinimized);
  };`;
code = code.replace(stateTarget, newStateTarget);

// 3. Attach ref to container and use size state
const containerTarget = `    <div 
      className="fixed bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl z-40 flex flex-col overflow-hidden animate-fade-in"
      style={{
        left: pos.x,
        top: pos.y,
        width: isMinimized ? '260px' : '320px',
        height: isMinimized ? 'auto' : '340px',
        minWidth: isMinimized ? 'auto' : '280px',
        minHeight: isMinimized ? 'auto' : '200px',
        resize: isMinimized ? 'none' : 'both'
      }}
    >`;
const newContainerTarget = `    <div 
      ref={panelRef}
      className="fixed bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl z-40 flex flex-col overflow-hidden animate-fade-in"
      style={{
        left: pos.x,
        top: pos.y,
        width: isMinimized ? '260px' : \`\${size.width}px\`,
        height: isMinimized ? 'auto' : \`\${size.height}px\`,
        minWidth: isMinimized ? 'auto' : '280px',
        minHeight: isMinimized ? 'auto' : '200px',
        resize: isMinimized ? 'none' : 'both'
      }}
    >`;
code = code.replace(containerTarget, newContainerTarget);

// 4. Use toggleMinimize on button
const buttonTarget = `<button onClick={() => setIsMinimized(!isMinimized)} className="p-1 text-white/50 hover:text-white transition" title={isMinimized ? "Maximizar" : "Minimizar"}>`;
const newButtonTarget = `<button onClick={toggleMinimize} className="p-1 text-white/50 hover:text-white transition" title={isMinimized ? "Maximizar" : "Minimizar"}>`;
code = code.replace(buttonTarget, newButtonTarget);

fs.writeFileSync('src/components/QuickSheetPanel.tsx', code);
console.log('Patched QuickSheet size persist');
