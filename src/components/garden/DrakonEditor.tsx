// src/components/garden/DrakonEditor.tsx

import { useRef, useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/components/theme-provider';
import { 
  Loader2, AlertCircle, Save, Undo, Redo, Download, Home, Plus,
  ZoomIn, ZoomOut, Copy, Scissors, Trash2, ClipboardPaste, MousePointer, Hand, FileText
} from 'lucide-react';

// Standard DRAKON icon images
import iconAction from '@/assets/drakon/action.png';
import iconQuestion from '@/assets/drakon/question.png';
import iconSelect from '@/assets/drakon/select.png';
import iconCase from '@/assets/drakon/case.png';
import iconForeach from '@/assets/drakon/foreach.png';
import iconBranch from '@/assets/drakon/branch.png';
import iconInsertion from '@/assets/drakon/insertion.png';
import iconComment from '@/assets/drakon/comment.png';
import iconSinput from '@/assets/drakon/sinput.png';
import iconSoutput from '@/assets/drakon/soutput.png';
import iconTimer from '@/assets/drakon/timer.png';
import iconPause from '@/assets/drakon/pause.png';
import iconDuration from '@/assets/drakon/duration.png';
import iconProcess from '@/assets/drakon/process.png';
import iconInput from '@/assets/drakon/input.png';
import iconOutput from '@/assets/drakon/output.png';
import iconSilhouette from '@/assets/drakon/silhouette.png';
import iconShelf from '@/assets/drakon/shelf.png';
import iconEnd from '@/assets/drakon/end.png';
import iconCtrlStart from '@/assets/drakon/ctrl-start.png';
import iconCtrlEnd from '@/assets/drakon/ctrl-end.png';
import iconPar from '@/assets/drakon/par.png';
import iconParblock from '@/assets/drakon/parblock.png';
import iconGroupDuration from '@/assets/drakon/group-duration.png';
import iconGroupDurationR from '@/assets/drakon/group-duration-r.png';
import iconLink from '@/assets/drakon/link.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { loadDrakonWidget, createWidget } from '@/lib/drakon/adapter';
import { getGardenDrakonTheme } from '@/lib/drakon/themeAdapter';
import { useSaveDrakonDiagram } from '@/hooks/useDrakonDiagram';
import { useLocale } from '@/hooks/useLocale';
import { diagramToPseudocode, pseudocodeToMarkdown } from '@/lib/drakon/pseudocode';
import { createDrakonTranslate, getDrakonLabels } from '@/lib/drakon/i18n';
import type { DrakonDiagram, DrakonWidget as DrakonWidgetType, DrakonEditSender, DrakonConfig } from '@/types/drakonwidget';

interface DrakonEditorProps {
  diagram?: DrakonDiagram;
  diagramId: string;
  folderSlug?: string;
  height?: number;
  isNew?: boolean;
  onSaved?: (diagramId: string) => void;
  className?: string;
}

// Empty diagram template for new diagrams
function createEmptyDiagram(t: ReturnType<typeof useLocale>['t']): DrakonDiagram {
  return {
    name: t.drakonEditor.newDiagram,
    access: 'write',
    items: {
      '1': { type: 'end' },
      '2': { type: 'branch', branchId: 0, one: '3' },
      '3': { type: 'action', content: t.drakonEditor.startHere, one: '1' },
    },
  };
}

export function DrakonEditor({
  diagram,
  diagramId,
  folderSlug,
  height = 500,
  isNew = false,
  onSaved,
  className,
}: DrakonEditorProps) {
  const { theme } = useTheme();
  const { t, locale } = useLocale();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<DrakonWidgetType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [diagramName, setDiagramName] = useState(diagram?.name || t.drakonEditor.newDiagram);
  const [zoomLevel, setZoomLevel] = useState(5000);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: Array<{ text: string; action?: () => void; type?: string }> } | null>(null);
  const [panMode, setPanMode] = useState(false);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    title: string;
    value: string;
    onConfirm: (value: string) => void;
  }>({ open: false, title: '', value: '', onConfirm: () => {} });

  const saveMutation = useSaveDrakonDiagram(folderSlug);

  const editSender: DrakonEditSender = {
    pushEdit: (edit) => {
      setHasChanges(true);
      console.log('[DrakonEditor] Edit:', edit);
    },
    stop: () => {},
  };

  const drakonLabels = getDrakonLabels(t.drakon);
  const drakonTranslate = createDrakonTranslate(t.drakon);

  const buildConfig = useCallback((): DrakonConfig => ({
    startEditContent: (item, isReadonly) => {
      if (isReadonly) return;
      setEditDialog({
        open: true,
        title: t.drakon.editContent,
        value: item.content || '',
        onConfirm: (newContent) => {
          if (widgetRef.current) {
            widgetRef.current.setContent(item.id, newContent);
            setHasChanges(true);
          }
        },
      });
    },
    showContextMenu: (left, top, items) => {
      // Convert page coordinates to container-relative coordinates
      const containerEl = containerRef.current;
      if (containerEl) {
        const rect = containerEl.getBoundingClientRect();
        setContextMenu({ x: left - rect.left, y: top - rect.top, items });
      } else {
        setContextMenu({ x: left, y: top, items });
      }
    },
    startEditSecondary: (item, isReadonly) => {
      if (isReadonly) return;
      setEditDialog({
        open: true,
        title: t.drakon.editSecondaryText,
        value: item.secondary || '',
        onConfirm: (newSecondary) => {
          if (widgetRef.current) {
            widgetRef.current.setSecondary(item.id, newSecondary);
            setHasChanges(true);
          }
        },
      });
    },
    startEditLink: (item, isReadonly) => {
      if (isReadonly) return;
      setEditDialog({
        open: true,
        title: t.drakon.editLink || 'Edit Link',
        value: item.link || '',
        onConfirm: (newLink) => {
          if (widgetRef.current) {
            widgetRef.current.setLink(item.id, newLink);
            setHasChanges(true);
          }
        },
      });
    },
    startEditStyle: (ids, oldStyle, x, y, accepted) => {
      // For now, provide a simple JSON-based style editor
      const styleStr = JSON.stringify(oldStyle || {}, null, 2);
      setEditDialog({
        open: true,
        title: t.drakon.format || 'Format',
        value: styleStr,
        onConfirm: (newStyleStr) => {
          try {
            const newStyle = JSON.parse(newStyleStr);
            if (widgetRef.current) {
              widgetRef.current.setStyle(ids, newStyle);
              setHasChanges(true);
            }
          } catch { /* ignore invalid JSON */ }
        },
      });
    },
    startEditDiagramStyle: (oldStyle, x, y) => {
      const styleStr = JSON.stringify(oldStyle || {}, null, 2);
      setEditDialog({
        open: true,
        title: t.drakon.format || 'Format Diagram',
        value: styleStr,
        onConfirm: (newStyleStr) => {
          try {
            const newStyle = JSON.parse(newStyleStr);
            if (widgetRef.current) {
              widgetRef.current.setDiagramStyle(newStyle);
              setHasChanges(true);
            }
          } catch { /* ignore invalid JSON */ }
        },
      });
    },
    canSelect: !panMode,
    canvasIcons: true,
    textFormat: 'plain',
    font: '14px system-ui, -apple-system, sans-serif',
    headerFont: 'bold 16px system-ui, -apple-system, sans-serif',
    theme: getGardenDrakonTheme(isDark),
    translate: drakonTranslate,
    ...drakonLabels,
    onSelectionChanged: () => {},
    onZoomChanged: (newZoom) => {
      setZoomLevel(newZoom);
    },
  }), [isDark, panMode, drakonLabels, drakonTranslate, t.drakon]);

  // Initialize widget
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!containerRef.current) return;
      try {
        await loadDrakonWidget();
        if (!mounted) return;

        const widget = createWidget();
        widgetRef.current = widget;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        container.innerHTML = '';

        const config = buildConfig();
        const element = widget.render(rect.width, rect.height, config);
        container.appendChild(element);

        // Use provided diagram or empty template for new
        const diagramToLoad = diagram || createEmptyDiagram(t);
        await widget.setDiagram(diagramId, diagramToLoad, editSender);
        widget.setZoom(5000); // 50% zoom for editor
        
        setIsLoading(false);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load editor');
        setIsLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      editSender.stop();
      widgetRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [diagramId]);

  // Handle theme/panMode changes — re-render and re-set diagram to restart mouse behavior
  useEffect(() => {
    if (!widgetRef.current || !containerRef.current || isLoading) return;

    const widget = widgetRef.current;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Save current diagram state before re-render
    let currentDiagramJson: string | null = null;
    try {
      currentDiagramJson = widget.exportJson();
    } catch { /* ignore if no diagram loaded yet */ }

    const currentZoom = widget.getZoom();

    container.innerHTML = '';
    const config = buildConfig();
    const element = widget.render(rect.width, rect.height, config);
    container.appendChild(element);

    // Re-set diagram to restart mouse behavior state machine
    if (currentDiagramJson) {
      const diagramData = JSON.parse(currentDiagramJson);
      widget.setDiagram(diagramId, diagramData, editSender).then(() => {
        widget.setZoom(currentZoom);
      });
    } else {
      widget.redraw();
    }
  }, [isDark, buildConfig, isLoading]);

  const handleSave = useCallback(async () => {
    if (!widgetRef.current) return;
    
    const jsonString = widgetRef.current.exportJson();
    const diagramData = JSON.parse(jsonString);
    
    // Wrap in StoredDrakonDiagram format
    const storedDiagram = {
      version: '1.0' as const,
      id: diagramId,
      name: diagramName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      diagram: diagramData,
    };

    saveMutation.mutate(
      {
        diagramId,
        diagram: storedDiagram,
        name: diagramName,
        isNew,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            setHasChanges(false);
            onSaved?.(diagramId);
          }
        },
      }
    );
  }, [diagramId, diagramName, isNew, onSaved, saveMutation]);

  const handleUndo = useCallback(() => {
    widgetRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    widgetRef.current?.redo();
  }, []);

  const handleHome = useCallback(() => {
    widgetRef.current?.goHome();
  }, []);

  const handleInsertIcon = useCallback((type: string) => {
    widgetRef.current?.showInsertionSockets(type);
  }, []);

  const handleToggleSilhouette = useCallback(() => {
    widgetRef.current?.toggleSilhouette();
    setHasChanges(true);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!widgetRef.current) return;
    const current = widgetRef.current.getZoom();
    widgetRef.current.setZoom(Math.min(current + 2000, 20000));
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!widgetRef.current) return;
    const current = widgetRef.current.getZoom();
    widgetRef.current.setZoom(Math.max(current - 2000, 1000));
  }, []);

  const handleCopy = useCallback(() => {
    widgetRef.current?.copySelection();
  }, []);

  const handleCut = useCallback(() => {
    widgetRef.current?.cutSelection();
    setHasChanges(true);
  }, []);

  const handleDelete = useCallback(() => {
    widgetRef.current?.deleteSelection();
    setHasChanges(true);
  }, []);

  const handlePaste = useCallback(() => {
    widgetRef.current?.showPaste();
    setHasChanges(true);
  }, []);

  const handleExportJson = useCallback(() => {
    if (!widgetRef.current) return;
    const json = widgetRef.current.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${diagramId}.drakon.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [diagramId]);

  const handleExportPng = useCallback(() => {
    if (!widgetRef.current) return;
    try {
      const canvas = widgetRef.current.exportCanvas(10000);
      const link = document.createElement('a');
      link.download = `${diagramId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      console.error('Export PNG failed - may require canvasIcons mode');
    }
  }, [diagramId]);

  const handleExportPseudocode = useCallback(async () => {
    if (!widgetRef.current) return;
    try {
      const jsonString = widgetRef.current.exportJson();
      const diagramData = JSON.parse(jsonString);
      const pseudocode = await diagramToPseudocode(diagramData, diagramName, locale);
      const markdown = pseudocodeToMarkdown(pseudocode, diagramName);
      
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const link = document.createElement('a');
      link.download = `${diagramId}.md`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Export pseudocode failed:', err);
    }
  }, [diagramId, diagramName]);

  // DRAKON icon types for the toolbar — standard DRAKON notation icons
  const iconButtons = [
    { type: 'action', img: iconAction, label: t.drakonEditor.action },
    { type: 'question', img: iconQuestion, label: t.drakonEditor.question },
    { type: 'select', img: iconSelect, label: t.drakonEditor.choice },
    { type: 'case', img: iconCase, label: t.drakonEditor.caseName },
    { type: 'foreach', img: iconForeach, label: t.drakonEditor.forLoop },
    { type: 'branch', img: iconBranch, label: t.drakonEditor.branchName },
    { type: 'insertion', img: iconInsertion, label: t.drakonEditor.insertion },
    { type: 'comment', img: iconComment, label: t.drakonEditor.comment },
    { type: 'shelf', img: iconShelf, label: t.drakonEditor.shelf },
    { type: 'simpleinput', img: iconSinput, label: t.drakonEditor.simpleInput },
    { type: 'simpleoutput', img: iconSoutput, label: t.drakonEditor.simpleOutput },
    { type: 'input', img: iconInput, label: t.drakonEditor.input },
    { type: 'output', img: iconOutput, label: t.drakonEditor.output },
    { type: 'process', img: iconProcess, label: t.drakonEditor.process },
    { type: 'timer', img: iconTimer, label: t.drakonEditor.timer },
    { type: 'pause', img: iconPause, label: t.drakonEditor.pause },
    { type: 'duration', img: iconDuration, label: t.drakonEditor.duration },
    { type: 'group-duration', img: iconGroupDuration, label: t.drakonEditor.groupDuration },
    { type: 'group-duration-r', img: iconGroupDurationR, label: t.drakonEditor.groupDurationRight },
    { type: 'par', img: iconPar, label: t.drakonEditor.parallel },
    { type: 'parblock', img: iconParblock, label: t.drakonEditor.parallelBlock },
    { type: 'ctrl-start', img: iconCtrlStart, label: t.drakonEditor.controlStart },
    { type: 'ctrl-end', img: iconCtrlEnd, label: t.drakonEditor.controlEnd },
    { type: 'end', img: iconEnd, label: t.drakonEditor.endIcon },
    { type: 'link', img: iconLink, label: t.drakonEditor.link },
  ];

  if (error) {
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4',
        className
      )} style={{ height }}>
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="text-sm text-destructive">{error}</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="diagram-name" className="sr-only">{t.drakonEditor.diagramName}</Label>
          <Input
            id="diagram-name"
            value={diagramName}
            onChange={(e) => {
              setDiagramName(e.target.value);
              setHasChanges(true);
            }}
            className="w-48 h-8 text-sm"
            placeholder={t.drakonEditor.diagramName}
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isLoading || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {t.editor?.save || 'Save'}
          </Button>
          
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={isLoading}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} disabled={isLoading}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleHome} disabled={isLoading}>
            <Home className="h-4 w-4" />
          </Button>
        </div>

        {/* Pan/Select mode toggle */}
        <div className="flex items-center gap-0.5 border rounded-md p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={!panMode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPanMode(false)}
                disabled={isLoading}
              >
                <MousePointer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.drakonEditor.select}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={panMode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPanMode(true)}
                disabled={isLoading}
              >
                <Hand className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.drakonEditor.pan}</TooltipContent>
          </Tooltip>
        </div>

        {/* Zoom & selection controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={isLoading}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.drakonEditor.zoomOut}</TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoomLevel / 100)}%</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={isLoading}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.drakonEditor.zoomIn}</TooltipContent>
          </Tooltip>

          <div className="mx-1 w-px h-5 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleCopy} disabled={isLoading}>
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.drakon.copy}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleCut} disabled={isLoading}>
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.drakon.cut}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handlePaste} disabled={isLoading}>
                <ClipboardPaste className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.drakon.paste}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isLoading}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.drakon.delete}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleExportPseudocode} disabled={isLoading}>
                <FileText className="h-4 w-4 mr-1" />
                {t.drakonEditor.pseudocode}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.drakonEditor.exportPseudocode}</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" onClick={handleExportJson} disabled={isLoading}>
            <Download className="h-4 w-4 mr-1" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPng} disabled={isLoading}>
            <Download className="h-4 w-4 mr-1" />
            PNG
          </Button>
        </div>
      </div>

      {/* Editor layout with toolbar at bottom */}
      <div className="flex flex-col gap-2">
        {/* Widget container */}
        <div className="relative" onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-drakon-context-menu]')) setContextMenu(null); }}>
          {isLoading && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg z-10" 
              style={{ height }}
            >
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <div
            ref={containerRef}
            className="drakon-container rounded-lg border overflow-hidden"
            style={{ height, minHeight: 300 }}
          />

          {/* Context menu */}
          {contextMenu && (
            <div
              data-drakon-context-menu
              className="absolute z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {contextMenu.items.map((item, i) =>
                item.type === 'separator' ? (
                  <div key={i} className="my-1 h-px bg-border" />
                ) : (
                  <button
                    key={i}
                    className="w-full flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      const action = item.action;
                      setContextMenu(null);
                      // Delay action execution to let the context menu unmount first,
                      // so the widget canvas can properly show paste sockets / selection highlights
                      if (action) {
                        requestAnimationFrame(() => {
                          action();
                        });
                      }
                    }}
                  >
                    {item.text}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Bottom toolbar with icon buttons */}
        <div className="w-full overflow-x-auto border rounded-lg bg-background">
          <div className="flex items-center gap-1 p-1.5">
            {iconButtons.map(({ type, img, label }) => (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => handleInsertIcon(type)}
                    disabled={isLoading}
                  >
                    <img src={img} alt={label} className="h-7 w-7 dark:invert" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{label}</TooltipContent>
              </Tooltip>
            ))}
            
            {/* Separator */}
            <div className="mx-1 w-px h-8 bg-border shrink-0" />
            
            {/* Toggle silhouette */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={handleToggleSilhouette}
                  disabled={isLoading}
                >
                  <img src={iconSilhouette} alt="Silhouette" className="h-7 w-7 dark:invert" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t.drakonEditor.toggleSilhouette}</TooltipContent>
            </Tooltip>
      </div>

      {/* Edit dialog for element content */}
      <Dialog open={editDialog.open} onOpenChange={(open) => {
        if (!open) setEditDialog(prev => ({ ...prev, open: false }));
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              autoFocus
              value={editDialog.value}
              onChange={(e) => setEditDialog(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  editDialog.onConfirm(editDialog.value);
                  setEditDialog(prev => ({ ...prev, open: false }));
                }
              }}
              placeholder="..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditDialog(prev => ({ ...prev, open: false }))}>
                {t.editor?.cancel || 'Cancel'}
              </Button>
              <Button size="sm" onClick={() => {
                editDialog.onConfirm(editDialog.value);
                setEditDialog(prev => ({ ...prev, open: false }));
              }}>
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
      </div>
    </div>
  );
}

// Dialog wrapper for creating new diagrams
interface NewDrakonDialogProps {
  folderSlug?: string;
  trigger?: React.ReactNode;
  onCreated?: (diagramId: string) => void;
}

export function NewDrakonDialog({ folderSlug, trigger, onCreated }: NewDrakonDialogProps) {
  const [open, setOpen] = useState(false);
  const [diagramId, setDiagramId] = useState('');
  const [step, setStep] = useState<'name' | 'edit'>('name');
  const { t } = useLocale();

  const handleStartEdit = () => {
    if (!diagramId.trim()) return;
    setStep('edit');
  };

  const handleSaved = (id: string) => {
    onCreated?.(id);
    setOpen(false);
    setStep('name');
    setDiagramId('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t.drakonEditor.newDrakon}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={step === 'edit' ? 'max-w-4xl h-[80vh]' : ''}>
        <DialogHeader>
          <DialogTitle>
            {step === 'name' ? t.drakonEditor.createNewDiagram : `Edit: ${diagramId}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'name' ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-diagram-id">{t.drakonEditor.diagramId}</Label>
              <Input
                id="new-diagram-id"
                value={diagramId}
                onChange={(e) => setDiagramId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '-'))}
                placeholder="my-flowchart"
              />
              <p className="text-xs text-muted-foreground">
                {t.drakonEditor.savedIn} {folderSlug || 'diagrams'}/diagrams/{diagramId || 'id'}.drakon.json
              </p>
            </div>
            <Button onClick={handleStartEdit} disabled={!diagramId.trim()}>
              {t.drakonEditor.createAndEdit}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <DrakonEditor
              diagramId={diagramId}
              folderSlug={folderSlug}
              height={500}
              isNew
              onSaved={handleSaved}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
