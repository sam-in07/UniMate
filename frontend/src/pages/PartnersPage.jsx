import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  CheckCircle2,
  Clock,
  Sparkles,
  School,
  GraduationCap,
  MessageSquare,
  ShieldAlert,
  Flag,
  UserX,
  X,
  Loader2,
  Send,
  HeartHandshake
} from 'lucide-react';

export default function PartnersPage() {
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || '';
  const initialTab = searchParams.get('tab') || 'discover';

  const { currentUser, isGuest, guardNonAnonymous } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab); // 'discover' | 'requests'
  const [matches, setMatches] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterUniversity, setFilterUniversity] = useState('');
  const [filterLookingFor, setFilterLookingFor] = useState('');
  const [filterSkill, setFilterSkill] = useState(initialFilter);

  // Connect Modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [connectMessage, setConnectMessage] = useState('');
  const [sendingConnect, setSendingConnect] = useState(false);

  // Report & Block
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const fetchDiscover = async () => {
    setLoading(true);
    try {
      const res = await api.discoverPartners({
        university: filterUniversity || undefined,
        lookingFor: filterLookingFor || undefined,
        skill: filterSkill || undefined
      });
      setMatches(res.matches || []);
    } catch (err) {
      toast.error('Failed to load peer matches');
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const res = await api.getConnections();
      setConnections(res.connections || []);
    } catch (err) {
      console.warn('Failed to fetch connections:', err.message);
    }
  };

  useEffect(() => {
    fetchDiscover();
    if (!isGuest && currentUser) {
      fetchConnections();
    }
  }, [filterUniversity, filterLookingFor, filterSkill]);

  const handleSendConnection = async (e) => {
    e.preventDefault();
    if (!guardNonAnonymous('Sign in with Google to send connection requests to students.')) {
      return;
    }

    setSendingConnect(true);
    try {
      await api.sendConnection({
        toUid: selectedCandidate.uid,
        message: connectMessage
      });
      toast.success(`Connection request sent to ${selectedCandidate.displayName}!`);
      setSelectedCandidate(null);
      setConnectMessage('');
      fetchConnections();
    } catch (err) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSendingConnect(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updateConnection(id, status);
      toast.success(`Connection ${status}!`);
      fetchConnections();
    } catch (err) {
      toast.error(err.message || 'Failed to update connection');
    }
  };

  const handleBlock = async (uid, name) => {
    if (!window.confirm(`Are you sure you want to block ${name}?`)) return;
    try {
      await api.blockUser(uid);
      toast.success(`${name} has been blocked.`);
      fetchDiscover();
    } catch (err) {
      toast.error(err.message || 'Failed to block user');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReporting(true);
    try {
      await api.report({
        targetType: 'profile',
        targetId: reportingId,
        reason: reportReason
      });
      toast.success('Report submitted. Thank you for keeping our campus safe.');
      setReportingId(null);
      setReportReason('');
    } catch (err) {
      toast.error(err.message || 'Failed to submit report');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Collaborator Finder
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Find study partners, conference teammates, paper co-authors, and project mates matched by AI.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'discover'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Discover Partners
          </button>
          <button
            onClick={() => {
              if (guardNonAnonymous('Sign in with Google to view and manage connection requests.')) {
                setActiveTab('requests');
                fetchConnections();
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Requests ({connections.filter(c => c.status === 'pending' && c.direction === 'received').length})</span>
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-900 dark:text-brand-200 flex items-start gap-2.5 mb-6">
        <ShieldAlert className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
        <span>
          <strong>Campus Safety Notice:</strong> UniMate connects university and college students. Please maintain academic ethics and civility. Minors may use this platform; never share private home addresses, passwords, or personal banking info.
        </span>
      </div>

      {activeTab === 'discover' ? (
        <>
          {/* Filters Row */}
          <div className="p-4 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Filter by university (e.g. DU, BUET)..."
                value={filterUniversity}
                onChange={(e) => setFilterUniversity(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Filter by skill or topic (e.g. Python, DBMS)..."
                value={filterSkill}
                onChange={(e) => setFilterSkill(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
            </div>

            <select
              value={filterLookingFor}
              onChange={(e) => setFilterLookingFor(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="">Looking For: Any Goal</option>
              <option value="study partner">Study Partner</option>
              <option value="project mate">Project Mate</option>
              <option value="conference team">Conference Team</option>
              <option value="paper co-author">Paper Co-Author</option>
            </select>
          </div>

          {/* Peer Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                No Student Collaborators Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your search filters or update your own profile skills to discover matches.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {matches.map(peer => (
                <motion.div
                  key={peer.uid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 hover:shadow-soft-hover transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Student Identity */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {peer.photoURL ? (
                          <img src={peer.photoURL} alt={peer.displayName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-brand-500/20" />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 font-bold text-base flex items-center justify-center">
                            {peer.displayName?.[0] || 'S'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {peer.displayName}
                            </h3>
                            {peer.isDemo && (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Demo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <School className="w-3.5 h-3.5" />
                            <span>{peer.university || 'University'}</span>
                            {peer.program && <span>• {peer.program}</span>}
                          </p>
                        </div>
                      </div>

                      {/* Flag / Block menu */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setReportingId(peer.uid)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                          title="Report Profile"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleBlock(peer.uid, peer.displayName)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Block User"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* AI "Why this match" card */}
                    {peer.whyThisMatch && (
                      <div className="p-3 rounded-2xl bg-gradient-to-r from-brand-500/10 via-indigo-500/5 to-amber-500/10 border border-brand-500/20 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-brand-700 dark:text-brand-300 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>AI Match Insights ({peer.matchScore || 75}% fit)</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                          {peer.whyThisMatch}
                        </p>
                      </div>
                    )}

                    {/* Bio */}
                    {peer.bio && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                        "{peer.bio}"
                      </p>
                    )}

                    {/* Skills & Goals Tags */}
                    <div className="space-y-1.5">
                      {peer.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {peer.skills.map((s, i) => (
                            <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {peer.lookingFor?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {peer.lookingFor.map((goal, i) => (
                            <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 capitalize">
                              Looking for: {goal}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Connect Action */}
                  <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {peer.availability || 'Flexible'}
                    </span>

                    <button
                      onClick={() => {
                        if (guardNonAnonymous('Sign in with Google to send a connection request.')) {
                          setSelectedCandidate(peer);
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Connect</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Requests & Accepted Connections Tab */
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
            Your Connections & Requests
          </h2>

          {connections.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800">
              <HeartHandshake className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                No Connections Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Explore the discover tab to find and connect with students studying your courses.
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold"
              >
                Find Collaborators
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map(conn => (
                <div
                  key={conn.id}
                  className="p-5 rounded-2xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {conn.direction === 'received' ? 'Received from Student' : 'Sent Request'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        conn.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : conn.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {conn.status}
                      </span>
                    </div>
                    {conn.message && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        "{conn.message}"
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {new Date(conn.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {conn.direction === 'received' && conn.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(conn.id, 'accepted')}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(conn.id, 'declined')}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {conn.status === 'accepted' && (
                      <Link
                        to={`/chat`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open Chat</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Connect Message Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Connect with {selectedCandidate.displayName}
              </h3>
              <button onClick={() => setSelectedCandidate(null)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendConnection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Intro Note (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder={`Hi ${selectedCandidate.displayName}, I saw we both study ${selectedCandidate.program || 'CS'} and have common study interests. Would love to collaborate on course revision!`}
                  value={connectMessage}
                  onChange={(e) => setConnectMessage(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              <div className="text-[11px] text-slate-400">
                Once accepted, private in-app chat will automatically unlock between you two.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingConnect}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {sendingConnect ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Send Request</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Report Modal */}
      {reportingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Report Student Profile
            </h3>
            <p className="text-xs text-slate-500">
              Please describe the misconduct or safety issue (e.g. harassment, impersonation, offensive bio).
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <textarea
                rows={3}
                required
                placeholder="Reason for report..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportingId(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reporting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  {reporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}

