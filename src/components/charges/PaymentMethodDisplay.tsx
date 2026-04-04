import { Copy, Eye, Share2, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { PaymentMethodDetails } from '@/types';

interface PaymentMethodDisplayProps {
  paymentDetails?: PaymentMethodDetails | null;
  paymentMethod?: string;
}

export function PaymentMethodDisplay({
  paymentDetails,
  paymentMethod,
}: PaymentMethodDisplayProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // Se não há dados de pagamento, mostrar fallback
  if (!paymentDetails) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Dados de Pagamento</p>
              <p className="text-sm text-muted-foreground">
                Forma de pagamento ainda não foi gerada. Use o botão "Gerar Cobrança" para definir a forma de pagamento e gerar os dados.
              </p>
            </div>
            {paymentMethod && (
              <div className="bg-white dark:bg-slate-900 rounded p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Método selecionado:</p>
                <p className="text-sm font-medium text-foreground capitalize">{paymentMethod}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // PIX
  if (paymentDetails.method === 'pix' && paymentDetails.pixCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-2xl">🔄</span>
            PIX - Transferência Instantânea
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Código PIX */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Código PIX</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded p-3 font-mono text-xs text-foreground break-all">
                {paymentDetails.pixCode}
              </div>
              <Button
                onClick={() => copyToClipboard(paymentDetails.pixCode!, 'Código PIX')}
                size="sm"
                variant="outline"
                className="h-auto"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* QR Code (se disponível) */}
          {paymentDetails.pixQrCode && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">QR Code</p>
              <div className="bg-white dark:bg-slate-900 rounded p-4 flex justify-center border border-border">
                <img
                  src={paymentDetails.pixQrCode}
                  alt="QR Code PIX"
                  className="h-40 w-40"
                />
              </div>
            </div>
          )}

          {/* Data de expiração */}
          {paymentDetails.expiresAt && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-xs text-blue-700 dark:text-blue-300">
              <p>
                <strong>Válido até:</strong> {new Date(paymentDetails.expiresAt).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => copyToClipboard(paymentDetails.pixCode!, 'Código PIX')}
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar Código
            </Button>
            <Button
              onClick={() => copyToClipboard(paymentDetails.pixQrCode || paymentDetails.pixCode!, 'PIX')}
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // BOLETO
  if (paymentDetails.method === 'boleto' && paymentDetails.boletoLine) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Boleto Bancário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Linha Digitável */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Linha Digitável</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded p-3 font-mono text-sm text-foreground break-all">
                {paymentDetails.boletoLine}
              </div>
              <Button
                onClick={() => copyToClipboard(paymentDetails.boletoLine!, 'Linha Digitável')}
                size="sm"
                variant="outline"
                className="h-auto"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Código de Barras (se disponível) */}
          {paymentDetails.boletoBarcode && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">Código de Barras</p>
              <div className="bg-white dark:bg-slate-900 rounded p-4 flex justify-center border border-border">
                <img
                  src={paymentDetails.boletoBarcode}
                  alt="Código de Barras"
                  className="h-16 w-full max-w-xs"
                />
              </div>
            </div>
          )}

          {/* Data de expiração */}
          {paymentDetails.expiresAt && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-xs text-red-700 dark:text-red-300">
              <p>
                <strong>Válido até:</strong> {new Date(paymentDetails.expiresAt).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => copyToClipboard(paymentDetails.boletoLine!, 'Linha Digitável')}
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar Linha
            </Button>
            {paymentDetails.paymentLink && (
              <Button
                onClick={() => window.open(paymentDetails.paymentLink)}
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar Boleto
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // CARTÃO / LINK DE PAGAMENTO
  if (['credit_card', 'link', 'mercadopago', 'stripe'].includes(paymentDetails.method || '') && paymentDetails.paymentLink) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-2xl">💳</span>
            Cartão de Crédito / Checkout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Link de Pagamento */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Link de Pagamento</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded p-3 text-xs text-foreground break-all font-mono">
                {paymentDetails.paymentLink}
              </div>
              <Button
                onClick={() => copyToClipboard(paymentDetails.paymentLink!, 'Link')}
                size="sm"
                variant="outline"
                className="h-auto"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Data de expiração */}
          {paymentDetails.expiresAt && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-xs text-amber-700 dark:text-amber-300">
              <p>
                <strong>Válido até:</strong> {new Date(paymentDetails.expiresAt).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => window.open(paymentDetails.paymentLink)}
              className="flex-1 gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir Link
            </Button>
            <Button
              onClick={() => copyToClipboard(paymentDetails.paymentLink!, 'Link')}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // TRANSFERÊNCIA BANCÁRIA
  if (paymentDetails.method === 'transfer' && paymentDetails.bankAccountNumber) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-2xl">🏦</span>
            Transferência Bancária
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dados Bancários */}
          <div className="space-y-3 bg-slate-100 dark:bg-slate-800 rounded p-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Número da Conta</p>
              <div className="flex gap-2">
                <p className="font-mono font-semibold text-foreground flex-1">{paymentDetails.bankAccountNumber}</p>
                <Button
                  onClick={() => copyToClipboard(paymentDetails.bankAccountNumber!, 'Número da Conta')}
                  size="sm"
                  variant="ghost"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {paymentDetails.bankRoutingNumber && (
              <div className="border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground mb-1">Código do Banco</p>
                <div className="flex gap-2">
                  <p className="font-mono font-semibold text-foreground flex-1">{paymentDetails.bankRoutingNumber}</p>
                  <Button
                    onClick={() => copyToClipboard(paymentDetails.bankRoutingNumber!, 'Código do Banco')}
                    size="sm"
                    variant="ghost"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Instrução */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-xs text-blue-700 dark:text-blue-300">
            <p>Solicite um comprovante de transferência ao cliente para confirmar o pagamento.</p>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => {
                const fullData = `Conta: ${paymentDetails.bankAccountNumber}\nBanco: ${paymentDetails.bankRoutingNumber || 'N/A'}`;
                copyToClipboard(fullData, 'Dados Bancários');
              }}
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar Dados
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // DINHEIRO / MANUAL
  if (paymentDetails.method === 'cash') {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-2xl">💰</span>
            Dinheiro / Pagamento Manual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-sm text-green-700 dark:text-green-300">
            <p>Cobrança sem forma de pagamento automática. Envie manualmente ao cliente ou marque como paga após receber.</p>
          </div>
          {paymentDetails.externalId && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">ID da Cobrança</p>
              <div className="flex gap-2">
                <p className="font-mono text-sm text-foreground bg-slate-100 dark:bg-slate-800 rounded p-2 flex-1 break-all">
                  {paymentDetails.externalId}
                </p>
                <Button
                  onClick={() => copyToClipboard(paymentDetails.externalId!, 'ID')}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fallback para método pendente ou dados incompletos
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          Aguardando processamento do método de pagamento ou escolha do cliente.
        </p>
      </CardContent>
    </Card>
  );
}
