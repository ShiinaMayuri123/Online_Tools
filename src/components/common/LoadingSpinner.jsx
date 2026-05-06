import { Loader2 } from 'lucide-react';

/**
 * LoadingSpinner 公共组件
 * 全页加载指示器，居中显示旋转图标。
 *
 * @param {number} size - 图标大小，默认 32
 * @param {string} className - 额外的 CSS 类名
 */
const LoadingSpinner = ({ size = 32, className = '' }) => (
  <div className="text-center py-12">
    <Loader2 size={size} className={`animate-spin mx-auto text-slate-400 ${className}`} />
  </div>
);

export default LoadingSpinner;
