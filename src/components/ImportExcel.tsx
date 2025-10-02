import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, Download, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImportExcelProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  type: 'customers' | 'drivers' | 'vehicles';
}

export default function ImportExcel({ isOpen, onClose, onImportComplete, type }: ImportExcelProps) {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{success: number, errors: string[]}>({success: 0, errors: []});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const templates = {
    customers: {
      headers: ['name', 'address', 'city', 'state', 'zip_code', 'phone', 'email', 'is_transporter'],
      example: 'Cliente Exemplo,Rua Exemplo 123,São Paulo,SP,01234-567,11999887766,cliente@exemplo.com,false'
    },
    drivers: {
      headers: ['name', 'email', 'phone', 'license_number'],
      example: 'João Silva,joao@email.com,11999887766,12345678901'
    },
    vehicles: {
      headers: ['plate', 'brand', 'model', 'year', 'km_current'],
      example: 'ABC-1234,Ford,Transit,2020,50000'
    }
  };

  const downloadTemplate = () => {
    const template = templates[type];
    const csv = [
      template.headers.join(','),
      template.example
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    });
  };

  const validateData = (data: string[][], headers: string[]): {valid: any[], errors: string[]} => {
    const valid = [];
    const errors = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length !== headers.length) {
        errors.push(`Linha ${i + 1}: Número incorreto de colunas (esperado: ${headers.length}, encontrado: ${row.length})`);
        continue;
      }

      const item: any = {};
      let hasError = false;

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = row[j]?.trim();

        switch (header) {
          case 'name':
          case 'address':
            if (!value) {
              errors.push(`Linha ${i + 1}: ${header} é obrigatório`);
              hasError = true;
            } else {
              item[header] = value;
            }
            break;
          
          case 'email':
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push(`Linha ${i + 1}: Email inválido`);
              hasError = true;
            } else {
              item[header] = value || null;
            }
            break;
          
          case 'year':
          case 'km_current':
            if (value) {
              const num = parseInt(value);
              if (isNaN(num)) {
                errors.push(`Linha ${i + 1}: ${header} deve ser um número`);
                hasError = true;
              } else {
                item[header] = num;
              }
            } else {
              item[header] = header === 'km_current' ? 0 : null;
            }
            break;
          
          case 'is_transporter':
            item[header] = value === 'true' || value === '1';
            break;
          
          default:
            item[header] = value || null;
        }
      }

      if (!hasError) {
        valid.push(item);
      }
    }

    return { valid, errors };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setResults({success: 0, errors: []});

    try {
      const text = await file.text();
      const data = parseCSV(text);
      
      if (data.length < 2) {
        throw new Error('Arquivo vazio ou só contém cabeçalho');
      }

      const template = templates[type];
      const { valid, errors } = validateData(data, template.headers);

      if (valid.length === 0) {
        setResults({success: 0, errors});
        return;
      }

      // Insert valid records
      let successCount = 0;
      const insertErrors = [...errors];

      for (const item of valid) {
        try {
          const { error } = await supabase
            .from(type)
            .insert([item]);

          if (error) throw error;
          successCount++;
        } catch (error: any) {
          insertErrors.push(`Erro ao inserir ${item.name || item.plate}: ${error.message}`);
        }
      }

      setResults({success: successCount, errors: insertErrors});

      if (successCount > 0) {
        toast({
          title: "Importação concluída",
          description: `${successCount} registro(s) importado(s) com sucesso!`,
        });
        onImportComplete();
      }

    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getTypeName = () => {
    switch (type) {
      case 'customers': return 'Clientes';
      case 'drivers': return 'Motoristas';
      case 'vehicles': return 'Veículos';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar {getTypeName()}</DialogTitle>
          <DialogDescription>
            Importe múltiplos registros usando um arquivo CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template download */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">1. Baixe o modelo</h4>
            <p className="text-sm text-blue-700 mb-3">
              Use nosso modelo para garantir a formatação correta
            </p>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar modelo CSV
            </Button>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <h4 className="font-medium">2. Selecione o arquivo</h4>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar seu arquivo CSV
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Processando...' : 'Selecionar Arquivo'}
                </Button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Results */}
          {(results.success > 0 || results.errors.length > 0) && (
            <div className="space-y-3">
              <h4 className="font-medium">Resultado da Importação</h4>
              
              {results.success > 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-green-800 text-sm">
                    ✅ {results.success} registro(s) importado(s) com sucesso
                  </p>
                </div>
              )}

              {results.errors.length > 0 && (
                <div className="bg-red-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-red-800 text-sm font-medium">
                        {results.errors.length} erro(s) encontrado(s):
                      </p>
                      {results.errors.map((error, index) => (
                        <p key={index} className="text-red-700 text-xs">
                          • {error}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Instruções:</strong>
            </p>
            <ul className="text-xs text-gray-600 mt-1 space-y-1">
              <li>• Use o modelo fornecido para garantir a formatação correta</li>
              <li>• Campos obrigatórios devem ser preenchidos</li>
              <li>• Use vírgulas para separar as colunas</li>
              <li>• Para textos com vírgula, coloque entre aspas</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}