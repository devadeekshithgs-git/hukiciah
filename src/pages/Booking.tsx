import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { getGreeting } from '@/lib/utils/dateUtils';
import { DishSelection } from '@/components/booking/DishSelection';
import { DateSelection } from '@/components/booking/DateSelection';
import { TrayVisualization } from '@/components/booking/TrayVisualization';
import { PackingCosts } from '@/components/booking/PackingCosts';
import { toast } from 'sonner';

const Booking = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  const [step, setStep] = useState(1);
  const [dishes, setDishes] = useState<{ name: string; quantity: number; packets?: number; vacuumPacking?: { enabled: boolean; packets: number } }[]>([{ name: '', quantity: 1 }]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [numPackets, setNumPackets] = useState(0);
  const [allocatedTrays, setAllocatedTrays] = useState<number[]>([]);
  const [bookedTraysForDate, setBookedTraysForDate] = useState<number[]>([]);
  const [freezeDriedPaneer, setFreezeDriedPaneer] = useState<{ enabled: boolean; packets: number; gramsPerPacket: number }>({ enabled: false, packets: 0, gramsPerPacket: 0 });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const rulesAccepted = sessionStorage.getItem('huki_rules_accepted');
    setHasAcceptedRules(rulesAccepted === 'true');
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    setUserProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const totalTrays = dishes.reduce((sum, dish) => sum + (dish.quantity || 0), 0);

  const renderStepContent = () => {
    if (!hasAcceptedRules) {
      return (
        <div className="bg-card p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
            Review and Accept Booking Rules
          </h2>
          <p className="text-foreground mb-4 text-center">
            Please review and accept the terms before starting your booking.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={() => navigate('/welcome')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Review Terms & Conditions
            </Button>
          </div>
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <DishSelection
            dishes={dishes}
            setDishes={setDishes}
            numPackets={numPackets}
            setNumPackets={setNumPackets}
            freezeDriedPaneer={freezeDriedPaneer}
            setFreezeDriedPaneer={setFreezeDriedPaneer}
            onNext={() => setStep(2)}
          />
        );
      case 2:
        return (
          <DateSelection
            totalTrays={totalTrays}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            setAllocatedTrays={setAllocatedTrays}
            setBookedTraysForDate={setBookedTraysForDate}
          />
        );
      case 3:
        return (
          <TrayVisualization
            allocatedTrays={allocatedTrays}
            bookedTrays={bookedTraysForDate}
            selectedDate={selectedDate}
            totalTraysNeeded={totalTrays}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
            setAllocatedTrays={setAllocatedTrays}
          />
        );
      case 4:
        return (
          <PackingCosts
            totalTrays={totalTrays}
            numPackets={numPackets}
            dishes={dishes}
            selectedDate={selectedDate}
            allocatedTrays={allocatedTrays}
            freezeDriedPaneer={freezeDriedPaneer}
            onBack={() => setStep(3)}
          />
        );
      default:
        return null;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <p className="text-foreground font-medium">
              {userProfile && getGreeting(userProfile.full_name)}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile')}
            >
              Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-destructive"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Service Notice */}
      <div className="bg-accent/50 border-b border-border p-3">
        <p className="text-center text-sm text-foreground font-medium">
          📍 Currently, HUKI serves only within Bengaluru.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between mb-2">
            {['Dishes', 'Date', 'Trays', 'Payment'].map((label, index) => (
              <div
                key={label}
                className={`text-sm font-medium ${
                  step > index + 1 ? 'text-primary' : step === index + 1 ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {index + 1}. {label}
              </div>
            ))}
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default Booking;
