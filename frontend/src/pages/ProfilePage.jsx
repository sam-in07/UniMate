import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import UserAvatar from '../components/UserAvatar';
import {
  User,
  Mail,
  Phone,
  School,
  GraduationCap,
  BookOpen,
  Sparkles,
  Shield,
  ShieldAlert,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  LogIn,
  Clock,
  Globe,
  Tag,
  AlertCircle,
  ExternalLink,
  Lock,
  Share2
} from 'lucide-react';

const LOOKING_FOR_OPTIONS = [
  { id: 'study partner', label: 'Study Partner', desc: 'Prepare for exams & quiz together' },
  { id: 'project mate', label: 'Project Mate', desc: 'Collaborate on term assignments & labs' },
  { id: 'conference team', label: 'Conference Team', desc: 'Form team for hackathons & symposiums' },
  { id: 'paper co-author', label: 'Paper Co-Author', desc: 'Research writing & publication prep' }
];

const POPULAR_UNIVERSITIES = [
  'University of Dhaka (DU)',
  'Bangladesh University of Engineering and Technology (BUET)',
  'North South University (NSU)',
  'BRAC University (BRACU)',
  'Islamic University of Technology (IUT)',
  'Independent University, Bangladesh (IUB)',
  'Jahangirnagar University (JU)',
  'Rajshahi University (RU)',
  'United International University (UIU)',
  'Ahsanullah University of Science and Technology (AUST)',
  'American International University-Bangladesh (AIUB)',
  'Daffodil International University (DIU)'
];

export default function ProfilePage() {
  const { currentUser, isGuest, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State - Academic & Identity
  const [displayName, setDisplayName] = useState('');
  const [university, setUniversity] = useState('');
  const [program, setProgram] = useState('');
  const [level, setLevel] = useState('undergrad');
  const [semester, setSemester] = useState('');
  const [bio, setBio] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState([]);
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState([]);
  const [lookingFor, setLookingFor] = useState([]);
  const [languagePreference, setLanguagePreference] = useState('en');
  const [availability, setAvailability] = useState('Flexible');
  const [isProfileHidden, setIsProfileHidden] = useState(false);

  // Form State - Contact & Privacy
  const [contactEmail, setContactEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shareContactWithConnections, setShareContactWithConnections] = useState(false);

  // Form State - Research & External Links
  const [scholarUrl, setScholarUrl] = useState('');
  const [researchGateUrl, setResearchGateUrl] = useState('');
  const [orcidUrl, setOrcidUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Load User Profile
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await api.getMe();
        if (res.user && isMounted) {
          const u = res.user;
          setDisplayName(u.displayName || (currentUser?.displayName || ''));
          setUniversity(u.university || '');
          setProgram(u.program || '');
          setLevel(u.level || 'undergrad');
          setSemester(u.semester || '');
          setBio(u.bio || '');
          setSkills(Array.isArray(u.skills) ? u.skills : []);
          setInterests(Array.isArray(u.interests) ? u.interests : []);
          setLookingFor(Array.isArray(u.lookingFor) ? u.lookingFor : []);
          setLanguagePreference(u.languagePreference || 'en');
          setAvailability(u.availability || 'Flexible');
          setIsProfileHidden(Boolean(u.isProfileHidden));

          // Contact details & sharing
          setContactEmail(u.contactEmail || '');
          setPhoneNumber(u.phoneNumber || '');
          setShareContactWithConnections(Boolean(u.shareContactWithConnections));

          // Research links
          setScholarUrl(u.scholarUrl || '');
          setResearchGateUrl(u.researchGateUrl || '');
          setOrcidUrl(u.orcidUrl || '');
          setLinkedinUrl(u.linkedinUrl || '');
          setGithubUrl(u.githubUrl || '');
          setWebsiteUrl(u.websiteUrl || '');
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[ProfilePage] Could not load profile from server:', err);
          if (currentUser) {
            setDisplayName(currentUser.displayName || (isGuest ? 'Guest Student' : 'Student'));
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadProfile();
    return () => { isMounted = false; };
  }, [currentUser, isGuest]);

  // Skill tag add / remove
  const handleAddSkill = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = skillInput.trim().replace(/^,+|,+$/g, '');
      if (trimmed && !skills.includes(trimmed) && skills.length < 15) {
        setSkills([...skills, trimmed]);
        setSkillInput('');
      }
    }
  };

  const removeSkill = (tagToRemove) => {
    setSkills(skills.filter(s => s !== tagToRemove));
  };

  // Interest tag add / remove
  const handleAddInterest = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = interestInput.trim().replace(/^,+|,+$/g, '');
      if (trimmed && !interests.includes(trimmed) && interests.length < 15) {
        setInterests([...interests, trimmed]);
        setInterestInput('');
      }
    }
  };

  const removeInterest = (tagToRemove) => {
    setInterests(interests.filter(i => i !== tagToRemove));
  };

  // Toggle LookingFor checkbox
  const toggleLookingFor = (id) => {
    if (lookingFor.includes(id)) {
      setLookingFor(lookingFor.filter(item => item !== id));
    } else {
      setLookingFor([...lookingFor, id]);
    }
  };

  // URL helper validator for UI hints
  const checkUrlHost = (url, expectedHost) => {
    if (!url || !url.trim()) return null;
    try {
      const u = new URL(url.trim());
      if (u.protocol !== 'https:') return 'Must start with https://';
      if (expectedHost) {
        const host = u.hostname.toLowerCase();
        if (expectedHost === 'scholar.google.com') {
          if (!host.includes('scholar.google.')) return 'Must be on scholar.google.com';
        } else if (host !== expectedHost && !host.endsWith('.' + expectedHost)) {
          return `Must be on ${expectedHost}`;
        }
      }
      return 'valid';
    } catch {
      return 'Invalid URL format (include https://)';
    }
  };

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Validate URLs before submitting
      const links = [
        { val: scholarUrl, host: 'scholar.google.com', name: 'Google Scholar' },
        { val: researchGateUrl, host: 'researchgate.net', name: 'ResearchGate' },
        { val: orcidUrl, host: 'orcid.org', name: 'ORCID' },
        { val: linkedinUrl, host: 'linkedin.com', name: 'LinkedIn' },
        { val: githubUrl, host: 'github.com', name: 'GitHub' },
        { val: websiteUrl, host: null, name: 'Personal Website' }
      ];

      for (const l of links) {
        if (l.val && l.val.trim()) {
          const status = checkUrlHost(l.val, l.host);
          if (status !== 'valid') {
            toast.error(`${l.name} URL error: ${status}`);
            setSaving(false);
            return;
          }
        }
      }

      const payload = {
        displayName: displayName.trim() || 'Student',
        university: university.trim(),
        program: program.trim(),
        level,
        semester: semester.trim(),
        bio: bio.trim(),
        skills,
        interests,
        lookingFor,
        languagePreference,
        availability,
        isProfileHidden,

        // Contact info
        contactEmail: contactEmail.trim(),
        phoneNumber: phoneNumber.trim(),
        shareContactWithConnections,

        // Research links
        scholarUrl: scholarUrl.trim(),
        researchGateUrl: researchGateUrl.trim(),
        orcidUrl: orcidUrl.trim(),
        linkedinUrl: linkedinUrl.trim(),
        githubUrl: githubUrl.trim(),
        websiteUrl: websiteUrl.trim()
      };

      const res = await api.updateMe(payload);
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('[Profile update error]:', err);
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-xs text-slate-400">Loading student profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Header Banner with Profile Avatar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <UserAvatar
            user={{
              photoURL: currentUser?.photoURL,
              displayName: displayName || currentUser?.displayName
            }}
            size="xl"
            className="ring-4 ring-brand-500/20"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {displayName || 'Student Profile'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {university || 'University Student'} {program ? `• ${program}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                isGuest
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}>
                {isGuest ? 'Guest Student' : 'Google Verified Student'}
              </span>
              {isProfileHidden && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                  Hidden from Discovery
                </span>
              )}
            </div>
          </div>
        </div>

        {isGuest ? (
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-soft transition-all self-start sm:self-auto"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>
        ) : (
          <div className="text-xs text-slate-400 hidden sm:block text-right">
            <span>Primary Account</span>
            <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{currentUser?.email}</p>
          </div>
        )}
      </div>

      {/* Safety & Contact Privacy Notice Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 text-xs space-y-2">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
          <Shield className="w-4 h-4 shrink-0" />
          <span>Privacy Guarantee: Phone & Email Protection</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px] sm:text-xs">
          Phone and email are shown <strong>only to people you accept</strong>, and <strong>only if you turn sharing on</strong>. They are never shown on your public profile, discover cards, marketplace listings, or to guests.
        </p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Basic Academic Identity Card */}
        <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-brand-500" />
            <span>Academic Identity</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name / Display Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={80}
                placeholder="e.g. Tanvir Ahmed"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {/* University */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                University / Institution
              </label>
              <input
                type="text"
                list="universities-list"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. University of Dhaka"
                maxLength={150}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors"
              />
              <datalist id="universities-list">
                {POPULAR_UNIVERSITIES.map(u => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            {/* Program / Major */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Program / Department
              </label>
              <input
                type="text"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                maxLength={120}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {/* Academic Level & Semester */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Academic Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="undergrad">Undergraduate</option>
                  <option value="postgrad">Postgraduate</option>
                  <option value="high school">High School / College</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Semester / Year
                </label>
                <input
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. 4th Sem / Year 2"
                  maxLength={50}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Short Bio / About Me
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              placeholder="Tell other students about your academic interests, current study goals, and what kind of collaboration you enjoy..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors resize-none leading-relaxed"
            />
            <div className="flex justify-end mt-1 text-[11px] text-slate-400">
              {bio.length} / 500 characters
            </div>
          </div>
        </div>

        {/* Private Contact Details & Privacy Toggle */}
        <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-500" />
              <span>Contact Information (Private by Default)</span>
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
              Connection Only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Email (Optional - not auto-filled from Google)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. tanvir.academic@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Your preferred email for peer academic communications.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +880 1700 000000"
                  maxLength={30}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Optional direct phone or WhatsApp contact.
              </p>
            </div>
          </div>

          {/* Contact Sharing Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Share2 className="w-3.5 h-3.5 text-brand-500" />
                  <span>Share contact details with people I have accepted as connections</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  When enabled, students whose connection requests you accept can see your email and phone.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShareContactWithConnections(!shareContactWithConnections)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  shareContactWithConnections ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    shareContactWithConnections ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Clear Warning on Toggle */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>
                <strong>Warning:</strong> Sharing your phone number is your own choice. Only share if you are comfortable and trust your connections. Unaccepted students, marketplace shoppers, and guests can never see this.
              </span>
            </div>
          </div>
        </div>

        {/* Research Profiles & External Academic Links */}
        <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              <span>Research Profiles & Academic Portfolios</span>
            </h2>
            <span className="text-[10px] text-slate-400">Visible on public card</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Google Scholar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Google Scholar URL
                </label>
                {scholarUrl && (
                  <span className={`text-[10px] font-mono ${checkUrlHost(scholarUrl, 'scholar.google.com') === 'valid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {checkUrlHost(scholarUrl, 'scholar.google.com')}
                  </span>
                )}
              </div>
              <input
                type="url"
                value={scholarUrl}
                onChange={(e) => setScholarUrl(e.target.value)}
                placeholder="https://scholar.google.com/citations?user=..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors font-mono"
              />
            </div>

            {/* ResearchGate */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ResearchGate URL
                </label>
                {researchGateUrl && (
                  <span className={`text-[10px] font-mono ${checkUrlHost(researchGateUrl, 'researchgate.net') === 'valid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {checkUrlHost(researchGateUrl, 'researchgate.net')}
                  </span>
                )}
              </div>
              <input
                type="url"
                value={researchGateUrl}
                onChange={(e) => setResearchGateUrl(e.target.value)}
                placeholder="https://www.researchgate.net/profile/..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors font-mono"
              />
            </div>

            {/* ORCID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ORCID URL
                </label>
                {orcidUrl && (
                  <span className={`text-[10px] font-mono ${checkUrlHost(orcidUrl, 'orcid.org') === 'valid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {checkUrlHost(orcidUrl, 'orcid.org')}
                  </span>
                )}
              </div>
              <input
                type="url"
                value={orcidUrl}
                onChange={(e) => setOrcidUrl(e.target.value)}
                placeholder="https://orcid.org/0000-0002-..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors font-mono"
              />
            </div>

            {/* LinkedIn */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  LinkedIn Profile URL
                </label>
                {linkedinUrl && (
                  <span className={`text-[10px] font-mono ${checkUrlHost(linkedinUrl, 'linkedin.com') === 'valid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {checkUrlHost(linkedinUrl, 'linkedin.com')}
                  </span>
                )}
              </div>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/username"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors font-mono"
              />
            </div>

            {/* GitHub */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GitHub Profile URL
                </label>
                {githubUrl && (
                  <span className={`text-[10px] font-mono ${checkUrlHost(githubUrl, 'github.com') === 'valid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {checkUrlHost(githubUrl, 'github.com')}
                  </span>
                )}
              </div>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors font-mono"
              />
            </div>

            {/* Personal Website */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Personal Portfolio / Website URL
                </label>
                {websiteUrl && (
                  <span className={`text-[10px] font-mono ${checkUrlHost(websiteUrl, null) === 'valid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {checkUrlHost(websiteUrl, null)}
                  </span>
                )}
              </div>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourportfolio.me"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors font-mono"
              />
            </div>

          </div>
        </div>

        {/* Skills & Academic Interests */}
        <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Skills & Research Interests</span>
          </h2>

          <div className="space-y-4">
            {/* Skills Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Technical & Subject Skills (Press Enter or comma to add)
              </label>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                {skills.map(s => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-medium"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="hover:text-rose-500 transition-colors"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {skills.length < 15 && (
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder={skills.length === 0 ? "e.g. Python, Algorithms, DBMS..." : "Add skill..."}
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none px-2 py-1"
                  />
                )}
              </div>
            </div>

            {/* Research / Academic Interests */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Interests & Focus Areas (Press Enter or comma to add)
              </label>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                {interests.map(i => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium"
                  >
                    <span>{i}</span>
                    <button
                      type="button"
                      onClick={() => removeInterest(i)}
                      className="hover:text-rose-500 transition-colors"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {interests.length < 15 && (
                  <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={handleAddInterest}
                    placeholder={interests.length === 0 ? "e.g. Machine Learning, Computer Vision..." : "Add interest..."}
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none px-2 py-1"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Collaborator Looking For & Availability */}
        <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <School className="w-4 h-4 text-emerald-500" />
            <span>Collaboration Preferences</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                I am looking for:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LOOKING_FOR_OPTIONS.map(opt => {
                  const checked = lookingFor.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleLookingFor(opt.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                        checked
                          ? 'bg-brand-500/10 border-brand-500 text-slate-900 dark:text-white'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-brand-500 focus:ring-brand-500 pointer-events-none"
                      />
                      <div>
                        <p className="text-xs font-bold">{opt.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Weekly Study Availability
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="Flexible">Flexible (Anytime)</option>
                  <option value="Evenings & Weekends">Evenings & Weekends</option>
                  <option value="5-10 hrs / week">5-10 hrs / week</option>
                  <option value="10-15 hrs / week">10-15 hrs / week</option>
                  <option value="Exam Period Intensive">Exam Period Intensive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Study Language Preference
                </label>
                <select
                  value={languagePreference}
                  onChange={(e) => setLanguagePreference(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="en">English</option>
                  <option value="bn">বাংলা (Bangla)</option>
                  <option value="mixed">Mixed (Banglish / Bilingual)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Discovery & Privacy Toggle */}
        <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isProfileHidden ? (
                  <EyeOff className="w-4 h-4 text-amber-500" />
                ) : (
                  <Eye className="w-4 h-4 text-brand-500" />
                )}
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Collaborator Discovery Visibility
                </span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-xl">
                When hidden, your profile will not appear in peer partner recommendations or search results. You can still message existing connections.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsProfileHidden(!isProfileHidden)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isProfileHidden ? 'bg-amber-500' : 'bg-brand-500'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isProfileHidden ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            Current Status: {isProfileHidden ? <span className="text-amber-500">Hidden from discovery</span> : <span className="text-brand-500">Visible to students</span>}
          </div>
        </div>

        {/* Form Submission Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-soft cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
