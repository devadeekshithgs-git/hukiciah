import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Package, Users, LogOut, Grid3x3, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminBookings from '@/components/admin/AdminBookings';
import AdminCalendar from '@/components/admin/AdminCalendar';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminTrayManagement from '@/components/admin/AdminTrayManagement';
import { AdminCustomers } from '@/components/admin/AdminCustomers';

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
      } else if (role !== 'admin') {
        navigate('/welcome');
      }
    }
  }, [user, role, authLoading, roleLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">HUKI Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Food Dehydration Operations</p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Package className="mr-2 h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays className="mr-2 h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="tray-management">
              <Grid3x3 className="mr-2 h-4 w-4" />
              Tray Management
            </TabsTrigger>
            <TabsTrigger value="customers">
              <Users className="mr-2 h-4 w-4" />
              Customers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="bookings">
            <AdminBookings />
          </TabsContent>

          <TabsContent value="calendar">
            <AdminCalendar />
          </TabsContent>

          <TabsContent value="tray-management">
            <AdminTrayManagement />
          </TabsContent>

          <TabsContent value="customers">
            <AdminCustomers />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
