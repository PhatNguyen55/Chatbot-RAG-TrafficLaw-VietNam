// pages/Login.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Scale } from 'lucide-react';

import apiClient from '@/lib/api';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/auth-context'; // Import useAuth hook


const Login = () => {
  const navigate = useNavigate(); 
  const { login } = useAuth(); // Lấy hàm login từ context
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // API của chúng ta nhận dữ liệu dạng form-data
      // Cách tốt nhất là dùng URLSearchParams
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await apiClient.post('/auth/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Xử lý khi đăng nhập thành công
      if (response.data.access_token) {
        // Lấy token từ response
        const { access_token } = response.data;
      
        toast.promise(
          login(access_token), // Truyền promise của hàm login vào toast
          {
            loading: 'Đang xác thực người dùng...',
            success: () => {
              // Chuyển hướng chỉ khi promise thành công
              navigate('/chat');
              return "Đăng nhập thành công!";
            },
            error: 'Xác thực thất bại. Vui lòng thử lại.',
          }
        );
      }
    } catch (err) {
      // Xử lý lỗi
      if (err instanceof AxiosError && err.response) {
        const errorMessage = err.response.data.detail || 'Email hoặc mật khẩu không đúng.';
        setError(errorMessage);
        toast.error("Đăng nhập thất bại", { description: errorMessage });
      } else {
        const genericError = 'Không thể kết nối đến máy chủ.';
        setError(genericError);
        toast.error("Lỗi mạng", { description: genericError });
      }
    } finally {
      // setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Transportation Law AI</h1>
          <p className="text-gray-600 mt-2">Your intelligent legal assistant</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Sign in to access your transportation law research assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
