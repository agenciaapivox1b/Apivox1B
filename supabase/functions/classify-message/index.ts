import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { message, context } = await req.json();
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY nao configurada" }), { status: 500, headers: corsHeaders });
    }

    const systemPrompt = `
      Você é o motor de inteligência da APIVOX, um sistema multi-tenant de CRM e Vendas.
      Sua tarefa é analisar a mensagem de um cliente e extrair dados estruturados universais.
      Não importa o nicho (petshop, advocacia, clinica, agência), sua análise deve ser abstrata e funcional.

      Categorias Universais:
      - comercial: interesse em compra, preço, produto, serviço.
      - suporte: problemas, reclamações, ajuda técnica.
      - financeiro: comprovantes, dúvidas de pagamento, boletos.
      - operacional: agendamentos, horários, status de pedido.
      - duvida_simples: perguntas genéricas.

      Retorne APENAS um JSON no seguinte formato:
      {
        "category": "string",
        "intent": "string (snake_case)",
        "entity_type": "product | service | appointment | payment | other",
        "entity_name": "string (nome do item citado)",
        "stage": "descoberta | interesse | decisao | pos_venda",
        "urgency": "baixa | media | alta",
        "confidence": number (0-1),
        "should_create_opportunity": boolean,
        "should_create_followup": boolean,
        "should_create_charge": boolean,
        "should_escalate_to_human": boolean
      }

      Regras de Decisão:
      - should_create_opportunity: true se houver intenção clara de compra ou orçamento.
      - should_create_followup: true se a mensagem exigir uma resposta comercial futura ou lembrete.
      - should_escalate_to_human: true se houver irritação, complexidade técnica alta ou confiança < 0.6.
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo-1106", // Ou gpt-4-turbo
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise esta mensagem: "${message}"\nContexto do Tenant: ${JSON.stringify(context || {})}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      }),
    });

    const aiData = await response.json();
    const result = JSON.parse(aiData.choices[0].message.content);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
