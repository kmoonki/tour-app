import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { MapPin, ImageOff, Loader2 } from 'lucide-react';
import './App.css';

// 한국관광공사 지역 코드 목록 (주요 17개 시도)
const AREA_CODES = [
  { code: '1', name: '서울' },
  { code: '2', name: '인천' },
  { code: '3', name: '대전' },
  { code: '4', name: '대구' },
  { code: '5', name: '광주' },
  { code: '6', name: '부산' },
  { code: '7', name: '울산' },
  { code: '8', name: '세종' },
  { code: '31', name: '경기도' },
  { code: '32', name: '강원도' },
  { code: '33', name: '충청북도' },
  { code: '34', name: '충청남도' },
  { code: '35', name: '경상북도' },
  { code: '36', name: '경상남도' },
  { code: '37', name: '전라북도' },
  { code: '38', name: '전라남도' },
  { code: '39', name: '제주도' }
];

export default function App() {
  const [selectedArea, setSelectedArea] = useState(null);
  const [tourList, setTourList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialChecked, setInitialChecked] = useState(false);

  // TourAPI 지역기반 관광정보 조회
  const fetchTourData = async (areaCode) => {
    setLoading(true);
    const serviceKey = import.meta.env.VITE_TOUR_API_KEY;
    const endpoint = 'https://apis.data.go.kr/B551011/KorService2/areaBasedList2';
    
    const params = new URLSearchParams({
      serviceKey: serviceKey,
      numOfRows: '12',
      pageNo: '1',
      MobileOS: 'ETC',
      MobileApp: 'TourWeb',
      _type: 'json',
      arrange: 'O', // 제목순 정렬
      areaCode: areaCode
    });

    try {
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const data = await response.json();
      
      const items = data?.response?.body?.items?.item;
      if (Array.isArray(items)) {
        setTourList(items);
      } else if (items) {
        setTourList([items]);
      } else {
        setTourList([]);
      }
    } catch (error) {
      console.error('관광데이터 API 호출 에러:', error);
      setTourList([]);
    } finally {
      setLoading(false);
    }
  };

  // 1. 초기 렌더링 시 Firebase에서 최근 선택된 지역 정보 읽기
  useEffect(() => {
    const loadUserSavedArea = async () => {
      try {
        const docRef = doc(db, 'user_settings', 'current_state');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const savedData = docSnap.data();
          if (savedData?.areaCode) {
            setSelectedArea(savedData.areaCode);
            await fetchTourData(savedData.areaCode);
          }
        }
      } catch (err) {
        console.error('Firebase 로드 에러:', err);
      } finally {
        setInitialChecked(true);
      }
    };

    loadUserSavedArea();
  }, []);

  // 2. 지역 선택 변경 핸들러 (Firestore 업데이트 + API 재호출)
  const handleAreaChange = async (e) => {
    const areaCode = e.target.value;
    if (!areaCode) return;

    const areaObj = AREA_CODES.find((item) => item.code === areaCode);
    setSelectedArea(areaCode);

    // Firebase Firestore에 저장/덮어쓰기
    try {
      await setDoc(doc(db, 'user_settings', 'current_state'), {
        areaCode: areaCode,
        areaName: areaObj ? areaObj.name : '',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Firebase 저장 에러:', err);
    }

    // 데이터 조회
    fetchTourData(areaCode);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>대한민국 구석구석 관광지 뷰어</h1>
        <p>원하는 지역을 선택하면 관광 명소 목록과 이미지를 확인할 수 있습니다.</p>

        <div className="select-box-wrap">
          <label htmlFor="area-select">지역 선택: </label>
          <select 
            id="area-select" 
            value={selectedArea || ''} 
            onChange={handleAreaChange}
            className="area-select"
          >
            <option value="" disabled>지역을 선택해주세요</option>
            {AREA_CODES.map((area) => (
              <option key={area.code} value={area.code}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* 로딩 인디케이터 */}
      {loading && (
        <div className="status-box">
          <Loader2 className="spinner" />
          <p>관광지 정보를 불러오는 중입니다...</p>
        </div>
      )}

      {/* 저장된 지역이 없고 로딩 중이 아닐 때 안내 화면 */}
      {!selectedArea && initialChecked && !loading && (
        <div className="empty-state">
          <p>선택된 지역 정보가 없습니다. 상단에서 지역을 먼저 선택해 주세요.</p>
        </div>
      )}

      {/* 시각화된 목록 뷰 (선택된 지역이 있을 때만 표출) */}
      {selectedArea && !loading && (
        <main className="content-area">
          <h2 className="section-title">
            📍 {AREA_CODES.find((a) => a.code === selectedArea)?.name} 관광 명소
          </h2>

          {tourList.length === 0 ? (
            <p className="no-result">해당 지역의 조회된 관광 정보가 없습니다.</p>
          ) : (
            <div className="grid-container">
              {tourList.map((item) => (
                <div key={item.contentid} className="card">
                  <div className="image-wrapper">
                    {item.firstimage || item.firstimage2 ? (
                      <img
                        src={item.firstimage || item.firstimage2}
                        alt={item.title}
                        loading="lazy"
                        className="card-image"
                      />
                    ) : (
                      <div className="no-image">
                        <ImageOff size={32} />
                        <span>이미지 없음</span>
                      </div>
                    )}
                  </div>
                  <div className="card-body">
                    <h3 className="card-title">{item.title}</h3>
                    <p className="card-address">
                      <MapPin size={14} className="pin-icon" />
                      {item.addr1 || '주소 정보 없음'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}