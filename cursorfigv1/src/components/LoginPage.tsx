import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { signIn, signUp } from '../utils/auth';
import { BubbleLogo } from './BubbleLogo';

interface LoginPageProps {
  onLoginSuccess: (accessToken: string, userId: string) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(email, password, name);
        if (result.error) {
          setError(result.error);
        } else {
          // After signup, automatically sign in
          const signInResult = await signIn(email, password);
          if (signInResult.error) {
            setError(signInResult.error);
          } else {
            onLoginSuccess(signInResult.accessToken, signInResult.user.id);
          }
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          onLoginSuccess(result.accessToken, result.user.id);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2c3e50] p-4">
      <Card className="w-full max-w-md bg-[#3d5a80] border-[#577189] shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <BubbleLogo size={64} />
          </div>
          <CardTitle className="text-[#69d2bb]">BudgetBubble</CardTitle>
          <CardDescription className="text-[#c1d3e0] italic">
            A bird's eye view of your finances
          </CardDescription>
          <CardDescription className="text-[#a7b8c5] text-sm mt-2">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[#c1d3e0]">Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#34495e] border-[#577189] text-white"
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#34495e] border-[#577189] text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#34495e] border-[#577189] text-white"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-[#ee6c4d]/20 border border-[#ee6c4d]/50 rounded text-[#ee8b88]">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50] shadow-md"
              disabled={loading}
            >
              {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-[#69d2bb] hover:text-[#5bc4ab] underline"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
