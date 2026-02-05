/**
 * Noctura Notification Service
 * 
 * Handles push notifications for wallet events.
 * TODO: Implement full notification system
 */

export const NOTIFICATION_SERVICE_VERSION = '0.1.0';

export interface NotificationConfig {
  firebaseProjectId?: string;
  oneSignalAppId?: string;
  enabled: boolean;
}

export interface Notification {
  id: string;
  type: 'transaction' | 'security' | 'system';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
}

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  async send(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<string> {
    // TODO: Implement actual notification sending
    console.log('Notification queued:', notification.title);
    return crypto.randomUUID();
  }

  async getUnread(): Promise<Notification[]> {
    // TODO: Implement notification storage
    return [];
  }
}

export default NotificationService;
