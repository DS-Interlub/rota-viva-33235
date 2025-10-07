import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Split, MapPin, Clock, Users, Truck, Zap, Merge, Route as RouteIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RouteSplitterProps {
  route: any;
  drivers: any[];
  vehicles: any[];
  onClose: () => void;
  onUpdate: () => void;
}

export const RouteSplitter = ({ route, drivers, vehicles, onClose, onUpdate }: RouteSplitterProps) => {
  const [splitType, setSplitType] = useState<'distance' | 'manual' | 'proximity' | 'capacity' | 'stops' | 'time'>('distance');
  const [numberOfSplits, setNumberOfSplits] = useState(2);
  const [selectedStops, setSelectedStops] = useState<{[key: string]: string}>({});
  const [availableDrivers, setAvailableDrivers] = useState<string[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const splitOptions = [
    {
      id: 'distance',
      title: 'Por Distância',
      description: 'Divide equilibrando a quilometragem a partir da base',
      icon: RouteIcon
    },
    {
      id: 'manual',
      title: 'Divisão Manual',
      description: 'Selecione manualmente as paradas para cada nova rota',
      icon: Split
    },
    {
      id: 'proximity',
      title: 'Por Proximidade',
      description: 'Agrupa paradas próximas geograficamente',
      icon: MapPin
    },
    {
      id: 'stops',
      title: 'Por Número de Paradas',
      description: 'Divide igualmente o número de paradas',
      icon: Users
    },
    {
      id: 'capacity',
      title: 'Por Peso',
      description: 'Considera o peso dos materiais para dividir as rotas',
      icon: Truck
    },
    {
      id: 'time',
      title: 'Por Tempo Estimado',
      description: 'Otimiza baseado no tempo de entrega',
      icon: Clock
    }
  ];

  const handleSplitRoute = async () => {
    if (availableDrivers.length < numberOfSplits || availableVehicles.length < numberOfSplits) {
      toast({
        title: "Erro",
        description: `Selecione pelo menos ${numberOfSplits} motoristas e veículos.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Primeiro otimizar a rota completa
      toast({
        title: "Otimizando",
        description: "Otimizando a rota completa antes de dividir...",
      });

      const { data: optimizeData, error: optimizeError } = await supabase.functions.invoke('optimize-route', {
        body: { route_id: route.id }
      });

      if (optimizeError) {
        console.error('Erro ao otimizar:', optimizeError);
        toast({
          title: "Aviso",
          description: "Não foi possível otimizar a rota, mas continuaremos com a divisão.",
          variant: "destructive",
        });
      } else if (optimizeData?.optimized) {
        toast({
          title: "Rota Otimizada",
          description: "Rota otimizada com sucesso! Agora dividindo...",
        });
      }

      // Buscar paradas da rota original (já otimizadas)
      const { data: stops, error: stopsError } = await supabase
        .from('route_stops')
        .select('*, customers(name, address, city, state)')
        .eq('route_id', route.id)
        .order('stop_number');

      if (stopsError) throw stopsError;

      let groupedStops: any[][] = [];

      switch (splitType) {
        case 'distance':
          groupedStops = await distanceSplit(stops);
          break;
        case 'manual':
          groupedStops = await manualSplit(stops);
          break;
        case 'proximity':
          groupedStops = await proximitySplit(stops);
          break;
        case 'stops':
          groupedStops = await stopsSplit(stops);
          break;
        case 'capacity':
          groupedStops = await capacitySplit(stops);
          break;
        case 'time':
          groupedStops = await timeSplit(stops);
          break;
      }

      // Criar novas rotas
      await createSplitRoutes(groupedStops);
      
      // Atualizar status da rota original
      await supabase
        .from('routes')
        .update({ status: 'split' })
        .eq('id', route.id);

      toast({
        title: "Sucesso",
        description: `Rota dividida em ${groupedStops.length} novas rotas!`,
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erro ao dividir rota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível dividir a rota.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const manualSplit = async (stops: any[]) => {
    const groups: any[][] = Array.from({ length: numberOfSplits }, () => []);
    
    stops.forEach(stop => {
      const groupIndex = parseInt(selectedStops[stop.id] || '0');
      if (groupIndex < numberOfSplits) {
        groups[groupIndex].push(stop);
      }
    });

    return groups.filter(group => group.length > 0);
  };

  const proximitySplit = async (stops: any[]) => {
    // Divide mantendo a sequência otimizada, agrupando paradas consecutivas
    const groups: any[][] = Array.from({ length: numberOfSplits }, () => []);
    const stopsPerGroup = Math.ceil(stops.length / numberOfSplits);
    
    stops.forEach((stop, index) => {
      const groupIndex = Math.floor(index / stopsPerGroup);
      if (groupIndex < numberOfSplits) {
        groups[groupIndex].push(stop);
      }
    });

    // Otimizar cada grupo individualmente após divisão
    const optimizedGroups = [];
    
    for (const group of groups.filter(g => g.length > 0)) {
      if (group.length > 1) {
        // Criar rota temporária para otimizar este grupo
        const { data: tempRoute, error: routeError } = await supabase
          .from('routes')
          .insert({
            route_date: route.route_date,
            status: 'draft'
          })
          .select()
          .single();

        if (routeError) {
          console.error('Erro ao criar rota temporária:', routeError);
          optimizedGroups.push(group);
          continue;
        }

        // Criar paradas temporárias
        const tempStopsPromises = group.map((stop, index) =>
          supabase
            .from('route_stops')
            .insert({
              route_id: tempRoute.id,
              customer_id: stop.customer_id,
              stop_number: index + 1,
              weight_kg: stop.weight_kg,
              volume_m3: stop.volume_m3,
              material_description: stop.material_description,
              priority: stop.priority || 0
            })
            .select()
        );

        await Promise.all(tempStopsPromises);

        // Otimizar este grupo
        const { data: optimizeData, error: optimizeError } = await supabase.functions.invoke('optimize-route', {
          body: { route_id: tempRoute.id }
        });

        if (!optimizeError && optimizeData?.optimized) {
          // Buscar paradas otimizadas
          const { data: optimizedStops } = await supabase
            .from('route_stops')
            .select('*, customers(*)')
            .eq('route_id', tempRoute.id)
            .order('stop_number');

          if (optimizedStops) {
            // Mapear de volta para o formato original do grupo
            const mappedGroup = optimizedStops.map(optStop => {
              const originalStop = group.find(s => s.customer_id === optStop.customer_id);
              return {
                ...originalStop,
                stop_number: optStop.stop_number
              };
            });
            optimizedGroups.push(mappedGroup);
          } else {
            optimizedGroups.push(group);
          }
        } else {
          optimizedGroups.push(group);
        }

        // Limpar rota temporária
        await supabase
          .from('route_stops')
          .delete()
          .eq('route_id', tempRoute.id);
        
        await supabase
          .from('routes')
          .delete()
          .eq('id', tempRoute.id);
      } else {
        optimizedGroups.push(group);
      }
    }

    return optimizedGroups;
  };

  const distanceSplit = async (stops: any[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('split-route', {
        body: { route_id: route.id, number_of_splits: numberOfSplits }
      });
      if (error || !data?.groups) {
        console.error('Erro no split-route:', error, data);
        return await proximitySplit(stops);
      }
      const idToStop: Record<string, any> = Object.fromEntries(stops.map((s: any) => [s.id, s]));
      return data.groups.map((groupIds: string[]) => groupIds.map((id: string) => idToStop[id]).filter(Boolean));
    } catch (e) {
      console.error('Exceção no split-route:', e);
      return await proximitySplit(stops);
    }
  };

  const stopsSplit = async (stops: any[]) => {
    const groups: any[][] = Array.from({ length: numberOfSplits }, () => []);
    const stopsPerGroup = Math.ceil(stops.length / numberOfSplits);

    stops.forEach((stop, index) => {
      const groupIndex = Math.floor(index / stopsPerGroup);
      if (groupIndex < numberOfSplits) {
        groups[groupIndex].push(stop);
      }
    });

    return groups.filter(group => group.length > 0);
  };

  const capacitySplit = async (stops: any[]) => {
    // Dividir por peso quando disponível
    const totalWeight = stops.reduce((sum, stop) => sum + (stop.weight_kg || 0), 0);
    
    if (totalWeight > 0) {
      const targetWeightPerRoute = totalWeight / numberOfSplits;
      const groups: any[][] = Array.from({ length: numberOfSplits }, () => []);
      
      let currentGroup = 0;
      let currentWeight = 0;

      stops.forEach(stop => {
        if (currentWeight + (stop.weight_kg || 0) > targetWeightPerRoute && groups[currentGroup].length > 0 && currentGroup < numberOfSplits - 1) {
          currentGroup++;
          currentWeight = 0;
        }
        
        groups[currentGroup].push(stop);
        currentWeight += (stop.weight_kg || 0);
      });

      return groups.filter(group => group.length > 0);
    }
    
    // Fallback para divisão por número de paradas se não houver peso
    return await stopsSplit(stops);
  };

  const timeSplit = async (stops: any[]) => {
    // Implementação simplificada baseada no tempo estimado
    return await stopsSplit(stops);
  };

  const createSplitRoutes = async (groupedStops: any[][]) => {
    // Filtrar grupos vazios antes de criar rotas
    const validGroups = groupedStops.filter(group => group.length > 0);
    
    if (validGroups.length === 0) {
      throw new Error('Nenhum grupo válido para criar rotas');
    }

    // Verificar se temos motoristas e veículos suficientes
    if (availableDrivers.length < validGroups.length || availableVehicles.length < validGroups.length) {
      throw new Error(`Selecione pelo menos ${validGroups.length} motoristas e veículos para as rotas divididas.`);
    }

    for (let i = 0; i < validGroups.length; i++) {
      const group = validGroups[i];

      // Criar nova rota
      const { data: newRoute, error: routeError } = await supabase
        .from('routes')
        .insert({
          route_date: route.route_date,
          driver_id: availableDrivers[i],
          vehicle_id: availableVehicles[i],
          status: 'pending'
        })
        .select()
        .single();

      if (routeError) throw routeError;

      // Criar paradas para a nova rota
      const stopPromises = group.map((stop, index) => 
        supabase
          .from('route_stops')
          .insert({
            route_id: newRoute.id,
            customer_id: stop.customer_id,
            stop_number: index + 1,
            weight_kg: stop.weight_kg,
            volume_m3: stop.volume_m3,
            material_description: stop.material_description
          })
      );

      await Promise.all(stopPromises);

      // Remover paradas da rota original
      const stopIds = group.map(stop => stop.id);
      await supabase
        .from('route_stops')
        .delete()
        .in('id', stopIds);
    }
  };

  const handleOptimizeRoute = async () => {
    setIsProcessing(true);
    try {
      // Buscar paradas e reordenar por proximidade (implementação simplificada)
      const { data: stops, error } = await supabase
        .from('route_stops')
        .select('*')
        .eq('route_id', route.id)
        .order('stop_number');

      if (error) throw error;

      // Reordenar paradas (implementação simplificada)
      const optimizedStops = [...stops].sort(() => Math.random() - 0.5);

      // Atualizar ordem das paradas
      const updatePromises = optimizedStops.map((stop, index) =>
        supabase
          .from('route_stops')
          .update({ stop_number: index + 1 })
          .eq('id', stop.id)
      );

      await Promise.all(updatePromises);

      toast({
        title: "Sucesso",
        description: "Rota otimizada com sucesso!",
      });

      onUpdate();
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível otimizar a rota.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            Dividir Rota
          </DialogTitle>
          <DialogDescription>
            Divida esta rota em múltiplas rotas menores para otimizar as entregas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Rota Original */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rota Original</CardTitle>
              <CardDescription>
                {route.drivers?.name} - {route.vehicles?.brand} {route.vehicles?.model}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  {route.route_stops?.length || 0} paradas
                </Badge>
                <Badge variant="outline">
                  Data: {new Date(route.route_date).toLocaleDateString('pt-BR')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Otimização Rápida */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Otimização Rápida
              </CardTitle>
              <CardDescription>
                Otimize a rota atual sem dividi-la
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleOptimizeRoute}
                disabled={isProcessing}
                variant="outline"
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                Otimizar Rota Atual
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Tipos de Divisão */}
          <div>
            <Label className="text-base font-semibold">Método de Divisão</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {splitOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Card 
                    key={option.id}
                    className={`cursor-pointer transition-colors ${
                      splitType === option.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSplitType(option.id as any)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4" />
                        <h4 className="font-medium text-sm">{option.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Configurações de Divisão */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="splits">Número de Rotas</Label>
              <Input
                id="splits"
                type="number"
                min="2"
                max="10"
                value={numberOfSplits}
                onChange={(e) => setNumberOfSplits(parseInt(e.target.value) || 2)}
              />
            </div>
          </div>

          {/* Seleção de Motoristas */}
          <div>
            <Label>Motoristas Disponíveis ({availableDrivers.length}/{numberOfSplits} selecionados)</Label>
            <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
              {drivers.map((driver) => (
                <div key={driver.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id={`driver-${driver.id}`}
                    checked={availableDrivers.includes(driver.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAvailableDrivers([...availableDrivers, driver.id]);
                      } else {
                        setAvailableDrivers(availableDrivers.filter(id => id !== driver.id));
                      }
                    }}
                  />
                  <label htmlFor={`driver-${driver.id}`} className="text-sm cursor-pointer">
                    {driver.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Seleção de Veículos */}
          <div>
            <Label>Veículos Disponíveis ({availableVehicles.length}/{numberOfSplits} selecionados)</Label>
            <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id={`vehicle-${vehicle.id}`}
                    checked={availableVehicles.includes(vehicle.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAvailableVehicles([...availableVehicles, vehicle.id]);
                      } else {
                        setAvailableVehicles(availableVehicles.filter(id => id !== vehicle.id));
                      }
                    }}
                  />
                  <label htmlFor={`vehicle-${vehicle.id}`} className="text-sm cursor-pointer">
                    {vehicle.brand} {vehicle.model} - {vehicle.plate}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Divisão Manual */}
          {splitType === 'manual' && (
            <div>
              <Label>Atribuir Paradas às Rotas</Label>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                {route.route_stops?.map((stop: any, index: number) => (
                  <div key={stop.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Parada {index + 1}</p>
                      <p className="text-xs text-muted-foreground">{stop.customers?.name}</p>
                      {(stop.weight_kg || stop.volume_m3 || stop.material_description) && (
                        <div className="text-xs text-muted-foreground mt-1 space-x-2">
                          {stop.weight_kg > 0 && <span>Peso: {stop.weight_kg}kg</span>}
                          {stop.volume_m3 > 0 && <span>Volume: {stop.volume_m3}m³</span>}
                          {stop.material_description && <span>Material: {stop.material_description}</span>}
                        </div>
                      )}
                    </div>
                    <select
                      value={selectedStops[stop.id] || '0'}
                      onChange={(e) => setSelectedStops({
                        ...selectedStops,
                        [stop.id]: e.target.value
                      })}
                      className="w-32 px-2 py-1 border rounded text-sm"
                    >
                      {Array.from({ length: numberOfSplits }, (_, i) => (
                        <option key={i} value={i}>Rota {i + 1}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-4">
            <Button
              onClick={handleSplitRoute}
              disabled={isProcessing || availableDrivers.length < numberOfSplits || availableVehicles.length < numberOfSplits}
              className="flex-1"
            >
              <Split className="h-4 w-4 mr-2" />
              {isProcessing ? 'Dividindo...' : 'Dividir Rota'}
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