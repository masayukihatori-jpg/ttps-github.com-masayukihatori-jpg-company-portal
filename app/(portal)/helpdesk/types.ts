export interface ManualPageRef {
  id: string;
  title: string;
  section: { id: string; name: string; category: { id: string; name: string } };
}

export interface RegulationRef {
  id: string;
  name: string;
  url: string;
  category: { name: string };
}

export interface HelpdeskNodeFlat {
  id: string;
  label: string;
  question: string | null;
  order: number;
  depth: number;
  parentId: string | null;
  answerText: string | null;
  manualPageId: string | null;
  regulationId: string | null;
  manualPage: ManualPageRef | null;
  regulation: RegulationRef | null;
  nodeType: string;
  useAiAnswer: boolean;
}

export interface HelpdeskNodeTree extends HelpdeskNodeFlat {
  children: HelpdeskNodeTree[];
}

/** フラット配列 → ツリー変換 */
export function buildTree(nodes: HelpdeskNodeFlat[]): HelpdeskNodeTree[] {
  const map = new Map<string, HelpdeskNodeTree>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));

  const roots: HelpdeskNodeTree[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else if (!node.parentId) {
      roots.push(node);
    }
  });

  // 兄弟を order でソート
  const sortChildren = (nodes: HelpdeskNodeTree[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);
  return roots;
}
