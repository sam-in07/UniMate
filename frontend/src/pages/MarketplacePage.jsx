import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api, resolveFileUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import UserAvatar from '../components/UserAvatar';
import {
  ShoppingBag,
  Search,
  Filter,
  Plus,
  Sparkles,
  School,
  DollarSign,
  Tag,
  ShieldAlert,
  MessageSquare,
  Flag,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  HelpCircle,
  BookOpen
} from 'lucide-react';

export default function MarketplacePage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const { currentUser, isGuest, guardNonAnonymous } = useAuth();
  const { toast } = useToast();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);

  // Listing Detail Modal
  const [activeListing, setActiveListing] = useState(null);
  const [activeSeller, setActiveSeller] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Listing Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiAssisting, setAiAssisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    edition: '',
    isbn: '',
    tags: '',
    condition: 'good',
    price: '',
    currency: 'BDT',
    university: '',
    city: 'Dhaka',
    description: '',
    photos: []
  });

  // Report Modal
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  // Chat initiation
  const [initiatingChat, setInitiatingChat] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await api.getListings({
        search: searchQuery || undefined,
        tags: selectedTag || undefined,
        condition: selectedCondition || undefined,
        university: selectedUniversity || undefined
      });
      setListings(res.listings || []);
    } catch (err) {
      toast.error('Failed to load marketplace listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedTag, selectedCondition, selectedUniversity]);

  // Handle standard search vs semantic search
  const handleSemanticSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchListings();
      return;
    }

    setIsSemanticSearching(true);
    try {
      const res = await api.semanticSearchListings(searchQuery);
      setListings(res.listings || []);
      if (res.aiInterpretation?.tags?.length) {
        toast.info(`AI searched tags: #${res.aiInterpretation.tags.join(', #')}`);
      }
    } catch (err) {
      // Fallback to text search
      fetchListings();
    } finally {
      setIsSemanticSearching(false);
    }
  };

  // Open Listing Detail
  const handleOpenDetail = async (id) => {
    setLoadingDetail(true);
    setActiveListing(null);
    try {
      const res = await api.getListing(id);
      setActiveListing(res.listing);
      setActiveSeller(res.seller);
    } catch (err) {
      toast.error('Failed to load listing details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // AI Assist for creating listing
  const handleAIAssist = async () => {
    const query = formData.isbn || formData.title;
    if (!query || query.trim().length < 2) {
      toast.error('Please enter a book title or ISBN first to use AI Assist.');
      return;
    }

    setAiAssisting(true);
    try {
      const res = await api.aiAssistListing({ query });
      if (res.suggestion) {
        setFormData(prev => ({
          ...prev,
          title: res.suggestion.title || prev.title,
          author: res.suggestion.author || prev.author,
          edition: res.suggestion.edition || prev.edition,
          tags: res.suggestion.tags ? res.suggestion.tags.join(', ') : prev.tags,
          price: res.suggestion.suggestedPriceMin ? String(res.suggestion.suggestedPriceMin) : prev.price
        }));
        toast.success(`AI populated metadata! Suggested price range: ${res.suggestion.suggestedPriceMin}–${res.suggestion.suggestedPriceMax} BDT`);
      }
    } catch (err) {
      toast.error(err.message || 'AI assist could not find book details');
    } finally {
      setAiAssisting(false);
    }
  };

  // Create Listing Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!guardNonAnonymous('Sign in with Google to create a book listing and sell on campus.')) {
      return;
    }

    setSubmitting(true);
    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      await api.createListing({
        ...formData,
        price: Number(formData.price),
        tags: tagsArray
      });
      toast.success('Book listed successfully in student marketplace!');
      setShowCreateModal(false);
      setFormData({
        title: '',
        author: '',
        edition: '',
        isbn: '',
        tags: '',
        condition: 'good',
        price: '',
        currency: 'BDT',
        university: '',
        city: 'Dhaka',
        description: '',
        photos: []
      });
      fetchListings();
    } catch (err) {
      toast.error(err.message || 'Failed to publish listing');
    } finally {
      setSubmitting(false);
    }
  };

  // Chat with Seller
  const handleChatWithSeller = async () => {
    if (!guardNonAnonymous('Sign in with Google to chat securely with book sellers.')) {
      return;
    }

    if (!activeListing) return;
    if (activeListing.sellerUid === currentUser?.uid) {
      toast.info('This is your own listing.');
      return;
    }

    setInitiatingChat(true);
    try {
      const res = await api.openChat({
        participantUid: activeListing.sellerUid,
        type: 'marketplace',
        listingId: activeListing.id
      });
      window.location.href = `/chat?chatId=${res.chat.id}`;
    } catch (err) {
      toast.error(err.message || 'Could not initiate chat');
    } finally {
      setInitiatingChat(false);
    }
  };

  // Mark Sold
  const handleMarkSold = async (id) => {
    try {
      await api.markListingSold(id);
      toast.success('Listing marked as sold!');
      if (activeListing) setActiveListing(prev => ({ ...prev, status: 'sold' }));
      fetchListings();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // Submit Report
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReporting(true);
    try {
      await api.report({
        targetType: 'listing',
        targetId: reportingId,
        reason: reportReason
      });
      toast.success('Report submitted. Moderators will review promptly.');
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
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Used-Book Marketplace
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Buy and sell course textbooks on campus with natural language search & AI price estimates.
          </p>
        </div>

        <button
          onClick={() => {
            if (guardNonAnonymous('Sign in with Google to post a book listing.')) {
              setShowCreateModal(true);
            }
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-soft hover:shadow-soft-hover transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>List a Book</span>
        </button>
      </div>

      {/* Natural Language AI Semantic Search Bar */}
      <form
        onSubmit={handleSemanticSearch}
        className="p-3 sm:p-4 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row items-center gap-3"
      >
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Try natural language: "I need a DBMS book for 3rd semester" or "Silberschatz OS"...'
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <button
          type="submit"
          disabled={isSemanticSearching}
          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isSemanticSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-600" />
          )}
          <span>AI Search</span>
        </button>
      </form>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 mb-8 text-xs">
        <span className="text-slate-400 flex items-center gap-1 font-semibold text-[11px] uppercase mr-1">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </span>

        <select
          value={selectedCondition}
          onChange={(e) => setSelectedCondition(e.target.value)}
          className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
        >
          <option value="">All Conditions</option>
          <option value="new">New</option>
          <option value="like_new">Like New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
        </select>

        <select
          value={selectedUniversity}
          onChange={(e) => setSelectedUniversity(e.target.value)}
          className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
        >
          <option value="">All Universities</option>
          <option value="University of Dhaka">University of Dhaka</option>
          <option value="BUET">BUET</option>
          <option value="BRAC University">BRAC University</option>
          <option value="North South University">North South University</option>
          <option value="Jahangirnagar University">Jahangirnagar University</option>
          <option value="Rajshahi University">Rajshahi University</option>
          <option value="Chittagong University">Chittagong University</option>
        </select>

        {selectedTag && (
          <button
            onClick={() => setSelectedTag('')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-500/10 text-brand-600 text-xs font-semibold"
          >
            <span>Tag: #{selectedTag}</span>
            <X className="w-3 h-3" />
          </button>
        )}

        {(selectedCondition || selectedUniversity || selectedTag) && (
          <button
            onClick={() => {
              setSelectedCondition('');
              setSelectedUniversity('');
              setSelectedTag('');
            }}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline ml-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800">
          <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            No Book Listings Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            No listings matched your search criteria. Be the first to list a course textbook for your peers!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-amber-600 text-white text-xs font-semibold"
          >
            List a Book Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 hover:shadow-soft-hover transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Book Photo or Placeholder */}
                <div className="w-full h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative mb-4">
                  {item.photos?.[0] ? (
                    <img
                      src={resolveFileUrl(item.photos[0])}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <BookOpen className="w-10 h-10 mb-1 opacity-50" />
                      <span className="text-[10px]">No Photo</span>
                    </div>
                  )}

                  {/* Demo Badge */}
                  {item.isDemo && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-amber-300 backdrop-blur-xs border border-amber-400/30">
                      Demo
                    </span>
                  )}

                  {/* Condition Badge */}
                  <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 backdrop-blur-xs shadow-xs capitalize">
                    {item.condition.replace('_', ' ')}
                  </span>
                </div>

                {/* Title & Author */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mb-0.5">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                  by {item.author} {item.edition ? `• ${item.edition}` : ''}
                </p>

                {/* Tags */}
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 3).map((t, idx) => (
                      <span
                        key={idx}
                        onClick={() => setSelectedTag(t)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-500/20"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Price & Action */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400">
                    ৳{item.price}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">
                    {item.university?.split(' ')[0] || item.city}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenDetail(item.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Listing Detail Modal */}
      {activeListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-6"
          >
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeListing.title}
                  </h2>
                  {activeListing.isDemo && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Demo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  by {activeListing.author} • {activeListing.edition || 'Standard Edition'}
                </p>
              </div>

              <button
                onClick={() => setActiveListing(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Photo & Price */}
              <div>
                <div className="w-full h-56 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
                  {activeListing.photos?.[0] ? (
                    <img src={resolveFileUrl(activeListing.photos[0])} alt={activeListing.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <BookOpen className="w-12 h-12 opacity-40" />
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold uppercase">Secondhand Price</p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400">৳{activeListing.price} {activeListing.currency}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 capitalize">
                    Condition: {activeListing.condition.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Description & Seller Profile */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    {activeListing.description}
                  </p>

                  {/* Seller Mini Profile (Privacy: NO phone/email) */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Seller Info</p>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={activeSeller} size="md" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {activeSeller?.displayName || 'Campus Student'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {activeSeller?.university || activeListing.university || 'University Campus'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Safety Tip Box */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Meet in a public/campus location (e.g. student cafeteria) and inspect the book before payment. UniMate does not process payments.</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setReportingId(activeListing.id)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report Listing</span>
              </button>

              <div className="flex items-center gap-2">
                {activeListing.sellerUid === currentUser?.uid ? (
                  activeListing.status !== 'sold' && (
                    <button
                      onClick={() => handleMarkSold(activeListing.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      Mark as Sold
                    </button>
                  )
                ) : (
                  <button
                    onClick={handleChatWithSeller}
                    disabled={initiatingChat}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    {initiatingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    <span>Chat with Seller (In-App)</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                List a Book for Sale
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              
              {/* AI Assist Box */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>AI Listing Assist</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Type book title or ISBN and click to auto-fill metadata & BDT price suggestion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAIAssist}
                  disabled={aiAssisting}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
                >
                  {aiAssisting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Auto-Fill'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database System Concepts"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Author(s) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Silberschatz & Korth"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Edition / Year
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7th Edition"
                    value={formData.edition}
                    onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 350"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Condition
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  >
                    <option value="new">New</option>
                    <option value="like_new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    University / Campus
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. University of Dhaka"
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DBMS, SQL, Computer Science, CSE"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Highlighting condition, where you can meet on campus, edition details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Publish Listing</span>
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
              Report Book Listing
            </h3>
            <p className="text-xs text-slate-500">
              Please state why this listing should be reviewed (e.g. misleading price, inappropriate content, counterfeit).
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

