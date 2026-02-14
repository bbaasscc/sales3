import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  DollarSign, Target, TrendingUp, Shield, Award,
} from "lucide-react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPanel({ token, user, onFilterSalesperson, payPeriod, dateFilter }) {
  const [comparison, setComparison] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (payPeriod && payPeriod !== "all") params.pay_period = payPeriod;
      if (dateFilter && dateFilter !== "all") params.date_filter = dateFilter;
      const [compRes, spRes] = await Promise.all([
        axios.get(`${API}/admin/comparison`, { headers, params }),
        axios.get(`${API}/admin/salespeople`, { headers }),
      ]);
      setComparison(compRes.data.comparison || []);
      setSalespeople(spRes.data.users || []);
    } catch { toast.error("Error loading data"); }
    finally { setLoading(false); }
  }, [token, payPeriod, dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${API}/auth/user/${userId}/role`, { role: newRole }, { headers });
      toast.success("Role updated");
      fetchData();
      setEditingRole(null);
    } catch (err) { toast.error(err.response?.data?.detail || "Error"); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[200px]"><p className="text-gray-400">Loading...</p></div>;

  const sorted = [...comparison].sort((a, b) => b.total_revenue - a.total_revenue);

  const revenueChart = comparison.map(sp => ({
    name: sp.name.split(' ')[0],
    revenue: sp.total_revenue,
    commission: sp.total_commission,
  }));

  const dealsChart = comparison.map(sp => ({
    name: sp.name.split(' ')[0],
    closed: sp.closed_deals,
    pending: sp.total_leads - sp.closed_deals - sp.lost_deals,
    lost: sp.lost_deals,
  }));

  return (
    <div className="space-y-6">
      {/* Top Performer */}
      {sorted[0] && sorted[0].total_revenue > 0 && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Top Performer:</strong> {sorted[0].name} — ${sorted[0].total_revenue.toLocaleString()} revenue, {sorted[0].closing_rate}% closing rate
          </p>
        </div>
      )}

      {/* Comparison Charts */}
      {comparison.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" /> Revenue & Commission
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueChart} barGap={4}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commission" name="Commission" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" /> Leads Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dealsChart} barGap={4}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="closed" name="Closed" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="lost" name="Lost" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Salesperson Ranking */}
      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="text-sm font-bold text-gray-700">Salesperson Ranking</h3>
            <p className="text-[11px] text-gray-400">Click a name to view their full dashboard</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/70">
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2.5 px-3 w-10">#</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2.5 px-3">Salesperson</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2.5 px-3 text-right">Leads</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2.5 px-3 text-right">Closed</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2.5 px-3 text-right">Revenue</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2.5 px-3 text-right">Commission</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2.5 px-3 text-right">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((sp, i) => (
                <TableRow
                  key={sp.user_id}
                  className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  onClick={() => onFilterSalesperson(sp.user_id, sp.name)}
                  data-testid={`sp-row-${i}`}
                >
                  <TableCell className="py-2.5 px-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-gray-300'
                    }`}>{i + 1}</span>
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <p className="text-sm font-semibold text-gray-800">{sp.name}</p>
                    <p className="text-[10px] text-gray-400">{sp.email}</p>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-sm">{sp.total_leads}</TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-sm font-semibold text-green-700">{sp.closed_deals}</TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-sm font-semibold">${sp.total_revenue.toLocaleString()}</TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-sm text-emerald-700">${sp.total_commission.toLocaleString()}</TableCell>
                  <TableCell className="py-2.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sp.closing_rate >= 40 ? 'bg-green-100 text-green-700' :
                      sp.closing_rate >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>{sp.closing_rate}%</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* User Management */}
      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center gap-3">
          <Shield className="w-5 h-5 text-violet-500" />
          <h3 className="text-sm font-bold text-gray-700">User Management</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/70">
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-3">Name</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-3">Email</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-3">Role</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salespeople.map((sp) => (
                <TableRow key={sp.user_id} className="border-b border-gray-50">
                  <TableCell className="py-2 px-3 text-sm font-medium">{sp.name}</TableCell>
                  <TableCell className="py-2 px-3 text-xs text-gray-600">{sp.email}</TableCell>
                  <TableCell className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sp.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                    }`}>{sp.role.toUpperCase()}</span>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {sp.user_id !== user.user_id && (
                      editingRole === sp.user_id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleRoleChange(sp.user_id, sp.role === 'admin' ? 'salesperson' : 'admin')}
                            className="text-[10px] px-2 py-1 bg-violet-600 text-white rounded font-bold hover:bg-violet-700">
                            Make {sp.role === 'admin' ? 'Salesperson' : 'Admin'}
                          </button>
                          <button onClick={() => setEditingRole(null)}
                            className="text-[10px] px-2 py-1 bg-gray-200 text-gray-600 rounded font-bold">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingRole(sp.user_id)}
                          className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded font-bold hover:bg-gray-200">
                          Change Role
                        </button>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
