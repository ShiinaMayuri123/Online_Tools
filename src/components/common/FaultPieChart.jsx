import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * FaultPieChart: 故障类型分布饼图组件
 * 接收测试记录数组，统计异常类型的分布并以饼图展示。
 * @param {Array} records - 测试记录数组，每条记录需包含 result 和 abnormalType 字段
 */

// 饼图颜色方案
const COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];

const FaultPieChart = ({ records }) => {
  // 统计异常类型的分布
  const abnormalRecords = records.filter(r => r.result === '异常' && r.abnormalType);

  if (abnormalRecords.length === 0) return null;

  // 按异常类型分组计数
  const typeCount = {};
  abnormalRecords.forEach(r => {
    typeCount[r.abnormalType] = (typeCount[r.abnormalType] || 0) + 1;
  });

  // 转换为 recharts 需要的数据格式
  const data = Object.entries(typeCount).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / abnormalRecords.length) * 100).toFixed(1),
  }));

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value, percentage } = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 px-3 py-2">
          <p className="text-sm font-bold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">
            {value} 次 ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // 自定义 Legend
  const CustomLegend = ({ payload }) => (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-slate-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );

  // 自定义标签（显示百分比）
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percentage < 5) return null; // 太小的扇区不显示标签

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${percentage}%`}
      </text>
    );
  };

  return (
    <section className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <h2 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
        故障类型分布
      </h2>

      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>

        {/* 统计摘要 */}
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-500">
            共 <span className="font-bold text-slate-700">{abnormalRecords.length}</span> 次异常
          </p>
        </div>
      </div>
    </section>
  );
};

export default FaultPieChart;
