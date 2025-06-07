// src/pages/Index.tsx

import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, MessageSquare, Shield, Search, ArrowRight } from 'lucide-react';

const Index = () => {
  // Tối ưu hóa: Dùng Navigate thay vì window.location.href để không reload trang
  const isAuthenticated = localStorage.getItem('isAuthenticated');
  if (isAuthenticated === 'true') {
    return <Navigate to="/chat" replace />;
  }

  // Việt hóa nội dung
  const features = [
    {
      icon: MessageSquare,
      title: "Trả lời pháp lý tức thì",
      description: "Nhận câu trả lời ngay lập tức cho các câu hỏi về luật giao thông với trợ lý AI."
    },
    {
      icon: Search,
      title: "Cơ sở dữ liệu toàn diện",
      description: "Truy cập bộ sưu tập lớn các luật, nghị định, thông tư và các văn bản pháp lý liên quan."
    },
    {
      icon: Shield,
      title: "Đáng tin cậy & Chính xác",
      description: "Trí tuệ nhân tạo của chúng tôi được huấn luyện trên các tài liệu pháp lý mới nhất và các nguồn đã được xác minh."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Trợ lý Luật GTĐB</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Bắt đầu ngay
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Trợ lý AI về
            <span className="text-blue-600 block mt-2">Luật Giao thông Đường bộ</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Nhận ngay câu trả lời chính xác cho các vấn đề phức tạp về luật giao thông.
            AI được đào tạo trên các nghị định, bộ luật và văn bản pháp quy mới nhất.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-base px-8 py-6">
                Bắt đầu trò chuyện
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6">
                Tôi đã có tài khoản
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24">
            <h2 className="text-3xl font-bold text-center text-gray-800">Tại sao nên chọn chúng tôi?</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-8">
                {features.map((feature, index) => (
                    <Card key={index} className="bg-white/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                        <feature.icon className="w-6 h-6 text-blue-600" />
                        </div>
                        <CardTitle className="text-xl text-gray-800">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600">{feature.description}</p>
                    </CardContent>
                    </Card>
                ))}
            </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-2xl rounded-xl">
            <div className="py-12 px-6">
              <h2 className="text-3xl font-bold mb-4">
                Sẵn sàng để bắt đầu?
              </h2>
              <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
                Tham gia cùng các chuyên gia pháp lý và người tham gia giao thông tin tưởng trợ lý AI của chúng tôi.
              </p>
              <Link to="/signup">
                <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100 text-base px-8 py-6">
                  Tạo tài khoản miễn phí
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;