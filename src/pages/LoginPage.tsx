import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            <Card className="w-full max-w-md border-border bg-card/80 backdrop-blur-sm z-10 shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-6">
                        <span className="text-3xl font-bold tracking-tighter text-primary">APIVOX</span>
                    </div>
                    <CardTitle className="text-2xl font-semibold">Boas-vindas</CardTitle>
                    <CardDescription>
                        Entre com seus dados para acessar sua conta
                    </CardDescription>
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
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="pl-10"
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
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10"
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
                <CardFooter className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
                    Ainda não tem uma conta?
                    <Link
                        to="/register"
                        className="text-primary font-medium hover:underline hover:text-primary/80 transition-colors"
                    >
                        Criar conta
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
