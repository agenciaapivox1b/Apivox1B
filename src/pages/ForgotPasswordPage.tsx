import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                setError(error.message);
                return;
            }

            setSuccess(true);
        } catch (err: unknown) {
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
                    <CardTitle className="text-2xl font-semibold text-foreground">Recuperar senha</CardTitle>
                    <CardDescription>
                        {success
                            ? "Enviamos as instruções para o seu e-mail"
                            : "Digite seu e-mail para receber um link de recuperação"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {success ? (
                        <div className="bg-brand-green-secondary/10 border border-brand-green-secondary/20 text-brand-green-secondary text-sm p-4 rounded-md flex flex-col items-center text-center gap-3">
                            <CheckCircle2 className="h-8 w-8" />
                            <p>Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail cadastrado</Label>
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
                                <Button className="w-full" type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enviando e-mail...
                                        </>
                                    ) : (
                                        "Enviar link de recuperação"
                                    )}
                                </Button>
                            </form>
                        </>
                    )}
                </CardContent>
                <CardFooter className="flex items-center justify-center pt-2">
                    <Link
                        to="/login"
                        className="text-sm text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors group"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Voltar para o login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
