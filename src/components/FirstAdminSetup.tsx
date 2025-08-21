import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Crown } from 'lucide-react';

interface FirstAdminSetupProps {
  onAdminCreated?: () => void;
}

export default function FirstAdminSetup({ onAdminCreated }: FirstAdminSetupProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createFirstAdmin = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_first_admin');

      if (error) throw error;

      const result = data as { error?: string; success?: boolean; message?: string };

      if (result?.error) {
        toast({
          title: 'Informação',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso',
          description: 'Você foi promovido a administrador!',
        });
        onAdminCreated?.();
      }
    } catch (error) {
      console.error('Error creating first admin:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar administrador',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <CardTitle>Configuração Inicial</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Parece que este é o primeiro acesso ao sistema. Deseja se tornar o administrador?
        </p>
        <Button 
          onClick={createFirstAdmin} 
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? 'Configurando...' : 'Tornar-se Administrador'}
        </Button>
      </CardContent>
    </Card>
  );
}