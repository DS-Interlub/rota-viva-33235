import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin, Clock, Truck, Edit2, Trash2, Route, Split, Merge, Zap } from 'lucide-react';
import { RouteSplitter } from '@/components/RouteSplitter';
import { RouteMerger } from '@/components/RouteMerger';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Routes() {
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRouteForSplit, setSelectedRouteForSplit] = useState<any>(null);
  const [isMergerOpen, setIsMergerOpen] = useState(false);
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

  const createRoute = async () => {
    if (selectedCustomers.length === 0 || !selectedDate || !selectedDriver || !selectedVehicle) {
      toast({
        title: "Erro",
        description: "Selecione a data, motorista, veículo e pelo menos um cliente.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .insert({
          route_date: selectedDate,
          driver_id: selectedDriver,
          vehicle_id: selectedVehicle,
          status: 'pending'
        })
        .select()
        .single();

      if (routeError) throw routeError;

      const stopPromises = selectedCustomers.map((customerId, index) => 
        supabase
          .from('route_stops')
          .insert({
            route_id: routeData.id,
            customer_id: customerId,
            stop_number: index + 1
          })
      );

      await Promise.all(stopPromises);

      toast({
        title: "Sucesso",
        description: "Rota criada com sucesso!",
      });

      setSelectedCustomers([]);
      setSelectedDriver('');
      setSelectedVehicle('');
      setSelectedDate('');
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
                  setSelectedDriver('');
                  setSelectedVehicle('');
                  setSelectedDate('');
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Rota
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Rota</DialogTitle>
                <DialogDescription>
                  Crie uma nova rota selecionando motorista, veículo e clientes
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="route-date">Data da Rota</Label>
                    <Input
                      id="route-date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="driver-select">Motorista</Label>
                    <select
                      id="driver-select"
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
                    <Label htmlFor="vehicle-select">Veículo</Label>
                    <select
                      id="vehicle-select"
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

                <div>
                  <Label>Selecione os Clientes para Entrega</Label>
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                    {customers.map((customer: any) => (
                      <div key={customer.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`customer-${customer.id}`}
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomers([...selectedCustomers, customer.id]);
                            } else {
                              setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                            }
                          }}
                        />
                        <label htmlFor={`customer-${customer.id}`} className="text-sm cursor-pointer">
                          <strong>{customer.name}</strong> - {customer.address}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedCustomers.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedCustomers.length} cliente(s) selecionado(s)
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={createRoute}
                    disabled={selectedCustomers.length === 0 || !selectedDate || !selectedDriver || !selectedVehicle}
                    className="w-full"
                  >
                    <Route className="h-4 w-4 mr-2" />
                    Criar Rota
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

      {/* Modais de Divisão e Mesclagem */}
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
    </div>
  );
}