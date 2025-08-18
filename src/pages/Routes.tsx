import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Clock, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Routes() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          drivers(name),
          vehicles(plate, brand, model),
          route_stops(id, customer_id, completed, customers(name))
        `)
        .order('route_date', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Erro ao buscar rotas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as rotas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendente', variant: 'outline' as const },
      in_progress: { label: 'Em andamento', variant: 'default' as const },
      completed: { label: 'Concluída', variant: 'secondary' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando rotas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rotas</h1>
          <p className="text-muted-foreground">
            Gerencie as rotas de entrega dos motoristas
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Rota
        </Button>
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma rota encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando sua primeira rota de entrega
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira rota
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {routes.map((route: any) => (
            <Card key={route.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      {route.drivers?.name}
                      {getStatusBadge(route.status)}
                    </CardTitle>
                    <CardDescription>
                      Data: {new Date(route.route_date).toLocaleDateString('pt-BR')} | 
                      Veículo: {route.vehicles?.brand} {route.vehicles?.model} - {route.vehicles?.plate}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Horários</p>
                      <p className="text-sm text-muted-foreground">
                        Saída: {route.departure_time || 'Não definido'} | 
                        Retorno: {route.return_time || 'Não definido'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">KM</p>
                      <p className="text-sm text-muted-foreground">
                        {route.total_km ? `${route.total_km} km` : 'Não calculado'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Entregas</p>
                    <p className="text-sm text-muted-foreground">
                      {route.route_stops?.filter((stop: any) => stop.completed).length || 0} de {route.route_stops?.length || 0} concluídas
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                  {route.status === 'pending' && (
                    <Button size="sm">
                      Iniciar Rota
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}