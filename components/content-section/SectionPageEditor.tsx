"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEditMode } from "@/contexts/EditModeContext";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

interface FileItem {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

interface Props {
  apiBase: string;
  pageSlug: string;
  initialContent: string;
  initialEmbedUrl: string;
  initialFiles: FileItem[];
  updatedAt: string;
  // コンテンツタイプ（セクション設定）
  enableText: boolean;
  enableFiles: boolean;
  enableEmbed: boolean;
  // 下書き関連
  currentUserId: string;
  draftAuthorId: string | null;
  draftContent: string | null;
  draftEmbedUrl: string | null;
  draftFiles: FileItem[];
  draftUpdatedAt: string | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  return "📎";
}

export default function SectionPageEditor({
  apiBase, pageSlug,
  initialContent, initialEmbedUrl, initialFiles, updatedAt,
  enableText, enableFiles, enableEmbed,
  currentUserId, draftAuthorId, draftContent, draftEmbedUrl, draftFiles, draftUpdatedAt,
}: Props) {
  const router = useRouter();
  const { isEditMode, isAdmin: ctxAdmin, registerSaveHandler, discardKey } = useEditMode();
  const isAdmin = ctxAdmin && isEditMode;

  // 自分の下書きがあるか
  const isMyDraft = !!draftAuthorId && draftAuthorId === currentUserId;

  // 下書きがある場合はその内容をエディタの初期値に使用
  const effectiveContent  = isMyDraft && draftContent  !== null ? draftContent  : initialContent;
  const effectiveEmbedUrl = isMyDraft && draftEmbedUrl !== null ? draftEmbedUrl : initialEmbedUrl;
  // ファイル: 公開済み + 自分の下書きファイル
  const effectiveFiles    = isMyDraft ? [...initialFiles, ...draftFiles] : initialFiles;

  // ページモード（埋め込み or ドキュメント）
  // enableEmbed のみ有効な場合は強制的に embed モード
  const initialMode: "embed" | "document" =
    enableEmbed && (effectiveEmbedUrl || (!enableText && !enableFiles)) ? "embed" : "document";
  const [pageMode, setPageMode] = useState<"embed" | "document">(initialMode);

  const [editing, setEditing]           = useState(false);
  const [content, setContent]           = useState(effectiveContent);
  const [editingEmbed, setEditingEmbed] = useState(false);
  const [embedInput, setEmbedInput]     = useState("");
  const [files, setFiles]               = useState<FileItem[]>(effectiveFiles);
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(false);

  // 下書き状態（楽観的UI用）
  const [hasDraft, setHasDraft] = useState(isMyDraft);

  // ファイル入力: isDraft フラグを ref で管理
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const fileIsDraftRef = useRef<boolean>(true);

  // モード切り替えが必要かどうか（埋め込み + ドキュメントが両方有効な場合のみ）
  const showModeToggle = enableEmbed && (enableText || enableFiles);

  useEffect(() => {
    if (!isEditMode) {
      setEditing(false);
      setContent(effectiveContent);
    }
  }, [isEditMode, discardKey]); // eslint-disable-line

  useEffect(() => {
    if (isEditMode) {
      registerSaveHandler(async () => {
        if (editing) await handlePublish();
      });
    } else {
      registerSaveHandler(null);
    }
    return () => registerSaveHandler(null);
  }, [isEditMode, editing]); // eslint-disable-line

  const patchPage = (body: object) =>
    fetch(`${apiBase}/${pageSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  // 本文：下書き保存
  const handleSaveDraft = async () => {
    setSaving(true);
    const res = await patchPage({ content, isDraft: true });
    setSaving(false);
    if (res.ok) { setEditing(false); setHasDraft(true); router.refresh(); }
  };

  // 本文：公開
  const handlePublish = async () => {
    setSaving(true);
    const res = await patchPage({ content, isDraft: false });
    setSaving(false);
    if (res.ok) { setEditing(false); setHasDraft(false); router.refresh(); }
  };

  // 埋め込みURL保存
  const handleSaveEmbed = async (urlToSave: string | undefined, isDraft: boolean) => {
    const value = urlToSave !== undefined ? urlToSave : embedInput;
    const res = await patchPage({ embedUrl: value, isDraft });
    setEditingEmbed(false);
    if (res.ok) { isDraft ? setHasDraft(true) : setHasDraft(false); router.refresh(); }
  };

  const switchToDocument = async () => {
    await patchPage({ embedUrl: "", isDraft: false });
    setPageMode("document");
    setEditingEmbed(false);
    setHasDraft(false);
    router.refresh();
  };

  const switchToEmbed = () => {
    setPageMode("embed");
    setEditingEmbed(true);
    setEmbedInput(effectiveEmbedUrl);
  };

  // ファイルアップロード
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isDraft = fileIsDraftRef.current;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("isDraft", isDraft ? "true" : "false");
    const res = await fetch(`${apiBase}/${pageSlug}/files`, { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json();
      setFiles((prev) => [...prev, { id: data.id, name: data.name, url: data.url, size: data.size, mimeType: data.mimeType }]);
      if (isDraft) setHasDraft(true);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileUpload = (isDraft: boolean) => {
    fileIsDraftRef.current = isDraft;
    fileInputRef.current?.click();
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("このファイルを削除しますか？")) return;
    const res = await fetch(`${apiBase}/${pageSlug}/files/${fileId}`, { method: "DELETE" });
    if (res.ok) setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // ── 閲覧モード ──

  if (initialEmbedUrl && !isAdmin) {
    return (
      <iframe
        src={initialEmbedUrl}
        className="w-full flex-1 border-0"
        style={{ height: "100%" }}
        title="外部サイト"
      />
    );
  }

  const hasAnyContent = initialContent || initialFiles.length > 0;
  if (!isAdmin && !hasAnyContent) {
    return (
      <div className="bg-white rounded-2xl border border-[#EEEEEE] p-12 text-center text-[#AAAAAA]">
        <p className="text-3xl mb-3">📄</p>
        <p className="text-sm">まだ内容がありません</p>
      </div>
    );
  }

  // ── 管理者編集モード ──

  const currentEmbedUrl = pageMode === "embed" ? effectiveEmbedUrl : "";

  return (
    <div className="space-y-6">

      {/* 下書きバナー */}
      {isAdmin && hasDraft && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-amber-500 text-lg">✏️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-700">下書きがあります（自分のみ表示）</p>
            {draftUpdatedAt && (
              <p className="text-xs text-amber-500 mt-0.5">
                最終更新: {new Date(draftUpdatedAt).toLocaleString("ja-JP")}
              </p>
            )}
          </div>
          <button
            onClick={handlePublish}
            disabled={saving}
            className="text-xs bg-[#0067B8] text-white px-3 py-1.5 rounded-lg hover:bg-[#005a9e] disabled:opacity-50 flex-shrink-0"
          >
            公開する
          </button>
        </div>
      )}

      {/* モード切り替えタブ（管理者 + 埋め込みとドキュメント両方が有効な場合のみ） */}
      {isAdmin && showModeToggle && (
        <div className="flex gap-2">
          <button
            onClick={() => { if (pageMode !== "document") switchToDocument(); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              pageMode === "document"
                ? "bg-[#0067B8] text-white border-[#0067B8]"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#0067B8] hover:text-[#0067B8]"
            }`}
          >
            📝 ドキュメント
          </button>
          <button
            onClick={() => { if (pageMode !== "embed") switchToEmbed(); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              pageMode === "embed"
                ? "bg-[#0067B8] text-white border-[#0067B8]"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#0067B8] hover:text-[#0067B8]"
            }`}
          >
            🌐 外部サイト埋め込み
          </button>
        </div>
      )}

      {/* 外部サイト埋め込み設定（enableEmbed かつ埋め込みモード） */}
      {enableEmbed && (isAdmin ? pageMode === "embed" : !!initialEmbedUrl) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          {isAdmin && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 text-sm">🌐 外部サイト埋め込み</h2>
                {!editingEmbed && (
                  <button
                    onClick={() => { setEditingEmbed(true); setEmbedInput(currentEmbedUrl); }}
                    className="text-xs bg-[#E2EDF5] text-[#0067B8] px-3 py-1.5 rounded-lg hover:bg-[#d0e4f0]"
                  >
                    {currentEmbedUrl ? "変更" : "設定"}
                  </button>
                )}
              </div>
              {editingEmbed ? (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={embedInput}
                    onChange={(e) => setEmbedInput(e.target.value)}
                    placeholder="https://example.com/..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEmbed(undefined, true)}
                      className="flex-1 border border-amber-300 bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-amber-100"
                    >
                      下書き保存
                    </button>
                    <button
                      onClick={() => handleSaveEmbed(undefined, false)}
                      className="flex-1 bg-[#0067B8] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#005a9e]"
                    >
                      公開
                    </button>
                    <button
                      onClick={() => { setEditingEmbed(false); if (!currentEmbedUrl) setPageMode("document"); }}
                      className="border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : currentEmbedUrl ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 truncate flex-1">{currentEmbedUrl}</p>
                  <button onClick={() => handleSaveEmbed("", false)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                </div>
              ) : (
                <p className="text-xs text-gray-300">URLを設定すると、一般ユーザーにはそのサイトが全画面で表示されます</p>
              )}
              {currentEmbedUrl && (
                <iframe
                  src={currentEmbedUrl}
                  className="w-full mt-3 rounded-xl border border-gray-100"
                  style={{ height: "300px" }}
                  title="プレビュー"
                />
              )}
            </>
          )}
        </section>
      )}

      {/* 本文セクション（enableText かつドキュメントモード） */}
      {enableText && (pageMode === "document" || !isAdmin) && (isAdmin || content) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">📝 本文</h2>
            {isAdmin && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs bg-[#E2EDF5] text-[#0067B8] px-3 py-1.5 rounded-lg hover:bg-[#d0e4f0]"
              >
                編集
              </button>
            )}
          </div>
          {editing ? (
            <div>
              <RichTextEditor value={content} onChange={setContent} placeholder="内容を入力してください..." />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setEditing(false); setContent(effectiveContent); }}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex-1 border border-amber-300 bg-amber-50 text-amber-700 py-2 rounded-xl text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "下書き保存"}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="flex-1 bg-[#0067B8] text-white py-2 rounded-xl text-sm font-medium hover:bg-[#005a9e] disabled:opacity-50"
                >
                  {saving ? "保存中..." : "公開"}
                </button>
              </div>
            </div>
          ) : content ? (
            <div
              className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none
                prose-headings:font-semibold prose-headings:text-gray-800
                prose-h2:text-base prose-h3:text-sm
                prose-a:text-[#0067B8] prose-a:underline
                prose-ul:list-disc prose-ul:pl-5
                prose-ol:list-decimal prose-ol:pl-5"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-sm text-gray-300">「編集」ボタンから内容を入力できます</p>
          )}
          {!editing && (
            <p className="text-xs text-gray-300 mt-4">
              最終更新: {new Date(updatedAt).toLocaleDateString("ja-JP")}
            </p>
          )}
        </section>
      )}

      {/* 添付ファイルセクション（enableFiles かつドキュメントモード） */}
      {enableFiles && (pageMode === "document" || !isAdmin) && (isAdmin || files.length > 0) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">📎 添付ファイル</h2>
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => triggerFileUpload(true)}
                  disabled={uploading}
                  className="text-xs border border-amber-300 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                >
                  {uploading ? "..." : "+ 下書き追加"}
                </button>
                <button
                  onClick={() => triggerFileUpload(false)}
                  disabled={uploading}
                  className="text-xs bg-[#E2EDF5] text-[#0067B8] px-3 py-1.5 rounded-lg hover:bg-[#d0e4f0] disabled:opacity-50"
                >
                  {uploading ? "アップロード中..." : "+ 公開追加"}
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          </div>
          {files.length === 0 ? (
            <p className="text-sm text-gray-300">
              {isAdmin ? "ファイルを追加できます" : "添付ファイルがありません"}
            </p>
          ) : (
            <ul className="space-y-2">
              {files.map((file) => {
                const isDraftFile = draftFiles.some((df) => df.id === file.id);
                return (
                  <li key={file.id} className="flex items-center gap-3">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 flex-1 text-sm text-gray-700 hover:text-[#0067B8] min-w-0"
                    >
                      <span className="flex-shrink-0">{getFileIcon(file.mimeType)}</span>
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatBytes(file.size)}</span>
                      {isAdmin && isDraftFile && (
                        <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded flex-shrink-0">下書き</span>
                      )}
                    </a>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        削除
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {/* 下書きファイルがある場合の一括公開 */}
          {isAdmin && files.some((f) => draftFiles.some((df) => df.id === f.id)) && (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="mt-3 text-xs bg-[#0067B8] text-white px-3 py-1.5 rounded-lg hover:bg-[#005a9e] disabled:opacity-50"
            >
              {saving ? "保存中..." : "下書きを公開する"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
