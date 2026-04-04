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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (leads: any[]) => void;
}

export default function ImportModal({ open, onOpenChange, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [discardExisting, setDiscardExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      setPreviewData([]);
      setError('');
      return;
    }

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Por favor, selecione um arquivo CSV');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError('');

    // Ler e previsualizardados
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1, 6).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index]?.trim() || '';
        });
        return obj;
      }).filter(obj => obj.Nome); // Filtrar linhas vazias

      setPreviewData(data);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo CSV');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const importedLeads = lines.slice(1).map((line, index) => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((header, h) => {
          obj[header] = values[h]?.trim() || '';
        });
        
        if (obj.Nome) {
          return {
            id: `imported-${Date.now()}-${index}`,
            name: obj.Nome || 'Sem nome',
            phone: obj.Telefone || '',
            stage: obj.Etapa || 'atendendo',
            priority: obj.Prioridade || 'média',
            observation: obj.Observação || '',
            reason: obj.Interesse || '',
            value: obj.Valor ? parseInt(obj.Valor) : 0,
            createdAt: new Date().toISOString(),
            archived: false,
          };
        }
        return null;
      }).filter(Boolean);

      if (importedLeads.length === 0) {
        setError('Nenhum lead válido encontrado no arquivo');
        setLoading(false);
        return;
      }

      onImport(importedLeads);
      setLoading(false);
      handleClose();
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setError('');
    setDiscardExisting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Importar Registros</DialogTitle>
          <DialogDescription>
            Importe leads de um arquivo CSV. O arquivo deve conter as colunas: Nome, Telefone, Etapa, Prioridade, Observação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Selecione o arquivo CSV *</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Máximo 25 MB. Formato: CSV (valores separados por vírgula)
            </p>
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Prévia dos dados ({previewData.length} registros)</Label>
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b border-border">
                    <tr>
                      {previewData[0] && Object.keys(previewData[0]).map(key => (
                        <th key={key} className="px-3 py-2 text-left font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-secondary/50">
                        {Object.values(row).map((value, vidx) => (
                          <td key={vidx} className="px-3 py-2 text-muted-foreground">
                            {String(value).substring(0, 30)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Opções */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="discard"
                checked={discardExisting}
                onCheckedChange={(checked) => setDiscardExisting(checked as boolean)}
              />
              <Label htmlFor="discard" className="text-sm font-normal cursor-pointer">
                Descartar todos os leads existentes
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Se desativado, os leads serão adicionados aos existentes
            </p>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Template */}
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-xs font-semibold text-foreground mb-2">Formato esperado:</p>
            <p className="text-xs text-muted-foreground font-mono">
              Nome,Telefone,Etapa,Prioridade,Observação
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-6 text-xs"
              onClick={() => {
                const template = 'Nome,Telefone,Etapa,Prioridade,Observação\nExemplo,+55 11 99999-9999,atendendo,alta,Novo lead';
                const blob = new Blob([template], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'template.csv';
                a.click();
              }}
            >
              Baixar Template
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleImport}
            disabled={!file || loading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar {previewData.length > 0 && `(${previewData.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
