const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const stateTarget = `  const [collapsedCategories, setCollapsedCategories] = useState<{ [key: string]: boolean }>({});
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isHeadsetDeafened, setIsHeadsetDeafened] = useState(false);`;
const newStateTarget = `  const [collapsedCategories, setCollapsedCategories] = useState<{ [key: string]: boolean }>({});`;
code = code.replace(stateTarget, newStateTarget);

const buttonsTarget = `            <button
              type="button"
              onClick={() => setIsMicMuted(!isMicMuted)}
              className={\`p-1.5 rounded hover:bg-[#35373c] transition \${isMicMuted ? 'text-rose-400' : 'hover:text-white'}\`}
              title={isMicMuted ? "Desmutar Microfone" : "Mutar Microfone"}
            >
              {isMicMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsHeadsetDeafened(!isHeadsetDeafened)}
              className={\`p-1.5 rounded hover:bg-[#35373c] transition \${isHeadsetDeafened ? 'text-rose-400' : 'hover:text-white'}\`}
              title={isHeadsetDeafened ? "Desativar Áudio" : "Ensurdecer"}
            >
              <Headphones className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>`;

const newButtonsTarget = `          </div>
        </div>`;
code = code.replace(buttonsTarget, newButtonsTarget);

fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('Patched DiscordNotebook mic/headset');
