import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/components/AuthProvider';

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email too long'),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password too long'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email too long'),
  password: z.string().min(1, 'Password is required').max(72, 'Password too long'),
});

const ADMIN_AUTOFILL = {
  name: 'huki',
  email: 'huki.ciah@gmail.com',
  mobile: '7676346923',
};

const Auth = () => {
  const [isSignup, setIsSignup] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdminAutofill = isSignup && fullName.trim().toLowerCase() === ADMIN_AUTOFILL.name;

  useEffect(() => {
    if (isAdminAutofill) {
      setEmail(ADMIN_AUTOFILL.email);
      setMobileNumber(ADMIN_AUTOFILL.mobile);
    }
  }, [isAdminAutofill]);

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

    const parsed = signupSchema.safeParse({ fullName, email, mobileNumber, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
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
      if (error.message.toLowerCase().includes('already')) {
        toast.error('Account already exists. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success('Account created! Signing you in...');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Signed in successfully');
  };

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
            ? 'Enter your details and create a password to get started.'
            : 'Enter your email and password to sign in.'}
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
                <Label htmlFor="mobileNumber">Mobile Number</Label>
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

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? 'At least 8 characters' : ''}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading
              ? (isSignup ? 'Creating account...' : 'Signing in...')
              : isAdminAutofill
                ? 'Continue as Admin'
                : (isSignup ? 'Create Account' : 'Sign In')}
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
              setPassword('');
            }}
            className="w-full"
          >
            {isSignup ? 'Already have an account? Sign In' : 'New here? Create Account'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
