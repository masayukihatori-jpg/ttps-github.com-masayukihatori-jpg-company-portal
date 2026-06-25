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
  isDraft?: boolean;
}

interface UrlItem {
  label: string;
  url: string;
}

interface Props {
  slug: string;
  initialContent: string;
  initialEmbedUrl: string;
  initialUrls: UrlItem[];
  initialFiles: FileItem[];
  updatedAt: string;
  currentUserId: string;
  draftAuthorId: string | null;
  draftContent: string | null;
  draftEmbedUrl: string | null;
  draftUrls: UrlItem[] | null;
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

export default function CompanyInfoEditor({
  slug, initialContent, initialEmbedUrl, initialUrls, initialFiles, updatedAt,
  currentUserId, draftAuthorId, draftContent, draftEmbedUrl, draftUrls, draftUpdatedAt,
}: Props) {
  const router = useRouter();
  const { isEditMode, isAdmin: ctxAdmin, registerSaveHandler, discardKey } = useEditMode();
  const isAdmin = ctxAdmin && isEditMode; // 編集モード中のみ管理者として動作

  const hasDraft = !!(draftContent !== null || draftEmbedUrl !== null || draftUrls !== null);

  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [editingEmbed, setEditingEmbed] = useState(false);
  const [embedInput, setEmbedInput] = useState("");
  const [urls, setUrls] = useState<UrlItem[]>(initialUrls ?? []);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newUrl, setNewUrl] = useState({ label: "", url: "" });
  const [showUrlForm, setShowUrlForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 編集モード終了時にリセット
  useEffect(() => {
    if (!isEditMode) {
      setEditing(false);
      setContent(initialContent);
      setUrls(initialUrls ?? []);
    }
  }, [isEditMode, discardKey]); // eslint-disable-line

  // ヘッダーの「保存」ボタン用にハンドラを登録
  useEffect(() => {
    if (isEditMode) {
      registerSaveHandler(async () => {
        if (editing) await handleSave();
      });
    } else {
      registerSaveHandler(null);
    }
    return () => registerSaveHandler(null);
  }, [isEditMode, editing]); // eslint-disable-line

  const patchPage = (body: object) =>
    fetch(`/api/company-info/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const handleSave = async () => {
    setSaving(true);
    const res = await patchPage({ content, urls });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    const res = await patchPage({ content, urls, isDraft: true });
    setSavingDraft(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    const res = await patchPage({
      content: draftContent ?? content,
      urls: draftUrls ?? urls,
      embedUrl: draftEmbedUrl ?? initialEmbedUrl,
      isDraft: false,
    });
    setPublishing(false);
    if (res.ok) {
      router.refresh();
    }
  };

  const handleSaveEmbed = async (urlToSave?: string) => {
    const value = urlToSave !== undefined ? urlToSave : embedInput;
    const res = await patchPage({ embedUrl: value });
    setEditingEmbed(false);
    if (res.ok) router.refresh();
  };

  const handleAddUrl = () => {
    if (!newUrl.url.trim()) return;
    const label = newUrl.label.trim() || newUrl.url;
    setUrls([...urls, { label, url: newUrl.url.trim() }]);
    setNewUrl({ label: "", url: "" });
    setShowUrlForm(false);
  };

  // 削除と保存を一括処理（state更新前の値を使う競合を回避）
  const handleRemoveUrlAndSave = async (i: number) => {
    const newUrls = urls.filter((_, idx) => idx !== i);
    setUrls(newUrls);
    setSaving(true);
    const res = await patchPage({ content, urls: newUrls });
    setSaving(false);
    if (res.ok) router.refresh();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/company-info/${slug}/files`, { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json();
      setFiles((prev) => [...prev, { id: data.id, name: data.name, url: data.url, size: data.size, mimeType: data.mimeType, isDraft: data.isDraft }]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("このファイルを削除しますか？")) return;
    const res = await fetch(`/api/company-info/${slug}/files/${fileId}`, { method: "DELETE" });
    if (res.ok) setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // iframeモード：埋め込みURLがある場合は全画面表示
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

  // 閲覧者向け：中身がない場合のメッセージ
  const hasAnyContent = content || urls.length > 0 || files.filter((f) => !f.isDraft).length > 0;
  if (!isAdmin && !hasAnyContent) {
    return (
      <div className="bg-white rounded-2xl border border-[#EEEEEE] p-12 text-center text-[#AAAAAA]">
        <p className="text-3xl mb-3">📄</p>
        <p className="text-sm">まだ内容がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 下書きバナー（管理者のみ・下書きがある場合） */}
      {isAdmin && hasDraft && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-sm text-amber-700 font-medium">下書きが保存されています</span>
            {draftUpdatedAt && (
              <span className="text-xs text-amber-600 ml-2">
                {new Date(draftUpdatedAt).toLocaleDateString("ja-JP")}
              </span>
            )}
          </div>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="text-xs bg-[#0067B8] text-white px-3 py-1.5 rounded-lg hover:bg-[#005a9e] disabled:opacity-50 transition-colors"
          >
            {publishing ? "公開中..." : "公開する"}
          </button>
        </div>
      )}

      {/* 外部サイト埋め込み設定（管理者のみ） */}
      {isAdmin && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 text-sm">🌐 外部サイト埋め込み</h2>
            {!editingEmbed && (
              <button
                onClick={() => { setEditingEmbed(true); setEmbedInput(initialEmbedUrl); }}
                className="text-xs bg-[#E2EDF5] text-[#0067B8] px-3 py-1.5 rounded-lg hover:bg-[#d0e4f0]"
              >
                {initialEmbedUrl ? "変更" : "設定"}
              </button>
            )}
          </div>
          {editingEmbed ? (
            <div className="flex gap-2">
              <input
                type="url"
                value={embedInput}
                onChange={(e) => setEmbedInput(e.target.value)}
                placeholder="https://example.com/..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6]"
                autoFocus
              />
              <button onClick={() => handleSaveEmbed()} className="bg-[#0067B8] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#005a9e]">保存</button>
              <button onClick={() => setEditingEmbed(false)} className="border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50">✕</button>
            </div>
          ) : initialEmbedUrl ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500 truncate flex-1">{initialEmbedUrl}</p>
              <button onClick={() => handleSaveEmbed("")} className="text-xs text-red-400 hover:text-red-600">削除</button>
            </div>
          ) : (
            <p className="text-xs text-gray-300">URLを設定すると、一般ユーザーにはそのサイトが全画面で表示されます</p>
          )}
          {initialEmbedUrl && (
            <iframe
              src={initialEmbedUrl}
              className="w-full mt-3 rounded-xl border border-gray-100"
              style={{ height: "300px" }}
              title="プレビュー"
            />
          )}
        </section>
      )}

      {/* 本文セクション */}
      {(isAdmin || content) && (
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
                  onClick={() => { setEditing(false); setContent(initialContent); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {savingDraft ? "保存中..." : "下書き保存"}
                </button>
                <button
                  onClick={handleSave}
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

      {/* 関連リンクセクション */}
      {(isAdmin || urls.length > 0) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">🔗 関連リンク</h2>
            {isAdmin && (
              <button
                onClick={() => setShowUrlForm(!showUrlForm)}
                className="text-xs bg-[#E2EDF5] text-[#0067B8] px-3 py-1.5 rounded-lg hover:bg-[#d0e4f0]"
              >
                + URLを追加
              </button>
            )}
          </div>
          {showUrlForm && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <input
                type="text"
                value={newUrl.label}
                onChange={(e) => setNewUrl({ ...newUrl, label: e.target.value })}
                placeholder="ラベル（任意）"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] w-36"
              />
              <input
                type="url"
                value={newUrl.url}
                onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })}
                placeholder="https://..."
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] flex-1 min-w-48"
              />
              <button onClick={handleAddUrl} className="bg-[#0067B8] text-white px-4 py-2 rounded-xl text-sm hover:bg-[#005a9e]">
                追加
              </button>
            </div>
          )}
          {urls.length === 0 ? (
            <p className="text-sm text-gray-300">
              {isAdmin ? "「URLを追加」からリンクを登録できます" : "リンクがありません"}
            </p>
          ) : (
            <ul className="space-y-2">
              {urls.map((item, i) => (
                <li key={i} className="flex items-center gap-3 group">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-[#0067B8] hover:underline truncate"
                  >
                    🔗 {item.label || item.url}
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveUrlAndSave(i)}
                      className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                    >
                      削除
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isAdmin && urls.length > 0 && !showUrlForm && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-3 text-xs bg-[#0067B8] text-white px-3 py-1.5 rounded-lg hover:bg-[#005a9e] disabled:opacity-50"
            >
              {saving ? "保存中..." : "リンクを保存"}
            </button>
          )}
        </section>
      )}

      {/* 添付ファイルセクション */}
      {(isAdmin || files.filter((f) => !f.isDraft).length > 0) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">📎 添付ファイル</h2>
            {isAdmin && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs bg-[#E2EDF5] text-[#0067B8] px-3 py-1.5 rounded-lg hover:bg-[#d0e4f0] disabled:opacity-50"
              >
                {uploading ? "アップロード中..." : "+ ファイルを追加"}
              </button>
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          </div>
          {files.length === 0 ? (
            <p className="text-sm text-gray-300">
              {isAdmin ? "「ファイルを追加」からアップロードできます" : "添付ファイルがありません"}
            </p>
          ) : (
            <ul className="space-y-2">
              {files.map((file) => (
                <li key={file.id} className="flex items-center gap-3 group">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 flex-1 text-sm text-gray-700 hover:text-[#0067B8] min-w-0"
                  >
                    <span className="flex-shrink-0">{getFileIcon(file.mimeType)}</span>
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatBytes(file.size)}</span>
                    {file.isDraft && isAdmin && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">下書き</span>
                    )}
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    >
                      削除
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
