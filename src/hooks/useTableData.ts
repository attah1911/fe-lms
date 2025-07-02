import { useState, useCallback, useEffect, useRef } from 'react';

interface PaginationData {
  total: number;
  totalPages: number;
  current: number;
}

interface UseTableDataProps<T> {
  fetchData: (page: number, search: string) => Promise<{
    data: T[];
    pagination: {
      total: number;
      totalPages: number;
    };
  }>;
  initialPage?: number;
  initialSearch?: string;
}

interface UseTableDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  pagination: PaginationData;
  handleSearch: (value: string) => void;
  handlePageChange: (page: number) => void;
  refreshData: () => Promise<void>;
}

function useTableData<T>({
  fetchData,
  initialPage = 1,
  initialSearch = ''
}: UseTableDataProps<T>): UseTableDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    totalPages: 0,
    current: initialPage,
  });

  const fetchDataRef = useRef(fetchData);
  const searchTermRef = useRef(searchTerm);
  const paginationRef = useRef(pagination);

  useEffect(() => {
    fetchDataRef.current = fetchData;
    searchTermRef.current = searchTerm;
    paginationRef.current = pagination;
  });

  const loadData = useCallback(async (page: number, search: string) => {
    try {
      setPagination(prev => ({ ...prev, current: page }));
      setLoading(true);
      
      const response = await fetchDataRef.current(page, search);
      
      if (!response || typeof response !== 'object') {
        console.error('Invalid response format:', response);
        setError('Invalid data format received from server');
        setData([]);
        setPagination({
          total: 0,
          totalPages: 0,
          current: page,
        });
        return;
      }
      
      const responseData = Array.isArray(response.data) ? response.data : [];
      
      if (responseData.length === 0 && page > 1) {
        const prevPage = page - 1;
        const prevResponse = await fetchDataRef.current(prevPage, search);
        
        if (!prevResponse || !Array.isArray(prevResponse.data)) {
          setData([]);
          setPagination({
            total: 0,
            totalPages: 0,
            current: 1,
          });
        } else {
          setData(prevResponse.data);
          setPagination({
            total: prevResponse.pagination?.total || 0,
            totalPages: prevResponse.pagination?.totalPages || 0,
            current: prevPage,
          });
        }
      } else {
        setData(responseData);
        setPagination({
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 0,
          current: page,
        });
      }
      setError(null);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    loadData(1, value);
  }, [loadData]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === paginationRef.current.current) return;
    loadData(newPage, searchTermRef.current);
  }, [loadData]);

  const refreshData = useCallback(() => {
    return loadData(paginationRef.current.current, searchTermRef.current);
  }, [loadData]);

  useEffect(() => {
    loadData(initialPage, initialSearch);
  }, [initialPage, initialSearch, loadData]);

  return {
    data,
    loading,
    error,
    searchTerm,
    pagination,
    handleSearch,
    handlePageChange,
    refreshData
  };
}

export default useTableData;
