// User types
export type UserRole = 'admin' | 'operator';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Contact types
export interface Contact {
  id: string;
  phone: string;
  name?: string;
  optIn: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
  messages?: Message[];
  flowInstances?: FlowInstance[];
}

// Message types
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'queued' | 'sent' | 'failed' | 'delivered' | 'read';

export interface Message {
  id: string;
  contactId: string;
  direction: MessageDirection;
  status: MessageStatus;
  content: string;
  triggerId?: string;
  flowInstanceId?: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
}

// Template types
export interface Template {
  id: string;
  key: string;
  content: string;
  variables?: string[];
  variants?: string[];
  locale?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Trigger types
export type TriggerType = 'equals' | 'contains' | 'regex' | 'number';

export interface Trigger {
  id: string;
  type: TriggerType;
  pattern: string;
  priority: number;
  cooldownSec: number;
  active: boolean;
  templateId?: string;
  flowId?: string;
  createdAt: string;
  updatedAt: string;
  template?: Template;
  flow?: Flow;
}

// Flow types
export type FlowStatus = 'draft' | 'published' | 'archived';
export type StepType = 'send_template' | 'collect_input' | 'end';

export interface FlowStep {
  id: string;
  flowId: string;
  key: string;
  type: StepType;
  templateId?: string;
  waitInput: boolean;
  transitionsJson?: Record<string, string>;
  uiMetadataJson?: Record<string, any>;
  order: number;
}

export type FlowStepCreateInput = {
  key: string;
  type: StepType;
  templateId?: string;
  waitInput?: boolean;
  order?: number;
  transitions?: Record<string, string>;
  uiMetadata?: Record<string, any>;
};

export type FlowStepUpdateInput = Partial<FlowStepCreateInput>;

export interface Flow {
  id: string;
  name: string;
  status: FlowStatus;
  version: number;
  schemaJson?: Record<string, unknown> | null;
  entryTriggerId?: string;
  createdAt: string;
  updatedAt: string;
  steps?: FlowStep[];
}

export interface FlowInstance {
  id: string;
  contactId: string;
  flowId: string;
  currentStepKey: string;
  stateJson?: Record<string, unknown> | null;
  lastInteractionAt: string;
  paused: boolean;
  lockedBy?: string;
  createdAt: string;
  updatedAt: string;
  flow?: Flow;
}

// System status types
export interface SystemStatus {
  whatsapp: {
    ready: boolean;
    connected: boolean;
  };
  queue: {
    length: number;
    processing: boolean;
  };
  circuitBreaker: {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureRate: number;
  };
  rateLimit: {
    sentLastMinute: number;
    globalLimit: number;
  };
}

export interface QueueStatus {
  length: number;
  processing: boolean;
  oldestMessage: string | null;
}

export interface RateLimitStatus {
  globalLimit: number;
  sentLastMinute: number;
  perContactLimit: number;
  activeContacts: number;
}

export interface QueueStatusResponse {
  queue: QueueStatus;
  rateLimit: RateLimitStatus;
}

export interface CircuitBreakerStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureRate: number;
  totalAttempts: number;
  openedAt: number | null;
  cooldownMultiplier: number;
  isAllowed: boolean;
}

export interface BusinessHours {
  start: string;
  end: string;
}

export interface BusinessHoursUpdateResponse {
  success: boolean;
  businessHours: BusinessHours;
}

export interface SendMessageResponse {
  success: boolean;
  messageId: string;
}

export interface BroadcastResponse {
  success: boolean;
  totalContacts: number;
  messageIds: string[];
}

export interface BulkReplyResponse {
  success: boolean;
  totalSelected: number;
  targetedContacts: number;
  queuedMessages: string[];
  skippedContacts: Array<{
    contactId: string;
    phone: string;
    reason: string;
  }>;
  failedContacts: Array<{
    contactId: string;
    phone: string;
    reason: string;
  }>;
}

export interface SuccessMessageResponse {
  success: boolean;
  message: string;
}

export type ContactFlowResponse = FlowInstance | null;

export interface DashboardMetrics {
  totalContacts: number;
  totalMessages: number;
  todayMessages: number;
  sentMessages: number;
  failedMessages: number;
  automationRate: number;
}

export type HealthCardStatus = 'ok' | 'warning' | 'error';

export interface DashboardSummaryMessage {
  id: string;
  content: string;
  status: MessageStatus;
  direction: MessageDirection;
  createdAt: string;
  contact: {
    id: string;
    name?: string | null;
    phone: string;
  };
}

export interface DashboardSummary {
  lastUpdated: string;
  status: SystemStatus;
  metrics: DashboardMetrics;
  automationPaused: boolean;
  healthCards: Array<{
    id: string;
    title: string;
    status: HealthCardStatus;
    message: string;
  }>;
  quickRecommendations: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  quickStats: {
    queueLength: number;
    automationRate: number;
    failureRate: number;
    todayMessages: number;
  };
  recentMessages: DashboardSummaryMessage[];
}

// WebSocket event types
export type WebSocketEventType =
  | 'qr_code'
  | 'whatsapp_ready'
  | 'whatsapp_disconnected'
  | 'message_received'
  | 'message_sent'
  | 'queue_update'
  | 'circuit_breaker_state_change'
  | 'system_status'
  | 'config_updated'
  | 'websocket_disconnected'
  | 'websocket_reconnected'
  | 'message_status_update';

export type WebSocketEvent =
  | { type: 'qr_code'; data: { qr: string } }
  | { type: 'whatsapp_ready'; data?: undefined }
  | { type: 'whatsapp_disconnected'; data: { reason: string } }
  | { type: 'message_received'; data: { contactId: string; phone: string; message: string } }
  | { type: 'message_sent'; data: { contactId: string; phone: string; message: string } }
  | { type: 'message_status_update'; data: { messageId: string; status: string; timestamp: string } }
  | { type: 'queue_update'; data: { length: number; processing: boolean } }
  | { type: 'circuit_breaker_state_change'; data: { state: string; failureRate: number } }
  | { type: 'system_status'; data: SystemStatus }
  | { type: 'config_updated'; data: { updatedAt: string } }
  | { type: 'websocket_disconnected'; data?: { reason?: string } }
  | { type: 'websocket_reconnected'; data?: { socketId?: string | null } };

export interface SystemConfigMasked {
  jwtSecretMasked: string | null;
  defaultAdminPasswordMasked: string | null;
  defaultAdminEmail: string;
  skipWhatsapp: boolean;
  puppeteerExecutablePath: string | null;
  rateMaxPerMin: number;
  ratePerContactPer5Min: number;
  businessHoursStart: string;
  businessHoursEnd: string;
  timezone: string;
  firstContactEnabled: boolean;
  firstContactMessage: string | null;
  wsPort: number;
  wsPath: string;
  humanizerMinDelayMs: number;
  humanizerMaxDelayMs: number;
  humanizerMinTypingMs: number;
  humanizerMaxTypingMs: number;
  cbWindowMode: string;
  cbMinAttempts: number;
  cbFailRateOpen: number;
  cbProbeIntervalSec: number;
  cbProbeSuccessClose: number;
  cbProbeSamples: number;
  cbCooldownInitialSec: number;
  cbCooldownMaxSec: number;
  windowsTempDir: string | null;
  windowsLongPathSupport: boolean;
  updatedAt: string;
}

export type ConfigSecretField = 'jwtSecret' | 'defaultAdminPassword';

export type ConfigMetaField = {
  type: string;
  min?: number;
  max?: number;
  minLength?: number;
  helper?: string;
  optional?: boolean;
  unit?: string;
};

export type ConfigMetaSection = {
  fields: Record<string, ConfigMetaField>;
};

export type ConfigMeta = Record<string, ConfigMetaSection>;

export type ConfigUpdatePayload = {
  jwtSecret?: string | null;
  defaultAdminEmail?: string;
  defaultAdminPassword?: string | null;
  regenerateJwtSecret?: boolean;
  regenerateAdminPassword?: boolean;
  skipWhatsapp?: boolean;
  puppeteerExecutablePath?: string | null;
  rateMaxPerMin?: number;
  ratePerContactPer5Min?: number;
  businessHours?: {
    start: string;
    end: string;
    timezone?: string;
  };
  firstContactEnabled?: boolean;
  firstContactMessage?: string | null;
  timezone?: string;
  wsPort?: number;
  wsPath?: string;
  humanizerMinDelayMs?: number;
  humanizerMaxDelayMs?: number;
  humanizerMinTypingMs?: number;
  humanizerMaxTypingMs?: number;
  cbWindowMode?: string;
  cbMinAttempts?: number;
  cbFailRateOpen?: number;
  cbProbeIntervalSec?: number;
  cbProbeSuccessClose?: number;
  cbProbeSamples?: number;
  cbCooldownInitialSec?: number;
  cbCooldownMaxSec?: number;
  windowsTempDir?: string | null;
  windowsLongPathSupport?: boolean;
};

export interface ConfigAuditEntry {
  id: string;
  actorUserId: string | null;
  changes: Record<string, { old: unknown; new: unknown }>;
  createdAt: string;
}
