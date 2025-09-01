import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Truck, MapPin } from 'lucide-react';

interface RouteAssignmentProps {
  route: any;
  drivers: any[];
  vehicles: any[];
  onClose: () => void;
  onUpdate: () => void;
}

export function RouteAssignment({ route, drivers, vehicles, onClose, onUpdate }: RouteAssignmentProps) {
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAssignment = async () => {
    if (!selectedDriver || !selectedVehicle) {
      toast({
        title: "Erro",
        description: "Selecione um motorista e um veículo para a rota.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('routes')
        .update({
          driver_id: selectedDriver,
          vehicle_id: selectedVehicle,
          status: 'pending'
        })
        .eq('id', route.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Motorista e veículo atribuídos com sucesso!",
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erro ao atribuir motorista e veículo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atribuir motorista e veículo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atribuir Motorista e Veículo</DialogTitle>
          <DialogDescription>
            Rota de {new Date(route.route_date).toLocaleDateString('pt-BR')} - {route.route_stops?.length || 0} paradas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo da Rota */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Resumo da Rota
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Data:</strong> {new Date(route.route_date).toLocaleDateString('pt-BR')}</p>
                <p><strong>Paradas:</strong> {route.route_stops?.length || 0}</p>
                {route.route_stops && route.route_stops.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">Clientes:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {route.route_stops.map((stop: any, index: number) => (
                        <div key={stop.id} className="text-sm text-muted-foreground">
                          {index + 1}. {stop.customers?.name}
                          {stop.weight_kg > 0 && ` (${stop.weight_kg}kg)`}
                          {stop.volume_m3 > 0 && ` (${stop.volume_m3}m³)`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Motorista */}
          <div>
            <Label htmlFor="driver-select" className="flex items-center gap-2 text-base font-medium mb-3">
              <User className="h-4 w-4" />
              Selecionar Motorista
            </Label>
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

          {/* Seleção de Veículo */}
          <div>
            <Label htmlFor="vehicle-select" className="flex items-center gap-2 text-base font-medium mb-3">
              <Truck className="h-4 w-4" />
              Selecionar Veículo
            </Label>
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

          {/* Botões */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignment} 
              disabled={!selectedDriver || !selectedVehicle || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Atribuindo...' : 'Atribuir e Ativar Rota'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}