import React, { useState, useRef, useEffect } from 'react';
import { Character } from '../types';
import { 
  FileText, Upload, Sparkles, Check, AlertTriangle, 
  Loader2, X, RefreshCw, Layers, Shield, Swords, Zap, Heart, Star, Coins,
  Terminal, CheckCircle2, ArrowRight, Info
} from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/errors';

interface PdfSheetImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCharacter?: Character | null;
  onApplyToQuickStats?: (parsedData: any) => void;
  onSuccess?: (charId: string) => void;
}

interface ImportStatusLog {
  id: string;
  time: string;
  type: 'info' | 'progress' | 'success' | 'error';
  message: string;
}

type ImportStep = 'idle' | 'reading' | 'gemini_analyzing' | 'parsing_sankotei' | 'success' | 'error';

export function PdfSheetImporterModal({
  isOpen,
  onClose,
  targetCharacter,
  onApplyToQuickStats,
  onSuccess
}: PdfSheetImporterModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusLogs, setStatusLogs] = useState<ImportStatusLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [rawTextFallback, setRawTextFallback] = useState('');
  const [showRawTextInput, setShowRawTextInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: 'info' | 'progress' | 'success' | 'error', message: string) => {
    const newLog: ImportStatusLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time: new Date().toLocaleTimeString(),
      type,
      message
    };
    setStatusLogs(prev => [...prev, newLog]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [statusLogs]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      await processFile(selected);
    }
  };

  const processFile = async (uploadedFile: File, retryCount = 0) => {
    setIsProcessing(true);
    setError(null);
    setExtractedData(null);
    if (retryCount === 0) {
      setStatusLogs([]);
    }
    setCurrentStep('reading');
    setProgressPercent(15);

    addLog('info', `Arquivo selecionado: ${uploadedFile.name} (${(uploadedFile.size / 1024).toFixed(1)} KB)`);
    addLog('progress', 'Lendo e codificando arquivo PDF da Ficha...');

    try {
      // Step 1: Read file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(uploadedFile);
      const base64Data = await base64Promise;

      // Extract raw text strings from PDF as supplemental context
      let extractedTextQuick = '';
      try {
        const textReader = new FileReader();
        const rawTextPromise = new Promise<string>((resolve) => {
          textReader.onload = () => {
            const raw = (textReader.result as string) || '';
            // Basic extraction of readable text chunks inside PDF streams
            const textMatches = raw.match(/\(([^()]{3,})\)/g);
            if (textMatches && textMatches.length > 5) {
              resolve(textMatches.map(m => m.slice(1, -1)).join(' '));
            } else {
              resolve('');
            }
          };
          textReader.onerror = () => resolve('');
        });
        textReader.readAsText(uploadedFile);
        extractedTextQuick = await rawTextPromise;
      } catch (e) {
        console.log("Quick text parse skip:", e);
      }

      // Step 2: Sending to Gemini AI
      setCurrentStep('gemini_analyzing');
      setProgressPercent(45);
      addLog('progress', 'Transmitindo documento para análise multimodal da IA Gemini...');

      // Small delay for visual feedback
      await new Promise(r => setTimeout(r, 400));

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://telumak-server.duckdns.org'}/api/characters/import-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: base64Data,
          textContent: extractedTextQuick || undefined,
          mimeType: uploadedFile.type || 'application/pdf',
          filename: uploadedFile.name
        })
      });

      // Handle server restarting / method not allowed with auto-retry
      if (response.status === 405 && retryCount < 1) {
        addLog('progress', 'Servidor inicializando rotas de API. Reconectando em 1.5 segundos...');
        await new Promise(r => setTimeout(r, 1500));
        return processFile(uploadedFile, retryCount + 1);
      }

      // Step 3: Parsing Sankötei structure
      setCurrentStep('parsing_sankotei');
      setProgressPercent(80);
      addLog('progress', 'Recebendo resposta da IA e mapeando atributos, vitalidade e perícias Sankötei...');

      const responseText = await response.text();
      let resData: any = {};
      try {
        resData = JSON.parse(responseText);
      } catch {
        if (response.status === 405) {
          throw new Error(`Servidor reiniciou ou rota não respondeu (405). Clique em "Tentar Novamente" abaixo.`);
        }
        throw new Error(`Falha no servidor (${response.status}): ${responseText.substring(0, 180)}`);
      }

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Falha ao processar PDF.');
      }

      const data = resData.data;
      setExtractedData(data);
      setCurrentStep('success');
      setProgressPercent(100);

      addLog('success', `Ficha extraída com sucesso! Personagem: ${data.nome || 'Aventureiro'} ${data.cla ? `(${data.cla})` : ''} • Nível ${data.nivel || 1}`);
      addLog('info', `HP: ${data.hp_atual ?? data.hp_max}/${data.hp_max} | Éter: ${data.ether_atual ?? data.ether_max}/${data.ether_max} | Destino: ${data.destino_atual ?? data.destino_max}/${data.destino_max}`);
      addLog('info', `Atributos identificados: FIS ${data.fisico} | DES ${data.destreza} | COG ${data.cognicao} | CAR ${data.carisma} | PRI ${data.primordio}`);
      if (data.ryo_dourado !== undefined) {
        addLog('info', `Finanças: ${data.ryo_dourado} Ryo Dourado, ${data.ryo_prateado || 0} Prateado, ${data.ryo_bronze || 0} Bronze.`);
      }

    } catch (err: any) {
      console.error("Erro ao importar PDF:", err);
      const errMsg = err?.message || 'Falha na importação do PDF. Verifique se o arquivo é uma ficha Sankötei válida.';
      setError(errMsg);
      setCurrentStep('error');
      addLog('error', `Falha no processamento: ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessRawText = async () => {
    if (!rawTextFallback.trim()) return;
    setIsProcessing(true);
    setError(null);
    setExtractedData(null);
    setStatusLogs([]);
    setCurrentStep('reading');
    setProgressPercent(20);

    addLog('info', 'Processando texto inserido manualmente...');

    try {
      setCurrentStep('gemini_analyzing');
      setProgressPercent(50);
      addLog('progress', 'Enviando conteúdo para estruturação via IA Gemini...');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://telumak-server.duckdns.org'}/api/characters/import-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent: rawTextFallback
        })
      });

      setCurrentStep('parsing_sankotei');
      setProgressPercent(80);
      addLog('progress', 'Mapeando regras, atributos e estatísticas da ficha Sankötei...');

      const responseText = await response.text();
      let resData: any = {};
      try {
        resData = JSON.parse(responseText);
      } catch {
        throw new Error(`Falha no servidor (${response.status}): ${responseText.substring(0, 180)}`);
      }

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Falha ao processar texto.');
      }

      const data = resData.data;
      setExtractedData(data);
      setCurrentStep('success');
      setProgressPercent(100);

      addLog('success', `Ficha extraída com sucesso! Personagem: ${data.nome || 'Aventureiro'} ${data.cla ? `(${data.cla})` : ''} • Nível ${data.nivel || 1}`);
      addLog('info', `HP: ${data.hp_atual ?? data.hp_max}/${data.hp_max} | Éter: ${data.ether_atual ?? data.ether_max}/${data.ether_max} | Destino: ${data.destino_atual ?? data.destino_max}/${data.destino_max}`);
    } catch (err: any) {
      console.error("Erro ao importar por texto:", err);
      const errMsg = err?.message || 'Falha ao processar texto da ficha.';
      setError(errMsg);
      setCurrentStep('error');
      addLog('error', `Falha no processamento: ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyToExistingCharacter = async () => {
    if (!targetCharacter || !extractedData) return;
    setIsProcessing(true);
    addLog('progress', `Gravando dados na ficha existente "${targetCharacter.nome}"...`);

    try {
      const charRef = doc(db, 'characters', targetCharacter.id);
      
      const payload: any = {
        nome: extractedData.nome || targetCharacter.nome,
        cla: extractedData.cla ?? targetCharacter.cla ?? '',
        ocupacao: extractedData.ocupacao ?? targetCharacter.ocupacao ?? '',
        posicao_social: extractedData.posicao_social ?? targetCharacter.posicao_social ?? '',
        cidadania: extractedData.cidadania ?? targetCharacter.cidadania ?? 'Rëno',
        seguimento: extractedData.seguimento ?? targetCharacter.seguimento ?? 'Conquistador',
        nivelamento_alma: extractedData.nivelamento_alma ?? targetCharacter.nivelamento_alma ?? '',
        nivel: Number(extractedData.nivel) || targetCharacter.nivel || 1,

        ryo_dourado: Number(extractedData.ryo_dourado) ?? targetCharacter.ryo_dourado ?? 20,
        ryo_prateado: Number(extractedData.ryo_prateado) ?? targetCharacter.ryo_prateado ?? 0,
        ryo_bronze: Number(extractedData.ryo_bronze) ?? targetCharacter.ryo_bronze ?? 0,

        hp_max: Number(extractedData.hp_max) || targetCharacter.hp_max || 100,
        hp_atual: Number(extractedData.hp_atual) ?? targetCharacter.hp_atual ?? extractedData.hp_max ?? 100,
        hp_consumidos: Number(extractedData.hp_consumidos) ?? 0,

        ether_max: Number(extractedData.ether_max) || targetCharacter.ether_max || 100,
        ether_atual: Number(extractedData.ether_atual) ?? targetCharacter.ether_atual ?? extractedData.ether_max ?? 100,
        ether_consumidos: Number(extractedData.ether_consumidos) ?? 0,

        destino_max: Number(extractedData.destino_max) || targetCharacter.destino_max || 5,
        destino_atual: Number(extractedData.destino_atual) ?? targetCharacter.destino_atual ?? extractedData.destino_max ?? 5,
        destino_consumidos: Number(extractedData.destino_consumidos) ?? 0,

        fortitude_max: extractedData.fortitude_max || targetCharacter.fortitude_max || '29+4 | 33 equipados',
        movimento_max: extractedData.movimento_max || targetCharacter.movimento_max || '03 | 15 metros',
        alcance_max: extractedData.alcance_max || targetCharacter.alcance_max || '03 (6) | 15 (30) metros',
        tecnicas_max: extractedData.tecnicas_max || targetCharacter.tecnicas_max || '02 | 00 equipada',

        fisico: Number(extractedData.fisico) ?? targetCharacter.fisico ?? 10,
        destreza: Number(extractedData.destreza) ?? targetCharacter.destreza ?? 10,
        cognicao: Number(extractedData.cognicao) ?? targetCharacter.cognicao ?? 10,
        carisma: Number(extractedData.carisma) ?? targetCharacter.carisma ?? 10,
        primordio: Number(extractedData.primordio) ?? targetCharacter.primordio ?? 0,
        primordio_detalhe: extractedData.primordio_detalhe ?? targetCharacter.primordio_detalhe ?? '',

        ferramenta_fisico: Number(extractedData.ferramenta_fisico) ?? 0,
        ferramenta_fisico_max: Number(extractedData.ferramenta_fisico_max) ?? 2,
        ferramenta_fisico_atual: Number(extractedData.ferramenta_fisico_atual) ?? 2,
        ferramenta_fisico_sec_max: Number(extractedData.ferramenta_fisico_sec_max) ?? 3,
        ferramenta_fisico_sec_atual: Number(extractedData.ferramenta_fisico_sec_atual) ?? 3,

        ferramenta_destreza: Number(extractedData.ferramenta_destreza) ?? 0,
        ferramenta_destreza_max: Number(extractedData.ferramenta_destreza_max) ?? 0,
        ferramenta_destreza_atual: Number(extractedData.ferramenta_destreza_atual) ?? 0,

        ferramenta_cognicao: Number(extractedData.ferramenta_cognicao) ?? 0,
        ferramenta_cognicao_max: Number(extractedData.ferramenta_cognicao_max) ?? 0,
        ferramenta_cognicao_atual: Number(extractedData.ferramenta_cognicao_atual) ?? 0,

        ferramenta_carisma: Number(extractedData.ferramenta_carisma) ?? 0,
        ferramenta_carisma_max: Number(extractedData.ferramenta_carisma_max) ?? 1,
        ferramenta_carisma_atual: Number(extractedData.ferramenta_carisma_atual) ?? 1,
      };

      if (extractedData.html_ataques) payload.html_ataques = extractedData.html_ataques;
      if (extractedData.html_dons) payload.html_dons = extractedData.html_dons;
      if (extractedData.html_equipamentos) payload.html_equipamentos = extractedData.html_equipamentos;
      if (extractedData.html_defesa) payload.html_defesa = extractedData.html_defesa;

      await updateDoc(charRef, payload);
      addLog('success', 'Ficha atualizada no banco de dados com sucesso!');
      
      if (onSuccess) {
        onSuccess(targetCharacter.id);
      }

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error("Erro ao atualizar ficha:", err);
      const errMsg = err?.message || "Falha ao gravar ficha.";
      setError(errMsg);
      addLog('error', `Falha ao salvar: ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNewCharacter = async () => {
    if (!extractedData) return;
    setIsProcessing(true);
    addLog('progress', 'Criando novo personagem Sankötei no banco de dados...');

    try {
      const newId = `char-${Date.now()}`;
      
      const newChar: Character = {
        id: newId,
        nome: extractedData.nome || 'Novo Aventureiro',
        email_dono: '',
        cla: extractedData.cla || '',
        ocupacao: extractedData.ocupacao || '',
        posicao_social: extractedData.posicao_social || '',
        cidadania: extractedData.cidadania || 'Rëno',
        seguimento: extractedData.seguimento || 'Conquistador',
        nivelamento_alma: extractedData.nivelamento_alma || '',
        nivel: Number(extractedData.nivel) || 1,

        ryo_dourado: Number(extractedData.ryo_dourado) ?? 20,
        ryo_prateado: Number(extractedData.ryo_prateado) ?? 0,
        ryo_bronze: Number(extractedData.ryo_bronze) ?? 0,

        hp_max: Number(extractedData.hp_max) || 100,
        hp_atual: Number(extractedData.hp_atual) ?? extractedData.hp_max ?? 100,
        hp_consumidos: Number(extractedData.hp_consumidos) ?? 0,

        ether_max: Number(extractedData.ether_max) || 100,
        ether_atual: Number(extractedData.ether_atual) ?? extractedData.ether_max ?? 100,
        ether_consumidos: Number(extractedData.ether_consumidos) ?? 0,

        destino_max: Number(extractedData.destino_max) || 5,
        destino_atual: Number(extractedData.destino_atual) ?? extractedData.destino_max ?? 5,
        destino_consumidos: Number(extractedData.destino_consumidos) ?? 0,

        fortitude_max: extractedData.fortitude_max || '29+4 | 33 equipados',
        movimento_max: extractedData.movimento_max || '03 | 15 metros',
        alcance_max: extractedData.alcance_max || '03 (6) | 15 (30) metros',
        tecnicas_max: extractedData.tecnicas_max || '02 | 00 equipada',

        fisico: Number(extractedData.fisico) ?? 10,
        destreza: Number(extractedData.destreza) ?? 10,
        cognicao: Number(extractedData.cognicao) ?? 10,
        carisma: Number(extractedData.carisma) ?? 10,
        primordio: Number(extractedData.primordio) ?? 0,
        primordio_detalhe: extractedData.primordio_detalhe || '',

        ferramenta_fisico: Number(extractedData.ferramenta_fisico) ?? 0,
        ferramenta_fisico_max: Number(extractedData.ferramenta_fisico_max) ?? 2,
        ferramenta_fisico_atual: Number(extractedData.ferramenta_fisico_atual) ?? 2,
        ferramenta_fisico_sec_max: Number(extractedData.ferramenta_fisico_sec_max) ?? 3,
        ferramenta_fisico_sec_atual: Number(extractedData.ferramenta_fisico_sec_atual) ?? 3,

        ferramenta_destreza: Number(extractedData.ferramenta_destreza) ?? 0,
        ferramenta_destreza_max: Number(extractedData.ferramenta_destreza_max) ?? 0,
        ferramenta_destreza_atual: Number(extractedData.ferramenta_destreza_atual) ?? 0,

        ferramenta_cognicao: Number(extractedData.ferramenta_cognicao) ?? 0,
        ferramenta_cognicao_max: Number(extractedData.ferramenta_cognicao_max) ?? 0,
        ferramenta_cognicao_atual: Number(extractedData.ferramenta_cognicao_atual) ?? 0,

        ferramenta_carisma: Number(extractedData.ferramenta_carisma) ?? 0,
        ferramenta_carisma_max: Number(extractedData.ferramenta_carisma_max) ?? 1,
        ferramenta_carisma_atual: Number(extractedData.ferramenta_carisma_atual) ?? 1,

        img_saudavel: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=60',
        img_ferido: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=60',
        img_muito_ferido: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=60',

        html_ataques: extractedData.html_ataques || '',
        html_dons: extractedData.html_dons || '',
        html_equipamentos: extractedData.html_equipamentos || '',
        html_defesa: extractedData.html_defesa || '',
        ativo_na_mesa: true
      };

      await setDoc(doc(db, 'characters', newId), newChar);
      addLog('success', `Personagem "${newChar.nome}" cadastrado com sucesso!`);

      if (onSuccess) {
        onSuccess(newId);
      }

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error("Erro ao criar nova ficha:", err);
      const errMsg = err?.message || "Falha ao gravar nova ficha.";
      setError(errMsg);
      addLog('error', `Falha ao criar: ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#09090b] border border-blue-500/50 shadow-2xl relative max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-950/60 to-slate-900/60 border-b border-white/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>Importador de Ficha PDF / Sankötei</span>
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-mono font-normal">IA Gemini</span>
              </h3>
              <p className="text-[11px] text-white/50 font-mono">
                Faça upload do PDF oficial da ficha para sincronizar dados e atributos antigos instantaneamente
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/40 hover:text-white p-1 rounded hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Target notice */}
          {targetCharacter && (
            <div className="bg-sky-950/30 border border-sky-500/30 p-2.5 rounded flex items-center justify-between text-sky-200">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Destino da importação: <strong>{targetCharacter.nome}</strong> (Nv. {targetCharacter.nivel})</span>
              </div>
              <span className="text-[10px] font-mono text-sky-400/80 bg-sky-900/40 px-2 py-0.5 rounded">Ficha Existente</span>
            </div>
          )}

          {/* Upload Dropzone */}
          {!extractedData && (
            <div className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isProcessing 
                    ? 'border-blue-500 bg-blue-950/20 pointer-events-none' 
                    : 'border-white/20 hover:border-blue-400 bg-black/40 hover:bg-blue-950/10'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf,.pdf,text/plain,image/*" 
                  className="hidden" 
                />

                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2 py-2 text-blue-400">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                    <p className="font-bold text-sm">
                      {currentStep === 'reading' && 'Lendo arquivo PDF...'}
                      {currentStep === 'gemini_analyzing' && 'Analisando documento com IA Gemini...'}
                      {currentStep === 'parsing_sankotei' && 'Mapeando regras e atributos Sankötei...'}
                      {currentStep === 'idle' && 'Aguardando processamento...'}
                    </p>
                    <p className="text-[11px] text-white/50 font-mono">Veja os detalhes na janela de status abaixo</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-blue-600/10 text-blue-400 rounded-full border border-blue-500/20">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">Clique para selecionar o PDF ou arraste aqui</p>
                      <p className="text-white/40 text-[11px] mt-0.5">Suporta PDF da Ficha Sankötei oficial (todas as páginas diagramadas)</p>
                    </div>
                    {file && (
                      <span className="text-emerald-400 font-mono text-[11px] bg-emerald-950/40 px-3 py-1 rounded border border-emerald-500/30">
                        📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Raw Text Fallback Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowRawTextInput(!showRawTextInput)}
                  className="text-[11px] text-white/40 hover:text-sky-300 flex items-center gap-1 font-mono underline decoration-dotted"
                >
                  <span>{showRawTextInput ? 'Ocultar inserção manual de texto' : 'Ou colar o texto / OCR da ficha manualmente'}</span>
                </button>

                {showRawTextInput && (
                  <div className="mt-2 space-y-2 animate-in fade-in">
                    <textarea
                      rows={4}
                      value={rawTextFallback}
                      onChange={e => setRawTextFallback(e.target.value)}
                      placeholder="Cole aqui o texto copiado da ficha (Nome e Clã, Atributos, Combate, etc.)..."
                      className="w-full bg-[#050505] text-white border border-white/10 p-2.5 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      disabled={!rawTextFallback.trim() || isProcessing}
                      onClick={handleProcessRawText}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold uppercase text-xs rounded transition flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Processar Texto com Gemini IA</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DEDICATED REAL-TIME IMPORT STATUS WINDOW */}
          {(statusLogs.length > 0 || isProcessing || error) && (
            <div className="bg-[#05070d] border border-blue-500/30 rounded-lg p-3.5 shadow-xl space-y-3 animate-in fade-in">
              
              {/* Status Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-sky-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">Status da Importação</span>
                  
                  {/* Active Indicator Badge */}
                  {isProcessing && (
                    <span className="flex items-center gap-1.5 bg-blue-950 text-sky-300 border border-blue-500/40 text-[9px] font-mono px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
                      Em andamento...
                    </span>
                  )}
                  {currentStep === 'success' && (
                    <span className="flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      Concluído com Sucesso
                    </span>
                  )}
                  {currentStep === 'error' && (
                    <span className="flex items-center gap-1 bg-rose-950 text-rose-300 border border-rose-500/40 text-[9px] font-mono px-2 py-0.5 rounded-full">
                      <AlertTriangle className="h-3 w-3" />
                      Falha na Extração
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-mono text-white/40">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    currentStep === 'error' ? 'bg-rose-500' : currentStep === 'success' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-sky-400'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Steps Visual Check */}
              <div className="grid grid-cols-4 gap-1 text-[10px] font-mono pt-1">
                <div className={`p-1.5 rounded text-center border ${
                  progressPercent >= 15 ? 'bg-blue-950/40 border-blue-500/40 text-sky-300' : 'bg-white/[0.02] border-white/5 text-white/30'
                }`}>
                  1. Leitura
                </div>
                <div className={`p-1.5 rounded text-center border ${
                  progressPercent >= 45 ? 'bg-blue-950/40 border-blue-500/40 text-sky-300' : 'bg-white/[0.02] border-white/5 text-white/30'
                }`}>
                  2. IA Gemini
                </div>
                <div className={`p-1.5 rounded text-center border ${
                  progressPercent >= 80 ? 'bg-blue-950/40 border-blue-500/40 text-sky-300' : 'bg-white/[0.02] border-white/5 text-white/30'
                }`}>
                  3. Atributos
                </div>
                <div className={`p-1.5 rounded text-center border ${
                  progressPercent === 100 && currentStep === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-white/[0.02] border-white/5 text-white/30'
                }`}>
                  4. Conclusão
                </div>
              </div>

              {/* Console Logs list */}
              <div className="bg-black/70 border border-white/10 rounded p-2.5 max-h-36 overflow-y-auto font-mono text-[11px] space-y-1.5 custom-scroll">
                {statusLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-white/30 shrink-0 select-none">[{log.time}]</span>
                    {log.type === 'progress' && <span className="text-sky-400 font-bold shrink-0">⏳</span>}
                    {log.type === 'info' && <span className="text-blue-400 font-bold shrink-0">ℹ️</span>}
                    {log.type === 'success' && <span className="text-emerald-400 font-bold shrink-0">✅</span>}
                    {log.type === 'error' && <span className="text-rose-400 font-bold shrink-0">❌</span>}
                    
                    <span className={
                      log.type === 'error' ? 'text-rose-300' :
                      log.type === 'success' ? 'text-emerald-300 font-semibold' :
                      log.type === 'progress' ? 'text-sky-200' : 'text-white/70'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>

              {/* Helpful error diagnostic tip */}
              {error && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded text-[11px] text-rose-300 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Diagnóstico do Processamento:</p>
                      <p className="text-white/80">
                        O backend concluiu o carregamento das rotas da API. Se o erro ocorreu durante uma inicialização, você pode reprocessar o mesmo arquivo agora.
                      </p>
                    </div>
                  </div>

                  {file && (
                    <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
                      <button
                        type="button"
                        onClick={() => processFile(file)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded flex items-center gap-1.5 shadow transition"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Tentar Novamente ({file.name})</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Extracted Data Preview */}
          {extractedData && (
            <div className="space-y-4 animate-in fade-in">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Check className="h-4 w-4" />
                  <span>Ficha Reconhecida: {extractedData.nome} {extractedData.cla ? `(${extractedData.cla})` : ''}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExtractedData(null);
                    setFile(null);
                    setStatusLogs([]);
                    setCurrentStep('idle');
                    setProgressPercent(0);
                  }}
                  className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 font-mono"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Novo arquivo</span>
                </button>
              </div>

              {/* Character Identity & Finances Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white/5 p-3 rounded border border-white/10 font-mono text-[11px]">
                <div>
                  <span className="text-white/40 block text-[9px] uppercase">Ocupação / Social</span>
                  <span className="text-white font-bold truncate block">{extractedData.ocupacao || extractedData.posicao_social || '-'}</span>
                </div>
                <div>
                  <span className="text-white/40 block text-[9px] uppercase">Cidadania</span>
                  <span className="text-white font-bold truncate block">{extractedData.cidadania || 'Rëno'}</span>
                </div>
                <div>
                  <span className="text-white/40 block text-[9px] uppercase">Seguimento</span>
                  <span className="text-white font-bold truncate block">{extractedData.seguimento || 'Conquistador'}</span>
                </div>
                <div>
                  <span className="text-white/40 block text-[9px] uppercase">Nivelamento</span>
                  <span className="text-sky-400 font-bold truncate block">Nv. {extractedData.nivel || 1}</span>
                </div>
              </div>

              {/* Vitals Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-rose-950/30 border border-rose-500/30 p-2.5 rounded text-center">
                  <div className="flex items-center justify-center gap-1 text-rose-400 text-[10px] font-bold uppercase mb-1">
                    <Heart className="h-3 w-3" />
                    <span>Saúde (HP)</span>
                  </div>
                  <div className="text-base font-black text-white font-mono">{extractedData.hp_atual} / {extractedData.hp_max}</div>
                  <div className="text-[9px] text-rose-300/70 font-mono">Consumidos: {extractedData.hp_consumidos || 0}</div>
                </div>

                <div className="bg-cyan-950/30 border border-cyan-500/30 p-2.5 rounded text-center">
                  <div className="flex items-center justify-center gap-1 text-cyan-400 text-[10px] font-bold uppercase mb-1">
                    <Zap className="h-3 w-3" />
                    <span>Energia (Éter)</span>
                  </div>
                  <div className="text-base font-black text-white font-mono">{extractedData.ether_atual} / {extractedData.ether_max}</div>
                  <div className="text-[9px] text-cyan-300/70 font-mono">Consumidos: {extractedData.ether_consumidos || 0}</div>
                </div>

                <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-400 text-[10px] font-bold uppercase mb-1">
                    <Star className="h-3 w-3" />
                    <span>Destino (Henaen)</span>
                  </div>
                  <div className="text-base font-black text-white font-mono">{extractedData.destino_atual} / {extractedData.destino_max}</div>
                  <div className="text-[9px] text-amber-300/70 font-mono">Consumidos: {extractedData.destino_consumidos || 0}</div>
                </div>
              </div>

              {/* Primary Attributes Grid */}
              <div>
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block mb-1">Atributos Base & Ferramentas</span>
                <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
                  <div className="bg-black/60 border border-white/10 p-2 rounded">
                    <span className="text-[9px] text-white/50 block font-bold">FOR (FIS)</span>
                    <span className="text-sm font-black text-white">{extractedData.fisico}</span>
                    <span className="text-[8px] text-sky-400/80 block mt-0.5">{extractedData.ferramenta_fisico_atual ?? 2}/{extractedData.ferramenta_fisico_max ?? 2} {extractedData.ferramenta_fisico_sec_max ? `• ${extractedData.ferramenta_fisico_sec_atual}/${extractedData.ferramenta_fisico_sec_max}` : ''}</span>
                  </div>
                  <div className="bg-black/60 border border-white/10 p-2 rounded">
                    <span className="text-[9px] text-white/50 block font-bold">DES</span>
                    <span className="text-sm font-black text-white">{extractedData.destreza}</span>
                    <span className="text-[8px] text-sky-400/80 block mt-0.5">{extractedData.ferramenta_destreza_atual ?? 0}/{extractedData.ferramenta_destreza_max ?? 0}</span>
                  </div>
                  <div className="bg-black/60 border border-white/10 p-2 rounded">
                    <span className="text-[9px] text-white/50 block font-bold">COG</span>
                    <span className="text-sm font-black text-white">{extractedData.cognicao}</span>
                    <span className="text-[8px] text-sky-400/80 block mt-0.5">{extractedData.ferramenta_cognicao_atual ?? 0}/{extractedData.ferramenta_cognicao_max ?? 0}</span>
                  </div>
                  <div className="bg-black/60 border border-white/10 p-2 rounded">
                    <span className="text-[9px] text-white/50 block font-bold">CAR</span>
                    <span className="text-sm font-black text-white">{extractedData.carisma}</span>
                    <span className="text-[8px] text-sky-400/80 block mt-0.5">{extractedData.ferramenta_carisma_atual ?? 1}/{extractedData.ferramenta_carisma_max ?? 1}</span>
                  </div>
                  <div className="bg-black/60 border border-cyan-500/30 p-2 rounded">
                    <span className="text-[9px] text-cyan-400 block font-bold">PRI</span>
                    <span className="text-sm font-black text-cyan-300">{extractedData.primordio}</span>
                    <span className="text-[8px] text-cyan-400/70 block mt-0.5 truncate">{extractedData.primordio_detalhe || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Combat & Markers mini-badge */}
              <div className="bg-black/40 border border-white/10 p-2.5 rounded font-mono text-[10px] space-y-1">
                <div className="flex justify-between text-white/70">
                  <span>Fortitude: <strong className="text-white">{extractedData.fortitude_max || '33 equipados'}</strong></span>
                  <span>Movimento: <strong className="text-white">{extractedData.movimento_max || '15 metros'}</strong></span>
                  <span>Alcance: <strong className="text-white">{extractedData.alcance_max || '15 metros'}</strong></span>
                </div>
                <div className="flex items-center gap-3 pt-1 border-t border-white/5 text-amber-300/80">
                  <Coins className="h-3.5 w-3.5" />
                  <span>Finanças: {extractedData.ryo_dourado ?? 20} Dourado • {extractedData.ryo_prateado ?? 0} Prateado • {extractedData.ryo_bronze ?? 0} Bronze</span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-black/80 border-t border-white/10 flex flex-wrap justify-between items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider rounded"
          >
            Fechar
          </button>

          {extractedData && (
            <div className="flex items-center gap-2">
              {targetCharacter ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (onApplyToQuickStats) {
                        onApplyToQuickStats(extractedData);
                        onClose();
                      }
                    }}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-sky-300 text-xs font-bold uppercase tracking-wider rounded border border-sky-500/30"
                  >
                    Preencher no Ajuste Rápido
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleApplyToExistingCharacter}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded shadow flex items-center gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Aplicar Tudo na Ficha</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCreateNewCharacter}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded shadow flex items-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Criar Nova Ficha a partir do PDF</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
