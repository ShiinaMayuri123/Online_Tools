/**
 * Modal 公共组件
 * 提供统一的模态框结构：全屏遮罩层 + 白色内容卡片 + 入场动画。
 *
 * @param {boolean} isOpen - 是否显示模态框
 * @param {Function} onClose - 关闭模态框的回调（点击遮罩层时触发）
 * @param {React.ReactNode} children - 模态框内容
 * @param {string} maxWidth - 内容卡片最大宽度，默认 'max-w-md'
 */
const Modal = ({ isOpen, onClose, children, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        {children}
      </div>
    </div>
  );
};

export default Modal;
