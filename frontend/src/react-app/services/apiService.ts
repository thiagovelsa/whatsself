import { api } from '../lib/axios';
import type {
  Template,
  Trigger,
  Flow,
  FlowStep,
  FlowStepCreateInput,
  FlowStepUpdateInput,
  Contact,
  Message,
  SystemStatus,
  QueueStatusResponse,
  CircuitBreakerStatus,
  BusinessHours,
  BusinessHoursUpdateResponse,
  SendMessageResponse,
  BroadcastResponse,
  BulkReplyResponse,
  SuccessMessageResponse,
  ContactFlowResponse,
  User,
  DashboardSummary,
  DashboardMetrics,
} from '../types';

export interface PaginatedContactsResponse {
  items: Contact[];
  hasMore: boolean;
  total: number;
}

export interface PaginatedMessagesResponse {
  items: Message[];
  hasMore: boolean;
  total: number;
}

export type ContactsQueryOptions = {
  search?: string;
  status?: 'all' | 'optIn' | 'optOut';
};

export type MessagesQueryOptions = {
  search?: string;
  status?: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  direction?: 'inbound' | 'outbound';
};

export type BulkReplyPayload = {
  messageIds?: string[];
  contactIds?: string[];
  templateId?: string;
  text?: string;
  respectOptOut?: boolean;
  priority?: number;
  metadata?: {
    label?: string;
    note?: string;
  };
  variables?: Record<string, string | number | boolean>;
};

export type SimulatePayload = {
  text: string;
  contactId: string;
};

export type SimulateResponse = {
  matched: boolean;
  trigger?: Trigger;
  flowInstance?: unknown;
  actions?: unknown[];
};

export const apiService = {
  // ==================== Templates ====================
  templates: {
    getAll: async (): Promise<Template[]> => {
      const { data } = await api.get<Template[]>('/templates');
      return data;
    },

    getById: async (id: string): Promise<Template> => {
      const { data } = await api.get<Template>(`/templates/${id}`);
      return data;
    },

    create: async (template: Partial<Template>): Promise<Template> => {
      const { data } = await api.post<Template>('/templates', template);
      return data;
    },

    update: async (id: string, template: Partial<Template>): Promise<Template> => {
      const { data } = await api.put<Template>(`/templates/${id}`, template);
      return data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/templates/${id}`);
    },
  },

  // ==================== Triggers ====================
  triggers: {
    getAll: async (): Promise<Trigger[]> => {
      const { data } = await api.get<Trigger[]>('/triggers');
      return data;
    },

    getById: async (id: string): Promise<Trigger> => {
      const { data } = await api.get<Trigger>(`/triggers/${id}`);
      return data;
    },

    create: async (trigger: Partial<Trigger>): Promise<Trigger> => {
      const { data } = await api.post<Trigger>('/triggers', trigger);
      return data;
    },

    update: async (id: string, trigger: Partial<Trigger>): Promise<Trigger> => {
      const { data } = await api.put<Trigger>(`/triggers/${id}`, trigger);
      return data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/triggers/${id}`);
    },
  },

  // ==================== Flows ====================
  flows: {
    getAll: async (): Promise<Flow[]> => {
      const { data } = await api.get<Flow[]>('/flows');
      return data;
    },

    getById: async (id: string): Promise<Flow> => {
      const { data } = await api.get<Flow>(`/flows/${id}`);
      return data;
    },

    create: async (flow: Partial<Flow>): Promise<Flow> => {
      const { data } = await api.post<Flow>('/flows', flow);
      return data;
    },

    update: async (id: string, flow: Partial<Flow>): Promise<Flow> => {
      const { data } = await api.put<Flow>(`/flows/${id}`, flow);
      return data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/flows/${id}`);
    },

    publish: async (id: string): Promise<Flow> => {
      const { data } = await api.post<Flow>(`/flows/${id}/publish`);
      return data;
    },

    addStep: async (flowId: string, step: FlowStepCreateInput): Promise<FlowStep> => {
      const { data } = await api.post<FlowStep>(`/flows/${flowId}/steps`, step);
      return data;
    },

    updateStep: async (
      flowId: string,
      stepId: string,
      step: FlowStepUpdateInput,
    ): Promise<FlowStep> => {
      const { data } = await api.put<FlowStep>(`/flows/${flowId}/steps/${stepId}`, step);
      return data;
    },

    deleteStep: async (flowId: string, stepId: string): Promise<void> => {
      await api.delete(`/flows/${flowId}/steps/${stepId}`);
    },
  },

  // ==================== Contacts ====================
  contacts: {
    getAll: async (): Promise<Contact[]> => {
      const { data } = await api.get<Contact[]>('/contacts');
      return data;
    },

    getById: async (id: string): Promise<Contact> => {
      const { data } = await api.get<Contact>(`/contacts/${id}`);
      return data;
    },

    getFlow: async (id: string): Promise<ContactFlowResponse> => {
      const { data } = await api.get<ContactFlowResponse>(`/contacts/${id}/flow`);
      return data;
    },

    resetFlow: async (id: string): Promise<void> => {
      await api.post(`/contacts/${id}/flow/reset`);
    },

    pauseFlow: async (id: string): Promise<void> => {
      await api.post(`/contacts/${id}/flow/pause`);
    },

    paginated: async (
      params: { take: number; skip: number } & ContactsQueryOptions,
    ): Promise<PaginatedContactsResponse> => {
      const { data } = await api.get<PaginatedContactsResponse>('/contacts', { params });
      return data;
    },
  },

  // ==================== Messages ====================
  messages: {
    getAll: async (params?: { take?: number; search?: string }): Promise<Message[]> => {
      const { data } = await api.get<Message[]>('/messages', { params: params ?? {} });
      return data;
    },

    send: async (phone: string, text: string, priority?: number): Promise<SendMessageResponse> => {
      const { data } = await api.post<SendMessageResponse>('/send', { phone, text, priority });
      return data;
    },

    broadcast: async (
      text: string,
      contactIds?: string[],
      optedInOnly?: boolean,
    ): Promise<BroadcastResponse> => {
      const { data } = await api.post<BroadcastResponse>('/broadcast', {
        text,
        contactIds,
        optedInOnly,
      });
      return data;
    },

    bulkReply: async (payload: BulkReplyPayload): Promise<BulkReplyResponse> => {
      const { data } = await api.post<BulkReplyResponse>('/messages/bulk-reply', payload);
      return data;
    },

    paginated: async (
      params: { take: number; skip: number } & MessagesQueryOptions,
    ): Promise<PaginatedMessagesResponse> => {
      const { data } = await api.get<PaginatedMessagesResponse>('/messages', { params });
      return data;
    },
  },

  // ==================== System ====================
  system: {
    getStatus: async (): Promise<SystemStatus> => {
      const { data } = await api.get<SystemStatus>('/status');
      return data;
    },

    getQueueStatus: async (): Promise<QueueStatusResponse> => {
      const { data } = await api.get<QueueStatusResponse>('/queue/status');
      return data;
    },

    getCircuitBreakerStatus: async (): Promise<CircuitBreakerStatus> => {
      const { data } = await api.get<CircuitBreakerStatus>('/circuit-breaker/status');
      return data;
    },

    resetCircuitBreaker: async (): Promise<SuccessMessageResponse> => {
      const { data } = await api.post<SuccessMessageResponse>('/circuit-breaker/reset');
      return data;
    },

    forceOpenCircuitBreaker: async (): Promise<SuccessMessageResponse> => {
      const { data } = await api.post<SuccessMessageResponse>('/circuit-breaker/force-open');
      return data;
    },

    getBusinessHours: async (): Promise<BusinessHours> => {
      const { data } = await api.get<BusinessHours>('/business-hours');
      return data;
    },

    updateBusinessHours: async (start: string, end: string): Promise<BusinessHoursUpdateResponse> => {
      const { data } = await api.put<BusinessHoursUpdateResponse>('/business-hours', { start, end });
      return data;
    },

    health: async (): Promise<{ ok: boolean }> => {
      const { data } = await api.get<{ ok: boolean }>('/health');
      return data;
    },

    getDashboardMetrics: async (): Promise<DashboardMetrics> => {
      const { data } = await api.get('/metrics/dashboard');
      return data;
    },

    getTimeseriesMetrics: async (): Promise<{
      timeseries: Array<{
        timestamp: string;
        total: number;
        sent: number;
        received: number;
        failed: number;
      }>;
      statusDistribution: {
        sent: number;
        delivered: number;
        read: number;
        failed: number;
        queued: number;
      };
    }> => {
      const { data } = await api.get('/metrics/timeseries');
      return data;
    },

    getDashboardSummary: async (): Promise<DashboardSummary> => {
      const { data } = await api.get<DashboardSummary>('/dashboard/summary');
      return data;
    },

    simulate: async (payload: SimulatePayload): Promise<SimulateResponse> => {
      const { data } = await api.post<SimulateResponse>('/simulate', payload);
      return data;
    },

    reconnect: async (): Promise<SuccessMessageResponse> => {
      const { data } = await api.post<SuccessMessageResponse>('/whatsapp/disconnect', { clearSession: false });
      return data;
    },

    getDebugInfo: async (): Promise<any> => {
      const { data } = await api.get('/debug');
      return data;
    },
  },

  // ==================== Admin ====================
  admin: {
    getUsers: async (): Promise<User[]> => {
      const { data } = await api.get<User[]>('/admin/users');
      return data;
    },

    updateUserRole: async (userId: string, role: 'admin' | 'operator'): Promise<SuccessMessageResponse> => {
      const { data } = await api.put<SuccessMessageResponse>(`/admin/users/${userId}/role`, { role });
      return data;
    },

    activateUser: async (userId: string): Promise<SuccessMessageResponse> => {
      const { data } = await api.post<SuccessMessageResponse>(`/admin/users/${userId}/activate`);
      return data;
    },

    deactivateUser: async (userId: string): Promise<SuccessMessageResponse> => {
      const { data } = await api.post<SuccessMessageResponse>(`/admin/users/${userId}/deactivate`);
      return data;
    },
  },
};
