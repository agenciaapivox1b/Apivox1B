import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { KnowledgeItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Upload, FileText, BookOpen, ShieldCheck, Package } from 'lucide-react';

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
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Base de Conhecimento</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie o conhecimento dos seus agentes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Enviar Documento</Button>
          <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Entrada</Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar na base de conhecimento..." className="pl-9" />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => { setCategory(c.key); setLoading(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === c.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
          >
            <c.icon className="h-3.5 w-3.5" />
            {c.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="bg-card border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                  <Badge category={item.category} />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Atualizado em {new Date(item.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    faq: 'bg-primary/10 text-primary',
    rules: 'bg-amber-500/10 text-amber-600',
    products: 'bg-brand-green-secondary/10 text-brand-green-secondary',
    policies: 'bg-purple-500/10 text-purple-600',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[category] || 'bg-muted text-muted-foreground'}`}>
      {category}
    </span>
  );
}
