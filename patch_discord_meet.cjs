const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

// 1. Add imports
const importsTarget = `import { QuickSheetPanel } from './QuickSheetPanel';`;
const newImportsTarget = `import { useGoogleLogin } from '@react-oauth/google';
import { QuickSheetPanel } from './QuickSheetPanel';`;
code = code.replace(importsTarget, newImportsTarget);

const lucideTarget = `Bot, Sparkles, ExternalLink, Sliders, Users`;
const newLucideTarget = `Bot, Sparkles, ExternalLink, Sliders, Users, Video`;
code = code.replace(lucideTarget, newLucideTarget);

// 2. Add state and handlers
const stateTarget = `const [pinnedCount, setPinnedCount] = useState(0);`;
const newStateTarget = `const [pinnedCount, setPinnedCount] = useState(0);

  // Google Meet Integration
  const [meetSession, setMeetSession] = useState<{ url?: string; createdAt?: any } | null>(null);
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'meet_session', 'current'), (docSnap) => {
      if (docSnap.exists()) {
        setMeetSession(docSnap.data() as any);
      } else {
        setMeetSession(null);
      }
    });
    return () => unsub();
  }, []);

  const handleMeetLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsCreatingMeet(true);
      try {
        const response = await fetch('https://meet.googleapis.com/v2/spaces', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${tokenResponse.access_token}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
        const space = await response.json();
        if (space.meetingUri) {
          await setDoc(doc(db, 'meet_session', 'current'), {
            url: space.meetingUri,
            createdAt: serverTimestamp()
          });
          onAddLog('success', 'Sala do Google Meet criada e aberta na mesa!');
        } else {
          throw new Error('Failed to create meet space');
        }
      } catch (err) {
        console.error(err);
        onAddLog('error', 'Erro ao criar a sala do Google Meet.');
      } finally {
        setIsCreatingMeet(false);
      }
    },
    onError: () => {
      onAddLog('error', 'Login do Google cancelado ou falhou.');
    },
    scope: 'https://www.googleapis.com/auth/meetings.space.created',
  });

  const handleCloseMeet = async () => {
    try {
      await deleteDoc(doc(db, 'meet_session', 'current'));
      onAddLog('info', 'Mesa do Google Meet encerrada.');
    } catch (err) {
      console.error(err);
    }
  };`;
code = code.replace(stateTarget, newStateTarget);

// 3. Add UI to the header
const headerTarget = `{/* Export Messages Button */}`;
const newHeaderTarget = `{/* Google Meet Button */}
            {isGM ? (
              meetSession?.url ? (
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={meetSession.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold transition border border-emerald-500/30"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Entrar na Mesa</span>
                  </a>
                  <button
                    onClick={handleCloseMeet}
                    className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition border border-transparent hover:border-red-500/30"
                    title="Fechar Mesa (Remover link)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleMeetLogin()}
                  disabled={isCreatingMeet}
                  className="bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold transition border border-sky-500/30 disabled:opacity-50 shrink-0"
                  title="Criar sala do Google Meet para a mesa"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isCreatingMeet ? 'Criando...' : 'Abrir Mesa no Meet'}</span>
                </button>
              )
            ) : (
              (myActiveCharacter?.ativo_na_mesa && meetSession?.url) && (
                <a
                  href={meetSession.url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold transition border border-emerald-500/30 animate-pulse shrink-0"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Entrar na Mesa</span>
                </a>
              )
            )}
            
            <div className="w-px h-6 bg-[#4e5058] mx-1 hidden sm:block"></div>

            {/* Export Messages Button */}`;
code = code.replace(headerTarget, newHeaderTarget);

fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('Google Meet integration patched successfully.');
