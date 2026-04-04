import { Moon, Sun, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Escuro', icon: Moon },
    { value: 'system' as const, label: 'Sistema', icon: Cloud },
  ];

  return (
    <div className="flex gap-2">
      {themes.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={theme === value ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme(value)}
          className="gap-2"
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}
