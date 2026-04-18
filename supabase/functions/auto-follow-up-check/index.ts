import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOURS_WITHOUT_RESPONSE = 24;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[auto-follow-up-check] Starting check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - HOURS_WITHOUT_RESPONSE * 60 * 60 * 1000);

    // Buscar todas as conversas ativas onde última mensagem foi do usuário/sistema
    // E não foi respondida após 24h
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(`
        id,
        contact_id,
        tenant_id,
        last_message_at,
        last_message_by,
        contacts:contact_id (
          id,
          name,
          phone
        )
      `)
      .eq("status", "active")
      .not("last_message_by", "eq", "contact")
      .lt("last_message_at", cutoffTime.toISOString())
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("[auto-follow-up-check] Error fetching conversations:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[auto-follow-up-check] Found ${conversations?.length || 0} conversations to check`);

    let created = 0;

    for (const conversation of conversations || []) {
      // Verificar se já existe follow-up pendente para este contato
      const { data: existingFollowUp, error: existingError } = await supabase
        .from("auto_follow_ups")
        .select("id")
        .eq("contact_id", conversation.contact_id)
        .eq("tenant_id", conversation.tenant_id)
        .eq("status", "pending")
        .single();

      if (existingError && existingError.code !== "PGRST116") {
        console.error("[auto-follow-up-check] Error checking existing follow-up:", existingError);
        continue;
      }

      if (existingFollowUp) {
        console.log(`[auto-follow-up-check] Follow-up already exists for contact ${conversation.contact_id}`);
        continue;
      }

      // Criar follow-up
      const { error: insertError } = await supabase
        .from("auto_follow_ups")
        .insert({
          contact_id: conversation.contact_id,
          conversation_id: conversation.id,
          tenant_id: conversation.tenant_id,
          type: "no_response",
          action: "Cobrar resposta",
          status: "pending",
          due_date: now.toISOString(),
          message: "Oi, conseguiu ver nossa última mensagem?"
        });

      if (insertError) {
        console.error("[auto-follow-up-check] Error creating follow-up:", insertError);
        continue;
      }

      created++;
      console.log(`[auto-follow-up-check] Created follow-up for contact ${conversation.contact_id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: conversations?.length || 0,
        created 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[auto-follow-up-check] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
