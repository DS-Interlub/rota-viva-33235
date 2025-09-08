import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Route, Calendar, Clock, MapPin, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DriverRoutesProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  driverName: string;
}

export default function DriverRoutes({ isOpen, onClose, driverId, driverName }: DriverRoutesProps) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
    }
  }, [isOpen, driverId]);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          vehicles(plate, brand, model),
          route_stops(
            id,
            stop_number,
            completed,
            arrival_time,
            departure_time,
            customers(name, address)
          )
        `)
        .eq('driver_id', driverId)
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
      draft: { label: 'Rascunho', variant: 'outline' as const },
      pending: { label: 'Pendente', variant: 'outline' as const },
      in_progress: { label: 'Em andamento', variant: 'default' as const },
      completed: { label: 'Concluída', variant: 'secondary' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const toggleRouteExpansion = (routeId: string) => {
    setExpandedRoute(expandedRoute === routeId ? null : routeId);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center p-8">Carregando rotas...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rotas do Motorista - {driverName}</DialogTitle>
          <DialogDescription>
            Visualize todas as rotas atribuídas a este motorista
          </DialogDescription>
        </DialogHeader>

        {routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Route className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma rota encontrada</h3>
            <p className="text-muted-foreground text-center">
              Este motorista ainda não possui rotas atribuídas
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {routes.map((route: any) => (
              <Card key={route.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Route className="h-5 w-5" />
                        Rota de {new Date(route.route_date).toLocaleDateString('pt-BR')}
                        {getStatusBadge(route.status)}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(route.route_date).toLocaleDateString('pt-BR')}
                        </span>
                        <span>
                          Veículo: {route.vehicles?.plate || 'Não definido'} - {route.vehicles?.brand} {route.vehicles?.model}
                        </span>
                        <span>
                          Paradas: {route.route_stops?.length || 0}
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRouteExpansion(route.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {expandedRoute === route.id ? 'Ocultar' : 'Ver Detalhes'}
                    </Button>
                  </div>
                </CardHeader>
                
                {expandedRoute === route.id && (
                  <CardContent className="space-y-4">
                    {/* Route info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {route.base_departure_time && (
                        <div>
                          <span className="font-medium">Saída da base:</span>
                          <p>{route.base_departure_time}</p>
                        </div>
                      )}
                      {route.base_arrival_time && (
                        <div>
                          <span className="font-medium">Retorno à base:</span>
                          <p>{route.base_arrival_time}</p>
                        </div>
                      )}
                      {route.initial_km && (
                        <div>
                          <span className="font-medium">KM inicial:</span>
                          <p>{route.initial_km}</p>
                        </div>
                      )}
                      {route.final_km && (
                        <div>
                          <span className="font-medium">KM final:</span>
                          <p>{route.final_km}</p>
                        </div>
                      )}
                    </div>

                    {/* Route stops */}
                    {route.route_stops && route.route_stops.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Paradas da Rota:</h4>
                        <div className="space-y-2">
                          {route.route_stops
                            .sort((a: any, b: any) => a.stop_number - b.stop_number)
                            .map((stop: any) => (
                            <div key={stop.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">#{stop.stop_number}</Badge>
                                <div>
                                  <p className="font-medium">{stop.customers.name}</p>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {stop.customers.address}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {stop.arrival_time && (
                                  <span className="text-sm flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {stop.arrival_time}
                                  </span>
                                )}
                                <Badge variant={stop.completed ? "default" : "outline"}>
                                  {stop.completed ? 'Concluída' : 'Pendente'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}