import { useState, useEffect, useCallback } from 'react';

interface Technology {
  id: number;
  name: string;
  identifier: string;
  created_at?: string;
  updated_at?: string;
  pivot?: {
    status: string;
  };
  metadata?: Array<{
    name: string;
    value: string;
  }>;
}

export default function useTechnologies() {
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTechnologies = useCallback(async () => {
    try {
      const response = await fetch('/api/nordvpn/technologies');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Không thể tải danh sách công nghệ');
      }

      setTechnologies(data.technologies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTechnologies();
  }, [fetchTechnologies]);

  return {
    technologies,
    loading,
    error,
    refetch: fetchTechnologies
  };
} 