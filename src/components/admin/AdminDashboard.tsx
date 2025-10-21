import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Package, Users, DollarSign } from 'lucide-react';

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [bookings, todayBookings, totalRevenue] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('booking_date', today),
        supabase.from('bookings').select('total_cost').eq('payment_status', 'completed')
      ]);

      const revenue = totalRevenue.data?.reduce((sum, b) => sum + Number(b.total_cost || 0), 0) || 0;

      return {
        totalBookings: bookings.count || 0,
        todayBookings: todayBookings.count || 0,
        totalRevenue: revenue,
      };
    },
  });

  const statCards = [
    {
      title: 'Total Bookings',
      value: stats?.totalBookings || 0,
      icon: Package,
      color: 'text-blue-500',
    },
    {
      title: "Today's Bookings",
      value: stats?.todayBookings || 0,
      icon: Calendar,
      color: 'text-green-500',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats?.totalRevenue.toFixed(2) || 0}`,
      icon: DollarSign,
      color: 'text-yellow-500',
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Dashboard Overview</h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;
