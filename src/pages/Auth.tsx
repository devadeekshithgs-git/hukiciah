import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';
import { Mail } from 'lucide-react';

const authSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Name too long').trim().optional(),
  email: z.string().email('Invalid email address').max(255, 'Email too long').trim(),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number').length(10, 'Mobile number must be 10 digits').optional(),
});

const Auth = () => {
  const [isSignup, setIsSignup] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

          if (error) throw error;

          if (data?.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/profile');
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error checking user role:', error);
          }
          navigate('/profile');
        }
      }
    };

    checkUserRole();
  }, [user, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      authSchema.parse({ fullName, email, mobileNumber });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          mobile_number: mobileNumber,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setEmailSent(true);
    toast.success('Check your email for the login link!');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      authSchema.parse({ email });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setEmailSent(true);
    toast.success('Check your email for the login link!');
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Logo size="xl" className="mb-8" />
        
        <div className="w-full max-w-md bg-card p-8 rounded-lg shadow-lg text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Mail className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Check Your Email
          </h2>
          
          <p className="text-foreground mb-6">
            We've sent a login link to <strong>{email}</strong>. 
            Click the link in your email to sign in.
          </p>
          
          <p className="text-sm text-muted-foreground mb-6">
            Don't see it? Check your spam folder or wait a minute for it to arrive.
          </p>
          
          <Button
            variant="outline"
            onClick={() => {
              setEmailSent(false);
              setEmail('');
              setFullName('');
              setMobileNumber('');
            }}
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Logo size="xl" className="mb-8" />
      
      <div className="w-full max-w-md bg-card p-8 rounded-lg shadow-lg">
        <div className="mb-6 p-4 bg-accent/50 rounded-md">
          <p className="text-sm text-foreground font-medium">
            📍 Currently, HUKI serves only within Bengaluru.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-6">
          {isSignup ? 'Create Account' : 'Sign In'}
        </h2>
        
        <p className="text-sm text-muted-foreground mb-6">
          {isSignup 
            ? 'Enter your details and we\'ll send you a login link to get started.' 
            : 'Enter your email and we\'ll send you a login link to sign in.'}
        </p>

        <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
          {isSignup && (
            <>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="mobileNumber">
                  Mobile Number
                  <span className="text-xs text-muted-foreground ml-2">
                    (For records only, no OTP sent)
                  </span>
                </Label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  placeholder="9876543210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Login Link'}
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsSignup(!isSignup);
              setFullName('');
              setEmail('');
              setMobileNumber('');
            }}
            className="w-full"
          >
            {isSignup ? 'Already have an account? Sign In' : 'New here? Create Account'}
          </Button>
        </div>
        
        {isSignup && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-xs text-foreground">
              <strong>Note:</strong> We use passwordless authentication. You'll receive a secure login link via email to sign in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
