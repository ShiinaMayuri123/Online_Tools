import { useState, useEffect } from 'react';
import { Shield, Users, Loader2, ExternalLink } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ToolLayout from '../components/common/ToolLayout';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * Admin: 管理后台页面
 * 管理员可以查看用户列表、修改用户角色。
 * 创建/删除用户需要在 Firebase Console 中操作。
 */

const Admin = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 实时监听用户列表
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(userList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 修改角色
  const handleRoleChange = async (uid, newRole) => {
    if (uid === user?.uid) {
      alert('不能修改自己的角色');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (e) {
      alert('修改角色失败: ' + e.message);
    }
  };

  return (
    <ToolLayout
      title="管理后台"
      icon={<Shield size={14} strokeWidth={2.5} />}
      contentClassName="pt-20 sm:pt-24 pb-16 sm:pb-20 px-3 sm:px-6 lg:px-8 max-w-3xl mx-auto relative z-10 space-y-6"
    >
      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <div className="text-blue-500 mt-0.5 shrink-0">
          <ExternalLink size={16} />
        </div>
        <div className="text-sm text-blue-700">
          <p className="font-bold mb-1">创建或删除用户账号</p>
          <p>请在 Firebase Console 的「Authentication」页面中操作：</p>
          <ol className="list-decimal ml-4 mt-1 space-y-0.5">
            <li>添加用户：点击「添加用户」输入邮箱和密码</li>
            <li>删除用户：在用户列表中点击删除图标</li>
            <li>新增用户后，需在 Firestore 的 <code className="bg-blue-100 px-1 rounded">users</code> 集合中手动创建对应文档（字段：<code className="bg-blue-100 px-1 rounded">email</code> 和 <code className="bg-blue-100 px-1 rounded">role: "user"</code>）</li>
          </ol>
        </div>
      </div>

      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Users size={20} className="text-slate-400" />
        <h2 className="text-lg font-bold text-slate-900">用户管理</h2>
        <span className="text-sm text-slate-400">({users.length} 人)</span>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 size={32} className="animate-spin mx-auto text-slate-400" />
        </div>
      )}

      {/* 用户列表 */}
      {!loading && (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900 truncate">{u.email}</span>
                  {u.id === user?.uid && (
                    <span className="text-xs text-slate-400">(当前用户)</span>
                  )}
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                  u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {u.role === 'admin' ? '管理员' : '普通用户'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* 角色切换 */}
                <select
                  value={u.role || 'user'}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  disabled={u.id === user?.uid}
                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!loading && users.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">暂无用户数据，请先在 Firebase Console 中创建用户并在 Firestore 中添加 users 文档</p>
        </div>
      )}
    </ToolLayout>
  );
};

export default Admin;
