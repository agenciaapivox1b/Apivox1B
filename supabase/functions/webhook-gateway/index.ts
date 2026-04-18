import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Normalização de status para padrão interno
function normalizeStatus(provider: string, status: string): string | null {
  const normalized = status?.toLowerCase();
  
  switch (provider) {
    case 'asaas':
      if (['paid', 'received', 'confirmed'].includes(normalized)) return 'paid';
      if (['pending', 'created'].includes(normalized)) return 'pending';
      if (['overdue'].includes(normalized)) return 'overdue';
      if (['canceled', 'deleted', 'refunded'].includes(normalized)) return 'canceled';
      break;
      
    case 'mercadopago':
      if (['approved'].includes(normalized)) return 'paid';
      if (['pending', 'in_process', 'pending_payment'].includes(normalized)) return 'pending';
      if (['rejected', 'cancelled', 'refunded'].includes(normalized)) return 'canceled';
      break;
      
    case 'stripe':
      if (['paid', 'succeeded'].includes(normalized)) return 'paid';
      if (['pending', 'processing'].includes(normalized)) return 'pending';
      if (['expired', 'canceled', 'failed'].includes(normalized)) return 'canceled';
      break;
  }
  
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const url = new URL(req.url);
    let provider = url.searchParams.get("provider") || "asaas";
    provider = provider.toLowerCase();
    
    let payloadStr = await req.text();
    let body;
    
    try {
      body = JSON.parse(payloadStr);
    } catch(e) {
      body = Object.fromEntries(new URLSearchParams(payloadStr));
    }

    console.log(`[Webhook] Received event from ${provider}:`, JSON.stringify(body).substring(0, 500));

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    let externalId = null;
    let newStatus = null;
    let eventType = null;
    
    // Extrair informações específicas por provider
    if (provider === 'asaas') {
      if (!body.payment?.id) {
        console.log("[Webhook] Asaas: ignoring event without payment.id");
        return new Response("Ok", { status: 200 });
      }
      externalId = body.payment.id;
      eventType = body.event;
      const gatewayStatus = body.payment?.status?.toLowerCase();
      newStatus = normalizeStatus(provider, gatewayStatus);
      
    } else if (provider === 'mercadopago') {
      // Webhook do Mercado Pago
      externalId = body.data?.id || body.id;
      eventType = body.type || body.action;
      
      // Para MP, muitas vezes precisamos consultar a API para obter o status real
      if (externalId && (body.topic === "payment" || body.action === "payment.updated")) {
        try {
          const settings = await supabase
            .from("tenant_charge_settings")
            .select("encrypted_api_key")
            .eq("gateway_name", "mercadopago")
            .limit(1)
            .single();
            
          if (settings?.encrypted_api_key) {
            // Buscar status real na API do MP (implementação futura)
            console.log("[Webhook] Mercado Pago: should fetch real status for", externalId);
          }
        } catch (e) {
          console.warn("[Webhook] Could not fetch MP settings for status check");
        }
      }
      
      const gatewayStatus = body.status?.toLowerCase();
      newStatus = normalizeStatus(provider, gatewayStatus);
      
    } else if (provider === 'stripe') {
      // Webhook do Stripe
      externalId = body.data?.object?.id;
      eventType = body.type;
      
      if (eventType === 'checkout.session.completed') {
        newStatus = 'paid';
      } else if (eventType === 'checkout.session.expired') {
        newStatus = 'canceled';
      } else if (eventType === 'payment_intent.succeeded') {
        newStatus = 'paid';
      } else if (eventType === 'payment_intent.payment_failed') {
        newStatus = 'canceled';
      }
    }

    if (!externalId) {
      console.log("[Webhook] No external_id found, ignoring");
      return new Response("Missing external_id", { status: 400 });
    }

    // 1. Log event sempre (para auditoria)
    await supabase.from("charge_events").insert({
      gateway: provider,
      gateway_payment_id: externalId,
      event_type: eventType,
      payload: body,
      processed: !!newStatus,
      created_at: new Date().toISOString()
    });

    // 2. Update Charge apenas se temos um status definitivo
    if (newStatus) {
       console.log(`[Webhook] Updating charge ${externalId} to status: ${newStatus}`);
       
       const { data: chargeData, error: updateError } = await supabase
         .from("charges")
         .update({ 
            status: newStatus,
            paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
         })
         .eq("gateway_payment_id", externalId)
         .select("id, tenant_id, customer_name, customer_email, customer_phone, amount, description")
         .single();
         
       if (updateError) {
         console.error("Error updating charge status: ", updateError);
       } else if (newStatus === 'paid' && chargeData) {
         // --- AUTOMAÇÃO DE PÓS-VENDA ---
         console.log(`[Post-Sale] Triggered for charge ${chargeData.id}`);
         
         // 1. Buscar configurações do tenant
         const { data: settings } = await supabase
           .from("tenant_charge_settings")
           .select("automation_rules")
           .eq("tenant_id", chargeData.tenant_id)
           .single();

         const rules = settings?.automation_rules as any;
         if (rules?.enable_post_sale_upsell) {
           console.log(`[Post-Sale] Creating upsell opportunity for tenant ${chargeData.tenant_id}`);
           
           // A. Criar Oportunidade de Pós-Venda
           const { data: opData } = await supabase.from("opportunities").insert({
             tenant_id: chargeData.tenant_id,
             name: `Pós-venda: ${chargeData.customer_name}`,
             contact_info: chargeData.customer_phone || chargeData.customer_email,
             description: `Upsell automático após pagamento de R$ ${chargeData.amount} (${chargeData.description})`,
             status: 'descoberta',
             origin: 'payment',
             type: 'post_sale',
             linked_charge_id: chargeData.id,
             amount: chargeData.amount * 1.1, // Sugestão de 10% a mais
             probability: 30
           }).select().single();

           // B. Criar Follow-up Agendado
           if (opData) {
             const delay = rules.upsell_delay_days || 1;
             const scheduledDate = new Date();
             scheduledDate.setDate(scheduledDate.getDate() + delay);

             await supabase.from("follow_ups").insert({
               tenant_id: chargeData.tenant_id,
               opportunity_id: opData.id,
               title: "Agradecimento e Oferta Pós-Venda",
               description: "Entrar em contato para agradecer o pagamento e oferecer produto/serviço complementar.",
               scheduled_at: scheduledDate.toISOString(),
               context: 'post_sale',
               type: 'automated'
             });
           }
         }
       }
    } else {
      console.log(`[Webhook] No status change needed for ${externalId} from ${provider}`);
    }

    return new Response("Webhook processed", { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response("Error processing webhook: " + err.message, { status: 500 });
  }
});
