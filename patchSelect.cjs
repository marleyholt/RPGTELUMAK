const fs = require('fs');

let panelCode = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf-8');
// Find the main container after the header
panelCode = panelCode.replace(
  '          <div className="flex bg-[#232428] border-b border-white/5 overflow-x-auto no-scrollbar shrink-0">',
  '          <div className="flex bg-[#232428] border-b border-white/5 overflow-x-auto no-scrollbar shrink-0 select-none">'
);
panelCode = panelCode.replace(
  '          <div className="flex-1 overflow-y-auto custom-scroll min-h-0 bg-[#313338] relative">',
  '          <div className="flex-1 overflow-y-auto custom-scroll min-h-0 bg-[#313338] relative select-text">'
);
fs.writeFileSync('src/components/QuickSheetPanel.tsx', panelCode);

let npcCode = fs.readFileSync('src/components/NpcQuickSheet.tsx', 'utf-8');
npcCode = npcCode.replace(
  '          <div className="flex bg-[#232428] border-b border-white/5 overflow-x-auto no-scrollbar shrink-0">',
  '          <div className="flex bg-[#232428] border-b border-white/5 overflow-x-auto no-scrollbar shrink-0 select-none">'
);
npcCode = npcCode.replace(
  '          <div className="flex-1 overflow-y-auto custom-scroll min-h-0 bg-[#313338] relative">',
  '          <div className="flex-1 overflow-y-auto custom-scroll min-h-0 bg-[#313338] relative select-text">'
);
fs.writeFileSync('src/components/NpcQuickSheet.tsx', npcCode);
