const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const sliderBtn = `            <button
              type="button"
              onClick={() => {
                setIdentityName(effectiveDiscordName);
                setIdentityTag(effectiveDiscordTag);
                setIdentityAvatar(currentUserProfile?.discordAvatar || currentUserProfile?.photoURL || '');
                setIdentityQuickSheet(currentUserProfile?.quickSheetSections || ['indicadores']);
                setShowIdentityModal(true);
              }}
              className="p-1.5 rounded hover:bg-[#35373c] hover:text-white transition"
              title="Configurar Perfil e Identidade no Discord"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>`;

const qsBtnAndSlider = `            <button
              type="button"
              onClick={() => setShowQuickSheet(!showQuickSheet)}
              className={\`p-1.5 rounded transition \${showQuickSheet ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-[#35373c] hover:text-white'}\`}
              title="Ficha Rápida (Pocket)"
            >
              <FileText className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIdentityName(effectiveDiscordName);
                setIdentityTag(effectiveDiscordTag);
                setIdentityAvatar(currentUserProfile?.discordAvatar || currentUserProfile?.photoURL || '');
                setIdentityQuickSheet(currentUserProfile?.quickSheetSections || ['indicadores']);
                setShowIdentityModal(true);
              }}
              className="p-1.5 rounded hover:bg-[#35373c] hover:text-white transition"
              title="Configurar Perfil e Identidade no Discord"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>`;

code = code.replace(sliderBtn, qsBtnAndSlider);
fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('Patched DiscordNotebook.tsx button');
