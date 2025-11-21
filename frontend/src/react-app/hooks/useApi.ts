import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import {
  apiService,
  ContactsQueryOptions,
  MessagesQueryOptions,
  PaginatedContactsResponse,
  PaginatedMessagesResponse,
  BulkReplyPayload,
  SimulatePayload,
  SimulateResponse,
} from "../services/apiService";
import type { Template, Trigger, Flow } from "../types";

const CONTACT_PAGE_SIZE = 25;
const MESSAGE_PAGE_SIZE = 50;

// ==================== Templates ====================
export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: apiService.templates.getAll,
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: () => apiService.templates.getById(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiService.templates.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Template> }) =>
      apiService.templates.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiService.templates.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

// ==================== Triggers ====================
export function useTriggers() {
  return useQuery({
    queryKey: ["triggers"],
    queryFn: apiService.triggers.getAll,
  });
}

export function useCreateTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiService.triggers.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triggers"] });
    },
  });
}

export function useUpdateTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Trigger> }) =>
      apiService.triggers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triggers"] });
    },
  });
}

export function useDeleteTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiService.triggers.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triggers"] });
    },
  });
}

// ==================== Flows ====================
export function useFlows() {
  return useQuery({
    queryKey: ["flows"],
    queryFn: apiService.flows.getAll,
  });
}

export function useFlow(id: string) {
  return useQuery({
    queryKey: ["flows", id],
    queryFn: () => apiService.flows.getById(id),
    enabled: !!id,
  });
}

export function useCreateFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiService.flows.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

export function useUpdateFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Flow> }) =>
      apiService.flows.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

export function useDeleteFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiService.flows.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

export function usePublishFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiService.flows.publish,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

export function useCreateFlowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flowId, data }: { flowId: string; data: any }) =>
      apiService.flows.addStep(flowId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["flows", variables.flowId] });
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

export function useUpdateFlowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      flowId,
      stepId,
      data,
    }: {
      flowId: string;
      stepId: string;
      data: any;
    }) => apiService.flows.updateStep(flowId, stepId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["flows", variables.flowId] });
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

export function useDeleteFlowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flowId, stepId }: { flowId: string; stepId: string }) =>
      apiService.flows.deleteStep(flowId, stepId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["flows", variables.flowId] });
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

// ==================== Contacts ====================
export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: apiService.contacts.getAll,
  });
}

export function usePaginatedContacts(options?: ContactsQueryOptions) {
  const searchKey = options?.search ?? "";
  const statusKey = options?.status ?? "all";
  const queryKey = ["contacts", "paginated", searchKey, statusKey] as const;

  return useInfiniteQuery<
    PaginatedContactsResponse,
    Error,
    InfiniteData<PaginatedContactsResponse, number>,
    typeof queryKey,
    number
  >({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      apiService.contacts.paginated({
        take: CONTACT_PAGE_SIZE,
        skip: pageParam,
        search: options?.search,
        status: options?.status,
      }),
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasMore) return undefined;
      const consumed = pages.reduce((sum, page) => sum + page.items.length, 0);
      return consumed;
    },
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: () => apiService.contacts.getById(id),
    enabled: !!id,
  });
}

// ==================== Messages ====================
export function useMessages(options?: { take?: number; search?: string }) {
  const take = options?.take ?? 50;
  return useQuery({
    queryKey: ["messages", take, options?.search ?? ""],
    queryFn: () =>
      apiService.messages.getAll({
        take,
        search: options?.search,
      }),
    refetchInterval: 10000, // Refetch every 10 seconds (lighter load)
  });
}

export function usePaginatedMessages(options?: MessagesQueryOptions) {
  const searchKey = options?.search ?? "";
  const statusKey = options?.status ?? "all";
  const directionKey = options?.direction ?? "all";
  const queryKey = [
    "messages",
    "paginated",
    searchKey,
    statusKey,
    directionKey,
  ] as const;

  return useInfiniteQuery<
    PaginatedMessagesResponse,
    Error,
    InfiniteData<PaginatedMessagesResponse, number>,
    typeof queryKey,
    number
  >({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      apiService.messages.paginated({
        take: MESSAGE_PAGE_SIZE,
        skip: pageParam,
        search: options?.search,
        status: options?.status,
        direction: options?.direction,
      }),
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasMore) return undefined;
      const consumed = pages.reduce((sum, page) => sum + page.items.length, 0);
      return consumed;
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      phone,
      text,
      priority,
    }: {
      phone: string;
      text: string;
      priority?: number;
    }) => apiService.messages.send(phone, text, priority),
    onSuccess: () => {
      // Mensagens afetam diversas visões (lista, dashboard, métricas)
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["system"] });
    },
  });
}

export function useBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      text,
      contactIds,
      optedInOnly,
    }: {
      text: string;
      contactIds?: string[];
      optedInOnly?: boolean;
    }) => apiService.messages.broadcast(text, contactIds, optedInOnly),
    onSuccess: () => {
      // Broadcast altera métricas globais e listagens de mensagens
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["system"] });
    },
  });
}

export function useBulkReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkReplyPayload) =>
      apiService.messages.bulkReply(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["system"] });
    },
  });
}

export function useSimulateTrigger() {
  return useMutation({
    mutationFn: (payload: SimulatePayload) =>
      apiService.system.simulate(payload as SimulatePayload) as Promise<SimulateResponse>,
  });
}

// ==================== System ====================
export function useSystemStatus() {
  return useQuery({
    queryKey: ["system", "status"],
    queryFn: apiService.system.getStatus,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

export function useQueueStatus() {
  return useQuery({
    queryKey: ["system", "queue"],
    queryFn: apiService.system.getQueueStatus,
    refetchInterval: 5000,
  });
}

export function useCircuitBreakerStatus() {
  return useQuery({
    queryKey: ["system", "circuit-breaker"],
    queryFn: apiService.system.getCircuitBreakerStatus,
    refetchInterval: 5000,
  });
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["system", "dashboard-metrics"],
    queryFn: apiService.system.getDashboardMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useTimeseriesMetrics() {
  return useQuery({
    queryKey: ["system", "timeseries-metrics"],
    queryFn: apiService.system.getTimeseriesMetrics,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider stale after 30 seconds
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["system", "dashboard-summary"],
    queryFn: apiService.system.getDashboardSummary,
    refetchInterval: 15000,
  });
}
