import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Resend API configuration
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

/**
 * Send email via Resend API
 */
async function sendEmailViaResend(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string; details?: any }> {
  try {
    if (!RESEND_API_KEY) {
      console.error("[send-email] RESEND_API_KEY not found in environment variables");
      return { 
        success: false, 
        error: "RESEND_API_KEY not configured",
        details: {
          step: "configuration",
          message: "A chave da API Resend não está configurada. Execute: supabase secrets set RESEND_API_KEY=sua_chave_aqui"
        }
      };
    }

    console.log(`[send-email] Sending email to: ${payload.to} from: ${payload.from || RESEND_FROM_EMAIL}`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from || RESEND_FROM_EMAIL,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("[send-email] Email sent successfully:", data.id);
      return { success: true, messageId: data.id };
    } else {
      console.error("[send-email] Resend API error:", JSON.stringify(data));
      
      // Provide more specific error messages
      let errorMessage = data.message || "Failed to send email";
      let details: any = { step: "resend_api", response: data };

      if (response.status === 403) {
        errorMessage = "API Key inválida ou sem permissão. Verifique sua RESEND_API_KEY.";
        details.help = "Acesse https://resend.com/api-keys para verificar sua chave.";
      } else if (response.status === 422 && data.message?.includes("from")) {
        errorMessage = `E-mail remetente não autorizado: ${payload.from || RESEND_FROM_EMAIL}`;
        details.help = "Use 'onboarding@resend.dev' para testes ou verifique seu domínio no Resend.";
      } else if (response.status === 422 && data.message?.includes("to")) {
        errorMessage = `E-mail destinatário inválido: ${payload.to}`;
        details.help = "Verifique se o e-mail do cliente está correto.";
      } else if (response.status === 429) {
        errorMessage = "Limite de envios excedido. Aguarde um momento.";
        details.help = "O plano gratuito do Resend permite 100 emails/dia.";
      }

      return { success: false, error: errorMessage, details };
    }
  } catch (error: any) {
    console.error("[send-email] Network/Error:", error);
    return { 
      success: false, 
      error: "Erro de conexão: " + error.message,
      details: {
        step: "network",
        message: "Não foi possível conectar à API Resend. Verifique sua conexão."
      }
    };
  }
}

/**
 * Generate professional billing email HTML template
 */
function generateBillingEmailTemplate(params: {
  clientName: string;
  description: string;
  value: string;
  dueDate: string;
  chargeLink?: string;
  chargeCode?: string;
  companyName?: string;
}): { html: string; text: string } {
  const { clientName, description, value, dueDate, chargeLink, chargeCode, companyName } = params;

  const formattedValue = value ? `R$ ${value}` : '';
  const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString('pt-BR') : '';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Cobrança - APIVOX</title>
  <style>
    /* Reset e base */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    
    /* APIVOX Brand Colors */
    :root {
      --apivox-blue: #1456D9;
      --apivox-blue-dark: #0F3EA8;
      --apivox-green: #8BE500;
      --apivox-green-dark: #65B800;
      --text-dark: #1F2937;
      --bg-light: #F5F7FB;
      --border-soft: #E5E7EB;
    }
    
    /* Estilos principais */
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      margin: 0;
      padding: 0;
      background-color: #F5F7FB;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    /* Header APIVOX */
    .email-header {
      background: #1456D9;
      padding: 32px 30px;
      text-align: center;
      border-bottom: 4px solid #8BE500;
    }
    
    .brand-name {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    
    .brand-tagline {
      color: #8BE500;
      font-size: 13px;
      font-weight: 500;
      margin: 6px 0 0 0;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    
    .email-body {
      padding: 40px 30px;
      background-color: #ffffff;
    }
    
    .greeting {
      font-size: 20px;
      color: #1456D9;
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .message {
      font-size: 15px;
      color: #4B5563;
      margin-bottom: 28px;
      line-height: 1.7;
    }
    
    /* Info Card */
    .info-card {
      background: #F5F7FB;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 28px;
      margin: 24px 0;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    
    .info-row:last-child {
      border-bottom: none;
      padding-top: 18px;
      margin-top: 8px;
    }
    
    .info-label {
      font-size: 14px;
      color: #6B7280;
      font-weight: 500;
    }
    
    .info-value {
      font-size: 15px;
      color: #1F2937;
      font-weight: 600;
      text-align: right;
    }
    
    .amount-highlight {
      font-size: 26px;
      color: #1456D9;
      font-weight: 700;
    }
    
    /* CTA Button */
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    
    .cta-button {
      display: inline-block;
      background: #1456D9;
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 600;
      padding: 16px 48px;
      text-decoration: none;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(20, 86, 217, 0.25);
      transition: all 0.2s;
    }
    
    .cta-button:hover {
      background: #0F3EA8;
      box-shadow: 0 6px 16px rgba(20, 86, 217, 0.35);
    }
    
    /* Security Badge */
    .security-badge {
      background: #F5F7FB;
      border-left: 4px solid #8BE500;
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .security-badge p {
      font-size: 13px;
      color: #374151;
      margin: 0;
      line-height: 1.5;
    }
    
    .security-badge strong {
      color: #1456D9;
    }
    
    .divider {
      height: 1px;
      background: #E5E7EB;
      margin: 28px 0;
    }
    
    .signature {
      font-size: 15px;
      color: #374151;
    }
    
    .signature strong {
      color: #1456D9;
    }
    
    /* Footer */
    .email-footer {
      background-color: #F5F7FB;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #E5E7EB;
    }
    
    .email-footer p {
      font-size: 12px;
      color: #9CA3AF;
      margin: 0;
      line-height: 1.5;
    }
    
    .footer-brand {
      color: #1456D9;
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 4px;
    }
    
    /* Mobile responsive */
    @media screen and (max-width: 600px) {
      .email-header {
        padding: 28px 20px !important;
      }
      
      .brand-name {
        font-size: 24px !important;
      }
      
      .email-body, .email-footer {
        padding: 28px 20px !important;
      }
      
      .greeting {
        font-size: 18px !important;
      }
      
      .amount-highlight {
        font-size: 22px !important;
      }
      
      .cta-button {
        display: block !important;
        width: 100% !important;
        padding: 14px 20px !important;
        box-sizing: border-box !important;
      }
      
      .info-row {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 4px !important;
      }
      
      .info-value {
        text-align: left !important;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <div class="email-wrapper">
          
          <!-- Header APIVOX -->
          <div class="email-header">
            <h1 class="brand-name">APIVOX</h1>
            <p class="brand-tagline">Marketing & Inovação</p>
          </div>
          
          <!-- Body -->
          <div class="email-body">
            <p class="greeting">Olá, ${clientName}!</p>
            
            <p class="message">
              ${companyName} gerou uma cobrança para você. Confira os detalhes abaixo e realize o pagamento de forma rápida e segura.
            </p>
            
            <!-- Info Card -->
            <div class="info-card">
              <div class="info-row">
                <span class="info-label">Descrição</span>
                <span class="info-value">${description || 'Cobrança'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Vencimento</span>
                <span class="info-value">${formattedDate}</span>
              </div>
              ${chargeCode ? `
              <div class="info-row">
                <span class="info-label">Código</span>
                <span class="info-value">${chargeCode}</span>
              </div>
              ` : ''}
              <div class="info-row" style="border-top: 2px solid #8BE500; padding-top: 18px; margin-top: 10px;">
                <span class="info-label">Valor Total</span>
                <span class="info-value amount-highlight">${formattedValue}</span>
              </div>
            </div>
            
            <!-- CTA Button -->
            ${chargeLink ? `
            <div class="cta-container">
              <a href="${chargeLink}" class="cta-button" target="_blank" rel="noopener noreferrer">
                Pagar Agora
              </a>
            </div>
            ` : ''}
            
            <!-- Security Badge -->
            <div class="security-badge">
              <p>
                <strong>🔒 Segurança:</strong> Este link é pessoal e intransferível. 
                A transação é processada com criptografia de ponta a ponta.
              </p>
            </div>
            
            <div class="divider"></div>
            
            <p class="signature">
              Atenciosamente,<br>
              <strong>${companyName || 'Equipe APIVOX'}</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div class="email-footer">
            <p class="footer-brand">APIVOX - Marketing & Inovação</p>
            <p>
              Este e-mail foi enviado automaticamente pelo sistema de cobrança.<br>
              Por favor, não responda a este e-mail.
            </p>
          </div>
          
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Olá ${clientName},

Sua cobrança foi gerada com sucesso. Confira os detalhes abaixo e realize o pagamento de forma rápida e segura.
Segue sua cobrança referente a ${description}.

${formattedValue ? `Valor: ${formattedValue}\n` : ''}${formattedDate ? `Vencimento: ${formattedDate}\n` : ''}
${chargeLink ? `Link para pagamento: ${chargeLink}\n` : ''}${chargeCode ? `Código: ${chargeCode}\n` : ''}

Qualquer dúvida, estamos à disposição.

Atenciosamente,
${companyName || 'Equipe de Cobrança'}

Este e-mail foi enviado automaticamente. Por favor, não responda.
  `;

  return { html, text };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    console.log("[send-email] ===== INICIANDO PROCESSAMENTO =====");
    
    // NOTA: Chamada interna de create-payment-gateway
    // Não requer Authorization header (verify_jwt = false no config.toml)
    
    console.log("[send-email] Lendo body da requisição...");
    const body = await req.json();
    console.log("[send-email] Body recebido:", JSON.stringify(body, null, 2));
    
    const { tenantId, chargeData } = body;

    if (!tenantId) {
      console.error("[send-email] ERRO: tenantId ausente no body");
      return new Response(
        JSON.stringify({ error: "Missing tenantId" }),
        { status: 400, headers: corsHeaders }
      );
    }
    console.log("[send-email] tenantId recebido:", tenantId);

    if (!chargeData) {
      console.error("[send-email] ERRO: chargeData ausente no body");
      return new Response(
        JSON.stringify({ error: "Missing chargeData" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log("[send-email] chargeData recebido:", {
      to: chargeData.to,
      clientName: chargeData.clientName,
      description: chargeData.description,
      value: chargeData.value,
      dueDate: chargeData.dueDate,
      chargeLink: chargeData.chargeLink ? "(presente)" : "(ausente)",
      chargeCode: chargeData.chargeCode,
      chargeId: chargeData.chargeId
    });

    if (!chargeData.to || !chargeData.clientName) {
      console.error("[send-email] ERRO: Campos obrigatórios ausentes - to:", chargeData.to, "clientName:", chargeData.clientName);
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, clientName" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // NOTA: Esta função é chamada internamente por create-payment-gateway
    // verify_jwt = false no config.toml permite chamadas sem Authorization header
    // A autenticação é implícita via service role key do Supabase Client

    // Get tenant settings for company name (optional)
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("name, settings")
      .eq("id", tenantId)
      .single();

    const companyName = tenantData?.name || "Sua Empresa";

    // Generate email content
    const { html, text } = generateBillingEmailTemplate({
      clientName: chargeData.clientName,
      description: chargeData.description || "Serviço/Produto",
      value: chargeData.value,
      dueDate: chargeData.dueDate,
      chargeLink: chargeData.chargeLink,
      chargeCode: chargeData.chargeCode,
      companyName,
    });

    // Send email via Resend
    const subject = `Cobrança - ${chargeData.description || "Pagamento"}`;
    const sendResult = await sendEmailViaResend({
      to: chargeData.to,
      subject,
      html,
      text,
    });

    if (!sendResult.success) {
      console.error("[send-email] Send failed:", sendResult.error, sendResult.details);
      return new Response(
        JSON.stringify({ 
          error: sendResult.error,
          details: sendResult.details 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Log email send in database (optional - for history)
    try {
      await supabase.from("email_logs").insert({
        tenant_id: tenantId,
        recipient: chargeData.to,
        subject,
        message_id: sendResult.messageId,
        status: "sent",
        sent_at: new Date().toISOString(),
        charge_id: chargeData.chargeId,
      });
    } catch (logError) {
      console.error("[send-email] Error logging email:", logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: sendResult.messageId,
        sent_at: new Date().toISOString(),
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err: any) {
    console.error("[send-email] Internal error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error: " + err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
