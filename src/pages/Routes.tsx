import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin, Clock, Truck, Edit2, Trash2, Route, Split, Merge, Zap, Scale, UserPlus, CheckCircle } from 'lucide-react';
import { RouteSplitter } from '@/components/RouteSplitter';
import { RouteMerger } from '@/components/RouteMerger';
import { RouteAssignment } from '@/components/RouteAssignment';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Routes() {
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerMaterials, setCustomerMaterials] = useState<{[key: string]: {weight: number, volume: number, description: string}}>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRouteForSplit, setSelectedRouteForSplit] = useState<any>(null);
  const [isMergerOpen, setIsMergerOpen] = useState(false);
  const [selectedRouteForAssignment, setSelectedRouteForAssignment] = useState<any>(null);
  const [shouldSplitOnCreate, setShouldSplitOnCreate] = useState(false);
  const [splitMethod, setSplitMethod] = useState<'weight' | 'volume' | 'stops'>('weight');
  const [numberOfRoutesToCreate, setNumberOfRoutesToCreate] = useState(2);
  const { toast } = useToast();
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [routesResult, driversResult, vehiclesResult, customersResult] = await Promise.all([
        supabase.from('routes').select(`
          *,
          drivers(name),
          vehicles(plate, brand, model),
          route_stops(
            id, 
            customer_id, 
            completed, 
            stop_number,
            arrival_time,
            departure_time,
            receiver_name,
            receiver_email,
            receiver_department,
            notes,
            photos,
            signature_url,
            customers(name, address)
          )
        `).order('route_date', { ascending: false }),
        supabase.from('drivers').select('id, name'),
        supabase.from('vehicles').select('id, plate, brand, model'),
        supabase.from('customers').select('id, name, address')
      ]);

      if (routesResult.error) throw routesResult.error;
      if (driversResult.error) throw driversResult.error;
      if (vehiclesResult.error) throw vehiclesResult.error;
      if (customersResult.error) throw customersResult.error;

      setRoutes(routesResult.data || []);
      setDrivers(driversResult.data || []);
      setVehicles(vehiclesResult.data || []);
      setCustomers(customersResult.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRoute = async () => {
    if (selectedCustomers.length === 0 || !selectedDate) {
      toast({
        title: "Erro",
        description: "Selecione a data da rota e pelo menos um cliente.",
        variant: "destructive",
      });
      return;
    }


    try {
      if (shouldSplitOnCreate) {
        await createSplitRoutes();
      } else {
        await createSingleRoute();
      }

      // Reset form
      setSelectedCustomers([]);
      setCustomerMaterials({});
      setSelectedDate('');
      setShouldSplitOnCreate(false);
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao criar rota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a rota.",
        variant: "destructive",
      });
    }
  };

  const createSingleRoute = async () => {
    const { data: routeData, error: routeError } = await supabase
      .from('routes')
      .insert({
        route_date: selectedDate,
        driver_id: null,
        vehicle_id: null,
        status: 'draft'
      })
      .select()
      .single();

    if (routeError) throw routeError;

    const stopPromises = selectedCustomers.map((customerId, index) => {
      const materials = customerMaterials[customerId] || { weight: 0, volume: 0, description: '' };
      return supabase
        .from('route_stops')
        .insert({
          route_id: routeData.id,
          customer_id: customerId,
          stop_number: index + 1,
          weight_kg: materials.weight,
          volume_m3: materials.volume,
          material_description: materials.description
        });
    });

    await Promise.all(stopPromises);

    toast({
      title: "Sucesso",
      description: "Rota criada com sucesso! Agora você pode otimizar e atribuir motorista/veículo.",
    });
  };

  const createSplitRoutes = async () => {
    // Agrupar clientes por critério de divisão
    let groups: string[][] = [];

    if (splitMethod === 'weight') {
      groups = splitByWeight();
    } else if (splitMethod === 'volume') {
      groups = splitByVolume();
    } else {
      groups = splitByStops();
    }

    // Criar rotas sem atribuir motorista/veículo inicialmente - serão atribuídos após otimização
    for (let i = 0; i < Math.min(groups.length, numberOfRoutesToCreate); i++) {
      const group = groups[i];
      if (group.length === 0) continue;

      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .insert({
          route_date: selectedDate,
          driver_id: null, // Será atribuído depois
          vehicle_id: null, // Será atribuído depois
          status: 'draft' // Status draft para indicar que precisa de atribuição
        })
        .select()
        .single();

      if (routeError) throw routeError;

      const stopPromises = group.map((customerId, index) => {
        const materials = customerMaterials[customerId] || { weight: 0, volume: 0, description: '' };
        return supabase
          .from('route_stops')
          .insert({
            route_id: routeData.id,
            customer_id: customerId,
            stop_number: index + 1,
            weight_kg: materials.weight,
            volume_m3: materials.volume,
            material_description: materials.description
          });
      });

      await Promise.all(stopPromises);
    }

    toast({
      title: "Sucesso",
      description: `${Math.min(groups.length, numberOfRoutesToCreate)} rotas criadas com sucesso! Agora você pode atribuir motoristas/veículos.`,
    });
  };

  const splitByWeight = (): string[][] => {
    const totalWeight = selectedCustomers.reduce((sum, customerId) => {
      const materials = customerMaterials[customerId] || { weight: 0, volume: 0, description: '' };
      return sum + materials.weight;
    }, 0);
    
    const targetWeightPerRoute = totalWeight / numberOfRoutesToCreate;
    const groups: string[][] = Array.from({ length: numberOfRoutesToCreate }, () => []);
    
    let currentGroup = 0;
    let currentWeight = 0;

    selectedCustomers.forEach(customerId => {
      const materials = customerMaterials[customerId] || { weight: 0, volume: 0, description: '' };
      
      if (currentWeight + materials.weight > targetWeightPerRoute && groups[currentGroup].length > 0 && currentGroup < numberOfRoutesToCreate - 1) {
        currentGroup++;
        currentWeight = 0;
      }
      
      groups[currentGroup].push(customerId);
      currentWeight += materials.weight;
    });

    return groups.filter(group => group.length > 0);
  };

  const splitByVolume = (): string[][] => {
    const totalVolume = selectedCustomers.reduce((sum, customerId) => {
      const materials = customerMaterials[customerId] || { weight: 0, volume: 0, description: '' };
      return sum + materials.volume;
    }, 0);
    
    const targetVolumePerRoute = totalVolume / numberOfRoutesToCreate;
    const groups: string[][] = Array.from({ length: numberOfRoutesToCreate }, () => []);
    
    let currentGroup = 0;
    let currentVolume = 0;

    selectedCustomers.forEach(customerId => {
      const materials = customerMaterials[customerId] || { weight: 0, volume: 0, description: '' };
      
      if (currentVolume + materials.volume > targetVolumePerRoute && groups[currentGroup].length > 0 && currentGroup < numberOfRoutesToCreate - 1) {
        currentGroup++;
        currentVolume = 0;
      }
      
      groups[currentGroup].push(customerId);
      currentVolume += materials.volume;
    });

    return groups.filter(group => group.length > 0);
  };

  const splitByStops = (): string[][] => {
    const groups: string[][] = Array.from({ length: numberOfRoutesToCreate }, () => []);
    const stopsPerGroup = Math.ceil(selectedCustomers.length / numberOfRoutesToCreate);

    selectedCustomers.forEach((customerId, index) => {
      const groupIndex = Math.floor(index / stopsPerGroup);
      if (groupIndex < numberOfRoutesToCreate) {
        groups[groupIndex].push(customerId);
      }
    });

    return groups.filter(group => group.length > 0);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem excluir rotas.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta rota? Todas as paradas serão removidas.')) return;

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Rota excluída com sucesso!",
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir rota:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir rota.",
        variant: "destructive",
      });
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
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setSelectedCustomers([]);
                  setCustomerMaterials({});
                  setSelectedDate('');
                  setShouldSplitOnCreate(false);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Rota
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Rota</DialogTitle>
                <DialogDescription>
                  Crie uma nova rota selecionando a data e os clientes. Motorista e veículo serão atribuídos após otimização.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="route-date">Data da Rota</Label>
                    <Input
                      id="route-date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Selecione os Clientes para Entrega</Label>
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-3">
                    {customers.map((customer: any) => (
                      <div key={customer.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`customer-${customer.id}`}
                            checked={selectedCustomers.includes(customer.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomers([...selectedCustomers, customer.id]);
                              } else {
                                setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                                setCustomerMaterials({...customerMaterials, [customer.id]: undefined});
                              }
                            }}
                          />
                          <label htmlFor={`customer-${customer.id}`} className="text-sm cursor-pointer font-medium">
                            {customer.name} - {customer.address}
                          </label>
                        </div>
                        
                        {selectedCustomers.includes(customer.id) && (
                          <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
                            <div>
                              <Label className="text-xs">Peso (kg)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={customerMaterials[customer.id]?.weight || ''}
                                onChange={(e) => {
                                  const weight = parseFloat(e.target.value) || 0;
                                  setCustomerMaterials({
                                    ...customerMaterials,
                                    [customer.id]: {
                                      ...customerMaterials[customer.id],
                                      weight,
                                      volume: customerMaterials[customer.id]?.volume || 0,
                                      description: customerMaterials[customer.id]?.description || ''
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Volume (m³)</Label>
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                placeholder="0.000"
                                value={customerMaterials[customer.id]?.volume || ''}
                                onChange={(e) => {
                                  const volume = parseFloat(e.target.value) || 0;
                                  setCustomerMaterials({
                                    ...customerMaterials,
                                    [customer.id]: {
                                      ...customerMaterials[customer.id],
                                      weight: customerMaterials[customer.id]?.weight || 0,
                                      volume,
                                      description: customerMaterials[customer.id]?.description || ''
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Material</Label>
                              <Input
                                placeholder="Descrição do material"
                                value={customerMaterials[customer.id]?.description || ''}
                                onChange={(e) => {
                                  const description = e.target.value;
                                  setCustomerMaterials({
                                    ...customerMaterials,
                                    [customer.id]: {
                                      ...customerMaterials[customer.id],
                                      weight: customerMaterials[customer.id]?.weight || 0,
                                      volume: customerMaterials[customer.id]?.volume || 0,
                                      description
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedCustomers.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedCustomers.length} cliente(s) selecionado(s)
                    </p>
                  )}
                </div>

                {/* Divisão Automática */}
                {selectedCustomers.length > 1 && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="split-on-create"
                        checked={shouldSplitOnCreate}
                        onChange={(e) => setShouldSplitOnCreate(e.target.checked)}
                      />
                      <Label htmlFor="split-on-create" className="cursor-pointer font-medium">
                        Dividir automaticamente em múltiplas rotas
                      </Label>
                    </div>

                    {shouldSplitOnCreate && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Número de Rotas</Label>
                            <Input
                              type="number"
                              min="2"
                              max={Math.min(drivers.length, vehicles.length)}
                              value={numberOfRoutesToCreate}
                              onChange={(e) => setNumberOfRoutesToCreate(parseInt(e.target.value) || 2)}
                            />
                          </div>
                          
                          <div>
                            <Label>Método de Divisão</Label>
                            <select
                              value={splitMethod}
                              onChange={(e) => setSplitMethod(e.target.value as 'weight' | 'volume' | 'stops')}
                              className="w-full px-3 py-2 border border-input bg-background rounded-md"
                            >
                              <option value="weight">Por Peso</option>
                              <option value="volume">Por Volume</option>
                              <option value="stops">Por Número de Paradas</option>
                            </select>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <p>
                            <strong>Motoristas disponíveis:</strong> {drivers.length} | 
                            <strong> Veículos disponíveis:</strong> {vehicles.length}
                          </p>
                          {(drivers.length < numberOfRoutesToCreate || vehicles.length < numberOfRoutesToCreate) && (
                            <p className="text-destructive mt-1">
                              ⚠️ Você precisa de pelo menos {numberOfRoutesToCreate} motoristas e veículos para criar {numberOfRoutesToCreate} rotas.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button 
                    onClick={createRoute}
                    disabled={selectedCustomers.length === 0 || !selectedDate}
                    className="w-full"
                  >
                    <Route className="h-4 w-4 mr-2" />
                    {shouldSplitOnCreate ? `Criar ${numberOfRoutesToCreate} Rotas` : 'Criar Rota'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline"
            onClick={() => setIsMergerOpen(true)}
            disabled={routes.filter(r => r.status === 'pending' || r.status === 'in_progress').length < 2}
          >
            <Merge className="h-4 w-4 mr-2" />
            Mesclar Rotas
          </Button>
          </div>
        )}
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma rota encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando sua primeira rota de entrega
            </p>
            {isAdmin && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira rota
              </Button>
            )}
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
                      {route.drivers?.name || 'Sem motorista'}
                      {getStatusBadge(route.status)}
                    </CardTitle>
                    <CardDescription>
                      Data: {new Date(route.route_date).toLocaleDateString('pt-BR')} | 
                      Veículo: {route.vehicles ? `${route.vehicles.brand} ${route.vehicles.model} - ${route.vehicles.plate}` : 'Sem veículo'}
                    </CardDescription>
                  </div>
                  {route.status === 'draft' && (
                    <Button 
                      size="sm" 
onClick={() => setSelectedRouteForAssignment(route)}
                      className="ml-2"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Atribuir
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Horários da Base</p>
                      <p className="text-sm text-muted-foreground">
                        Saída: {route.base_departure_time || 'Não definido'} | 
                        Retorno: {route.base_arrival_time || 'Não definido'}
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

                {/* Detalhes das entregas */}
                {route.route_stops && route.route_stops.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-3">Entregas:</h4>
                    <div className="space-y-3">
                      {route.route_stops
                        .sort((a: any, b: any) => a.stop_number - b.stop_number)
                        .map((stop: any) => (
                        <div
                          key={stop.id}
                          className={`rounded-lg border ${
                            stop.completed 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">#{stop.stop_number}</span>
                              <span>{stop.customers?.name}</span>
                              {stop.completed && <CheckCircle className="h-4 w-4 text-green-600" />}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {stop.customers?.address}
                            </p>
                            
                            {/* Detalhes da entrega quando completada */}
                            {stop.completed && (
                              <div className="border-t border-green-200 mt-3 pt-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                  <div className="text-sm">
                                    <strong>Horários:</strong> {stop.arrival_time || 'N/A'} - {stop.departure_time || 'N/A'}
                                  </div>
                                  <div className="text-sm">
                                    <strong>Recebido por:</strong> {stop.receiver_name || 'N/A'}
                                  </div>
                                  {stop.receiver_email && (
                                    <div className="text-sm">
                                      <strong>E-mail:</strong> {stop.receiver_email}
                                    </div>
                                  )}
                                  {stop.receiver_department && (
                                    <div className="text-sm">
                                      <strong>Setor:</strong> {stop.receiver_department}
                                    </div>
                                  )}
                                </div>
                                
                                {stop.notes && (
                                  <div className="mb-3">
                                    <strong className="text-sm">Observações:</strong>
                                    <p className="text-sm text-muted-foreground mt-1">{stop.notes}</p>
                                  </div>
                                )}
                                
                                {/* Fotos da entrega */}
                                {stop.photos && stop.photos.length > 0 && (
                                  <div className="mb-3">
                                    <strong className="text-sm">Fotos da Entrega:</strong>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                      {stop.photos.map((photoUrl: string, index: number) => (
                                        <div key={index} className="relative group">
                                          <img
                                            src={photoUrl}
                                            alt={`Foto da entrega ${index + 1}`}
                                            className="w-full h-20 object-cover rounded-md border cursor-pointer hover:opacity-80"
                                            onClick={() => window.open(photoUrl, '_blank')}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Assinatura */}
                                {stop.signature_url && (
                                  <div>
                                    <strong className="text-sm">Assinatura:</strong>
                                    <div className="mt-2">
                                      <img
                                        src={stop.signature_url}
                                        alt="Assinatura do responsável"
                                        className="max-w-xs h-20 object-contain border rounded-md bg-white cursor-pointer hover:opacity-80"
                                        onClick={() => window.open(stop.signature_url, '_blank')}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                  {isAdmin && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedRouteForSplit(route)}
                        disabled={route.status === 'draft'}
                      >
                        <Split className="h-3 w-3 mr-1" />
                        Dividir
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(route.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modais de Divisão, Mesclagem e Atribuição */}
      {selectedRouteForSplit && (
        <RouteSplitter
          route={selectedRouteForSplit}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setSelectedRouteForSplit(null)}
          onUpdate={fetchData}
        />
      )}

      {isMergerOpen && (
        <RouteMerger
          routes={routes}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setIsMergerOpen(false)}
          onUpdate={fetchData}
        />
      )}

      {selectedRouteForAssignment && (
        <RouteAssignment
          route={selectedRouteForAssignment}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setSelectedRouteForAssignment(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}