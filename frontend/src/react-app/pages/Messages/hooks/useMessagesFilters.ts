import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '../../../hooks/useDebounce';
import type { MessageDirection, MessageStatus } from '../../../types';

type FilterDirection = 'all' | MessageDirection;
type FilterStatus = 'all' | MessageStatus;

export function useMessagesFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL
  const urlDirection = searchParams.get('direction') as FilterDirection | null;
  const urlStatus = searchParams.get('status') as FilterStatus | null;
  const urlSearchTerm = searchParams.get('search') ?? '';

  // Filter states
  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);
  const [filterDirection, setFilterDirection] = useState<FilterDirection>(urlDirection || 'all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(urlStatus || 'all');
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Sync URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    }
    if (filterDirection !== 'all') {
      params.set('direction', filterDirection);
    }
    if (filterStatus !== 'all') {
      params.set('status', filterStatus);
    }
    setSearchParams(params, { replace: true });
  }, [filterDirection, filterStatus, searchTerm, setSearchParams]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterDirection('all');
    setFilterStatus('all');
  };

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return searchTerm.trim() !== '' || filterDirection !== 'all' || filterStatus !== 'all';
  }, [searchTerm, filterDirection, filterStatus]);

  return {
    // Filter values
    searchTerm,
    filterDirection,
    filterStatus,
    showFilters,
    debouncedSearch,
    hasActiveFilters,

    // Filter setters
    setSearchTerm,
    setFilterDirection,
    setFilterStatus,
    setShowFilters,
    resetFilters,

    // URL params
    searchParams,
    setSearchParams,
  };
}
