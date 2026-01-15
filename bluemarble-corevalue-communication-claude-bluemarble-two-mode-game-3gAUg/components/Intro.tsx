import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface IntroProps {
  onAdminLogin: () => void;
  onUserJoin: (accessCode: string) => void;
  initialAccessCode?: string;
  isLoading?: boolean;
  joinError?: string;
}

const Intro: React.FC<IntroProps> = ({
  onAdminLogin,
  onUserJoin,
  initialAccessCode = '',
  isLoading = false,
  joinError = ''
}) => {
  const [mode, setMode] = useState<'main' | 'admin' | 'join'>('main');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState(initialAccessCode);
  const [error, setError] = useState('');

  // URL에서 코드가 전달되면 자동으로 참가 모드로 전환
  useEffect(() => {
    if (initialAccessCode) {
      setAccessCode(initialAccessCode);
      setMode('join');
    }
  }, [initialAccessCode]);

  // 외부 에러 표시
  useEffect(() => {
    if (joinError) {
      setError(joinError);
    }
  }, [joinError]);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '6749467') {
      onAdminLogin();
    } else {
      setError('비밀번호가 일치하지 않습니다.');
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setError('접속 코드를 입력해주세요.');
      return;
    }
    if (accessCode.length !== 6 || !/^\d+$/.test(accessCode)) {
      setError('6자리 숫자 코드를 입력해주세요.');
      return;
    }
    setError('');
    onUserJoin(accessCode);
  };

  return (
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-4 border-black shadow-[8px_8px_0_0_#000] p-8">
        <h1 className="text-4xl md:text-5xl font-black text-center mb-2 italic break-keep leading-tight">
          리더십<br/>보드 아카데미
        </h1>
        <p className="text-center text-gray-500 font-bold mb-8 text-sm">
          by JJ CREATIVE 교육연구소
        </p>

        {mode === 'main' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('join')}
              className="w-full py-4 bg-yellow-400 border-4 border-black text-xl font-black shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all"
            >
              게임 참여 (참가자용)
            </button>
            <button
              onClick={() => setMode('admin')}
              className="w-full py-4 bg-gray-200 border-4 border-black text-xl font-black shadow-hard hover:bg-gray-300 transition-all"
            >
              관리자 로그인
            </button>
          </div>
        )}

        {mode === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block font-bold mb-2 uppercase">관리자 비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full p-3 border-4 border-black font-mono text-xl focus:outline-none focus:bg-yellow-50"
                placeholder="비밀번호 입력"
                autoFocus
              />
              {error && <p className="text-red-600 font-bold mt-2">{error}</p>}
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => { setMode('main'); setError(''); setPassword(''); }}
                className="flex-1 py-3 bg-gray-200 border-4 border-black font-bold"
              >
                뒤로가기
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-black text-white border-4 border-black font-bold hover:bg-gray-800"
              >
                로그인
              </button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label className="block font-bold mb-2 uppercase">접속 코드 입력</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={accessCode}
                onChange={(e) => { setAccessCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                className="w-full p-4 border-4 border-black font-mono text-3xl text-center tracking-[0.5em] focus:outline-none focus:bg-yellow-50"
                placeholder="000000"
                autoFocus
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                관리자에게 전달받은 6자리 코드를 입력하세요
              </p>
              {error && <p className="text-red-600 font-bold mt-2 text-center">{error}</p>}
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => { setMode('main'); setError(''); setAccessCode(''); }}
                className="flex-1 py-3 bg-gray-200 border-4 border-black font-bold"
                disabled={isLoading}
              >
                뒤로가기
              </button>
              <button
                type="submit"
                disabled={isLoading || accessCode.length !== 6}
                className="flex-1 py-3 bg-yellow-400 border-4 border-black font-bold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    접속 중...
                  </>
                ) : (
                  '게임 참여'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Intro;
