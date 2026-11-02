import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  User,
  Mail,
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
  AlertCircle
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

  // Form State
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
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[ProfilePage] Could not load profile from server:', err);
          // Fallback to local auth info
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

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
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
        isProfileHidden
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
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-500">
              <User className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Student Profile & Collaborator Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage your academic background, skills, and visibility on the Collaborator Finder.
          </p>
        </div>

        {/* Guest Warning Pill */}
        {isGuest ? (
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold transition-all self-start sm:self-auto"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4" />
            <span>Verified Student Account</span>
          </div>
        )}
      </div>

      {/* Safety & Minor Privacy Notice */}
      <div className="p-4 sm:p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 text-xs space-y-2">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
          <Shield className="w-4 h-4 shrink-0" />
          <span>Student Safety & Privacy Guarantee</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px] sm:text-xs">
          Because UniMate is open to collegiate and minor students, <strong>your phone number and email are never shown publicly</strong> anywhere on the platform. All student networking happens exclusively through safe, monitored in-app messaging. Never disclose sensitive financial data or personal address to strangers.
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
              placeholder="Tell other students about your academic interests, what projects you are tackling, and what kind of collaboration you enjoy..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500 transition-colors resize-none leading-relaxed"
            />
            <div className="flex justify-end mt-1 text-[11px] text-slate-400">
              {bio.length} / 500 characters
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
                        onChange={() => {}} // handled by parent div
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
              {/* Availability */}
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

              {/* Language Preference */}
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

