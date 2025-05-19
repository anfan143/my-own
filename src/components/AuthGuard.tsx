import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const { user, profile, loading, initialized, initialize } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      if (!initialized) {
        await initialize();
      }
    };
    initAuth();
  }, [initialized, initialize]);

  useEffect(() => {
    if (!loading && !user && initialized) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate, initialized]);

  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show loading if we're waiting for the profile
  if (!profile && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return <>{children}</>;
}