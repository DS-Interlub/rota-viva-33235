import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, MapPin, Clock, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RouteOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
  routeId: string;
  onOptimized: () => void;
}

export default function RouteOptimizer({ isOpen, onClose, routeId, onOptimized }: RouteOptimizerProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStops, setLoadingStops] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<{[key: string]: number}>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && routeId) {
      fetchStops();
    }
  }, [isOpen, routeId]);

  const fetchStops = async () => {
    setLoadingStops(true);
    try {
      const { data, error } = await supabase
        .from('route_stops')
        .select('id, stop_number, priority, customers(name, address, city)')
        .eq('route_id', routeId)
        .order('stop_number');

      if (error) throw error;
      
      setStops(data || []);
      
      // Inicializar prioridades com valores atuais
      const initialPriorities: {[key: string]: number} = {};
      data?.forEach(stop => {
        initialPriorities[stop.id] = stop.priority || 0;
      });
      setPriorities(initialPriorities);
    } catch (error) {
      console.error('Erro ao buscar paradas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as paradas da rota.",
        variant: "destructive",
      });
    } finally {
      setLoadingStops(false);
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch(priority) {
      case 3: return 'Urgente';
      case 2: return 'Alta';
      case 1: return 'Baixa';
      default: return 'Normal';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch(priority) {
      case 3: return 'text-red-600 font-semibold';
      case 2: return 'text-orange-600 font-semibold';
      case 1: return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-route', {
        body: { 
          route_id: routeId,
          priorities: priorities 
        }
      });

      if (error) throw error;

      if (data.optimized) {
        setResult(data);
        toast({
          title: "Rota Otimizada!",
          description: `Economia: ${data.total_distance_km} km, ${data.total_duration_min} min`,
        });
        onOptimized();
      } else {
        throw new Error(data.error || 'Erro ao otimizar rota');
      }
    } catch (error) {
      console.error('Erro ao otimizar:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível otimizar a rota.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setStops([]);
    setPriorities({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Otimizar Rota Inteligente
          </DialogTitle>
          <DialogDescription>
            Use algoritmos avançados para calcular a melhor ordem de entregas e economizar tempo e combustível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!result && (
            <>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-2">Configure as Prioridades</h4>
                      <p className="text-sm text-blue-700">
                        Defina a prioridade de cada entrega. O sistema otimizará a rota garantindo que entregas urgentes e de alta prioridade sejam feitas primeiro.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {loadingStops ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {stops.map((stop) => (
                        <div key={stop.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">Parada {stop.stop_number}</span>
                              <span className={`text-xs ${getPriorityColor(priorities[stop.id] || 0)}`}>
                                {getPriorityLabel(priorities[stop.id] || 0)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {stop.customers?.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {stop.customers?.address}, {stop.customers?.city}
                            </p>
                          </div>
                          <div className="w-32">
                            <Select
                              value={priorities[stop.id]?.toString() || '0'}
                              onValueChange={(value) => setPriorities(prev => ({
                                ...prev,
                                [stop.id]: parseInt(value)
                              }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Normal</SelectItem>
                                <SelectItem value="1">Baixa</SelectItem>
                                <SelectItem value="2">Alta</SelectItem>
                                <SelectItem value="3">Urgente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={handleOptimize} 
                      disabled={loading}
                      size="lg"
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Otimizando...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Otimizar Rota
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {result && (
            <div className="space-y-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 mb-2">Rota Otimizada com Sucesso!</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span className="text-green-900">
                            <strong>{result.total_distance_km} km</strong> de distância
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span className="text-green-900">
                            <strong>{result.total_duration_min} min</strong> de tempo
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Abrir no Aplicativo:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(result.google_maps_url, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Google Maps
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(result.waze_url, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Waze
                  </Button>
                </div>
              </div>

              <Button onClick={handleClose} className="w-full">
                Concluir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
