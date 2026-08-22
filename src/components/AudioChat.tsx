import React, { useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';

interface AudioChatProps {
  appletId: string;
  charName: string;
}

export function AudioChat({ appletId, charName }: AudioChatProps) {
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);

  // Generate a distinct room name scoped to the applet ID to prevent cross-over
  const roomName = `TelumakRPG_Session_${appletId.replace(/[^a-zA-Z0-9]/g, '')}`;
  
  // Custom Jitsi configuration parameters for audio-only, skipping prejoin
  const jitsiUrl = `https://meet.jit.si/${roomName}#config.startWithVideoMuted=true&config.startWithAudioMuted=${muted}&config.prejoinConfig.enabled=false&config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(charName)}"`;

  return (
    <div className="bg-[#080808] border border-white/10 p-5 rounded-none shadow-2xl">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <Phone className={`h-5 w-5 ${inCall ? 'text-orange-500 animate-pulse' : 'text-white/40'}`} />
          <span className="font-sans font-black text-xs text-white uppercase tracking-widest">Canal de Áudio do Grupo</span>
        </div>
        <span className="text-[9px] bg-white/5 text-white/70 px-2.5 py-1 rounded-none font-mono font-black border border-white/5">
          {inCall ? "CONECTADO" : "FORA DA VOZ"}
        </span>
      </div>

      <p className="text-xs text-white/50 mb-4 leading-relaxed">
        Subterfúgio de voz integrado. Conecte-se com os outros jogadores e o mestre gratuitamente.
      </p>

      {!inCall ? (
        <button
          onClick={() => setInCall(true)}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-black py-3 px-4 rounded-none transition uppercase tracking-widest text-xs shadow-lg"
        >
          <Phone className="h-4 w-4 stroke-[3]" />
          Conectar à Chamada
        </button>
      ) : (
        <div className="space-y-3">
          {/* Embedded audio bridge container */}
          <div className="border border-white/10 bg-black p-4 rounded-none relative overflow-hidden aspect-video max-h-40 flex flex-col justify-center items-center text-center">
            <Volume2 className="h-8 w-8 text-orange-500 animate-pulse mb-2" />
            <span className="text-xs font-mono text-white/80 font-black">Sala: {roomName.slice(0, 15)}...</span>
            <span className="text-[10px] text-white/30 tracking-widest uppercase font-mono mt-1">Sua voz está ativa nesta sala</span>
            
            {/* Hidden iframe that actually manages WebRTC peer connections */}
            <iframe
              src={jitsiUrl}
              allow="microphone; camera; display-capture; autoplay"
              className="absolute left-0 top-0 w-0 h-0 pointer-events-none opacity-0"
              title="Telumak WebRTC Voice System"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMuted(!muted)}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-none text-xs font-black uppercase tracking-widest border transition-all ${
                muted 
                  ? 'bg-red-950/20 text-red-500 border-red-500/20 hover:bg-red-950/30' 
                  : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
              }`}
            >
              {muted ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Mudo
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Ativo
                </>
              )}
            </button>

            <button
              onClick={() => setInCall(false)}
              className="flex items-center justify-center gap-2 bg-red-950/40 hover:bg-red-600 text-red-500 hover:text-white py-3 px-3 rounded-none text-xs font-black uppercase tracking-widest border border-red-500/30 transition"
            >
              <PhoneOff className="h-4 w-4" />
              Desconectar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
