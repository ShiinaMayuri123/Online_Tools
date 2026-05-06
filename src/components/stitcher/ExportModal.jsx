import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import Modal from '../common/Modal';
import { formatFileSize, stitchImages } from '../../utils/imageUtils';

/**
 * ExportModal: 长图导出设置模态框
 * 允许用户选择导出格式、质量和尺寸，并在后台计算预估文件大小。
 */
const ExportModal = ({ isOpen, onClose, onConfirm, isProcessing, direction, theme, images }) => {
  const [format, setFormat] = useState('image/jpeg');
  const [scale, setScale] = useState(1);
  const [quality, setQuality] = useState(0.92);
  const [fileSize, setFileSize] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // PNG 是无损压缩，不支持调整 quality
  const isLossless = format === 'image/png';

  // 当用户调整设置时，防抖并重新计算预估的文件大小
  useEffect(() => {
    if (!isOpen || images.length === 0) return;
    
    let isMounted = true;
    const calculateSize = async () => {
      setIsCalculating(true);
      try {
        // 1. 生成图片数据
        const result = await stitchImages(images, { format, scale, quality, direction });
        
        if (!isMounted) return;

        // 2. 将 DataURL 转换为 Blob 对象，获取最真实的二进制大小
        const res = await fetch(result.url);
        const blob = await res.blob();
        let bytes = blob.size;
        
        // 3. 针对 PDF 的额外修正 (PDF 文件 = 图片数据 + 头部/元数据)
        if (format === 'application/pdf') {
            bytes = bytes + 1500; 
        }
        
        setFileSize(bytes);
      } catch (e) {
        console.error("Size calculation failed", e);
        setFileSize(null);
      } finally {
        if (isMounted) setIsCalculating(false);
      }
    };

    // 防抖：延迟 500ms 执行计算，避免拖动滑块时卡顿
    const timer = setTimeout(calculateSize, 500);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [isOpen, format, scale, quality, direction, images]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center">
            <span>导出设置</span>
            {fileSize !== null && (
              <span className={`text-xs font-mono px-2 py-1 rounded-md ${isCalculating ? 'bg-slate-100 text-slate-400' : 'bg-green-100 text-green-700'}`}>
                 {isCalculating ? '计算中...' : formatFileSize(fileSize)}
              </span>
            )}
          </h3>
          
          <div className="space-y-6">
            {/* 格式选择 */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">图片格式</label>
              <div className="grid grid-cols-3 gap-2">
                {['image/jpeg', 'image/png', 'application/pdf'].map(fmt => (
                  <button 
                      key={fmt} 
                      onClick={() => setFormat(fmt)} 
                      className={`px-2 py-2 rounded-xl text-xs font-bold border-2 transition-all ${format === fmt ? `${theme.borderAccent} ${theme.bgLight} ${theme.textAccent}` : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}
                  >
                    {fmt.split('/')[1].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* 尺寸缩放 */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  尺寸缩放 <span className="text-slate-400 font-normal normal-case">(改变分辨率)</span>
              </label>
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <input 
                  type="range" min="0.1" max="2" step="0.1" 
                  value={scale} onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
                <span className="text-sm font-bold text-slate-700 w-10 text-right">{Math.round(scale * 100)}%</span>
              </div>
            </div>

            {/* 画质压缩 */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  画质压缩 <span className="text-slate-400 font-normal normal-case">(尺寸不变，减小体积)</span>
              </label>
              
              {isLossless ? (
                  <div className="bg-amber-50 border border-amber-100 text-amber-600 text-xs p-3 rounded-xl flex items-start gap-2">
                      <Info size={14} className="mt-0.5 shrink-0" />
                      <span>PNG 为无损格式，不支持压缩。如需减小体积，请切换为 JPEG。</span>
                  </div>
              ) : (
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <input 
                      type="range" min="0.1" max="1.0" step="0.05" 
                      value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                    />
                    <span className={`text-sm font-bold w-10 text-right ${quality < 0.6 ? 'text-amber-500' : 'text-slate-700'}`}>
                        {Math.round(quality * 100)}%
                    </span>
                  </div>
              )}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="mt-8 flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">取消</button>
            <button 
              onClick={() => onConfirm({ format, scale, quality, direction })} 
              disabled={isProcessing || isCalculating}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${theme.primaryBg} ${theme.primaryHover} ${(isProcessing || isCalculating) ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isProcessing ? '处理中...' : '下载文件'}
            </button>
          </div>
        </div>
    </Modal>
  );
};

export default ExportModal;
