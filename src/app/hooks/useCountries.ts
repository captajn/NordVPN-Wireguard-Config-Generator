import { useState, useEffect, useCallback } from 'react';

interface Country {
  id: number;
  name: string;
  code: string;
}

export default function useCountries() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch('/api/nordvpn/countries');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Không thể tải danh sách quốc gia');
      }

      setCountries(data.countries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return {
    countries,
    loading,
    error,
    refetch: fetchCountries
  };
} 