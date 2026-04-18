import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  DollarSign,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Briefcase,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Check,
  Bell,
  CalendarCheck,
  X
} from 'lucide-react';
import { calendarService, type CalendarEvent } from '@/services/calendarService';
import { TenantService } from '@/services/tenantService';
import { toast } from 'sonner';
import { format, isToday, isSameMonth, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ViewMode = 'calendar' | 'list';

const typeLabels: Record<string, string> = {
  'followup': 'Follow-up',
  'charge': 'Cobrança',
  'manual': 'Tarefa',
  'reuniao': 'Reunião',
  'ligacao': 'Ligação',
  'tarefa': 'Tarefa',
  'retorno': 'Retorno'
};

const typeColors: Record<string, string> = {
  'followup': 'bg-blue-100 text-blue-700 border-blue-200',
  'charge': 'bg-red-100 text-red-700 border-red-200',
  'manual': 'bg-gray-100 text-gray-700 border-gray-200',
  'reuniao': 'bg-purple-100 text-purple-700 border-purple-200',
  'ligacao': 'bg-green-100 text-green-700 border-green-200',
  'tarefa': 'bg-orange-100 text-orange-700 border-orange-200',
  'retorno': 'bg-cyan-100 text-cyan-700 border-cyan-200'
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState({ overdue: 0, today: 0, upcoming: 0, done: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [showDayEvents, setShowDayEvents] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    type: 'tarefa' as CalendarEvent['type'],
    reminder_minutes: null as number | null,
    contact_id: null as string | null
  });

  useEffect(() => {
    loadEvents();
    loadStats();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const tenantId = await TenantService.getCurrentTenantId();
      
      if (!tenantId) {
        toast.error('Tenant não encontrado. Faça login novamente.');
        return;
      }

      // Carregar eventos do mês atual
      const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      const eventsData = await calendarService.getEvents(tenantId, {
        startDate: monthStart,
        endDate: monthEnd
      });

      setEvents(eventsData);
    } catch (error: any) {
      console.error('Erro ao carregar eventos:', error);
      toast.error(error?.message || 'Erro ao carregar agenda. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const tenantId = await TenantService.getCurrentTenantId();
      if (!tenantId) return;
      
      const statsData = await calendarService.getEventStats(tenantId);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.event_date === dayStr);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    const dayEvents = getEventsForDay(day);
    setSelectedDayEvents(dayEvents);
    setShowDayEvents(true);
  };

  const handleNewEvent = (date?: Date) => {
    const targetDate = date || selectedDate || new Date();
    
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      event_date: format(targetDate, 'yyyy-MM-dd'),
      start_time: '',
      end_time: '',
      type: 'tarefa',
      reminder_minutes: null,
      contact_id: null
    });
    
    setIsModalOpen(true);
    setShowDayEvents(false);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      type: event.type,
      reminder_minutes: event.reminder_minutes,
      contact_id: event.contact_id
    });
    setIsModalOpen(true);
    setShowDayEvents(false);
  };

  const handleSaveEvent = async () => {
    try {
      if (!formData.title.trim()) {
        toast.error('Título é obrigatório');
        return;
      }
      if (!formData.event_date) {
        toast.error('Data é obrigatória');
        return;
      }

      const tenantId = await TenantService.getCurrentTenantId();
      if (!tenantId) {
        toast.error('Tenant não encontrado');
        return;
      }

      const eventData = {
        ...formData,
        reminder_minutes: formData.reminder_minutes || null,
        contact_id: formData.contact_id || null
      };

      if (editingEvent) {
        await calendarService.updateEvent(editingEvent.id, eventData, tenantId);
        toast.success('Evento atualizado com sucesso!');
      } else {
        await calendarService.createEvent(eventData, tenantId);
        toast.success('Evento criado com sucesso!');
      }

      setIsModalOpen(false);
      loadEvents();
      loadStats();
    } catch (error: any) {
      console.error('Erro ao salvar evento:', error);
      toast.error(error?.message || 'Erro ao salvar evento');
    }
  };

  const handleMarkAsDone = async (eventId: string) => {
    try {
      const tenantId = await TenantService.getCurrentTenantId();
      await calendarService.markAsDone(eventId, tenantId);
      toast.success('Evento marcado como concluído!');
      loadEvents();
      loadStats();
      
      if (showDayEvents && selectedDate) {
        setSelectedDayEvents(getEventsForDay(selectedDate));
      }
    } catch (error) {
      toast.error('Erro ao concluir evento');
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    try {
      const tenantId = await TenantService.getCurrentTenantId();
      await calendarService.cancelEvent(eventId, tenantId);
      toast.success('Evento cancelado');
      loadEvents();
      loadStats();
      
      if (showDayEvents && selectedDate) {
        setSelectedDayEvents(getEventsForDay(selectedDate));
      }
    } catch (error) {
      toast.error('Erro ao cancelar evento');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const tenantId = await TenantService.getCurrentTenantId();
      await calendarService.deleteEvent(eventId, tenantId);
      toast.success('Evento excluído');
      loadEvents();
      loadStats();
      
      if (showDayEvents && selectedDate) {
        setSelectedDayEvents(getEventsForDay(selectedDate));
      }
    } catch (error) {
      toast.error('Erro ao excluir evento');
    }
  };

  // Renderização do calendário mensal
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="space-y-4">
        {/* Navegação do calendário */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const hasEvents = dayEvents.length > 0;
            const hasOverdue = dayEvents.some(e => 
              (e.status === 'overdue' || (new Date(e.event_date) < new Date() && e.status === 'pending'))
            );
            const hasPending = dayEvents.some(e => e.status === 'pending' && new Date(e.event_date) >= new Date());
            const isTodayDate = isToday(day);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-[90px] border rounded-md p-2 cursor-pointer transition-all hover:bg-accent",
                  !isCurrentMonth && "bg-muted/50 text-muted-foreground",
                  isTodayDate && "bg-blue-50 border-blue-300 ring-1 ring-blue-300",
                  "relative"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-sm font-medium",
                    isTodayDate && "text-blue-700"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasOverdue && (
                    <span className="w-2 h-2 rounded-full bg-red-500" title="Atrasado" />
                  )}
                  {hasPending && !hasOverdue && (
                    <span className="w-2 h-2 rounded-full bg-green-500" title="Pendente" />
                  )}
                </div>
                
                {/* Mini lista de eventos */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "text-[10px] truncate px-1 py-0.5 rounded",
                        event.status === 'done' && "bg-gray-100 text-gray-500 line-through",
                        event.status === 'canceled' && "bg-gray-100 text-gray-400 line-through",
                        event.status === 'overdue' && "bg-red-100 text-red-600",
                        (event.status === 'pending' && new Date(event.event_date) >= new Date()) && "bg-blue-100 text-blue-700",
                        (event.status === 'pending' && new Date(event.event_date) < new Date()) && "bg-red-100 text-red-600"
                      )}
                    >
                      {event.start_time && <span>{event.start_time} </span>}
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{dayEvents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderização da lista de eventos
  const renderEventList = () => {
    const sortedEvents = [...events].sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    return (
      <div className="space-y-3">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum evento encontrado</p>
            <Button variant="outline" className="mt-4" onClick={() => handleNewEvent()}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro evento
            </Button>
          </div>
        ) : (
          sortedEvents.map(event => {
            const eventDate = new Date(event.event_date);
            const isOverdue = event.status === 'overdue' || 
              (eventDate < new Date() && event.status === 'pending');
            
            return (
              <div
                key={event.id}
                className={cn(
                  "flex items-start gap-3 p-4 border rounded-lg",
                  event.status === 'done' && "bg-gray-50",
                  event.status === 'canceled' && "bg-gray-50 opacity-60",
                  isOverdue && "bg-red-50 border-red-200"
                )}
              >
                {/* Indicador de tipo */}
                <div className={cn(
                  "w-1 self-stretch rounded-full",
                  typeColors[event.type]?.split(' ')[0].replace('bg-', 'bg-')
                )} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={cn(
                        "font-medium",
                        (event.status === 'done' || event.status === 'canceled') && "line-through text-muted-foreground"
                      )}>
                        {event.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {event.status !== 'done' && (
                          <DropdownMenuItem onClick={() => handleMarkAsDone(event.id)}>
                            <Check className="w-4 h-4 mr-2" />
                            Marcar concluído
                          </DropdownMenuItem>
                        )}
                        {event.status !== 'canceled' && (
                          <DropdownMenuItem onClick={() => handleCancelEvent(event.id)}>
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <Badge variant="outline" className={cn("text-xs", typeColors[event.type] || 'bg-gray-100')}>
                      {typeLabels[event.type] || event.type}
                    </Badge>
                    <span className="text-muted-foreground">
                      {format(eventDate, 'dd/MM/yyyy')}
                    </span>
                    {event.start_time && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.start_time}
                        {event.end_time && ` - ${event.end_time}`}
                      </span>
                    )}
                    {event.reminder_minutes && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        {event.reminder_minutes}min antes
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  // Loading state
  if (loading && events.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin mr-3 text-primary" />
          <span className="text-muted-foreground">Carregando agenda...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Agenda</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus compromissos e lembretes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadEvents}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => handleNewEvent()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Atrasados</p>
                <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Hoje</p>
                <p className="text-2xl font-bold text-yellow-800">{stats.today}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Próximos 7 dias</p>
                <p className="text-2xl font-bold text-green-800">{stats.upcoming}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Concluídos (7d)</p>
                <p className="text-2xl font-bold text-blue-800">{stats.done}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo principal */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendário / Lista */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Calendário
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Calendário
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4 mr-1" />
                    Lista
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'calendar' ? renderCalendar() : renderEventList()}
            </CardContent>
          </Card>
        </div>

        {/* Painel lateral - Eventos do dia selecionado */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarCheck className="w-5 h-5" />
                {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Clique em um dia do calendário para ver os eventos</p>
                </div>
              ) : selectedDayEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">Nenhum evento neste dia</p>
                  <Button size="sm" onClick={() => handleNewEvent(selectedDate)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar evento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button 
                    size="sm" 
                    className="w-full mb-4"
                    onClick={() => handleNewEvent(selectedDate)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Novo evento neste dia
                  </Button>
                  
                  {selectedDayEvents.map(event => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-3 border rounded-lg",
                        event.status === 'done' && "bg-gray-50 opacity-70",
                        event.status === 'canceled' && "bg-gray-50 opacity-50",
                        (event.status === 'overdue' || (new Date(event.event_date) < new Date() && event.status === 'pending')) && "bg-red-50 border-red-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h5 className={cn(
                            "font-medium text-sm truncate",
                            (event.status === 'done' || event.status === 'canceled') && "line-through text-muted-foreground"
                          )}>
                            {event.title}
                          </h5>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", typeColors[event.type])}>
                              {typeLabels[event.type]}
                            </Badge>
                            {event.start_time && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {event.start_time}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                              <Edit3 className="w-3 h-3 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {event.status !== 'done' && (
                              <DropdownMenuItem onClick={() => handleMarkAsDone(event.id)}>
                                <Check className="w-3 h-3 mr-2" />
                                Concluir
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Editar Evento' : 'Novo Evento'}
            </DialogTitle>
            <DialogDescription>
              Preencha os detalhes do compromisso ou lembrete.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Reunião com cliente"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes do evento..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start">Início</Label>
                <Input
                  id="start"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end">Término</Label>
                <Input
                  id="end"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as CalendarEvent['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="tarefa">Tarefa</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="manual">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reminder">Lembrete (minutos antes)</Label>
                <Select
                  value={formData.reminder_minutes?.toString() || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, reminder_minutes: value === 'none' ? null : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem lembrete" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem lembrete</SelectItem>
                    <SelectItem value="10">10 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="1440">1 dia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEvent}>
              {editingEvent ? 'Salvar alterações' : 'Criar evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
