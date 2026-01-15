import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, XCircle, Loader2, Database, Wifi } from 'lucide-react';

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [testData, setTestData] = useState<any[]>([]);

  // Firebase 연결 테스트
  useEffect(() => {
    const testFirebaseConnection = async () => {
      try {
        // 테스트 컬렉션에서 데이터 읽기 시도
        const testCollection = collection(db, 'connection_test');
        const snapshot = await getDocs(testCollection);

        // 연결 성공
        setConnectionStatus('connected');
        setTestData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        console.log('Firebase 연결 성공!');
        console.log('기존 테스트 데이터:', snapshot.docs.length, '개');
      } catch (error: any) {
        console.error('Firebase 연결 오류:', error);
        setConnectionStatus('error');
        setErrorMessage(error.message || '알 수 없는 오류');
      }
    };

    testFirebaseConnection();
  }, []);

  // 테스트 데이터 추가
  const handleAddTestData = async () => {
    try {
      const testCollection = collection(db, 'connection_test');
      const docRef = await addDoc(testCollection, {
        message: 'Firebase 연결 테스트',
        timestamp: serverTimestamp(),
        testId: Math.random().toString(36).substring(7)
      });

      console.log('테스트 문서 추가됨:', docRef.id);

      // 데이터 새로고침
      const snapshot = await getDocs(testCollection);
      setTestData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      alert('테스트 데이터가 추가되었습니다!');
    } catch (error: any) {
      console.error('데이터 추가 오류:', error);
      alert('데이터 추가 실패: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-black text-gray-800 mb-2">
            Growth Simulation
          </h1>
          <p className="text-gray-600">Firebase 연결 테스트</p>
        </header>

        {/* 연결 상태 카드 */}
        <div className="bg-white border-4 border-black p-6 shadow-hard mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Database className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Firebase 연결 상태</h2>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border-2 border-gray-200">
            {connectionStatus === 'checking' && (
              <>
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="text-blue-600 font-semibold">연결 확인 중...</span>
              </>
            )}
            {connectionStatus === 'connected' && (
              <>
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-green-600 font-semibold">Firebase 연결 성공!</span>
              </>
            )}
            {connectionStatus === 'error' && (
              <>
                <XCircle className="w-6 h-6 text-red-500" />
                <div>
                  <span className="text-red-600 font-semibold block">연결 실패</span>
                  <span className="text-red-400 text-sm">{errorMessage}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Firebase 설정 정보 */}
        <div className="bg-white border-4 border-black p-6 shadow-hard mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Wifi className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Firebase 프로젝트</h2>
          </div>

          <div className="space-y-2 font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-lg">
            <p>Project ID: <span className="text-white">growth-simulation</span></p>
            <p>Auth Domain: <span className="text-white">growth-simulation.firebaseapp.com</span></p>
            <p>Storage: <span className="text-white">growth-simulation.firebasestorage.app</span></p>
          </div>
        </div>

        {/* 테스트 버튼 및 데이터 */}
        {connectionStatus === 'connected' && (
          <div className="bg-white border-4 border-black p-6 shadow-hard">
            <h2 className="text-2xl font-bold mb-4">Firestore 테스트</h2>

            <button
              onClick={handleAddTestData}
              className="w-full py-3 px-6 bg-blue-600 text-white font-bold border-4 border-black shadow-hard hover:bg-blue-700 hover:translate-y-1 hover:shadow-hard-sm transition-all mb-4"
            >
              테스트 데이터 추가
            </button>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
              <p className="font-semibold mb-2">저장된 테스트 데이터: {testData.length}개</p>
              {testData.length > 0 && (
                <ul className="text-sm text-gray-600 space-y-1">
                  {testData.slice(-5).map((item, idx) => (
                    <li key={idx} className="font-mono">
                      ID: {item.id.substring(0, 8)}...
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 다음 단계 안내 */}
        <div className="mt-8 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <p className="font-semibold text-yellow-800">
            Firebase 연결이 성공하면, 새 앱의 기능을 구현할 수 있습니다!
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
