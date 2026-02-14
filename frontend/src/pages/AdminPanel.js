import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { TrendingUp, Shield, Award } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RankBadge = ({ rank, total }) => {
  const color = rank === 1 ? 'bg-amber-500 text-white' : rank === 2 ? 'bg-gray-300 text-gray-700' : rank <= total ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-300';
  return <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold ${color}`}>{rank}</span>;
};

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

  const totalSp = comparison.length;

  return (
    <div className="space-y-6">
      {/* Top Performer */}
      {comparison[0] && comparison[0].total_revenue > 0 && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3" data-testid="top-performer">
          <Award className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>#{comparison[0].overall_position} Overall:</strong> {comparison[0].name} &mdash;
            R% {comparison[0].closing_rate}%, ${comparison[0].total_revenue.toLocaleString()} revenue, {comparison[0].closed_deals} sales
          </p>
        </div>
      )}

      {/* Full Ranking Table */}
      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="text-sm font-bold text-gray-700" data-testid="ranking-title">Salesperson Ranking</h3>
            <p className="text-[11px] text-gray-400">Click a name to view their dashboard. PM = Under Price Book (5% comm)</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/70">
                <TableHead className="text-[9px] font-bold uppercase text-gray-500 py-2 px-2 text-center whitespace-nowrap sticky left-0 bg-gray-50/70 z-10">Overall</TableHead>
                <TableHead className="text-[9px] font-bold uppercase text-gray-500 py-2 px-2 whitespace-nowrap sticky left-[52px] bg-gray-50/70 z-10">Salesperson</TableHead>
                <TableHead className="text-[9px] font-bold uppercase text-gray-500 py-2 px-2 text-center whitespace-nowrap">
                  <div>R%</div><div className="text-[8px] text-gray-400 font-normal">Close Rate</div>
                </TableHead>
                <TableHead className="text-[9px] font-bold uppercase text-gray-500 py-2 px-2 text-center whitespace-nowrap">Sales</TableHead>
                <TableHead className="text-[9px] font-bold uppercase text-gray-500 py-2 px-2 text-center whitespace-nowrap">
                  <div>Avg Ticket</div>
                </TableHead>
                <TableHead className="text-[9px] font-bold uppercase text-gray-500 py-2 px-2 text-center whitespace-nowrap">
                  <div>Net Value</div><div className="text-[8px] text-gray-400 font-normal">Revenue</div>
                </TableHead>
                <TableHead className="text-[9px] font-bold uppercase text-gray-500 py-2 px-2 text-center whitespace-nowrap">
                  <div>Total Jobs</div>
                </TableHead>
                <TableHead className="text-[9px] font-bold uppercase text-gray-500 py-2 px-2 text-center whitespace-nowrap">
                  <div>PM Jobs</div><div className="text-[8px] text-gray-400 font-normal">5% comm</div>
                </TableHead>
                <TableHead className="text-[9px] font-bold uppercase text-gray-500 py-2 px-2 text-center whitespace-nowrap">
                  <div>GP %</div><div className="text-[8px] text-gray-400 font-normal">Avg Comm</div>
                </TableHead>
                <TableHead className="text-[9px] font-bold uppercase text-gray-500 py-2 px-2 text-center whitespace-nowrap">
                  <div>PM %</div><div className="text-[8px] text-gray-400 font-normal">Under book</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((sp, i) => (
                <TableRow
                  key={sp.user_id}
                  className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  onClick={() => onFilterSalesperson(sp.user_id, sp.name)}
                  data-testid={`sp-row-${i}`}
                >
                  {/* Overall Rank */}
                  <TableCell className="py-2.5 px-2 text-center sticky left-0 bg-white z-10">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${
                      sp.overall_position === 1 ? 'bg-amber-500' : sp.overall_position === 2 ? 'bg-gray-400' : 'bg-gray-300'
                    }`}>{sp.overall_position}</span>
                  </TableCell>
                  {/* Name */}
                  <TableCell className="py-2.5 px-2 sticky left-[52px] bg-white z-10">
                    <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{sp.name}</p>
                  </TableCell>
                  {/* R% + Rank */}
                  <TableCell className="py-2.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        sp.closing_rate >= 40 ? 'bg-green-100 text-green-700' : sp.closing_rate >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-600'
                      }`}>{sp.closing_rate}%</span>
                      <RankBadge rank={sp.closing_rate_rank} total={totalSp} />
                    </div>
                  </TableCell>
                  {/* Sales + Rank */}
                  <TableCell className="py-2.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] font-mono font-bold text-green-700">{sp.closed_deals}</span>
                      <RankBadge rank={sp.closed_deals_rank} total={totalSp} />
                    </div>
                  </TableCell>
                  {/* Avg Ticket + Rank */}
                  <TableCell className="py-2.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] font-mono font-semibold text-gray-800">${sp.avg_ticket > 0 ? Math.round(sp.avg_ticket).toLocaleString() : '0'}</span>
                      <RankBadge rank={sp.avg_ticket_rank} total={totalSp} />
                    </div>
                  </TableCell>
                  {/* Net Value + Rank */}
                  <TableCell className="py-2.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] font-mono font-bold text-gray-900">${sp.total_revenue > 0 ? Math.round(sp.total_revenue).toLocaleString() : '0'}</span>
                      <RankBadge rank={sp.total_revenue_rank} total={totalSp} />
                    </div>
                  </TableCell>
                  {/* Total Jobs + Rank */}
                  <TableCell className="py-2.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] font-mono font-semibold text-gray-700">{sp.total_leads}</span>
                      <RankBadge rank={sp.total_leads_rank} total={totalSp} />
                    </div>
                  </TableCell>
                  {/* PM Jobs */}
                  <TableCell className="py-2.5 px-2 text-center">
                    <span className={`text-[11px] font-mono font-semibold ${sp.pm_jobs > 0 ? 'text-red-600' : 'text-gray-400'}`}>{sp.pm_jobs}</span>
                  </TableCell>
                  {/* GP % + Rank */}
                  <TableCell className="py-2.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] font-mono font-semibold text-gray-700">{sp.gp_pct}%</span>
                      <RankBadge rank={sp.gp_pct_rank} total={totalSp} />
                    </div>
                  </TableCell>
                  {/* PM % + Rank */}
                  <TableCell className="py-2.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[11px] font-mono font-semibold ${sp.pm_pct > 10 ? 'text-red-600' : sp.pm_pct > 0 ? 'text-amber-600' : 'text-green-600'}`}>{sp.pm_pct}%</span>
                      <RankBadge rank={sp.pm_pct_rank} total={totalSp} />
                    </div>
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
