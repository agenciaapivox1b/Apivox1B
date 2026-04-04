import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { KnowledgeItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Upload, FileText, BookOpen, ShieldCheck, Package, Loader2 } from 'lucide-react';

const categories = [
  { key: 'all', label: 'Todos', icon: FileText },
  { key: 'faq', label: 'Perguntas Frequentes', icon: BookOpen },
  { key: 'rules', label: 'Regras de Negócio', icon: ShieldCheck },
  { key: 'products', label: 'Produtos e Serviços', icon: Package },
  { key: 'policies', label: 'Políticas', icon: FileText },
];

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getKnowledgeBase(category).then((k) => { setItems(k); setLoading(false); });
  }, [category]);

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Base de Conhecimento</h1>
          <p className="text-muted-foreground mt-1">Ensine seu agente como responder seus clientes</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 rounded-full px-5"><Upload className="h-4 w-4" /> Importar</Button>
          <Button className="gap-2 rounded-full px-5 shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> Novo Item</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar-like Categories */}
        <div className="w-full lg:w-64 space-y-1 bg-card p-2 rounded-2xl border border-border shrink-0">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCategory(c.key); setLoading(true); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${category === c.key 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <c.icon className="h-4 w-4 shrink-0" />
              {c.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Pesquisar no conhecimento..." 
              className="pl-11 h-12 rounded-2xl bg-card border-border focus-visible:ring-primary/20 transition-all font-medium" 
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((item) => (
                <Card key={item.id} className="group bg-card border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{item.title}</h3>
                      <Badge category={item.category} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{item.content}</p>
                    <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Modificado em {new Date(item.updated_at).toLocaleDateString()}
                      </span>
                      <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="h-4 w-4 rotate-45" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ category }: { category: string }) {
  const meta: Record<string, { label: string, color: string }> = {
    faq: { label: 'FAQ', color: 'bg-primary/10 text-primary border-primary/20' },
    rules: { label: 'Regra', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    products: { label: 'Produto', color: 'bg-brand-green-secondary/10 text-brand-green-secondary border-brand-green-secondary/20' },
    policies: { label: 'Política', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  };
  
  const current = meta[category] || { label: category, color: 'bg-muted text-muted-foreground' };
  
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${current.color}`}>
      {current.label}
    </span>
  );
}
