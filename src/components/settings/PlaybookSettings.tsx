import { useState, useEffect } from 'react';
import { usePlaybooks, SitePlaybook } from '@/hooks/usePlaybooks';
import { PARAMETERS, ParameterKey, getParametersByCategory, ParameterCategory, PARAMETER_ICONS } from '@/types/wastewater';
import { DefaultPlaybook, generateDefaultPlaybooks } from '@/lib/defaultPlaybooks';
import { 
  ChevronDown, 
  ChevronRight, 
  Edit2, 
  RotateCcw, 
  Save, 
  X, 
  Plus, 
  Trash2,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Loader2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EditingPlaybook {
  metricId: ParameterKey;
  condition: 'low' | 'high';
  title: string;
  steps: string[];
  referenceLinks: string[];
  isActive: boolean;
  isCustom: boolean;
}

export function PlaybookSettings() {
  const { playbooks, loading, saving, savePlaybook, deletePlaybook, initializeDefaults, getAllPlaybooks } = usePlaybooks();
  const [expandedCategories, setExpandedCategories] = useState<Set<ParameterCategory>>(
    new Set(['Core', 'Process'])
  );
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [editingPlaybook, setEditingPlaybook] = useState<EditingPlaybook | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ metricId: ParameterKey; condition: 'low' | 'high' } | null>(null);

  const allPlaybooks = getAllPlaybooks();
  const paramsByCategory = getParametersByCategory();
  const categories: ParameterCategory[] = ['Core', 'Process', 'Solids', 'Nutrients', 'Softwater'];

  const toggleCategory = (category: ParameterCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleMetric = (metricId: ParameterKey) => {
    setExpandedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metricId)) {
        next.delete(metricId);
      } else {
        next.add(metricId);
      }
      return next;
    });
  };

  const getPlaybookForMetric = (metricId: ParameterKey, condition: 'low' | 'high') => {
    return allPlaybooks.find(p => p.metricId === metricId && p.condition === condition);
  };

  const isCustomPlaybook = (metricId: ParameterKey, condition: 'low' | 'high') => {
    return playbooks.some(p => p.metricId === metricId && p.condition === condition);
  };

  const openEditDialog = (metricId: ParameterKey, condition: 'low' | 'high') => {
    const playbook = getPlaybookForMetric(metricId, condition);
    if (playbook) {
      setEditingPlaybook({
        metricId,
        condition,
        title: playbook.title,
        steps: [...playbook.steps],
        referenceLinks: [...playbook.referenceLinks],
        isActive: 'isActive' in playbook ? playbook.isActive : true,
        isCustom: isCustomPlaybook(metricId, condition),
      });
    }
  };

  const handleSavePlaybook = async () => {
    if (!editingPlaybook) return;
    
    await savePlaybook({
      metricId: editingPlaybook.metricId,
      condition: editingPlaybook.condition,
      title: editingPlaybook.title,
      steps: editingPlaybook.steps.filter(s => s.trim()),
      referenceLinks: editingPlaybook.referenceLinks.filter(r => r.trim()),
      isActive: editingPlaybook.isActive,
      siteId: '',
    });
    
    setEditingPlaybook(null);
  };

  const handleResetToDefault = async () => {
    if (!editingPlaybook) return;
    
    const defaults = generateDefaultPlaybooks();
    const defaultPlaybook = defaults.find(
      p => p.metricId === editingPlaybook.metricId && p.condition === editingPlaybook.condition
    );
    
    if (defaultPlaybook) {
      setEditingPlaybook({
        ...editingPlaybook,
        title: defaultPlaybook.title,
        steps: [...defaultPlaybook.steps],
        referenceLinks: [...defaultPlaybook.referenceLinks],
      });
    }
  };

  const addStep = () => {
    if (!editingPlaybook) return;
    setEditingPlaybook({
      ...editingPlaybook,
      steps: [...editingPlaybook.steps, ''],
    });
  };

  const updateStep = (index: number, value: string) => {
    if (!editingPlaybook) return;
    const newSteps = [...editingPlaybook.steps];
    newSteps[index] = value;
    setEditingPlaybook({ ...editingPlaybook, steps: newSteps });
  };

  const removeStep = (index: number) => {
    if (!editingPlaybook) return;
    setEditingPlaybook({
      ...editingPlaybook,
      steps: editingPlaybook.steps.filter((_, i) => i !== index),
    });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (!editingPlaybook) return;
    const newSteps = [...editingPlaybook.steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSteps.length) return;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setEditingPlaybook({ ...editingPlaybook, steps: newSteps });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Action Playbooks</h3>
          <p className="text-sm text-muted-foreground">
            Define response procedures for threshold breaches
          </p>
        </div>
        <Button
          onClick={initializeDefaults}
          disabled={saving}
          variant="outline"
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Initialize Defaults
        </Button>
      </div>

      {categories.map(category => {
        const params = paramsByCategory[category];
        if (params.length === 0) return null;
        
        const isExpanded = expandedCategories.has(category);
        
        return (
          <div key={category} className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="font-semibold text-foreground">{category} Parameters</span>
              <ChevronDown className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                isExpanded && "rotate-180"
              )} />
            </button>
            
            {isExpanded && (
              <div className="divide-y divide-border">
                {params.map(param => {
                  const isMetricExpanded = expandedMetrics.has(param.key);
                  const lowPlaybook = getPlaybookForMetric(param.key, 'low');
                  const highPlaybook = getPlaybookForMetric(param.key, 'high');
                  const hasLow = param.watch?.min !== undefined || param.alarm?.min !== undefined;
                  const hasHigh = param.watch?.max !== undefined || param.alarm?.max !== undefined;
                  
                  return (
                    <div key={param.key} className="bg-card">
                      <button
                        onClick={() => toggleMetric(param.key)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{PARAMETER_ICONS[param.key]}</span>
                          <div className="text-left">
                            <span className="font-medium text-foreground">{param.label}</span>
                            <div className="flex gap-2 mt-1">
                              {hasLow && (
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  isCustomPlaybook(param.key, 'low')
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  Low: {lowPlaybook?.steps.length || 0} steps
                                </span>
                              )}
                              {hasHigh && (
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  isCustomPlaybook(param.key, 'high')
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  High: {highPlaybook?.steps.length || 0} steps
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={cn(
                          "w-5 h-5 text-muted-foreground transition-transform",
                          isMetricExpanded && "rotate-90"
                        )} />
                      </button>
                      
                      {isMetricExpanded && (
                        <div className="px-4 pb-4 space-y-4">
                          {hasLow && lowPlaybook && (
                            <PlaybookCard
                              playbook={lowPlaybook}
                              condition="low"
                              isCustom={isCustomPlaybook(param.key, 'low')}
                              onEdit={() => openEditDialog(param.key, 'low')}
                            />
                          )}
                          {hasHigh && highPlaybook && (
                            <PlaybookCard
                              playbook={highPlaybook}
                              condition="high"
                              isCustom={isCustomPlaybook(param.key, 'high')}
                              onEdit={() => openEditDialog(param.key, 'high')}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit Dialog */}
      <Dialog open={!!editingPlaybook} onOpenChange={() => setEditingPlaybook(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Edit Playbook: {editingPlaybook?.title}
            </DialogTitle>
          </DialogHeader>
          
          {editingPlaybook && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={editingPlaybook.title}
                  onChange={(e) => setEditingPlaybook({ ...editingPlaybook, title: e.target.value })}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Action Steps</label>
                  <Button size="sm" variant="outline" onClick={addStep}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Step
                  </Button>
                </div>
                <div className="space-y-2">
                  {editingPlaybook.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0 mt-2">
                        {index + 1}
                      </span>
                      <Textarea
                        value={step}
                        onChange={(e) => updateStep(index, e.target.value)}
                        className="flex-1 min-h-[60px]"
                        placeholder="Describe the action step..."
                      />
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === editingPlaybook.steps.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeStep(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Reference Links (one per line)</label>
                <Textarea
                  value={editingPlaybook.referenceLinks.join('\n')}
                  onChange={(e) => setEditingPlaybook({
                    ...editingPlaybook,
                    referenceLinks: e.target.value.split('\n'),
                  })}
                  className="min-h-[80px]"
                  placeholder="Add reference documents or links..."
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingPlaybook.isActive}
                    onCheckedChange={(checked) => setEditingPlaybook({ ...editingPlaybook, isActive: checked })}
                  />
                  <label className="text-sm">Active</label>
                </div>
                
                <Button variant="outline" onClick={handleResetToDefault} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reset to Default
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlaybook(null)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlaybook} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Playbook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlaybookCard({ 
  playbook, 
  condition, 
  isCustom, 
  onEdit 
}: { 
  playbook: SitePlaybook | DefaultPlaybook;
  condition: 'low' | 'high';
  isCustom: boolean;
  onEdit: () => void;
}) {
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      condition === 'low' 
        ? "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
        : "bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {condition === 'low' ? (
            <ArrowDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <ArrowUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          )}
          <span className="font-medium text-foreground">{playbook.title}</span>
          {isCustom && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Custom</span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
      
      <ol className="space-y-1.5 ml-6">
        {playbook.steps.slice(0, 3).map((step, index) => (
          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-muted text-xs font-medium flex items-center justify-center flex-shrink-0">
              {index + 1}
            </span>
            <span className="line-clamp-1">{step}</span>
          </li>
        ))}
        {playbook.steps.length > 3 && (
          <li className="text-xs text-muted-foreground ml-6">
            +{playbook.steps.length - 3} more steps...
          </li>
        )}
      </ol>
    </div>
  );
}
