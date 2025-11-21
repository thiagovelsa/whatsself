import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts, commonShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useSendMessage, useBroadcast, useBulkReply, useTemplates } from '../../hooks/useApi';
import { useMessagesFilters } from './hooks/useMessagesFilters';
import { useMessagesData } from './hooks/useMessagesData';
import { MessagesHeader } from './components/MessagesHeader';
import { QuickToolsSection } from './components/QuickToolsSection';
import { MessageFilters } from './components/MessageFilters';
import { BulkActionsBar } from './components/BulkActionsBar';
import { MessageList } from './components/MessageList';
import { SendMessageModal, BroadcastModal, BulkReplyModal, MessageDetailModal } from './components/modals';
import ScrollToTop from '../../components/ScrollToTop';
import type { Message } from '../../types';

export default function Messages() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Filters
  const {
    searchTerm,
    filterDirection,
    filterStatus,
    showFilters,
    debouncedSearch,
    setSearchTerm,
    setFilterDirection,
    setFilterStatus,
    setShowFilters,
    searchParams,
    setSearchParams,
  } = useMessagesFilters();

  // Data
  const {
    messages,
    allMessages,
    templates,
    triggers,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    dataUpdatedAt,
    hiddenMessageIds,
    hideMessage,
    clearHiddenMessages,
  } = useMessagesData({
    debouncedSearch,
    filterDirection,
    filterStatus,
  });

  // Templates loading state
  const { isLoading: isLoadingTemplates } = useTemplates();

  // Mutations
  const sendMessageMutation = useSendMessage();
  const broadcastMutation = useBroadcast();
  const bulkReplyMutation = useBulkReply();

  // Modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showBulkReplyModal, setShowBulkReplyModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Tip dismissed state
  const [bulkTipDismissed, setBulkTipDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('messages_bulk_tip_dismissed') === 'true';
  });

  // Handle URL action params
  useEffect(() => {
    const action = searchParams.get('action');
    if (!action) return;

    if (action === 'send') setShowSendModal(true);
    else if (action === 'broadcast') setShowBroadcastModal(true);
    else if (action === 'bulk') setShowBulkReplyModal(true);

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('action');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Listen for real-time updates
  useEffect(() => {
    const handleStatusUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    };

    const handleReconnect = () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    };

    window.addEventListener('message:status:update', handleStatusUpdate);
    window.addEventListener('websocket:reconnected', handleReconnect);

    return () => {
      window.removeEventListener('message:status:update', handleStatusUpdate);
      window.removeEventListener('websocket:reconnected', handleReconnect);
    };
  }, [queryClient]);

  // Selection handlers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(messages.map((m) => m.id)));
  }, [messages]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Computed values
  const selectedMessagesList = useMemo(() =>
    messages.filter((msg) => selectedIds.has(msg.id)),
    [messages, selectedIds]
  );

  const selectedConversationCount = useMemo(() =>
    new Set(selectedMessagesList.map((msg) => msg.contactId)).size,
    [selectedMessagesList]
  );

  // Close bulk modal when nothing is selected
  useEffect(() => {
    if (selectedIds.size === 0 && showBulkReplyModal) {
      setShowBulkReplyModal(false);
    }
  }, [selectedIds, showBulkReplyModal]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'r',
      ctrl: true,
      action: () => refetch(),
      description: 'Atualizar mensagens',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => setShowSendModal(true),
      description: 'Nova mensagem',
    },
    {
      key: 'b',
      ctrl: true,
      action: () => setShowBroadcastModal(true),
      description: 'Broadcast',
    },
    {
      key: 'Escape',
      action: () => {
        if (showSendModal) setShowSendModal(false);
        if (showBroadcastModal) setShowBroadcastModal(false);
        if (selectedMessage) setSelectedMessage(null);
      },
      description: 'Fechar modal',
    },
    {
      key: 'd',
      ctrl: true,
      action: commonShortcuts.navigateToDashboard(navigate),
      description: 'Ir para Dashboard',
    },
  ]);

  // Action handlers
  const handleClearMessages = async () => {
    queryClient.removeQueries({ queryKey: ['messages'] });
    await refetch();
  };

  const handleClearDisplayedMessages = () => {
    if (selectedIds.size > 0) {
      selectedIds.forEach((id) => hideMessage(id));
      deselectAll();
    } else {
      messages.forEach((msg) => hideMessage(msg.id));
    }
  };

  const handleHideSelected = () => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach((id) => hideMessage(id));
    deselectAll();
  };

  const dismissBulkTip = () => {
    setBulkTipDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('messages_bulk_tip_dismissed', 'true');
    }
  };

  // Modal handlers
  const handleSendMessage = async (phone: string, text: string, priority: number) => {
    await sendMessageMutation.mutateAsync({ phone, text, priority });
    setShowSendModal(false);
  };

  const handleBroadcast = async (text: string, optedInOnly: boolean) => {
    await broadcastMutation.mutateAsync({ text, optedInOnly });
    setShowBroadcastModal(false);
  };

  const handleBulkReply = async (
    templateId: string | undefined,
    text: string | undefined,
    respectOptOut: boolean
  ) => {
    await bulkReplyMutation.mutateAsync({
      messageIds: Array.from(selectedIds),
      templateId,
      text,
      respectOptOut,
    });
    setShowBulkReplyModal(false);
    deselectAll();
  };

  return (
    <div className="space-y-6">
      <MessagesHeader
        displayedCount={messages.length}
        totalCount={allMessages.length}
        dataUpdatedAt={dataUpdatedAt}
        onClearMessages={handleClearMessages}
        onOpenBroadcast={() => setShowBroadcastModal(true)}
        onOpenSend={() => setShowSendModal(true)}
      />

      <QuickToolsSection
        selectedCount={selectedIds.size}
        bulkTipDismissed={bulkTipDismissed}
        onOpenSend={() => setShowSendModal(true)}
        onOpenBroadcast={() => setShowBroadcastModal(true)}
        onOpenBulkReply={() => setShowBulkReplyModal(true)}
        onDismissTip={dismissBulkTip}
      />

      <MessageFilters
        searchTerm={searchTerm}
        filterDirection={filterDirection}
        filterStatus={filterStatus}
        showFilters={showFilters}
        onSearchChange={setSearchTerm}
        onDirectionChange={setFilterDirection}
        onStatusChange={setFilterStatus}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      <BulkActionsBar
        selectedCount={selectedIds.size}
        conversationCount={selectedConversationCount}
        isPending={bulkReplyMutation.isPending}
        onDeselectAll={deselectAll}
        onOpenBulkReply={() => setShowBulkReplyModal(true)}
        onHideSelected={handleHideSelected}
      />

      <MessageList
        messages={messages}
        allMessagesCount={allMessages.length}
        templates={templates}
        triggers={triggers}
        selectedIds={selectedIds}
        hiddenCount={hiddenMessageIds.size}
        isLoading={isLoading}
        error={null}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        onSelectMessage={toggleSelection}
        onViewDetails={setSelectedMessage}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onClearHidden={clearHiddenMessages}
        onClearDisplayed={handleClearDisplayedMessages}
        onFetchNextPage={fetchNextPage}
      />

      <SendMessageModal
        isOpen={showSendModal}
        isPending={sendMessageMutation.isPending}
        onClose={() => setShowSendModal(false)}
        onSend={handleSendMessage}
      />

      <BroadcastModal
        isOpen={showBroadcastModal}
        isPending={broadcastMutation.isPending}
        onClose={() => setShowBroadcastModal(false)}
        onBroadcast={handleBroadcast}
      />

      <BulkReplyModal
        isOpen={showBulkReplyModal}
        isPending={bulkReplyMutation.isPending}
        isError={bulkReplyMutation.isError}
        errorMessage={bulkReplyMutation.error instanceof Error ? bulkReplyMutation.error.message : undefined}
        selectedCount={selectedIds.size}
        conversationCount={selectedConversationCount}
        templates={templates}
        isLoadingTemplates={isLoadingTemplates}
        onClose={() => setShowBulkReplyModal(false)}
        onSubmit={handleBulkReply}
      />

      <MessageDetailModal
        message={selectedMessage}
        onClose={() => setSelectedMessage(null)}
      />

      <ScrollToTop />
    </div>
  );
}
