// src/pages/Signup.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Eye, EyeOff, Scale, Loader2 } from 'lucide-react';

import apiClient from '@/lib/api';
import { AxiosError } from 'axios';

const Signup = () => {
  const navigate = useNavigate(); // Dùng hook useNavigate để chuyển hướng
  const [formData, setFormData] = useState({
    // name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Tối ưu hóa: Lấy name và value trực tiếp từ event
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- Giữ nguyên logic validation ---
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsLoading(true);

    try {
      // Gọi API đăng ký bằng apiClient
      const response = await apiClient.post('/auth/signup', {
        email: formData.email,
        password: formData.password,
      });

      // Xử lý khi đăng ký thành công
      if (response.status === 200) {
        toast.success("Tạo tài khoản thành công!", {
          description: "Bạn có thể đăng nhập ngay bây giờ.",
        });
        // Chuyển hướng đến trang đăng nhập
        navigate('/login'); 
      }
    } catch (err) {
      // Xử lý lỗi từ API
      if (err instanceof AxiosError && err.response) {
        // Lấy thông báo lỗi từ backend
        const errorMessage = err.response.data.detail || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
        setError(errorMessage);
        toast.error("Đăng ký thất bại", { description: errorMessage });
      } else {
        // Lỗi mạng hoặc lỗi không xác định
        const genericError = 'Không thể kết nối đến máy chủ.';
        setError(genericError);
        toast.error("Lỗi mạng", { description: genericError });
      }
    } finally {
      // Luôn tắt trạng thái loading sau khi hoàn tất
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Trợ lý Luật GTĐB</h1>
          <p className="text-gray-600 mt-2">Trợ lý pháp lý thông minh của bạn</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Tạo tài khoản của bạn</CardTitle>
            <CardDescription>
              Tham gia cùng hàng ngàn người dùng khác sử dụng trợ lý AI của chúng tôi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* <div className="space-y-2">
                <Label htmlFor="name">Họ và Tên</Label>
                <Input id="name" name="name" type="text" placeholder="Nhập họ và tên của bạn" value={formData.name} onChange={handleInputChange} required />
              </div> */}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="Nhập email của bạn" value={formData.email} onChange={handleInputChange} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Tạo mật khẩu" value={formData.password} onChange={handleInputChange} required />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận Mật khẩu</Label>
                <div className="relative">
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Xác nhận lại mật khẩu" value={formData.confirmPassword} onChange={handleInputChange} required />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                  </Button>
                </div>
              </div>

              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Đã có tài khoản?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Đăng nhập
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;