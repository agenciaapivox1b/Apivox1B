import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditWebhookModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialUrl?: string;
    onSave: (url: string) => void;
}

export function EditWebhookModal({ open, onOpenChange, initialUrl = '', onSave }: EditWebhookModalProps) {
    const [url, setUrl] = useState(initialUrl);
    const [error, setError] = useState('');

    const handleSave = () => {
        if (url.trim() && !url.trim().startsWith('https://')) {
            setError('URL inválida. Cole uma URL que comece com https://');
            return;
        }
        setError('');
        onSave(url.trim());
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            onOpenChange(isOpen);
            if (isOpen) {
                setUrl(initialUrl);
                setError('');
            }
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Webhook URL</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="webhook-url">URL</Label>
                        <Input
                            id="webhook-url"
                            placeholder="Cole aqui a URL do webhook"
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value);
                                setError('');
                            }}
                            className={error ? 'border-destructive' : ''}
                        />
                        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
