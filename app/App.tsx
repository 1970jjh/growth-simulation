import React, { useState, useEffect } from 'react';
import { Session } from './types';
import {
  subscribeToAllSessions,
  getSession
} from './lib/firestore';
import AdminDashboard from './components/AdminDashboard';
import ParticipantView from './components/ParticipantView';
import { Users, Settings, Lock, LogIn } from 'lucide-react';

// 관리자 비밀번호
const ADMIN_PASSWORD = '6749467';

type ViewMode = 'home' | 'admin' | 'participant';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [sessions, setSessions] = useState<Session[]>([]);

  // 관리자 비밀번호 관련 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 참가자 관련 상태
  const [joinedSession, setJoinedSession] = useState<Session | null>(null);

  // 활성 세션 목록 실시간 구독 (홈 화면용)
  useEffect(() => {
    if (viewMode === 'home') {
      const unsubscribe = subscribeToAllSessions((sessionList) => {
        // 활성 세션만 필터링 (게임 종료되지 않은 세션)
        const activeSessions = sessionList
          .filter(s => s.settings.isActive !== false)
          .sort((a, b) => b.createdAt - a.createdAt);
        setSessions(activeSessions);
      });

      return () => unsubscribe();
    }
  }, [viewMode]);

  // 관리자 세션 구독 (관리자 뷰용)
  useEffect(() => {
    if (viewMode === 'admin') {
      const unsubscribe = subscribeToAllSessions((sessionList) => {
        setSessions(sessionList.sort((a, b) => b.createdAt - a.createdAt));
      });

      return () => unsubscribe();
    }
  }, [viewMode]);

  // 관리자 비밀번호 확인
  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setShowPasswordModal(false);
      setAdminPassword('');
      setPasswordError('');
      setViewMode('admin');
    } else {
      setPasswordError('비밀번호가 틀렸습니다.');
    }
  };

  // 세션 클릭으로 참여
  const handleJoinSession = async (session: Session) => {
    setJoinedSession(session);
    setViewMode('participant');
  };

  // 홈으로 돌아가기
  const handleGoHome = () => {
    setViewMode('home');
    setJoinedSession(null);
  };

  // 관리자 뷰
  if (viewMode === 'admin') {
    return (
      <div>
        <button
          onClick={handleGoHome}
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-800 text-white font-bold rounded hover:bg-gray-700"
        >
          홈으로
        </button>
        <AdminDashboard
          sessions={sessions}
          onSessionsChange={() => {}}
        />
      </div>
    );
  }

  // 참가자 뷰
  if (viewMode === 'participant' && joinedSession) {
    return (
      <div>
        <button
          onClick={handleGoHome}
          className="fixed top-4 right-4 z-50 px-3 py-1 bg-gray-800 text-white text-sm font-bold rounded hover:bg-gray-700"
        >
          나가기
        </button>
        <ParticipantView
          sessionId={joinedSession.id}
          initialSession={joinedSession}
        />
      </div>
    );
  }

  // 홈 화면
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 & 타이틀 */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white rounded-2xl shadow-2xl mb-4">
            <div className="text-6xl">🎯</div>
          </div>
          <h1 className="text-4xl font-black text-white mb-2">빙고 교육 게임</h1>
          <p className="text-blue-200">팀 대항 상황 판단 학습</p>
        </div>

        {/* 참여 가능한 방 목록 */}
        <div className="bg-white border-4 border-black p-6 shadow-hard mb-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> 참여 가능한 방
          </h2>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">현재 참여 가능한 방이 없습니다.</p>
              <p className="text-sm">관리자가 방을 만들면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleJoinSession(session)}
                  className="w-full p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg text-gray-800">{session.name}</p>
                      <p className="text-sm text-gray-500">
                        팀 {session.teams.length}개 ·
                        {session.teams.reduce((sum, t) => sum + t.members.length, 0)}명 참여 중
                      </p>
                    </div>
                    <LogIn className="w-6 h-6 text-blue-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 관리자 입장 */}
        <div className="bg-gray-800 border-4 border-black p-6 shadow-hard">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full py-3 bg-gray-700 text-white font-bold border-2 border-gray-600 hover:bg-gray-600 flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" />
            관리자로 입장
          </button>
        </div>
      </div>

      {/* 관리자 비밀번호 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-4 border-black p-6 w-full max-w-sm shadow-hard">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" /> 관리자 비밀번호
            </h3>

            <input
              type="password"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                setPasswordError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="비밀번호 입력"
              className="w-full p-3 border-2 border-gray-300 rounded mb-3 focus:border-blue-500 focus:outline-none"
              autoFocus
            />

            {passwordError && (
              <p className="text-red-500 text-sm mb-3">{passwordError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setAdminPassword('');
                  setPasswordError('');
                }}
                className="flex-1 py-2 bg-gray-200 font-bold rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleAdminLogin}
                className="flex-1 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
