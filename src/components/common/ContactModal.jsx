import { Send, Mail } from 'lucide-react';
import Modal from './Modal';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ContactModal: 联系开发者模态框
 * 包含开发者的邮箱信息。
 * @param {boolean} isOpen - 控制弹窗是否显示
 * @param {function} onClose - 关闭弹窗的回调函数
 */
const ContactModal = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const email = "xxp8888888@gmail.com";

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className="ring-1 ring-slate-900/5">
        <div className="p-6 text-center">
           {/* 图标 */}
           <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${theme.bgLight} ${theme.textAccent}`}>
                <Send size={24} />
           </div>
           
           {/* 标题和说明文本 */}
           <h3 className="text-xl font-bold text-slate-900 mb-2">联系开发者</h3>
           <p className="text-sm text-slate-500 mb-6 leading-relaxed">感谢您的关注！如果您有功能建议、Bug 反馈或合作意向，欢迎通过邮件联系。</p>
           
           {/* 邮箱显示框：带有复制样式的包裹层 */}
           <div className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 select-all cursor-text hover:bg-slate-100 transition-colors">
              <div className="bg-white p-1.5 rounded-md border border-slate-100 shadow-sm text-slate-400 shrink-0">
                  <Mail size={16} />
              </div>
              <span className="text-sm font-semibold text-slate-700 font-mono break-all">{email}</span>
           </div>
        </div>
        
        {/* 底部按钮区 */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-center">
            <button
                onClick={onClose}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
                关闭
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default ContactModal;
