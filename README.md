# Apivox Dashboard

Plataforma de gestão de agentes e automação de marketing Apivox.

## Desenvolvimento Local

Para rodar o projeto localmente:


## Autenticação (Supabase Auth)

Este projeto utiliza Supabase para autenticação. Para rodar localmente, você precisa configurar as variáveis de ambiente.

### Passos para configurar:

1. Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com as chaves do seu projeto no dashboard do Supabase.
3. **Google OAuth**: Para o login com Google funcionar, configure o provedor no Supabase Dashboard (Authentication -> Providers -> Google) e adicione a URL de redirecionamento: `http://localhost:5173/`.

### Tecnologias utilizadas:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- **Supabase Auth**

