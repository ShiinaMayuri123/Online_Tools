import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import StitcherTool from './pages/Stitcher';
import PasswordGenTool from './pages/PasswordGen';
import RobotTestRecordManager from './pages/RobotRecord';
import BaseConverter from './pages/BaseConverter';
import IpLookup from './pages/IpLookup';

/**
 * App (根组件)
 * 整个 React 应用的入口。
 * 配置了全局主题提供者 (ThemeProvider) 和 Hash 路由 (HashRouter)。
 */
function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* 实用工具 */}
          <Route path="/stitcher" element={<StitcherTool />} />
          <Route path="/password" element={<PasswordGenTool />} />
          <Route path="/robot-record" element={<RobotTestRecordManager />} />
          {/* 网页小工具 */}
          <Route path="/base-converter" element={<BaseConverter />} />
          <Route path="/ip-lookup" element={<IpLookup />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;