import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import AuthModal from './components/AuthModal';

import LandingPage from './pages/LandingPage';
import SummarizerPage from './pages/SummarizerPage';
import QuizPage from './pages/QuizPage';
import TutorPage from './pages/TutorPage';
import ExamPlannerPage from './pages/ExamPlannerPage';
import PastQuestionsPage from './pages/PastQuestionsPage';
import LibraryPage from './pages/LibraryPage';
import ProgressPage from './pages/ProgressPage';
import MarketplacePage from './pages/MarketplacePage';
import PartnersPage from './pages/PartnersPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar with Buildathon Sticker */}
      <Navbar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

      <div className="flex-1 flex">
        {/* Collapsible Sidebar (hidden on landing page for full hero width) */}
        {!isLanding && (
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 transition-all ${!isLanding ? 'pb-20 md:pb-6' : ''}`}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            
            {/* Study Pillar */}
            <Route path="/summarizer" element={<SummarizerPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/tutor" element={<TutorPage />} />
            <Route path="/planner" element={<ExamPlannerPage />} />
            <Route path="/past-questions" element={<PastQuestionsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/progress" element={<ProgressPage />} />

            {/* Student Network Pillar */}
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/network" element={<Navigate to="/marketplace" replace />} />

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <AuthModal />
    </div>
  );
}
