'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { admin } from '../../../lib/api';
import api from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import { isStaffRole } from '../../../lib/roles';
import { Users, Eye, RefreshCw, AlertCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

export default function AdminPage() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [adminTab, setAdminTab] = useState('students');
  const [globalOrders, setGlobalOrders] = useState([]);
  const [validationLogs, setValidationLogs] = useState([]);
  const [analytics, setAnalytics] = useState({ totalUsers: 0, activeTrades: 0, totalVolume: 0, rejections: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);
  const { user, authReady, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!authReady) return;
    if (!isStaffRole(user?.role)) {
      router.replace('/dashboard');
    }
  }, [authReady, user?.role, router]);

  useEffect(() => {
    if (!authReady || !isStaffRole(user?.role)) return;
    loadData();
  }, [authReady, user?.role]);

  const [featureFlags, setFeatureFlags] = useState(null);
  const [lotMaster, setLotMaster] = useState({ lots: [], recentChanges: [] });
  const [lotEdit, setLotEdit] = useState({ symbol: 'RELIANCE', lotSize: '250' });
  const [flagsSaving, setFlagsSaving] = useState(false);
  const [revenue, setRevenue] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [segments, setSegments] = useState([]);
  const [abTests, setAbTests] = useState(null);
  const [ticketReply, setTicketReply] = useState({});
  const isAdmin = user?.role === 'admin';

  const loadData = async () => {
    setLoadError('');
    try {
      const [studentsRes, batchesRes, analyticsRes] = await Promise.all([
        admin.getStudents(),
        admin.getBatches(),
        admin.getAnalytics()
      ]);

      const studentList = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      setStudents(studentList);
      setBatches(Array.isArray(batchesRes.data) ? batchesRes.data : []);
      setAnalytics({
        totalUsers: analyticsRes.data?.totalUsers ?? studentList.length,
        activeTrades: analyticsRes.data?.activeTradesToday ?? 0,
        totalVolume: analyticsRes.data?.totalVolumeToday ?? 0,
        rejections: analyticsRes.data?.rejectionsToday ?? 0,
        pendingOrders: analyticsRes.data?.pendingOrders ?? 0
      });

      const optional = await Promise.allSettled([
        admin.getOrders({ limit: 80 }),
        admin.getLotLogs({ limit: 80 }),
        admin.getFeatureFlags(),
        admin.getLotSizes(),
        isAdmin ? admin.getRevenue() : Promise.resolve({ data: null }),
        isAdmin ? admin.getTickets() : Promise.resolve({ data: [] }),
        isAdmin ? admin.getSegmentation() : Promise.resolve({ data: [] }),
        isAdmin ? admin.getAbTests() : Promise.resolve({ data: null })
      ]);

      const pick = (i, fallback) =>
        optional[i].status === 'fulfilled' ? optional[i].value.data : fallback;

      setGlobalOrders(pick(0, []));
      setValidationLogs(pick(1, []));
      setFeatureFlags(pick(2, null));
      setLotMaster(pick(3, { lots: [], recentChanges: [] }));
      if (isAdmin) {
        setRevenue(pick(4, null));
        setTickets(pick(5, []));
        setSegments(pick(6, []));
        setAbTests(pick(7, null));
      }

      const failed = optional.filter((r) => r.status === 'rejected');
      if (failed.length) {
        console.error('Admin optional loads failed:', failed.map((f) => f.reason?.message || f.reason));
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.message || 'Failed to load admin data';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  const saveFeatureFlags = async () => {
    if (!isAdmin || !featureFlags) return;
    setFlagsSaving(true);
    try {
      const { data } = await admin.updateFeatureFlags(featureFlags);
      setFeatureFlags(data);
      alert('Feature flags saved');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save flags');
    } finally {
      setFlagsSaving(false);
    }
  };

  const saveLotSize = async () => {
    if (!isAdmin) return;
    try {
      await admin.updateLotSize(lotEdit.symbol, parseInt(lotEdit.lotSize, 10));
      loadData();
      alert('Lot size updated');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update lot');
    }
  };

  const viewStudent = async (studentId) => {
    setLoadingDetails(true);
    try {
      const { data } = await admin.getStudent(studentId);
      setSelectedStudent(studentId);
      setStudentDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleResetWallet = async (student) => {
    const batch = batches.find(b => b.id === student.batch_id);
    const amount = batch ? parseFloat(batch.start_balance) : 1000000;
    if (!confirm(`Reset wallet to ₹${amount.toLocaleString()}?`)) return;
    try {
      await admin.resetWallet(student.id, amount);
      loadData();
      if (selectedStudent === student.id) viewStudent(student.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignBatch = async (studentId, batchId) => {
    try {
      await admin.assignBatch(studentId, batchId || null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBanStudent = async (userId) => {
    if (!confirm('Ban this student? They will not be able to login.')) return;
    try {
      await api.post(`/admin/ban/${userId}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivateStudent = async (userId) => {
    try {
      await api.post(`/admin/activate/${userId}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = async (batchId = null, userId = null) => {
    try {
      const params = {};
      if (userId) params.userId = userId;
      if (batchId) params.batchId = batchId;
      await admin.exportTrades(params);
    } catch (err) {
      console.error(err);
      alert('Failed to export trades');
    }
  };

  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) return;
    setCreatingBatch(true);
    try {
      await admin.createBatch({ name: newBatchName.trim() });
      setNewBatchName('');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingBatch(false);
    }
  };

  if (!authReady || !isStaffRole(user?.role) || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {user?.role === 'trainer' ? 'Trainer Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-gray-500">
            {user?.role === 'trainer'
              ? 'Manage students in your batches'
              : 'Monitor and manage all registered students'}
          </p>
          <p className="text-xs text-indigo-600 mt-1 font-medium">Web-only admin console (not available in the mobile app)</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-groww-primary text-white rounded-lg hover:bg-groww-primary-dark"
        >
          Refresh Data
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          <p className="font-semibold">Could not load some admin data</p>
          <p className="mt-1">{loadError}</p>
          <p className="mt-2 text-red-700">
            If student count is 0, run <code className="bg-red-100 px-1 rounded">node scripts/create-test-users.js</code> in the backend folder, then refresh.
          </p>
        </div>
      )}

      {students.length === 0 && !loadError && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          No students in the database yet. Create demo users with{' '}
          <code className="bg-blue-100 px-1 rounded">node scripts/create-test-users.js</code> or register new accounts.
        </div>
      )}

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-800">{analytics.totalUsers}</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 font-medium mb-1">Active Trades (Today)</p>
            <p className="text-2xl font-bold text-gray-800">{analytics.activeTrades}</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Vol (₹)</p>
            <p className="text-2xl font-bold text-green-600">{analytics.totalVolume.toLocaleString()}</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 font-medium mb-1">Rejections Today</p>
            <p className="text-2xl font-bold text-red-600">{analytics.rejections}</p>
         </div>
      </div>

      {analytics.pendingOrders != null && (
        <p className="text-sm text-gray-500">Pending orders: <span className="font-semibold">{analytics.pendingOrders}</span></p>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button className={`pb-3 font-medium ${adminTab === 'students' ? 'text-groww-primary border-b-2 border-groww-primary' : 'text-gray-500'}`} onClick={() => setAdminTab('students')}>Students & Batches</button>
        <button className={`pb-3 font-medium ${adminTab === 'orders' ? 'text-groww-primary border-b-2 border-groww-primary' : 'text-gray-500'}`} onClick={() => setAdminTab('orders')}>Live Order Monitoring</button>
        <button className={`pb-3 font-medium ${adminTab === 'logs' ? 'text-groww-primary border-b-2 border-groww-primary' : 'text-gray-500'}`} onClick={() => setAdminTab('logs')}>Lot Validation Logs</button>
        <button className={`pb-3 font-medium ${adminTab === 'flags' ? 'text-groww-primary border-b-2 border-groww-primary' : 'text-gray-500'}`} onClick={() => setAdminTab('flags')}>Feature Flags</button>
        {isAdmin && (
          <>
            <button className={`pb-3 font-medium ${adminTab === 'lots' ? 'text-groww-primary border-b-2 border-groww-primary' : 'text-gray-500'}`} onClick={() => setAdminTab('lots')}>Lot Master</button>
            <button className={`pb-3 font-medium ${adminTab === 'ops' ? 'text-groww-primary border-b-2 border-groww-primary' : 'text-gray-500'}`} onClick={() => setAdminTab('ops')}>Ops & Revenue</button>
          </>
        )}
      </div>

      {adminTab === 'students' && (
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-groww-primary" />
                <h2 className="text-lg font-semibold text-gray-800">All Students ({students.length})</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Balance</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">P&L</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-groww-primary-light flex items-center justify-center text-groww-primary font-bold text-sm">
                            {student.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{student.email}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-800">
                        ₹{parseFloat(student.balance || 0).toLocaleString()}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        (student.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {student.total_profit >= 0 ? '+' : ''}₹{parseFloat(student.total_profit || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewStudent(student.id)}
                            className="p-2 text-groww-primary hover:bg-groww-primary-light rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetWallet(student)}
                            className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"
                            title="Reset Wallet"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          {student.is_active === false ? (
                            <button
                              onClick={() => handleActivateStudent(student.id)}
                              className="p-2 text-green-500 hover:bg-green-50 rounded-lg text-xs"
                              title="Activate"
                            >
                              On
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBanStudent(student.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                              title="Ban"
                            >
                              Ban
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {students.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No students registered yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Batches</h3>
            <div className="space-y-2 mb-4">
              {batches.map((batch) => (
                <div key={batch.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{batch.name}</p>
                    <p className="text-xs text-gray-500">{batch.student_count || 0} students</p>
                  </div>
                  <span className="text-sm text-gray-600">₹{parseFloat(batch.start_balance).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="New batch name"
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBatch()}
              />
              <button
                onClick={handleCreateBatch}
                disabled={creatingBatch}
                className="px-3 py-2 bg-groww-primary text-white rounded-lg text-sm hover:bg-groww-primary-dark disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <button
              onClick={() => handleExportCSV()}
              className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
            >
              Export All Trades (CSV)
            </button>
            {batches.map(batch => (
              <button
                key={batch.id}
                onClick={() => handleExportCSV(batch.id)}
                className="w-full px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 mt-1"
              >
                Export {batch.name} (CSV)
              </button>
            ))}
          </div>

          {loadingDetails ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-groww-primary" />
            </div>
          ) : studentDetails ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Student Details</h3>
                <button
                  onClick={() => { setSelectedStudent(null); setStudentDetails(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-800">{studentDetails.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-800">{studentDetails.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className="font-medium text-gray-800">₹{parseFloat(studentDetails.user?.balance || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total P&L</p>
                  <p className={`font-medium ${
                    (studentDetails.user?.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {studentDetails.user?.total_profit >= 0 ? '+' : ''}₹{parseFloat(studentDetails.user?.total_profit || 0).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Batch</p>
                  <select
                    value={studentDetails.user?.batch_id || ''}
                    onChange={(e) => handleAssignBatch(selectedStudent, e.target.value || null)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">No batch</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} (₹{parseFloat(b.start_balance).toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Holdings ({studentDetails.holdings?.length || 0})</p>
                  <div className="space-y-2">
                    {(studentDetails.holdings || []).map((h) => (
                      <div key={h.id} className="flex justify-between p-2 bg-gray-50 rounded-lg text-sm">
                        <span className="font-medium">{h.symbol}</span>
                        <span>{h.qty} @ ₹{parseFloat(h.avg_buy_price).toFixed(2)}</span>
                      </div>
                    ))}
                    {(!studentDetails.holdings || studentDetails.holdings.length === 0) && (
                      <p className="text-sm text-gray-400">No holdings</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Recent Orders ({studentDetails.orders?.length || 0})</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(studentDetails.orders || []).slice(0, 5).map((o) => (
                      <div key={o.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm">
                        <span className={o.order_type === 'BUY' ? 'text-green-600' : 'text-red-600'}>
                          {o.order_type}
                        </span>
                        <span className="font-medium">{o.symbol} x{o.qty}</span>
                        <span className="text-gray-500">{o.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-groww-muted">
              <Users className="mb-2 h-10 w-10 text-groww-primary/40" />
              <p>Select a student from the list to view details, holdings, and recent orders.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {adminTab === 'orders' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
           <div className="p-6 border-b border-gray-200">
             <h2 className="text-lg font-semibold text-gray-800">Live Order Monitoring</h2>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Time</th>
                   <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">User</th>
                   <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Symbol</th>
                   <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                   <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Qty</th>
                   <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                 </tr>
               </thead>
               <tbody>
                 {globalOrders.map(o => (
                   <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                     <td className="py-3 px-4 text-sm text-gray-600">{new Date(o.time).toLocaleTimeString()}</td>
                     <td className="py-3 px-4 font-medium text-gray-800">{o.user}</td>
                     <td className="py-3 px-4 font-medium text-gray-800">{o.symbol}</td>
                     <td className={`py-3 px-4 text-right font-bold ${o.type === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>{o.type}</td>
                     <td className="py-3 px-4 text-right font-medium">{o.qty}</td>
                     <td className="py-3 px-4 text-right">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${o.status === 'EXECUTED' ? 'bg-green-100 text-green-700' : o.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                         {o.status}
                       </span>
                       {o.rejectReason && <p className="text-xs text-red-600 mt-1 max-w-[200px] ml-auto">{o.rejectReason}</p>}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {adminTab === 'flags' && featureFlags && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-xl">
          <h2 className="text-lg font-semibold text-gray-800">Platform feature flags</h2>
          {!isAdmin && <p className="text-sm text-amber-700">View only — admin role required to edit.</p>}
          {Object.entries(featureFlags).map(([key, val]) => (
            <label key={key} className="flex items-center justify-between border rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-gray-700">{key}</span>
              <input
                type="checkbox"
                checked={!!val}
                disabled={!isAdmin}
                onChange={(e) => setFeatureFlags({ ...featureFlags, [key]: e.target.checked })}
              />
            </label>
          ))}
          {isAdmin && (
            <button type="button" onClick={saveFeatureFlags} disabled={flagsSaving} className="px-4 py-2 bg-groww-primary text-white rounded-lg font-semibold">
              {flagsSaving ? 'Saving…' : 'Save flags'}
            </button>
          )}
        </div>
      )}

      {adminTab === 'lots' && isAdmin && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Symbol</label>
              <input className="border rounded-lg px-3 py-2" value={lotEdit.symbol} onChange={(e) => setLotEdit({ ...lotEdit, symbol: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Lot size</label>
              <input type="number" className="border rounded-lg px-3 py-2 w-28" value={lotEdit.lotSize} onChange={(e) => setLotEdit({ ...lotEdit, lotSize: e.target.value })} />
            </div>
            <button type="button" onClick={saveLotSize} className="px-4 py-2 bg-groww-primary text-white rounded-lg font-semibold">Update</button>
            <button type="button" onClick={async () => { try { setLoading(true); const r = await admin.syncLotSizes(); alert(r.data.message || `Synced ${r.data.synced} lot sizes`); await loadData(); } catch (e) { alert('Sync failed'); } finally { setLoading(false); } }} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Sync from Exchange
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Symbol</th>
                  <th className="text-right p-3">Lot</th>
                  <th className="text-left p-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {lotMaster.lots?.map((row) => (
                  <tr key={row.symbol} className="border-t">
                    <td className="p-3 font-medium">{row.symbol}</td>
                    <td className="p-3 text-right">{row.lotSize}</td>
                    <td className="p-3 text-gray-500">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
           <div className="p-6 border-b border-gray-200">
             <h2 className="text-lg font-semibold text-gray-800">Lot Validation Tracking & Rejections</h2>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Time</th>
                   <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">User</th>
                   <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Instrument</th>
                   <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Issue / Error</th>
                   <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">System Action</th>
                 </tr>
               </thead>
               <tbody>
                 {validationLogs.map(l => (
                   <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                     <td className="py-3 px-4 text-sm text-gray-600">{new Date(l.time).toLocaleTimeString()}</td>
                     <td className="py-3 px-4 font-medium text-gray-800">{l.user}</td>
                     <td className="py-3 px-4 text-gray-600">{l.symbol}</td>
                     <td className="py-3 px-4 text-gray-800">{l.issue}</td>
                     <td className="py-3 px-4 text-right">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${l.action === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                         {l.action}
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {adminTab === 'ops' && isAdmin && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Revenue (30d)</h2>
            <p className="text-2xl font-bold">₹{Number(revenue?.total || 0).toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-500 mt-2">Subscriptions: ₹{Number(revenue?.subscriptions || 0).toLocaleString('en-IN')} · Premium: ₹{Number(revenue?.premium || 0).toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">Paying users: {revenue?.paying_users || 0}</p>
          </div>
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">User segmentation</h2>
            <ul className="space-y-1 text-sm">
              {segments.map((s) => (
                <li key={s.segment} className="flex justify-between"><span>{s.segment}</span><span className="font-medium">{s.count}</span></li>
              ))}
            </ul>
          </div>
          <div className="bg-white border rounded-xl p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-800 mb-3">A/B tests</h2>
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">{JSON.stringify(abTests, null, 2)}</pre>
          </div>
          <div className="bg-white border rounded-xl p-5 lg:col-span-2 overflow-x-auto">
            <h2 className="font-semibold text-gray-800 mb-3">Support tickets</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">User</th><th>Subject</th><th>Status</th><th>Reply</th></tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="py-2">{t.user_name}</td>
                    <td>{t.subject}</td>
                    <td>{t.status}</td>
                    <td>
                      <input className="border rounded px-2 py-1 text-xs w-40" placeholder="Reply..." value={ticketReply[t.id] || ''} onChange={(e) => setTicketReply((p) => ({ ...p, [t.id]: e.target.value }))} />
                      <button type="button" className="ml-1 text-xs text-groww-primary" onClick={async () => { await admin.replyTicket(t.id, { reply: ticketReply[t.id], status: 'resolved' }); loadData(); }}>Send</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Admin Note</p>
          <p className="text-sm text-amber-700">
            Use the student management panel to monitor trading activity, reset wallet balances,
            and view detailed portfolios. All actions are logged for accountability.
          </p>
        </div>
      </div>
    </div>
  );
}