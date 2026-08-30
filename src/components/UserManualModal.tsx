import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  BookOpen, 
  Shield, 
  Swords, 
  Heart, 
  Flame, 
  Sparkles, 
  Users, 
  HardDrive, 
  Database, 
  MessageSquareText, 
  FileText, 
  Settings, 
  Activity, 
  History, 
  Printer, 
  Dices, 
  Layers, 
  Eye, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Laptop
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string; // 'GM' | 'PLAYER' | string
}

export function UserManualModal({ isOpen, onClose, userRole = 'PLAYER' }: UserManualModalProps) {
  const isGM = userRole.toUpperCase() === 'GM';
  // Allow GM to toggle between GM guide and Player guide to see what players experience
  const [activeTab, setActiveTab] = useState<'gm' | 'player'>(isGM ? 'gm' : 'player');
  const [selectedSection, setSelectedSection] = useState<string>('intro');

  if (!isOpen) return null;

  const gmSections = [
    { id: 'intro', title: '1. Visão Geral do Mestre', icon: Sparkles },
    { id: 'offline_mode', title: '2. Modo Offline & Zero Cota', icon: HardDrive },
    { id: 'backup_json', title: '3. Backup da Campanha (JSON)', icon: Database },
    { id: 'npc_manager', title: '4. Gestão de NPCs & Monstros', icon: Users },
    { id: 'players_auth', title: '5. Jogadores, Permissões & Fichas', icon: Settings },
    { id: 'pdf_import', title: '6. Importador de Fichas PDF', icon: FileText },
    { id: 'discord_integration', title: '7. Grimório & Canais do Discord', icon: MessageSquareText },
    { id: 'telemetry_audit', title: '8. Auditoria & Telemetria', icon: Activity },
  ];

  const playerSections = [
    { id: 'intro', title: '1. Bem-vindo ao Portal Telumak', icon: Sparkles },
    { id: 'character_sheet', title: '2. Sua Ficha de Personagem', icon: FileText },
    { id: 'vitals_tools', title: '3. Vitalidade, Éter & Ferramentas', icon: Heart },
    { id: 'transformations', title: '4. Versões & Transformações', icon: Layers },
    { id: 'abilities_inventory', title: '5. Dons, Técnicas & Inventário', icon: Swords },
    { id: 'dice_rolls', title: '6. Rolagens de Dados & Testes', icon: Dices },
    { id: 'discord_notebook', title: '7. Grimório & Discord', icon: MessageSquareText },
    { id: 'print_pdf', title: '8. Impressão & Exportação', icon: Printer },
  ];

  const currentSections = activeTab === 'gm' ? gmSections : playerSections;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0f0f12] border-2 border-sky-500/40 rounded-lg shadow-2xl overflow-hidden text-gray-200">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#141824] to-[#121218] border-b border-sky-500/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span>Manual do Usuário</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-sky-950 border border-sky-500/50 text-sky-300 font-bold">
                    {activeTab === 'gm' ? 'GUIA DO MESTRE (GM)' : 'GUIA DO JOGADOR'}
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-gray-400">Instruções completas e dicas para o sistema Telumak RPG</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* If user is GM, give option to switch guide */}
            {isGM && (
              <div className="flex items-center bg-[#1c1d28] border border-white/10 rounded p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => { setActiveTab('gm'); setSelectedSection('intro'); }}
                  className={`px-2.5 py-1 font-bold rounded transition ${
                    activeTab === 'gm' ? 'bg-sky-600 text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Mestre (GM)
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('player'); setSelectedSection('intro'); }}
                  className={`px-2.5 py-1 font-bold rounded transition ${
                    activeTab === 'player' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Jogador (Player)
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
              title="Fechar Manual"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (Sidebar + Content) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="w-full md:w-64 bg-[#0a0a0d] border-b md:border-b-0 md:border-r border-white/10 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 px-2 py-1 hidden md:block">
              Tópicos do Manual
            </div>
            {currentSections.map((sec) => {
              const Icon = sec.icon;
              const isSelected = selectedSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSection(sec.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded text-left transition whitespace-nowrap md:whitespace-normal shrink-0 md:shrink ${
                    isSelected
                      ? 'bg-sky-600/20 text-sky-300 border border-sky-500/50 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-sky-400' : 'text-gray-500'}`} />
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6 text-sm leading-relaxed custom-scrollbar bg-[#111116]">
            
            {/* GM GUIDE SECTIONS */}
            {activeTab === 'gm' && (
              <>
                {selectedSection === 'intro' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-sky-950/30 border border-sky-500/40 rounded-lg">
                      <h3 className="text-lg font-black text-sky-300 uppercase tracking-wide flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-sky-400" />
                        Bem-vindo ao Painel do Mestre (GM)
                      </h3>
                      <p className="mt-2 text-gray-300 text-xs sm:text-sm">
                        Como Mestre de Jogo (GM), você possui autoridade total sobre o mundo de Telumak, controle das fichas de todos os jogadores, criação de monstros e NPCs, gestão de canais do Discord e controle de cotas e backups.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 bg-[#171720] border border-white/10 rounded">
                        <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase text-amber-300">
                          <HardDrive className="w-4 h-4" /> Modo Preparação (Offline)
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Trabalhe na sua campanha, monte NPCs e edite fichas com zero consumo de cotas diárias da nuvem.
                        </p>
                      </div>
                      <div className="p-3.5 bg-[#171720] border border-white/10 rounded">
                        <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase text-emerald-300">
                          <Database className="w-4 h-4" /> Backup de Campanha JSON
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Exporte tudo em um único arquivo (.json) e restaure instantaneamente para a nuvem quando quiser.
                        </p>
                      </div>
                      <div className="p-3.5 bg-[#171720] border border-white/10 rounded">
                        <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase text-indigo-300">
                          <Users className="w-4 h-4" /> Biblioteca de NPCs
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Crie criaturas, aliados e vilões com avatares dinâmicos e envie as imagens diretamente para o Discord.
                        </p>
                      </div>
                      <div className="p-3.5 bg-[#171720] border border-white/10 rounded">
                        <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase text-rose-300">
                          <Activity className="w-4 h-4" /> Auditoria & Telemetria
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Acompanhe alterações em tempo real de rolagens e monitore o uso de leitura/escrita do Firebase.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSection === 'offline_mode' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                      <HardDrive className="w-5 h-5" />
                      Modo Preparação do Mestre (Zero Cota)
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      O modo offline foi desenvolvido para que você possa planejar suas sessões sem gastar a cota gratuita diária do Firebase Firestore (50.000 leituras).
                    </p>

                    <div className="space-y-3">
                      <div className="p-3 bg-[#181a24] border-l-4 border-amber-500 rounded-r">
                        <h4 className="font-bold text-white text-xs">Como Ativar / Desativar:</h4>
                        <p className="text-xs text-gray-300 mt-1">
                          Clique no botão <strong>"Nuvem Ativa / Modo Offline"</strong> no topo da tela ou abra a <strong>Central de Campanha & Backup</strong>. Ao ativar, uma barra âmbar aparecerá no topo do portal confirmando o modo offline.
                        </p>
                      </div>

                      <div className="p-3 bg-[#181a24] border-l-4 border-amber-500 rounded-r">
                        <h4 className="font-bold text-white text-xs">O que você pode fazer Offline:</h4>
                        <ul className="text-xs text-gray-300 mt-1 list-disc list-inside space-y-1">
                          <li>Criar, editar e excluir NPCs na Biblioteca de NPCs.</li>
                          <li>Alterar dados e status das fichas de personagens.</li>
                          <li>Consultar anotações e canais do Discord já carregados.</li>
                          <li>Exportar o arquivo de backup (.json) atualizado.</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded">
                        <h4 className="font-bold text-emerald-300 text-xs">Dica de Mestre:</h4>
                        <p className="text-xs text-gray-300 mt-1">
                          Planeje tudo em Modo Offline. Pouco antes da sessão começar com os jogadores, use a opção <strong>"Sincronizar Dados Locais para a Nuvem"</strong> e alterne para o Modo Nuvem!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSection === 'backup_json' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-emerald-300 uppercase tracking-wide flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Central de Campanha & Backup JSON
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Garante que você nunca perca nenhum dado da sua campanha, permitindo migrar ou restaurar tudo com facilidade.
                    </p>

                    <div className="space-y-3">
                      <div className="p-3 bg-[#181a24] border border-white/10 rounded">
                        <h4 className="font-bold text-white text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Exportação Completa:
                        </h4>
                        <p className="text-xs text-gray-300 mt-1">
                          Gera um arquivo <code className="text-emerald-300 bg-black/40 px-1.5 py-0.5 rounded">.json</code> contendo todas as Fichas de Jogadores com atributos, todos os NPCs cadastrados e os Canais do Discord que você selecionar.
                        </p>
                      </div>

                      <div className="p-3 bg-[#181a24] border border-white/10 rounded">
                        <h4 className="font-bold text-white text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-sky-400" /> Restauração & Importação:
                        </h4>
                        <p className="text-xs text-gray-300 mt-1">
                          Você pode carregar um backup salvo anteriormente para restaurar o estado da campanha localmente ou aplicar as alterações direto no banco do Firebase.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSection === 'npc_manager' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-indigo-300 uppercase tracking-wide flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Biblioteca de NPCs & Criaturas
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Aba dedicada para cadastrar todos os seres, monstros, mercadores e aliados do universo Telumak.
                    </p>

                    <div className="space-y-2 text-xs text-gray-300">
                      <p><strong>Múltiplos Avatares:</strong> Cadastre a imagem de capa e imagens secundárias para transformações ou poses.</p>
                      <p><strong>Estatísticas de Combate:</strong> Preencha HP, Éter, Fortitude, Destreza, Cognição e Carisma para rolagens rápidas durante o combate.</p>
                      <p><strong>Integração com Discord:</strong> Com um clique no botão do Discord, você pode enviar a ficha do NPC ou suas imagens para o canal configurado.</p>
                    </div>
                  </div>
                )}

                {selectedSection === 'players_auth' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-sky-300 uppercase tracking-wide flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Gestão de Jogadores & Permissões
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Controle quem tem acesso e quais fichas pertencem a cada jogador.
                    </p>

                    <div className="space-y-3 text-xs text-gray-300">
                      <div className="p-3 bg-[#181a24] border border-white/10 rounded">
                        <strong>Atribuição de Fichas:</strong> Vincule o e-mail do jogador à ficha para que ele tenha controle total sobre seu personagem.
                      </div>
                      <div className="p-3 bg-[#181a24] border border-white/10 rounded">
                        <strong>Promoção para Mestre (GM):</strong> No menu de configurações (ícone de engrenagem), você pode promover outros usuários confiáveis para a função de GM ou rebaixar para Player.
                      </div>
                    </div>
                  </div>
                )}

                {selectedSection === 'pdf_import' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-rose-300 uppercase tracking-wide flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Importador de Fichas em PDF
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Permite criar fichas completas a partir de PDFs de fichas Sankotei preenchidas.
                    </p>
                    <p className="text-xs text-gray-300">
                      Basta clicar em <strong>"Importar Ficha PDF"</strong> na aba Mesa ou no menu de configurações do GM, carregar o arquivo PDF e o sistema extrairá automaticamente atributos, perícias, história e dons.
                    </p>
                  </div>
                )}

                {selectedSection === 'discord_integration' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-[#7289da] uppercase tracking-wide flex items-center gap-2">
                      <MessageSquareText className="w-5 h-5" />
                      Grimório & Canais do Discord
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Sincronização de canais e webhooks do Discord para anotações de lore, regras e avisos da mesa.
                    </p>
                    <p className="text-xs text-gray-300">
                      Crie canais temáticos (ex: Lore, Regras, Quests), publique anotações com formatação rica e sincronize mensagens entre o portal e o servidor do Discord do seu grupo.
                    </p>
                  </div>
                )}

                {selectedSection === 'telemetry_audit' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Auditoria de Ações & Monitor de Cotas
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Dois painéis dedicados para manter o controle total e a integridade da mesa.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-[#181a24] border border-amber-500/30 rounded">
                        <strong className="text-amber-300">Histórico de Auditoria:</strong>
                        <p className="mt-1 text-gray-400">Registra alterações em fichas, curas, dano sofrido e rolagens críticas para evitar confusões durante o jogo.</p>
                      </div>
                      <div className="p-3 bg-[#181a24] border border-sky-500/30 rounded">
                        <strong className="text-sky-300">Monitor de Telemetria & Cotas:</strong>
                        <p className="mt-1 text-gray-400">Acompanhe a quantidade estimada de leituras e escritas no Firebase e receba alertas caso a cota se aproxime do limite diário.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PLAYER GUIDE SECTIONS */}
            {activeTab === 'player' && (
              <>
                {selectedSection === 'intro' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-lg">
                      <h3 className="text-lg font-black text-indigo-300 uppercase tracking-wide flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        Bem-vindo ao Portal Telumak RPG!
                      </h3>
                      <p className="mt-2 text-gray-300 text-xs sm:text-sm">
                        Este portal é a sua central de jogo no sistema Sankotei. Aqui você tem controle total sobre seu personagem, rolagens de dados, inventário, transformações e grimório de conhecimentos.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 bg-[#171720] border border-white/10 rounded">
                        <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase text-rose-300">
                          <Heart className="w-4 h-4" /> Indicadores Vitais
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Gerencie seus pontos de Vida (HP), Éter para magias/técnicas e Pontos de Destino.
                        </p>
                      </div>
                      <div className="p-3.5 bg-[#171720] border border-white/10 rounded">
                        <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase text-amber-300">
                          <Dices className="w-4 h-4" /> Rolagens Automáticas
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Basta clicar em qualquer perícia ou atributo na ficha para disparar o teste com bônus no chat da mesa.
                        </p>
                      </div>
                      <div className="p-3.5 bg-[#171720] border border-white/10 rounded">
                        <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase text-purple-300">
                          <Layers className="w-4 h-4" /> Transformações & Versões
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Alterne instantaneamente para formas despertadas, avatares alternativos ou trajes de batalha.
                        </p>
                      </div>
                      <div className="p-3.5 bg-[#171720] border border-white/10 rounded">
                        <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase text-sky-300">
                          <Printer className="w-4 h-4" /> Exportação & Impressão
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Gere uma versão estilizada e pronta para imprimir em papel da sua ficha oficial.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSection === 'character_sheet' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-sky-300 uppercase tracking-wide flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Sua Ficha de Personagem
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      A ficha oficial Telumak organiza seu herói em blocos claros de atributos e perícias:
                    </p>

                    <div className="space-y-3 text-xs text-gray-300">
                      <div className="p-3 bg-[#181a24] border border-white/10 rounded">
                        <strong className="text-white">Atributos Primários:</strong>
                        <p className="mt-1">
                          <strong>Físico</strong> (Força e Vigor), <strong>Destreza</strong> (Agilidade e Precisão), <strong>Cognição</strong> (Inteligência e Percepção) e <strong>Carisma</strong> (Presença e Vontade).
                        </p>
                      </div>

                      <div className="p-3 bg-[#181a24] border border-white/10 rounded">
                        <strong className="text-white">Perícias & Grau de Treinamento:</strong>
                        <p className="mt-1">
                          Cada perícia soma seu valor base mais os bônus aplicáveis. Clique no nome da perícia para fazer um teste de dados direto na mesa!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSection === 'vitals_tools' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-rose-300 uppercase tracking-wide flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Vitalidade, Éter & Ferramentas de Atributo
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Na barra superior da sua ficha, você tem os contadores rápidos:
                    </p>

                    <div className="space-y-2 text-xs text-gray-300">
                      <p><strong>❤️ Vida (HP):</strong> Seus pontos de saúde. Clique no botão de salvar para registrar o estado atual.</p>
                      <p><strong>✨ Éter:</strong> Energia gasta para conjurar Dons e executar Técnicas especiais.</p>
                      <p><strong>⭐ Destino:</strong> Pontos heroicos para salvar rolagens e evitar fatalidades.</p>
                      <p><strong>🛡️ Ferramentas de Atributo:</strong> Recursos temporários para Bloqueio (Fortitude), Esquiva (Destreza), Concentração (Cognição) e Vontade (Carisma).</p>
                    </div>
                  </div>
                )}

                {selectedSection === 'transformations' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-purple-300 uppercase tracking-wide flex items-center gap-2">
                      <Layers className="w-5 h-5" />
                      Versões & Transformações
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Seu personagem pode assumir diferentes formas (ex: Modo Berserk, Fusão Elemental, Armadura Mágica):
                    </p>

                    <div className="p-3 bg-[#181a24] border border-purple-500/30 rounded text-xs text-gray-300 space-y-2">
                      <p>1. Clique em <strong>"Formas & Transformações"</strong> na sua ficha.</p>
                      <p>2. Crie uma nova versão com bônus de atributos específicos e imagem própria.</p>
                      <p>3. Ao ativar a transformação, todos os modificadores são aplicados automaticamente às suas rolagens.</p>
                    </div>
                  </div>
                )}

                {selectedSection === 'abilities_inventory' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                      <Swords className="w-5 h-5" />
                      Dons, Técnicas & Inventário
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Organize suas magias, habilidades marciais e itens carregados:
                    </p>

                    <div className="space-y-3 text-xs text-gray-300">
                      <div className="p-3 bg-[#181a24] border border-white/10 rounded">
                        <strong className="text-amber-200">Dons & Técnicas:</strong>
                        <p className="mt-1">Cadastre o custo de Éter, alcance, tempo de execução e efeito descritivo detalhado.</p>
                      </div>
                      <div className="p-3 bg-[#181a24] border border-white/10 rounded">
                        <strong className="text-amber-200">Mochila & Equipamentos:</strong>
                        <p className="mt-1">Controle de peso, itens equipados, armas com dados de dano e itens consumíveis.</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSection === 'dice_rolls' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-emerald-300 uppercase tracking-wide flex items-center gap-2">
                      <Dices className="w-5 h-5" />
                      Rolagens de Dados & Testes
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Você pode rolar dados de três maneiras rápidas:
                    </p>

                    <div className="space-y-2 text-xs text-gray-300">
                      <p><strong>1. Clique na Perícia/Atributo:</strong> Rola automaticamente d20 + modificador.</p>
                      <p><strong>2. Rolador do Chat:</strong> No chat da mesa, use comandos como <code className="bg-black/40 px-1 py-0.5 rounded text-sky-300">/r 1d20+5</code> ou clique nos botões rápidos de dados.</p>
                      <p><strong>3. Vantagem e Desvantagem:</strong> Selecione o modificador de situação antes de lançar o teste.</p>
                    </div>
                  </div>
                )}

                {selectedSection === 'discord_notebook' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-[#7289da] uppercase tracking-wide flex items-center gap-2">
                      <MessageSquareText className="w-5 h-5" />
                      Grimório & Discord
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Acesse a aba <strong>Discord</strong> para ler canais com lore do cenário, regras da campanha, diário de bordo e anotações compartilhadas pelo Mestre.
                    </p>
                  </div>
                )}

                {selectedSection === 'print_pdf' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-sky-300 uppercase tracking-wide flex items-center gap-2">
                      <Printer className="w-5 h-5" />
                      Impressão & Ficha Oficial em PDF
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Quer jogar presencialmente ou guardar uma cópia física da sua ficha?
                    </p>
                    <p className="text-xs text-gray-300">
                      Basta clicar no botão de <strong>Impressora</strong> no canto superior da ficha do seu personagem. Uma folha diagramada nos padrões oficiais Sankotei será preparada para impressão direta ou salvamento em PDF no seu navegador.
                    </p>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 bg-[#0a0a0d] border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>Você pode reabrir este manual a qualquer momento clicando no botão circular <strong>(?)</strong> na barra superior.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded transition shadow"
          >
            Entendido, Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
