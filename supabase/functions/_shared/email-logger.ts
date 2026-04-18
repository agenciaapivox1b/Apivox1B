/**
 * Utility for logging email operations
 */

export interface EmailLogEntry {
  tenant_id: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  message_id?: string;
  error?: string;
  charge_id?: string;
  sent_at?: string;
}

export function logEmailAttempt(entry: EmailLogEntry): void {
  console.log(`[email-logger] ${entry.status.toUpperCase()} | Tenant: ${entry.tenant_id} | To: ${entry.recipient} | Subject: ${entry.subject}`);
  if (entry.error) {
    console.error(`[email-logger] Error: ${entry.error}`);
  }
}
