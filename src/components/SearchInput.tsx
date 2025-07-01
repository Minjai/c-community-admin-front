import React from "react";
import Input from "@components/forms/Input.tsx";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface SearchInputProps {
  searchValue: string;
  setSearchValue: (value: string) => void;
  onSearch: (value: string) => void;
}

export default function SearchInput({ searchValue, setSearchValue, onSearch }: SearchInputProps) {
  // 검색어 변경 핸들러
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  return (
    <form className="flex items-center gap-2" onSubmit={handleSubmit}>
      <Input
        placeholder="검색어를 입력하세요"
        className="w-[350px]"
        value={searchValue}
        onChange={handleSearchChange}
      />
      <button type="submit" className="bg-[#2C3640] py-[6px] px-[12px] rounded">
        <MagnifyingGlassIcon className="w-7 h-7 text-white" />
      </button>
    </form>
  );
}
