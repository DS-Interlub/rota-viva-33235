import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Receipt, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    expense_type: '',
    description: '',
    expense_date: '',
    vehicle_id: '',
    route_id: ''
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';

  const expenseTypes = [
    'combustivel',
    'manutencao',
    'pedagio',
    'multa',
    'estacionamento',
    'outros'
  ];

  const expenseTypeLabels = {
    combustivel: 'Combustível',
    manutencao: 'Manutenção',
    pedagio: 'Pedágio',
    multa: 'Multa',
    estacionamento: 'Estacionamento',
    outros: 'Outros'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expensesResult, vehiclesResult, routesResult] = await Promise.all([
        supabase.from('expenses').select(`
          *,
          vehicles(plate, brand, model),
          routes(route_date, drivers(name))
        `).order('expense_date', { ascending: false }),
        supabase.from('vehicles').select('id, plate, brand, model'),
        supabase.from('routes').select('id, route_date, drivers(name)')
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (vehiclesResult.error) throw vehiclesResult.error;
      if (routesResult.error) throw routesResult.error;

      setExpenses(expensesResult.data || []);
      setVehicles(vehiclesResult.data || []);
      setRoutes(routesResult.data || []);
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
        description: "Apenas administradores podem gerenciar despesas.",
        variant: "destructive",
      });
      return;
    }

    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        route_id: formData.route_id || null
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);
        
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Despesa atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);
        
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Despesa cadastrada com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingExpense(null);
      setFormData({ amount: '', expense_type: '', description: '', expense_date: '', vehicle_id: '', route_id: '' });
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar despesa.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      expense_type: expense.expense_type,
      description: expense.description || '',
      expense_date: expense.expense_date,
      vehicle_id: expense.vehicle_id,
      route_id: expense.route_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem excluir despesas.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Despesa excluída com sucesso!",
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir despesa.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando despesas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Despesas</h1>
          <p className="text-muted-foreground">
            Controle de gastos dos veículos e rotas
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingExpense(null);
                setFormData({ amount: '', expense_type: '', description: '', expense_date: '', vehicle_id: '', route_id: '' });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
                <DialogDescription>
                  {editingExpense ? 'Edite as informações da despesa' : 'Registre uma nova despesa'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="expense_type">Tipo de Despesa *</Label>
                  <Select value={formData.expense_type} onValueChange={(value) => setFormData({ ...formData, expense_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {expenseTypeLabels[type as keyof typeof expenseTypeLabels]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Valor *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expense_date">Data *</Label>
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
                <div>
                  <Label htmlFor="route_id">Rota (Opcional)</Label>
                  <Select value={formData.route_id} onValueChange={(value) => setFormData({ ...formData, route_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a rota (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map((route: any) => (
                        <SelectItem key={route.id} value={route.id}>
                          {new Date(route.route_date).toLocaleDateString('pt-BR')} - {route.drivers?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detalhes sobre a despesa..."
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingExpense ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma despesa encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              {isAdmin ? 'Comece registrando a primeira despesa' : 'Nenhuma despesa registrada no sistema'}
            </p>
            {isAdmin && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar despesa
              </Button>
            )}
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
                      <Receipt className="h-5 w-5" />
                      {expenseTypeLabels[expense.expense_type as keyof typeof expenseTypeLabels]}
                      <span className="text-lg font-bold text-primary">
                        R$ {parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Data: {new Date(expense.expense_date).toLocaleDateString('pt-BR')} | 
                      Veículo: {expense.vehicles?.plate} - {expense.vehicles?.brand} {expense.vehicles?.model}
                      {expense.routes && (
                        <> | Rota: {new Date(expense.routes.route_date).toLocaleDateString('pt-BR')} - {expense.routes.drivers?.name}</>
                      )}
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(expense)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {expense.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{expense.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}