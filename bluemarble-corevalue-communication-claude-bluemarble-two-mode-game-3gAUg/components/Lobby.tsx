import React, { useState } from 'react';
import { GameVersion, Team, Session, SessionStatus, TeamColor } from '../types';
import { Plus, Trash2, Play, Pause, ExternalLink, QrCode, X, MonitorPlay, Copy, Check } from 'lucide-react';
import { INITIAL_RESOURCES } from '../constants';
import { QRCodeSVG } from 'qrcode.react';

interface LobbyProps {
  sessions: Session[];
  onCreateSession: (name: string, version: GameVersion, teamCount: number) => Promise<void>;
  onDeleteSession: (sessionId: string) => void;
  onUpdateStatus: (sessionId: string, status: SessionStatus) => void;
  onEnterSession: (session: Session) => void;
}

const Lobby: React.FC<LobbyProps> = ({ 
  sessions, 
  onCreateSession, 
  onDeleteSession, 
  onUpdateStatus,
  onEnterSession
}) => {
  // --- Create Session Form State ---
  const [newName, setNewName] = useState('');
  const [newVersion, setNewVersion] = useState<GameVersion>(GameVersion.CoreValue);
  const [newTeamCount, setNewTeamCount] = useState(4);
  const [isCreating, setIsCreating] = useState(false);

  // --- UI State ---
  const [inviteModalSession, setInviteModalSession] = useState<Session | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // 참가자 접속 URL 생성
  const getJoinUrl = (accessCode: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}?join=${accessCode}`;
  };

  // 링크 복사 핸들러
  const handleCopyLink = async (accessCode: string) => {
    const url = getJoinUrl(accessCode);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      alert("세션 이름을 입력해주세요.");
      return;
    }
    if (isCreating) return; // 중복 클릭 방지

    setIsCreating(true);
    try {
      await onCreateSession(newName, newVersion, newTeamCount);
      setNewName('');
      setNewTeamCount(4);
      alert("새로운 세션이 생성되었습니다.");
    } catch (error) {
      console.error('세션 생성 실패:', error);
      alert("세션 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'active': return <span className="bg-green-500 text-white px-2 py-0.5 text-xs font-black uppercase border border-black">Active</span>;
      case 'paused': return <span className="bg-yellow-400 text-black px-2 py-0.5 text-xs font-black uppercase border border-black">Paused</span>;
      case 'ended': return <span className="bg-gray-400 text-white px-2 py-0.5 text-xs font-black uppercase border border-black">Ended</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-4">
          <div>
            <h1 className="text-4xl font-black italic uppercase text-blue-900">Admin Dashboard</h1>
            <p className="font-bold text-gray-500">핵심가치 & 소통 교육 세션 관리자</p>
          </div>
          <div className="mt-4 md:mt-0 bg-white border-2 border-black p-2 shadow-hard-sm">
             <span className="font-bold text-sm">진행 중인 세션: {sessions.filter(s => s.status === 'active').length}개</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Create Session */}
          <div className="lg:col-span-1">
            <div className="bg-white border-4 border-black p-6 shadow-hard sticky top-8">
              <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
                <Plus className="bg-black text-white p-1 rounded-sm" size={28} /> 
                세션 생성
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block font-bold mb-1 text-sm uppercase">세션 이름</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="예: 12월 신입사원 교육"
                    className="w-full p-3 border-4 border-black font-bold focus:bg-yellow-50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-sm uppercase">게임 모드</label>
                  <select 
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value as GameVersion)}
                    className="w-full p-3 border-4 border-black font-bold bg-white focus:bg-yellow-50 focus:outline-none"
                  >
                    {Object.values(GameVersion).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-sm uppercase">팀 수 설정 (2~20팀)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="2" 
                      max="20" 
                      value={newTeamCount}
                      onChange={(e) => setNewTeamCount(parseInt(e.target.value))}
                      className="flex-1 h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer border-2 border-black"
                    />
                    <span className="w-12 h-12 flex items-center justify-center bg-black text-white font-black text-xl border-2 border-transparent shadow-hard-sm">
                      {newTeamCount}
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className={`w-full py-4 font-black text-xl uppercase border-4 border-black shadow-hard transition-all ${
                      isCreating
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-blue-900 text-white hover:bg-blue-800 hover:translate-y-1 hover:shadow-hard-sm'
                    }`}
                  >
                    {isCreating ? '생성 중...' : '세션 생성하기'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Session List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-black uppercase mb-4">세션 목록 ({sessions.length})</h2>
            
            {sessions.length === 0 ? (
              <div className="bg-gray-200 border-4 border-dashed border-gray-400 p-12 text-center">
                <p className="text-xl font-bold text-gray-500">생성된 세션이 없습니다.</p>
                <p className="text-gray-400 mt-2">좌측 패널에서 새로운 세션을 생성해주세요.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {sessions.map((session) => (
                  <div key={session.id} className="bg-white border-4 border-black p-4 shadow-sm hover:shadow-hard transition-shadow group">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      
                      {/* Session Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(session.status)}
                          <h3 className="text-xl font-black">{session.name}</h3>
                        </div>
                        <div className="text-sm font-bold text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
                          <span>• 모드: {session.version}</span>
                          <span>• 팀: {session.teams.length}개</span>
                          <span>• 코드: <span className="font-mono bg-gray-200 px-1 border border-gray-400">{session.accessCode}</span></span>
                          <span>• 생성: {new Date(session.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 border-t md:border-t-0 border-gray-200 pt-4 md:pt-0">
                        {session.status === 'active' ? (
                          <button 
                            onClick={() => onUpdateStatus(session.id, 'paused')}
                            className="p-2 border-2 border-black bg-yellow-400 hover:bg-yellow-500 shadow-hard-sm"
                            title="일시정지"
                          >
                            <Pause size={20} fill="currentColor" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => onUpdateStatus(session.id, 'active')}
                            className="p-2 border-2 border-black bg-green-500 text-white hover:bg-green-600 shadow-hard-sm"
                            title="활성화"
                          >
                            <Play size={20} fill="currentColor" />
                          </button>
                        )}

                        <button 
                          onClick={() => setInviteModalSession(session)}
                          disabled={session.status !== 'active'}
                          className={`p-2 border-2 border-black bg-white hover:bg-gray-100 shadow-hard-sm ${session.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="초대 링크/QR"
                        >
                          <QrCode size={20} />
                        </button>

                        <button 
                          onClick={() => onEnterSession(session)}
                          className="px-4 py-2 border-2 border-black bg-blue-900 text-white font-bold shadow-hard-sm hover:bg-blue-800 flex items-center gap-2"
                        >
                          <MonitorPlay size={18} />
                          입장/모니터링
                        </button>

                        <div className="w-px h-8 bg-gray-300 mx-2"></div>

                        <button 
                          onClick={() => {
                            if(window.confirm('정말 이 세션을 삭제하시겠습니까?')) onDeleteSession(session.id);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModalSession && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white max-w-lg w-full border-4 border-black shadow-[10px_10px_0_0_#fff] p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setInviteModalSession(null)}
              className="absolute top-4 right-4 hover:bg-gray-100 p-1 rounded-full border-2 border-transparent hover:border-black transition-all"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-black uppercase text-center mb-2">참가자 초대</h2>
            <p className="text-center text-gray-500 font-bold mb-6">{inviteModalSession.name}</p>

            <div className="bg-gray-100 border-4 border-black p-8 mb-6 flex flex-col items-center justify-center">
               {/* 실제 QR 코드 */}
               <div className="bg-white p-4 border-2 border-black mb-4">
                 <QRCodeSVG
                   value={getJoinUrl(inviteModalSession.accessCode)}
                   size={200}
                   level="H"
                   includeMargin={true}
                 />
               </div>

               <p className="font-bold text-sm text-gray-500 mb-2 uppercase">Access Code</p>
               <div className="text-5xl font-black tracking-widest font-mono bg-white border-2 border-black px-6 py-2 shadow-hard-sm">
                 {inviteModalSession.accessCode}
               </div>
            </div>

            <div className="space-y-3">
              <button
                 className={`w-full py-3 border-4 border-black font-black uppercase shadow-hard hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2 ${linkCopied ? 'bg-green-400' : 'bg-yellow-400'}`}
                 onClick={() => handleCopyLink(inviteModalSession.accessCode)}
              >
                {linkCopied ? (
                  <><Check size={20} /> 복사 완료!</>
                ) : (
                  <><Copy size={20} /> 초대 링크 복사</>
                )}
              </button>
              <p className="text-xs text-center font-bold text-gray-500">
                참가자들에게 위 QR코드 또는 접속 코드를 공유하세요.
              </p>
              <p className="text-xs text-center font-mono text-gray-400 break-all">
                {getJoinUrl(inviteModalSession.accessCode)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;