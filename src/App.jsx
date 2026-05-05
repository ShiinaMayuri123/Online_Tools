import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import StitcherTool from './pages/Stitcher';
import PasswordGenTool from './pages/PasswordGen';
import RobotRecord from './pages/RobotRecord';
import RobotDeviceDetail from './pages/RobotDeviceDetail';
import BaseConverter from './pages/BaseConverter';
import IpLookup from './pages/IpLookup';
import Login from './pages/Login';
import Admin from './pages/Admin';
import { Loader2 } from 'lucide-react';

/**
 * ProtectedRoute: 需要登录才能访问的路由
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
};

/**
 * AdminRoute: 需要管理员权限才能访问的路由
 */
const AdminRoute = ({ children }) => {
  const { user, role, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

/**
 * App (根组件)
 * 配置了主题提供者、认证提供者和 Hash 路由。
 */
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            {/* 需要登录的工具 */}
            <Route path="/robot-record" element={<ProtectedRoute><RobotRecord /></ProtectedRoute>} />
            <Route path="/robot-record/:mac" element={<ProtectedRoute><RobotDeviceDetail /></ProtectedRoute>} />
            {/* 管理后台 */}
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            {/* 公开工具 */}
            <Route path="/stitcher" element={<StitcherTool />} />
            <Route path="/password" element={<PasswordGenTool />} />
            <Route path="/base-converter" element={<BaseConverter />} />
            <Route path="/ip-lookup" element={<IpLookup />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
