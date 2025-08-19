import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Clock, CheckCircle, Camera, PenTool, Play, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function DriverRoutes() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  const [stopFormData, setStopFormData] = useState({
    notes: '',
    photos: [],
    signature_url: ''
  });
  const { toast } = useToast();
  const { profile, user } = useAuth();

  const isDriver = profile?.role === 'driver';

  useEffect(() => {
    if (isDriver) {
      fetchDriverRoutes();
    }
  }, [isDriver, profile]);

  const fetchDriverRoutes = async () => {
    if (!profile?.driver_id) return;

    try {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          vehicles(plate, brand, model),
          route_stops(
            *,
            customers(name, address)
          )
        `)
        .eq('driver_id', profile.driver_id)
        .order('route_date', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Erro ao buscar rotas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas rotas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startRoute = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from('routes')
        .update({ 
          status: 'in_progress',
          departure_time: new Date().toTimeString().slice(0, 8)
        })
        .eq('id', routeId);

      if (error) throw error;
      
      toast({
        title: "Rota iniciada",
        description: "Boa viagem! Lembre-se de marcar as entregas conforme forem sendo concluídas.",
      });
      fetchDriverRoutes();
    } catch (error) {
      console.error('Erro ao iniciar rota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a rota.",
        variant: "destructive",
      });
    }
  };

  const completeRoute = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from('routes')
        .update({ 
          status: 'completed',
          return_time: new Date().toTimeString().slice(0, 8)
        })
        .eq('id', routeId);

      if (error) throw error;
      
      toast({
        title: "Rota concluída",
        description: "Parabéns! Rota finalizada com sucesso.",
      });
      fetchDriverRoutes();
    } catch (error) {
      console.error('Erro ao concluir rota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível concluir a rota.",
        variant: "destructive",
      });
    }
  };

  const openStopDialog = (route: any, stop: any) => {
    setSelectedRoute(route);
    setSelectedStop(stop);
    setStopFormData({
      notes: stop.notes || '',
      photos: stop.photos || [],
      signature_url: stop.signature_url || ''
    });
    setIsStopDialogOpen(true);
  };

  const completeStop = async () => {
    if (!selectedStop || !selectedRoute) return;

    try {
      const { error } = await supabase
        .from('route_stops')
        .update({
          completed: true,
          notes: stopFormData.notes,
          photos: stopFormData.photos,
          signature_url: stopFormData.signature_url,
          delivery_time: new Date().toTimeString().slice(0, 8)
        })
        .eq('id', selectedStop.id);

      if (error) throw error;

      toast({
        title: "Entrega concluída",
        description: "Entrega marcada como realizada com sucesso!",
      });

      setIsStopDialogOpen(false);
      fetchDriverRoutes();
    } catch (error) {
      console.error('Erro ao completar entrega:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a entrega como concluída.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendente', variant: 'outline' as const, color: 'text-yellow-600' },
      in_progress: { label: 'Em andamento', variant: 'default' as const, color: 'text-blue-600' },
      completed: { label: 'Concluída', variant: 'secondary' as const, color: 'text-green-600' },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={statusInfo.variant} className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  if (!isDriver) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
          <p className="text-muted-foreground">Esta área é exclusiva para motoristas.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8">Carregando suas rotas...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minhas Rotas</h1>
        <p className="text-muted-foreground">
          Gerencie suas entregas e marque as conclusões
        </p>
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma rota encontrada</h3>
            <p className="text-muted-foreground text-center">
              Você não possui rotas atribuídas no momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {routes.map((route: any) => (
            <Card key={route.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {new Date(route.route_date).toLocaleDateString('pt-BR')}
                      {getStatusBadge(route.status)}
                    </CardTitle>
                    <CardDescription>
                      Veículo: {route.vehicles?.brand} {route.vehicles?.model} - {route.vehicles?.plate}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {route.status === 'pending' && (
                      <Button size="sm" onClick={() => startRoute(route.id)}>
                        <Play className="h-4 w-4 mr-1" />
                        Iniciar
                      </Button>
                    )}
                    {route.status === 'in_progress' && (
                      <Button size="sm" variant="outline" onClick={() => completeRoute(route.id)}>
                        <Square className="h-4 w-4 mr-1" />
                        Finalizar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Saída:</strong> {route.departure_time || 'Não definido'}
                    </div>
                    <div>
                      <strong>Retorno:</strong> {route.return_time || 'Não definido'}
                    </div>
                    <div>
                      <strong>Entregas:</strong> {route.route_stops?.filter((stop: any) => stop.completed).length || 0} de {route.route_stops?.length || 0}
                    </div>
                  </div>

                  {route.route_stops && route.route_stops.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Entregas:</h4>
                      <div className="space-y-2">
                        {route.route_stops
                          .sort((a: any, b: any) => a.stop_number - b.stop_number)
                          .map((stop: any) => (
                          <div
                            key={stop.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              stop.completed 
                                ? 'bg-green-50 border-green-200 text-green-800' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">#{stop.stop_number}</span>
                                <span>{stop.customers?.name}</span>
                                {stop.completed && <CheckCircle className="h-4 w-4 text-green-600" />}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {stop.customers?.address}
                              </p>
                              {stop.delivery_time && (
                                <p className="text-xs text-muted-foreground">
                                  Entregue às {stop.delivery_time}
                                </p>
                              )}
                            </div>
                            {route.status === 'in_progress' && !stop.completed && (
                              <Button
                                size="sm"
                                onClick={() => openStopDialog(route, stop)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Entregar
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stop Completion Dialog */}
      <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Entrega</DialogTitle>
            <DialogDescription>
              {selectedStop && `Entrega #${selectedStop.stop_number} - ${selectedStop.customers?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Observações da Entrega</Label>
              <Textarea
                id="notes"
                value={stopFormData.notes}
                onChange={(e) => setStopFormData({ ...stopFormData, notes: e.target.value })}
                placeholder="Adicione observações sobre a entrega..."
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Adicionar Foto
              </Button>
              <Button variant="outline" className="flex-1">
                <PenTool className="h-4 w-4 mr-2" />
                Coletar Assinatura
              </Button>
            </div>

            <Button onClick={completeStop} className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Entrega
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}