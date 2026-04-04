/**
 * Serviço auxiliar para decidir qual fluxo de criação de cobrança usar
 * 
 * Estratégia:
 * 1. Se tenant tem configuração salva → usar createChargeV2 (novo)
 * 2. Se tenant não tem configuração → usar paymentGatewayService (antigo/padrão)
 * 
 * Isso garante compatibilidade com sistema antigo enquanto integra gradualmente
 */

import { tenantPaymentSettingsService } from './payments/tenantPaymentSettingsService';
import { createChargeV2 } from './payments/createChargeV2';
import { paymentGatewayService, type PaymentGatewayRequest, type PaymentGatewayResponse } from './paymentGateway';

export interface CreateChargeFlexibleOptions {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  dueDate: string; // ISO string
  description: string;
  paymentMethod: 'pix' | 'boleto' | 'credit_card' | 'transfer' | 'cash';
  cpfCnpj?: string;
  shouldSendEmail?: boolean;
  createdBy?: string;
}

export interface CreateChargeFlexibleResult {
  success: boolean;
  charge?: any;
  paymentLink?: string;
  pixQrCode?: string;
  pixCode?: string;
  barcode?: string;
  error?: string;
  message?: string;
  emailStatus?: string;
  emailError?: string;
}

class ChargeCreationService {
  /**
   * Cria cobrança usando o fluxo apropriado para o tenant
   * 
   * Lógica:
   * 1. Verifica se tenant tem settings configuradas
   * 2. Se tem → usa createChargeV2 (novo fluxo multi-provider)
   * 3. Se não → usa paymentGatewayService (antigo fluxo Asaas)
   */
  async createChargeWithFlexibleFlow(
    options: CreateChargeFlexibleOptions
  ): Promise<CreateChargeFlexibleResult> {
    try {
      console.log('[ChargeCreationService] Iniciando criação de cobrança para tenant:', options.tenantId);

        // ALL CHARGES agora usam o novo fluxo via Edge Function orquestradora (create-payment-gateway)
        console.log('[ChargeCreationService] Redirecionando para fluxo centralizado backend-first para tenant:', options.tenantId);

        const request: PaymentGatewayRequest = {
          tenant_id: options.tenantId,
          customer_name: options.customerName,
          customer_email: options.customerEmail,
          customer_phone: options.customerPhone,
          amount: options.amount,
          due_date: options.dueDate,
          description: options.description,
          payment_method: options.paymentMethod,
          cpfCnpj: options.cpfCnpj,
          shouldSendEmail: options.shouldSendEmail,
          created_by: options.createdBy,
        };

        const result: PaymentGatewayResponse = await paymentGatewayService.createAsaasCharge(request);

        return {
          success: result.success,
          charge: result.charge,
          error: result.error,
          message: result.message,
          emailStatus: result.emailStatus,
        };
    } catch (error: any) {
      console.error('[ChargeCreationService] Erro ao criar cobrança:', error);
      return {
        success: false,
        error: error?.message || 'Erro ao criar cobrança',
      };
    }
  }
}

export const chargeCreationService = new ChargeCreationService();
