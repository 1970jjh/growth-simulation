// Firestore 데이터베이스 서비스
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

// ========================
// 범용 CRUD 함수
// ========================

// 문서 생성
export async function createDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

// 문서 조회
export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const docRef = doc(db, collectionName, docId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toMillis()
        : data.updatedAt
    } as T;
  }
  return null;
}

// 컬렉션 전체 조회
export async function getAllDocuments<T>(
  collectionName: string
): Promise<T[]> {
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toMillis()
        : data.updatedAt
    } as T;
  });
}

// 문서 업데이트
export async function updateDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  updates: Partial<T>
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

// 문서 삭제
export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

// 조건부 조회
export async function queryDocuments<T>(
  collectionName: string,
  field: string,
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains',
  value: any
): Promise<T[]> {
  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, where(field, operator, value));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toMillis()
        : data.updatedAt
    } as T;
  });
}

// ========================
// 실시간 리스너 함수
// ========================

// 단일 문서 구독
export function subscribeToDocument<T>(
  collectionName: string,
  docId: string,
  callback: (data: T | null) => void
): Unsubscribe {
  const docRef = doc(db, collectionName, docId);

  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        id: snapshot.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toMillis()
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toMillis()
          : data.updatedAt
      } as T);
    } else {
      callback(null);
    }
  });
}

// 컬렉션 구독
export function subscribeToCollection<T>(
  collectionName: string,
  callback: (data: T[]) => void
): Unsubscribe {
  const collectionRef = collection(db, collectionName);

  return onSnapshot(collectionRef, (snapshot) => {
    const documents = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toMillis()
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toMillis()
          : data.updatedAt
      } as T;
    });
    callback(documents);
  });
}

// ========================
// 유틸리티 함수
// ========================

// 고유 ID 생성
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// 접근 코드 생성 (6자리 숫자)
export function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
