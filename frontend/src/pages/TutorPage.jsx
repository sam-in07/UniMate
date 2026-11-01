import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { startVoiceRecognition, isSTTSupported, speakText, stopSpeaking, isTTSSupported } from '../lib/speech';
import {
  GraduationCap,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Paperclip,
  RotateCcw,
  BookMarked,
  Languages,
  User,
  Bot,
  Loader2,
  HelpCircle,
  Lightbulb
} from 'lucide-react';

export default function TutorPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your UniMate Academic Tutor. Ask me any conceptual question, attach your study notes, or click "Explain Simpler" or "Give Example" to break down complex university topics.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('Computer Science');
  const [level, setLevel] = useState('undergrad');
  const [language, setLanguage] = useState('en');
  const [islamicMode, setIslamicMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [savedMaterials, setSavedMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedMaterialText, setSelectedMaterialText] = useState('');

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved materials so user can attach one as context
    api.getLibrary()
      .then(res => {
        if (res.library?.materials) {
          setSavedMaterials(res.library.materials);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleMaterialChange = (e) => {
    const id = e.target.value;
    setSelectedMaterialId(id);
    const found = savedMaterials.find(m => m.id === id);
    setSelectedMaterialText(found ? found.extractedText : '');
    if (found) {
      toast.info(`Attached context: "${found.title}"`);
    }
  };

  const handleSend = async (overridePrompt = null, overrideMode = 'standard') => {
    const promptToSend = overridePrompt || input;
    if (!promptToSend.trim()) return;

    const userMessage = {
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!overridePrompt) setInput('');
    setLoading(true);

    try {
      const history = messages.slice(1).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.explain({
        prompt: promptToSend,
        contextText: selectedMaterialText || undefined,
        subject,
        level,
        language,
        mode: overrideMode,
        islamicMode,
        history
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          provider: res.provider,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      toast.error(err.message || 'AI Tutor failed to respond');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    if (!isSTTSupported()) {
      toast.error('Voice input (Speech Recognition) is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    setListening(true);
    recognitionRef.current = startVoiceRecognition({
      lang: language,
      onResult: (transcript) => {
        setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
      },
      onError: (errMsg) => {
        toast.error('Voice error: ' + errMsg);
        setListening(false);
      },
      onEnd: () => {
        setListening(false);
      }
    });
  };

  const handleReadAloud = (text, idx) => {
    if (speakingIdx === idx) {
      stopSpeaking();
      setSpeakingIdx(null);
      return;
    }

    setSpeakingIdx(idx);
    speakText(text, {
      lang: language,
      onEnd: () => setSpeakingIdx(null)
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-6rem)] flex flex-col">
      
      {/* Top Controls Bar */}
      <div className="p-3.5 mb-4 rounded-2xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white">AI Academic Tutor</h1>
            <p className="text-[10px] text-slate-400">Contextual follow-ups & active recall</p>
          </div>
        </div>

        {/* Filters & Mode Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Level */}
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-[11px] font-medium"
          >
            <option value="high_school">College / Higher Sec</option>
            <option value="undergrad">Undergraduate</option>
            <option value="postgrad">Postgraduate</option>
          </select>

          {/* Language */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-[11px] font-medium"
          >
            <option value="en">English</option>
            <option value="bn">বাংলা (Bengali)</option>
            <option value="mixed">Banglish</option>
          </select>

          {/* Islamic Studies Mode Toggle */}
          <button
            onClick={() => setIslamicMode(!islamicMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
              islamicMode
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40'
                : 'text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5 text-emerald-600" />
            <span>Islamic Mode</span>
          </button>

          {/* Attach Material Context */}
          {savedMaterials.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedMaterialId}
                onChange={handleMaterialChange}
                className="py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-[11px] max-w-[130px] truncate"
              >
                <option value="">Attach Notes...</option>
                {savedMaterials.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Session */}
          <button
            onClick={() => {
              setMessages([messages[0]]);
              toast.info('Chat session cleared.');
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chat Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 mb-4 shadow-soft">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                  isUser
                    ? 'bg-brand-600 text-white'
                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-none shadow-xs'
                } ${language === 'bn' ? 'font-bengali' : ''}`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>

                <div className="mt-2 pt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] opacity-70">
                  <span>{m.timestamp}</span>
                  {!isUser && isTTSSupported() && (
                    <button
                      onClick={() => handleReadAloud(m.content, idx)}
                      className="hover:opacity-100 flex items-center gap-1 p-0.5 ml-2"
                      title={speakingIdx === idx ? 'Stop read aloud' : 'Read aloud'}
                    >
                      {speakingIdx === idx ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Typing / Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-xs text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            <span>AI Tutor is thinking...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Buttons ("Explain Simpler" & "Give Example") */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[11px] font-semibold text-slate-400">Quick actions:</span>
        <button
          onClick={() => handleSend('Can you explain that simpler with a clear analogy?', 'simpler')}
          disabled={loading || messages.length < 2}
          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Explain Simpler</span>
        </button>

        <button
          onClick={() => handleSend('Can you provide 2-3 real-world practical examples of this concept?', 'example')}
          disabled={loading || messages.length < 2}
          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Give Real Example</span>
        </button>
      </div>

      {/* Input Form with Voice Mic & Send */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 p-2 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-soft"
      >
        <button
          type="button"
          onClick={handleVoiceInput}
          className={`p-2.5 rounded-xl border transition-all ${
            listening
              ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent'
          }`}
          title={listening ? 'Stop listening' : 'Speak into microphone (Web Speech API)'}
        >
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? 'Listening to your voice...' : 'Ask your tutor a question or follow-up...'}
          disabled={loading}
          className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-sans"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}

