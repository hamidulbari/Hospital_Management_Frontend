"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast-provider";
import { redirectIfExpired } from "@/lib/session-expired";
import { setUserRolesAction } from "./actions";
import { displayRole, type RoleItem, type RoleRef } from "./parse";

type Props = { userId: string; current: RoleRef[]; all: RoleItem[]; canAssign: boolean; isSelf: boolean };

export function UserRoles({ userId, current, all, canAssign, isSelf }: Props) {
  const router = useRouter();
  const toast = useToast();
  const editable = canAssign && !isSelf && all.length > 0;

  // A role is "held" when its id matches, or (when the answer only gave names) when the name matches.
  const [chosen, setChosen] = useState<string[]>(() =>
    all.filter((role) => current.some((c) => (c.id !== "" ? c.id === role.id : c.name === role.name))).map((role) => role.id),
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const response = await setUserRolesAction(userId, { roles: chosen });
    setBusy(false);
    if (response.ok) {
      toast.success("Roles saved.");
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    toast.fromError(response.error, { useFieldMessage: true });
  }

  if (!editable) {
    return (
      <div className="flex flex-col gap-3">
        {current.length === 0 ? <p className="text-sm text-muted">No roles.</p> : (
          <ul className="flex flex-wrap gap-2">
            {current.map((role, index) => (
              <li key={role.id || index}><StatusBadge label={displayRole(role.name)} tone="active" /></li>
            ))}
          </ul>
        )}
        {isSelf ? <p className="text-xs text-muted">You cannot change your own roles.</p> : null}
        {!isSelf && !canAssign ? <p className="text-xs text-muted">You may not change roles.</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="border border-ink bg-surface">
        {all.map((role) => (
          <li key={role.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-accent p-4 last:border-b-0">
            <CheckboxField
              label={displayRole(role.name)}
              checked={chosen.includes(role.id)}
              onChange={() => setChosen((c) => (c.includes(role.id) ? c.filter((id) => id !== role.id) : [...c, role.id]))}
            />
            <span className="text-xs text-muted">{role.permissions.length} permissions{role.description ? ` \u00b7 ${role.description}` : ""}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">You cannot hand out permissions you do not hold: the server refuses and says so.</p>
      <div>
        <Button onClick={save} loading={busy}>Save roles</Button>
      </div>
    </div>
  );
}