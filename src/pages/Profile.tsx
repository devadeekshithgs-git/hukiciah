import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BookingDetailsDialog } from '@/components/booking/BookingDetailsDialog';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { toast } from 'sonner';

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; booking: any }>({ open: false, booking: null });
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; booking: any }>({ open: false, booking: null });
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBookings();
      fetchCredits();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (error) {
      toast.error('Failed to load profile');
      return;
    }

    setProfile(data);
  };

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user?.id)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load bookings');
      return;
    }

    setBookings(data || []);
  };

  const fetchCredits = async () => {
    const { data } = await supabase
      .from('cancellation_credits')
      .select('*')
      .eq('user_id', user?.id)
      .eq('used', false)
      .gte('expiry_date', new Date().toISOString().split('T')[0]);

    setCredits(data || []);
  };

  const handleCancelBooking = async () => {
    const booking = cancelDialog.booking;
    if (!booking) return;

    try {
      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (updateError) {
        toast.error('Failed to cancel booking');
        return;
      }

      // Create credit (50% of total cost)
      const creditAmount = Math.round(booking.total_cost * 0.5);
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6);

      const { error: creditError } = await supabase
        .from('cancellation_credits')
        .insert({
          user_id: user!.id,
          original_booking_id: booking.id,
          credit_amount: creditAmount,
          expiry_date: expiryDate.toISOString().split('T')[0],
        });

      if (creditError) {
        if (import.meta.env.DEV) {
          console.error('Failed to create credit:', creditError);
        }
        toast.error('Failed to create cancellation credit');
      }

      toast.success(`Booking cancelled. ₹${creditAmount} credit available for 6 months.`);
      setCancelDialog({ open: false, booking: null });
      fetchBookings();
      fetchCredits();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Cancellation error:', error);
      }
      toast.error('Failed to cancel booking');
    }
  };

  const totalAvailableCredit = credits.reduce((sum, credit) => sum + Number(credit.credit_amount), 0);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Logo size="sm" />
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => {
            // Check if rules have been accepted
            const rulesAccepted = sessionStorage.getItem('huki_rules_accepted');
            if (rulesAccepted) {
              navigate('/booking');
            } else {
              navigate('/welcome');
            }
          }}>
            New Booking
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/auth');
            }}
          >
            Logout
          </Button>
        </div>
      </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {profile && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Profile</h2>
            <div className="space-y-2 text-foreground">
              <p><strong>Name:</strong> {profile.full_name}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Mobile:</strong> {profile.mobile_number}</p>
            </div>
          </Card>
        )}

        {totalAvailableCredit > 0 && (
          <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Available Credit</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">₹{totalAvailableCredit}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {credits.length} credit{credits.length > 1 ? 's' : ''} available
                </p>
              </div>
              <Badge className="bg-green-500 text-white">Valid for 6 months</Badge>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">My Bookings</h2>
          {bookings.length === 0 ? (
            <p className="text-muted-foreground">No bookings yet</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const isUpcoming = new Date(booking.booking_date) >= new Date();
                const isCancellable = isUpcoming && booking.payment_status === 'completed' && booking.status === 'active';

                return (
                  <div
                    key={booking.id}
                    className={`border rounded-md p-4 ${
                      booking.status === 'cancelled' 
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                        : booking.payment_status === 'failed'
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700'
                        : booking.payment_status === 'pending'
                        ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-300 dark:border-yellow-700'
                        : 'border-border'
                    }`}
                  >
                    {/* Payment Status Warning Banner */}
                    {booking.payment_status === 'failed' && (
                      <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                          ⚠️ Payment Failed - This booking was not completed
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          No trays were reserved. Please create a new booking.
                        </p>
                      </div>
                    )}
                    {booking.payment_status === 'pending' && (
                      <div className="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md">
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                          ⏳ Payment Pending - Awaiting payment confirmation
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          Trays are temporarily reserved. Complete payment to confirm booking.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {new Date(booking.booking_date).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Trays: {booking.tray_numbers && booking.tray_numbers.length > 0 
                            ? booking.tray_numbers.join(', ') 
                            : 'Not assigned'}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : booking.payment_status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : booking.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {booking.status === 'cancelled' 
                            ? 'Cancelled' 
                            : booking.payment_status === 'failed'
                            ? 'Payment Failed'
                            : booking.payment_status === 'pending'
                            ? 'Payment Pending'
                            : 'Confirmed'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-foreground space-y-1">
                      <p><strong>Total Trays:</strong> {booking.total_trays}</p>
                      <p><strong>Total Cost:</strong> ₹{booking.total_cost}</p>
                      {booking.delivery_method && (
                        <p><strong>Delivery Method:</strong> {booking.delivery_method.replace('_', ' ')}</p>
                      )}
                    </div>

                    {/* Expandable Details */}
                    {expandedBooking === booking.id && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
                        <p className="text-muted-foreground">
                          <strong>Order Progress:</strong> {booking.status === 'cancelled' ? 'Cancelled' : isUpcoming ? 'Confirmed - Awaiting Processing' : 'Completed'}
                        </p>
                        {booking.dishes && Array.isArray(booking.dishes) && (
                          <div>
                            <strong className="text-foreground">Dishes:</strong>
                            <ul className="ml-4 mt-1">
                              {booking.dishes.map((dish: any, idx: number) => (
                                <li key={idx} className="text-muted-foreground">
                                  {dish.name} - {dish.quantity} tray(s)
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedBooking(expandedBooking === booking.id ? null : booking.id)}
                      >
                        {expandedBooking === booking.id ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Show Details
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailsDialog({ open: true, booking })}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Full Details
                      </Button>
                      {isCancellable && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setCancelDialog({ open: true, booking })}
                        >
                          Cancel Booking
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, booking: null })}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground space-y-2">
              <p>
                If you cancel, <strong>50% of the amount</strong> (₹{Math.round((cancelDialog.booking?.total_cost || 0) * 0.5)}) can be used for your next order within 6 months.
              </p>
              <p className="text-destructive font-semibold">
                Important: The remaining 50% will not be refunded. No cash refunds will be issued.
              </p>
              <p className="text-sm text-muted-foreground">
                Total Booking Amount: ₹{cancelDialog.booking?.total_cost || 0}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookingDetailsDialog
        open={detailsDialog.open}
        onOpenChange={(open) => setDetailsDialog({ open, booking: null })}
        booking={detailsDialog.booking}
      />
    </div>
  );
};

export default Profile;
