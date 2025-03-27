import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../services/NavigationService';
import BannerManagementService from '../../services/BannerManagementService';
import { Banner } from '../../types/prisma';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import Input from '../../components/forms/Input';
import DatePicker from '../../components/forms/DatePicker';
import FileUpload from '../../components/forms/FileUpload';
import Alert from '../../components/Alert';

const MainBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<Banner> | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 배너 목록 조회
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await BannerManagementService.getBanners('main');
      setBanners(data);
      setError(null);
    } catch (err) {
      setError('배너 목록을 불러오는 중 오류가 발생했습니다.');
      console.error('Error fetching banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // 배너 추가 모달 열기
  const handleAddBanner = () => {
    setCurrentBanner({
      title: '',
      pcImageUrl: '',
      mobileImageUrl: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isPublic: true,
      displayOrder: banners.length > 0 ? Math.max(...banners.map(b => b.displayOrder)) + 1 : 1,
      type: 'main'
    });
    setIsEditing(false);
    setShowModal(true);
  };

  // 배너 수정 모달 열기
  const handleEditBanner = (banner: Banner) => {
    setCurrentBanner({ ...banner });
    setIsEditing(true);
    setShowModal(true);
  };

  // 배너 저장 (추가 또는 수정)
  const handleSaveBanner = async () => {
    if (!currentBanner) return;

    try {
      if (isEditing && currentBanner.id) {
        // 배너 수정
        await BannerManagementService.updateBanner(currentBanner.id, currentBanner);
        setAlertMessage({ type: 'success', message: '배너가 성공적으로 수정되었습니다.' });
      } else {
        // 배너 추가
        await BannerManagementService.createBanner(currentBanner as Omit<Banner, 'id'>);
        setAlertMessage({ type: 'success', message: '배너가 성공적으로 추가되었습니다.' });
      }
      
      setShowModal(false);
      fetchBanners();
    } catch (err) {
      setAlertMessage({ type: 'error', message: '배너 저장 중 오류가 발생했습니다.' });
      console.error('Error saving banner:', err);
    }
  };

  // 배너 삭제
  const handleDeleteBanner = async (id: number) => {
    if (!window.confirm('정말로 이 배너를 삭제하시겠습니까?')) return;

    try {
      await BannerManagementService.deleteBanner(id);
      setAlertMessage({ type: 'success', message: '배너가 성공적으로 삭제되었습니다.' });
      fetchBanners();
    } catch (err) {
      setAlertMessage({ type: 'error', message: '배너 삭제 중 오류가 발생했습니다.' });
      console.error('Error deleting banner:', err);
    }
  };

  // 배너 순서 변경
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    
    const newBanners = [...banners];
    const temp = newBanners[index].displayOrder;
    newBanners[index].displayOrder = newBanners[index - 1].displayOrder;
    newBanners[index - 1].displayOrder = temp;
    
    try {
      await BannerManagementService.updateBannerOrder([
        { id: newBanners[index].id, displayOrder: newBanners[index].displayOrder },
        { id: newBanners[index - 1].id, displayOrder: newBanners[index - 1].displayOrder }
      ]);
      fetchBanners();
    } catch (err) {
      setAlertMessage({ type: 'error', message: '배너 순서 변경 중 오류가 발생했습니다.' });
      console.error('Error updating banner order:', err);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= banners.length - 1) return;
    
    const newBanners = [...banners];
    const temp = newBanners[index].displayOrder;
    newBanners[index].displayOrder = newBanners[index + 1].displayOrder;
    newBanners[index + 1].displayOrder = temp;
    
    try {
      await BannerManagementService.updateBannerOrder([
        { id: newBanners[index].id, displayOrder: newBanners[index].displayOrder },
        { id: newBanners[index + 1].id, displayOrder: newBanners[index + 1].displayOrder }
      ]);
      fetchBanners();
    } catch (err) {
      setAlertMessage({ type: 'error', message: '배너 순서 변경 중 오류가 발생했습니다.' });
      console.error('Error updating banner order:', err);
    }
  };

  // 입력 필드 변경 처리
  const handleInputChange = (name: string, value: any) => {
    if (!currentBanner) return;
    setCurrentBanner({ ...currentBanner, [name]: value });
  };

  // 테이블 컬럼 정의
  const columns = [
    { header: '순서', accessor: 'displayOrder' },
    { header: '제목', accessor: 'title' },
    { 
      header: 'PC 이미지', 
      accessor: 'pcImageUrl',
      cell: (value: string) => (
        <div className="w-20 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="PC 배너" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500">이미지 없음</span>
          )}
        </div>
      )
    },
    { 
      header: '모바일 이미지', 
      accessor: 'mobileImageUrl',
      cell: (value: string) => (
        <div className="w-16 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="모바일 배너" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500">이미지 없음</span>
          )}
        </div>
      )
    },
    { header: '시작일', accessor: 'startDate' },
    { header: '종료일', accessor: 'endDate' },
    { 
      header: '공개 여부', 
      accessor: 'isPublic',
      cell: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {value ? '공개' : '비공개'}
        </span>
      )
    },
    {
      header: '관리',
      accessor: 'id',
      cell: (value: number, row: Banner, index: number) => (
        <div className="flex space-x-2">
          <ActionButton
            onClick={() => handleMoveUp(index)}
            disabled={index === 0}
            icon="up"
            tooltip="위로 이동"
          />
          <ActionButton
            onClick={() => handleMoveDown(index)}
            disabled={index === banners.length - 1}
            icon="down"
            tooltip="아래로 이동"
          />
          <ActionButton
            onClick={() => handleEditBanner(row)}
            icon="edit"
            tooltip="수정"
          />
          <ActionButton
            onClick={() => handleDeleteBanner(value)}
            icon="delete"
            tooltip="삭제"
            variant="danger"
          />
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">메인 배너 관리</h1>
        <Button onClick={handleAddBanner}>배너 추가</Button>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
          className="mb-4"
        />
      )}

      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
          className="mb-4"
        />
      )}

      <DataTable
        columns={columns}
        data={banners}
        loading={loading}
        emptyMessage="등록된 배너가 없습니다."
      />

      {/* 배너 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? '배너 수정' : '배너 추가'}
        size="lg"
      >
        {currentBanner && (
          <div className="space-y-4">
            <Input
              label="배너 제목"
              name="title"
              value={currentBanner.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUpload
                label="PC 이미지 (권장 크기: 1920x400)"
                name="pcImageUrl"
                value={currentBanner.pcImageUrl || ''}
                onChange={(url) => handleInputChange('pcImageUrl', url)}
                required
              />
              
              <FileUpload
                label="모바일 이미지 (권장 크기: 640x400)"
                name="mobileImageUrl"
                value={currentBanner.mobileImageUrl || ''}
                onChange={(url) => handleInputChange('mobileImageUrl', url)}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="시작일"
                name="startDate"
                value={currentBanner.startDate || ''}
                onChange={(date) => handleInputChange('startDate', date)}
                required
              />
              
              <DatePicker
                label="종료일"
                name="endDate"
                value={currentBanner.endDate || ''}
                onChange={(date) => handleInputChange('endDate', date)}
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={currentBanner.isPublic || false}
                onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                공개 여부
              </label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                취소
              </Button>
              <Button onClick={handleSaveBanner}>
                {isEditing ? '수정' : '추가'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MainBannerPage;
