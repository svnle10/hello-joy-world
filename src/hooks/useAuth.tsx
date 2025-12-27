import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isValidWebhookUrl } from '@/lib/webhookValidator';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const logLoginToSheets = useCallback(async (userEmail: string, userName: string) => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'sheets_webhook_url')
        .maybeSingle();

      if (data?.value) {
        // Validate URL before making request (SSRF protection)
        const validation = isValidWebhookUrl(data.value);
        if (!validation.valid) {
          console.error('Invalid login webhook URL:', validation.error);
          return;
        }

        const now = new Date();
        const timeOnly = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        
        fetch(data.value, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'no-cors',
          body: JSON.stringify({
            '#Date': now.toISOString().split('T')[0],
            '#Operation_Time': timeOnly,
            '#Guide': userName || userEmail,
            '#Activity': 'تسجيل دخول (Login)',
          }),
        }).catch(err => console.error('Login log error:', err));
      }
    } catch (err) {
      console.error('Error logging login:', err);
    }
  }, []);

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    
    return { error: error as Error | null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error, data } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    
    if (!error && data?.user) {
      // Fetch user's name for logging
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      logLoginToSheets(phone, profileData?.full_name || '');
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signInWithPhone, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}