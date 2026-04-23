import { useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ParticleBackground: 粒子动画背景组件
 * 使用 HTML5 Canvas 绘制随机移动且具有鼠标交互效果的粒子系统。
 */
const ParticleBackground = () => {
  const canvasRef = useRef(null); // 获取 canvas DOM 元素
  const { theme } = useTheme(); // 订阅当前主题

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 获取 2D 绘图上下文
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let particles = [];
    let animationFrameId;
    let mouse = { x: -9999, y: -9999 }; // 记录鼠标位置，默认在屏幕外
    
    // 自适应窗口大小
    const resize = () => { 
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
        initParticles(); // 窗口调整时重新初始化粒子
    };
    
    // 初始化粒子数组
    const initParticles = () => {
      particles = [];
      // 根据屏幕面积计算粒子的数量，防止密集恐惧症或性能问题
      const particleCount = Math.floor(window.innerWidth * window.innerHeight / 8000); 
      for(let i = 0; i < particleCount; i++) {
        particles.push({ 
            x: Math.random() * canvas.width, // 随机 X 坐标
            y: Math.random() * canvas.height, // 随机 Y 坐标
            vx: (Math.random() - 0.5) * 1.5, // X 轴移动速度
            vy: (Math.random() - 0.5) * 1.5, // Y 轴移动速度
            size: Math.random() * 2 + 2 // 粒子大小
        });
      }
    };
    
    // 渲染每一帧
    const draw = () => {
      // 每一帧开始前清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, i) => {
        // 更新位置
        p.x += p.vx; 
        p.y += p.vy;
        
        // 边界碰撞检测：碰到边缘就反弹（反向速度）
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        // 鼠标交互：计算粒子到鼠标的距离
        const dx = mouse.x - p.x; 
        const dy = mouse.y - p.y; 
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // 如果鼠标靠近（距离小于 200），让粒子产生排斥效果
        if (dist < 200) { 
            const angle = Math.atan2(dy, dx); 
            const force = (200 - dist) / 200; 
            const push = force * 8; 
            p.x -= Math.cos(angle) * push; 
            p.y -= Math.sin(angle) * push; 
        }
        
        // 绘制圆形粒子
        ctx.fillStyle = theme.particleColor; 
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); 
        ctx.fill();
        
        // 连线逻辑：遍历其余粒子，如果距离很近，就画一条连线
        for (let j = i + 1; j < particles.length; j++) {
           const p2 = particles[j]; 
           const lineDx = p.x - p2.x; 
           const lineDy = p.y - p2.y; 
           const lineDist = Math.sqrt(lineDx*lineDx + lineDy*lineDy);
           
           if (lineDist < 130) {
             // 根据当前的 rgba 颜色截取 baseColor
             const baseColor = theme.particleColor.includes('rgba') 
                ? theme.particleColor.substring(0, theme.particleColor.lastIndexOf(',')) 
                : theme.particleColor.replace(')', '');
                
             // 线条越远越透明
             ctx.strokeStyle = `${baseColor}, ${0.4 * (1 - lineDist / 130)})`; 
             ctx.lineWidth = 1.5; 
             ctx.beginPath(); 
             ctx.moveTo(p.x, p.y); 
             ctx.lineTo(p2.x, p2.y); 
             ctx.stroke();
           }
        }
      });
      // 循环调用下一帧
      animationFrameId = requestAnimationFrame(draw);
    };
    
    // 事件处理：记录鼠标移动
    const handleMouseMove = (e) => { 
        const rect = canvas.getBoundingClientRect(); 
        mouse.x = e.clientX - rect.left; 
        mouse.y = e.clientY - rect.top; 
    };
    // 鼠标移出屏幕时重置位置
    const handleMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    
    window.addEventListener('resize', resize); 
    window.addEventListener('mousemove', handleMouseMove); 
    window.addEventListener('mouseout', handleMouseLeave);
    
    // 初始化执行
    resize(); 
    draw();
    
    // 组件销毁时的清理工作：移除监听器并取消动画，防止内存泄漏
    return () => { 
        window.removeEventListener('resize', resize); 
        window.removeEventListener('mousemove', handleMouseMove); 
        window.removeEventListener('mouseout', handleMouseLeave); 
        cancelAnimationFrame(animationFrameId); 
    };
  }, [theme]); // 当主题改变时，重新触发动画初始化

  return <canvas ref={canvasRef} className="absolute inset-0 z-[1] pointer-events-none transition-opacity duration-1000" />;
};

export default ParticleBackground;
