import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, MapPin, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

interface RouteOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
  routeId: string;
  onOptimized: () => void;
}

export default function RouteOptimizer({ isOpen, onClose, routeId, onOptimized }: RouteOptimizerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleOptimize = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-route', {
        body: { route_id: routeId }
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold mb-2">Otimização Inteligente</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vamos analisar todos os endereços e calcular a melhor rota para economizar tempo e combustível.
                    </p>
                  </div>
                  <Button 
                    onClick={handleOptimize} 
                    disabled={loading}
                    size="lg"
                    className="w-full max-w-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Otimizando...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Iniciar Otimização
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
