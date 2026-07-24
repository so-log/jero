"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { RoleBadge } from "@/components/ui/role-badge";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import type { MemberDto } from "@/features/itinerary";
import { inviteSchema, type InviteRole } from "@/features/trip";
import { copyToClipboard } from "@/lib/clipboard";
import { MEMBER_COLORS } from "@/lib/constants/members";
import type { Role } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";

import { useShareActions } from "../api/useShareActions";

/**
 * ② 멤버 · 공유 관리 · 중앙 모달(516px). 공유 링크(권한) + 이메일 초대 + 멤버 역할/내보내기.
 * owner 만 관리(editor 열람). inviteSchema(결정 C: 기본 editor, owner 불가). 권한은 서버 강제(§8.2).
 * 낙관 UI: 로컬 멤버 목록을 갱신하고 seam(useShareActions)은 스텁(['members'] 무효화).
 */
const ROLE_SEG = [
  { value: "editor", label: "편집 가능" },
  { value: "viewer", label: "읽기 전용" },
];

export function ShareOverlay({
  open,
  onClose,
  tripId,
  members,
  myRole,
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
  members: MemberDto[];
  myRole: Role;
}) {
  const isOwner = myRole === "owner";
  const share = useShareActions(tripId);

  // 오버레이는 열 때마다 새로 마운트되므로 members 로 1회 시드(낙관 UI 로컬 갱신).
  const [list, setList] = useState<MemberDto[]>(members);

  const [linkRole, setLinkRole] = useState<InviteRole>("viewer");
  const [inviteRole, setInviteRole] = useState<InviteRole>("editor");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  // 공유 링크: 복사 시 발급(권한별) 후 URL 캐시. 권한 변경 시 재발급 위해 초기화.
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copyLink = async () => {
    setCopyError(false);
    let url = shareUrl;
    if (!url) {
      try {
        const token = await share.issueShareLink.mutateAsync({ role: linkRole });
        url = `${window.location.origin}/share/${token}`;
        setShareUrl(url);
      } catch {
        setCopyError(true);
        return;
      }
    }
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
    }
  };

  const invite = () => {
    const parsed = inviteSchema.shape.email.safeParse(email);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "이메일을 확인해 주세요");
      return;
    }
    if (list.some((m) => m.name === parsed.data || m.id === parsed.data)) {
      setEmailError("이미 초대된 멤버예요");
      return;
    }
    const color = MEMBER_COLORS[list.length % MEMBER_COLORS.length];
    const local = parsed.data.split("@")[0];
    setList((prev) => [
      ...prev,
      {
        id: `pending-${parsed.data}`,
        name: local,
        initial: local[0]?.toUpperCase() ?? "?",
        color,
        role: inviteRole,
        online: false,
      },
    ]);
    share.invite.mutate({ email: parsed.data, role: inviteRole });
    setEmail("");
    setEmailError(null);
  };

  const changeRole = (memberId: string, role: InviteRole) => {
    setList((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    setMenuId(null);
    share.changeRole.mutate({ memberId, role });
  };
  const removeMember = (memberId: string) => {
    setList((prev) => prev.filter((m) => m.id !== memberId));
    setMenuId(null);
    share.removeMember.mutate(memberId);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={516}
      icon="users"
      title="멤버 · 공유 관리"
      subtitle="도쿄, 우리끼리 4일"
      loading={share.invite.isPending}
      loadingText="초대 메일을 보내는 중…"
      footer={
        <div className="flex w-full items-center justify-between">
          <Link
            href={`/trips/${tripId}/pamphlet`}
            onClick={onClose}
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-line-strong bg-background px-4 text-[13px] font-bold text-subtle hover:bg-secondary"
          >
            <Icon name="file-text" size={16} strokeWidth={2} />
            팜플렛 만들기
          </Link>
          <Button variant="primary" onClick={onClose} className="h-11">
            완료
          </Button>
        </div>
      }
    >
      {/* 공유 링크 */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 rounded-lg border border-primary-tint bg-primary-wash p-[10px_12px]">
          <span className="flex size-8 flex-none items-center justify-center rounded-md bg-primary-tint text-primary-hover">
            <Icon name="link" size={16} strokeWidth={2} />
          </span>
          <span className="flex-1 truncate text-[13px] font-semibold text-body">
            {shareUrl ?? "복사를 누르면 공유 링크가 만들어져요"}
          </span>
          <button
            type="button"
            onClick={copyLink}
            disabled={share.issueShareLink.isPending}
            className={cn(
              "inline-flex h-[34px] flex-none items-center gap-1.5 rounded-md border pr-3 pl-2.5 text-[12.5px] font-bold transition-colors disabled:opacity-60",
              copied
                ? "border-success/40 bg-success-tint text-success"
                : "border-line-strong bg-background text-body hover:bg-secondary",
            )}
          >
            <Icon
              name={copied ? "check" : "copy"}
              size={14}
              strokeWidth={2}
              className={copied ? "text-success" : "text-faint"}
            />
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
        {copyError && (
          <span className="text-[11.5px] font-semibold text-danger">
            링크를 복사하지 못했어요. 다시 시도해 주세요.
          </span>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-faint">
            링크로 들어온 사람의 권한
          </span>
          {isOwner ? (
            <SegmentedTabs
              items={ROLE_SEG}
              value={linkRole}
              onValueChange={(v) => {
                setLinkRole(v as InviteRole);
                setShareUrl(null); // 권한 바뀌면 다음 복사 때 재발급
                setCopied(false);
              }}
              size="sm"
              aria-label="링크 권한"
            />
          ) : (
            <RoleBadge role={linkRole} />
          )}
        </div>
      </div>

      <div className="h-px bg-line" />

      {!isOwner && (
        <div className="flex items-center gap-2 rounded-md border border-line bg-secondary px-3.5 py-2.5">
          <Icon name="lock" size={15} className="text-faint" />
          <span className="text-[12.5px] font-semibold text-faint">
            멤버 초대·권한 변경은 소유자만 할 수 있어요
          </span>
        </div>
      )}

      {/* 이메일 초대(owner) */}
      {isOwner && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2.5">
            <div className="relative flex flex-1 items-center">
              <span className="pointer-events-none absolute left-3.5 text-faint">
                <Icon name="mail" size={16} />
              </span>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    invite();
                  }
                }}
                placeholder="friend@email.com"
                className={cn(
                  "h-[46px] w-full rounded-md border-[1.5px] bg-background pr-3.5 pl-[38px] text-sm font-medium text-ink outline-none focus:border-primary focus:shadow-focus",
                  emailError ? "border-danger" : "border-line-strong",
                )}
              />
            </div>
            <SegmentedTabs
              items={ROLE_SEG}
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as InviteRole)}
              size="sm"
              className="h-[46px] flex-none"
              aria-label="초대 역할"
            />
            <Button variant="primary" onClick={invite} className="h-[46px] flex-none gap-1.5">
              <Icon name="plus" size={17} strokeWidth={2.4} />
              초대
            </Button>
          </div>
          {emailError && (
            <span className="text-[11.5px] font-semibold text-danger">{emailError}</span>
          )}
        </div>
      )}

      {/* 멤버 목록 */}
      <div className="flex flex-col gap-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-[12.5px] font-bold text-body">멤버</span>
          <span className="text-xs font-bold text-faint">{list.length}명</span>
        </div>
        {list.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5 px-1 py-2">
            {m.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage 동적 아바타
              <img
                src={m.avatarUrl}
                alt=""
                className="size-9 flex-none rounded-full object-cover"
                style={{ boxShadow: `0 0 0 2px ${m.color}` }}
              />
            ) : (
              <span
                className="flex size-9 flex-none items-center justify-center rounded-full border-2 bg-background text-[13px] font-bold"
                style={{ borderColor: m.color, color: m.color }}
              >
                {m.initial}
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[13.5px] font-bold text-body">
                {m.name}
                {m.role === "owner" && (
                  <span className="ml-1.5 text-[11.5px] font-semibold text-faint">(나)</span>
                )}
              </span>
              <span className="truncate text-xs font-medium text-faint">
                {m.id.startsWith("pending-") ? m.id.replace("pending-", "") : `${m.name}@trip.co`}
              </span>
            </div>
            {isOwner && m.role !== "owner" ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuId(menuId === m.id ? null : m.id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md border pr-2.5 pl-3 text-[12.5px] font-bold transition-colors",
                    menuId === m.id
                      ? "border-primary bg-primary-wash text-primary-hover"
                      : "border-line-strong bg-background text-body hover:bg-secondary",
                  )}
                >
                  {m.role === "editor" ? "편집자" : "뷰어"}
                  <Icon name="chevron-down" size={14} strokeWidth={2} />
                </button>
                {menuId === m.id && (
                  <>
                    <button
                      type="button"
                      aria-hidden
                      tabIndex={-1}
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setMenuId(null)}
                    />
                    <div className="absolute top-[calc(100%+5px)] right-0 z-20 w-[168px] rounded-lg border border-line bg-popover p-1.5 shadow-modal">
                      {(
                        [
                          ["editor", "편집자", "편집 및 추가 가능"],
                          ["viewer", "뷰어", "보기만 가능"],
                        ] as const
                      ).map(([k, t, desc]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => changeRole(m.id, k)}
                          className={cn(
                            "flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left",
                            m.role === k ? "bg-secondary" : "hover:bg-secondary",
                          )}
                        >
                          <span className="text-[13px] font-bold text-body">{t}</span>
                          <span className="text-[11px] font-medium text-faint">{desc}</span>
                        </button>
                      ))}
                      <div className="my-1 h-px bg-line" />
                      <button
                        type="button"
                        onClick={() => removeMember(m.id)}
                        className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-[13px] font-bold text-danger hover:bg-danger-tint"
                      >
                        <Icon name="trash" size={14} strokeWidth={2} />
                        내보내기
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <RoleBadge role={m.role} />
            )}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
