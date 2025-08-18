import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Package, Truck, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalRoutes: 0,
    completedRoutes: 0,
    pendingRoutes: 0,
    totalDrivers: 0,
    totalCustomers: 0,
  });
  const [todayRoutes, setTodayRoutes] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchTodayRoutes();
  }, []);

  const fetchStats = async () => {
    try {
      const [routesRes, driversRes, customersRes] = await Promise.all([
        supabase.from('routes').select('status'),
        supabase.from('drivers').select('id'),
        supabase.from('customers').select('id'),
      ]);

      const routes = routesRes.data || [];
      const completedRoutes = routes.filter(r => r.status === 'completed').length;
      const pendingRoutes = routes.filter(r => r.status === 'pending').length;

      setStats({
        totalRoutes: routes.length,
        completedRoutes,
        pendingRoutes,
        totalDrivers: driversRes.data?.length || 0,
        totalCustomers: customersRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const fetchTodayRoutes = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('routes')
        .select(`
          *,
          drivers(name),
          vehicles(plate)
        `)
        .eq('route_date', today)
        .order('created_at', { ascending: false });

      setTodayRoutes(data || []);
    } catch (error) {
      console.error('Erro ao buscar rotas de hoje:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao sistema de gestão de entregas
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Rotas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoutes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotas Concluídas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedRoutes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Motoristas</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDrivers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Rotas de hoje */}
      <Card>
        <CardHeader>
          <CardTitle>Rotas de Hoje</CardTitle>
          <CardDescription>
            Rotas programadas para hoje
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayRoutes.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma rota programada para hoje
            </p>
          ) : (
            <div className="space-y-4">
              {todayRoutes.map((route: any) => (
                <div key={route.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{route.drivers?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Veículo: {route.vehicles?.plate}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {route.status === 'pending' ? 'Pendente' : 
                               route.status === 'in_progress' ? 'Em andamento' : 'Concluída'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}