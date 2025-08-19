import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Truck, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState({
    totalRoutes: 0,
    completedRoutes: 0,
    totalExpenses: 0,
    totalKm: 0,
    expensesByType: [],
    routesByDriver: [],
    monthlyExpenses: []
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      generateReport();
    }
  }, [startDate, endDate]);

  const generateReport = async () => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem acessar relatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch routes data
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select(`
          *,
          drivers(name),
          route_stops(completed)
        `)
        .gte('route_date', startDate)
        .lte('route_date', endDate);

      if (routesError) throw routesError;

      // Fetch expenses data
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      if (expensesError) throw expensesError;

      // Process data
      const totalRoutes = routes?.length || 0;
      const completedRoutes = routes?.filter(route => route.status === 'completed').length || 0;
      const totalExpenses = expenses?.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0) || 0;
      const totalKm = routes?.reduce((sum, route) => sum + (route.total_km || 0), 0) || 0;

      // Group expenses by type
      const expensesByType = expenses?.reduce((acc, expense) => {
        const existing = acc.find(item => item.name === expense.expense_type);
        if (existing) {
          existing.value += parseFloat(expense.amount.toString());
        } else {
          acc.push({ name: expense.expense_type, value: parseFloat(expense.amount.toString()) });
        }
        return acc;
      }, [] as any[]) || [];

      // Group routes by driver
      const routesByDriver = routes?.reduce((acc, route) => {
        const driverName = route.drivers?.name || 'Motorista não definido';
        const existing = acc.find(item => item.name === driverName);
        if (existing) {
          existing.routes += 1;
          existing.km += route.total_km || 0;
        } else {
          acc.push({ name: driverName, routes: 1, km: route.total_km || 0 });
        }
        return acc;
      }, [] as any[]) || [];

      // Group expenses by month
      const monthlyExpenses = expenses?.reduce((acc, expense) => {
        const month = new Date(expense.expense_date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        const existing = acc.find(item => item.month === month);
        if (existing) {
          existing.amount += parseFloat(expense.amount.toString());
        } else {
          acc.push({ month, amount: parseFloat(expense.amount.toString()) });
        }
        return acc;
      }, [] as any[]) || [];

      setReportData({
        totalRoutes,
        completedRoutes,
        totalExpenses,
        totalKm,
        expensesByType,
        routesByDriver,
        monthlyExpenses
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const data = {
      periodo: `${startDate} a ${endDate}`,
      ...reportData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${startDate}-${endDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
          <p className="text-muted-foreground">Apenas administradores podem acessar os relatórios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Análises e estatísticas do sistema de entregas
          </p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Date filters */}
      <Card>
        <CardHeader>
          <CardTitle>Período do Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={generateReport} disabled={loading}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Rotas</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalRoutes}</div>
            <p className="text-xs text-muted-foreground">
              {reportData.completedRoutes} concluídas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {reportData.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quilometragem Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalKm} km</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.totalRoutes > 0 ? Math.round((reportData.completedRoutes / reportData.totalRoutes) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Expenses by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.expensesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.expensesByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportData.expensesByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground">Nenhuma despesa encontrada no período</p>
            )}
          </CardContent>
        </Card>

        {/* Routes by Driver */}
        <Card>
          <CardHeader>
            <CardTitle>Rotas por Motorista</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.routesByDriver.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.routesByDriver}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="routes" fill="#8884d8" name="Rotas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground">Nenhuma rota encontrada no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Expenses */}
      {reportData.monthlyExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Despesas Mensais</CardTitle>
            <CardDescription>Evolução dos gastos ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.monthlyExpenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="amount" fill="#82ca9d" name="Valor" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}