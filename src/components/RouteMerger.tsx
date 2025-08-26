import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Merge, MapPin, Clock, Users, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RouteMergerProps {
  routes: any[];
  drivers: any[];
  vehicles: any[];
  onClose: () => void;
  onUpdate: () => void;
}

export const RouteMerger = ({ routes, drivers, vehicles, onClose, onUpdate }: RouteMergerProps) => {
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [mergeDate, setMergeDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleMergeRoutes = async () => {
    if (selectedRoutes.length < 2) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos 2 rotas para fusão.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDriver || !selectedVehicle || !mergeDate) {
      toast({
        title: "Erro",
        description: "Selecione motorista, veículo e data para a nova rota.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Criar nova rota mesclada
      const { data: newRoute, error: routeError } = await supabase
        .from('routes')
        .insert({
          route_date: mergeDate,
          driver_id: selectedDriver,
          vehicle_id: selectedVehicle,
          status: 'pending'
        })
        .select()
        .single();

      if (routeError) throw routeError;

      // Buscar todas as paradas das rotas selecionadas
      const { data: allStops, error: stopsError } = await supabase
        .from('route_stops')
        .select('*')
        .in('route_id', selectedRoutes);

      if (stopsError) throw stopsError;

      // Transferir paradas para a nova rota
      let stopNumber = 1;
      const updatePromises = allStops.map((stop) =>
        supabase
          .from('route_stops')
          .update({
            route_id: newRoute.id,
            stop_number: stopNumber++
          })
          .eq('id', stop.id)
      );

      await Promise.all(updatePromises);

      // Marcar rotas originais como mescladas
      await supabase
        .from('routes')
        .update({ status: 'merged' })
        .in('id', selectedRoutes);

      toast({
        title: "Sucesso",
        description: `${selectedRoutes.length} rotas foram mescladas com sucesso!`,
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erro ao mesclar rotas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível mesclar as rotas.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getRouteStats = (route: any) => {
    const totalStops = route.route_stops?.length || 0;
    const completedStops = route.route_stops?.filter((stop: any) => stop.completed).length || 0;
    
    return {
      totalStops,
      completedStops,
      pendingStops: totalStops - completedStops
    };
  };

  const selectedRouteData = routes.filter(route => selectedRoutes.includes(route.id));
  const totalStopsSelected = selectedRouteData.reduce((total, route) => total + (route.route_stops?.length || 0), 0);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Mesclar Rotas
          </DialogTitle>
          <DialogDescription>
            Combine múltiplas rotas em uma única rota otimizada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estatísticas das Rotas Selecionadas */}
          {selectedRoutes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Mesclagem</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{selectedRoutes.length}</div>
                    <div className="text-sm text-muted-foreground">Rotas Selecionadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{totalStopsSelected}</div>
                    <div className="text-sm text-muted-foreground">Total de Paradas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {selectedRouteData.reduce((total, route) => {
                        const stats = getRouteStats(route);
                        return total + stats.completedStops;
                      }, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Concluídas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {selectedRouteData.reduce((total, route) => {
                        const stats = getRouteStats(route);
                        return total + stats.pendingStops;
                      }, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Pendentes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seleção de Rotas */}
          <div>
            <Label className="text-base font-semibold">Selecionar Rotas para Mesclar</Label>
            <div className="grid gap-3 mt-3 max-h-60 overflow-y-auto">
              {routes.filter(route => route.status === 'pending' || route.status === 'in_progress').map((route) => {
                const stats = getRouteStats(route);
                return (
                  <Card 
                    key={route.id}
                    className={`cursor-pointer transition-colors ${
                      selectedRoutes.includes(route.id) ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      if (selectedRoutes.includes(route.id)) {
                        setSelectedRoutes(selectedRoutes.filter(id => id !== route.id));
                      } else {
                        setSelectedRoutes([...selectedRoutes, route.id]);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Truck className="h-4 w-4" />
                            <span className="font-medium text-sm">{route.drivers?.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {new Date(route.route_date).toLocaleDateString('pt-BR')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {route.vehicles?.brand} {route.vehicles?.model} - {route.vehicles?.plate}
                          </p>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{stats.totalStops} paradas</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{stats.completedStops}/{stats.totalStops} concluídas</span>
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedRoutes.includes(route.id)}
                          onChange={() => {}}
                          className="ml-4"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Configurações da Nova Rota */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="merge-date">Data da Nova Rota</Label>
              <input
                id="merge-date"
                type="date"
                value={mergeDate}
                onChange={(e) => setMergeDate(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              />
            </div>
            
            <div>
              <Label htmlFor="merge-driver">Motorista</Label>
              <select
                id="merge-driver"
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="">Selecione um motorista</option>
                {drivers.map((driver: any) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="merge-vehicle">Veículo</Label>
              <select
                id="merge-vehicle"
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="">Selecione um veículo</option>
                {vehicles.map((vehicle: any) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.brand} {vehicle.model} - {vehicle.plate}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4">
            <Button
              onClick={handleMergeRoutes}
              disabled={isProcessing || selectedRoutes.length < 2 || !selectedDriver || !selectedVehicle || !mergeDate}
              className="flex-1"
            >
              <Merge className="h-4 w-4 mr-2" />
              {isProcessing ? 'Mesclando...' : 'Mesclar Rotas'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};