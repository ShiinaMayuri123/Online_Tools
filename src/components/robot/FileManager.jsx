import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, AppWindow, ChevronDown, ChevronRight, Download,
  File, Folder, FolderOpen, Info, LoaderCircle, MoreHorizontal, Package,
  RefreshCw, Trash2, Upload, X,
} from 'lucide-react';
import { ADB_DOCUMENT_TREE, ADB_FILE_NOTES } from '../../config/adbData';

const ROOT_PATH = '/sdcard';
const MUTATION_ROOTS = ['/sdcard/pudu', '/sdcard/PuduRobotMap', '/sdcard/PuduRobotLog', '/sdcard/pdconfig'];
const ROW_HEIGHT = 52;
const LOCAL_DESTINATION_KEY = 'adb_local_destination';

const APP_DESCRIPTIONS = {
  'com.pudutech.pdrobot': '机器人主控制 App',
  'com.pudutech.mapify': '地图相关',
  'com.pudutech.rgbdviewer': 'RGBD 视觉查看',
  'com.pudutech.factory_test': '出厂测试',
  'com.pudutech.remotemaintenance': '远程维护',
};

const formatBytes = (value) => {
  if (!Number.isFinite(value)) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const parentPath = (path) => {
  if (path === ROOT_PATH) return ROOT_PATH;
  const value = path.split('/').slice(0, -1).join('/');
  return value || ROOT_PATH;
};

const joinPath = (directory, name) => `${directory.replace(/\/$/, '')}/${name}`;
const canMutate = (path) => MUTATION_ROOTS.some(root => path.startsWith(`${root}/`) || path === root) && !MUTATION_ROOTS.includes(path);

const noteFor = (path) => ADB_FILE_NOTES[path] || '';

const buildDocumentTreeCache = (node, cache = {}) => {
  cache[node.path] = {
    source: 'document',
    entries: (node.children || []).map(child => ({
      name: child.name,
      type: child.type,
      size: null,
      perm: '-',
      mtime: '文档参考',
      source: 'document',
    })),
  };
  (node.children || []).filter(child => child.type === 'dir').forEach(child => {
    buildDocumentTreeCache({ ...child, path: joinPath(node.path, child.name) }, cache);
  });
  return cache;
};

const DOCUMENT_TREE_CACHE = buildDocumentTreeCache(ADB_DOCUMENT_TREE);

function FileTreeNode({ path, label, treeCache, expandedPaths, onToggle, onNavigate, level = 0 }) {
  const node = treeCache[path];
  const isExpanded = expandedPaths.has(path);
  const children = node?.entries?.filter(entry => entry.type === 'dir') || [];
  return (
    <div>
      <div className={`flex items-center gap-1 rounded-md pr-2 hover:bg-slate-100 ${level === 0 ? 'bg-slate-50' : ''}`}>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center text-slate-400 hover:text-slate-700"
          onClick={() => onToggle(path)}
          aria-label={isExpanded ? `收起 ${label}` : `展开 ${label}`}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <button type="button" onClick={() => onNavigate(path)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-xs text-slate-700">
          {isExpanded ? <FolderOpen size={15} className="shrink-0 text-amber-500" /> : <Folder size={15} className="shrink-0 text-amber-500" />}
          <span className="truncate">{label}</span>
        </button>
      </div>
      {isExpanded && children.length > 0 && (
        <div className="ml-4 border-l border-slate-200 pl-1">
          {children.map(child => (
            <FileTreeNode
              key={child.name}
              path={joinPath(path, child.name)}
              label={child.name}
              treeCache={treeCache}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DangerModal({ action, inputValue, onInput, onCancel, onConfirm, busy }) {
  if (!action) return null;
  const labels = { delete: '删除', overwrite: '覆盖推送', 'pull-overwrite': '覆盖本地文件', uninstall: '卸载应用', clear: '清除应用数据' };
  const label = labels[action.kind] || '执行操作';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="file-manager-danger-title">
      <div className="w-full max-w-lg rounded-xl border border-rose-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-rose-100 p-2 text-rose-600"><AlertTriangle size={20} /></div>
          <div className="min-w-0 flex-1">
            <h2 id="file-manager-danger-title" className="font-bold text-slate-900">确认{label}</h2>
            <p className="mt-1 text-sm text-slate-500">这是不可逆或可能覆盖数据的操作，请输入完整目标后继续。</p>
            <code className="mt-3 block break-all rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{action.target}</code>
          </div>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-700" title="关闭"><X size={18} /></button>
        </div>
        <input autoFocus value={inputValue} onChange={event => onInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && onConfirm()} placeholder="输入上方完整目标" className="mt-4 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">取消</button>
          <button type="button" onClick={onConfirm} disabled={busy || inputValue !== action.target} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40">{busy ? '执行中...' : `确认${label}`}</button>
        </div>
      </div>
    </div>
  );
}

function ContextMenu({ menu, onAction, onClose, canOperate }) {
  if (!menu) return null;
  const isApp = menu.kind === 'app';
  const path = isApp ? menu.package : menu.path;
  const writable = !isApp && canMutate(path);
  return (
    <div className="fixed z-40 w-48 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl" style={{ left: Math.min(menu.x, window.innerWidth - 210), top: Math.min(menu.y, window.innerHeight - 260) }} onContextMenu={event => event.preventDefault()}>
      {!isApp && menu.type === 'dir' && <button type="button" onClick={() => onAction('open')} className="menu-item">打开目录</button>}
      {!isApp && menu.type !== 'link' && <button type="button" disabled={!canOperate} onClick={() => onAction('pull')} className={`menu-item ${!canOperate ? 'menu-item-disabled' : ''}`}><Download size={14} />拉取</button>}
      {!isApp && writable && <button type="button" disabled={!canOperate} onClick={() => onAction('push')} className={`menu-item ${!canOperate ? 'menu-item-disabled' : ''}`}><Upload size={14} />推送到此处</button>}
      {!isApp && writable && <button type="button" disabled={!canOperate} onClick={() => onAction('delete')} className={`menu-item danger ${!canOperate ? 'menu-item-disabled' : ''}`}><Trash2 size={14} />删除</button>}
      {isApp && <button type="button" disabled={!canOperate} onClick={() => onAction('force-stop')} className={`menu-item ${!canOperate ? 'menu-item-disabled' : ''}`}>强制停止</button>}
      {isApp && <button type="button" disabled={!canOperate} onClick={() => onAction('clear')} className={`menu-item danger ${!canOperate ? 'menu-item-disabled' : ''}`}>清除数据</button>}
      {isApp && <button type="button" disabled={!canOperate} onClick={() => onAction('uninstall')} className={`menu-item danger ${!canOperate ? 'menu-item-disabled' : ''}`}><Trash2 size={14} />卸载应用</button>}
      <div className="my-1 border-t border-slate-100" />
      <button type="button" onClick={onClose} className="menu-item text-slate-400">取消</button>
    </div>
  );
}

export default function FileManager({ agentBaseUrl, agentToken, connectedDevice, onRecordOperation }) {
  const [activeView, setActiveView] = useState('files');
  const [currentPath, setCurrentPath] = useState(ROOT_PATH);
  const [treeCache, setTreeCache] = useState(() => DOCUMENT_TREE_CACHE);
  const [expandedPaths, setExpandedPaths] = useState(new Set([ROOT_PATH]));
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [dangerAction, setDangerAction] = useState(null);
  const [dangerInput, setDangerInput] = useState('');
  const [dangerBusy, setDangerBusy] = useState(false);
  const [transfer, setTransfer] = useState(null);
  const [localDestination, setLocalDestination] = useState(() => {
    try {
      return localStorage.getItem(LOCAL_DESTINATION_KEY) || '';
    } catch {
      return '';
    }
  });
  const [apps, setApps] = useState([]);
  const [appSearch, setAppSearch] = useState('');
  const [appsLoading, setAppsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);
  const fileInputRef = useRef(null);
  const viewportRef = useRef(null);
  const uploadXhrRef = useRef(null);
  const pollRef = useRef(null);
  const treeCacheRef = useRef(DOCUMENT_TREE_CACHE);
  const canOperate = Boolean(agentBaseUrl && agentToken && connectedDevice);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_DESTINATION_KEY, localDestination);
    } catch {
      // 浏览器禁用存储时仍允许当前会话使用输入目录。
    }
  }, [localDestination]);

  const requestJson = useCallback(async (path, options = {}) => {
    if (!agentBaseUrl || !agentToken) throw new Error('本地连接助手未就绪');
    const response = await fetch(`${agentBaseUrl}${path}`, {
      ...options,
      headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${agentToken}`, ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const error = new Error(data.error || `请求失败（${response.status}）`);
      error.data = data;
      error.status = response.status;
      throw error;
    }
    return data;
  }, [agentBaseUrl, agentToken]);

  const showNotice = useCallback((type, message) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const record = useCallback((name, fullCmd, status, output = '', error = '') => {
    onRecordOperation?.({ name, category: '文件管理器', fullCmd, status, output, error });
  }, [onRecordOperation]);

  const loadDirectory = useCallback(async (path, { navigate = false, force = false } = {}) => {
    if (!agentBaseUrl || !connectedDevice) {
      if (navigate && treeCacheRef.current[path]?.entries) {
        setCurrentPath(path);
        setSelectedEntry(null);
      }
      return;
    }
    if (!force && treeCacheRef.current[path]?.entries) {
      if (navigate) setCurrentPath(path);
      return;
    }
    setLoading(true);
    try {
      const data = await requestJson('/adb/ls', { method: 'POST', body: JSON.stringify({ path, device: connectedDevice }) });
      setTreeCache(prev => {
        const next = { ...prev, [path]: { entries: data.entries || [], loadedAt: Date.now() } };
        treeCacheRef.current = next;
        return next;
      });
      if (navigate) {
        setCurrentPath(path);
        setSelectedEntry(null);
      }
    } catch (error) {
      showNotice('error', error.message);
    } finally {
      setLoading(false);
    }
  }, [agentBaseUrl, connectedDevice, requestJson, showNotice]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPath(ROOT_PATH);
      setExpandedPaths(new Set([ROOT_PATH]));
      setSelectedEntry(null);
      if (agentBaseUrl && connectedDevice) {
        treeCacheRef.current = {};
        setTreeCache({});
        loadDirectory(ROOT_PATH, { navigate: true, force: true });
      } else {
        treeCacheRef.current = DOCUMENT_TREE_CACHE;
        setTreeCache(DOCUMENT_TREE_CACHE);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [agentBaseUrl, connectedDevice, loadDirectory]);

  useEffect(() => {
    if (activeView !== 'apps' || !agentBaseUrl || !connectedDevice) return;
    const timer = window.setTimeout(() => {
      setAppsLoading(true);
      requestJson('/adb/packages', { method: 'POST', body: JSON.stringify({ device: connectedDevice }) })
        .then(data => setApps(data.packages || []))
        .catch(error => showNotice('error', error.message))
        .finally(() => setAppsLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeView, agentBaseUrl, connectedDevice, requestJson, showNotice]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    const keydown = event => event.key === 'Escape' && close();
    document.addEventListener('click', close);
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', keydown);
      window.clearTimeout(pollRef.current);
      uploadXhrRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!viewportRef.current) return undefined;
    const observer = new ResizeObserver(entries => setViewportHeight(entries[0].contentRect.height));
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [activeView]);

  const currentEntries = useMemo(() => treeCache[currentPath]?.entries || [], [treeCache, currentPath]);
  const sortedEntries = useMemo(() => [...currentEntries].sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  }), [currentEntries]);
  const visibleStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 4);
  const visibleEnd = Math.min(sortedEntries.length, visibleStart + Math.ceil(viewportHeight / ROW_HEIGHT) + 8);
  const visibleEntries = sortedEntries.slice(visibleStart, visibleEnd);
  const filteredApps = useMemo(() => apps.filter(pkg => pkg.startsWith('com.pudutech.') && pkg.toLowerCase().includes(appSearch.trim().toLowerCase())), [apps, appSearch]);

  const refreshCurrent = () => loadDirectory(currentPath, { navigate: true, force: true });

  const toggleTree = async (path) => {
    const next = new Set(expandedPaths);
    if (next.has(path)) next.delete(path);
    else {
      next.add(path);
      await loadDirectory(path, { force: !treeCacheRef.current[path]?.entries });
    }
    setExpandedPaths(next);
  };

  const navigate = (path) => loadDirectory(path, { navigate: true, force: true });

  const startPolling = (taskId, operation, label) => {
    window.clearTimeout(pollRef.current);
    const poll = async () => {
      try {
        const data = await requestJson(`/adb/transfer/${taskId}`);
        const task = data.data;
        setTransfer(task);
        if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
          if (task.status === 'completed') {
            record(label, `${operation} ${label}`, 'success', task.message);
            if (operation === '拉取' && !task.localPath) throw new Error('代理未确认本地文件已写入');
            showNotice('success', task.message || `${label}已完成`);
          } else if (task.status === 'failed') {
            record(label, `${operation} ${label}`, 'error', '', task.error);
            showNotice('error', task.error || `${label}失败`);
          }
          window.clearTimeout(pollRef.current);
          return;
        }
        pollRef.current = window.setTimeout(poll, 600);
      } catch (error) {
        showNotice('error', error.message);
        window.clearTimeout(pollRef.current);
      }
    };
    poll();
  };

  const startPull = async (path, confirmTarget = '') => {
    if (!canOperate) return;
    if (!localDestination.trim()) {
      showNotice('error', '请先填写本地保存目录');
      return;
    }
    setContextMenu(null);
    try {
      const data = await requestJson('/adb/pull', { method: 'POST', body: JSON.stringify({ remotePath: path, localDir: localDestination.trim(), device: connectedDevice, confirmTarget }) });
      setTransfer({ taskId: data.taskId, status: 'queued', progress: 0, phase: '等待执行', label: path });
      startPolling(data.taskId, '拉取', path);
    } catch (error) {
      if (error.status === 409 && error.data?.requiresConfirmation) {
        setDangerInput('');
        setDangerAction({ kind: 'pull-overwrite', target: error.data.target, path });
      } else showNotice('error', error.message);
    }
  };

  const startPushUpload = (file, remoteDir, confirmTarget = '') => {
    if (!file || !canOperate) return;
    setContextMenu(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('remoteDir', remoteDir);
    formData.append('device', connectedDevice);
    if (confirmTarget) formData.append('confirmTarget', confirmTarget);
    const xhr = new XMLHttpRequest();
    uploadXhrRef.current = xhr;
    setTransfer({ status: 'uploading', progress: 0, phase: '上传到本地代理', label: file.name });
    xhr.open('POST', `${agentBaseUrl}/adb/push`);
    xhr.setRequestHeader('Authorization', `Bearer ${agentToken}`);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) setTransfer(prev => ({ ...prev, progress: Math.round(event.loaded / event.total * 50), phase: '上传到本地代理' }));
    };
    xhr.onerror = () => showNotice('error', '上传请求失败');
    xhr.onabort = () => setTransfer(null);
    xhr.onload = () => {
      uploadXhrRef.current = null;
      const data = JSON.parse(xhr.responseText || '{}');
      if (xhr.status === 409 && data.requiresConfirmation) {
        setTransfer(null);
        setDangerInput('');
        setDangerAction({ kind: 'overwrite', target: data.target, file, remoteDir });
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !data.success) {
        setTransfer(null);
        showNotice('error', data.error || '推送失败');
        return;
      }
      setTransfer({ taskId: data.taskId, status: 'queued', progress: 50, phase: '推送到设备', label: data.target });
      startPolling(data.taskId, '推送', data.target);
    };
    xhr.send(formData);
  };

  const choosePush = (remoteDir, file = null) => {
    if (!canOperate) return;
    setContextMenu(null);
    if (file) startPushUpload(file, remoteDir);
    else {
      fileInputRef.current.dataset.remoteDir = remoteDir;
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const cancelTransfer = async () => {
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
      setTransfer(null);
      return;
    }
    if (!transfer?.taskId) return;
    await requestJson(`/adb/transfer/${transfer.taskId}`, { method: 'DELETE' }).catch(error => showNotice('error', error.message));
    setTransfer(null);
  };

  const handleMenuAction = (action) => {
    const menu = contextMenu;
    setContextMenu(null);
    if (!menu) return;
    if (action !== 'open' && !canOperate) return;
    if (menu.kind === 'app') {
      if (action === 'force-stop') executeAppAction('force-stop', menu.package);
      if (action === 'clear') openDanger({ kind: 'clear', target: menu.package, package: menu.package });
      if (action === 'uninstall') openDanger({ kind: 'uninstall', target: menu.package, package: menu.package });
      return;
    }
    if (action === 'open') navigate(menu.path);
    if (action === 'pull') startPull(menu.path);
    if (action === 'push') choosePush(menu.type === 'dir' ? menu.path : parentPath(menu.path));
    if (action === 'delete') openDanger({ kind: 'delete', target: menu.path, path: menu.path });
  };

  const openDanger = (action) => {
    setDangerInput('');
    setDangerAction(action);
  };

  const executeAppAction = async (action, packageName, confirmTarget = '') => {
    if (!canOperate) return;
    const endpoint = action === 'force-stop' ? '/adb/app-force-stop' : action === 'clear' ? '/adb/app-clear' : '/adb/uninstall';
    try {
      const data = await requestJson(endpoint, { method: 'POST', body: JSON.stringify({ package: packageName, device: connectedDevice, confirmTarget }) });
      record(action, `${action} ${packageName}`, 'success', data.stdout || data.message || '操作完成');
      showNotice('success', `${packageName}：${action}完成`);
      if (action === 'uninstall') setApps(prev => prev.filter(item => item !== packageName));
    } catch (error) {
      if (error.status === 409 && error.data?.requiresConfirmation) openDanger({ kind: action, target: packageName, package: packageName });
      else showNotice('error', error.message);
    }
  };

  const confirmDanger = async () => {
    if (!canOperate || !dangerAction || dangerInput !== dangerAction.target) return;
    setDangerBusy(true);
    try {
      if (dangerAction.kind === 'overwrite') {
        setDangerAction(null);
        startPushUpload(dangerAction.file, dangerAction.remoteDir, dangerAction.target);
        return;
      }
      if (dangerAction.kind === 'pull-overwrite') {
        setDangerAction(null);
        startPull(dangerAction.path, dangerAction.target);
        return;
      }
      if (dangerAction.kind === 'delete') {
        const data = await requestJson('/adb/rm', { method: 'POST', body: JSON.stringify({ path: dangerAction.path, device: connectedDevice, confirmTarget: dangerAction.target }) });
        record('删除', `adb rm -rf ${dangerAction.path}`, 'success', data.stdout || '删除完成');
        await loadDirectory(currentPath, { navigate: true, force: true });
        showNotice('success', '删除完成');
      } else {
        await executeAppAction(dangerAction.kind, dangerAction.package, dangerAction.target);
      }
      setDangerAction(null);
    } catch (error) {
      showNotice('error', error.message);
    } finally {
      setDangerBusy(false);
    }
  };

  const onFileSelected = event => {
    const file = event.target.files?.[0];
    const remoteDir = event.target.dataset.remoteDir;
    if (file && remoteDir) startPushUpload(file, remoteDir);
  };

  const onDrop = event => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file && canOperate && canMutate(currentPath)) startPushUpload(file, currentPath);
  };

  const openMenu = (event, menu) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ ...menu, x: event.clientX, y: event.clientY });
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean).map((part, index, all) => ({ label: part, path: `/${all.slice(0, index + 1).join('/')}` }));
  const currentNote = noteFor(currentPath);

  return (
    <div className="relative space-y-4" onClick={() => contextMenu && setContextMenu(null)}>
      <style>{`.menu-item{display:flex;width:100%;align-items:center;gap:.5rem;border-radius:.375rem;padding:.5rem .625rem;text-align:left;font-size:.75rem;color:#334155}.menu-item:hover{background:#f1f5f9}.menu-item.danger{color:#e11d48}.menu-item.danger:hover{background:#fff1f2}.menu-item:disabled{cursor:not-allowed;color:#94a3b8;opacity:.55}.menu-item:disabled:hover{background:transparent}`}</style>
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">设备文件管理器</h2>
          <p className="mt-1 text-xs text-slate-500">实时浏览 /sdcard；推送和删除仅允许机器人数据目录</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          <button type="button" onClick={() => setActiveView('files')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${activeView === 'files' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Folder size={14} className="mr-1 inline" />文件</button>
          <button type="button" onClick={() => setActiveView('apps')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${activeView === 'apps' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><AppWindow size={14} className="mr-1 inline" />应用</button>
        </div>
      </div>

      {!connectedDevice && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">当前显示文档中的设备文件夹结构参考；连接设备后将替换为实时目录，拉取、推送和删除等设备操作已禁用。</div>}
      {notice && <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{notice.message}</div>}
      {activeView === 'files' && <label className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">本地保存目录<input value={localDestination} onChange={event => setLocalDestination(event.target.value)} placeholder="例如 D:\\Logs" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 outline-none focus:border-blue-400" /><span className="mt-1 block text-[11px] text-slate-400">拉取由本地代理直接写入该已存在目录，任务完成后才会显示成功。</span></label>}

      {activeView === 'files' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between px-1"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">目录</span><button type="button" disabled={!canOperate} onClick={() => loadDirectory(currentPath, { navigate: true, force: true })} className="text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40" title="刷新当前目录"><RefreshCw size={15} /></button></div>
            <div className="max-h-[560px] overflow-auto"><FileTreeNode path={ROOT_PATH} label="/sdcard" treeCache={treeCache} expandedPaths={expandedPaths} onToggle={toggleTree} onNavigate={navigate} /></div>
          </aside>

          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex min-w-0 items-center gap-1 text-sm text-slate-600">
                <button type="button" onClick={() => navigate(ROOT_PATH)} className="shrink-0 font-semibold text-slate-800 hover:text-blue-600">/sdcard</button>
                {breadcrumbs.slice(1).map(crumb => <span key={crumb.path} className="flex min-w-0 items-center gap-1"><ChevronRight size={14} className="shrink-0 text-slate-300" /><button type="button" onClick={() => navigate(crumb.path)} className="truncate hover:text-blue-600">{crumb.label}</button></span>)}
              </div>
              <div className="flex items-center gap-2"><span className="text-[11px] text-slate-400">{sortedEntries.length} 项</span><button type="button" disabled={!canOperate} onClick={refreshCurrent} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40" title="刷新"><RefreshCw size={15} /></button></div>
            </div>
            {currentNote && <div className="mt-3 flex items-start gap-2 rounded-md bg-cyan-50 px-3 py-2 text-xs text-cyan-800"><Info size={14} className="mt-0.5 shrink-0" />{currentNote}</div>}
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_90px_150px_34px] gap-3 border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><span>名称</span><span>大小</span><span>修改时间</span><span /></div>
            <div ref={viewportRef} onScroll={event => setScrollTop(event.currentTarget.scrollTop)} className="relative mt-1 h-[520px] max-h-[58vh] min-h-[320px] overflow-auto" onDragOver={event => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={onDrop}>
              {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70"><LoaderCircle size={22} className="animate-spin text-blue-500" /></div>}
              {!loading && !sortedEntries.length && <div className="flex h-full items-center justify-center text-sm text-slate-400">目录为空或暂无读取结果</div>}
              <div style={{ height: sortedEntries.length * ROW_HEIGHT, position: 'relative' }}>
                <div style={{ position: 'absolute', top: visibleStart * ROW_HEIGHT, left: 0, right: 0 }}>
                  {visibleEntries.map(entry => {
                    const path = joinPath(currentPath, entry.name);
                    const isSelected = selectedEntry?.path === path;
                    return <div key={`${entry.name}-${entry.mtime}`} onClick={() => setSelectedEntry({ ...entry, path })} onDoubleClick={() => entry.type === 'dir' && navigate(path)} onContextMenu={event => openMenu(event, { kind: 'entry', path, type: entry.type, entry })} className={`group grid h-[52px] grid-cols-[minmax(0,1fr)_90px_150px_34px] items-center gap-3 border-b border-slate-50 px-3 text-xs ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="flex min-w-0 items-center gap-2">{entry.type === 'dir' ? <Folder size={17} className="shrink-0 text-amber-500" /> : <File size={17} className="shrink-0 text-slate-400" />}<span className="truncate text-slate-700" title={entry.name}>{entry.name}</span>{entry.type === 'link' && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-400">链接</span>}</span>
                      <span className="text-slate-400">{entry.type === 'dir' ? '-' : formatBytes(entry.size)}</span><span className="truncate text-slate-400" title="设备时钟可能不准">{entry.mtime || '-'}*</span><button type="button" onClick={event => openMenu(event, { kind: 'entry', path, type: entry.type, entry })} className="rounded p-1 text-slate-300 opacity-0 hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100" title="更多操作"><MoreHorizontal size={16} /></button>
                    </div>;
                  })}
                </div>
              </div>
              {dragActive && canMutate(currentPath) && <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/90 text-sm font-semibold text-blue-700">松开即可推送到当前目录</div>}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">* 设备时钟可能不准；左键选择，双击目录进入，右键或更多按钮打开操作菜单。</p>
            {selectedEntry && <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500 sm:grid-cols-2"><div className="sm:col-span-2"><span className="text-slate-400">路径：</span><code className="break-all text-slate-700">{selectedEntry.path}</code></div><div><span className="text-slate-400">类型：</span>{selectedEntry.type}</div><div><span className="text-slate-400">大小：</span>{formatBytes(selectedEntry.size)}</div><div><span className="text-slate-400">权限：</span>{selectedEntry.perm || '-'}</div><div><span className="text-slate-400">修改时间：</span>{selectedEntry.mtime || '-'}（设备时间）</div></div>}
            {canMutate(currentPath) && <button type="button" disabled={!canOperate} onClick={() => choosePush(currentPath)} className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Upload size={14} />选择文件推送</button>}
          </section>
        </div>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3"><div><h3 className="font-bold text-slate-800">已安装 PUDU 应用</h3><p className="mt-1 text-xs text-slate-400">卸载和清除数据需要输入完整包名确认</p></div><div className="flex gap-2"><input value={appSearch} onChange={event => setAppSearch(event.target.value)} placeholder="搜索包名" className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400" /><button type="button" onClick={() => setActiveView('apps')} className="rounded-md p-2 text-slate-400 hover:bg-slate-100" title="刷新应用"><RefreshCw size={15} /></button></div></div>
          {appsLoading ? <div className="flex h-48 items-center justify-center"><LoaderCircle size={22} className="animate-spin text-blue-500" /></div> : <div className="mt-3 divide-y divide-slate-100">{filteredApps.map(packageName => <div key={packageName} onContextMenu={event => openMenu(event, { kind: 'app', package: packageName })} className="group flex items-center justify-between gap-3 px-3 py-3 hover:bg-slate-50"><div className="flex min-w-0 items-center gap-3"><Package size={17} className="shrink-0 text-cyan-500" /><div className="min-w-0"><code className="block truncate text-sm text-slate-700">{packageName}</code><span className="text-xs text-slate-400">{APP_DESCRIPTIONS[packageName] || 'PUDU 相关应用'}</span></div></div><button type="button" onClick={event => openMenu(event, { kind: 'app', package: packageName })} className="rounded p-1 text-slate-300 hover:bg-slate-200 hover:text-slate-700" title="应用操作"><MoreHorizontal size={17} /></button></div>)}{!filteredApps.length && <div className="py-12 text-center text-sm text-slate-400">未找到已安装的 com.pudutech 应用</div>}</div>}
        </section>
      )}

      {transfer && <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-blue-800">{transfer.label || '文件传输'}</span><button type="button" onClick={cancelTransfer} className="rounded-md border border-blue-200 px-2 py-1 text-blue-700 hover:bg-white">取消</button></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full bg-blue-500 transition-all" style={{ width: `${transfer.progress == null ? 35 : Math.max(3, transfer.progress)}%` }} /></div><p className="mt-1 text-[11px] text-blue-600">{transfer.phase || '处理中'}{transfer.progress != null ? ` · ${transfer.progress}%` : ''}</p></div>}

      <ContextMenu menu={contextMenu} onAction={handleMenuAction} onClose={() => setContextMenu(null)} canOperate={canOperate} />
      <DangerModal action={dangerAction} inputValue={dangerInput} onInput={setDangerInput} onCancel={() => setDangerAction(null)} onConfirm={confirmDanger} busy={dangerBusy} />
    </div>
  );
}
