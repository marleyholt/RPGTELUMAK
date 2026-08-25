const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const stateTarget = `  const [showPcMenu, setShowPcMenu] = useState(false);`;
const newStateTarget = `  const [showPcMenu, setShowPcMenu] = useState(false);

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

fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('State added.');
