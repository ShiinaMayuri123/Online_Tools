import React, { useState } from 'react';
import { Activity, Play, Download, CheckCircle, RefreshCw, FileText, Cpu, Battery, HardDrive, Wifi } from 'lucide-react';

/**
 * 机器人一键健康检查与诊断报告生成组件
 * 一键抓取设备信息、硬件状态、CPU、内存、电池、网络及 Logcat/dmesg 日志并打成报告
 */
export default function RobotHealthDiagnostic({ onRunBatchExec }) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [reportResult, setReportResult] = useState(null);

  const diagnosticSteps = [
    { key: 'devices', name: '设备连接性检测', cmd: 'adb devices' },
    { key: 'model', name: '获取机器人型号', cmd: 'adb shell getprop ro.product.model' },
    { key: 'version', name: '获取系统版本', cmd: 'adb shell getprop ro.build.version.release' },
    { key: 'uptime', name: '开机运行时长与负载', cmd: 'adb shell uptime' },
    { key: 'battery', name: '电池电量与状态', cmd: 'adb shell dumpsys battery' },
    { key: 'disk', name: '磁盘存储容量 (df -h)', cmd: 'adb shell df -h' },
    { key: 'cpu', name: 'CPU 进程占用状态', cmd: 'adb shell dumpsys cpuinfo' },
    { key: 'mem', name: '内存系统分配状态', cmd: 'adb shell dumpsys meminfo' },
    { key: 'network', name: '网络 IP 地址配置', cmd: 'adb shell ip addr' },
    { key: 'logcat', name: '抓取系统 App 日志', cmd: 'adb logcat -d' },
    { key: 'dmesg', name: '抓取 Linux 内核日志', cmd: 'adb shell dmesg' },
  ];

  const handleStartDiagnostic = async () => {
    setIsRunning(true);
    setProgress(0);
    setReportResult(null);

    const reportData = {
      timestamp: new Date().toLocaleString(),
      results: {},
    };

    for (let i = 0; i < diagnosticSteps.length; i++) {
      const step = diagnosticSteps[i];
      setCurrentTask(step.name);
      setProgress(Math.round(((i + 1) / diagnosticSteps.length) * 100));

      try {
        const res = await onRunBatchExec(step.cmd);
        reportData.results[step.key] = {
          name: step.name,
          cmd: step.cmd,
          success: res?.success !== false,
          output: res?.stdout || res?.data || (typeof res === 'string' ? res : 'No Output'),
        };
      } catch (err) {
        reportData.results[step.key] = {
          name: step.name,
          cmd: step.cmd,
          success: false,
          error: err.message,
        };
      }
    }

    setReportResult(reportData);
    setIsRunning(false);
    setCurrentTask('诊断完成');
  };

  const handleDownloadReport = () => {
    if (!reportResult) return;
    const jsonStr = JSON.stringify(reportResult, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `robot_diagnostic_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 space-y-4">
      {/* 头部标题与控制按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>机器人一键健康诊断</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                1-Click Health Check
              </span>
            </h3>
            <p className="text-xs text-slate-400">一键抓取设备硬件、系统负载、电池、网络及内核/Logcat 全套健康度报告</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {reportResult && (
            <button
              onClick={handleDownloadReport}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>导出报告 JSON</span>
            </button>
          )}

          <button
            disabled={isRunning}
            onClick={handleStartDiagnostic}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              isRunning
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 cursor-pointer'
            }`}
          >
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? '诊断进行中...' : '开始一键排查'}</span>
          </button>
        </div>
      </div>

      {/* 进度条 */}
      {isRunning && (
        <div className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="flex justify-between text-xs text-slate-300 font-medium">
            <span>正在执行: {currentTask}</span>
            <span className="font-mono text-emerald-400">{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 诊断报告结果看板 */}
      {reportResult && (
        <div className="mt-3 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> 报告生成时间: {reportResult.timestamp}
            </span>
            <span className="text-slate-500">检测项数: {Object.keys(reportResult.results).length} / 11</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-blue-400" /> 设备型号
              </div>
              <div className="text-xs font-mono font-semibold text-slate-200 mt-1 truncate">
                {reportResult.results.model?.output?.trim() || '未知'}
              </div>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Battery className="w-3.5 h-3.5 text-amber-400" /> 系统版本
              </div>
              <div className="text-xs font-mono font-semibold text-slate-200 mt-1 truncate">
                Android {reportResult.results.version?.output?.trim() || '未知'}
              </div>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> 运行时长
              </div>
              <div className="text-xs font-mono font-semibold text-slate-200 mt-1 truncate">
                {reportResult.results.uptime?.output?.trim() || '未知'}
              </div>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-purple-400" /> 日志捕获
              </div>
              <div className="text-xs font-mono font-semibold text-emerald-400 mt-1">
                已就绪 (Logcat/dmesg)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
