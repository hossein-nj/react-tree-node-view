import "./styles.css";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type TreeNode = {
  key: string;
  title: string;
  children?: TreeNode[];
  image?: string;
  imagePath?: string;
};

export type TreeItem = {
  _id: string;
  title: string;
};

export type TreeViewMode = "editable" | "selectable";
export type TreeViewDirection = "ltr" | "rtl";
export type TreeViewTheme = "light" | "dark";

export type TreeViewLabels = {
  addCategory: string;
  addChild: string;
  delete: string;
  expand: string;
  collapse: string;
  select: string;
  edit: string;
  dragHandle: string;
  loading: string;
  empty: string;
  dragAndDropGuide: string;
  before: string;
  inside: string;
  after: string;
  defaultCategoryTitle: string;
};

const defaultLabels: TreeViewLabels = {
  addCategory: "Add category",
  addChild: "Add child to {title}",
  delete: "Delete {title}",
  expand: "Expand category",
  collapse: "Collapse category",
  select: "Select {title}",
  edit: "Edit {title}",
  dragHandle: "Drag to reorder",
  loading: "Loading categories",
  empty: "No categories found",
  dragAndDropGuide: "Drag and drop guide",
  before: "Before",
  inside: "Inside",
  after: "After",
  defaultCategoryTitle: "New category",
};

export type TreeViewIcons = {
  expand?: ReactNode;
  collapse?: ReactNode;
  dragHandle?: ReactNode;
  folder?: ReactNode;
  openFolder?: ReactNode;
  add?: ReactNode;
  delete?: ReactNode;
  check?: ReactNode;
  empty?: ReactNode;
};

export type TreeViewDropIndicatorColors = {
  before: string;
  inside: string;
  after: string;
};

const defaultDropIndicatorColors: TreeViewDropIndicatorColors = {
  before: "#3b82f6",
  inside: "#f59e0b",
  after: "#10b981",
};

function resolveLabel(label: string, title?: string) {
  return title === undefined ? label : label.replace(/\{title\}/g, title);
}

const expandTransitionMs = 180;

const animationTiming: KeyframeAnimationOptions = {
  duration: expandTransitionMs,
  easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
  fill: "forwards",
};

function getNumericStyleValue(value: string) {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function measureExpandedHeight(element: HTMLDivElement) {
  const originalHeight = element.style.height;
  const originalOverflow = element.style.overflow;
  const content = element.firstElementChild;

  // Measure the natural layout rather than the current animation frame. The
  // bounding rect includes the element's padding and the scroll height covers
  // content that extends beyond its current box, including nested categories.
  element.style.height = "auto";
  element.style.overflow = "visible";
  element.getBoundingClientRect();

  const elementStyles = getComputedStyle(element);
  const contentStyles = content ? getComputedStyle(content) : undefined;
  const paddingHeight = getNumericStyleValue(elementStyles.paddingBlockStart) + getNumericStyleValue(elementStyles.paddingBlockEnd);
  const contentHeight = content instanceof HTMLElement ? content.getBoundingClientRect().height : 0;
  const contentMargins = contentStyles
    ? getNumericStyleValue(contentStyles.marginBlockStart) + getNumericStyleValue(contentStyles.marginBlockEnd)
    : 0;
  const naturalHeight = element.getBoundingClientRect().height;
  const measuredHeight = Math.max(element.scrollHeight, naturalHeight, contentHeight + contentMargins, paddingHeight);

  element.style.height = originalHeight;
  element.style.overflow = originalOverflow;
  return Math.ceil(measuredHeight);
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    if (mediaQuery.addEventListener) mediaQuery.addEventListener("change", updatePreference);
    else mediaQuery.addListener(updatePreference);

    return () => {
      if (mediaQuery.removeEventListener) mediaQuery.removeEventListener("change", updatePreference);
      else mediaQuery.removeListener(updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

export type TreeViewProps = {
  /** Controlled tree data. Use `defaultItems` for an uncontrolled tree. */
  items?: TreeNode[];
  /** Initial tree data for an uncontrolled tree. */
  defaultItems?: TreeNode[];
  /** Form field name. The tree or checked items are serialized into this field. */
  inputName?: string;
  /** Editable trees support add, delete, inline rename, and drag-and-drop. */
  type?: TreeViewMode;
  defaultChecked?: TreeItem[];
  checkedItems?: TreeItem[];
  onChange?: (items: TreeNode[]) => void;
  onCheckedChange?: (items: TreeItem[]) => void;
  onTitleChange?: (node: TreeNode, title: string) => void;
  onDelete?: (node: TreeNode) => void;
  height?: number;
  style?: CSSProperties;
  className?: string;
  /** CSS color used as the primary color in both themes. */
  defaultColor?: string;
  /** Visual theme for the complete tree view. Defaults to light. */
  theme?: TreeViewTheme;
  direction?: TreeViewDirection;
  icons?: TreeViewIcons;
  labels?: Partial<TreeViewLabels>;
  dropIndicatorColors?: Partial<TreeViewDropIndicatorColors>;
  loading?: boolean;
  emptyMessage?: ReactNode;
  disabled?: boolean;
};

type DropPosition = "before" | "inside" | "after" | null;
type ChildrenAnimationState = "open" | "opening" | "closing";

type IconProps = {
  size?: number;
  className?: string;
};

function SvgIcon({ children, size = 16, className, label }: IconProps & { children: ReactNode; label?: string }) {
  return (
    <svg aria-hidden={label ? undefined : true} aria-label={label} className={className} fill="none" height={size} role={label ? "img" : undefined} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );
}

function IconSlot({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`treeview-icon${className ? ` ${className}` : ""}`}>{children}</span>;
}

function ChevronIcon({ direction, ...props }: IconProps & { direction: "down" | "left" | "right" }) {
  const path = direction === "down" ? "m6 9 6 6 6-6" : direction === "left" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6";
  return <SvgIcon {...props}><path d={path} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></SvgIcon>;
}

function PlusIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></SvgIcon>;
}

function TrashIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M5 7h14M10 11v6M14 11v6M9 7V5h6v2m-9 0 1 13h10l1-13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></SvgIcon>;
}

function GripIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="3" /></SvgIcon>;
}

function CheckIcon(props: IconProps) {
  return <SvgIcon {...props}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></SvgIcon>;
}

function FolderIcon({ open, ...props }: IconProps & { open: boolean }) {
  return <SvgIcon {...props}>
    <path d="M3.5 7.5h6l1.6 2H20a1 1 0 0 1 1 1v7.2a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 17.7V8.2a.7.7 0 0 1 .5-.7Z" fill={open ? "currentColor" : "none"} opacity={open ? 0.2 : 1} stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    {open && <path d="M4 10h16.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />}
  </SvgIcon>;
}

function EmptyFolderIcon(props: IconProps) {
  return <SvgIcon {...props}>
    <path d="M3.5 7.5h6l1.6 2H20a1 1 0 0 1 1 1v7.2a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 17.7V8.2a.7.7 0 0 1 .5-.7Z" fill="currentColor" opacity=".12" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    <path d="M7 14h10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
  </SvgIcon>;
}

function createKey() {
  return globalThis.crypto?.randomUUID?.() ?? `tree-node-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function findNode(nodes: TreeNode[], key: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node;
    const child = node.children ? findNode(node.children, key) : undefined;
    if (child) return child;
  }
  return undefined;
}

function containsKey(node: TreeNode, key: string): boolean {
  return Boolean(node.children?.some((child) => child.key === key || containsKey(child, key)));
}

function updateNode(nodes: TreeNode[], key: string, updater: (node: TreeNode) => TreeNode): TreeNode[] {
  return nodes.map((node) => {
    if (node.key === key) return updater(node);
    return node.children ? { ...node, children: updateNode(node.children, key, updater) } : node;
  });
}

function removeNode(nodes: TreeNode[], key: string): [TreeNode[], TreeNode | undefined] {
  let removed: TreeNode | undefined;
  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (node.key === key) {
      removed = node;
      continue;
    }
    if (node.children) {
      const [children, child] = removeNode(node.children, key);
      if (child) removed = child;
      result.push({ ...node, children });
    } else {
      result.push(node);
    }
  }
  return [result, removed];
}

function findParentKeys(nodes: TreeNode[], targetKey: string, parents: string[] = []): string[] {
  for (const node of nodes) {
    if (node.key === targetKey) return parents;
    const result = node.children ? findParentKeys(node.children, targetKey, [...parents, node.key]) : [];
    if (result.length) return result;
  }
  return [];
}

function collectExpandableKeys(nodes: TreeNode[], keys = new Set<string>()) {
  nodes.forEach((node) => {
    if (node.children?.length) {
      keys.add(node.key);
      collectExpandableKeys(node.children, keys);
    }
  });
  return keys;
}

function insertNode(nodes: TreeNode[], targetKey: string, movedNode: TreeNode, position: Exclude<DropPosition, null>): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (node.key === targetKey) {
      if (position === "before") result.push(movedNode, node);
      if (position === "inside") result.push({ ...node, children: [...(node.children ?? []), movedNode] });
      if (position === "after") result.push(node, movedNode);
      continue;
    }
    result.push(node.children ? { ...node, children: insertNode(node.children, targetKey, movedNode, position) } : node);
  }
  return result;
}

type TreeNodeItemProps = {
  node: TreeNode;
  level: number;
  mode: TreeViewMode;
  direction: TreeViewDirection;
  prefersReducedMotion: boolean;
  icons: TreeViewIcons;
  labels: TreeViewLabels;
  checkedItems: TreeItem[];
  expandedKeys: Set<string>;
  editingKey: string | null;
  editValue: string;
  draggedKey: string | null;
  dragOverKey: string | null;
  dragPosition: DropPosition;
  disabled: boolean;
  onToggle: (key: string) => void;
  onCheck: (node: TreeNode, checked: boolean) => void;
  onStartEdit: (node: TreeNode) => void;
  onEditChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, key: string) => void;
  onDragEnd: () => void;
  onAddChild: (node: TreeNode) => void;
  onDeleteNode: (node: TreeNode) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, key: string) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>, key: string) => void;
};

function TreeNodeItem({
  node, level, mode, direction, prefersReducedMotion, icons, labels, checkedItems, expandedKeys, editingKey, editValue, draggedKey, dragOverKey, dragPosition, disabled,
  onToggle, onCheck, onStartEdit, onEditChange, onCommitEdit, onCancelEdit, onDragStart, onDragEnd, onAddChild, onDeleteNode, onDragOver, onDragLeave, onDrop,
}: TreeNodeItemProps) {
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = hasChildren && expandedKeys.has(node.key);
  const [childrenMounted, setChildrenMounted] = useState(() => hasChildren && isExpanded);
  const [childrenAnimationState, setChildrenAnimationState] = useState<ChildrenAnimationState>(() => isExpanded ? "open" : "closing");
  const childrenMountedRef = useRef(childrenMounted);
  const initialLayoutRef = useRef(true);
  const childrenElementRef = useRef<HTMLDivElement | null>(null);
  const activeAnimationRef = useRef<Animation | null>(null);
  const animationRunRef = useRef(0);
  const previousExpandedRef = useRef(isExpanded);
  const pendingOpenAnimationRef = useRef(false);
  const openingTargetHeightRef = useRef(0);
  const isEditing = editingKey === node.key;
  const isChecked = checkedItems.some((item) => item._id === node.key);
  const isDragTarget = dragOverKey === node.key;
  const titleInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditing]);

  useIsomorphicLayoutEffect(() => {
    const element = childrenElementRef.current;

    if (initialLayoutRef.current) {
      initialLayoutRef.current = false;
      previousExpandedRef.current = isExpanded;
      if (element && hasChildren && isExpanded) {
        element.style.height = "";
        element.style.overflow = "";
        setChildrenAnimationState("open");
      }
      return;
    }

    const expansionChanged = previousExpandedRef.current !== isExpanded;
    previousExpandedRef.current = isExpanded;

    if (hasChildren && isExpanded && !childrenMountedRef.current) {
      pendingOpenAnimationRef.current = true;
      childrenMountedRef.current = true;
      setChildrenMounted(true);
      return;
    }

    if (!hasChildren) {
      activeAnimationRef.current?.cancel();
      activeAnimationRef.current = null;
      animationRunRef.current += 1;
      pendingOpenAnimationRef.current = false;
      if (element) {
        element.style.height = "";
        element.style.overflow = "";
      }
      childrenMountedRef.current = false;
      if (childrenMounted) setChildrenMounted(false);
      return;
    }

    if (!element) return;

    const shouldOpen = isExpanded && (expansionChanged || pendingOpenAnimationRef.current);
    pendingOpenAnimationRef.current = false;
    if (!shouldOpen && !expansionChanged) return;

    const runningAnimation = activeAnimationRef.current;
    const currentHeight = element.getBoundingClientRect().height;
    runningAnimation?.cancel();
    activeAnimationRef.current = null;
    const animationRun = ++animationRunRef.current;

    const resetElement = () => {
      element.style.height = "";
      element.style.overflow = "";
    };

    if (prefersReducedMotion || typeof element.animate !== "function") {
      resetElement();
      if (isExpanded) {
        setChildrenAnimationState("open");
      } else {
        childrenMountedRef.current = false;
        setChildrenMounted(false);
      }
      return;
    }

    element.style.overflow = "hidden";
    const fromHeight = isExpanded && !runningAnimation ? 0 : currentHeight;
    element.style.height = `${fromHeight}px`;
    element.getBoundingClientRect();

    if (isExpanded) {
      const targetHeight = measureExpandedHeight(element);
      openingTargetHeightRef.current = targetHeight;
      setChildrenAnimationState("opening");
      const animation = element.animate(
        [{ height: `${fromHeight}px` }, { height: `${targetHeight}px` }],
        animationTiming,
      );
      activeAnimationRef.current = animation;
      animation.finished.then(() => {
        if (animationRun !== animationRunRef.current || activeAnimationRef.current !== animation) return;
        activeAnimationRef.current = null;
        animation.cancel();
        resetElement();
        setChildrenAnimationState("open");
      }).catch(() => undefined);
      return;
    }

    setChildrenAnimationState("closing");
    const animation = element.animate(
      [{ height: `${currentHeight}px` }, { height: "0px" }],
      animationTiming,
    );
    activeAnimationRef.current = animation;
    animation.finished.then(() => {
      if (animationRun !== animationRunRef.current || activeAnimationRef.current !== animation) return;
      activeAnimationRef.current = null;
      animation.cancel();
      resetElement();
      childrenMountedRef.current = false;
      setChildrenMounted(false);
    }).catch(() => undefined);
  }, [childrenMounted, hasChildren, isExpanded, prefersReducedMotion]);

  useIsomorphicLayoutEffect(() => {
    const element = childrenElementRef.current;
    const content = element?.firstElementChild;
    if (!element || !content || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      if (childrenAnimationState !== "opening" || !isExpanded) return;

      const runningAnimation = activeAnimationRef.current;
      if (!runningAnimation) return;

      const targetHeight = measureExpandedHeight(element);
      if (Math.abs(targetHeight - openingTargetHeightRef.current) < 1) return;

      const currentHeight = element.getBoundingClientRect().height;
      runningAnimation.cancel();
      activeAnimationRef.current = null;
      const animationRun = ++animationRunRef.current;
      element.style.overflow = "hidden";
      element.style.height = `${currentHeight}px`;
      element.getBoundingClientRect();
      openingTargetHeightRef.current = targetHeight;
      const animation = element.animate(
        [{ height: `${currentHeight}px` }, { height: `${targetHeight}px` }],
        animationTiming,
      );
      activeAnimationRef.current = animation;
      animation.finished.then(() => {
        if (animationRun !== animationRunRef.current || activeAnimationRef.current !== animation) return;
        activeAnimationRef.current = null;
        animation.cancel();
        element.style.height = "";
        element.style.overflow = "";
        setChildrenAnimationState("open");
      }).catch(() => undefined);
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [childrenAnimationState, childrenMounted, isExpanded]);

  useEffect(() => () => {
    animationRunRef.current += 1;
    activeAnimationRef.current?.cancel();
    activeAnimationRef.current = null;
  }, []);

  const stopPropagation = (event: MouseEvent) => event.stopPropagation();
  const childrenAreInteractive = childrenMounted && childrenAnimationState === "open" && isExpanded;

  return <div
    className="treeview-node"
  >
    <div
      className={`treeview-row${draggedKey === node.key ? " is-dragging" : ""}${isDragTarget && dragPosition ? ` is-drag-${dragPosition}` : ""}`}
      draggable={mode === "editable" && !disabled && !isEditing}
      onDragStart={(event) => onDragStart(event, node.key)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => onDragOver(event, node.key)}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop(event, node.key)}
      style={{ paddingInlineStart: `calc(${level} * var(--treeview-indent) + 0.5rem)` }}
    >
      {hasChildren ? <button aria-label={isExpanded ? labels.collapse : labels.expand} className="treeview-expander" disabled={disabled} onClick={(event) => { event.stopPropagation(); onToggle(node.key); }} title={isExpanded ? labels.collapse : labels.expand} type="button"><IconSlot>{isExpanded ? (icons.collapse ?? <ChevronIcon direction="down" size={14} />) : (icons.expand ?? <ChevronIcon direction={direction === "rtl" ? "left" : "right"} size={14} />)}</IconSlot></button> : <span className="treeview-expander-spacer" />}
      {mode === "editable" && <span aria-label={labels.dragHandle} className="treeview-drag-handle" title={labels.dragHandle}><IconSlot>{icons.dragHandle ?? <GripIcon size={16} />}</IconSlot></span>}
      {mode === "selectable" && <label className="treeview-checkbox-wrap" onClick={stopPropagation}>
        <input aria-label={resolveLabel(labels.select, node.title)} checked={isChecked} className="treeview-checkbox" disabled={disabled} onChange={(event) => onCheck(node, event.target.checked)} type="checkbox" />
        <span aria-hidden="true" className="treeview-checkmark"><IconSlot>{icons.check ?? <CheckIcon size={12} />}</IconSlot></span>
      </label>}
      <span aria-hidden="true" className={`treeview-folder${isExpanded ? " is-open" : ""}`}><IconSlot>{isExpanded ? (icons.openFolder ?? <FolderIcon open size={18} />) : (icons.folder ?? <FolderIcon open={false} size={18} />)}</IconSlot></span>
      {isEditing ? <input
        aria-label={resolveLabel(labels.edit, node.title)}
        className="treeview-title-input"
        disabled={disabled}
        onBlur={onCommitEdit}
        onChange={(event) => onEditChange(event.target.value)}
        onClick={stopPropagation}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") onCommitEdit(); if (event.key === "Escape") onCancelEdit(); }}
        ref={titleInputRef}
        value={editValue}
      /> : <button aria-label={mode === "editable" ? resolveLabel(labels.edit, node.title) : node.title} className={`treeview-title${mode === "editable" ? " is-editable" : ""}`} disabled={disabled} onClick={(event) => { event.stopPropagation(); if (mode === "editable") onStartEdit(node); }} type="button">{node.title}</button>}
      {mode === "editable" && <div className="treeview-actions">
        <button aria-label={resolveLabel(labels.addChild, node.title)} className="treeview-action treeview-action-add" disabled={disabled} onClick={(event) => { event.stopPropagation(); onAddChild(node); }} onMouseDown={stopPropagation} title={resolveLabel(labels.addChild, node.title)} type="button"><IconSlot>{icons.add ?? <PlusIcon size={13} />}</IconSlot></button>
        <button aria-label={resolveLabel(labels.delete, node.title)} className="treeview-action treeview-action-delete" disabled={disabled} onClick={(event) => { event.stopPropagation(); onDeleteNode(node); }} onMouseDown={stopPropagation} title={resolveLabel(labels.delete, node.title)} type="button"><IconSlot>{icons.delete ?? <TrashIcon size={13} />}</IconSlot></button>
      </div>}
      {hasChildren && <span className="treeview-child-count">{node.children?.length}</span>}
    </div>
    {hasChildren && childrenMounted && <div
      aria-hidden={childrenAreInteractive ? undefined : true}
      className="treeview-children"
      ref={(element) => {
        childrenElementRef.current = element;
        element?.toggleAttribute("inert", !childrenAreInteractive);
      }}
    >
      <div className="treeview-children-content">{node.children?.map((child) => <TreeNodeItem
        key={child.key}
        node={child}
        level={level + 1}
        mode={mode}
        direction={direction}
        prefersReducedMotion={prefersReducedMotion}
        icons={icons}
        labels={labels}
        checkedItems={checkedItems}
        expandedKeys={expandedKeys}
        editingKey={editingKey}
        editValue={editValue}
        draggedKey={draggedKey}
        dragOverKey={dragOverKey}
        dragPosition={dragPosition}
        disabled={disabled}
        onToggle={onToggle}
        onCheck={onCheck}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onCommitEdit={onCommitEdit}
        onCancelEdit={onCancelEdit}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onAddChild={onAddChild}
        onDeleteNode={onDeleteNode}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />)}</div>
    </div>}
  </div>;
}

export function TreeView({
  items, defaultItems = [], inputName, type = "editable", defaultChecked = [], checkedItems, onChange, onCheckedChange, onTitleChange, onDelete,
  height, style, className, defaultColor, theme = "light", direction = "ltr", icons = {}, labels = {}, dropIndicatorColors = {}, loading = false, emptyMessage, disabled = false,
}: TreeViewProps) {
  const [internalItems, setInternalItems] = useState<TreeNode[]>(defaultItems);
  const [internalCheckedItems, setInternalCheckedItems] = useState<TreeItem[]>(defaultChecked);
  const treeData = items ?? internalItems;
  const selectedItems = checkedItems ?? internalCheckedItems;
  const prefersReducedMotion = usePrefersReducedMotion();
  const mergedLabels: TreeViewLabels = { ...defaultLabels, ...labels };
  const mergedDropIndicatorColors: TreeViewDropIndicatorColors = { ...defaultDropIndicatorColors, ...dropIndicatorColors };
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => collectExpandableKeys(treeData));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<DropPosition>(null);

  const setTreeData = (next: TreeNode[]) => {
    if (items === undefined) setInternalItems(next);
    pruneExpandedKeys(next);
    onChange?.(next);
  };
  const setSelectedItems = (next: TreeItem[]) => {
    if (checkedItems === undefined) setInternalCheckedItems(next);
    onCheckedChange?.(next);
  };
  const pruneExpandedKeys = (nodes: TreeNode[]) => {
    const expandableKeys = collectExpandableKeys(nodes);
    setExpandedKeys((previous) => {
      let changed = false;
      const next = new Set<string>();
      previous.forEach((key) => {
        if (expandableKeys.has(key)) next.add(key);
        else changed = true;
      });
      return changed ? next : previous;
    });
  };
  useEffect(() => {
    pruneExpandedKeys(treeData);
  }, [treeData]);
  const toggleNode = (key: string) => setExpandedKeys((previous) => { const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const addChildNode = (parentNode: TreeNode) => {
    if (disabled) return;
    const newNode: TreeNode = { key: createKey(), title: mergedLabels.defaultCategoryTitle, children: [] };
    setTreeData(updateNode(treeData, parentNode.key, (node) => ({ ...node, children: [...(node.children ?? []), newNode] })));
    setExpandedKeys((previous) => new Set(previous).add(parentNode.key));
  };
  const addRootNode = () => { if (!disabled) setTreeData([...treeData, { key: createKey(), title: mergedLabels.defaultCategoryTitle, children: [] }]); };
  const startEdit = (node: TreeNode) => { if (!disabled && type === "editable") { setEditingKey(node.key); setEditValue(node.title); } };
  const commitEdit = () => {
    if (!editingKey) return;
    const node = findNode(treeData, editingKey);
    if (!node) return;
    const title = editValue.trim() || node.title;
    if (title !== node.title) {
      const updatedNode = { ...node, title };
      setTreeData(updateNode(treeData, editingKey, (current) => ({ ...current, title })));
      setSelectedItems(selectedItems.map((item) => item._id === editingKey ? { ...item, title } : item));
      onTitleChange?.(updatedNode, title);
    }
    setEditingKey(null);
    setEditValue("");
  };
  const deleteNode = (node: TreeNode) => {
    if (disabled) return;
    const [next] = removeNode(treeData, node.key);
    setTreeData(next);
    setSelectedItems(selectedItems.filter((item) => item._id !== node.key));
    onDelete?.(node);
    if (editingKey === node.key) { setEditingKey(null); setEditValue(""); }
  };
  const handleCheck = (node: TreeNode, checked: boolean) => {
    const parentKeys = findParentKeys(treeData, node.key);
    if (checked) {
      const ids = new Set(selectedItems.map((item) => item._id));
      const additions = [...parentKeys, node.key].filter((key) => !ids.has(key)).map((key) => { const item = findNode(treeData, key); return { _id: key, title: item?.title ?? "" }; });
      setSelectedItems([...selectedItems, ...additions]);
    } else {
      const removeKeys = new Set([...parentKeys, node.key]);
      setSelectedItems(selectedItems.filter((item) => !removeKeys.has(item._id)));
    }
  };
  const clearDragState = () => { setDragOverKey(null); setDragPosition(null); };
  const resetDragState = () => { setDraggedKey(null); clearDragState(); };
  const handleDragStart = (event: DragEvent<HTMLDivElement>, key: string) => {
    if (disabled || type !== "editable") return;
    setDraggedKey(key);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
    clearDragState();
  };
  const getDropPosition = (event: DragEvent<HTMLDivElement>): Exclude<DropPosition, null> => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientY - rect.top;
    if (offset < rect.height * 0.3) return "before";
    if (offset > rect.height * 0.7) return "after";
    return "inside";
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>, targetKey: string) => {
    if (disabled || type !== "editable" || !draggedKey) return;
    if (draggedKey === targetKey) { clearDragState(); return; }
    const draggedNode = findNode(treeData, draggedKey);
    if (!draggedNode || containsKey(draggedNode, targetKey)) { clearDragState(); return; }
    event.preventDefault();
    event.stopPropagation();
    setDragOverKey(targetKey);
    setDragPosition(getDropPosition(event));
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>, targetKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      if (disabled || type !== "editable" || !draggedKey || draggedKey === targetKey) return;
      const draggedNode = findNode(treeData, draggedKey);
      const position = dragPosition ?? getDropPosition(event);
      if (!draggedNode || containsKey(draggedNode, targetKey)) return;
      const [withoutDragged] = removeNode(treeData, draggedKey);
      setTreeData(insertNode(withoutDragged, targetKey, draggedNode, position));
      if (position === "inside") setExpandedKeys((previous) => new Set(previous).add(targetKey));
    } finally {
      resetDragState();
    }
  };

  const rootStyle = {
    "--treeview-drop-before": mergedDropIndicatorColors.before,
    "--treeview-drop-inside": mergedDropIndicatorColors.inside,
    "--treeview-drop-after": mergedDropIndicatorColors.after,
    ...(defaultColor === undefined ? {} : { "--treeview-primary": defaultColor }),
  } as CSSProperties;

  return <div className={`treeview-root${className ? ` ${className}` : ""}`} data-disabled={disabled || undefined} data-theme={theme} dir={direction} style={rootStyle}>
    {type === "editable" && <div className="treeview-toolbar">
      <button aria-label={mergedLabels.addCategory} className="treeview-add-root" disabled={disabled} onClick={addRootNode} title={mergedLabels.addCategory} type="button"><IconSlot>{icons.add ?? <PlusIcon size={16} />}</IconSlot> {mergedLabels.addCategory}</button>
      <div className="treeview-guide" aria-label={mergedLabels.dragAndDropGuide}><span><i className="treeview-guide-dot is-before" />{mergedLabels.before}</span><span><i className="treeview-guide-dot is-inside" />{mergedLabels.inside}</span><span><i className="treeview-guide-dot is-after" />{mergedLabels.after}</span></div>
    </div>}
    <div className="treeview-shell" style={{ ...style, ...(height === undefined ? {} : { maxHeight: height }) }}>
      {loading ? <div className="treeview-loading" aria-busy="true" aria-label={mergedLabels.loading}>{Array.from({ length: 6 }, (_, index) => <div className="treeview-skeleton-row" key={index} />)}</div> : treeData.length === 0 ? <div className="treeview-empty"><span className="treeview-empty-icon"><IconSlot>{icons.empty ?? <EmptyFolderIcon size={38} />}</IconSlot></span><p>{emptyMessage ?? mergedLabels.empty}</p></div> : <div className="treeview-list">{treeData.map((node) => <TreeNodeItem
        key={node.key}
        node={node}
        level={0}
        mode={type}
        direction={direction}
        prefersReducedMotion={prefersReducedMotion}
        icons={icons}
        labels={mergedLabels}
        checkedItems={selectedItems}
        expandedKeys={expandedKeys}
        editingKey={editingKey}
        editValue={editValue}
        draggedKey={draggedKey}
        dragOverKey={dragOverKey}
        dragPosition={dragPosition}
        disabled={disabled}
        onToggle={toggleNode}
        onCheck={handleCheck}
        onStartEdit={startEdit}
        onEditChange={setEditValue}
        onCommitEdit={commitEdit}
        onCancelEdit={() => { setEditingKey(null); setEditValue(""); }}
        onDragStart={handleDragStart}
        onDragEnd={resetDragState}
        onAddChild={addChildNode}
        onDeleteNode={deleteNode}
        onDragOver={handleDragOver}
        onDragLeave={clearDragState}
        onDrop={handleDrop}
      />)}</div>}
    </div>
    {inputName && <input name={inputName} type="hidden" value={JSON.stringify(type === "selectable" ? selectedItems : treeData)} readOnly />}
  </div>;
}

export default TreeView;
