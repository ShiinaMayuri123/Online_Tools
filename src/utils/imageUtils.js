/**
 * stitchImages: 核心图片拼接函数
 * @param {Array} images - 包含图片信息的数组 (每个元素包含 width, height, previewUrl 等属性)
 * @param {Object} options - 配置选项 (format: 格式, quality: 质量, scale: 缩放比例, direction: 'vertical' 或 'horizontal')
 * @returns {Promise<Object>} - 返回一个 Promise，解析为包含 { url, width, height } 的对象
 */
export const stitchImages = async (images, options = { format: 'image/png', quality: 1, scale: 1, direction: 'vertical' }) => {
  // 如果没有传入图片，抛出错误
  if (images.length === 0) throw new Error("No images to stitch");
  
  // 判断是否为纵向拼接
  const isVertical = options.direction === 'vertical';
  
  // 参考尺寸：如果是纵向拼接，找出所有图片中最宽的那张的宽度作为参考。如果是横向，找最高的。
  const referenceDimension = isVertical 
      ? Math.max(...images.map(img => img.width)) 
      : Math.max(...images.map(img => img.height));
  
  let totalSize = 0; 
  
  // 遍历所有图片，计算它们缩放后的尺寸，使它们能对齐
  const processedImages = images.map(img => {
    // 缩放因子：用参考尺寸除以当前图片的实际尺寸
    const scaleFactor = referenceDimension / (isVertical ? img.width : img.height);
    const scaledWidth = img.width * scaleFactor;
    const scaledHeight = img.height * scaleFactor;
    
    // 累加总尺寸（如果是纵向就累加高度，横向就累加宽度）
    totalSize += isVertical ? scaledHeight : scaledWidth;
    
    // 返回包含缩放后尺寸的新对象
    return { ...img, scaledWidth, scaledHeight, scaleFactor };
  });
  
  // 最终画布的尺寸 = (参考尺寸或累加总尺寸) * 用户设置的缩放比例
  const outputWidth = (isVertical ? referenceDimension : totalSize) * options.scale;
  const outputHeight = (isVertical ? totalSize : referenceDimension) * options.scale;
  
  // 创建一个 HTML5 Canvas 元素用于绘制图像
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  
  // 获取 2D 渲染上下文
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not get canvas context");
  
  // 填充白色背景（防止图片有透明区域导致背景变黑）
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 开启抗锯齿，使缩放后的图片更清晰
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  let currentPos = 0; // 当前绘制的位置游标
  
  // 遍历处理过的图片数据，将它们一张张画到 Canvas 上
  for (const imgData of processedImages) {
    const imgElement = new Image();
    
    // 使用 Promise 确保图片加载完成后再绘制
    await new Promise((resolve, reject) => {
      imgElement.onload = () => resolve();
      imgElement.onerror = reject;
      imgElement.src = imgData.previewUrl;
    });
    
    // 计算要绘制的宽高
    const drawWidth = imgData.scaledWidth * options.scale;
    const drawHeight = imgData.scaledHeight * options.scale;
    
    // 执行绘制
    if (isVertical) { 
      // 纵向：x 坐标为 0，y 坐标为 currentPos
      ctx.drawImage(imgElement, 0, currentPos, drawWidth, drawHeight); 
      currentPos += drawHeight; // 更新游标
    } else { 
      // 横向：x 坐标为 currentPos，y 坐标为 0
      ctx.drawImage(imgElement, currentPos, 0, drawWidth, drawHeight); 
      currentPos += drawWidth; 
    }
  }
  
  // 如果用户选择导出 PDF，Canvas 本身不支持直接导出 pdf，所以先转为高质量的 jpeg
  const imageFormat = options.format === 'application/pdf' ? 'image/jpeg' : options.format;
  
  // 将 Canvas 转换为 Data URL（一种以 Base64 编码的图片字符串），并返回
  return { 
      url: canvas.toDataURL(imageFormat, options.quality), 
      width: outputWidth, 
      height: outputHeight 
  };
};

/**
 * formatFileSize: 格式化文件大小
 * 将字节数 (Bytes) 转换为易读的格式 (KB, MB, GB)
 * @param {number} bytes - 文件字节数
 * @returns {string} - 格式化后的字符串 (例如 "1.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  // 通过对数计算出所在的单位层级 (0=B, 1=KB, 2=MB...)
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // 保留两位小数并拼接单位
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
