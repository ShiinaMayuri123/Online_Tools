import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlignVerticalSpaceAround, AlignHorizontalSpaceAround, Download, Upload, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Minus } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useTheme } from '../contexts/ThemeContext';
import ThemeSwitcher from '../components/common/ThemeSwitcher';
import ExportModal from '../components/stitcher/ExportModal';
import { stitchImages } from '../utils/imageUtils';

/**
 * ImageList 子组件：用于在左侧栏显示和管理已上传的图片列表
 */
const ImageList = ({ images, onMove, onRemove }) => {
  if (images.length === 0) return null;
  return (
    <div className="space-y-2">
      {images.map((img, index) => (
        <div key={img.id} className="group flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-sm">
          {/* 缩略图 */}
          <div className="relative w-12 h-12 shrink-0 bg-slate-100 rounded-lg overflow-hidden">
            <img src={img.previewUrl} className="w-full h-full object-cover" alt="" />
          </div>
          {/* 图片信息 */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-700 truncate">{img.file.name}</div>
            <div className="text-[10px] text-slate-400">{img.width} x {img.height}</div>
          </div>
          {/* 操作按钮组 (悬停显示) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onMove(index, 'up')} disabled={index === 0} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowUp size={14} /></button>
            <button onClick={() => onMove(index, 'down')} disabled={index === images.length - 1} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowDown size={14} /></button>
            <button onClick={() => onRemove(img.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * StitcherPreview 子组件：用于在右侧区域渲染图片的拼接预览效果
 */
const StitcherPreview = ({ images, direction, zoom }) => {
  const isVertical = direction === 'vertical';
  // 找出最大的宽度或高度作为参照，进行等比例缩放
  const refSize = isVertical 
    ? Math.max(...images.map(i => i.width)) 
    : Math.max(...images.map(i => i.height));

  return (
    <div 
      style={{ 
        transform: `scale(${zoom})`, 
        transformOrigin: 'top center',
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        width: isVertical ? refSize : undefined,
        height: !isVertical ? refSize : undefined
      }} 
      className="bg-white shadow-2xl shadow-slate-300/50 ring-1 ring-slate-900/5 transition-transform duration-200"
    >
      {images.map((img) => {
        // 计算当前图片的缩放比例
        const scale = refSize / (isVertical ? img.width : img.height);
        const w = isVertical ? refSize : img.width * scale;
        const h = isVertical ? img.height * scale : refSize;
        return (
          <img 
            key={img.id} 
            src={img.previewUrl} 
            style={{ width: w, height: h, display: 'block' }} 
            alt="" 
          />
        );
      })}
    </div>
  );
};

/**
 * StitcherTool 页面：长图拼接工具主页面
 */
const StitcherTool = () => {
  const navigate = useNavigate(); 
  const { theme, themeKey } = useTheme();
  
  // 状态管理
  const [images, setImages] = useState([]); // 用户上传的图片列表
  const [direction, setDirection] = useState('vertical'); // 拼接方向：vertical 纵向，horizontal 横向
  const [zoom, setZoom] = useState(1); // 预览视图的缩放比例
  const [isExportOpen, setIsExportOpen] = useState(false); // 控制导出弹窗
  const [isProcessing, setIsProcessing] = useState(false); // 是否正在处理（拼接/下载）

  // 当清空图片时，重置缩放比例
  useEffect(() => { if (images.length === 0) setZoom(1); }, [images.length, direction]);

  // 处理图片上传（同时支持拖拽和点击上传）
  const handleFileUpload = async (files) => { 
      if (!files) return; 
      const newImages = []; 
      for (let i = 0; i < files.length; i++) { 
          const file = files[i]; 
          // 只允许图片
          if (!file.type.startsWith('image/')) continue; 
          
          // 创建本地预览 URL
          const url = URL.createObjectURL(file); 
          const img = new Image(); 
          img.src = url; 
          
          // 使用 Promise 等待图片加载完成，以便获取真实宽高
          await new Promise((resolve) => { img.onload = () => resolve(); }); 
          
          newImages.push({ 
              id: Math.random().toString(36).substr(2, 9), 
              file, 
              previewUrl: url, 
              width: img.width, 
              height: img.height 
          }); 
      } 
      // 追加到已有图片列表中
      setImages(prev => [...prev, ...newImages]); 
  };
  
  // 拖放事件处理
  const onDrop = (e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }; 
  const onFileChange = (e) => { handleFileUpload(e.target.files); };
  
  // 移动图片顺序
  const moveImage = (index, dir) => { 
      const newImages = [...images]; 
      const targetIndex = dir === 'up' ? index - 1 : index + 1; 
      if (targetIndex >= 0 && targetIndex < newImages.length) { 
          // 交换位置
          [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]]; 
          setImages(newImages); 
      } 
  };
  
  // 移除单张图片
  const removeImage = (id) => { 
      setImages(prev => prev.filter(img => img.id !== id)); 
  };
  
  // 执行最终拼接并下载
  const handleExport = async (options) => { 
      setIsProcessing(true); 
      try { 
          // 调用工具函数获取拼接结果
          const result = await stitchImages(images, options); 
          
          if (options.format === 'application/pdf') { 
              // 处理 PDF 导出
              const pdf = new jsPDF({ 
                  orientation: result.width > result.height ? 'l' : 'p', 
                  unit: 'px', 
                  format: [result.width, result.height], 
                  hotfixes: ["px_scaling"] 
              }); 
              pdf.addImage(result.url, 'JPEG', 0, 0, result.width, result.height); 
              pdf.save('stitched-image.pdf'); 
          } else { 
              // 处理图片导出 (自动创建 a 标签触发下载)
              const link = document.createElement('a'); 
              link.href = result.url; 
              link.download = `stitched-${new Date().getTime()}.${options.format.split('/')[1]}`; 
              link.click(); 
          } 
          setIsExportOpen(false); 
      } catch (error) { 
          console.error("Export failed", error); 
          alert("导出失败，请重试"); 
      } finally { 
          setIsProcessing(false); 
      } 
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-slate-200 selection:text-slate-900">
      
      {/* 顶部导航栏 */}
      <nav className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <Home size={20} />
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <h1 className="font-bold text-slate-700 flex items-center gap-2">
                <div className={`p-1 rounded-lg ${themeKey === 'slate' ? 'bg-slate-700 text-white' : `${theme.primaryBg} text-white`}`}>
                    <AlignVerticalSpaceAround size={16} />
                </div>
                <span className="hidden sm:inline">长图拼接工具</span>
            </h1>
        </div>
        <div className="flex items-center gap-3">
            <ThemeSwitcher />
            {/* 导出按钮，必须有图片才能点击 */}
            <button 
                onClick={() => setIsExportOpen(true)} 
                disabled={images.length === 0} 
                className={`px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none ${theme.primaryBg} ${theme.primaryHover}`}
            >
                <Download size={16} />
                <span className="hidden sm:inline">导出</span>
            </button>
        </div>
      </nav>
      
      {/* 主体内容：左侧面板 + 右侧预览 */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
         
         {/* 左侧控制栏 */}
         <aside className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl shadow-slate-200/50">
            {/* 方向切换区 */}
            <div className="p-4 border-b border-slate-100 flex gap-2">
                <button onClick={() => setDirection('vertical')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border-2 transition-all duration-300 ${direction === 'vertical' ? `${theme.borderAccent} ${theme.bgLight} ${theme.textAccent}` : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                    <AlignVerticalSpaceAround size={16} />纵向拼接
                </button>
                <button onClick={() => setDirection('horizontal')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border-2 transition-all duration-300 ${direction === 'horizontal' ? `${theme.borderAccent} ${theme.bgLight} ${theme.textAccent}` : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                    <AlignHorizontalSpaceAround size={16} />横向拼接
                </button>
            </div>
            
            {/* 拖拽上传区 */}
            <div 
                className={`p-4 transition-all duration-300 ${images.length === 0 ? 'flex-1 flex flex-col justify-center' : ''}`} 
                onDragOver={(e) => e.preventDefault()} 
                onDrop={onDrop}
            >
               <input type="file" id="image-upload" multiple accept="image/*" className="hidden" onChange={onFileChange} />
               <label 
                   htmlFor="image-upload" 
                   className={`group relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${images.length === 0 ? 'h-64 bg-slate-50 border-slate-300 hover:border-slate-400' : `h-20 bg-slate-50 border-slate-200 hover:bg-white ${themeKey === 'slate' ? 'hover:border-slate-400' : `hover:${theme.borderAccent}`}`}`}
               >
                  {images.length === 0 ? (
                      <>
                          <div className={`p-4 rounded-full mb-4 transition-transform group-hover:scale-110 duration-300 ${theme.bgLight} ${theme.textAccent}`}>
                              <Upload size={32} />
                          </div>
                          <p className="font-bold text-slate-700 mb-1">点击或拖拽上传图片</p>
                          <p className="text-xs text-slate-400">支持 JPG, PNG, WEBP</p>
                      </>
                  ) : (
                      <div className="flex items-center gap-3 text-slate-500 group-hover:text-slate-700">
                          <Plus size={20} />
                          <span className="text-sm font-bold">添加更多图片</span>
                      </div>
                  )}
               </label>
            </div>
            
            {/* 已上传图片列表区域 */}
            {images.length > 0 && (
                <div className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">已添加 {images.length} 张</span>
                        <button onClick={() => setImages([])} className="text-xs text-red-400 hover:text-red-500 font-medium flex items-center gap-1">
                            <Trash2 size={12} /> 清空
                        </button>
                    </div>
                    <ImageList images={images} onMove={moveImage} onRemove={removeImage} />
                </div>
            )}
         </aside>
         
         {/* 右侧：画布预览区域 */}
         <div className="flex-1 bg-slate-100/50 relative overflow-hidden flex flex-col">
            {/* 背景点阵图 */}
            <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            {/* 画布缩放控制器 (悬浮) */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-slate-200/60">
               <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white text-slate-500 hover:text-slate-800 transition-colors">
                   <Minus size={16} />
               </button>
               <span className="text-xs font-bold text-slate-600 w-12 text-center tabular-nums">
                   {Math.round(zoom * 100)}%
               </span>
               <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white text-slate-500 hover:text-slate-800 transition-colors">
                   <Plus size={16} />
               </button>
            </div>
            
            {/* 预览窗口：支持滚动 */}
            <div className="flex-1 overflow-auto p-8 lg:p-12 flex items-start justify-center custom-scrollbar">
               {images.length > 0 ? (
                   <StitcherPreview images={images} direction={direction} zoom={zoom} />
               ) : (
                   <div className="m-auto text-center">
                       <div className="w-24 h-24 bg-slate-200/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                           <ImageIcon size={40} />
                       </div>
                       <p className="text-slate-400 font-medium">暂无预览内容</p>
                   </div>
               )}
            </div>
         </div>
      </main>
      
      {/* 导出设置模态框 */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} onConfirm={handleExport} isProcessing={isProcessing} images={images} direction={direction} theme={theme} />
    </div>
  );
};

export default StitcherTool;
