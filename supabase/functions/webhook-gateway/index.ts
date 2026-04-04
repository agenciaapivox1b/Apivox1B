import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "asaas";
    let payloadStr = await req.text();
    let body;
    
    try {
      body = JSON.parse(payloadStr);
    } catch(e) {
      body = Object.fromEntries(new URLSearchParams(payloadStr));
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    let externalId = null;
    let newStatus = null;
    
    console.log(`[Webhook Webhook] Revcevied ping from ${provider}`);

    if (provider === 'asaas') {
      // Asaas event: PAYMENT_RECEIVED, PAYMENT_OVERDUE, etc.
      if (!body.payment || !body.payment.id) return new Response("Ok", { status: 200 }); // Ignore
      externalId = body.payment.id;
      const eventType = body.event;
      if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(eventType)) newStatus = 'paid';
      if (['PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED'].includes(eventType)) newStatus = 'canceled';
      // If PAYMENT_CREATED, keep pending
    } else if (provider === 'mercadopago') {
      externalId = body.data?.id || body.id;
      // MP actually sends limited payload, we might need to GET their API to know the status.
      // But commonly, `topic="payment"` and `type="payment"`
      // We will blindly map `action="payment.created"` to pending.
      // Easiest is to consider MP 'approved' as paid.
      // But MP payload might not have status. For robustness we should re-query MP.
      // For now, if body.action == "payment.updated":
      // We'll update if someone manually clicks update, but theoretically we should check status.
      // MP status: 'approved' | 'rejected' | 'cancelled'
      if (body.status === 'approved') newStatus = 'paid';
      if (['rejected', 'cancelled'].includes(body.status)) newStatus = 'canceled';
    } else if (provider === 'stripe') {
      externalId = body.data?.object?.id;
      const eventType = body.type;
      if (eventType === 'checkout.session.completed') newStatus = 'paid';
      if (eventType === 'checkout.session.expired') newStatus = 'canceled';
    }

    if (!externalId) {
      return new Response("Missing external_id", { status: 400 });
    }

    // 1. Log event
    await supabase.from("charge_events").insert({
      gateway: provider,
      gateway_payment_id: externalId,
      payload: body,
      processed: newStatus ? true : false
    });

    // 2. Update Charge if a definitive status was found
    if (newStatus) {
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
         // 1. Buscar configurações do tenant
         const { data: settings } = await supabase
           .from("tenant_charge_settings")
           .select("automation_rules")
           .eq("tenant_id", chargeData.tenant_id)
           .single();

         const rules = settings?.automation_rules as any;
         if (rules?.enable_post_sale_upsell) {
           console.log(`[Post-Sale] Triggered for tenant ${chargeData.tenant_id}`);
           
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
    }

    return new Response("Webhook Computed", { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response("Error", { status: 500 });
  }
});
