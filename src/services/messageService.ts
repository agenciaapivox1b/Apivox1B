/**
 * Serviço de Templates e Mensageria
 * 
 * Renderiza templates com variáveis dinâmicas e simula o disparo de mensagens 
 * via WhatsApp ou E-mail.
 */

export interface TemplateVariables {
  customer_name: string;
  amount: number;
  due_date: string;
  payment_link?: string;
  pix_code?: string;
  digitable_line?: string;
  company_name?: string;
  payment_link_section?: string;
  pix_code_section?: string;
  digitable_line_section?: string;
}

class MessageService {
  /**
   * Renderiza um texto formatado substituindo chaves {variavel} pelos valores correspondentes
   * IMPORTANTE: Separação de URLs (clicáveis) vs Códigos (texto para copiar)
   */
  renderTemplate(content: string, variables: TemplateVariables): string {
    let result = content;
    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatDate = (dateStr: string) => {
      try {
        return new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr));
      } catch (e) {
        return dateStr;
      }
    };

    const vars: Record<string, string> = {
      '{customer_name}': variables.customer_name || 'Cliente',
      '{amount}': variables.amount !== undefined ? formatCurrency(variables.amount) : 'R$ 0,00',
      '{due_date}': variables.due_date ? formatDate(variables.due_date) : '',
      '{payment_link}': variables.payment_link || '',
      '{pix_code}': variables.pix_code || '',
      '{digitable_line}': variables.digitable_line || '',
      '{payment_link_section}': variables.payment_link_section || '',
      '{pix_code_section}': variables.pix_code_section || '',
      '{digitable_line_section}': variables.digitable_line_section || '',
      '{company_name}': variables.company_name || 'Nossa Empresa',
    };

    Object.keys(vars).forEach((key) => {
      // Regex global para substituir todas as ocorrências
      const regex = new RegExp(key, 'g');
      result = result.replace(regex, vars[key]);
    });

    return result;
  }

  /**
   * Simula o disparo de uma mensagem 
   */
  async sendMessage(
    channel: 'whatsapp' | 'email',
    recipient: string,
    content: string,
    subject?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Aqui integraria com APIVOX de Mensagens, SendGrid, Twilio, etc
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      console.log(`[MessageService] Disparo via ${channel.toUpperCase()}`);
      console.log(`Destinatário: ${recipient}`);
      if (subject) console.log(`Assunto: ${subject}`);
      console.log(`Mensagem:\n${content}\n--------------------`);
      
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const messageService = new MessageService();
