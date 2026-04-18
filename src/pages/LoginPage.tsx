import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import logoApivox from "@/assets/logoAPIVOX.png";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message === "Invalid login credentials") {
                    setError("E-mail ou senha incorretos.");
                } else if (error.message === "User not found") {
                    setError("Usuário não encontrado.");
                } else if (error.message === "Email not confirmed") {
                    setError("Por favor, verifique sua caixa de entrada e confirme seu e-mail antes de logar.");
                } else if (error.message === "Invalid email or password") {
                    setError("Dados de acesso inválidos. Verifique seu e-mail e senha.");
                } else {
                    setError("Erro: " + error.message);
                }
                return;
            }

            toast.success("Login realizado com sucesso!");
            navigate("/");
        } catch (err) {
            setError("Ocorreu um erro inesperado.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-[20%] right-[5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

            <Card className="w-full max-w-[420px] border-border bg-card/95 backdrop-blur-sm z-10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="space-y-5 text-center pt-4 pb-2">
                    <div className="flex justify-center">
                        <div className="relative">
                            {/* Glow effect behind logo */}
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl scale-150" />
                            <img
                                src={logoApivox}
                                alt="APIVOX"
                                className="relative w-[280px] h-auto object-contain drop-shadow-xl"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <CardTitle className="text-2xl font-bold text-foreground">Bem-vindo à APIVOX</CardTitle>
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <CardDescription className="text-base">
                            Entre com seus dados para acessar sua conta
                        </CardDescription>
                    </div>
                    {/* Elegant divider */}
                    <div className="flex items-center gap-4 pt-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Acesso</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-primary transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Senha</Label>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-primary hover:underline hover:text-primary/80 transition-colors"
                                >
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-primary transition-colors" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                "Entrar na conta"
                            )}
                        </Button>
                    </form>

                    {/* Espaço reservado removido para botão Google */}
                </CardContent>
                <CardFooter className="flex flex-col items-center gap-3 pt-2">
                    <div className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
                        Ainda não tem uma conta?
                        <Link
                            to="/register"
                            className="text-primary font-medium hover:underline hover:text-primary/80 transition-colors"
                        >
                            Criar conta
                        </Link>
                    </div>
                    {/* Elegant footer */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                        <span className="font-semibold text-primary/60">APIVOX</span>
                        <span>•</span>
                        <span>v1.0</span>
                        <span>•</span>
                        <span>Powered by APIVOX</span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
