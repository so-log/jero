"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import type { CityView, FolderDto, PlaceDto } from "@/features/itinerary";
import { cityColor } from "@/lib/constants/cityColors";
import { cn } from "@/lib/utils";

import { cityCount, folderCount } from "../lib/selectors";
import { ALL_CITIES, ALL_FOLDER } from "../types";

/**
 * 폴더 사이드바(236px) — 전체 장소 + 사용자 폴더(아이콘·이름·개수) + 폴더 추가/이름변경/삭제(2차 B).
 * 관리(추가·이름변경·삭제)는 editor+ 만 노출(canEdit). 실제 쓰기는 상위(PlacesView)가 훅에 배선한 콜백 경유(§7.1).
 * 시안 buildFolders. 인라인 입력·더보기 메뉴 상태는 UI 로컬(useState).
 */
interface FolderSidebarProps {
  folders: FolderDto[];
  saved: PlaceDto[];
  folderId: string;
  canEdit: boolean;
  onSelect: (folderId: string) => void;
  /** 폴더 생성(editor+). 없으면 추가 UI 비활성. */
  onCreateFolder?: (name: string) => void;
  onRenameFolder?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
  /** 도시 축(다중 도시 Phase 4) — 2개 이상이면 폴더 위에 "도시" 필터 섹션 노출. 단일 도시면 미노출(회귀 0). */
  cities?: CityView[];
  cityId?: string;
  onSelectCity?: (cityId: string) => void;
}

const ALL: FolderDto = {
  id: ALL_FOLDER,
  name: "전체 장소",
  icon: "layers",
  color: "#5A606B",
};

export function FolderSidebar({
  folders,
  saved,
  folderId,
  canEdit,
  onSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  cities = [],
  cityId = ALL_CITIES,
  onSelectCity,
}: FolderSidebarProps) {
  const showCities = cities.length > 1 && !!onSelectCity;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderDto | null>(null);

  const manage = canEdit && !!onCreateFolder;

  const openAdd = () => {
    setEditingId(null);
    setDraft("");
    setAdding(true);
  };
  const commitAdd = () => {
    const name = draft.trim();
    if (name) onCreateFolder?.(name);
    setDraft("");
    setAdding(false);
  };
  const startRename = (f: FolderDto) => {
    setMenuId(null);
    setAdding(false);
    setEditingId(f.id);
    setEditDraft(f.name);
  };
  const commitRename = (id: string) => {
    const name = editDraft.trim();
    if (name) onRenameFolder?.(id, name);
    setEditingId(null);
  };

  return (
    <aside className="flex w-[236px] flex-none flex-col border-r border-line bg-surface">
      {/* 도시 축(다중 도시 Phase 4) — 폴더와 별개인 3번째 필터. 색 점으로 시각 구분(U2 IA). */}
      {showCities && (
        <div className="flex-none border-b border-line px-3 pt-4 pb-3">
          <div className="px-1.5 pb-2 text-[13px] font-bold tracking-wide text-faint">
            도시
          </div>
          <div className="flex flex-col gap-0.5">
            <CityButton
              label="전체 도시"
              count={saved.length}
              color={null}
              active={cityId === ALL_CITIES}
              onSelect={() => onSelectCity?.(ALL_CITIES)}
            />
            {cities.map((c) => (
              <CityButton
                key={c.id}
                label={c.name}
                count={cityCount(saved, c.id)}
                color={cityColor(c.seq).color}
                active={cityId === c.id}
                onSelect={() => onSelectCity?.(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-none items-center justify-between px-4 pt-4 pb-2.5">
        <span className="text-[13px] font-bold tracking-wide text-faint">폴더</span>
        {manage && (
          <button
            type="button"
            aria-label="폴더 추가"
            onClick={openAdd}
            className="flex size-7 items-center justify-center rounded-md border border-line-strong bg-background text-faint hover:bg-secondary hover:text-primary-hover"
          >
            <Icon name="plus" size={16} strokeWidth={2.3} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex flex-col gap-0.5">
          {/* 전체 장소 */}
          <FolderButton
            folder={ALL}
            count={folderCount(saved, ALL.id)}
            active={ALL.id === folderId}
            onSelect={onSelect}
          />

          {/* 사용자 폴더 */}
          {folders.map((f) => {
            if (editingId === f.id) {
              return (
                <FolderInput
                  key={f.id}
                  value={editDraft}
                  onChange={setEditDraft}
                  onCommit={() => commitRename(f.id)}
                  onCancel={() => setEditingId(null)}
                />
              );
            }
            return (
              <div key={f.id} className="group relative">
                <FolderButton
                  folder={f}
                  count={folderCount(saved, f.id)}
                  active={f.id === folderId}
                  onSelect={onSelect}
                />
                {/* 더보기(editor+) — 개수 위에 hover 로 오버레이(개수는 항상 렌더). */}
                {manage && (
                  <button
                    type="button"
                    aria-label={`${f.name} 폴더 관리`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuId(menuId === f.id ? null : f.id);
                    }}
                    className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md bg-surface text-mute opacity-0 hover:bg-background hover:text-subtle group-hover:opacity-100 aria-expanded:bg-background aria-expanded:opacity-100"
                    aria-expanded={menuId === f.id}
                  >
                    <Icon name="more-horizontal" size={16} strokeWidth={2} />
                  </button>
                )}
                {menuId === f.id && (
                  <>
                    <button
                      type="button"
                      aria-hidden
                      tabIndex={-1}
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setMenuId(null)}
                    />
                    <div className="absolute top-[38px] right-1 z-20 w-[132px] rounded-lg border border-line bg-popover p-1.5 shadow-modal">
                      <button
                        type="button"
                        onClick={() => startRename(f)}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-semibold text-body hover:bg-secondary"
                      >
                        <Icon name="pencil" size={14} strokeWidth={2} />
                        이름 변경
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuId(null);
                          setDeleteTarget(f);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-bold text-danger hover:bg-danger-tint"
                      >
                        <Icon name="trash" size={14} strokeWidth={2} />
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* 추가 인라인 입력 */}
          {adding && (
            <FolderInput
              value={draft}
              onChange={setDraft}
              onCommit={commitAdd}
              onCancel={() => setAdding(false)}
              placeholder="새 폴더 이름"
            />
          )}
        </div>
      </div>

      {manage && (
        <div className="flex-none border-t border-line p-3">
          <button
            type="button"
            onClick={openAdd}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line-strong bg-background text-[13px] font-bold text-faint hover:border-primary hover:bg-primary-wash hover:text-primary-hover"
          >
            <Icon name="folder-plus" size={16} strokeWidth={2.2} />
            폴더 추가
          </button>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        variant="destructive"
        title="이 폴더를 삭제할까요?"
        description="폴더를 삭제해도 안의 장소는 사라지지 않고 '전체 장소'로 이동해요."
        confirmLabel="삭제할게요"
        onConfirm={() => {
          if (deleteTarget) onDeleteFolder?.(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </aside>
  );
}

/** 도시 필터 버튼(색 점 = 도시 축, 폴더의 아이콘과 시각 구분). */
function CityButton({
  label,
  count,
  color,
  active,
  onSelect,
}: {
  label: string;
  count: number;
  /** 도시 색(없으면 "전체 도시" = 중립 점). */
  color: string | null;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors",
        active ? "bg-primary-tint" : "hover:bg-secondary",
      )}
    >
      <span
        className="size-2.5 flex-none rounded-full"
        style={{ background: color ?? "var(--color-mute)" }}
      />
      <span
        className={cn(
          "flex-1 truncate text-[13px]",
          active ? "font-bold text-ink" : "font-semibold text-body",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-xs font-bold",
          active ? "text-primary-hover" : "text-mute",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FolderButton({
  folder,
  count,
  active,
  onSelect,
}: {
  folder: FolderDto;
  count: number;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(folder.id)}
      className={cn(
        "flex h-[42px] items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors",
        active ? "bg-primary-tint" : "hover:bg-secondary",
      )}
    >
      <span
        className={cn(
          "flex size-[26px] flex-none items-center justify-center rounded-lg",
          active && "bg-background",
        )}
      >
        <Icon
          name={folder.icon}
          size={16}
          strokeWidth={2}
          color={active ? "var(--color-primary-hover)" : folder.color}
        />
      </span>
      <span
        className={cn(
          "flex-1 truncate text-[13.5px]",
          active ? "font-bold text-ink" : "font-semibold text-body",
        )}
      >
        {folder.name}
      </span>
      <span
        className={cn(
          "text-xs font-bold",
          active ? "text-primary-hover" : "text-mute",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FolderInput({
  value,
  onChange,
  onCommit,
  onCancel,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  return (
    <div className="flex h-[42px] items-center gap-2 rounded-lg border border-primary/40 bg-background px-2.5">
      <Icon name="bookmark" size={16} strokeWidth={2} className="flex-none text-faint" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={onCommit}
        placeholder={placeholder ?? "폴더 이름"}
        className="min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-faint"
      />
    </div>
  );
}
