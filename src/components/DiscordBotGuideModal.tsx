import React from 'react';
import { X, ExternalLink, Bot, CheckCircle2, ShieldAlert, Sparkles, Hash, Copy, Terminal } from 'lucide-react';

interface DiscordBotGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiscordBotGuideModal({ isOpen, onClose }: DiscordBotGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-[#0c0c0c] border border-white/15 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#5865f2]/10 border border-[#5865f2]/30 text-[#5865f2]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>Tutorial: Como Ativar o Bot do Discord</span>
                <span className="bg-[#5865f2] text-white text-[9px] px-1.5 py-0.5 rounded font-mono">GUIA COMPLETO</span>
              </h2>
              <p className="text-[10px] text-white/50 font-mono">
                Siga estes 5 passos simples para conectar seu servidor e canais ao Telumak RPG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/40 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scroll bg-[#080808] text-xs text-white/80">
          
          {/* Step 1 */}
          <div className="bg-black border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-black uppercase tracking-wider text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">1</span>
              <span>Criar a Aplicação no Portal de Desenvolvedores do Discord</span>
            </div>
            <p className="text-white/70 leading-relaxed font-sans pl-7">
              Acesse o site oficial do Discord Developers:{' '}
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline font-bold inline-flex items-center gap-1"
              >
                discord.com/developers/applications <ExternalLink className="h-3 w-3 inline" />
              </a>
              . Clique no botão azul <strong>"New Application"</strong> no canto superior direito, dê o nome <strong>"Telumak RPG Bot"</strong> e confirme.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-black border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-black uppercase tracking-wider text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">2</span>
              <span>Criar o Bot, Obter o Token e Ativar as Intents</span>
            </div>
            <div className="pl-7 space-y-2 font-sans text-white/70">
              <p>
                No menu lateral esquerdo, clique em <strong>"Bot"</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-white/80">
                <li>
                  Clique no botão <strong>"Reset Token"</strong> (ou "Copy") para copiar o <strong>Token do Bot</strong>. Esse é o código secreto que dá vida ao bot.
                </li>
                <li className="text-cyan-300 font-semibold">
                  ⚠️ <strong>IMPORTANTE:</strong> Role a página até a seção <strong>"Privileged Gateway Intents"</strong> e marque como <strong>ATIVAS (ON)</strong> as seguintes opções:
                  <div className="ml-4 mt-1 space-y-1 text-xs text-white">
                    <div>✓ <strong>Presence Intent</strong></div>
                    <div>✓ <strong>Server Members Intent</strong></div>
                    <div>✓ <strong>Message Content Intent</strong> <em>(OBRIGATÓRIO para o bot conseguir ler o texto e rolagens dos canais!)</em></div>
                  </div>
                </li>
                <li>Clique em <strong>"Save Changes"</strong> no rodapé do Discord.</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-black border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-black uppercase tracking-wider text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">3</span>
              <span>Convidar o Bot para o seu Servidor Discord</span>
            </div>
            <div className="pl-7 space-y-2 font-sans text-white/70">
              <p>
                No menu lateral esquerdo da página do Discord, clique em <strong>"OAuth2"</strong> &gt; <strong>"URL Generator"</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/80">
                <li>Em <strong>SCOPES</strong>, marque: <code className="bg-[#1e1f22] text-sky-400 px-1 py-0.5 rounded">bot</code></li>
                <li>Em <strong>BOT PERMISSIONS</strong>, marque: <code className="bg-[#1e1f22] text-sky-400 px-1 py-0.5 rounded">Administrator</code> (ou <em>Send Messages, Read Messages/View Channels, Attach Files, Read Message History</em>).</li>
                <li>Copie a URL gerada no final da página, abra em uma nova aba do navegador e selecione o seu <strong>Servidor de RPG</strong> para autorizar o bot!</li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-black border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-black uppercase tracking-wider text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">4</span>
              <span>Copiar os IDs dos Canais no Discord</span>
            </div>
            <div className="pl-7 space-y-2 font-sans text-white/70">
              <p>
                Para copiar o ID de qualquer canal ou servidor:
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/80">
                <li>No aplicativo do Discord, vá em <strong>Configurações de Usuário ⚙️ &gt; Avançado &gt; Ative o "Modo de Desenvolvedor"</strong>.</li>
                <li>Agora, basta clicar com o <strong>botão direito</strong> em cima de qualquer canal de texto no seu servidor e escolher <strong>"Copiar ID do canal"</strong>!</li>
                <li>Cole esse ID no <strong>Painel Config GM</strong> (Canal Geral ou no canal privado de cada Jogador).</li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-black border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-black uppercase tracking-wider text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">5</span>
              <span>Usando o Bot Rollem para Rolagens de Dados</span>
            </div>
            <div className="pl-7 space-y-1.5 font-sans text-white/70">
              <p>
                Você pode convidar o bot <strong>Rollem</strong> (<a href="https://rollem.rocks" target="_blank" rel="noreferrer" className="text-sky-400 font-bold hover:underline">rollem.rocks</a>) para o mesmo canal do Discord.
              </p>
              <p>
                Quando você ou seus jogadores rolarem dados com o Rollem (ex: <code className="bg-[#1e1f22] text-emerald-400 px-1 py-0.5">4d10+12</code> ou <code className="bg-[#1e1f22] text-emerald-400 px-1 py-0.5">1d20</code>), a rolagem será refletida instantaneamente no <strong>Notebook</strong> e você poderá usar o botão <strong>"🎲 Mencionar Rolagem"</strong> para citá-la em suas anotações!
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
