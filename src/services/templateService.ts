import { messageService, TemplateVariables } from './messageService';

export type TemplateType = 'initial' | 'reminder' | 'overdue';

export class TemplateService {
  private templates: Record<TemplateType, string> = {
    initial: `Olá {customer_name}! 

Aqui é da {company_name}. 
Sua fatura no valor de {amount} com vencimento para {due_date} já está disponível.

Dados para pagamento:

{payment_link_section}{pix_code_section}{digitable_line_section}

Agradecemos a parceria!`,

    reminder: `Olá {customer_name}. 
    
Lembramos que sua fatura de {amount} vence em {due_date}. 

Dados para pagamento:

{payment_link_section}{pix_code_section}{digitable_line_section}

Caso já tenha pago, por favor desconsidere esta mensagem.`,

    overdue: `Aviso Importante: {customer_name}.

Consta em nosso sistema uma fatura em aberto no valor de {amount}, vencida em {due_date}.

Por favor, regularize sua situação o quanto antes para evitar bloqueios de serviço. 

Dados para pagamento (ATUALIZADO):

{payment_link_section}{pix_code_section}{digitable_line_section}

Dúvidas, estamos à disposição. Equipe {company_name}.`
  };

  getTemplate(type: TemplateType): string {
    return this.templates[type] || this.templates.initial;
  }

  renderTemplate(type: TemplateType, charge: any, variables?: TemplateVariables): string {
    const templateContent = this.getTemplate(type);
    
    // Se passou um objeto Charge, extrai dados dele
    let templateVars: TemplateVariables;
    if (charge && charge.amount !== undefined) {
      // É um objeto Charge
      const paymentData = charge.paymentDetails || {};
      
      // SEPARAÇÃO CRÍTICA: URLs vs Códigos de texto
      let paymentLinkSection = '';
      let pixCodeSection = '';
      let digitableLineSection = '';

      // Seção 1: LINK DE PAGAMENTO (URL clicável)
      if (paymentData.paymentLink && paymentData.paymentLink.startsWith('http')) {
        paymentLinkSection = `🔗 Link para pagamento: ${paymentData.paymentLink}`;
      }

      // Seção 2: CÓDIGO PIX (texto para copiar)
      if (paymentData.pixCode) {
        pixCodeSection = `💳 PIX (copie e cole): ${paymentData.pixCode}`;
      }

      // Seção 3: LINHA DIGITÁVEL (texto para copiar)
      if (paymentData.boletoLine) {
        digitableLineSection = `📋 Boleto (copie e cole): ${paymentData.boletoLine}`;
      }

      templateVars = {
        customer_name: charge.customerName || 'Cliente',
        amount: charge.amount,
        due_date: charge.dueDate || '',
        company_name: charge.companyName || 'Nossa Empresa',
        payment_link: paymentLinkSection,
        pix_code: pixCodeSection,
        digitable_line: digitableLineSection,
      };
    } else {
      // É um objeto TemplateVariables já formatado
      templateVars = variables || charge;
    }
    
    // Filtramos as variáveis não preenchidas para não poluir a mensagem
    const cleanVariables = {
      ...templateVars,
      payment_link_section: templateVars.payment_link ? `${templateVars.payment_link}\n\n` : '',
      pix_code_section: templateVars.pix_code ? `${templateVars.pix_code}\n\n` : '',
      digitable_line_section: templateVars.digitable_line ? templateVars.digitable_line : '',
    };

    let rendered = messageService.renderTemplate(templateContent, {
      customer_name: cleanVariables.customer_name!,
      amount: cleanVariables.amount!,
      due_date: cleanVariables.due_date!,
      company_name: cleanVariables.company_name,
      payment_link: cleanVariables.payment_link_section || '',
      pix_code: cleanVariables.pix_code_section || '',
      digitable_line: cleanVariables.digitable_line_section || '',
    });
    
    // Limpar quebras de linha duplas/triplas
    rendered = rendered.replace(/\n{3,}/g, '\n\n').trim();

    return rendered;
  }
}

export const templateService = new TemplateService();
