"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table/table";
import { TableRow } from "@tiptap/extension-table/row";
import { TableCell as TableCellBase } from "@tiptap/extension-table/cell";
import { TableHeader as TableHeaderBase } from "@tiptap/extension-table/header";

// backgroundColor 属性を追加した拡張
const bgAttr = {
  backgroundColor: {
    default: null,
    parseHTML: (el: HTMLElement) => el.style.backgroundColor || null,
    renderHTML: (attrs: { backgroundColor?: string | null }) =>
      attrs.backgroundColor ? { style: `background-color: ${attrs.backgroundColor}` } : {},
  },
};
const TableCell = TableCellBase.extend({ addAttributes() { return { ...this.parent?.(), ...bgAttr }; } });
const TableHeader = TableHeaderBase.extend({ addAttributes() { return { ...this.parent?.(), ...bgAttr }; } });
import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  grow?: boolean; // true のとき親コンテナの残り高さいっぱいに伸びる
}

const COLORS = [
  { label: "黒", value: "#111827" },
  { label: "グレー", value: "#6B7280" },
  { label: "赤", value: "#EF4444" },
  { label: "オレンジ", value: "#F97316" },
  { label: "黄", value: "#CA8A04" },
  { label: "緑", value: "#16A34A" },
  { label: "青", value: "#0067B8" },
  { label: "紫", value: "#7C3AED" },
  { label: "ピンク", value: "#DB2777" },
];

const FONT_SIZES = [
  { label: "小 (12px)", value: "12px" },
  { label: "標準 (14px)", value: "14px" },
  { label: "大 (18px)", value: "18px" },
  { label: "特大 (24px)", value: "24px" },
];

function Btn({
  onClick, active, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
        active
          ? "bg-[#0067B8] text-white"
          : "text-[#555555] hover:bg-[#E2EDF5] hover:text-[#0067B8]"
      }`}
    >
      {children}
    </button>
  );
}

/* ── 表メニュー ── */
function TableMenu({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!editor) return null;
  const inTable = editor.isActive("table");

  return (
    <div ref={ref} className="relative">
      <Btn onClick={() => setOpen((v) => !v)} active={open} title="表">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="1.5"/>
          <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
          <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
      </Btn>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#DDDDDD] rounded-xl shadow-lg p-2 min-w-[160px] flex flex-col gap-0.5">
          {!inTable && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                setOpen(false);
              }}
              className="text-left text-xs px-3 py-1.5 rounded-lg hover:bg-[#E2EDF5] text-[#192E61]"
            >
              ＋ 表を挿入（3×3）
            </button>
          )}
          {inTable && (
            <>
              {/* セル塗りつぶし */}
              <p className="text-[10px] text-[#AAAAAA] px-3 pt-1 pb-0.5 font-semibold tracking-wide uppercase">セル背景色</p>
              <div className="flex flex-wrap gap-1 px-3 pb-1">
                {[
                  "#FFFFFF", "#F5F7FA", "#FEF9C3", "#FEE2E2", "#DBEAFE",
                  "#DCFCE7", "#F3E8FF", "#FFE4E6", "#E0F2FE", "#FED7AA",
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setCellAttribute("backgroundColor", color).run();
                    }}
                    className="w-5 h-5 rounded border border-[#DDDDDD] hover:scale-125 transition-transform flex-shrink-0"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().setCellAttribute("backgroundColor", null).run();
                  }}
                  className="w-5 h-5 rounded border border-dashed border-[#AAAAAA] text-[8px] text-[#AAAAAA] flex items-center justify-center hover:scale-125 transition-transform"
                  title="背景色をリセット"
                >✕</button>
              </div>
              <div className="my-1 border-t border-[#EEEEEE]" />
              <p className="text-[10px] text-[#AAAAAA] px-3 pt-1 pb-0.5 font-semibold tracking-wide uppercase">行</p>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowBefore().run(); setOpen(false); }}
                className="text-left text-xs px-3 py-1.5 rounded-lg hover:bg-[#E2EDF5] text-[#192E61]">↑ 上に行を追加</button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); setOpen(false); }}
                className="text-left text-xs px-3 py-1.5 rounded-lg hover:bg-[#E2EDF5] text-[#192E61]">↓ 下に行を追加</button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); setOpen(false); }}
                className="text-left text-xs px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-500">✕ この行を削除</button>
              <div className="my-1 border-t border-[#EEEEEE]" />
              <p className="text-[10px] text-[#AAAAAA] px-3 pt-0.5 pb-0.5 font-semibold tracking-wide uppercase">列</p>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnBefore().run(); setOpen(false); }}
                className="text-left text-xs px-3 py-1.5 rounded-lg hover:bg-[#E2EDF5] text-[#192E61]">← 左に列を追加</button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); setOpen(false); }}
                className="text-left text-xs px-3 py-1.5 rounded-lg hover:bg-[#E2EDF5] text-[#192E61]">→ 右に列を追加</button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); setOpen(false); }}
                className="text-left text-xs px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-500">✕ この列を削除</button>
              <div className="my-1 border-t border-[#EEEEEE]" />
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); setOpen(false); }}
                className="text-left text-xs px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-600 font-medium">🗑 表を削除</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder, grow }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "min-h-[200px] outline-none",
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              if (src) {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src })
                  )
                );
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!editor) return null;

  return (
    <div className={`border border-[#0067B8] rounded-xl overflow-hidden${grow ? " flex flex-col flex-1 min-h-0" : ""}`}>
      {/* ━━ ツールバー ━━ */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-[#F8FAFC] border-b border-[#EEEEEE]">

        {/* 見出し */}
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })} title="見出し(大)">H2</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })} title="見出し(小)">H3</Btn>

        <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

        {/* 文字スタイル */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")} title="太字">
          <strong>B</strong>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")} title="斜体">
          <em>I</em>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")} title="下線">
          <span className="underline">U</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")} title="取り消し線">
          <span className="line-through">S</span>
        </Btn>

        <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

        {/* フォントサイズ */}
        <select
          title="文字サイズ"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.value === "") {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(e.target.value).run();
            }
          }}
          className="text-xs text-[#555555] border border-[#DDDDDD] rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#0067B8]"
        >
          <option value="">サイズ</option>
          {FONT_SIZES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

        {/* 文字色 */}
        <span className="text-xs text-[#AAAAAA] mr-0.5">色:</span>
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().setColor(c.value).run();
            }}
            className="w-4 h-4 rounded-sm border border-white hover:scale-125 transition-transform flex-shrink-0"
            style={{ backgroundColor: c.value }}
            title={c.label}
          />
        ))}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run(); }}
          className="w-4 h-4 rounded-sm border border-dashed border-[#AAAAAA] text-[8px] text-[#AAAAAA] flex items-center justify-center hover:scale-125 transition-transform"
          title="色をリセット"
        >✕</button>

        <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

        {/* ハイライト */}
        <Btn onClick={() => editor.chain().focus().toggleHighlight({ color: "#FEF08A" }).run()}
          active={editor.isActive("highlight")} title="マーカー">
          <span style={{ background: "#FEF08A", padding: "0 3px", borderRadius: 2 }}>蛍光</span>
        </Btn>

        <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

        {/* 揃え */}
        <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })} title="左揃え">
          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
            <rect x="0" y="0" width="12" height="1.5"/><rect x="0" y="4" width="8" height="1.5"/><rect x="0" y="8" width="10" height="1.5"/>
          </svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })} title="中央揃え">
          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
            <rect x="0" y="0" width="12" height="1.5"/><rect x="2" y="4" width="8" height="1.5"/><rect x="1" y="8" width="10" height="1.5"/>
          </svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })} title="右揃え">
          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
            <rect x="0" y="0" width="12" height="1.5"/><rect x="4" y="4" width="8" height="1.5"/><rect x="2" y="8" width="10" height="1.5"/>
          </svg>
        </Btn>

        <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

        {/* リスト */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")} title="箇条書き">• リスト</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")} title="番号リスト">1. リスト</Btn>

        <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

        {/* undo / redo */}
        <Btn onClick={() => editor.chain().focus().undo().run()} title="元に戻す">↩</Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="やり直し">↪</Btn>

        <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

        {/* 表 */}
        <TableMenu editor={editor} />

        <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

        {/* 画像挿入 */}
        <Btn onClick={() => fileInputRef.current?.click()} title="画像を挿入（クリップボードからの貼り付けも可）">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </Btn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const src = ev.target?.result as string;
              if (src) editor.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* ━━ エディター本体 ━━ */}
      <style>{`
        .tiptap table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        .tiptap table td, .tiptap table th { border: 1px solid #DDDDDD; padding: 6px 10px; min-width: 60px; vertical-align: top; }
        .tiptap table th { background: #F5F7FA; font-weight: 600; font-size: 0.8rem; color: #192E61; }
        .tiptap table .selectedCell { outline: 2px solid #0067B8; outline-offset: -2px; }
      `}</style>
      <div className={`relative px-4 py-3 bg-white${grow ? " flex-1 min-h-0 overflow-y-auto" : " min-h-[200px]"}`}>
        {!editor.getText() && (
          <p className="absolute top-3 left-4 text-sm text-[#CCCCCC] pointer-events-none select-none">
            {placeholder ?? "内容を入力してください..."}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
