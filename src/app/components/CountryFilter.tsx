interface Country {
  id: number;
  name: string;
  code: string;
}

interface CountryFilterProps {
  countries: Country[];
  selectedCountryId: number | null;
  onCountryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}

export default function CountryFilter({
  countries,
  selectedCountryId,
  onCountryChange,
  className = ''
}: CountryFilterProps) {
  return (
    <select
      className={`w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700] ${className}`}
      value={selectedCountryId?.toString() || ''}
      onChange={onCountryChange}
    >
      <option value="">Tất cả quốc gia</option>
      {countries.map(country => (
        <option 
          key={`country-${country.id}`} 
          value={country.id.toString()}
        >
          {country.name} ({country.code})
        </option>
      ))}
    </select>
  );
} 