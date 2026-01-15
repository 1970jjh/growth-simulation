import React, { useState, useEffect } from 'react';
import { Session } from './types';
import {
  subscribeToAllSessions,
  getSessionByAccessCode
} from './lib/firestore';
import AdminDashboard from './components/AdminDashboard';
import ParticipantView from './components/ParticipantView';
import { Loader2, Users, Settings, LogIn } from 'lucide-react';

type ViewMode = 'home' | 'admin' | 'participant';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 참가자 관련 상태
  const [accessCode, setAccessCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinedSession, setJoinedSession] = useState<Session | null>(null);

  // URL 파라미터 확인 (join=코드)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');

    if (joinCode) {
      setAccessCode(joinCode);
      handleJoinSession(joinCode);
    }
  }, []);

  // 세션 목록 구독 (관리자용)
  useEffect(() => {
    if (viewMode === 'admin') {
      const unsubscribe = subscribeToAllSessions((sessionList) => {
        setSessions(sessionList.sort((a, b) => b.createdAt - a.createdAt));
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [viewMode]);

  // 세션 참여
  const handleJoinSession = async (code?: string) => {
    const codeToUse = code || accessCode.trim();

    if (!codeToUse || codeToUse.length !== 6) {
      setJoinError('6자리 접속 코드를 입력해주세요.');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      const session = await getSessionByAccessCode(codeToUse);

      if (!session) {
        setJoinError('세션을 찾을 수 없습니다. 코드를 확인해주세요.');
        setIsJoining(false);
        return;
      }

      // URL에서 join 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);

      setJoinedSession(session);
      setViewMode('participant');
    } catch (error) {
      console.error('세션 참여 오류:', error);
      setJoinError('세션 참여 중 오류가 발생했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  // 홈으로 돌아가기
  const handleGoHome = () => {
    setViewMode('home');
    setJoinedSession(null);
    setAccessCode('');
    setJoinError('');
  };

  // 로딩 화면
  if (isLoading && viewMode === 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">세션 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

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
          onSessionsChange={() => {/* 실시간 구독으로 자동 업데이트 */}}
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

        {/* 참가자 입장 */}
        <div className="bg-white border-4 border-black p-6 shadow-hard mb-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> 게임 참여하기
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">
                접속 코드 (6자리)
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setJoinError('');
                }}
                placeholder="000000"
                maxLength={6}
                className="w-full p-4 text-center text-2xl font-mono font-bold tracking-widest border-4 border-black focus:border-blue-500 focus:outline-none"
              />
            </div>

            {joinError && (
              <p className="text-red-500 text-sm font-semibold text-center">
                {joinError}
              </p>
            )}

            <button
              onClick={() => handleJoinSession()}
              disabled={isJoining || accessCode.length !== 6}
              className="w-full py-4 bg-blue-600 text-white font-bold text-lg border-4 border-black shadow-hard hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  참여 중...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  참여하기
                </>
              )}
            </button>
          </div>
        </div>

        {/* 관리자 입장 */}
        <div className="bg-gray-800 border-4 border-black p-6 shadow-hard">
          <button
            onClick={() => {
              setViewMode('admin');
              setIsLoading(true);
            }}
            className="w-full py-3 bg-gray-700 text-white font-bold border-2 border-gray-600 hover:bg-gray-600 flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" />
            관리자로 입장
          </button>
        </div>

        {/* 사용법 안내 */}
        <div className="mt-8 text-center text-blue-200 text-sm">
          <p className="mb-2">관리자가 세션을 생성하면 접속 코드가 발급됩니다.</p>
          <p>접속 코드를 입력하여 팀에 참여하세요!</p>
        </div>
      </div>
    </div>
  );
}

export default App;
