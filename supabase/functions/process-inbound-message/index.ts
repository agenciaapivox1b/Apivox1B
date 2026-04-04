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
    const { tenantId, message, contactInfo, contactName } = await req.json();
    
    if (!tenantId || !message) {
      return new Response(JSON.stringify({ error: "Missing tenantId or message" }), { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Chamar Classificador Inteligente
    const classifyUrl = `${supabaseUrl}/functions/v1/classify-message`;
    const resp = await fetch(classifyUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message, tenant_id: tenantId }),
    });

    const classification = await resp.json();
    console.log("[DecisionEngine] Classification:", classification);

    // 2. Logar Auditoria
    const { data: logData, error: logErr } = await supabase.from("message_analysis_logs").insert({
      tenant_id: tenantId,
      message_content: message,
      category: classification.category,
      intent: classification.intent,
      entity_name: classification.entity_name,
      confidence: classification.confidence,
      decision_json: classification,
      status: (classification.confidence < 0.7 || classification.should_escalate_to_human) ? 'human_review' : 'processed',
      metadata: { contactInfo, contactName }
    }).select().single();

    if (logErr) console.error("Log error:", logErr);

    // --- REGRAS DE EXECUÇÃO ---
    // Apenas executa se a confiança for mínima (ou se for escalate)
    if (classification.confidence >= 0.7 && !classification.should_escalate_to_human) {
      
      // A. Criar Oportunidade Comercial
      if (classification.should_create_opportunity) {
        await supabase.from("opportunities").insert({
          tenant_id: tenantId,
          name: classification.entity_name || contactName || "Interesse Comercial",
          contact_info: contactInfo,
          description: `Identificado via IA: ${classification.intent} (${classification.category})`,
          status: 'descoberta',
          origin: 'direct',
          type: 'sale',
          classification_id: logData?.id,
          metadata: { classification }
        });
      }

      // B. Criar Follow-up
      if (classification.should_create_followup) {
        const scheduled = new Date();
        scheduled.setHours(scheduled.getHours() + 4); // +4 horas como padrão universal

        await supabase.from("follow_ups").insert({
          tenant_id: tenantId,
          title: `Follow-up: ${classification.intent}`,
          description: `Ação sugerida pela IA para a intenção ${classification.intent}.`,
          scheduled_at: scheduled.toISOString(),
          context: 'commercial',
          type: 'automated'
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      classification, 
      action_taken: (classification.confidence >= 0.7) ? 'automated' : 'human_review_required' 
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
