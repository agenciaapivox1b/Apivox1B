import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface ConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConfigModal({ open, onOpenChange }: ConfigModalProps) {
  const [config, setConfig] = useState({
    autoArchive: false,
    notifyOnChange: true,
    showValue: false,
    columnHeight: 'auto',
    cardSize: 'normal',
  });

  const handleSave = () => {
    // Salvar configurações
    console.log('Configurações salvas:', config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurações do Funil</DialogTitle>
          <DialogDescription>
            Personalize o comportamento e aparência do funil de vendas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Comportamento */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Comportamento</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-normal">Arquivo automático de leads perdidos</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Arquiva leads após 30 dias na etapa "Perdido"
                </p>
              </div>
              <Switch 
                checked={config.autoArchive}
                onCheckedChange={(checked) => setConfig({ ...config, autoArchive: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-normal">Notificações de mudanças</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Receba notificações ao mover leads entre etapas
                </p>
              </div>
              <Switch 
                checked={config.notifyOnChange}
                onCheckedChange={(checked) => setConfig({ ...config, notifyOnChange: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-normal">Mostrar valores nos cards</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Exibe o valor do lead nos cards do funil
                </p>
              </div>
              <Switch 
                checked={config.showValue}
                onCheckedChange={(checked) => setConfig({ ...config, showValue: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Aparência */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Aparência</h4>
            
            <div className="space-y-2">
              <Label className="text-sm">Tamanho dos cards</Label>
              <div className="space-y-2">
                {[
                  { value: 'compact', label: 'Compacto' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'largo', label: 'Largo' },
                ].map(({ value, label }) => (
                  <div key={value} className="flex items-center gap-2">
                    <Checkbox
                      id={`size-${value}`}
                      checked={config.cardSize === value}
                      onCheckedChange={() => setConfig({ ...config, cardSize: value })}
                    />
                    <Label htmlFor={`size-${value}`} className="text-sm font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm">Altura das colunas</Label>
              <div className="space-y-2">
                {[
                  { value: 'auto', label: 'Automática' },
                  { value: 'fixo', label: 'Fixa (600px)' },
                  { value: 'tela', label: 'Tela cheia' },
                ].map(({ value, label }) => (
                  <div key={value} className="flex items-center gap-2">
                    <Checkbox
                      id={`height-${value}`}
                      checked={config.columnHeight === value}
                      onCheckedChange={() => setConfig({ ...config, columnHeight: value })}
                    />
                    <Label htmlFor={`height-${value}`} className="text-sm font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSave}>
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
