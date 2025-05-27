import { useRef } from 'react';

interface Country {
  id: number;
  name: string;
  code: string;
}

interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showSuggestions: boolean;
  suggestions: Country[];
  onSelectSuggestion: (country: Country) => void;
  setShowSuggestions: (show: boolean) => void;
  className?: string;
}

export default function SearchFilter({
  searchQuery,
  onSearchChange,
  showSuggestions,
  suggestions,
  onSelectSuggestion,
  setShowSuggestions,
  className = ''
}: SearchFilterProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={searchInputRef}
        type="text"
        className="w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
        placeholder="Tìm kiếm máy chủ..."
        value={searchQuery}
        onChange={(e) => {
          onSearchChange(e);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
      />
      
      {/* Danh sách gợi ý quốc gia */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionListRef}
          className="absolute z-50 w-full mt-1 bg-[#1f2937] border-2 border-[#f8b700] rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          <div className="sticky top-0 bg-[#121827] border-b border-[#2d3748] px-3 py-2 text-sm text-gray-400">
            Chọn một quốc gia ({suggestions.length} kết quả)
          </div>
          <ul className="py-1">
            {suggestions.map(country => (
              <li 
                key={`suggestion-${country.id}`}
                className="block px-4 py-3 hover:bg-[#f8b700] hover:text-black cursor-pointer text-white transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectSuggestion(country);
                }}
                onMouseDown={(e) => {
                  // Ngăn không cho input mất focus trước khi xử lý click
                  e.preventDefault();
                }}
              >
                <div className="flex items-center">
                  <span className="mr-2 text-[#f8b700] font-bold">•</span>
                  {country.name} ({country.code})
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 