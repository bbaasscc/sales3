import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Phone, AlertTriangle, Mail, MessageSquare, Check } from "lucide-react";
import { ALL_PIPELINE_ACTIONS, PIPELINE_STEPS } from "@/lib/constants";

export default function FollowupsTab({
  kpiData, allClientNotes, followUpActions, openClientModal, openPipelineMenu,
}) {
  const isStepDone = (clientName, stepId) => {
    return followUpActions.some(a => a.client_name === clientName && a.step_id === stepId);
  };

  const getPipelineProgress = (clientName) => {
    const done = ALL_PIPELINE_ACTIONS.filter(a => isStepDone(clientName, a.id)).length;
    return { done, total: ALL_PIPELINE_ACTIONS.length };
  };

  if (!kpiData.follow_ups) return null;

  const activeFollowups = kpiData.follow_ups.filter(f => {
    const p = getPipelineProgress(f.name);
    return p.done < p.total;
  });

  const completedFollowups = kpiData.follow_ups.filter(f => {
    const p = getPipelineProgress(f.name);
    return p.done === p.total;
  });

  return (
    <div>
      {/* ACTION REQUIRED */}
      {activeFollowups.length > 0 && (
        <div 
          className="rounded-2xl border-l-4 overflow-hidden shadow-lg relative" 
          style={{ 
            backgroundColor: '#FEF2F2', borderLeftColor: '#EF4444',
            boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.15), 0 8px 30px rgba(239, 68, 68, 0.12)'
          }}
        >
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400 to-orange-400"></div>
          <div className="p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-red-500 shadow-md">
                <Phone className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-red-700" data-testid="block-5-title">Action Required!</h2>
                <p className="text-xs sm:text-sm text-red-500/80">Follow up with these clients now</p>
              </div>
              <div className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-sm" data-testid="followup-count">
                {activeFollowups.length}
              </div>
            </div>
            
            <Card className="bg-white border-2 border-red-200 shadow-sm rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-red-50/80">
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap">Priority</TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3">Name</TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 hidden md:table-cell">City</TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap hidden sm:table-cell">Since Visit</TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap">Next Step</TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpiData.follow_ups.slice(0, 20).filter(f => {
                      const p = getPipelineProgress(f.name);
                      return p.done < p.total;
                    }).map((followUp, index) => {
                      const progress = getPipelineProgress(followUp.name);
                      const notes = allClientNotes[followUp.name] || {};
                      const priority = notes.priority || 'high';
                      const nextAction = ALL_PIPELINE_ACTIONS.find(a => !isStepDone(followUp.name, a.id));
                      const isOverdue = nextAction && followUp.follow_up_date && new Date(followUp.follow_up_date) < new Date(new Date().toISOString().split('T')[0]);
                      return (
                        <TableRow 
                          key={index} 
                          className={`border-b border-gray-100 transition-colors ${isOverdue ? 'bg-red-50/70 hover:bg-red-100/50' : 'hover:bg-gray-50'}`}
                          data-testid={`followup-row-${index}`}
                        >
                          <TableCell className="py-2 px-1 sm:px-3">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-0.5 px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-red-600 text-white animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /><span className="hidden sm:inline">LATE</span>
                              </span>
                            ) : priority === 'high' ? (
                              <span className="inline-flex items-center gap-0.5 px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-red-100 text-red-700">
                                <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /><span className="hidden sm:inline">HIGH</span>
                              </span>
                            ) : priority === 'medium' ? (
                              <span className="inline-flex items-center px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-700">
                                <span className="hidden sm:inline">MED</span><span className="sm:hidden">M</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-500">
                                <span className="hidden sm:inline">LOW</span><span className="sm:hidden">L</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell 
                            className={`py-2 px-1 sm:px-3 text-xs sm:text-sm font-medium cursor-pointer ${followUp.is_urgent ? 'text-red-700' : 'text-gray-700'}`}
                            onClick={() => openClientModal(followUp)}
                          >
                            <span className="line-clamp-1 underline decoration-dotted">{followUp.name}</span>
                          </TableCell>
                          <TableCell className="py-2 px-1 sm:px-3 text-xs sm:text-sm text-gray-600 hidden md:table-cell">{followUp.city}</TableCell>
                          <TableCell className="py-2 px-1 sm:px-3 hidden sm:table-cell">
                            {(() => {
                              if (!followUp.visit_date) return <span className="text-[10px] text-gray-400">N/A</span>;
                              const visitD = new Date(followUp.visit_date);
                              const today = new Date(new Date().toISOString().split('T')[0]);
                              const daysSince = Math.floor((today - visitD) / 86400000);
                              return (
                                <span className={`font-mono text-[10px] sm:text-xs font-bold ${daysSince > 8 ? 'text-red-600' : daysSince > 4 ? 'text-amber-600' : 'text-gray-600'}`}>
                                  {daysSince}d {daysSince > 8 && <span className="text-[9px] font-normal bg-red-100 text-red-700 px-1 py-0.5 rounded ml-0.5">LATE</span>}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="py-2 px-1 sm:px-3 text-[10px] sm:text-xs">
                            {(() => {
                              const nextAct = ALL_PIPELINE_ACTIONS.find(a => !isStepDone(followUp.name, a.id));
                              if (!nextAct) return <span className="text-green-600 font-bold">Done</span>;
                              const step = PIPELINE_STEPS.find(s => s.actions.some(a => a.id === nextAct.id));
                              const visitD = followUp.visit_date ? new Date(followUp.visit_date) : null;
                              const today = new Date(new Date().toISOString().split('T')[0]);
                              const dueDate = visitD ? new Date(visitD.getTime() + (step?.day || 0) * 86400000) : null;
                              const isLate = dueDate && dueDate < today;
                              return (
                                <span className={`flex items-center gap-1 ${isLate ? 'text-red-600 font-bold' : ''}`}>
                                  {nextAct.type === 'email' ? <Mail className="w-3 h-3 text-blue-500" /> : <MessageSquare className="w-3 h-3 text-green-500" />}
                                  <span className="truncate">D{step?.day}</span>
                                  {isLate && <span className="text-[8px] bg-red-600 text-white px-1 rounded">!</span>}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="py-2 px-1 sm:px-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); openPipelineMenu(followUp); }}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                              data-testid={`pipeline-btn-${index}`}
                            >
                              <div className="flex gap-0.5">
                                {ALL_PIPELINE_ACTIONS.map(a => (
                                  <div key={a.id} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isStepDone(followUp.name, a.id) ? 'bg-green-500' : 'bg-gray-300'}`} />
                                ))}
                              </div>
                              <span className="text-[10px] sm:text-xs font-mono font-bold text-gray-500">{progress.done}/{progress.total}</span>
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* PIPELINE COMPLETE */}
      {completedFollowups.length > 0 && (
        <div className="mt-6 rounded-2xl border-l-4 overflow-hidden p-4 sm:p-6" style={{ backgroundColor: '#F0FDF4', borderLeftColor: '#22C55E' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-500 shadow-sm">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-green-800">Pipeline Complete</h2>
              <p className="text-xs text-green-600">{completedFollowups.length} lead{completedFollowups.length > 1 ? 's' : ''} finished all steps — waiting for decision</p>
            </div>
          </div>
          <Card className="bg-white border border-green-200 shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-50/80">
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-green-600 py-2 px-2 sm:px-3">Name</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-green-600 py-2 px-2 sm:px-3 hidden sm:table-cell">City</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-green-600 py-2 px-2 sm:px-3">Since Visit</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-green-600 py-2 px-2 sm:px-3">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedFollowups.map((f, i) => {
                    const visitD = f.visit_date ? new Date(f.visit_date) : null;
                    const daysSince = visitD ? Math.floor((new Date(new Date().toISOString().split('T')[0]) - visitD) / 86400000) : 0;
                    return (
                      <TableRow key={i} className="border-b border-gray-100 hover:bg-green-50 cursor-pointer" onClick={() => openClientModal(f)}>
                        <TableCell className="py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium text-gray-800 underline decoration-dotted">{f.name}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 text-xs text-gray-600 hidden sm:table-cell">{f.city}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3 font-mono text-xs font-bold text-gray-600">{daysSince}d</TableCell>
                        <TableCell className="py-2 px-2 sm:px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                            <Check className="w-3 h-3" /> 7/7
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
