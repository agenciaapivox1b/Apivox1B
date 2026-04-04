import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  Check,
  Share2,
  QrCode,
  Barcode,
  Link as LinkIcon,
  AlertCircle,
  Wallet,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Charge } from '@/types';

interface PaymentLinksDrawerProps {
  charge: Charge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaymentLinksDrawer({
  charge,
  open,
  onOpenChange,
}: PaymentLinksDrawerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!charge) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copiado!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const hasPaymentLink = !!charge.paymentDetails?.paymentLink;
  const hasPixCode = !!charge.paymentDetails?.pixCode;
  const hasPixQr = !!charge.paymentDetails?.pixQrCode;
  const hasBoleto = !!charge.paymentDetails?.boletoLine;

  const hasAnyLink = hasPaymentLink || hasPixCode || hasPixQr || hasBoleto;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Links de Pagamento
          </SheetTitle>
          <SheetDescription>
            Compartilhe estes links com seu cliente para que ele possa efetuar o pagamento
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Dados da Cobrança */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{charge.clientName}</CardTitle>
              <CardDescription className="text-xs">{charge.clientEmail}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Valor:</span>
                <span className="text-lg font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(charge.value)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Vencimento:</span>
                <span className="text-sm font-medium">
                  {new Intl.DateTimeFormat('pt-BR').format(new Date(charge.dueDate))}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Descrição:</span>
                <span className="text-sm font-medium">{charge.description}</span>
              </div>
            </CardContent>
          </Card>

          {!hasAnyLink && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta cobrança ainda não possui links de pagamento gerados. Crie a cobrança através do gateway de pagamento para gerar os links.
              </AlertDescription>
            </Alert>
          )}

          {/* PIX */}
          {hasPixCode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  PIX Cópia e Cola
                </CardTitle>
                <CardDescription className="text-xs">
                  Copie o código e cole no seu banco
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="pixCode" className="text-xs">Código PIX</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pixCode"
                      value={charge.paymentDetails?.pixCode || ''}
                      readOnly
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          charge.paymentDetails?.pixCode || '',
                          'Código PIX'
                        )
                      }
                    >
                      {copiedField === 'Código PIX' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PIX QR Code */}
          {hasPixQr && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  PIX QR Code
                </CardTitle>
                <CardDescription className="text-xs">
                  Escaneie com seu smartphone para pagar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <img
                    src={charge.paymentDetails?.pixQrCode}
                    alt="PIX QR Code"
                    className="h-48 w-48"
                  />
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      charge.paymentDetails?.pixQrCode || '',
                      'QR Code'
                    )
                  }
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar URL da Imagem
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Boleto */}
          {hasBoleto && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Barcode className="h-4 w-4" />
                  Boleto Bancário
                </CardTitle>
                <CardDescription className="text-xs">
                  Código de barras para pagamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="boletoLine" className="text-xs">Linha Digitável</Label>
                  <div className="flex gap-2">
                    <Input
                      id="boletoLine"
                      value={charge.paymentDetails?.boletoLine || ''}
                      readOnly
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          charge.paymentDetails?.boletoLine || '',
                          'Boleto'
                        )
                      }
                    >
                      {copiedField === 'Boleto' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Link de Pagamento Genérico */}
          {hasPaymentLink && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Link de Pagamento
                </CardTitle>
                <CardDescription className="text-xs">
                  Compartilhe este link com seu cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="paymentLink" className="text-xs">URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="paymentLink"
                      value={charge.paymentDetails?.paymentLink || ''}
                      readOnly
                      className="text-xs bg-muted"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          charge.paymentDetails?.paymentLink || '',
                          'Link'
                        )
                      }
                    >
                      {copiedField === 'Link' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                <Button className="w-full" asChild>
                  <a
                    href={charge.paymentDetails?.paymentLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Abrir Página de Pagamento
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Métodos de Compartilhamento */}
          {hasAnyLink && (
            <>
              <Separator />

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Compartilhar</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      const text = `Olá! Segue o link para você efetuar o pagamento de R$ ${charge.value.toLocaleString('pt-BR')}: ${
                        charge.paymentDetails?.paymentLink || ''
                      }`;
                      copyToClipboard(text, 'Mensagem WhatsApp');
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      const subject = `Pagamento: ${charge.description}`;
                      const body = `Olá ${charge.clientName},\n\nSegue o link para você efetuar o pagamento de R$ ${charge.value.toLocaleString(
                        'pt-BR'
                      )}:\n\n${charge.paymentDetails?.paymentLink || ''}\n\nObrigado!`;
                      window.location.href = `mailto:${charge.clientEmail}?subject=${encodeURIComponent(
                        subject
                      )}&body=${encodeURIComponent(body)}`;
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
