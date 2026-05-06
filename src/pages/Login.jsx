import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ParticleBackground from '../components/common/ParticleBackground';

/**
 * Login: 登录页面
 * 邮箱 + 密码登录，登录成功后跳转到 /robot-record。
 */
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/robot-record');
    } catch (err) {
      const code = err.code;
      if (code === 'auth/user-not-found') setError('账号不存在');
      else if (code === 'auth/wrong-password') setError('密码错误');
      else if (code === 'auth/invalid-email') setError('邮箱格式不正确');
      else if (code === 'auth/too-many-requests') setError('登录尝试过多，请稍后再试');
      else setError('登录失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex items-center justify-center relative overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 w-full max-w-sm mx-auto px-4">
        {/* Logo */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg ${theme.primaryBg}`}>
            <LogIn size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">机器人管理系统</h1>
          <p className="text-sm text-slate-500 mt-1">请登录以继续</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-100">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-in fade-in duration-200">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="输入邮箱地址"
                required
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">密码</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                required
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${theme.primaryBg} ${theme.primaryHover}`}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> 登录中...</>
            ) : (
              <><LogIn size={18} /> 登录</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
