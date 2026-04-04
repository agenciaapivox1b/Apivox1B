export interface PaymentProvider {
  createPayment(data: CreatePaymentData): Promise<CreatePaymentResult>;
  getPaymentStatus(id: string): Promise<PaymentStatusResult>;
  cancelPayment(id: string): Promise<void>;
}

export interface CreatePaymentData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  dueDate: string;
  description: string;
  paymentMethod: 'pix' | 'boleto' | 'credit_card' | 'link';
  cpfCnpj?: string;
  tenantId?: string;
}

export interface CreatePaymentResult {
  success: boolean;
  charge?: {
    id: string;
    externalId: string;
    paymentLink?: string;
    pixQrCode?: string;
    pixCode?: string;
    barcode?: string;
  };
  error?: string;
}

export interface PaymentStatusResult {
  success: boolean;
  status?: 'pending' | 'received' | 'overdue' | 'cancelled' | 'confirmed';
  error?: string;
}
