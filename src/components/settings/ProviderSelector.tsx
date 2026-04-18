import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, QrCode, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';

type WhatsAppProviderType = 'whatsapp_meta' | 'whatsapp_qr';

interface ProviderSelectorProps {
  selectedProvider: WhatsAppProviderType;
  onSelect: (provider: WhatsAppProviderType) => void;
}

export function ProviderSelector({ selectedProvider, onSelect }: ProviderSelectorProps) {
  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600" />
          Escolha seu tipo de conexão
        </CardTitle>
        <CardDescription>
          Selecione como você quer conectar seu WhatsApp ao APIVOX
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opção Meta API */}
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedProvider === 'whatsapp_meta' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => onSelect('whatsapp_meta')}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                selectedProvider === 'whatsapp_meta' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}>
                <Cloud className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Meta Cloud API</h3>
                  {selectedProvider === 'whatsapp_meta' && (
                    <Badge variant="default" className="bg-blue-500">Selecionado</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Conexão oficial via WhatsApp Business API
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Maior confiabilidade</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Webhooks em tempo real</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Ideal para produção</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Opção QR Code */}
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedProvider === 'whatsapp_qr' 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => onSelect('whatsapp_qr')}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                selectedProvider === 'whatsapp_qr' ? 'bg-purple-500 text-white' : 'bg-gray-100'
              }`}>
                <QrCode className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">QR Code (Rápido)</h3>
                  {selectedProvider === 'whatsapp_qr' && (
                    <Badge variant="default" className="bg-purple-500">Selecionado</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Conexão simples escaneando QR Code
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Setup em 1 minuto</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Sem aprovação da Meta</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>Em preparação (Fase B)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

