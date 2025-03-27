import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../services/NavigationService';
import { getUsers } from '../../api';
import { User } from '../../types/prisma';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import Input from '../../components/forms/Input';
import Select from '../../components/forms/Select';
import Alert from '../../components/Alert';

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 회원 목록 조회
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { users, total } = await getUsers(currentPage, pageSize);
      setUsers(users);
      setTotalUsers(total);
      setError(null);
    } catch (err) {
      setError('회원 목록을 불러오는 중 오류가 발생했습니다.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize]);

  // 회원 상세 정보 모달 열기
  const handleViewUser = (user: User) => {
    setCurrentUser({ ...user });
    setIsEditing(false);
    setShowModal(true);
  };

  // 회원 수정 모달 열기
  const handleEditUser = (user: User) => {
    setCurrentUser({ ...user });
    setIsEditing(true);
    setShowModal(true);
  };

  // 회원 정보 저장 (수정)
  const handleSaveUser = async () => {
    if (!currentUser) return;

    try {
      // 실제 구현에서는 API 호출로 회원 정보 업데이트
      setAlertMessage({ type: 'success', message: '회원 정보가 성공적으로 수정되었습니다.' });
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setAlertMessage({ type: 'error', message: '회원 정보 저장 중 오류가 발생했습니다.' });
      console.error('Error saving user:', err);
    }
  };

  // 페이지 변경 처리
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 페이지 크기 변경 처리
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // 입력 필드 변경 처리
  const handleInputChange = (name: string, value: any) => {
    if (!currentUser) return;
    setCurrentUser({ ...currentUser, [name]: value });
  };

  // 테이블 컬럼 정의
  const columns = [
    { header: 'ID', accessor: 'id' },
    { header: '이메일', accessor: 'email' },
    { header: '닉네임', accessor: 'nickname' },
    { 
      header: '역할', 
      accessor: 'role',
      cell: (value: string) => {
        let badgeClass = 'bg-gray-100 text-gray-800';
        if (value === 'admin') badgeClass = 'bg-blue-100 text-blue-800';
        if (value === 'superadmin') badgeClass = 'bg-purple-100 text-purple-800';
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${badgeClass}`}>
            {value}
          </span>
        );
      }
    },
    { header: '점수', accessor: 'score' },
    { 
      header: '가입일', 
      accessor: 'createdAt',
      cell: (value: string) => new Date(value).toLocaleDateString()
    },
    { 
      header: '최근 로그인', 
      accessor: 'lastLoginAt',
      cell: (value: string) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      header: '관리',
      accessor: 'id',
      cell: (value: number, row: User) => (
        <div className="flex space-x-2">
          <ActionButton
            onClick={() => handleViewUser(row)}
            icon="view"
            tooltip="상세 보기"
          />
          <ActionButton
            onClick={() => handleEditUser(row)}
            icon="edit"
            tooltip="수정"
          />
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">회원 정보 관리</h1>
        <div className="flex items-center space-x-2">
          <Select
            value={pageSize.toString()}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            options={[
              { value: '10', label: '10개씩 보기' },
              { value: '20', label: '20개씩 보기' },
              { value: '50', label: '50개씩 보기' },
            ]}
            className="w-32"
          />
        </div>
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
        data={users}
        loading={loading}
        emptyMessage="등록된 회원이 없습니다."
        pagination={{
          currentPage,
          pageSize,
          totalItems: totalUsers,
          onPageChange: handlePageChange,
        }}
      />

      {/* 회원 상세/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? '회원 정보 수정' : '회원 상세 정보'}
        size="lg"
      >
        {currentUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="이메일"
                name="email"
                value={currentUser.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
                required
              />
              
              <Input
                label="닉네임"
                name="nickname"
                value={currentUser.nickname || ''}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                disabled={!isEditing}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="역할"
                name="role"
                value={currentUser.role || ''}
                onChange={(e) => handleInputChange('role', e.target.value)}
                options={[
                  { value: 'user', label: '일반 회원' },
                  { value: 'admin', label: '관리자' },
                  { value: 'superadmin', label: '최고 관리자' },
                ]}
                disabled={!isEditing}
                required
              />
              
              <Input
                label="점수"
                name="score"
                type="number"
                value={currentUser.score?.toString() || '0'}
                onChange={(e) => handleInputChange('score', parseInt(e.target.value))}
                disabled={!isEditing}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="가입일"
                name="createdAt"
                value={currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : ''}
                disabled
              />
              
              <Input
                label="최근 로그인"
                name="lastLoginAt"
                value={currentUser.lastLoginAt ? new Date(currentUser.lastLoginAt).toLocaleDateString() : '-'}
                disabled
              />
            </div>
            
            {isEditing && (
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  취소
                </Button>
                <Button onClick={handleSaveUser}>
                  저장
                </Button>
              </div>
            )}
            
            {!isEditing && (
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  닫기
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  수정
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagementPage;
