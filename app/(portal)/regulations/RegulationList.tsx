"use client";

import { useState, useRef, useEffect } from "react";
import { useEditMode } from "@/contexts/EditModeContext";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ─── 型定義 ─── */
interface RegulationItem {
  id: string; name: string; fileName: string; url: string;
  size: number; createdAt: string; uploadedBy: string | null; order: number;
}
interface Category {
  id: string; name: string; order: number; regulations: RegulationItem[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function DragHandle(props: React.HTMLAttributes<SVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" {...props}>
      <circle cx="4" cy="3" r="1.3"/><circle cx="4" cy="7" r="1.3"/><circle cx="4" cy="11" r="1.3"/>
      <circle cx="10" cy="3" r="1.3"/><circle cx="10" cy="7" r="1.3"/><circle cx="10" cy="11" r="1.3"/>
    </svg>
  );
}

/* ─── 規程行 ─── */
function SortableRegulationRow({
  item, isAdmin, selected, onSelect, onDelete,
}: {
  item: RegulationItem; isAdmin: boolean; selected: boolean;
  onSelect: (item: RegulationItem) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef} style={style}
      onClick={() => !isDragging && onSelect(item)}
      className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 group cursor-pointer transition-colors ${
        selected
          ? "bg-[#E2EDF5] border-[#0067B8]"
          : isDragging
          ? "bg-white shadow-md border-[#0067B8]/30"
          : "bg-white border-[#EEEEEE] hover:border-[#0067B8] hover:bg-blue-50/30"
      }`}
    >
      {isAdmin && (
        <button
          {...attributes} {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="text-[#CCCCCC] hover:text-[#AAAAAA] cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          title="ドラッグして並び替え"
        >
          <DragHandle />
        </button>
      )}

      {/* PDFアイコン */}
      <div className="w-7 h-7 bg-red-50 rounded-md flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#EF4444" strokeWidth="1.8"/>
          <path d="M14 2v6h6" stroke="#EF4444" strokeWidth="1.8" strokeLinejoin="round"/>
          <text x="6" y="18" fontSize="5" fill="#EF4444" fontWeight="bold">PDF</text>
        </svg>
      </div>

      {/* 名前 */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${selected ? "text-[#0067B8]" : "text-[#192E61]"}`}>
          {item.name}
        </p>
        <p className="text-xs text-[#AAAAAA]">
          {formatBytes(item.size)} · {new Date(item.createdAt).toLocaleDateString("ja-JP")}
        </p>
      </div>

      {/* 管理者：削除のみ */}
      {isAdmin && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#AAAAAA] hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 flex-shrink-0"
        >
          削除
        </button>
      )}
    </div>
  );
}

/* ─── カテゴリセクション ─── */
function SortableCategorySection({
  category, isAdmin, selectedId, onSelect,
  onRegulationDelete, onRegulationReorder,
  onCategoryRename, onCategoryDelete, onUpload,
}: {
  category: Category; isAdmin: boolean; selectedId: string | null;
  onSelect: (item: RegulationItem) => void;
  onRegulationDelete: (catId: string, regId: string) => void;
  onRegulationReorder: (catId: string, newItems: RegulationItem[]) => void;
  onCategoryRename: (catId: string, name: string) => void;
  onCategoryDelete: (catId: string) => void;
  onUpload: (catId: string, file: File) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });
  const [editingCat, setEditingCat] = useState(false);
  const [catName, setCatName] = useState(category.name);
  const [collapsed, setCollapsed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 30 : undefined,
  };

  const pdfSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handlePdfDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = category.regulations.findIndex((r) => r.id === active.id);
    const newIdx = category.regulations.findIndex((r) => r.id === over.id);
    const newItems = arrayMove(category.regulations, oldIdx, newIdx);
    onRegulationReorder(category.id, newItems);
    await fetch("/api/regulations/reorder", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newItems.map((r) => r.id) }),
    });
  };

  const handleCatRename = async () => {
    if (!catName.trim() || catName === category.name) { setEditingCat(false); return; }
    await fetch(`/api/regulations/categories/${category.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName.trim() }),
    });
    onCategoryRename(category.id, catName.trim()); setEditingCat(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.includes("pdf")) onUpload(category.id, file);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`bg-white rounded-xl border overflow-hidden ${isDragging ? "shadow-lg border-[#0067B8]/30" : "border-[#EEEEEE]"}`}>
        {/* カテゴリヘッダー */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#F8FAFC] border-b border-[#EEEEEE]">
          {isAdmin && (
            <button {...attributes} {...listeners}
              className="text-[#BBBBBB] hover:text-[#888888] cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
              title="カテゴリを並び替え">
              <DragHandle />
            </button>
          )}
          <div className="flex-1 min-w-0">
            {editingCat ? (
              <input autoFocus value={catName} onChange={(e) => setCatName(e.target.value)}
                onBlur={handleCatRename}
                onKeyDown={(e) => { if (e.key === "Enter") handleCatRename(); if (e.key === "Escape") { setCatName(category.name); setEditingCat(false); } }}
                className="text-sm font-semibold border-b border-[#0067B8] outline-none bg-transparent text-[#192E61] w-48"
              />
            ) : (
              <span className="text-sm font-semibold text-[#192E61]">{category.name}</span>
            )}
          </div>
          <span className="text-xs text-[#AAAAAA] bg-[#EEEEEE] rounded-full px-2 py-0.5 flex-shrink-0">{category.regulations.length}件</span>
          {isAdmin && (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => setEditingCat(true)} className="text-xs text-[#888888] hover:text-[#0067B8] px-2 py-1 rounded hover:bg-[#E2EDF5]">名前変更</button>
              <button onClick={() => { if (confirm(`「${category.name}」を削除しますか？\n配下のPDFも全て削除されます。`)) onCategoryDelete(category.id); }}
                className="text-xs text-[#AAAAAA] hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">削除</button>
            </div>
          )}
          <button onClick={() => setCollapsed((v) => !v)} className="text-[#AAAAAA] hover:text-[#555555] flex-shrink-0 ml-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"
              className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}>
              <path d="M2 4l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        {!collapsed && (
          <div
            className={`p-3 space-y-2 transition-colors ${isDragOver ? "bg-[#E2EDF5]/60" : ""}`}
            onDragOver={(e) => { e.preventDefault(); if (isAdmin) setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={isAdmin ? handleFileDrop : undefined}
          >
            {category.regulations.length > 0 ? (
              <DndContext sensors={pdfSensors} collisionDetection={closestCenter} onDragEnd={handlePdfDragEnd}>
                <SortableContext items={category.regulations.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {category.regulations.map((reg) => (
                      <SortableRegulationRow
                        key={reg.id} item={reg} isAdmin={isAdmin}
                        selected={selectedId === reg.id}
                        onSelect={onSelect}
                        onDelete={(id) => onRegulationDelete(category.id, id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-xs text-[#CCCCCC] text-center py-2">PDFがありません</p>
            )}
            {isAdmin && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center justify-center gap-2 border border-dashed rounded-lg px-3 py-2 cursor-pointer transition-colors text-xs ${
                  isDragOver ? "border-[#0067B8] bg-[#E2EDF5] text-[#0067B8]" : "border-[#DDDDDD] text-[#AAAAAA] hover:border-[#0067B8] hover:text-[#0067B8] hover:bg-[#E2EDF5]/40"
                }`}
              >
                <span>＋</span><span>PDFを追加（クリックまたはここにドロップ）</span>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(category.id, file); e.target.value = ""; }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── メインコンポーネント ─── */
export default function RegulationList({ initialCategories }: { initialCategories: Category[] }) {
  const { isEditMode, isAdmin: ctxAdmin, discardKey } = useEditMode();
  const isAdmin = ctxAdmin && isEditMode;
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedReg, setSelectedReg] = useState<RegulationItem | null>(null);

  useEffect(() => { setCategories(initialCategories); }, [discardKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [uploading, setUploading] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);

  const catSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = categories.findIndex((c) => c.id === active.id);
    const newIdx = categories.findIndex((c) => c.id === over.id);
    const newCats = arrayMove(categories, oldIdx, newIdx);
    setCategories(newCats);
    await fetch("/api/regulations/categories/reorder", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newCats.map((c) => c.id) }),
    });
  };

  const handleUpload = async (categoryId: string, file: File) => {
    setUploading(categoryId);
    const form = new FormData();
    form.append("file", file); form.append("name", file.name.replace(/\.pdf$/i, "")); form.append("categoryId", categoryId);
    const res = await fetch("/api/regulations", { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json();
      setCategories((prev) => prev.map((c) => c.id === categoryId ? { ...c, regulations: [...c.regulations, { id: data.id, name: data.name, fileName: data.fileName, url: data.url, size: data.size, createdAt: data.createdAt, uploadedBy: data.uploadedBy, order: data.order }] } : c));
    }
    setUploading(null);
  };

  const handleRegulationDelete = async (catId: string, regId: string) => {
    if (!confirm("このPDFを削除しますか？")) return;
    await fetch(`/api/regulations/${regId}`, { method: "DELETE" });
    setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, regulations: c.regulations.filter((r) => r.id !== regId) } : c));
    if (selectedReg?.id === regId) setSelectedReg(null);
  };

  const handleRegulationReorder = (catId: string, newItems: RegulationItem[]) => {
    setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, regulations: newItems } : c));
  };

  const handleCategoryRename = (catId: string, name: string) => {
    setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, name } : c));
  };

  const handleCategoryDelete = async (catId: string) => {
    await fetch(`/api/regulations/categories/${catId}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    const deletedCat = categories.find((c) => c.id === catId);
    if (deletedCat?.regulations.some((r) => r.id === selectedReg?.id)) setSelectedReg(null);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const res = await fetch("/api/regulations/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories((prev) => [...prev, { ...data, regulations: [] }]);
    }
    setNewCatName(""); setShowAddCat(false);
  };

  return (
    <div className="flex gap-5 flex-1 min-h-0 pb-6">

      {/* ━━ 左：カテゴリ・規程一覧 ━━ */}
      <div className="w-80 flex-shrink-0 space-y-3 overflow-y-auto">
        {uploading && (
          <div className="text-xs text-[#0067B8] bg-[#E2EDF5] rounded-lg px-4 py-2 flex items-center gap-2">
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            アップロード中...
          </div>
        )}
        {isAdmin && categories.length > 1 && (
          <p className="text-xs text-[#AAAAAA] flex items-center gap-1">
            <DragHandle className="inline" /> カテゴリ・PDFともにドラッグで並び替えできます
          </p>
        )}

        <DndContext sensors={catSensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {categories.map((cat) => (
                <SortableCategorySection
                  key={cat.id} category={cat} isAdmin={isAdmin}
                  selectedId={selectedReg?.id ?? null}
                  onSelect={setSelectedReg}
                  onRegulationDelete={handleRegulationDelete}
                  onRegulationReorder={handleRegulationReorder}
                  onCategoryRename={handleCategoryRename}
                  onCategoryDelete={handleCategoryDelete}
                  onUpload={handleUpload}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {isAdmin && (
          <div>
            {showAddCat ? (
              <div className="flex gap-2">
                <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); if (e.key === "Escape") { setShowAddCat(false); setNewCatName(""); } }}
                  placeholder="カテゴリ名を入力..."
                  className="flex-1 border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067B8]"
                />
                <button onClick={handleAddCategory} className="bg-[#0067B8] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#005a9e]">追加</button>
                <button onClick={() => { setShowAddCat(false); setNewCatName(""); }} className="border border-[#DDDDDD] text-[#888888] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">✕</button>
              </div>
            ) : (
              <button onClick={() => setShowAddCat(true)}
                className="flex items-center gap-2 text-sm text-[#0067B8] hover:bg-[#E2EDF5] px-3 py-2 rounded-lg transition-colors border border-dashed border-[#BBDDEE]">
                <span className="text-lg leading-none">＋</span> カテゴリを追加
              </button>
            )}
          </div>
        )}
      </div>

      {/* ━━ 右：PDFビューア ━━ */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {selectedReg ? (
          <div className="bg-white rounded-xl border border-[#EEEEEE] overflow-hidden flex flex-col flex-1 min-h-0">
            {/* ビューアヘッダー */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#F8FAFC] border-b border-[#EEEEEE] flex-shrink-0">
              <div className="w-7 h-7 bg-red-50 rounded-md flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#EF4444" strokeWidth="1.8"/>
                  <path d="M14 2v6h6" stroke="#EF4444" strokeWidth="1.8" strokeLinejoin="round"/>
                  <text x="6" y="18" fontSize="5" fill="#EF4444" fontWeight="bold">PDF</text>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#192E61] truncate">{selectedReg.name}</p>
                <p className="text-xs text-[#AAAAAA]">{formatBytes(selectedReg.size)}</p>
              </div>
              {/* ダウンロードボタン */}
              <a
                href={selectedReg.url}
                download={selectedReg.fileName}
                className="flex items-center gap-1.5 bg-[#0067B8] hover:bg-[#005a9e] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                ダウンロード
              </a>
              {/* 別タブで開く */}
              <a
                href={selectedReg.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 border border-[#DDDDDD] text-[#555555] hover:bg-gray-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                別タブ
              </a>
              {/* 閉じる */}
              <button
                onClick={() => setSelectedReg(null)}
                className="text-[#AAAAAA] hover:text-[#555555] p-1 rounded hover:bg-gray-100 flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* iframeビューア */}
            <iframe
              key={selectedReg.id}
              src={`${selectedReg.url}#toolbar=1&navpanes=0`}
              className="flex-1 w-full"
              title={selectedReg.name}
            />
          </div>
        ) : (
          /* プレースホルダー */
          <div className="flex-1 flex items-center justify-center text-gray-300">
            <div className="text-center space-y-3">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="mx-auto opacity-30">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-sm">左の一覧から規程を選択すると<br/>ここに表示されます</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
