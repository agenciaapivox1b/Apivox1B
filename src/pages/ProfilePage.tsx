import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    jobTitle: user?.user_metadata?.job_title || '',
    company: user?.user_metadata?.company || '',
    bio: user?.user_metadata?.bio || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Simular salvamento (em produção, isso faria uma chamada à API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({
        type: 'success',
        text: 'Perfil atualizado com sucesso!',
      });
      setIsEditing(false);
      toast.success('Alterações salvas');
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro ao atualizar perfil. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-2">
          Gerenciar informações de sua conta e dados pessoais
        </p>
      </div>

      {/* Avatar Section */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(formData.fullName || 'U')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{formData.fullName}</p>
              <p className="text-xs text-muted-foreground">{formData.email}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={true} // Desabilitado pois não há upload real
              >
                Alterar foto
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Form Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription className="mt-1">
                Atualize seus dados de perfil
              </CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nome Completo */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-semibold">
              Nome Completo *
            </Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              disabled={!isEditing}
              className="bg-background"
              placeholder="Seu nome completo"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">
              E-mail *
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              disabled={true}
              className="bg-muted text-muted-foreground cursor-not-allowed"
              placeholder="seu@email.com"
            />
            <p className="text-xs text-muted-foreground">
              O e-mail não pode ser alterado. Autenticação Supabase.
            </p>
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-semibold">
              Telefone
            </Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              className="bg-background"
              placeholder="+55 11 99999-9999"
            />
          </div>

          <Separator />

          {/* Cargo */}
          <div className="space-y-2">
            <Label htmlFor="jobTitle" className="text-sm font-semibold">
              Cargo / Função
            </Label>
            <Input
              id="jobTitle"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              disabled={!isEditing}
              className="bg-background"
              placeholder="ex: Gerente de Vendas"
            />
          </div>

          {/* Empresa */}
          <div className="space-y-2">
            <Label htmlFor="company" className="text-sm font-semibold">
              Empresa
            </Label>
            <Input
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              disabled={!isEditing}
              className="bg-background"
              placeholder="Nome da sua empresa"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-semibold">
              Bio
            </Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              disabled={!isEditing}
              className="bg-background resize-none min-h-24"
              placeholder="Descreva-se brevemente..."
            />
          </div>

          {isEditing && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Segurança */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>Gerenciar senha e configurações de segurança</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full">
            Alterar Senha
          </Button>
          <p className="text-xs text-muted-foreground">
            Recomendamos alterar sua senha a cada 3-6 meses para manter sua conta segura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
