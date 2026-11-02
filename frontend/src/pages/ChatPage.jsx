import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  MessageSquare,
  Send,
  User,
  ShoppingBag,
  Users,
  Flag,
  UserX,
  X,
  Loader2,
  Lock,
  ArrowRight
} from 'lucide-react';

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const initialChatId = searchParams.get('chatId');

  const { currentUser, isGuest, guardNonAnonymous, loginWithGoogle } = useAuth();
  const { toast } = useToast();

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(initialChatId || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Report & Block state
  const [reportingChat, setReportingChat] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const messagesEndRef = useRef(null);

  const fetchChats = async () => {
    if (isGuest || !currentUser) return;
    try {
      const res = await api.getChats();
      setChats(res.chats || []);
      if (!activeChatId && res.chats?.length > 0) {
        setActiveChatId(res.chats[0].id);
      }
    } catch (err) {
      console.warn('Failed to load chats:', err.message);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId) => {
    if (!chatId) return;
    setLoadingMessages(true);
    try {
      const res = await api.getChatMessages(chatId);
      setMessages(res.messages || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load conversation');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [currentUser, isGuest]);

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
      const interval = setInterval(() => {
        api.getChatMessages(activeChatId)
          .then(res => setMessages(res.messages || []))
          .catch(() => {});
      }, 5000); // 5s poll
      return () => clearInterval(interval);
    }
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChatId) return;

    setSending(true);
    try {
      const res = await api.sendMessage(activeChatId, text.trim());
      setMessages(prev => [...prev, res.message]);
      setText('');
      fetchChats(); // update last message snippet
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  if (isGuest || !currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Private Student Chat Locked
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          In-app messaging requires signing in with Google. Guests cannot send or receive private messages.
        </p>
        <button
          onClick={loginWithGoogle}
          className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-soft transition-all"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-5.5rem)] flex flex-col">
      
      <div className="flex-1 flex rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden">
        
        {/* Left Column: Conversations List */}
        <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/40">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Messages</h2>
            <p className="text-[11px] text-slate-400">Accepted peers & marketplace chats</p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingChats ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              </div>
            ) : chats.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 px-4">
                No active conversations yet. Connect with a student or chat with a book seller!
              </div>
            ) : (
              chats.map(chat => {
                const isActive = chat.id === activeChatId;
                const isMarket = chat.type === 'marketplace';
                const otherUid = chat.participants.find(u => u !== currentUser.uid);

                return (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`w-full p-3 rounded-2xl text-left transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-xs'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-brand-500/10 text-brand-500'
                    }`}>
                      {isMarket ? <ShoppingBag className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold truncate">
                          {isMarket ? 'Marketplace Buyer/Seller' : 'Peer Collaborator'}
                        </p>
                        <span className={`text-[9px] ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                          {chat.lastMessage ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                        {chat.lastMessage?.text || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Room */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
          {activeChatId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 font-bold flex items-center justify-center text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {activeChat?.type === 'marketplace' ? 'Textbook Purchase Discussion' : 'Peer Study Chat'}
                    </h3>
                    <p className="text-[10px] text-slate-400">Zero phone/email shared • Safe Campus Chat</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setReportingChat(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                    title="Report Chat"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Say hello! Introduce yourself and discuss study questions or textbook pickup.
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderUid === currentUser.uid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            isMe
                              ? 'bg-brand-600 text-white rounded-tr-none'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          <span className={`block text-[9px] mt-1 ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={sending}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />

                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="p-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <MessageSquare className="w-12 h-12 opacity-30 mb-3" />
              <p className="text-sm font-semibold">Select a conversation to start chatting</p>
            </div>
          )}
        </div>

      </div>

      {/* Report Chat Modal */}
      {reportingChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Report Message Thread</h3>
            <textarea
              rows={3}
              placeholder="State reason for reporting..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setReportingChat(false)} className="px-3 py-1.5 text-xs text-slate-500">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await api.report({ targetType: 'message', targetId: activeChatId, reason: reportReason });
                  toast.success('Report submitted.');
                  setReportingChat(false);
                }}
                className="px-4 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-xl"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

