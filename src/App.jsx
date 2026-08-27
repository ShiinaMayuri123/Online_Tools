import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import LoadingSpinner from './components/common/LoadingSpinner';

const StitcherTool = lazy(() => import('./pages/Stitcher'));
const PasswordGenTool = lazy(() => import('./pages/PasswordGen'));
const RobotRecord = lazy(() => import('./pages/RobotRecord'));
const RobotDeviceDetail = lazy(() => import('./pages/RobotDeviceDetail'));
const BaseConverter = lazy(() => import('./pages/BaseConverter'));
const IpLookup = lazy(() => import('./pages/IpLookup'));
const AdbTool = lazy(() => import('./pages/AdbTool'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));

const PageFallback = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <LoadingSpinner />
  </div>
);

const PageBoundary = ({ children }) => <Suspense fallback={<PageFallback />}>{children}</Suspense>;

/**
 * ProtectedRoute: 需要登录才能访问的路由
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
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
        <LoadingSpinner />
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
            <Route path="/login" element={<PageBoundary><Login /></PageBoundary>} />
            {/* 需要登录的工具 */}
            <Route path="/robot-record" element={<ProtectedRoute><PageBoundary><RobotRecord /></PageBoundary></ProtectedRoute>} />
            <Route path="/robot-record/:mac" element={<ProtectedRoute><PageBoundary><RobotDeviceDetail /></PageBoundary></ProtectedRoute>} />
            {/* 管理后台 */}
            <Route path="/admin" element={<AdminRoute><PageBoundary><Admin /></PageBoundary></AdminRoute>} />
            {/* 公开工具 */}
            <Route path="/adb" element={<PageBoundary><AdbTool /></PageBoundary>} />
            <Route path="/stitcher" element={<PageBoundary><StitcherTool /></PageBoundary>} />
            <Route path="/password" element={<PageBoundary><PasswordGenTool /></PageBoundary>} />
            <Route path="/base-converter" element={<PageBoundary><BaseConverter /></PageBoundary>} />
            <Route path="/ip-lookup" element={<PageBoundary><IpLookup /></PageBoundary>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
