// Firebase Storage 유틸리티 - 이미지 업로드용
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

// 최대 파일 크기: 3MB
const MAX_FILE_SIZE = 3 * 1024 * 1024;

// 허용되는 이미지 타입
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * 세션 보드 배경 이미지 업로드
 * @param file - 업로드할 이미지 파일
 * @param sessionId - 세션 ID (파일 경로에 사용)
 * @returns 업로드 결과 (성공 시 다운로드 URL 포함)
 */
export const uploadBoardImage = async (
  file: File,
  sessionId: string
): Promise<UploadResult> => {
  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`
    };
  }

  // 파일 타입 검증
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: '지원하지 않는 파일 형식입니다. JPG, PNG, GIF, WebP만 가능합니다.'
    };
  }

  try {
    // 파일 확장자 추출
    const extension = file.name.split('.').pop() || 'png';

    // 고유한 파일명 생성 (세션ID_타임스탬프.확장자)
    const fileName = `board-images/${sessionId}/${Date.now()}.${extension}`;

    // Storage 참조 생성
    const storageRef = ref(storage, fileName);

    // 파일 업로드
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        sessionId,
        uploadedAt: new Date().toISOString()
      }
    });

    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      url: downloadURL
    };
  } catch (error: any) {
    console.error('Image upload error:', error);

    // Firebase Storage 에러 처리
    if (error.code === 'storage/unauthorized') {
      return {
        success: false,
        error: 'Firebase Storage 권한이 없습니다. Storage 규칙을 확인해주세요.'
      };
    }

    if (error.code === 'storage/canceled') {
      return {
        success: false,
        error: '업로드가 취소되었습니다.'
      };
    }

    return {
      success: false,
      error: `업로드 실패: ${error.message || '알 수 없는 오류'}`
    };
  }
};

/**
 * 이미지 삭제 (선택사항)
 * @param imageUrl - 삭제할 이미지의 URL
 */
export const deleteBoardImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // URL에서 Storage 참조 생성
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('Image delete error:', error);
    return false;
  }
};
