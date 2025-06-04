import React, {useState} from 'react';
import Input from "@components/forms/Input.tsx";
import {MagnifyingGlassIcon, ChevronDownIcon} from "@heroicons/react/24/outline";
import {Menu} from '@headlessui/react';
import {useLocation} from 'react-router-dom';

interface SearchInputProps {
    searchValue: string;
    setSearchValue: (value: string) => void;
    onSearch: (type: string, value: string) => void;
}

export default function SearchInput({searchValue, setSearchValue, onSearch}: SearchInputProps) {
    // 현재 경로 위치 가져오는 useLocation 훅 사용
    const location = useLocation();
    console.log("Current location:", location.pathname);

    // Path Name에 따라 검색 타입을 다르게 설정
    let SEARCH_TYPES = [];
    if (location.pathname === '/banners/main' || location.pathname === '/banners/company' || location.pathname === '/banners/bottom' || location.pathname === '/banners/mini') {
        SEARCH_TYPES = [{key: 'title', label: '제목'}]
    } else if (location.pathname === '/guidelines/casino' || location.pathname === '/guidelines/sports') {
        SEARCH_TYPES = [{key: 'title', label: '제목'}]
    } else if (location.pathname === '/data/casino-games' || location.pathname === '/data/casino-recommendations') {
        SEARCH_TYPES = [{key: 'title', label: '제목'}]
    } else if (location.pathname === '/data/sports') {
        SEARCH_TYPES = [{key: 'displayName', label: '표시이름'}, {key: 'sportsName', label: '종목 명'}]
    } else {
        SEARCH_TYPES = [{key: 'title', label: '제목'},
            {key: 'content', label: '내용'},
            {key: 'both', label: '제목 + 내용'},
            {key: 'nickname', label: '닉네임'}]
    }

    // 검색 타입 상태
    const [searchType, setSearchType] = useState(SEARCH_TYPES[0].key);

    // 검색 타입 변경 핸들러
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
    };

    // 현재 선택된 검색 타입의 라벨
    const currentTypeLabel = SEARCH_TYPES.find(t => t.key === searchType)?.label;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(searchType, searchValue); // 현재 선택된 타입과 값을 전달
    };

    return (
        <form className="flex items-center gap-2" onSubmit={handleSubmit}>
            <Menu as="div" className="relative">
                <Menu.Button className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded-l">
                    {currentTypeLabel}
                    <ChevronDownIcon className="w-4 h-4"/>
                </Menu.Button>
                <Menu.Items className="absolute z-10 w-24 mt-1 bg-white border rounded-md shadow-lg">
                    {SEARCH_TYPES.map(({key, label}) => (
                        <Menu.Item key={key}>
                            {({active}) => (
                                <button
                                    className={`${active ? 'bg-gray-100' : ''} w-full px-3 py-2 text-sm text-left`}
                                    onClick={() => setSearchType(key)}
                                >
                                    {label}
                                </button>
                            )}
                        </Menu.Item>
                    ))}
                </Menu.Items>
            </Menu>
            <Input
                placeholder="검색어를 입력하세요"
                className="w-[350px]"
                value={searchValue}
                onChange={handleSearchChange}
            />
            <button type="submit" className="bg-[#2C3640] py-[6px] px-[12px] rounded">
                <MagnifyingGlassIcon className="w-7 h-7 text-white"/>
            </button>
        </form>
    );
}
