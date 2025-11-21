import { useMemo, useState, useEffect } from 'react';
import {
  usePaginatedMessages,
  useTemplates,
  useTriggers,
} from '../../../hooks/useApi';
import type { MessageDirection, MessageStatus } from '../../../types';

const HIDDEN_MESSAGES_KEY = 'messages_hidden_ids';

interface UseMessagesDataProps {
  debouncedSearch: string;
  filterDirection: string;
  filterStatus: string;
}

export function useMessagesData({
  debouncedSearch,
  filterDirection,
  filterStatus,
}: UseMessagesDataProps) {
  // Hidden messages from localStorage
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(HIDDEN_MESSAGES_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Paginated messages query
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    dataUpdatedAt,
  } = usePaginatedMessages({
    search: debouncedSearch || undefined,
    direction: filterDirection !== 'all' ? (filterDirection as MessageDirection) : undefined,
    status: filterStatus !== 'all' ? (filterStatus as MessageStatus) : undefined,
  });

  // Templates and triggers
  const { data: templates = [] } = useTemplates();
  const { data: triggers = [] } = useTriggers();

  // Flatten paginated data
  const allMessages = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items || []);
  }, [data]);

  // Filter out hidden messages
  const visibleMessages = useMemo(() => {
    return allMessages.filter((msg) => !hiddenMessageIds.has(msg.id));
  }, [allMessages, hiddenMessageIds]);

  // Save hidden IDs to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(HIDDEN_MESSAGES_KEY, JSON.stringify([...hiddenMessageIds]));
    }
  }, [hiddenMessageIds]);

  // Hide a message
  const hideMessage = (messageId: string) => {
    setHiddenMessageIds((prev) => new Set([...prev, messageId]));
  };

  // Clear hidden messages
  const clearHiddenMessages = () => {
    setHiddenMessageIds(new Set());
    if (typeof window !== 'undefined') {
      localStorage.removeItem(HIDDEN_MESSAGES_KEY);
    }
  };

  return {
    // Data
    messages: visibleMessages,
    allMessages,
    templates,
    triggers,

    // Loading states
    isLoading,
    isFetchingNextPage,

    // Pagination
    fetchNextPage,
    hasNextPage,
    refetch,
    dataUpdatedAt,

    // Hidden messages
    hiddenMessageIds,
    hideMessage,
    clearHiddenMessages,
  };
}
