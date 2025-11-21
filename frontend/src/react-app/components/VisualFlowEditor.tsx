import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Edge,
    Node,
    useNodesState,
    useEdgesState,
    Connection,
    addEdge,
    MarkerType,
    Panel,
    NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, Loader2, LayoutDashboard, X, Plus } from 'lucide-react';
import dagre from 'dagre';
import { Flow } from '../types';
import { useUpdateFlowStep, useDeleteFlowStep, useCreateFlowStep } from '../hooks/useApi';
import { notificationActions } from '../stores/useNotificationStore';
import FlowStepNode from './flow/FlowStepNode';
import FlowStepForm from './flow/FlowStepForm';

interface VisualFlowEditorProps {
    flow: Flow;
}

const nodeTypes: NodeTypes = {
    flowStep: FlowStepNode,
};

// Dagre layout configuration
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 100 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 200, height: 120 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - 100,
                y: nodeWithPosition.y - 60,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

const VisualFlowEditor = ({ flow }: VisualFlowEditorProps) => {
    const updateStep = useUpdateFlowStep();
    const deleteStep = useDeleteFlowStep();
    const createStep = useCreateFlowStep();
    const [isSaving, setIsSaving] = useState(false);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isCreatingStep, setIsCreatingStep] = useState(false);

    // Convert steps to nodes
    const initialNodes: Node[] = useMemo(() => {
        if (!flow.steps) return [];
        return flow.steps.map((step, index) => ({
            id: step.key,
            type: 'flowStep',
            position: step.uiMetadataJson?.position || { x: 100 + (index * 250), y: 100 + (index * 50) },
            data: {
                label: step.key,
                step: step
            },
        }));
    }, [flow.steps]);

    // Convert transitions to edges
    const initialEdges: Edge[] = useMemo(() => {
        if (!flow.steps) return [];
        const edges: Edge[] = [];
        flow.steps.forEach((step) => {
            if (step.transitionsJson) {
                Object.entries(step.transitionsJson).forEach(([trigger, targetKey]) => {
                    edges.push({
                        id: `${step.key}-${trigger}-${targetKey}`,
                        source: step.key,
                        target: targetKey,
                        label: trigger === 'default' ? undefined : trigger,
                        type: 'smoothstep',
                        markerEnd: { type: MarkerType.ArrowClosed },
                        animated: true,
                        style: { stroke: '#0f766e' },
                    });
                });
            }
        });
        return edges;
    }, [flow.steps]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        async (params: Connection) => {
            setEdges((eds) => addEdge(params, eds));

            if (!params.source || !params.target) return;

            const sourceStep = flow.steps?.find(s => s.key === params.source);
            if (!sourceStep) return;

            // Default to 'default' trigger for now. 
            const newTransitions = {
                ...sourceStep.transitionsJson,
                default: params.target
            };

            try {
                await updateStep.mutateAsync({
                    flowId: flow.id,
                    stepId: sourceStep.id,
                    data: {
                        transitions: newTransitions
                    }
                });
                notificationActions.notify({ message: 'Conexão criada!', type: 'success' });
            } catch (err) {
                console.error('Failed to save connection:', err);
                notificationActions.notify({ message: 'Erro ao salvar conexão.', type: 'error' });
            }
        },
        [setEdges, flow.steps, flow.id, updateStep],
    );

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
        setIsCreatingStep(false);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const onNodesDelete = useCallback(
        async (nodesToDelete: Node[]) => {
            if (!window.confirm(`Tem certeza que deseja excluir ${nodesToDelete.length} passo(s)?`)) {
                return;
            }

            for (const node of nodesToDelete) {
                const step = flow.steps?.find(s => s.key === node.id);
                if (!step) continue;

                try {
                    await deleteStep.mutateAsync({
                        flowId: flow.id,
                        stepId: step.id
                    });
                    notificationActions.notify({ message: `Passo ${step.key} excluído.`, type: 'success' });
                } catch (error) {
                    console.error('Failed to delete node:', error);
                    notificationActions.notify({ message: `Erro ao excluir ${step.key}.`, type: 'error' });
                }
            }
            setSelectedNode(null);
        },
        [flow.steps, flow.id, deleteStep]
    );

    const onEdgesDelete = useCallback(
        async (edgesToDelete: Edge[]) => {
            for (const edge of edgesToDelete) {
                const sourceStep = flow.steps?.find(s => s.key === edge.source);
                if (!sourceStep) continue;

                const triggerKey = edge.label as string || 'default';

                const newTransitions = { ...sourceStep.transitionsJson };
                delete newTransitions[triggerKey];

                try {
                    await updateStep.mutateAsync({
                        flowId: flow.id,
                        stepId: sourceStep.id,
                        data: { transitions: newTransitions }
                    });
                    notificationActions.notify({ message: 'Conexão removida.', type: 'success' });
                } catch (error) {
                    console.error('Failed to delete edge:', error);
                    notificationActions.notify({ message: 'Erro ao remover conexão.', type: 'error' });
                }
            }
        },
        [flow.steps, flow.id, updateStep]
    );

    const handleAutoLayout = useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        notificationActions.notify({ message: 'Layout automático aplicado!', type: 'success' });
    }, [nodes, edges, setNodes, setEdges]);

    const handleSaveLayout = async () => {
        setIsSaving(true);
        try {
            const updates = nodes.map((node) => {
                const originalStep = flow.steps?.find(s => s.key === node.id);
                if (!originalStep) return null;

                return updateStep.mutateAsync({
                    flowId: flow.id,
                    stepId: originalStep.id,
                    data: {
                        uiMetadata: { position: node.position }
                    }
                });
            }).filter((p): p is Promise<any> => p !== null);

            await Promise.all(updates);
            notificationActions.notify({ message: 'Layout salvo com sucesso!', type: 'success' });
        } catch (error) {
            console.error('Failed to save layout:', error);
            notificationActions.notify({ message: 'Erro ao salvar layout.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleStepSave = async (data: any) => {
        const selectedStep = flow.steps?.find(s => s.key === selectedNode?.id);

        if (selectedStep) {
            // Update existing step
            await updateStep.mutateAsync({
                flowId: flow.id,
                stepId: selectedStep.id,
                data
            });
            notificationActions.notify({ message: 'Passo atualizado!', type: 'success' });
        } else if (isCreatingStep) {
            // Create new step
            await createStep.mutateAsync({
                flowId: flow.id,
                data: {
                    ...data,
                    order: (flow.steps?.length || 0) + 1
                }
            });
            notificationActions.notify({ message: 'Passo criado!', type: 'success' });
        }

        setSelectedNode(null);
        setIsCreatingStep(false);
    };

    const selectedStep = useMemo(() => {
        if (!selectedNode) return null;
        return flow.steps?.find(s => s.key === selectedNode.id) || null;
    }, [selectedNode, flow.steps]);

    return (
        <div className="flex h-[600px] w-full gap-4">
            {/* Main Canvas */}
            <div className="flex-1 rounded-xl border border-brand-border/60 bg-brand-surface relative overflow-hidden">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    onNodesDelete={onNodesDelete}
                    onEdgesDelete={onEdgesDelete}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-brand-surface/50"
                >
                    <Background color="#334155" gap={20} size={1} />
                    <Controls className="bg-brand-surface border-brand-border/60 text-brand-muted" />
                    <Panel position="top-right" className="flex gap-2">
                        <button
                            onClick={handleAutoLayout}
                            className="flex items-center gap-2 rounded-lg bg-brand-surface border border-brand-border/60 px-4 py-2 text-sm font-bold text-white hover:bg-brand-surface/80 shadow-lg transition-all"
                            title="Organizar automaticamente"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Auto-layout
                        </button>
                        <button
                            onClick={handleSaveLayout}
                            disabled={isSaving}
                            className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-slate-950 hover:bg-brand-primary/90 disabled:opacity-50 shadow-lg transition-all"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Salvar Layout
                        </button>
                    </Panel>
                    <Panel position="top-left">
                        <button
                            onClick={() => {
                                setIsCreatingStep(true);
                                setSelectedNode(null);
                            }}
                            className="flex items-center gap-2 rounded-lg bg-brand-primary/10 border border-brand-primary/40 px-4 py-2 text-sm font-bold text-brand-primary hover:bg-brand-primary/20 shadow-lg transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            Novo Passo
                        </button>
                    </Panel>
                </ReactFlow>
            </div>

            {/* Sidebar */}
            {(selectedNode || isCreatingStep) && (
                <div className="w-80 rounded-xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-4 shadow-lg backdrop-blur overflow-y-auto">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">
                            {isCreatingStep ? 'Novo Passo' : `Editar: ${selectedStep?.key}`}
                        </h3>
                        <button
                            onClick={() => {
                                setSelectedNode(null);
                                setIsCreatingStep(false);
                            }}
                            className="text-brand-muted hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <FlowStepForm
                        flow={flow}
                        step={selectedStep}
                        onSave={handleStepSave}
                        onCancel={() => {
                            setSelectedNode(null);
                            setIsCreatingStep(false);
                        }}
                        isSaving={updateStep.isPending || createStep.isPending}
                    />
                </div>
            )}
        </div>
    );
};

export default VisualFlowEditor;
