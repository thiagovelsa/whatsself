import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSendMessage, useBroadcast, useBulkReply } from '../../../hooks/useApi';
import { notificationActions } from '../../../stores/useNotificationStore';

type ModalType = 'send' | 'broadcast' | 'bulk' | null;

export function useMessagesActions() {
  const queryClient = useQueryClient();

  // Modal states
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Mutations
  const sendMessage = useSendMessage();
  const broadcast = useBroadcast();
  const bulkReply = useBulkReply();

  // Selection state
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  // Modal handlers
  const openSendModal = useCallback(() => setActiveModal('send'), []);
  const openBroadcastModal = useCallback(() => setActiveModal('broadcast'), []);
  const openBulkReplyModal = useCallback(() => setActiveModal('bulk'), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  // Send single message
  const handleSendMessage = useCallback(async (phone: string, text: string) => {
    try {
      await sendMessage.mutateAsync({ phone, text });
      notificationActions.notify({
        type: 'success',
        message: 'Mensagem enviada com sucesso!',
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar mensagem';
      notificationActions.notify({
        type: 'error',
        message,
      });
      throw error;
    }
  }, [sendMessage, queryClient, closeModal]);

  // Broadcast message
  const handleBroadcast = useCallback(async (text: string, contactIds: string[]) => {
    try {
      await broadcast.mutateAsync({ text, contactIds });
      notificationActions.notify({
        type: 'success',
        message: `Broadcast enviado para ${contactIds.length} contatos!`,
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar broadcast';
      notificationActions.notify({
        type: 'error',
        message,
      });
      throw error;
    }
  }, [broadcast, queryClient, closeModal]);

  // Bulk reply
  const handleBulkReply = useCallback(async (messageIds: string[], templateId: string) => {
    try {
      await bulkReply.mutateAsync({ messageIds, templateId });
      notificationActions.notify({
        type: 'success',
        message: `Resposta enviada para ${messageIds.length} mensagens!`,
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setSelectedMessages(new Set());
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar respostas em lote';
      notificationActions.notify({
        type: 'error',
        message,
      });
      throw error;
    }
  }, [bulkReply, queryClient, closeModal]);

  // Selection handlers
  const toggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const selectAllMessages = useCallback((messageIds: string[]) => {
    setSelectedMessages(new Set(messageIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMessages(new Set());
  }, []);

  return {
    // Modal state
    activeModal,
    openSendModal,
    openBroadcastModal,
    openBulkReplyModal,
    closeModal,

    // Actions
    handleSendMessage,
    handleBroadcast,
    handleBulkReply,

    // Selection
    selectedMessages,
    toggleMessageSelection,
    selectAllMessages,
    clearSelection,

    // Loading states
    isSending: sendMessage.isPending,
    isBroadcasting: broadcast.isPending,
    isBulkReplying: bulkReply.isPending,
  };
}
