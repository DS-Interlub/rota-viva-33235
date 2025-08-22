import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin, Clock, Truck, Edit2, Trash2, Route, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Routes() {
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [formData, setFormData] = useState({
    driver_id: '',
    vehicle_id: '',
    route_date: '',
    departure_time: '',
    return_time: '',
    initial_km: '',
    final_km: '',
    selectedCustomers: []
  });
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [showDivideDialog, setShowDivideDialog] = useState(false);
  const [routeDivisions, setRouteDivisions] = useState([]);
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
          route_stops(id, customer_id, completed, customers(name))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem gerenciar rotas.",
        variant: "destructive",
      });
      return;
    }

    try {
      const routeData = {
        driver_id: formData.driver_id,
        vehicle_id: formData.vehicle_id,
        route_date: formData.route_date,
        departure_time: formData.departure_time || null,
        return_time: formData.return_time || null,
        initial_km: formData.initial_km ? parseInt(formData.initial_km) : null,
        final_km: formData.final_km ? parseInt(formData.final_km) : null,
      };

      let routeId;
      if (editingRoute) {
        const { error } = await supabase
          .from('routes')
          .update(routeData)
          .eq('id', editingRoute.id);
        
        if (error) throw error;
        routeId = editingRoute.id;
        
        toast({
          title: "Sucesso",
          description: "Rota atualizada com sucesso!",
        });
      } else {
        const { data: newRoute, error } = await supabase
          .from('routes')
          .insert([routeData])
          .select()
          .single();
        
        if (error) throw error;
        routeId = newRoute.id;
        
        toast({
          title: "Sucesso",
          description: "Rota criada com sucesso!",
        });
      }

      // Create route stops for selected customers
      if (formData.selectedCustomers.length > 0 && !editingRoute) {
        const stops = formData.selectedCustomers.map((customerId: string, index: number) => ({
          route_id: routeId,
          customer_id: customerId,
          stop_number: index + 1,
          completed: false
        }));

        const { error: stopsError } = await supabase
          .from('route_stops')
          .insert(stops);

        if (stopsError) throw stopsError;
      }

      setIsDialogOpen(false);
      setEditingRoute(null);
      setFormData({
        driver_id: '',
        vehicle_id: '',
        route_date: '',
        departure_time: '',
        return_time: '',
        initial_km: '',
        final_km: '',
        selectedCustomers: []
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar rota:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar rota.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    setFormData({
      driver_id: route.driver_id,
      vehicle_id: route.vehicle_id,
      route_date: route.route_date,
      departure_time: route.departure_time || '',
      return_time: route.return_time || '',
      initial_km: route.initial_km?.toString() || '',
      final_km: route.final_km?.toString() || '',
      selectedCustomers: route.route_stops?.map((stop: any) => stop.customer_id) || []
    });
    setIsDialogOpen(true);
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

  const optimizeRoute = () => {
    if (formData.selectedCustomers.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um cliente para otimizar a rota.",
        variant: "default",
      });
      return;
    }

    // Otimização simples: ordenar por cidade e endereço
    const selectedCustomersData = customers.filter(customer => 
      formData.selectedCustomers.includes(customer.id)
    );

    const optimized = [...selectedCustomersData].sort((a, b) => {
      // Ordenar primeiro por cidade (assumindo que está no endereço)
      const cityA = a.address.split(',').slice(-2)[0]?.trim() || '';
      const cityB = b.address.split(',').slice(-2)[0]?.trim() || '';
      
      if (cityA !== cityB) {
        return cityA.localeCompare(cityB);
      }
      
      // Se mesma cidade, ordenar por nome do cliente
      return a.name.localeCompare(b.name);
    });

    setOptimizedRoute(optimized);
    
    // Atualizar a ordem dos clientes selecionados
    setFormData({
      ...formData,
      selectedCustomers: optimized.map(c => c.id)
    });

    toast({
      title: "Sucesso",
      description: `Rota otimizada com ${optimized.length} paradas!`,
    });
  };

  const divideRoute = () => {
    if (optimizedRoute.length === 0) {
      toast({
        title: "Aviso",
        description: "Primeiro otimize a rota antes de dividir entre motoristas.",
        variant: "default",
      });
      return;
    }

    // Dividir a rota automaticamente entre os motoristas disponíveis
    const availableDrivers = drivers.length;
    const stopsPerDriver = Math.ceil(optimizedRoute.length / availableDrivers);
    
    const divisions = [];
    for (let i = 0; i < availableDrivers && i * stopsPerDriver < optimizedRoute.length; i++) {
      const driverStops = optimizedRoute.slice(
        i * stopsPerDriver, 
        (i + 1) * stopsPerDriver
      );
      
      if (driverStops.length > 0) {
        divisions.push({
          driver_id: drivers[i]?.id || '',
          driver_name: drivers[i]?.name || '',
          stops: driverStops,
          stopCount: driverStops.length
        });
      }
    }
    
    setRouteDivisions(divisions);
    setShowDivideDialog(true);
  };

  const createDividedRoutes = async () => {
    if (!formData.vehicle_id || !formData.route_date) {
      toast({
        title: "Erro",
        description: "Selecione um veículo e data antes de criar as rotas divididas.",
        variant: "destructive",
      });
      return;
    }

    try {
      for (const division of routeDivisions) {
        if (!division.driver_id || division.stops.length === 0) continue;

        const routeData = {
          driver_id: division.driver_id,
          vehicle_id: formData.vehicle_id,
          route_date: formData.route_date,
          departure_time: formData.departure_time || null,
          return_time: formData.return_time || null,
          initial_km: formData.initial_km ? parseInt(formData.initial_km) : null,
          final_km: formData.final_km ? parseInt(formData.final_km) : null,
        };

        const { data: newRoute, error } = await supabase
          .from('routes')
          .insert([routeData])
          .select()
          .single();
        
        if (error) throw error;

        // Criar paradas para esta divisão
        const stops = division.stops.map((customer: any, index: number) => ({
          route_id: newRoute.id,
          customer_id: customer.id,
          stop_number: index + 1,
          completed: false
        }));

        const { error: stopsError } = await supabase
          .from('route_stops')
          .insert(stops);

        if (stopsError) throw stopsError;
      }

      toast({
        title: "Sucesso",
        description: `${routeDivisions.length} rotas criadas com sucesso!`,
      });

      setShowDivideDialog(false);
      setIsDialogOpen(false);
      setOptimizedRoute([]);
      setRouteDivisions([]);
      setFormData({
        driver_id: '',
        vehicle_id: '',
        route_date: '',
        departure_time: '',
        return_time: '',
        initial_km: '',
        final_km: '',
        selectedCustomers: []
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao criar rotas divididas:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar rotas divididas.",
        variant: "destructive",
      });
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
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingRoute(null);
                setFormData({
                  driver_id: '',
                  vehicle_id: '',
                  route_date: '',
                  departure_time: '',
                  return_time: '',
                  initial_km: '',
                  final_km: '',
                  selectedCustomers: []
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Rota
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRoute ? 'Editar Rota' : 'Nova Rota'}</DialogTitle>
                <DialogDescription>
                  {editingRoute ? 'Edite as informações da rota' : 'Crie uma nova rota de entrega'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="driver_id">Motorista *</Label>
                    <Select value={formData.driver_id} onValueChange={(value) => setFormData({ ...formData, driver_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((driver: any) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vehicle_id">Veículo *</Label>
                    <Select value={formData.vehicle_id} onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((vehicle: any) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.plate} - {vehicle.brand} {vehicle.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="route_date">Data da Rota *</Label>
                    <Input
                      id="route_date"
                      type="date"
                      value={formData.route_date}
                      onChange={(e) => setFormData({ ...formData, route_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="departure_time">Horário de Saída</Label>
                    <Input
                      id="departure_time"
                      type="time"
                      value={formData.departure_time}
                      onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="return_time">Horário de Retorno</Label>
                    <Input
                      id="return_time"
                      type="time"
                      value={formData.return_time}
                      onChange={(e) => setFormData({ ...formData, return_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="initial_km">KM Inicial</Label>
                    <Input
                      id="initial_km"
                      type="number"
                      value={formData.initial_km}
                      onChange={(e) => setFormData({ ...formData, initial_km: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="final_km">KM Final</Label>
                    <Input
                      id="final_km"
                      type="number"
                      value={formData.final_km}
                      onChange={(e) => setFormData({ ...formData, final_km: e.target.value })}
                    />
                  </div>
                </div>

                {!editingRoute && (
                  <div className="space-y-4">
                    <div>
                      <Label>Clientes para Entrega</Label>
                      <div className="border rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
                        {optimizedRoute.length > 0 ? (
                          optimizedRoute.map((customer: any, index) => (
                            <div key={customer.id} className="flex items-center space-x-2 bg-green-50 p-2 rounded">
                              <span className="font-semibold text-green-600">{index + 1}.</span>
                              <span className="text-sm">
                                {customer.name} - {customer.address}
                              </span>
                            </div>
                          ))
                        ) : (
                          customers.map((customer: any) => (
                            <div key={customer.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`customer-${customer.id}`}
                                checked={formData.selectedCustomers.includes(customer.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      selectedCustomers: [...formData.selectedCustomers, customer.id]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      selectedCustomers: formData.selectedCustomers.filter(id => id !== customer.id)
                                    });
                                  }
                                }}
                              />
                              <label htmlFor={`customer-${customer.id}`} className="text-sm">
                                {customer.name} - {customer.address}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    {formData.selectedCustomers.length > 0 && (
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={optimizeRoute}
                          className="flex-1"
                        >
                          <Route className="h-4 w-4 mr-2" />
                          Otimizar Rota
                        </Button>
                        {optimizedRoute.length > 1 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={divideRoute}
                            className="flex-1"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Dividir entre Motoristas
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full">
                  {editingRoute ? 'Atualizar' : 'Criar'} Rota
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dialog para dividir rotas */}
      <Dialog open={showDivideDialog} onOpenChange={setShowDivideDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dividir Rota entre Motoristas</DialogTitle>
            <DialogDescription>
              O sistema dividiu automaticamente as {optimizedRoute.length} paradas entre {routeDivisions.length} motoristas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {routeDivisions.map((division: any, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Motorista: {division.driver_name}
                  </CardTitle>
                  <CardDescription>
                    {division.stopCount} paradas atribuídas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {division.stops.map((customer: any, stopIndex: number) => (
                      <div key={customer.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="font-semibold text-blue-600">
                          {stopIndex + 1}.
                        </span>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.address}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDivideDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createDividedRoutes}>
              Criar {routeDivisions.length} Rotas
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  {isAdmin && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(route)}>
                        <Edit2 className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(route.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </>
                  )}
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