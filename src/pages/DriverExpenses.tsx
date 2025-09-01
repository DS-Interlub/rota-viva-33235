import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Receipt, DollarSign, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function DriverExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    expense_type: 'combustivel',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    route_id: '',
    vehicle_id: ''
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  const isDriver = profile?.role === 'driver';

  useEffect(() => {
    if (isDriver) {
      fetchDriverData();
    }
  }, [isDriver, profile]);

  const fetchDriverData = async () => {
    if (!profile?.driver_id) return;

    try {
      const [expensesResult, routesResult, vehiclesResult] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            *,
            routes(route_date),
            vehicles(plate, brand, model)
          `)
          .eq('route_id', profile.driver_id)
          .order('expense_date', { ascending: false }),
        supabase
          .from('routes')
          .select('id, route_date, status')
          .eq('driver_id', profile.driver_id)
          .order('route_date', { ascending: false }),
        supabase
          .from('vehicles')
          .select('id, plate, brand, model')
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (routesResult.error) throw routesResult.error;
      if (vehiclesResult.error) throw vehiclesResult.error;

      setExpenses(expensesResult.data || []);
      setRoutes(routesResult.data || []);
      setVehicles(vehiclesResult.data || []);
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
    
    if (!formData.expense_type || !formData.amount || !formData.expense_date || !formData.vehicle_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          ...formData,
          amount: parseFloat(formData.amount),
          route_id: formData.route_id || null
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Despesa registrada com sucesso!",
      });

      setIsDialogOpen(false);
      setFormData({
        expense_type: 'combustivel',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        route_id: '',
        vehicle_id: ''
      });
      fetchDriverData();
    } catch (error) {
      console.error('Erro ao registrar despesa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a despesa.",
        variant: "destructive",
      });
    }
  };

  const expenseTypes = {
    combustivel: 'Combustível',
    pedagio: 'Pedágio',
    manutencao: 'Manutenção',
    alimentacao: 'Alimentação',
    estacionamento: 'Estacionamento',
    outros: 'Outros'
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
    return <div className="flex justify-center p-8">Carregando despesas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Minhas Despesas</h1>
          <p className="text-muted-foreground">
            Registre e acompanhe suas despesas de viagem
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nova Despesa</DialogTitle>
              <DialogDescription>
                Adicione uma nova despesa relacionada às suas viagens
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expense_type">Tipo de Despesa *</Label>
                  <select
                    id="expense_type"
                    value={formData.expense_type}
                    onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    required
                  >
                    {Object.entries(expenseTypes).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="amount">Valor (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expense_date">Data da Despesa *</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="vehicle_id">Veículo *</Label>
                  <select
                    id="vehicle_id"
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    required
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
                <Label htmlFor="route_id">Rota (opcional)</Label>
                <select
                  id="route_id"
                  value={formData.route_id}
                  onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="">Selecione uma rota</option>
                  {routes.map((route: any) => (
                    <option key={route.id} value={route.id}>
                      {new Date(route.route_date).toLocaleDateString('pt-BR')} - {route.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva a despesa..."
                />
              </div>

              <Button type="submit" className="w-full">
                Registrar Despesa
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma despesa registrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece registrando sua primeira despesa
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar primeira despesa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {expenses.map((expense: any) => (
            <Card key={expense.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {expenseTypes[expense.expense_type as keyof typeof expenseTypes]} - R$ {parseFloat(expense.amount).toFixed(2)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(expense.expense_date).toLocaleDateString('pt-BR')}
                      </span>
                      {expense.vehicles && (
                        <span>
                          Veículo: {expense.vehicles.brand} {expense.vehicles.model} - {expense.vehicles.plate}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {expense.description && (
                <CardContent>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                    <p className="text-sm">{expense.description}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}