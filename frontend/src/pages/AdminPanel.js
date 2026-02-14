import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, DollarSign, Target, Percent, TrendingUp, Shield, Upload, BarChart3,
} from "lucide-react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CHART_COLORS = ["#C62828", "#1E3A5F", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4", "#E91E63", "#009688"];

export default function AdminPanel({ token, user, onFilterSalesperson }) {
  const [comparison, setComparison] = useState([]);
  const [totals, setTotals] = useState({});
  const [salespeople, setSalespeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, spRes] = await Promise.all([
        axios.get(`${API}/admin/comparison`, { headers }),
        axios.get(`${API}/admin/salespeople`, { headers }),
      ]);
      setComparison(compRes.data.comparison || []);
      setTotals(compRes.data.totals || {});
      setSalespeople(spRes.data.users || []);
    } catch (err) {
      toast.error("Error loading admin data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${API}/auth/user/${userId}/role`, { role: newRole }, { headers });
      toast.success("Role updated");
      fetchData();
      setEditingRole(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error updating role");
    }
  };

  // Chart data
  const revenueChartData = comparison.map(sp => ({
    name: sp.name.split(' ')[0],
    revenue: sp.total_revenue,
    commission: sp.total_commission,
  }));

  const dealsChartData = comparison.map(sp => ({
    name: sp.name.split(' ')[0],
    leads: sp.total_leads,
    closed: sp.closed_deals,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-400 text-sm">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Totals */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: '#EFF6FF', borderLeftColor: '#3B82F6' }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500 shadow-sm">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-blue-900" data-testid="admin-global-title">Global Overview</h2>
              <p className="text-xs text-blue-600/70">All salespeople combined</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total Leads", value: totals.total_leads || 0, icon: Users },
              { label: "Closed Deals", value: totals.closed_deals || 0, icon: Target },
              { label: "Revenue", value: `$${(totals.total_revenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`, icon: DollarSign },
              { label: "Commission", value: `$${(totals.total_commission || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`, icon: DollarSign },
              { label: "Closing Rate", value: `${totals.closing_rate || 0}%`, icon: Percent },
            ].map((item, i) => (
              <Card key={i} className="bg-white/80 border border-blue-100 shadow-sm">
                <CardContent className="p-3 sm:p-4 text-center">
                  <item.icon className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{item.label}</p>
                  <p className="text-lg sm:text-xl font-mono font-bold text-gray-900">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Charts */}
      {comparison.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" /> Revenue & Commission
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commission" name="Commission" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" /> Leads & Closed Deals
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dealsChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="leads" name="Total Leads" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="closed" name="Closed Deals" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Salesperson Comparison Table */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: '#ECFDF5', borderLeftColor: '#10B981' }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500 shadow-sm">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-emerald-900" data-testid="admin-comparison-title">Salesperson Comparison</h2>
              <p className="text-xs text-emerald-600/70">Click a name to filter the dashboard</p>
            </div>
          </div>
          <Card className="bg-white border border-emerald-100 shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-50/50">
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3">Name</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3">Leads</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3">Closed</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3">Revenue</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3">Commission</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3">Rate</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3 hidden sm:table-cell">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.map((sp, i) => (
                    <TableRow key={sp.user_id} className="border-b border-gray-100 hover:bg-emerald-50/50 transition-colors">
                      <TableCell className="py-2 px-3">
                        <button
                          onClick={() => onFilterSalesperson(sp.user_id, sp.name)}
                          className="text-sm font-medium text-blue-700 underline decoration-dotted hover:text-blue-900"
                          data-testid={`filter-sp-${i}`}
                        >
                          {sp.name}
                        </button>
                        <p className="text-[10px] text-gray-400">{sp.email}</p>
                      </TableCell>
                      <TableCell className="py-2 px-3 font-mono text-sm font-semibold">{sp.total_leads}</TableCell>
                      <TableCell className="py-2 px-3 font-mono text-sm font-semibold text-green-700">{sp.closed_deals}</TableCell>
                      <TableCell className="py-2 px-3 font-mono text-sm font-semibold">${sp.total_revenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className="py-2 px-3 font-mono text-sm font-semibold text-emerald-700">${sp.total_commission.toLocaleString('en-US', {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className="py-2 px-3 font-mono text-sm font-semibold">{sp.closing_rate}%</TableCell>
                      <TableCell className="py-2 px-3 hidden sm:table-cell">
                        <button
                          onClick={() => onFilterSalesperson(sp.user_id, sp.name)}
                          className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-bold hover:bg-blue-200"
                        >
                          View Dashboard
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      {/* User Management */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: '#F5F3FF', borderLeftColor: '#8B5CF6' }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500 shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-violet-900" data-testid="admin-users-title">User Management</h2>
              <p className="text-xs text-violet-600/70">Manage roles and permissions</p>
            </div>
          </div>
          <Card className="bg-white border border-violet-100 shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-violet-50/50">
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3">Name</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3">Email</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3 hidden sm:table-cell">Customer #</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3">Role</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salespeople.map((sp) => (
                    <TableRow key={sp.user_id} className="border-b border-gray-100 hover:bg-violet-50/30">
                      <TableCell className="py-2 px-3 text-sm font-medium text-gray-800">{sp.name}</TableCell>
                      <TableCell className="py-2 px-3 text-xs text-gray-600">{sp.email}</TableCell>
                      <TableCell className="py-2 px-3 font-mono text-xs text-gray-500 hidden sm:table-cell">{sp.customer_number}</TableCell>
                      <TableCell className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sp.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {sp.role === 'admin' ? 'ADMIN' : 'SALESPERSON'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        {sp.user_id !== user.user_id && (
                          editingRole === sp.user_id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleRoleChange(sp.user_id, sp.role === 'admin' ? 'salesperson' : 'admin')}
                                className="text-[10px] px-2 py-1 bg-violet-600 text-white rounded font-bold hover:bg-violet-700"
                              >
                                Make {sp.role === 'admin' ? 'Salesperson' : 'Admin'}
                              </button>
                              <button
                                onClick={() => setEditingRole(null)}
                                className="text-[10px] px-2 py-1 bg-gray-200 text-gray-600 rounded font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingRole(sp.user_id)}
                              className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded font-bold hover:bg-gray-200"
                              data-testid={`edit-role-${sp.user_id}`}
                            >
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
      </div>
    </div>
  );
}
