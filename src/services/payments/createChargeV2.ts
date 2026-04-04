import { supabase } from '@/lib/supabaseClient';
import { getPaymentProvider } from './getPaymentProvider';
import { tenantPaymentSettingsService } from './tenantPaymentSettingsService';
import { chargeService } from '../chargeService';
import type { TenantPaymentConfig } from './getPaymentProvider';
import type { CreatePaymentData } from './paymentService';

export interface CreateChargeV2Options {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  dueDate: string;
  description: string;
  paymentMethod: 'pix' | 'boleto' | 'credit_card' | 'link';
  cpfCnpj?: string;
  userId?: string;
}

export interface CreateChargeV2Result {
  success: boolean;
  chargeId?: string;
  paymentLink?: string;
  error?: string;
}

export async function createChargeV2(options: CreateChargeV2Options): Promise<CreateChargeV2Result> {
  try {
    const settings = await tenantPaymentSettingsService.getByTenantId(options.tenantId);

    const config: TenantPaymentConfig = settings
      ? {
          chargeMode: settings.charge_mode,
          gatewayName: settings.gateway_name as 'asaas' | undefined,
          manualPaymentLinkDefault: settings.manual_payment_link_default || undefined,
        }
      : { chargeMode: 'manual' };

    const provider = getPaymentProvider(config);

    const paymentData: CreatePaymentData = {
      customerName: options.customerName,
      customerEmail: options.customerEmail,
      customerPhone: options.customerPhone,
      amount: options.amount,
      dueDate: options.dueDate,
      description: options.description,
      paymentMethod: options.paymentMethod,
      cpfCnpj: options.cpfCnpj,
      tenantId: options.tenantId,
    };

    const paymentResult = await provider.createPayment(paymentData);

    if (!paymentResult.success) {
      return { success: false, error: paymentResult.error };
    }

    const chargeData = {
      clientName: options.customerName,
      clientEmail: options.customerEmail,
      clientPhone: options.customerPhone,
      description: options.description,
      value: options.amount,
      dueDate: options.dueDate,
      status: config.chargeMode === 'gateway' ? 'scheduled' : 'draft',
      generationMode: config.chargeMode === 'gateway' ? 'predefined' as const : 'client_choice' as const,
      paymentMethod: options.paymentMethod,
      sendChannel: 'whatsapp' as const,
      paymentDetails: paymentResult.charge
        ? {
            method: options.paymentMethod,
            externalId: paymentResult.charge.externalId,
            paymentLink: paymentResult.charge.paymentLink,
            pixQrCode: paymentResult.charge.pixQrCode,
            pixCode: paymentResult.charge.pixCode,
            boletoBarcode: paymentResult.charge.barcode,
          }
        : undefined,
      origin: 'lead' as const,
      responsible: options.userId,
    };

    const newCharge = chargeService.createCharge(chargeData, options.userId);

    return {
      success: true,
      chargeId: newCharge.id,
      paymentLink: paymentResult.charge?.paymentLink,
    };
  } catch (error: any) {
    console.error('[createChargeV2] Erro:', error);
    return { success: false, error: error?.message || 'Erro ao criar cobrança' };
  }
}
