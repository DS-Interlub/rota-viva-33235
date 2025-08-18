-- Criar tabela de motoristas
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  license_number TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de veículos
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  brand TEXT,
  model TEXT,
  year INTEGER,
  km_current INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de clientes
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  is_transporter BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de rotas
CREATE TABLE public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  route_date DATE NOT NULL,
  departure_time TIME,
  return_time TIME,
  initial_km INTEGER,
  final_km INTEGER,
  total_km INTEGER GENERATED ALWAYS AS (final_km - initial_km) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de paradas (entregas)
CREATE TABLE public.route_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  stop_number INTEGER NOT NULL,
  delivery_time TIME,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  signature_url TEXT,
  photos TEXT[], -- Array de URLs das fotos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(route_id, stop_number)
);

-- Criar tabela de gastos
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES public.routes(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  expense_type TEXT NOT NULL CHECK (expense_type IN ('fuel', 'toll', 'maintenance', 'rental')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
  driver_id UUID REFERENCES public.drivers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para drivers
CREATE POLICY "Drivers viewable by authenticated users" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Drivers manageable by admins" ON public.drivers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Políticas RLS para vehicles
CREATE POLICY "Vehicles viewable by authenticated users" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Vehicles manageable by admins" ON public.vehicles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Políticas RLS para customers
CREATE POLICY "Customers viewable by authenticated users" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Customers manageable by admins" ON public.customers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Políticas RLS para routes
CREATE POLICY "Routes viewable by authenticated users" ON public.routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Routes manageable by admins" ON public.routes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Drivers can update their own routes" ON public.routes FOR UPDATE TO authenticated USING (
  driver_id IN (SELECT driver_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Políticas RLS para route_stops
CREATE POLICY "Route stops viewable by authenticated users" ON public.route_stops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Route stops manageable by admins" ON public.route_stops FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Drivers can update stops on their routes" ON public.route_stops FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.routes r 
    JOIN public.profiles p ON r.driver_id = p.driver_id 
    WHERE r.id = route_id AND p.user_id = auth.uid()
  )
);

-- Políticas RLS para expenses
CREATE POLICY "Expenses viewable by authenticated users" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Expenses manageable by admins" ON public.expenses FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Políticas RLS para profiles
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view and update their own profile" ON public.profiles FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_route_stops_updated_at BEFORE UPDATE ON public.route_stops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'),
    'driver'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar buckets de storage para fotos e assinaturas
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-photos', 'delivery-photos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Políticas de storage para fotos de entrega
CREATE POLICY "Users can upload delivery photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'delivery-photos');
CREATE POLICY "Users can view delivery photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'delivery-photos');

-- Políticas de storage para assinaturas
CREATE POLICY "Users can upload signatures" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'signatures');
CREATE POLICY "Users can view signatures" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'signatures');

-- Políticas de storage para recibos
CREATE POLICY "Users can upload receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Users can view receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts');