// Firebase 초기화 설정
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyDq7NDhDuVuEz2P6-pfHcpICwIHmzWg0eQ",
  authDomain: "growth-simulation.firebaseapp.com",
  projectId: "growth-simulation",
  storageBucket: "growth-simulation.firebasestorage.app",
  messagingSenderId: "417335116310",
  appId: "1:417335116310:web:2a361e9ef2e7bd3c696b37"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firestore 데이터베이스 인스턴스
export const db = getFirestore(app);

// Firebase Auth 인스턴스
export const auth = getAuth(app);

// Firebase Storage 인스턴스
export const storage = getStorage(app);

export default app;
