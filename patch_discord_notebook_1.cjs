const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const importTarget = `Check, Trash2, Edit3, X, Sliders, Pin, PinOff, Info`;
const newImport = `Check, Trash2, Edit3, X, Sliders, Pin, PinOff, Info, FileText, ExternalLink`;
code = code.replace(importTarget, newImport);

const stateTarget = `  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityName, setIdentityName] = useState('');
  const [identityTag, setIdentityTag] = useState('');
  const [identityAvatar, setIdentityAvatar] = useState('');
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);`;

const newState = `  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityName, setIdentityName] = useState('');
  const [identityTag, setIdentityTag] = useState('');
  const [identityAvatar, setIdentityAvatar] = useState('');
  const [identityQuickSheet, setIdentityQuickSheet] = useState<string[]>([]);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  
  const [showQuickSheet, setShowQuickSheet] = useState(false);`;

code = code.replace(stateTarget, newState);

const handleIdentityClick = `              onClick={() => {
                setIdentityName(effectiveDiscordName);
                setIdentityTag(effectiveDiscordTag);
                setIdentityAvatar(currentUserProfile?.discordAvatar || currentUserProfile?.photoURL || '');
                setShowIdentityModal(true);
              }}`;

const newHandleIdentityClick = `              onClick={() => {
                setIdentityName(effectiveDiscordName);
                setIdentityTag(effectiveDiscordTag);
                setIdentityAvatar(currentUserProfile?.discordAvatar || currentUserProfile?.photoURL || '');
                setIdentityQuickSheet(currentUserProfile?.quickSheetSections || ['indicadores']);
                setShowIdentityModal(true);
              }}`;
code = code.replace(handleIdentityClick, newHandleIdentityClick);

const handleIdentityClick2 = `            onClick={() => {
              setIdentityName(effectiveDiscordName);
              setIdentityTag(effectiveDiscordTag);
              setIdentityAvatar(currentUserProfile?.discordAvatar || currentUserProfile?.photoURL || '');
              setShowIdentityModal(true);
            }}`;
const newHandleIdentityClick2 = `            onClick={() => {
              setIdentityName(effectiveDiscordName);
              setIdentityTag(effectiveDiscordTag);
              setIdentityAvatar(currentUserProfile?.discordAvatar || currentUserProfile?.photoURL || '');
              setIdentityQuickSheet(currentUserProfile?.quickSheetSections || ['indicadores']);
              setShowIdentityModal(true);
            }}`;
code = code.replace(handleIdentityClick2, newHandleIdentityClick2);

const saveIdentity = `      await updateDoc(doc(db, 'users', currentUserProfile.uid), {
        discordDisplayName: identityName.trim() || effectiveDiscordName,
        discordTag: formattedTag,
        discordAvatar: identityAvatar.trim() || null,
        displayName: identityName.trim() || currentUserProfile.displayName
      });`;
const newSaveIdentity = `      await updateDoc(doc(db, 'users', currentUserProfile.uid), {
        discordDisplayName: identityName.trim() || effectiveDiscordName,
        discordTag: formattedTag,
        discordAvatar: identityAvatar.trim() || null,
        displayName: identityName.trim() || currentUserProfile.displayName,
        quickSheetSections: identityQuickSheet
      });`;
code = code.replace(saveIdentity, newSaveIdentity);

fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('Patched DiscordNotebook.tsx states and updates');
