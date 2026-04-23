import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import StitcherTool from './pages/Stitcher';
import PasswordGenTool from './pages/PasswordGen';
import RobotTestRecordManager from './pages/RobotRecord';

/**
 * App (根组件)
 * 整个 React 应用的入口。
 * 这里配置了全局的主题提供者 (ThemeProvider) 和基于 Hash 的路由 (HashRouter)。
 */
function App() {
  return (
    // ThemeProvider 会将其内部的主题状态传递给所有的子组件
    <ThemeProvider>
      {/* HashRouter 使用 URL 中的 hash (#) 部分来管理路由，非常适合静态离线网页，不会触发服务器请求 */}
      <HashRouter>
        <Routes>
          {/* 定义了四个路径分别对应的页面组件 */}
          <Route path="/" element={<Home />} />
          <Route path="/stitcher" element={<StitcherTool />} />
          <Route path="/password" element={<PasswordGenTool />} />
          <Route path="/robot-record" element={<RobotTestRecordManager />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
